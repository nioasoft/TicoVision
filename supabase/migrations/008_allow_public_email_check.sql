-- ================================================
-- Migration: Allow Public Email Check
-- Date: January 2025
-- Description: Add RLS policy to allow anonymous users to check if email exists in pending_registrations
-- ================================================

-- Add public SELECT policy for checking email availability
-- This allows anonymous users to check if an email is already pending
CREATE POLICY "allow_public_check_email" ON pending_registrations
FOR SELECT
TO public
USING (true);

-- Add comment to policy
COMMENT ON POLICY "allow_public_check_email" ON pending_registrations IS
'Allows anonymous users to check if email is already in pending registrations table. Used during registration form to validate email availability.';
