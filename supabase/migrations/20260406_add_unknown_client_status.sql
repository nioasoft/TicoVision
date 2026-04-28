-- Add 'unknown' (לא ידוע) client status
-- For clients whose status is genuinely unknown but should still appear in reports

-- Step 1: Drop the existing status check constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- Step 2: Add new constraint with 'unknown' status included
ALTER TABLE clients ADD CONSTRAINT clients_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'adhoc', 'unknown'));
