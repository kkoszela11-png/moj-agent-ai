import { google } from "@ai-sdk/google";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { friendlyError } from "@/app/lib/createChatRoute";
import { generateImageData } from "@/app/lib/imageGen";

export const maxDuration = 60;
const REACT_MODEL = "gemini-3.1-flash-lite";
const ENABLE_SEARCH_GROUNDING = process.env.ENABLE_SEARCH_GROUNDING === "true";

if (process.env.ENABLE_SEARCH_GROUNDING === "true") {
  console.warn(
    '⚠️ UWAGA: Search Grounding jest WŁĄCZONY. ' +
      'To jest najdroższa funkcja API ($14/1000 zapytań). ' +
      'Używaj TYLKO do testów. Wyłącz po testach usuwając ENABLE_SEARCH_GROUNDING z .env.local, ' +
      'bo inni uczestnicy kursu mają wtedy ograniczony dostęp do modeli.'
  );
}

type Note = {
  title: string;
  content: string;
  createdAt: string;
};

const notesStore: Note[] = [];

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

function weatherCodeToDescription(code: number): string {
  const mapping: Record<number, string> = {
    0: "bezchmurnie",
    1: "prawie bezchmurnie",
    2: "częściowo pochmurno",
    3: "pochmurno",
    45: "mgła",
    48: "szadź",
    51: "lekki deszcz",
    53: "umiarkowany deszcz",
    55: "intensywny deszcz",
    61: "lekki śnieg",
    63: "śnieg",
    71: "śnieżyca",
    80: "przelotne opady",
    81: "opady",
    95: "burza",
  };
  return mapping[code] || "zachmurzenie";
}

