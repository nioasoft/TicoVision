-- Migration: Add payer_client_id to clients table
-- Purpose: Link clients who are paid for by another client (member -> payer relationship)

-- Add payer_client_id column
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS payer_client_id UUID REFERENCES clients(id);

-- Add comment for documentation
COMMENT ON COLUMN clients.payer_client_id IS
  'References the client who pays fees for this client. When set, payment_role should be "member".';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_clients_payer_client_id
  ON clients(tenant_id, payer_client_id)
  WHERE payer_client_id IS NOT NULL;

-- Create helper function to get payer client name
CREATE OR REPLACE FUNCTION get_payer_client_name(p_client_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(payer.company_name_hebrew, payer.company_name)
    FROM clients c
    JOIN clients payer ON c.payer_client_id = payer.id
    WHERE c.id = p_client_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_payer_client_name(UUID) TO authenticated;
