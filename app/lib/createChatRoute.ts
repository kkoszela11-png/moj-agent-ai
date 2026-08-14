import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

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
    const { messages }: { messages: UIMessage[] } = await req.json();

    const filteredMessages = (messages ?? []).filter((m: any) => m.role !== "system");
    const result = streamText({
      model: google(MODEL),
      instructions: system,
      maxSteps: 3,
      messages: await convertToModelMessages(filteredMessages),
    });

    return result.toUIMessageStreamResponse({ onError: friendlyError });
  };
}
