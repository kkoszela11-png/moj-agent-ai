import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import {
  getCurrentDateTime,
  getExchangeRate,
  getWeatherForCity,
} from "@/app/lib/agentTools";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MORNING_BRIEFING_SYSTEM_PROMPT = `Jesteś osobistym asystentem. Napisz poranny briefing w formacie:

# ☀️ Dzień dobry! Twój briefing na [data]

## 🌤️ Pogoda
[temperatura, opis, co ubrać]

## 💶 Kursy walut
- EUR: [kurs] PLN
- USD: [kurs] PLN

## 📅 Dzisiejszy dzień
- Dzień tygodnia: [...]
- Uwagi: [czy dziś święto? dzień wolny?]

## 💡 Porada dnia
[Krótka, pozytywna porada na dzień]

Używaj wyłącznie danych przekazanych w kontekście. Jeśli danych brakuje, napisz o tym wprost zamiast zgadywać.`;

function getWarsawDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const currentDateTime = getCurrentDateTime();
    const date = getWarsawDate();
    const [weather, eur, usd] = await Promise.all([
      getWeatherForCity("Warszawa"),
      getExchangeRate("EUR"),
      getExchangeRate("USD"),
    ]);

    const { text: content } = await generateText({
      model: google("gemini-3.1-flash-lite"),
      system: MORNING_BRIEFING_SYSTEM_PROMPT,
      prompt: `Przygotuj briefing na dzień ${date}.

Dane z narzędzi:
- Data i czas: ${JSON.stringify(currentDateTime)}
- Pogoda w Warszawie: ${JSON.stringify(weather)}
- Kurs EUR: ${JSON.stringify(eur)}
- Kurs USD: ${JSON.stringify(usd)}
`,
    });

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("briefings").insert({
      content,
      date,
    });

    if (error) {
      throw new Error(`Nie udało się zapisać briefingu w Supabase: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      date,
      preview: content.slice(0, 200),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}