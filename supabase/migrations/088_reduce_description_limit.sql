-- ============================================================================
-- Migration 088: Reduce Description Length Limit
-- ============================================================================
-- Description: Change file description limit from 100 to 50 characters
-- Author: TicoVision Team
-- Date: 2025-11-09
-- ============================================================================

-- Drop existing constraint
ALTER TABLE client_attachments
DROP CONSTRAINT IF EXISTS check_description_length;

-- Add new constraint with 50 character limit
ALTER TABLE client_attachments
ADD CONSTRAINT check_description_length
CHECK (description IS NULL OR LENGTH(description) <= 50);

COMMENT ON CONSTRAINT check_description_length ON client_attachments IS 'Ensure description does not exceed 50 characters - הגבלת תיאור ל-50 תווים';

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check constraint was updated:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'check_description_length';

-- Check if any existing descriptions exceed 50 chars:
-- SELECT id, file_name, LENGTH(description) as desc_length, description
-- FROM client_attachments
-- WHERE description IS NOT NULL AND LENGTH(description) > 50;
