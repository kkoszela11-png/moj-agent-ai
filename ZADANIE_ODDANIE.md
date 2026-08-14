# Oddanie zadania

## Co oddajesz

▸ **Asystent podróży** (`/travel`)
- W pełni działający agent ReAct specjalizowany w planowaniu wyjazdów.
- Autonomiczne zbieranie danych: pogoda, kurs waluty, święta, informacje z Wikipedii, budżet.
- Nowa funkcja: **porównywanie destynacji** i generowanie gotowego planu podróży z checklistą.
- Obsługa błędów narzędziowych i czytelne komunikaty w przypadku problemu.

▸ **Dashboard** (`/`)
- Główna strona startowa aplikacji z panelem informacyjnym.
- Karty:
  - Pogoda dla miasta Warszawa
  - Kursy walut (EUR i USD)
  - Nadchodzące święta w Polsce
  - Szybkie akcje do przejścia do najważniejszych trybów
- Dodatkowa karta: **Nadchodzące święta** jako nowa, praktyczna sekcja na dashboardzie.

▸ **Screenshot reakcji osoby spoza IT**
- Dołączony screen powinien przedstawiać wrażenie użytkownika spoza IT po pierwszym kontakcie z czatem.
- Umieść zrzut ekranu w folderze `screenshots/` razem z tego pliku.
- Nazwij plik `screenshot-czat.png` lub `screenshot-czat.jpg`.

## Instrukcja uruchomienia

1. Otwórz terminal w katalogu projektu:
   `c:\Users\kkosz\OneDrive\Pulpit\Agenci_ AI\Lekcja 1\moj-agent`
2. Uruchom serwer:
   `npm install`
   `npm run dev`
3. Przejdź do:
   - `http://127.0.0.1:3000/` — dashboard
   - `http://127.0.0.1:3000/travel` — asystent podróży
   - `http://127.0.0.1:3000/react` — agent ReAct
   - `http://127.0.0.1:3000/chat` — zwykły chat

## Uwagi

- Projekt używa Next.js i `@ai-sdk/google`.
- Klucz API Google Generative AI powinien być ustawiony w pliku `.env.local`.
- Screenshot reakcji należy dodać ręcznie w folderze `screenshots/`.
