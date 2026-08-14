-- migration_auth_user_id.sql
-- Uruchom w Supabase SQL Editor.
-- Cel:
-- 1) conversations.user_id (uuid, docelowo NOT NULL)
-- 2) documents.user_id (uuid)
-- 3) user_profiles.id powiązane z auth.uid()

BEGIN;

-- 1) Dodaj kolumny user_id
ALTER TABLE IF EXISTS public.conversations
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE IF EXISTS public.documents
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Ustaw domyślne wartości z zalogowanego użytkownika
ALTER TABLE IF EXISTS public.conversations
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.documents
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE IF EXISTS public.user_profiles
  ALTER COLUMN id SET DEFAULT auth.uid();

-- 3) Opcjonalnie: relacje do auth.users (bezpiecznie, jeśli już istnieją dane)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_user_id_fkey'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_user_id_fkey'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_id_fkey'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) conversations.user_id jako NOT NULL
-- Jeśli masz stare rekordy bez user_id, ta komenda może się nie udać.
-- Wtedy najpierw uzupełnij user_id albo usuń stare rekordy.
ALTER TABLE IF EXISTS public.conversations
  ALTER COLUMN user_id SET NOT NULL;

COMMIT;
