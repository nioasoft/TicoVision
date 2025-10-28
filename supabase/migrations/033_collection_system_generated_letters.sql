-- Migration: Collection System - Extend generated_letters table
-- Description: Add email tracking (sent, opened, last opened, open count)
-- Date: 2025-10-27

-- Add email tracking columns to generated_letters
ALTER TABLE generated_letters
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN generated_letters.sent_at IS 'Timestamp when letter was sent via email';
COMMENT ON COLUMN generated_letters.opened_at IS 'First time client opened the email (tracking pixel)';
COMMENT ON COLUMN generated_letters.last_opened_at IS 'Most recent time client opened the email';
COMMENT ON COLUMN generated_letters.open_count IS 'Total number of times client opened the email';

-- Create index for collection tracking queries
CREATE INDEX IF NOT EXISTS idx_generated_letters_tracking
  ON generated_letters(tenant_id, sent_at, opened_at);

COMMENT ON INDEX idx_generated_letters_tracking IS 'Performance index for collection tracking queries (sent/opened status)';
