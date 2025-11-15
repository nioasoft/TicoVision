-- Migration: Update Letter Status System
-- Description: Replace letter_status enum with delivery-channel-specific statuses
-- Date: 2025-01-15
-- Author: System

-- Background:
-- Previously, letter_status was: 'draft', 'sent', 'viewed', 'responded'
-- Problem: Doesn't capture HOW the letter was sent (email/whatsapp/print)
-- Solution: New statuses that include the delivery channel

-- Step 1: Create new enum type with delivery channels
CREATE TYPE letter_status_new AS ENUM (
  'draft',          -- טיוטה (work in progress)
  'saved',          -- נשמר ידנית (manually saved, not sent)
  'sent_email',     -- נשלח במייל
  'sent_whatsapp',  -- נשלח בוואטסאפ
  'sent_print'      -- הודפס
);

-- Step 2: Add temporary column with new type
ALTER TABLE generated_letters
  ADD COLUMN status_new letter_status_new;

-- Step 3: Migrate existing data
-- Convert old status values to new ones (default to sent_email if was 'sent')
UPDATE generated_letters
SET status_new = CASE
  WHEN status = 'draft' THEN 'draft'::letter_status_new
  WHEN status = 'sent' AND sent_via = 'email' THEN 'sent_email'::letter_status_new
  WHEN status = 'sent' AND sent_via = 'whatsapp' THEN 'sent_whatsapp'::letter_status_new
  WHEN status = 'sent' AND sent_via = 'print' THEN 'sent_print'::letter_status_new
  WHEN status = 'sent' THEN 'sent_email'::letter_status_new -- Default to email if sent_via is null
  WHEN status = 'viewed' THEN 'sent_email'::letter_status_new -- viewed = was sent via email
  WHEN status = 'responded' THEN 'sent_email'::letter_status_new -- responded = was sent via email
  ELSE 'draft'::letter_status_new
END;

-- Step 4: Drop old column and rename new one
ALTER TABLE generated_letters
  DROP COLUMN status,
  RENAME COLUMN status_new TO status;

-- Step 5: Set NOT NULL and default
ALTER TABLE generated_letters
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft'::letter_status_new;

-- Step 6: Drop old enum type
DROP TYPE letter_status;

-- Step 7: Rename new type to original name
ALTER TYPE letter_status_new RENAME TO letter_status;

-- Add helpful comments
COMMENT ON COLUMN generated_letters.status IS 'Letter status including delivery channel (draft/saved/sent_email/sent_whatsapp/sent_print)';
COMMENT ON COLUMN generated_letters.sent_via IS 'DEPRECATED: Redundant with status field. Use status instead for delivery channel info.';

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_generated_letters_status
  ON generated_letters(tenant_id, status, created_at DESC);

COMMENT ON INDEX idx_generated_letters_status IS 'Performance index for filtering letters by status in letter history';
