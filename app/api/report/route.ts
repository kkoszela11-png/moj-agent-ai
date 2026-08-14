import { google } from "@ai-sdk/google";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { agentTools } from "@/app/lib/agentTools";

export const maxDuration = 60;

const REPORT_MODEL = "gemini-3.1-flash-lite";
const ENABLE_SEARCH_GROUNDING = process.env.ENABLE_SEARCH_GROUNDING === "true";

if (ENABLE_SEARCH_GROUNDING) {
  console.warn(
    "⚠️ UWAGA: Search Grounding jest WŁĄCZONY. " +
      "To jest najdroższa funkcja API ($14/1000 zapytań). " +
      "Używaj TYLKO do testów. Wyłącz po testach usuwając ENABLE_SEARCH_GROUNDING z .env.local, " +
      "bo inni uczestnicy kursu mają wtedy ograniczony dostęp do modeli."
  );
}

const REPORT_SYSTEM_PROMPT = `Jesteś profesjonalnym analitykiem biznesowym. Gdy użytkownik poda temat,
AUTONOMICZNIE zbierasz informacje i piszesz raport.

## TWÓJ PROCES:
1. Przeanalizuj temat — co trzeba zbadać?
2. Szukaj danych: Google Search, Wikipedia, strony branżowe
3. Zbierz fakty, liczby, statystyki
4. Napisz raport w profesjonalnym formacie

## FORMAT RAPORTU:

# 📊 Raport: [TEMAT]
Data: [dzisiejsza data]
Autor: Agent AI

## Streszczenie (Executive Summary)
[3-4 zdania — kluczowe wnioski]

## 1. Wprowadzenie
[Kontekst, dlaczego ten temat jest ważny]

## 2. Kluczowe dane i fakty
[Wylistowane punkty z danymi — ze źródłami]

## 3. Analiza
[Interpretacja danych, trendy, porównania]

## 4. Wnioski i rekomendacje
[Co z tego wynika? Co robić?]

## Źródła
[Lista użytych źródeł z linkami]

ZASADY:
- Używaj PRAWDZIWYCH danych — Google Search, Wikipedia
- Podawaj źródła przy każdym fakcie
- Bądź konkretny — liczby, daty, nazwy
- Raport powinien mieć 500-1000 słów
- Nie wymyślaj statystyk — szukaj!`;

export async function POST(req: Request) {
  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = body.messages ?? [];

  if (!messages.length) {
    return Response.json({ error: "Podaj temat raportu." }, { status: 400 });
  }

  const result = streamText({
    model: google(REPORT_MODEL),
    system: REPORT_SYSTEM_PROMPT,
    tools: {
      calculator: agentTools.calculator,
      searchWikipedia: agentTools.searchWikipedia,
      readWebPage: agentTools.readWebPage,
      ...(ENABLE_SEARCH_GROUNDING
        ? { google_search: google.tools.googleSearch({}) }
        : {}),
    },
    stopWhen: stepCountIs(8),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({ sendSources: true });
}