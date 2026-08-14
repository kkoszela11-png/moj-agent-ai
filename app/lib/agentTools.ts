import { tool } from "ai";
import { z } from "zod";

type Note = {
  title: string;
  content: string;
  createdAt: string;
};

export const notesStore: Note[] = [];

const ALLOWED_EXPRESSION = /^[0-9+\-*/%.()\s]+$/;

export function safeCalc(expression: string): number {
  if (!ALLOWED_EXPRESSION.test(expression)) {
    throw new Error("Wyrażenie zawiera niedozwolone znaki.");
  }
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${expression});`)();
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Wynik nie jest liczbą.");
  }
  return result;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal, ...init });
  } finally {
    clearTimeout(timeout);
  }
}

export function weatherCodeToDescription(code: number | null | undefined): string {
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
    61: "lekki deszcz",
    63: "śnieg",
    71: "śnieżyca",
    80: "przelotne opady",
    81: "opady",
    95: "burza",
  };
  if (code === null || code === undefined) return "brak danych";
  return mapping[code] || "zmienna pogoda";
}

export function getCurrentDateTime() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    formatted: now.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }),
    dayOfWeek: now.toLocaleDateString("pl-PL", {
      weekday: "long",
      timeZone: "Europe/Warsaw",
    }),
    date: now.toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw" }),
  };
}

export async function getWeatherForCity(city: string) {
  const trimmed = city.trim();
  if (!trimmed) {
    return { error: "Podaj nazwę miasta." };
  }

  const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=1&language=pl`;

  let geocodeRes: Response;
  try {
    geocodeRes = await fetchWithTimeout(geocodeUrl);
  } catch (error) {
    return {
      error: `Timeout — serwer geokodowania nie odpowiedział w 5 sekund. Spróbuj ponownie.`,
    };
  }

  if (!geocodeRes.ok) {
    return { error: `Nie udało się pobrać danych dla miasta ${trimmed}.` };
  }

  const geocode = (await geocodeRes.json()) as {
    results?: Array<{ name?: string; latitude?: number; longitude?: number }>;
  };
  const location = geocode.results?.[0];
  if (!location?.latitude || !location?.longitude) {
    return { error: `Nie znalazłem miasta ${trimmed}. Sprawdź pisownię.` };
  }

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=Europe%2FWarsaw`;
  let weatherRes: Response;
  try {
    weatherRes = await fetchWithTimeout(weatherUrl);
  } catch (error) {
    return {
      error: `Timeout — serwer pogodowy nie odpowiedział w 5 sekund. Spróbuj ponownie.`,
    };
  }

  if (!weatherRes.ok) {
    return { error: `Nie udało się pobrać pogody dla ${trimmed}.` };
  }

  const weather = (await weatherRes.json()) as {
    current_weather?: {
      temperature?: number;
      windspeed?: number;
      weathercode?: number;
    };
  };
  const current = weather.current_weather;
  if (!current) {
    return { error: `Brak danych pogodowych dla ${trimmed}.` };
  }

  return {
    city: location.name || trimmed,
    temperature: current.temperature,
    windSpeed: current.windspeed,
    description: weatherCodeToDescription(current.weathercode),
    currencyHint: "PLN",
    source: "Open-Meteo",
  };
}

export async function getExchangeRate(currency: string) {
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return { error: "Podaj 3-literowy kod waluty, np. EUR, USD." };
  }

  const url = `https://api.nbp.pl/api/exchangerates/rates/a/${code}/?format=json`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    return {
      error: `Timeout — serwer NBP nie odpowiedział w 5 sekund. Spróbuj ponownie.`,
    };
  }

  if (!response.ok) {
    return {
      error: `Waluta ${code} nie jest w tabeli NBP. Popularne: EUR, USD, GBP, CHF.`,
    };
  }

  const data = (await response.json()) as {
    rates?: Array<{ mid?: number; effectiveDate?: string }>;
  };
  const rate = data.rates?.[0]?.mid;
  const date = data.rates?.[0]?.effectiveDate;
  if (!rate) {
    return { error: `Nie udało się pobrać kursu dla ${code}.` };
  }

  return {
    currency: code,
    rate,
    date,
    source: "NBP",
  };
}

export async function getHolidays(countryCode: string, year: number) {
  const code = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return { error: "Podaj 2-literowy kod kraju, np. PL, DE, US." };
  }

  const url = `https://date.nager.at/api/v3/publicholidays/${year}/${code}`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch (error) {
    return {
      error: `Timeout — serwer świąt nie odpowiedział w 5 sekund. Spróbuj ponownie.`,
    };
  }

  if (!response.ok) {
    return { error: `Nie znalazłem świąt dla kraju ${code}.` };
  }

  const data = (await response.json()) as Array<{
    date?: string;
    localName?: string;
    name?: string;
  }>;

  return { holidays: data.slice(0, 15) };
}

