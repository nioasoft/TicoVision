-- Migration: Add adhoc client status
-- Purpose: Support "חריגים" (ad-hoc/one-time) clients with minimal data
-- Date: 2026-01-21

-- Step 1: Drop the existing status check constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- Step 2: Add new constraint with 'adhoc' status included
ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'adhoc'));

-- Step 3: Create partial index for fast adhoc filtering by tenant
CREATE INDEX IF NOT EXISTS idx_clients_status_adhoc
  ON clients(tenant_id, status) WHERE status = 'adhoc';

-- Step 4: Add documentation comment
COMMENT ON COLUMN clients.status IS
  'Client status: active=פעיל, inactive=לא פעיל, pending=ממתין, adhoc=חד-פעמי/חריג (minimal data clients)';
