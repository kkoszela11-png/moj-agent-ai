import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { friendlyError, SEARCH_MODEL } from "@/app/lib/createChatRoute";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(SEARCH_MODEL),
    system: `Jesteś asystentem z dostępem do prawdziwego internetu przez Google.
- Gdy pytanie dotyczy aktualnych informacji (newsy, ceny, wyniki, kursy, "kto/co teraz") — użyj wyszukiwarki Google i podaj konkretne, aktualne dane.
- Gdy użytkownik poda URL — przeczytaj tę stronę i streść jej treść.
- Gdy pytanie NIE wymaga aktualnych danych (np. żart, definicja, prosta rozmowa) — odpowiedz normalnie, bez szukania.
- Zawsze odpowiadaj po polsku, zwięźle i konkretnie. Powołuj się na źródła, gdy korzystasz z internetu.`,
    tools: {
      google_search: google.tools.googleSearch({}),
      url_context: google.tools.urlContext({}),
    },
    maxSteps: 3,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: friendlyError,
  });
}
