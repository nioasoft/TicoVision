-- Migration: Add 'letters' category to file_category ENUM
-- Created: 2025-12-14
-- Description: Add new category for letters and correspondence filed to client folders
-- קטגוריה חדשה למכתבים ותכתובות שנשמרו בתיקיות לקוח

-- ============================================================================
-- Add new value to file_category ENUM
-- ============================================================================

-- הוספת ערך חדש ל-ENUM של קטגוריות קבצים
ALTER TYPE file_category ADD VALUE IF NOT EXISTS 'letters';

COMMENT ON TYPE file_category IS 'File categories for organized client document management - includes letters/correspondence';

-- ============================================================================
-- Also add protocols and agreements if missing (to sync with TypeScript types)
-- ============================================================================

ALTER TYPE file_category ADD VALUE IF NOT EXISTS 'protocols';
ALTER TYPE file_category ADD VALUE IF NOT EXISTS 'agreements';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check ENUM values after migration:
-- SELECT unnest(enum_range(NULL::file_category)) AS category;
