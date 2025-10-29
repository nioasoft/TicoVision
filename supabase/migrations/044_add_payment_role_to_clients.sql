-- Migration: Add payment_role to clients table for group payment management
-- Description: Adds payment role column to track client's payment responsibility within a group
-- Date: 2025-10-29

-- Add payment_role column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS payment_role TEXT
  CHECK (payment_role IN ('independent', 'member', 'primary_payer'))
  DEFAULT 'independent';

-- Add comment for documentation
COMMENT ON COLUMN clients.payment_role IS
  'תפקיד התשלום בקבוצה: independent=משלם לבד, member=חלק מקבוצה, primary_payer=משלם ראשי';

-- Create index for finding clients by group and payment role
CREATE INDEX IF NOT EXISTS idx_clients_group_id
  ON clients(tenant_id, group_id)
  WHERE group_id IS NOT NULL;

-- Create index for finding primary payers
CREATE INDEX IF NOT EXISTS idx_clients_primary_payer
  ON clients(tenant_id, group_id, payment_role)
  WHERE payment_role = 'primary_payer';

-- Create unique constraint: only one primary_payer per group
-- This ensures only one active client can be the primary payer for each group
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_primary_payer_per_group
  ON clients(tenant_id, group_id)
  WHERE payment_role = 'primary_payer' AND status = 'active';

-- Create helper function to check if a group already has a primary payer
CREATE OR REPLACE FUNCTION check_primary_payer_exists(
  p_tenant_id UUID,
  p_group_id UUID,
  p_client_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clients
    WHERE tenant_id = p_tenant_id
      AND group_id = p_group_id
      AND payment_role = 'primary_payer'
      AND status = 'active'
      AND (p_client_id IS NULL OR id != p_client_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_primary_payer_exists IS
  'בודק האם קבוצה כבר יש לה משלם ראשי פעיל';

-- Update existing clients: if they have a group_id but no payment_role, set to 'member'
UPDATE clients
SET payment_role = 'member'
WHERE group_id IS NOT NULL
  AND payment_role = 'independent';
