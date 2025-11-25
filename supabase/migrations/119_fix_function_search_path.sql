-- Migration: Fix Function Search Path for update_letter_status_on_send
-- Issue: Function has mutable search_path which can lead to SQL injection vulnerabilities
-- Solution: Set explicit search_path to 'public, auth'
-- Reference: Supabase Linter - https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Drop and recreate the function with proper search_path
CREATE OR REPLACE FUNCTION public.update_letter_status_on_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
-- FIX: Set explicit search_path to prevent SQL injection
SET search_path = public, auth
AS $$
BEGIN
  -- When a letter is marked as sent (sent_at is set), update status to 'sent_email'
  IF NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    NEW.status = 'sent_email';
  END IF;

  RETURN NEW;
END;
$$;

-- Add comment explaining the function's purpose
COMMENT ON FUNCTION public.update_letter_status_on_send() IS
  'Trigger function that automatically updates letter status to sent_email when sent_at timestamp is set.
   Uses explicit search_path for security (prevents SQL injection via search_path manipulation).';
