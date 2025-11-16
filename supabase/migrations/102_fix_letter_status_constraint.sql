-- =====================================================================================
-- Migration: Fix letter_status constraint to match TypeScript types
-- Description: Updates the status check constraint to include all 5 statuses
--              from TypeScript: draft, saved, sent_email, sent_whatsapp, sent_print
-- Author: Claude Code
-- Date: 2025-01-16
-- =====================================================================================

-- Step 1: Update existing 'sent' records to 'sent_email' (most common use case)
UPDATE generated_letters
SET status = 'sent_email'
WHERE status = 'sent';

-- Step 2: Update any 'delivered' or 'opened' records to 'sent_email'
UPDATE generated_letters
SET status = 'sent_email'
WHERE status IN ('delivered', 'opened');

-- Step 3: Drop old constraint
ALTER TABLE generated_letters
DROP CONSTRAINT IF EXISTS chk_letter_status;

-- Step 4: Add new constraint with all 5 statuses
ALTER TABLE generated_letters
ADD CONSTRAINT chk_letter_status
CHECK (status IN ('draft', 'saved', 'sent_email', 'sent_whatsapp', 'sent_print'));

-- Add comment explaining the statuses
COMMENT ON CONSTRAINT chk_letter_status ON generated_letters IS
  'Validates letter status matches TypeScript LetterStatus type:
   - draft: טיוטה - work in progress
   - saved: נשמר ידנית - manually saved, not sent yet
   - sent_email: נשלח במייל - sent via email
   - sent_whatsapp: נשלח בוואטסאפ - sent via WhatsApp
   - sent_print: הודפס - printed';
