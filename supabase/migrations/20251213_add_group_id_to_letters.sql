-- Migration: Add group_id to generated_letters
-- Purpose: Allow tracking which group a letter was sent to

-- Add group_id column with FK to client_groups
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES client_groups(id);

-- Create index for efficient group letter lookups
CREATE INDEX IF NOT EXISTS idx_generated_letters_group_id
ON generated_letters(group_id)
WHERE group_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN generated_letters.group_id IS 'Reference to client_groups when letter is sent to a group';
