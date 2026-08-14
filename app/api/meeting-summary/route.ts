import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { agentTools } from "@/app/lib/agentTools";

export const maxDuration = 60;

const MEETING_SUMMARY_PROMPT = `Jesteś profesjonalnym asystentem do podsumowywania spotkań.

Z surowych notatek przygotuj po polsku klarowne, konkretne podsumowanie. Zachowuj wyłącznie
informacje obecne w notatkach. Nie wymyślaj uczestników, decyzji, terminów ani właścicieli zadań.
Jeśli informacji brakuje, oznacz to jako "Brak informacji w notatkach".

FORMAT ODPOWIEDZI:
# 📋 Podsumowanie spotkania
## Agenda
## Najważniejsze ustalenia
## Decyzje
## Action items
Użyj tabeli: | Zadanie | Osoba odpowiedzialna | Deadline | Status |
## Otwarte pytania i ryzyka
## Następne kroki

Jeśli w notatkach pojawia się konkretna firma lub organizacja, możesz użyć searchWikipedia,
aby dodać krótki, wyraźnie oznaczony kontekst. Nie zastępuj nim faktów ze spotkania.
Odpowiadaj profesjonalnie i zwięźle.`;

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];

  if (!messages.length) {
    return Response.json({ error: "Wklej notatki ze spotkania." }, { status: 400 });
  }

  const result = streamText({
    model: google("gemini-3.1-flash-lite"),
    system: MEETING_SUMMARY_PROMPT,
    tools: { searchWikipedia: agentTools.searchWikipedia },
    stopWhen: stepCountIs(4),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ sendSources: true });
}