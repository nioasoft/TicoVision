-- =====================================================================================
-- Migration: Add updated_at column to generated_letters table
-- Description: Adds auto-updating timestamp for tracking last modification time
-- Author: Claude Code
-- Date: 2025-01-15
-- =====================================================================================

-- Add updated_at column to generated_letters table
ALTER TABLE generated_letters
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- Add comment explaining the column
COMMENT ON COLUMN generated_letters.updated_at IS 'Timestamp of last modification. Auto-updated by trigger on UPDATE.';

-- Create trigger function to automatically update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_generated_letters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that calls the function before every UPDATE
CREATE TRIGGER set_generated_letters_updated_at
    BEFORE UPDATE ON generated_letters
    FOR EACH ROW
    EXECUTE FUNCTION update_generated_letters_updated_at();

-- Add comment on the trigger function
COMMENT ON FUNCTION update_generated_letters_updated_at() IS 'Auto-updates updated_at column on generated_letters table when any row is modified';
