-- Migration: Add Full-Text Search to generated_letters
-- Date: 2025-11-19
-- Purpose: Enable fast Hebrew text search across letter history

-- Step 1: Add search_vector column
ALTER TABLE generated_letters
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Step 2: Create function to update search vector
-- Uses 'simple' config for Hebrew support (PostgreSQL 'hebrew' config may not be available)
CREATE OR REPLACE FUNCTION update_generated_letters_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.generated_content_text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(
      (SELECT c.company_name FROM clients c WHERE c.id = NEW.client_id), ''
    )), 'A') ||
    setweight(to_tsvector('simple', coalesce(
      (SELECT c.commercial_name FROM clients c WHERE c.id = NEW.client_id), ''
    )), 'B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add comment to function
COMMENT ON FUNCTION update_generated_letters_search_vector() IS
'Updates search_vector column for full-text search. Weights: A=subject+company (highest), B=content+commercial_name';

-- Step 4: Create GIN index for fast search
CREATE INDEX IF NOT EXISTS idx_generated_letters_search_vector
  ON generated_letters
  USING GIN(search_vector);

-- Step 5: Create trigger for automatic updates
DROP TRIGGER IF EXISTS trg_update_generated_letters_search ON generated_letters;

CREATE TRIGGER trg_update_generated_letters_search
  BEFORE INSERT OR UPDATE OF subject, generated_content_text, client_id
  ON generated_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_letters_search_vector();

-- Step 6: Backfill existing letters
-- This may take time on large datasets, but we're starting with ~100 letters
UPDATE generated_letters
SET search_vector =
  setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(generated_content_text, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(
    (SELECT c.company_name FROM clients c WHERE c.id = generated_letters.client_id), ''
  )), 'A') ||
  setweight(to_tsvector('simple', coalesce(
    (SELECT c.commercial_name FROM clients c WHERE c.id = generated_letters.client_id), ''
  )), 'B')
WHERE search_vector IS NULL;

-- Step 7: Add comment to column
COMMENT ON COLUMN generated_letters.search_vector IS
'Full-text search vector combining subject (A), company_name (A), html_content (B), commercial_name (B). Updated automatically via trigger.';

-- Verification: Check index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'generated_letters'
    AND indexname = 'idx_generated_letters_search_vector'
  ) THEN
    RAISE EXCEPTION 'Migration failed: search vector index not created!';
  END IF;
END $$;

-- Verification: Check trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_update_generated_letters_search'
  ) THEN
    RAISE EXCEPTION 'Migration failed: search trigger not created!';
  END IF;
END $$;
