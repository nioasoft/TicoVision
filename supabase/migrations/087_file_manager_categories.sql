-- Migration 087: File Manager Categories System
-- Created: 2025-11-09
-- Description: Add file categorization system to client_attachments for organized file management
-- מערכת קטגוריות לניהול קבצים מסודר של לקוחות

-- ============================================================================
-- 1. Create ENUM for File Categories
-- ============================================================================

-- יצירת ENUM לקטגוריות קבצים (7 קטגוריות מוגדרות)
CREATE TYPE file_category AS ENUM (
  'company_registry',        -- רשם החברות
  'financial_report',        -- דוח כספי מבוקר אחרון
  'bookkeeping_card',        -- כרטיס הנהח"ש
  'quote_invoice',           -- הצעת מחיר / תעודת חיוב
  'payment_proof_2026',      -- אסמכתאות תשלום 2026
  'holdings_presentation',   -- מצגת החזקות
  'general'                  -- כללי (ברירת מחדל)
);

COMMENT ON TYPE file_category IS 'File categories for organized client document management - קטגוריות לניהול מסמכי לקוחות';

-- ============================================================================
-- 2. Add Columns to client_attachments
-- ============================================================================

-- הוספת עמודת קטגוריה (שדה חובה)
ALTER TABLE client_attachments
ADD COLUMN file_category file_category NOT NULL DEFAULT 'general';

COMMENT ON COLUMN client_attachments.file_category IS 'Document category for organized file management - קטגוריית מסמך לניהול מסודר';

-- הוספת עמודת תיאור (עד 100 תווים)
ALTER TABLE client_attachments
ADD COLUMN description TEXT;

COMMENT ON COLUMN client_attachments.description IS 'Brief description of the file (max 100 characters) - תיאור קצר של הקובץ';

-- ============================================================================
-- 3. Add Constraints
-- ============================================================================

-- הגבלת אורך התיאור ל-100 תווים
ALTER TABLE client_attachments
ADD CONSTRAINT check_description_length
CHECK (description IS NULL OR LENGTH(description) <= 100);

COMMENT ON CONSTRAINT check_description_length ON client_attachments IS 'Ensure description does not exceed 100 characters - הגבלת תיאור ל-100 תווים';

-- ============================================================================
-- 4. Create Indexes for Performance
-- ============================================================================

-- אינדקס לחיפוש מהיר של הגרסה האחרונה לפי קטגוריה
CREATE INDEX idx_client_attachments_category_latest
ON client_attachments(client_id, file_category, tenant_id)
WHERE is_latest = true;

COMMENT ON INDEX idx_client_attachments_category_latest IS 'Fast lookup of latest files by category per client - חיפוש מהיר של קבצים אחרונים לפי קטגוריה';

-- אינדקס לחיפוש קבצים לפי קטגוריה בכל הדיירים (למנהל מערכת)
CREATE INDEX idx_tenant_attachments_category_date
ON client_attachments(tenant_id, file_category, created_at DESC)
WHERE is_latest = true;

COMMENT ON INDEX idx_tenant_attachments_category_date IS 'Tenant-wide file search by category and date - חיפוש קבצים בדייר לפי קטגוריה ותאריך';

-- ============================================================================
-- 5. Update Table Comment
-- ============================================================================

COMMENT ON TABLE client_attachments IS 'Client file attachments with versioning and categorization system - מסמכי לקוחות עם ניהול גרסאות וקטגוריות';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check ENUM values
-- SELECT unnest(enum_range(NULL::file_category)) AS category;

-- Check new columns exist
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'client_attachments'
-- AND column_name IN ('file_category', 'description');

-- Check constraints
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'client_attachments'
-- AND constraint_name = 'check_description_length';

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'client_attachments'
-- AND indexname LIKE '%category%';
