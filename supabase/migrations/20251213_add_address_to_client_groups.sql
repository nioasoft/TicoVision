-- Add address field to client_groups table
-- Address is optional (nullable) and stored as JSONB with structure: {street, city, postal_code}

ALTER TABLE client_groups
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT NULL;

COMMENT ON COLUMN client_groups.address IS 'Optional address: {street: string, city: string, postal_code: string}';
