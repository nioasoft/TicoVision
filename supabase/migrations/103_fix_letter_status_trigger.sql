-- =====================================================================================
-- Migration: Fix letter status trigger to match updated constraint
-- Description: Updates the trigger function to use new status values:
--              'sent_email' instead of 'sent', and removes 'opened' logic
-- Author: Claude Code
-- Date: 2025-11-16
-- Related: Migration 102 (updated constraint but forgot to update trigger)
-- =====================================================================================

-- Fix the trigger function to use correct status values
CREATE OR REPLACE FUNCTION public.update_letter_status_on_send()
RETURNS TRIGGER AS $$
BEGIN
  -- When letter is sent via email, mark as 'sent_email' (not 'sent')
  -- This matches the constraint: 'draft', 'saved', 'sent_email', 'sent_whatsapp', 'sent_print'
  IF NEW.sent_at IS NOT NULL AND (OLD.sent_at IS NULL OR OLD.status IN ('draft', 'saved')) THEN
    -- Determine which sent status to use based on sent_via if available
    IF NEW.sent_via = 'email' OR NEW.sent_via IS NULL THEN
      NEW.status := 'sent_email';
    ELSIF NEW.sent_via = 'whatsapp' THEN
      NEW.status := 'sent_whatsapp';
    ELSIF NEW.sent_via = 'print' THEN
      NEW.status := 'sent_print';
    ELSE
      -- Default to email if unknown
      NEW.status := 'sent_email';
    END IF;
  END IF;

  -- Note: We removed the 'opened' logic because:
  -- 1. 'opened' is not in the constraint (only draft, saved, sent_email, sent_whatsapp, sent_print)
  -- 2. Email opens are tracked via opened_at column, but status stays 'sent_email'
  -- 3. This prevents constraint violation errors

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the fix
COMMENT ON FUNCTION public.update_letter_status_on_send() IS
  'Trigger function that auto-updates letter status when sent.
   Fixed in migration 103 to use sent_email/sent_whatsapp/sent_print instead of old sent/opened values.
   Matches constraint from migration 102.';
