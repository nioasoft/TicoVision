-- Migration: Add PDF filing columns to generated_letters
-- Created: 2025-12-14
-- Description: Track when PDFs are filed to client/group folders
-- מעקב אחר שמירת PDF בתיקיות לקוח/קבוצה

-- ============================================================================
-- Add columns for tracking PDF filing
-- ============================================================================

-- Timestamp when PDF was filed to client/group folder
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS pdf_filed_at TIMESTAMPTZ;

COMMENT ON COLUMN generated_letters.pdf_filed_at IS 'Timestamp when PDF was filed to client/group folder - מתי ה-PDF נשמר בתיקיית לקוח';

-- Reference to client_attachments record when PDF is filed
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS pdf_filed_to_attachment_id UUID REFERENCES client_attachments(id) ON DELETE SET NULL;

COMMENT ON COLUMN generated_letters.pdf_filed_to_attachment_id IS 'Reference to client_attachments record when PDF is filed - קישור לרשומת הקובץ';

-- File name used when filing PDF (for display purposes)
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT;

COMMENT ON COLUMN generated_letters.pdf_file_name IS 'File name used when filing PDF - שם הקובץ שנשמר';

-- ============================================================================
-- Add index for finding filed letters
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_generated_letters_pdf_filed
  ON generated_letters(tenant_id, client_id, pdf_filed_at DESC)
  WHERE pdf_filed_at IS NOT NULL;

COMMENT ON INDEX idx_generated_letters_pdf_filed IS 'Fast lookup of filed letter PDFs by client - חיפוש מהיר של PDFs שנשמרו לפי לקוח';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check new columns exist:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'generated_letters'
-- AND column_name IN ('pdf_filed_at', 'pdf_filed_to_attachment_id', 'pdf_file_name');
