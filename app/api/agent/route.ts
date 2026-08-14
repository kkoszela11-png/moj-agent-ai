import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { friendlyError, MODEL } from "@/app/lib/createChatRoute";
import { generateImageData } from "@/app/lib/imageGen";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Brakuje zmiennych Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY lub NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createClient(url, key);
}

async function getEmbedding(origin: string, text: string): Promise<number[]> {
  const embedRes = await fetch(`${origin}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!embedRes.ok) {
    const detail = await embedRes.text().catch(() => "");
    throw new Error(`Embedding failed: ${detail}`);
  }

  const embedData = await embedRes.json();
  const embedding = embedData?.embedding || embedData?.embedding?.values;
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding response is invalid.");
  }
  return embedding as number[];
}

/** Bezpieczny kalkulator — dopuszcza tylko liczby i podstawowe operatory. */
function safeCalc(expression: string): number {
  if (!/^[0-9+\-*/%.()\s]+$/.test(expression)) {
    throw new Error("Niedozwolone znaki w wyrażeniu.");
  }
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${expression});`)();
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Wynik nie jest liczbą.");
  }
  return result;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, user_id }: { messages: UIMessage[]; user_id?: string } = body;
  const origin = new URL(req.url).origin;
  const filteredMessages = (messages ?? []).filter((m: any) => m.role !== "system");

  const result = streamText({
    // UWAGA: Gemini nie pozwala łączyć wyszukiwarki Google (grounding) z własnymi
    // narzędziami (function calling) w jednym zapytaniu — przy groundingu ignoruje
    // funkcje. Dlatego agent używa TYLKO własnych narzędzi, a wyszukiwarka Google
    // ma osobny tryb /search. Skoro nie ma groundingu, używamy flash-lite (wyższy
    // darmowy limit) — obsługuje function calling.
    model: google(MODEL),
    instructions: `Jesteś autonomicznym agentem AI z zestawem narzędzi. Sam decydujesz, których użyć i w jakiej kolejności, aby wykonać zadanie użytkownika.
  Dostępne narzędzia: kalkulator, aktualna data/czas, generowanie obrazów, searchKnowledge (baza wiedzy firmy).

  ZASADY BAZY WIEDZY:
  1. Gdy pytanie dotyczy firmy, cen, pakietów, warunków, regulaminu, FAQ — ZAWSZE najpierw użyj searchKnowledge.
  2. Odpowiadaj wyłącznie na podstawie znalezionych fragmentów.
  3. Jeśli searchKnowledge zwróci 0 wyników dla pytania firmowego, odmów: "Nie mam tej informacji w bazie wiedzy." i niczego nie wymyślaj.
  4. Gdy korzystasz z bazy wiedzy, na końcu zawsze dodaj cytowanie:
     "📎 Źródło: <tytuł dokumentu>" lub "📎 Źródła: <lista tytułów>".

  Gdy zadanie wymaga obliczeń — użyj kalkulatora. Gdy pytają o datę/czas — użyj narzędzia (nie zgaduj). Gdy proszą o grafikę/logo — wygeneruj obraz.
  Odpowiadaj po polsku. Gdy generujesz obraz — krótko go opisz.`,
    tools: {
      calculator: tool({
        description:
          "Wykonuje obliczenia matematyczne. Podaj wyrażenie, np. '8500 * 0.23'.",
        inputSchema: z.object({
          expression: z
            .string()
            .describe("Wyrażenie matematyczne, np. '8500 * 1.23'"),
        }),
        execute: async ({ expression }) => {
          try {
            return { expression, result: safeCalc(expression) };
          } catch (e) {
            return { expression, error: (e as Error).message };
          }
        },
      }),
      currentDateTime: tool({
        description: "Zwraca aktualną datę i godzinę.",
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          return {
            iso: now.toISOString(),
            pl: now.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }),
          };
        },
      }),
      generateImage: tool({
        description:
          "Generuje obraz na podstawie opisu (logo, grafika, ilustracja, post wizualny).",
        inputSchema: z.object({
          prompt: z.string().describe("Opis obrazu do wygenerowania"),
        }),
        execute: async ({ prompt }) => {
          try {
            const { image, model } = await generateImageData(prompt);
            return { image, model, ok: true };
          } catch (e) {
            return { ok: false, error: friendlyError(e) };
          }
        },
      }),
      searchKnowledge: tool({
        description:
          "Wyszukuje informacje w bazie wiedzy firmy (cennik, FAQ, regulamin, oferta). Używaj przy pytaniach firmowych.",
        inputSchema: z.object({
          query: z.string().describe("Pytanie użytkownika do wyszukania w bazie"),
        }),
        execute: async ({ query }) => {
          try {
            if (!user_id) {
              return { results: [], total_found: 0, message: "Brak user_id dla wyszukiwania wiedzy." };
            }

            const supabase = getSupabase();
            const embedding = await getEmbedding(origin, query);

            const { data, error } = await supabase.rpc("match_documents", {
              query_embedding: embedding,
              match_threshold: 0.5,
              match_count: 5,
            });

            if (error) {
              return { results: [], total_found: 0, message: `Błąd bazy wiedzy: ${error.message}` };
            }

            const rows = Array.isArray(data) ? data : [];
            if (rows.length === 0) {
              return { results: [], total_found: 0, message: "Nie znaleziono informacji w bazie wiedzy." };
            }

            const rowIds = rows.map((row: any) => row.id).filter(Boolean);
            const { data: allowedDocuments, error: allowedError } = await supabase
              .from("documents")
              .select("id")
              .in("id", rowIds)
              .eq("user_id", user_id);

            if (allowedError) {
              return { results: [], total_found: 0, message: `Błąd filtrowania po user_id: ${allowedError.message}` };
            }

            const allowedIds = new Set((allowedDocuments ?? []).map((doc: any) => doc.id));
            const filteredRows = rows.filter((row: any) => allowedIds.has(row.id));

            if (filteredRows.length === 0) {
              return { results: [], total_found: 0, message: "Nie znaleziono informacji w Twojej bazie wiedzy." };
            }

            const results = filteredRows.map((row: any) => ({
              title: row.title,
              content: row.content,
              similarity: row.similarity,
              metadata: row.metadata,
            }));
            const source_documents = Array.from(new Set(results.map((r: any) => r.title))).filter(Boolean);

            return {
              results,
              total_found: results.length,
              source_documents,
            };
          } catch (e) {
            return {
              results: [],
              total_found: 0,
              message: `Błąd searchKnowledge: ${friendlyError(e)}`,
            };
          }
        },
      }),
    },
    stopWhen: stepCountIs(5),
    messages: await convertToModelMessages(filteredMessages),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: friendlyError,
  });
}
