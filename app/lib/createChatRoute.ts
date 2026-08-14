import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, tool, type UIMessage } from "ai";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { z } from "zod";

/**
 * Wspólny model dla całej aplikacji.
 * Domyślny, tani model dla projektu: gemini-3.1-flash-lite.
 * Jeśli chcesz zmienić model, ustaw tu inną nazwę modelu.
 */
export const MODEL = "gemini-3.1-flash-lite";

/**
 * Model dla wyszukiwarki (/search). Musi obsługiwać Google Search grounding.
 * Uwaga: flash-lite NIE wykonuje wyszukiwania, a gemini-2.0-flash jest
 * niedostępny w darmowym planie (limit 0). Jedyny działający darmowo z groundingiem
 * Ten projekt domyślnie WYŁĄCZA Search Grounding. Jeśli chcesz włączyć
 * grounding testowo, użyj zmiennej środowiskowej `ENABLE_SEARCH_GROUNDING`.
 */
export const SEARCH_MODEL = "gemini-3.1-flash-lite";

async function getDisplayName(userId?: string | null): Promise<string> {
  if (!userId) return "nieznany";

  try {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    return data?.display_name || "nieznany";
  } catch {
    return "nieznany";
  }
}

/** Zamienia błąd (np. limit darmowego planu) na czytelny komunikat po polsku. */
export function friendlyError(error: unknown): string {
  // Zbierz jak najwięcej tekstu z błędu (także zagnieżdżonego, np. z @google/genai).
  let msg = String(error);
  if (error instanceof Error) msg += " " + error.message;
  try {
    msg += " " + JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch {
    /* ignore */
  }

  // limit: 0 = model niedostępny w darmowym planie (wymaga płatności/billingu)
  if (msg.includes("limit: 0")) {
    return "🔒 Ten model nie jest dostępny w darmowym planie Google AI (limit 0). Generowanie obrazów wymaga włączenia płatności (billing) na koncie w AI Studio.";
  }
  if (
    msg.includes("429") ||
    msg.toLowerCase().includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED")
  ) {
    return "⏳ Przekroczono chwilowy limit darmowego planu Google AI. Odczekaj kilkadziesiąt sekund i spróbuj ponownie.";
  }
  return "Wystąpił błąd podczas generowania odpowiedzi. Spróbuj ponownie.";
}

/**
 * Fabryka endpointów czatu. Każdy tryb (chat, think, fewshot, format, oferta)
 * różni się tylko system promptem — reszta logiki (Gemini + streaming) jest wspólna.
 */
export function createChatRoute(system: string) {
  return async function POST(req: Request) {
    const body = await req.json();
    const messages = (body?.messages ?? []) as UIMessage[];
    const userId = (body?.user_id ?? null) as string | null;
    const displayName = await getDisplayName(userId);

    const dynamicSystem = `Jesteś pomocnym asystentem AI.
Rozmawiasz z użytkownikiem: ${displayName || "nieznany"}.
  Jeśli nie znasz imienia użytkownika — zapytaj grzecznie na początku rozmowy.

  Gdy użytkownik poda imię (np. "Jestem Paweł", "Mam na imię Ewa"):
  1) Użyj narzędzia updateUserName.
  2) Potem odpowiedz dokładnie w formie: "Miło Cię poznać, <imię>! Zapamiętam."`;

    const finalSystem = system ? `${dynamicSystem}\n\n${system}` : dynamicSystem;

    const filteredMessages = (messages ?? []).filter((m: any) => m.role !== "system");

    const tools = userId
      ? {
          updateUserName: tool({
            description:
              "Zapisuje imię użytkownika w user_profiles.display_name. Użyj, gdy użytkownik poda swoje imię.",
            inputSchema: z.object({
              display_name: z.string().min(1).describe("Imię użytkownika, np. Paweł"),
            }),
            execute: async ({ display_name }) => {
              const cleanName = display_name.trim();
              const supabase = createSupabaseServerClient();

              const { error } = await supabase
                .from("user_profiles")
                .upsert(
                  {
                    id: userId,
                    display_name: cleanName,
                  },
                  { onConflict: "id" }
                );

              if (error) {
                return { ok: false, error: error.message };
              }

              return {
                ok: true,
                display_name: cleanName,
                confirmation: `Miło Cię poznać, ${cleanName}! Zapamiętam.`,
              };
            },
          }),
        }
      : undefined;

    const result = streamText({
      model: google(MODEL),
      instructions: finalSystem,
      tools,
      messages: await convertToModelMessages(filteredMessages),
    });

    return result.toUIMessageStreamResponse({ onError: friendlyError });
  };
}
