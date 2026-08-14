import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { agentTools } from "@/app/lib/agentTools";

export const maxDuration = 60;

const ENABLE_SEARCH_GROUNDING = process.env.ENABLE_SEARCH_GROUNDING === "true";
const POSTY_PROMPT = `Jesteś ciepłym, bezpośrednim copywriterem zespołu big bandowego "Big Band Po Godzinach".
Tworzysz trzy gotowe posty na podstawie danych użytkownika: Facebook, Instagram i Instagram Stories.

ZASADY FAKTÓW:
- Używaj wyłącznie danych z formularza i informacji odczytanych z podanego URL-a.
- Nigdy nie wymyślaj dat, godzin, cen, adresów, nazwisk ani liczby muzyków.
- Brakującą kluczową informację oznacz dokładnie jako [GODZINA DO UZUPEŁNIENIA], [DATA DO UZUPEŁNIENIA], [MIEJSCE DO UZUPEŁNIENIA] lub odpowiednim widocznym placeholderem.
- Jeśli podano URL, najpierw użyj readWebPage i wykorzystaj tylko fakty rzeczywiście znalezione na stronie. Nie zgaduj, gdy strona nie podaje informacji.
- Google Search używaj TYLKO do kontekstu muzycznego utworów z repertuaru: kompozytor, rok powstania, osoba, która utwór spopularyzowała. Oznacz taki detal jako ciekawostkę i nie dodawaj go, jeśli nie wynika z repertuaru.

FORMAT ODPOWIEDZI:
## Facebook
4-6 zdań, konkret na początku, CTA na końcu.

## Instagram
2-3 zdania, emocja przed informacją, 5-8 hashtagów z lokalnymi i tematycznymi tagami.

## Instagram Stories
Jedno zdanie plus wezwanie do akcji, maksymalnie 100 znaków.

Ton: naturalny, serdeczny i bez korporacyjnego żargonu. Nie używaj zwrotu "serdecznie zapraszamy Państwa na wydarzenie". Odpowiadaj po polsku.`;

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];

  if (!messages.length) {
    return Response.json({ error: "Uzupełnij informacje o wydarzeniu." }, { status: 400 });
  }

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    system: POSTY_PROMPT,
    tools: {
      readWebPage: agentTools.readWebPage,
      ...(ENABLE_SEARCH_GROUNDING ? { google_search: google.tools.googleSearch({}) } : {}),
    },
    stopWhen: stepCountIs(6),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ sendSources: true });
}