# pgvector — instrukcja uruchomienia

Ten plik opisuje, jak włączyć `pgvector` i utworzyć tabelę `documents` w Supabase.

Kroki:

1. Otwórz Supabase Dashboard → Twoja baza → SQL Editor.
2. Otwórz plik `pgvector_setup.sql` i wklej całą zawartość do SQL Editor, lub użyj przycisku "Run SQL file".
3. Uruchom skrypt. Powinien wykonać się bez błędów.

Uwaga:
- Jeśli nie widzisz rozszerzenia `vector`, upewnij się, że masz dostęp administratora do projektu.
- Typ kolumny to `vector(768)` — odpowiada embeddingom z modelu `text-embedding-004`.
- Indeks IVFFLAT wymaga konfiguracji `lists`; można pominąć indeks i korzystać z prostszych wyszukiwań dla małych zbiorów.

Test:
- Po uruchomieniu w SQL Editor wpisz `SELECT * FROM documents LIMIT 1;` — powinno zwrócić 0 wierszy (tabela istnieje).
