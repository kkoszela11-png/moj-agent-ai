import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { agentTools } from "@/app/lib/agentTools";

export const maxDuration = 60;

const COMPETITOR_MODEL = "gemini-3.1-flash-lite";
const ENABLE_SEARCH_GROUNDING = process.env.ENABLE_SEARCH_GROUNDING === "true";

const COMPETITOR_SYSTEM_PROMPT = `Jesteś analitykiem konkurencji. Gdy użytkownik poda nazwy firm,
AUTONOMICZNIE zbierasz informacje i porównujesz je.

## TWÓJ PROCES:
1. Dla KAŻDEJ firmy: szukaj informacji (Google, Wikipedia, strony firmowe)
2. Zbierz: opis, branża, wielkość, produkty, ceny, mocne/słabe strony
3. Stwórz tabelę porównawczą
4. Napisz rekomendację

## FORMAT:

# 🏢 Analiza konkurencji

## Porównanie

| Aspekt | [Firma 1] | [Firma 2] | [Firma 3] |
|--------|-----------|-----------|-----------|
| Branża | ... | ... | ... |
| Wielkość | ... | ... | ... |
| Główny produkt | ... | ... | ... |
| Mocne strony | ... | ... | ... |
| Słabe strony | ... | ... | ... |
| Ceny (orientacyjne) | ... | ... | ... |

## Szczegółowa analiza
[Rozwinięcie dla każdej firmy — 3-4 zdania]

## Rekomendacja
[Która firma jest najlepsza i dlaczego — w kontekście użytkownika]

## Źródła
[Linki do stron firmowych i artykułów]

ZASADY:
- Używaj PRAWDZIWYCH i aktualnych danych — Google Search, Wikipedia, strony firmowe
- Podawaj źródło przy każdym istotnym fakcie
- Bądź konkretny — liczby, daty, nazwy
- Wyraźnie oznacz dane orientacyjne i brakujące informacje
- Nie wymyślaj danych ani cen — jeśli nie możesz ich potwierdzić, napisz o tym
- Odpowiadaj po polsku`;

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];

  if (!messages.length) {
    return Response.json({ error: "Podaj nazwy firm do porównania." }, { status: 400 });
  }

  const result = streamText({
    model: google(COMPETITOR_MODEL),
    system: COMPETITOR_SYSTEM_PROMPT,
    tools: {
      searchWikipedia: agentTools.searchWikipedia,
      readWebPage: agentTools.readWebPage,
      ...(ENABLE_SEARCH_GROUNDING
        ? { google_search: google.tools.googleSearch({}) }
        : {}),
    },
    stopWhen: stepCountIs(10),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ sendSources: true });
}
