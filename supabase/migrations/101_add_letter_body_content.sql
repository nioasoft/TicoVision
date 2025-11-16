-- =====================================================================================
-- Migration: Add body_content_html column for editable letters
-- Description: Stores body-only content (without Header/Footer/Payment)
--              for universal builder letters that need editing capability.
--              Fee letters (annual_fee, internal_audit, etc.) remain view-only.
-- Author: Claude Code
-- Date: 2025-01-15
-- =====================================================================================

-- Add column for body-only content (without Header/Footer/Payment)
ALTER TABLE generated_letters
ADD COLUMN body_content_html TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN generated_letters.body_content_html IS
  'Body content only (without Header/Footer/Payment).
   Used for editing universal builder letters (template_type = ''custom_text'').
   NULL for fee letters (view-only: annual_fee, internal_audit, retainer, etc.).
   When editing, this content is loaded into Tiptap editor without headers/footers.
   When saving, full letter is rebuilt: Header + body_content_html + Footer.';

-- Create index for fast filtering of editable letters
CREATE INDEX idx_generated_letters_editable
  ON generated_letters(tenant_id, template_type)
  WHERE template_type = 'custom_text' AND body_content_html IS NOT NULL;

-- Add comment on the index
COMMENT ON INDEX idx_generated_letters_editable IS
  'Optimizes queries for editable letters from universal builder (template_type = custom_text)';
