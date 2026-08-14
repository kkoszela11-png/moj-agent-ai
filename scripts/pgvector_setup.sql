-- pgvector_setup.sql
-- Skrypt do uruchomienia w Supabase SQL Editor, tworzy tabelę `documents` i funkcję `match_documents`.

-- 1) Włącz rozszerzenie pgvector (wymaga uprawnień admina)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Tabela documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  title text,
  content text,
  embedding vector(768),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- 3) Opcjonalny indeks wektorowy (IVFFLAT). Dostosuj parametr lists do wielkości danych.
-- Uwaga: dla IVFFLAT należy najpierw wstawić dane, a następnie utworzyć indeks
-- lub użyć innego algorytmu zgodnego z Twoją instancją Supabase.
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- 4) Funkcja pomocnicza do dopasowywania dokumentów (match_documents)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.title,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5) Po utworzeniu indeksu możesz uruchomić ANALYZE, np.:
-- ANALYZE documents;

-- Koniec skryptu
