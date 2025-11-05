-- Migration: Add letter tracking fields to generated_letters table
-- Purpose: Support letter history, status tracking, and email subjects
-- Author: Claude Code
-- Date: 2025-11-05

-- Add new columns to generated_letters table
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS template_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

-- Add comment for new columns
COMMENT ON COLUMN generated_letters.template_type IS 'Type of letter template used (external, internal_audit, internal_bookkeeping, retainer)';
COMMENT ON COLUMN generated_letters.subject IS 'Email subject line sent to recipient';
COMMENT ON COLUMN generated_letters.status IS 'Letter status: draft, sent, delivered, opened';

-- Update existing records status based on sent_at
UPDATE generated_letters
SET status = CASE
  WHEN sent_at IS NOT NULL THEN 'sent'
  ELSE 'draft'
END
WHERE status IS NULL OR status = 'draft';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_letters_status ON generated_letters(status);
CREATE INDEX IF NOT EXISTS idx_generated_letters_template_type ON generated_letters(template_type);
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_status ON generated_letters(tenant_id, status);

-- Add constraint to ensure valid status values
ALTER TABLE generated_letters
ADD CONSTRAINT chk_letter_status CHECK (status IN ('draft', 'sent', 'delivered', 'opened'));

-- Update trigger to automatically set status to 'sent' when sent_at is updated
CREATE OR REPLACE FUNCTION public.update_letter_status_on_send()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL AND (OLD.sent_at IS NULL OR OLD.status = 'draft') THEN
    NEW.status := 'sent';
  END IF;

  IF NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
    NEW.status := 'opened';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_letter_status_on_send
BEFORE UPDATE ON generated_letters
FOR EACH ROW
EXECUTE FUNCTION public.update_letter_status_on_send();
