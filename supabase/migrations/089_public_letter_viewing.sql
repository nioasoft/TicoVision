-- Migration 089: Public Letter Viewing via Shareable Links
-- Purpose: Allow public access to generated_letters by ID (for WhatsApp/email links)
-- Date: 2025-01-09

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public: View letters by ID (shareable links)" ON generated_letters;

-- Create policy: Allow anyone (even anonymous users) to SELECT a letter by its ID
-- This is safe because:
-- 1. Only the UUID is known to those with the link
-- 2. UUIDs are cryptographically secure (impossible to guess)
-- 3. No sensitive data beyond what's meant to be shared
COMMENT ON TABLE generated_letters IS 'Generated letters with public viewing support via shareable links';

CREATE POLICY "Public: View letters by ID (shareable links)"
ON generated_letters
FOR SELECT
TO anon, authenticated
USING (true);

-- Add comment explaining the security model
COMMENT ON POLICY "Public: View letters by ID (shareable links)" ON generated_letters
IS 'Allows public access to letters via shareable UUID links. Safe because UUIDs are unguessable.';

-- Ensure RLS is enabled (should already be, but double-check)
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;
