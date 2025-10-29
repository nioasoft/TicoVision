-- Migration: Add is_retainer field to clients table
-- Description: Marks clients as retainer clients who receive E1/E2 letter templates
-- Date: 2025-10-29

-- Add is_retainer column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS is_retainer BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN clients.is_retainer IS 'האם לקוח ריטיינר - קובע את סוג המכתבים שיישלחו (E1/E2)';

-- Add index for efficient filtering of retainer clients
-- Only indexes rows where is_retainer = true for performance
CREATE INDEX IF NOT EXISTS idx_clients_is_retainer
ON clients(tenant_id, is_retainer)
WHERE is_retainer = true;

-- Update updated_at timestamp trigger (already exists, just ensuring it works)
-- The trigger update_clients_updated_at should already exist from previous migrations
