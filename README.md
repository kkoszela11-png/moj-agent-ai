# Mój Agent AI — Warsztaty 1–3 (+ Zadanie 2)

Aplikacja webowa: jeden agent AI z **9 trybami**, oparty na Google Gemini.
Od zwykłego czatu, przez techniki promptowe, po agenta używającego narzędzi
(wyszukiwarka, analiza i generowanie obrazów).

## Stack
- **Next.js 16** (App Router, TypeScript)
- **Vercel AI SDK** (`ai`, `@ai-sdk/react`, `@ai-sdk/google`)
- **@google/genai** — generowanie obrazów
- **react-markdown** + **remark-gfm** — renderowanie tabel/list
- **zod** — schematy narzędzi agenta
- **Provider:** Google Generative AI (Gemini)

## Tryby (pasek nawigacji na górze każdej strony)

| Tryb | Strona | Endpoint | Skąd | Co robi |
|------|--------|----------|------|---------|
| 🤖 Agent | `/agent` | `/api/agent` | L3·W4 | Autonomiczny agent z narzędziami: kalkulator, data/czas, generowanie obrazów. Pokazuje oś czasu użytych narzędzi |
| 💬 Chat | `/` | `/api/chat` | L1·W1 | Zwykła rozmowa z Gemini |
| 🧠 Myślenie | `/think` | `/api/think` | L2·W2 | Chain of Thought — tok rozumowania krok po kroku |
| 🌐 Szukaj | `/search` | `/api/search` | L3·W1 | Wyszukiwarka Google (grounding) + czytanie stron WWW + źródła |
| 🎨 Grafiki | `/generate` | `/api/generate-image` | L3·W2 | Generowanie obrazów z opisu (pobieranie PNG/JPEG) |
| 👁️ Vision | `/vision` | `/api/vision` | L3·W3 | Analiza obrazów: Ctrl+V, upload, drag&drop, OCR, kolory HEX |
| 📚 Słownik | `/fewshot` | `/api/fewshot` | L2·W3 | Few-Shot — pojęcia w stałym formacie (📖 → ⚡ → 🔗) |
| 📐 Formater | `/format` | `/api/format` | L2·W4 | Komendy `/tabela`, `/lista`, `/porownanie`, `/faq`, `/email` |
| 💼 Oferta | `/oferta` | `/api/oferta` | Zadanie 2 | `/oferta [temat]` → gotowa oferta handlowa (Few-Shot) |

## Wspólne funkcje
- Ciemny motyw, streaming odpowiedzi, wskaźnik „Myślę…", auto-scroll
- Renderowanie markdown (tabele, listy, pogrubienia)
- Załączanie obrazów: **Ctrl+V**, przycisk 📎, **drag & drop** (Vision, Agent)
- Oś czasu narzędzi + obrazy generowane inline (Agent)
- Klikalne źródła z wyszukiwarki (Szukaj)
- Przyjazne komunikaty o limitach darmowego planu

## Struktura
```
moj-agent/
├─ app/
│  ├─ api/
│  │  ├─ chat, think, fewshot, format, oferta   → tryby tekstowe (createChatRoute)
│  │  ├─ search/route.ts        → 🌐 wyszukiwarka (googleSearch + urlContext)
│  │  ├─ vision/route.ts        → 👁️ analiza obrazów
│  │  ├─ generate-image/route.ts→ 🎨 generowanie obrazów
│  │  └─ agent/route.ts         → 🤖 agent z narzędziami (tool calling)
│  ├─ components/
│  │  ├─ ChatUI.tsx   → wspólny czat: markdown, obrazy, oś czasu narzędzi, źródła
│  │  └─ Nav.tsx      → pasek nawigacji (9 trybów)
│  ├─ lib/
│  │  ├─ createChatRoute.ts → fabryka endpointów + stałe modeli + obsługa błędów
│  │  └─ imageGen.ts        → generowanie obrazów (Google → fallback Pollinations)
│  ├─ <tryb>/page.tsx  → strony poszczególnych trybów
│  ├─ layout.tsx, globals.css
├─ package.json, tsconfig.json, next.config.ts
├─ .env.example
├─ README.md
└─ KOMENDA_OFERTA.md   → specyfikacja komendy /oferta (Zadanie 2)
```

### Jak to jest zbudowane
Tryby tekstowe nie kopiują kodu: każda strona to kilka linijek na wspólnym
komponencie `ChatUI`, a każdy endpoint to jedna linijka z `createChatRoute` —
różnią się tylko **system promptem**. To pokazuje, że o zachowaniu agenta
decyduje prompt, a nie kod.

## Uruchomienie
1. `npm install`
2. Skopiuj `.env.example` → `.env.local` i wpisz klucz z aistudio.google.com:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=twoj_klucz
   ```
3. `npm run dev`
4. Otwórz http://localhost:3000

## Uwagi techniczne (dopasowania do realnych wersji bibliotek)
- **Modele:** tryby tekstowe używają `gemini-2.5-flash-lite` (`MODEL`), a wyszukiwarka
  `gemini-2.5-flash` (`SEARCH_MODEL` — jedyny darmowy z groundingiem). Stałe w `lib/createChatRoute.ts`.
- **`ai@7`:** `convertToModelMessages` jest asynchroniczna → wywoływana z `await`;
  endpoint wskazywany przez `useChat({ transport: new DefaultChatTransport({ api }) })`.
- **Agent (W4):** Gemini **nie pozwala łączyć** wyszukiwarki Google (grounding)
  z własnymi narzędziami (function calling) w jednym zapytaniu — przy groundingu
  ignoruje funkcje. Dlatego agent używa tylko własnych narzędzi, a wyszukiwarka
  ma osobny tryb `/search`.
- **Generowanie obrazów:** model Google (`gemini-3.1-flash-lite-image`) wymaga
  włączonej płatności (na darmowym planie `limit: 0`). Kod próbuje go pierwszego,
  a jako darmowy fallback używa **Pollinations.ai** (usługa zewnętrzna, bez klucza).
  Po włączeniu billingu w Google kod automatycznie użyje modelu Google.
