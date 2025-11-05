-- Migration 074: Add foreign key constraint for client_id in generated_letters
-- This enables PostgREST to automatically resolve relationships between generated_letters and clients

-- Add foreign key constraint
ALTER TABLE generated_letters
ADD CONSTRAINT generated_letters_client_id_fkey
FOREIGN KEY (client_id)
REFERENCES clients(id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_letters_client_id
ON generated_letters(client_id);

-- Add index for tenant_id filtering
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_id
ON generated_letters(tenant_id);

-- Add composite index for common queries (tenant + status)
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_status
ON generated_letters(tenant_id, status);

COMMENT ON CONSTRAINT generated_letters_client_id_fkey ON generated_letters IS
'Foreign key to clients table - enables PostgREST relationship queries';
