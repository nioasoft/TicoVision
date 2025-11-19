-- Migration: Cleanup empty letter tables
-- Date: 2025-11-19
-- Purpose: Remove unused empty tables (letter_components, letter_component_combinations)
--          and clean up foreign key references

-- IMPORTANT: This migration is SAFE because:
-- 1. Both tables have 0 rows (verified before migration)
-- 2. Header/Footer are loaded from files (templates/components/) not from DB
-- 3. No production data will be lost

-- Step 1: Remove foreign key constraints from letter_templates
ALTER TABLE letter_templates
  DROP CONSTRAINT IF EXISTS letter_templates_header_template_id_fkey,
  DROP CONSTRAINT IF EXISTS letter_templates_footer_template_id_fkey;

-- Step 2: Remove columns that referenced deleted tables
ALTER TABLE letter_templates
  DROP COLUMN IF EXISTS header_template_id,
  DROP COLUMN IF EXISTS footer_template_id;

-- Step 3: Drop empty tables
DROP TABLE IF EXISTS letter_component_combinations CASCADE;
DROP TABLE IF EXISTS letter_components CASCADE;

-- Verification: Check that letter_templates still exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'letter_templates') THEN
    RAISE EXCEPTION 'Migration failed: letter_templates table was deleted!';
  END IF;
END $$;

-- Add comment explaining the cleanup
COMMENT ON TABLE letter_templates IS 'Letter templates (11 types). Header/Footer loaded from files in templates/components/. Cleaned up unused FK references in migration 112.';
