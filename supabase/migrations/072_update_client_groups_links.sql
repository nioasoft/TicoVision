-- Migration 072: Update client_groups - Remove English name, Add link fields
-- Created: 2025-01-05
-- Purpose:
--   1. Remove group_name (English) column - keep only Hebrew
--   2. Make group_name_hebrew required (NOT NULL)
--   3. Add company_structure_link field (optional)
--   4. Add canva_link field (optional)

-- Step 1: Drop English name column
ALTER TABLE client_groups
  DROP COLUMN IF EXISTS group_name;

-- Step 2: Make Hebrew name required
ALTER TABLE client_groups
  ALTER COLUMN group_name_hebrew SET NOT NULL;

-- Step 3: Add link fields (both optional)
ALTER TABLE client_groups
  ADD COLUMN IF NOT EXISTS company_structure_link TEXT,
  ADD COLUMN IF NOT EXISTS canva_link TEXT;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN client_groups.group_name_hebrew IS 'שם הקבוצה (עברית בלבד - חובה)';
COMMENT ON COLUMN client_groups.company_structure_link IS 'קישור למבנה החברה (אופציונלי)';
COMMENT ON COLUMN client_groups.canva_link IS 'קישור לקנבה - Canva (אופציונלי)';

-- Verification query (commented out)
-- SELECT
--   id,
--   group_name_hebrew,
--   company_structure_link,
--   canva_link,
--   created_at
-- FROM client_groups
-- ORDER BY created_at DESC;
