-- Migration: Add contact_phone_secondary column to clients table
-- Description: Adding secondary phone number field for primary contact (owner)
-- Created: 2025-01-18

-- Add contact_phone_secondary column
ALTER TABLE clients
ADD COLUMN contact_phone_secondary TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clients.contact_phone_secondary IS 'Secondary phone number for primary contact (owner) - optional field for mobile/office number';
