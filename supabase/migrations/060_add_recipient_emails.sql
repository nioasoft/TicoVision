-- Migration: Add recipient_emails column to generated_letters
-- Description: Support multiple email recipients for each letter (array of emails)
-- Date: 2025-11-04

-- Add recipient_emails column (JSONB array of email addresses)
ALTER TABLE public.generated_letters
  ADD COLUMN IF NOT EXISTS recipient_emails JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.generated_letters.recipient_emails IS 'Array of email addresses that received this letter (supports multiple recipients)';

-- Create index for querying by recipient
CREATE INDEX IF NOT EXISTS idx_generated_letters_recipient_emails
  ON public.generated_letters USING gin (recipient_emails);

COMMENT ON INDEX idx_generated_letters_recipient_emails IS 'GIN index for efficient querying of letters by recipient email';