async function searchWikipediaSummary(query: string) {
  const url = `https://pl.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as {
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
}

async function searchWikipediaSearch(query: string) {
  const url =
    `https://pl.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query
    )}&format=json&origin=*`;
  let response: Response;
  try {
    response = await fetchWithTimeout(url);
  } catch {
    return null;
  }
  if (!response.ok) return null;
  return (await response.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };
}

export async function searchWikipediaSummaryOrQuery(query: string) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { error: "Podaj frazę do wyszukania." };
  }

  const summary = await searchWikipediaSummary(trimmed);
  if (summary?.extract) {
    return {
      title: summary.title || trimmed,
      summary: summary.extract.slice(0, 1000),
      url: summary.content_urls?.desktop?.page,
    };
  }

  const search = await searchWikipediaSearch(trimmed);
  const title = search?.query?.search?.[0]?.title;
  if (!title) {
    return { error: `Nie znalazłem artykułu dla ${trimmed}.` };
  }

  const fallback = await searchWikipediaSummary(title);
  if (!fallback?.extract) {
    return { error: `Nie znalazłem artykułu dla ${trimmed}.` };
  }

  return {
    title: fallback.title || title,
    summary: fallback.extract.slice(0, 1000),
    url: fallback.content_urls?.desktop?.page,
  };
}

export async function readWebPage(url: string) {
  if (!url.trim()) {
    return { error: "Podaj adres URL." };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
  } catch {
    return {
      error: `Timeout — strona ${url} nie odpowiedziała w 5 sekund. Spróbuj ponownie.`,
    };
  }

  if (!response.ok) {
    return { error: `Nie udało się otworzyć strony: ${response.status}.` };
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

export const agentTools = {
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
    execute: async () => getCurrentDateTime(),
  }),
  getWeather: tool({
    description: "Sprawdza aktualną pogodę w podanym mieście.",
    inputSchema: z.object({ city: z.string().describe("Nazwa miasta") }),
    execute: async ({ city }) => getWeatherForCity(city),
  }),
  getExchangeRate: tool({
    description: "Sprawdza kurs waluty do PLN z NBP.",
    inputSchema: z.object({ currency: z.string().describe("Kod waluty, np. EUR") }),
    execute: async ({ currency }) => getExchangeRate(currency),
  }),
  getHolidays: tool({
    description: "Sprawdza święta państwowe w danym kraju na dany rok.",
    inputSchema: z.object({
      countryCode: z.string().describe("Kod kraju, np. PL"),
      year: z.number().describe("Rok, np. 2026"),
    }),
    execute: async ({ countryCode, year }) => getHolidays(countryCode, year),
  }),
  searchWikipedia: tool({
    description: "Wyszukuje artykuł w Wikipedii i zwraca streszczenie.",
    inputSchema: z.object({ query: z.string().describe("Fraza do wyszukania") }),
    execute: async ({ query }) => searchWikipediaSummaryOrQuery(query),
  }),
  saveNote: tool({
    description: "Zapisuje notatkę w pamięci agenta.",
    inputSchema: z.object({
      title: z.string().describe("Tytuł notatki"),
      content: z.string().describe("Treść notatki"),
    }),
    execute: async ({ title, content }) => {
      notesStore.push({ title, content, createdAt: new Date().toISOString() });
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
};

export const REACT_SYSTEM_PROMPT = `Jesteś autonomicznym agentem. Gdy dostajesz ZADANIE (nie pytanie), MUSISZ je zrealizować krok po kroku.

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
- NIGDY nie wywołuj tego samego narzędzia z tymi samymi argumentami dwa razy z rzędu
- Jeśli po 3 nieudanych próbach nie masz danych — powiedz wprost czego brakuje
- Odpowiadaj po polsku`;

export const TRAVEL_SYSTEM_PROMPT = `Jesteś profesjonalnym asystentem podróży. Gdy użytkownik opisuje planowaną podróż, AUTONOMICZNIE zbierasz wszystkie potrzebne informacje.

## TWÓJ PROCES:
Dla każdej podróży MUSISZ sprawdzić:
1. 🌤️ Pogodę w miejscu docelowym (getWeather)
2. 💶 Kurs lokalnej waluty (getExchangeRate)
3. 📅 Dni wolne/święta w kraju docelowym (getHolidays)
4. 📖 Informacje o mieście (searchWikipedia)
5. 🧮 Przeliczenie budżetu jeśli podany (calculator)

Po zebraniu danych, wygeneruj GOTOWY PLAN w formacie:

## 🗺️ Plan podróży: [MIASTO]

### 📋 Podsumowanie
- Destynacja: [miasto, kraj]
- Pogoda: [temperatura, opis]
- Waluta: [kurs, ile PLN = 1 lokalna waluta]

### 🌤️ Pogoda
[Szczegóły pogody + co spakować]

### 💰 Budżet
[Przeliczenia walutowe, orientacyjne koszty]

### 📅 Ważne daty
[Święta, dni wolne — co może być zamknięte?]

### 🏛️ Co zobaczyć
[Na podstawie Wikipedii i Google — główne atrakcje]

### ✅ Checklist przed wyjazdem
[Lista rzeczy do zrobienia/spakowania]

## ZASADY:
- Używaj PRAWDZIWYCH danych z narzędzi — nie zgaduj
- Jeśli narzędzie zwróci błąd — NIE powtarzaj tego samego wywołania
- Zamiast tego: poinformuj użytkownika i zaproponuj alternatywę
- Jeśli narzędzie zwróci błąd, kontynuuj i zbierz inne informacje
- NIGDY nie wywołuj tego samego narzędzia z tymi samymi argumentami dwa razy z rzędu
- Jeśli po 3 nieudanych próbach nie masz danych — powiedz wprost czego brakuje
- Bądź praktyczny — konkretne rady, nie ogólniki
- Podawaj ceny w PLN (przeliczone po aktualnym kursie)
- Odpowiadaj po polsku`;
