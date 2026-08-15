import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPPORTED_TYPES = ["feedback", "alert", "order"] as const;
type WebhookType = (typeof SUPPORTED_TYPES)[number];

const SYSTEM_PROMPTS: Record<WebhookType, string> = {
  feedback: `Jesteś asystentem obsługi klienta. Otrzymujesz feedback klienta w formacie JSON.
Przeanalizuj go i zwróć krótką, konkretną analizę w formacie:

Sentiment: [pozytywny/neutralny/negatywny]
Priorytet: [wysoki/średni/niski]
Sugerowana odpowiedź: [krótki, uprzejmy szkic odpowiedzi do klienta]`,
  alert: `Jesteś asystentem DevOps monitorującym alerty systemowe. Otrzymujesz alert w formacie JSON.
Przeanalizuj go i zwróć krótką, konkretną analizę w formacie:

Severity: [krytyczny/wysoki/średni/niski]
Rekomendowana akcja: [konkretna, praktyczna akcja do wykonania]`,
  order: `Jesteś asystentem obsługi zamówień. Otrzymujesz dane zamówienia w formacie JSON.
Potwierdź zamówienie i napisz krótkie podsumowanie w formacie:

Potwierdzenie: [krótkie potwierdzenie przyjęcia zamówienia]
Podsumowanie: [produkt, klient, kwota]`,
};

function isSupportedType(value: unknown): value is WebhookType {
  return typeof value === "string" && (SUPPORTED_TYPES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  let body: { type?: unknown; data?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Nieprawidłowy JSON." }, { status: 400 });
  }

  const { type, data } = body;

  if (!isSupportedType(type)) {
    return NextResponse.json(
      {
        success: false,
        error: `Nieobsługiwany typ zdarzenia. Obsługiwane: ${SUPPORTED_TYPES.join(", ")}.`,
      },
      { status: 400 }
    );
  }

  if (data === undefined || data === null) {
    return NextResponse.json({ success: false, error: "Brak pola data." }, { status: 400 });
  }

  try {
    const { text: analysis } = await generateText({
      model: google("gemini-3.1-flash-lite"),
      system: SYSTEM_PROMPTS[type],
      prompt: `Dane zdarzenia (JSON):\n${JSON.stringify(data)}`,
    });

    const supabase = createSupabaseServerClient();
    const { data: inserted, error } = await supabase
      .from("webhook_events")
      .insert({ type, data, analysis })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Nie udało się zapisać zdarzenia w Supabase: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      analysis,
      event_id: inserted.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
