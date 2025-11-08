-- Migration: Add version tracking to generated_letters
-- Purpose: Enable editing letters with version history
-- Author: Claude Code
-- Date: 2025-01-07

-- Add version tracking columns to generated_letters
ALTER TABLE generated_letters
  ADD COLUMN IF NOT EXISTS parent_letter_id UUID REFERENCES generated_letters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1 NOT NULL;

-- Add index for performance when querying versions
CREATE INDEX IF NOT EXISTS idx_generated_letters_parent_version
  ON generated_letters(parent_letter_id, version_number)
  WHERE parent_letter_id IS NOT NULL;

-- Add index for finding latest version
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_parent
  ON generated_letters(tenant_id, parent_letter_id, version_number DESC)
  WHERE parent_letter_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN generated_letters.parent_letter_id IS
  'Link to original letter when this is an edited version. NULL for original letters.';

COMMENT ON COLUMN generated_letters.version_number IS
  'Version number starting from 1. Increments with each edit.';

-- Update existing records to have version_number = 1
-- (All existing letters are considered version 1)
UPDATE generated_letters
SET version_number = 1
WHERE version_number IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 082: Letter versioning columns added successfully';
END $$;