async function readWebPage(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) {
    throw new Error(`Nie udało się otworzyć strony: ${response.status}`);
  }

  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    url,
    text: text.slice(0, 4000),
    ok: true,
  };
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google(REACT_MODEL),
    system: `Jesteś autonomicznym agentem. Gdy dostajesz ZADANIE (nie pytanie), MUSISZ je zrealizować krok po kroku.

## TWÓJ PROCES:
Dla KAŻDEGO kroku wypisz:

### 🧠 Myślę...
Co muszę teraz zrobić? Jakie informacje mi brakuje? Które narzędzie użyć?

Potem UŻYJ narzędzia.

Po otrzymaniu wyniku:

### 👁️ Obserwuję...
Co dostałem? Czy to wystarczy do odpowiedzi? Jeśli nie — jaki następny krok?

Powtarzaj aż będziesz mieć WSZYSTKO co potrzebne.

Na koniec:

### ✅ Wynik końcowy
Podaj pełną, konkretną odpowiedź opartą na zebranych danych.
Cytuj źródła (API, Wikipedia, Google).

## ZASADY:
- ZAWSZE pokazuj tok myślenia — użytkownik widzi cały proces
- NIE zgaduj — jeśli potrzebujesz danych, UŻYJ narzędzia
- Maksymalnie 5 głównych kroków
- Jeśli narzędzie zwróci błąd — spróbuj inaczej lub poinformuj
- ŁĄCZ dane z wielu narzędzi w spójną odpowiedź
- Odpowiadaj po polsku`,
    tools: {
      calculator: tool({
        description: "Oblicza wyrażenia matematyczne. Używaj do dokładnych obliczeń.",
        inputSchema: z.object({
          expression: z.string().describe("Wyrażenie matematyczne, np. '15 * 247'"),
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
        description: "Zwraca aktualną datę i czas.",
        inputSchema: z.object({}),
        execute: async () => {
          const now = new Date();
          return {
            dateTime: now.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }),
            dayOfWeek: now.toLocaleDateString("pl-PL", {
              weekday: "long",
              timeZone: "Europe/Warsaw",
            }),
            timestamp: now.toISOString(),
          };
        },
      }),
      getWeather: tool({
        description: "Sprawdza aktualną pogodę w podanym mieście.",
        inputSchema: z.object({ city: z.string().describe("Nazwa miasta") }),
        execute: async ({ city }) => {
          const geocodeRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=pl`
          );
          if (!geocodeRes.ok) {
            return { error: `Nie udało się pobrać danych dla miasta ${city}` };
          }
          const geocode = await geocodeRes.json() as { results?: Array<{ name?: string; latitude?: number; longitude?: number }> };
          const location = geocode.results?.[0];
          if (!location?.latitude || !location?.longitude) {
            return { error: `Nie znalazłem miasta ${city}` };
          }

          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
          );
          if (!weatherRes.ok) {
            return { error: `Nie udało się pobrać pogody dla ${city}` };
          }
          const weather = await weatherRes.json() as {
            current?: {
              temperature_2m?: number;
              relative_humidity_2m?: number;
              wind_speed_10m?: number;
              weather_code?: number;
            };
          };
          const current = weather.current;
          return {
            city: location.name || city,
            temperature: current?.temperature_2m,
            humidity: current?.relative_humidity_2m,
            windSpeed: current?.wind_speed_10m,
            description: weatherCodeToDescription(current?.weather_code ?? 0),
          };
        },
      }),
      getExchangeRate: tool({
        description: "Sprawdza kurs waluty do PLN z NBP.",
        inputSchema: z.object({ currency: z.string().describe("Kod waluty, np. EUR") }),
        execute: async ({ currency }) => {
          const response = await fetch(
            `https://api.nbp.pl/api/exchangerates/rates/a/${currency.toUpperCase()}/?format=json`
          );
          if (!response.ok) {
            return {
              error: `Waluta ${currency.toUpperCase()} nie jest w tabeli NBP. Popularne: EUR, USD, GBP, CHF`,
            };
          }
          const data = await response.json() as {
            rates?: Array<{ mid?: number; effectiveDate?: string }>;
          };
          return {
            currency: currency.toUpperCase(),
            rate: data.rates?.[0]?.mid,
            date: data.rates?.[0]?.effectiveDate,
            source: "NBP",
          };
        },
      }),
      getHolidays: tool({
        description: "Sprawdza święta państwowe w danym kraju na dany rok.",
        inputSchema: z.object({
          countryCode: z.string().describe("Kod kraju, np. PL"),
          year: z.number().describe("Rok, np. 2026"),
        }),
        execute: async ({ countryCode, year }) => {
          const response = await fetch(
            `https://date.nager.at/api/v3/publicholidays/${year}/${countryCode.toUpperCase()}`
          );
          if (!response.ok) {
            return { error: `Nie znalazłem świąt dla kraju ${countryCode.toUpperCase()}` };
          }
          const data = await response.json() as Array<{ date?: string; localName?: string; name?: string }>;
          return { holidays: data.slice(0, 15) };
        },
      }),
      searchWikipedia: tool({
        description: "Wyszukuje artykuł w Wikipedii i zwraca streszczenie.",
        inputSchema: z.object({ query: z.string().describe("Fraza do wyszukania") }),
        execute: async ({ query }) => {
          const summaryUrl = `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
          const summaryRes = await fetch(summaryUrl);
          if (summaryRes.ok) {
            const summary = await summaryRes.json() as {
              title?: string;
              extract?: string;
              content_urls?: { desktop?: { page?: string } };
            };
            return {
              title: summary.title,
              summary: (summary.extract || "").slice(0, 1000),
              url: summary.content_urls?.desktop?.page,
            };
          }

          const searchRes = await fetch(
            `https://pl.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`
          );
          if (!searchRes.ok) {
            return { error: `Nie znalazłem artykułu dla ${query}` };
          }
          const search = await searchRes.json() as {
            query?: { search?: Array<{ title?: string }> };
          };
          const title = search.query?.search?.[0]?.title;
          if (!title) {
            return { error: `Nie znalazłem artykułu dla ${query}` };
          }

          const fallbackRes = await fetch(
            `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
          );
          if (!fallbackRes.ok) {
            return { error: `Nie znalazłem artykułu dla ${query}` };
          }
          const fallback = await fallbackRes.json() as {
            title?: string;
            extract?: string;
            content_urls?: { desktop?: { page?: string } };
          };
          return {
            title: fallback.title || title,
            summary: (fallback.extract || "").slice(0, 1000),
            url: fallback.content_urls?.desktop?.page,
          };
        },
      }),
      saveNote: tool({
        description: "Zapisuje notatkę w pamięci agenta.",
        inputSchema: z.object({
          title: z.string().describe("Tytuł notatki"),
          content: z.string().describe("Treść notatki"),
        }),
        execute: async ({ title, content }) => {
          notesStore.push({
            title,
            content,
            createdAt: new Date().toISOString(),
          });
          return { saved: true, title };
        },
      }),
      getNotes: tool({
        description: "Pobiera wszystkie zapisane notatki.",
        inputSchema: z.object({}),
        execute: async () => ({ notes: notesStore }),
      }),
      readWebPage: tool({
        description: "Czyta treść strony WWW i zwraca jej streszczenie.",
        inputSchema: z.object({ url: z.string().describe("Adres URL strony") }),
        execute: async ({ url }) => readWebPage(url),
      }),
      generateImage: tool({
        description: "Generuje obraz na podstawie opisu.",
        inputSchema: z.object({ prompt: z.string().describe("Opis obrazu") }),
        execute: async ({ prompt }) => {
          try {
            const { image, model } = await generateImageData(prompt);
            return { image, model, ok: true };
          } catch (e) {
            return { ok: false, error: friendlyError(e) };
          }
        },
      }),
      ...(ENABLE_SEARCH_GROUNDING
        ? {
            google_search: google.tools.googleSearch({}),
            url_context: google.tools.urlContext({}),
          }
        : {}),
    },
    stopWhen: stepCountIs(8),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: friendlyError,
  });
}
