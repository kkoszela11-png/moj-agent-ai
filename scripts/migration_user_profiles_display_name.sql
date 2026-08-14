-- migration_user_profiles_display_name.sql
-- Uruchom w Supabase SQL Editor.
-- Cel: profile mają pole display_name zamiast historycznego name.

BEGIN;

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- Backfill z poprzedniej kolumny name (jeśli istnieje i ma dane)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'name'
  ) THEN
    EXECUTE '
      UPDATE public.user_profiles
      SET display_name = name
      WHERE display_name IS NULL
        AND name IS NOT NULL
    ';
  END IF;
END $$;

-- Powiązanie profilu z auth.uid()
ALTER TABLE IF EXISTS public.user_profiles
  ALTER COLUMN id SET DEFAULT auth.uid();

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

COMMIT;
