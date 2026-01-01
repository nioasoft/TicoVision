-- Migration: Enhance Letter Search Vector
-- Date: 2026-01-01
-- Purpose: Add manual recipient (נמען אחר) to search vector for letter history

-- Step 1: Update the search vector function to include variables_used->>'company_name'
-- This captures the manual recipient name for "נמען אחר" letters
CREATE OR REPLACE FUNCTION update_generated_letters_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    -- Weight A (highest): subject, client company_name, manual recipient from variables_used
    setweight(to_tsvector('simple', coalesce(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(
      (SELECT c.company_name FROM clients c WHERE c.id = NEW.client_id), ''
    )), 'A') ||
    setweight(to_tsvector('simple', coalesce(
      NEW.variables_used->>'company_name', ''
    )), 'A') ||
    -- Weight B: content, commercial_name
    setweight(to_tsvector('simple', coalesce(NEW.generated_content_text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(
      (SELECT c.commercial_name FROM clients c WHERE c.id = NEW.client_id), ''
    )), 'B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update comment
COMMENT ON FUNCTION update_generated_letters_search_vector() IS
'Updates search_vector column for full-text search. Weights: A=subject+company_name+manual_recipient (highest), B=content+commercial_name';

-- Step 3: Update trigger to also fire on variables_used changes
DROP TRIGGER IF EXISTS trg_update_generated_letters_search ON generated_letters;

CREATE TRIGGER trg_update_generated_letters_search
  BEFORE INSERT OR UPDATE OF subject, generated_content_text, client_id, variables_used
  ON generated_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_generated_letters_search_vector();

-- Step 4: Backfill existing letters with the enhanced search vector
UPDATE generated_letters
SET search_vector =
  setweight(to_tsvector('simple', coalesce(subject, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(
    (SELECT c.company_name FROM clients c WHERE c.id = generated_letters.client_id), ''
  )), 'A') ||
  setweight(to_tsvector('simple', coalesce(
    variables_used->>'company_name', ''
  )), 'A') ||
  setweight(to_tsvector('simple', coalesce(generated_content_text, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(
    (SELECT c.commercial_name FROM clients c WHERE c.id = generated_letters.client_id), ''
  )), 'B');

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
