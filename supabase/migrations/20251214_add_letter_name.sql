-- Add name column to generated_letters
-- This field is used for easy letter identification in the documents hub

ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  name TEXT;

COMMENT ON COLUMN generated_letters.name IS 'User-defined letter name (required for saving)';

-- Create index for name-based searches
CREATE INDEX IF NOT EXISTS idx_generated_letters_name
  ON generated_letters(tenant_id, name)
  WHERE name IS NOT NULL;
