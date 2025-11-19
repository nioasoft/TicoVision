-- Migration 098: Allow General Letters Without Client
-- Enables saving letters with manual recipients (no client_id required)

-- 1. Make client_id nullable in generated_letters
ALTER TABLE generated_letters
  ALTER COLUMN client_id DROP NOT NULL;

COMMENT ON COLUMN generated_letters.client_id IS
  'Client ID (nullable for general/manual recipient letters)';

-- 2. Add index for letters without client
CREATE INDEX idx_generated_letters_no_client
  ON generated_letters(tenant_id, created_at DESC)
  WHERE client_id IS NULL;

-- 3. Update RLS policy to allow access to general letters
DROP POLICY IF EXISTS "Users can view their tenant's generated letters" ON generated_letters;

CREATE POLICY "Users can view their tenant's generated letters"
  ON generated_letters
  FOR SELECT
  USING (
    tenant_id = (SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID)
  );

-- Note: Letters without client_id are "general letters"
-- identified by subject + manual recipient name
