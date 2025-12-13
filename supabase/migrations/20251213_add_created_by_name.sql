-- Add created_by_name field to generated_letters
-- This stores the display name of the user who created the letter

ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Add comment
COMMENT ON COLUMN generated_letters.created_by_name IS 'Display name of user who created the letter';
