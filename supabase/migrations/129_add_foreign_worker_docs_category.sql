-- Migration 129: Add foreign_worker_docs category to file_category ENUM
-- Created: 2025-11-25
-- Description: Add new category for foreign worker documents (population authority permits)
-- קטגוריה חדשה לאישורי עובדים זרים (רשות האוכלוסין)

-- ============================================================================
-- Add new value to file_category ENUM
-- ============================================================================

-- הוספת ערך חדש ל-ENUM של קטגוריות קבצים
ALTER TYPE file_category ADD VALUE 'foreign_worker_docs';

COMMENT ON TYPE file_category IS 'File categories for organized client document management - includes foreign worker documents (8 categories)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check ENUM values after migration:
-- SELECT unnest(enum_range(NULL::file_category)) AS category;
