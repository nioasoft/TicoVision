-- Migration: Add accountant contact fields to clients table
-- Description: Add accountant_name, accountant_email, accountant_phone fields to support
--              storing accountant manager contact information for each client.
--              These fields were added to the UI form but missing from the database schema.
-- Date: 2025-01-05

-- Add accountant fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS accountant_name TEXT,
ADD COLUMN IF NOT EXISTS accountant_email TEXT,
ADD COLUMN IF NOT EXISTS accountant_phone TEXT;

-- Add column comments for documentation
COMMENT ON COLUMN clients.accountant_name IS 'שם מנהלת החשבונות של הלקוח';
COMMENT ON COLUMN clients.accountant_email IS 'אימייל מנהלת החשבונות של הלקוח';
COMMENT ON COLUMN clients.accountant_phone IS 'טלפון מנהלת החשבונות של הלקוח';

-- Note: These columns are NULLABLE at the database level for backward compatibility,
-- but the UI form (ClientFormDialog.tsx) requires them when creating new clients.
