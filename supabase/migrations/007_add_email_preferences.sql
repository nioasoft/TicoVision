-- Migration: Add email preferences to client contacts
-- Created: 2025-01-15
-- Purpose: Allow contacts to opt-in/out of emails and specify importance level

-- Add email_preference column
ALTER TABLE public.client_contacts
ADD COLUMN email_preference TEXT DEFAULT 'all'
CHECK (email_preference IN ('all', 'important_only', 'none'));

-- Add comment
COMMENT ON COLUMN public.client_contacts.email_preference IS 'Email preferences: all (receive all emails), important_only (only important emails), none (no emails)';

-- Update existing contacts to default value
UPDATE public.client_contacts
SET email_preference = 'all'
WHERE email_preference IS NULL;