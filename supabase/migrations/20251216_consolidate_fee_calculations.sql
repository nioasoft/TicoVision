-- ================================================
-- Migration: Consolidate Fee Calculations - Remove Duplicates
-- Date: 2025-12-16
-- Description:
--   1. Identify the "winner" (most recent) fee_calculation per client+year
--   2. Update related tables to point to the winner
--   3. Archive and delete duplicate fee_calculations
--   4. Add unique constraint to prevent future duplicates
-- ================================================

-- Step 1: Create temp table with winners (most recent fee_calculation per client+year)
CREATE TEMP TABLE fee_calc_winners AS
SELECT DISTINCT ON (tenant_id, client_id, year)
  id as winner_id,
  tenant_id,
  client_id,
  year
FROM fee_calculations
ORDER BY tenant_id, client_id, year,
  CASE WHEN status = 'sent' THEN 0
       WHEN status = 'paid' THEN 1
       WHEN status = 'partial_paid' THEN 2
       ELSE 3 END,
  created_at DESC;

-- Step 2: Update generated_letters to point to winner
UPDATE generated_letters gl
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE gl.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 3: Update short_links to point to winner
UPDATE short_links sl
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE sl.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 4: Update payment_method_selections to point to winner (if any exist)
UPDATE payment_method_selections pms
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE pms.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 5: Update payment_disputes to point to winner (if any exist)
UPDATE payment_disputes pd
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE pd.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 6: Update payment_reminders to point to winner (if any exist)
UPDATE payment_reminders pr
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE pr.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 7: Update client_interactions to point to winner (if any exist)
UPDATE client_interactions ci
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE ci.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 8: Update actual_payments to point to winner (if any exist)
UPDATE actual_payments ap
SET fee_calculation_id = w.winner_id
FROM fee_calculations fc
JOIN fee_calc_winners w ON w.tenant_id = fc.tenant_id
  AND w.client_id = fc.client_id AND w.year = fc.year
WHERE ap.fee_calculation_id = fc.id
  AND fc.id != w.winner_id;

-- Step 9: Create archive table for deleted fee_calculations
CREATE TABLE IF NOT EXISTS fee_calculations_archived (
  id UUID,
  tenant_id UUID,
  client_id UUID,
  year INTEGER,
  status TEXT,
  total_amount NUMERIC,
  partial_payment_amount NUMERIC,
  payment_method_selected TEXT,
  amount_after_selected_discount NUMERIC,
  reminder_count INTEGER,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Step 10: Archive the losers (fee_calculations that will be deleted)
INSERT INTO fee_calculations_archived (
  id, tenant_id, client_id, year, status, total_amount,
  partial_payment_amount, payment_method_selected,
  amount_after_selected_discount, reminder_count,
  last_reminder_sent_at, created_at, updated_at
)
SELECT
  fc.id, fc.tenant_id, fc.client_id, fc.year, fc.status, fc.total_amount,
  fc.partial_payment_amount, fc.payment_method_selected,
  fc.amount_after_selected_discount, fc.reminder_count,
  fc.last_reminder_sent_at, fc.created_at, fc.updated_at
FROM fee_calculations fc
LEFT JOIN fee_calc_winners w ON fc.id = w.winner_id
WHERE w.winner_id IS NULL;

-- Step 11: Delete the losers from main table
DELETE FROM fee_calculations fc
WHERE NOT EXISTS (
  SELECT 1 FROM fee_calc_winners w WHERE w.winner_id = fc.id
);

-- Step 12: Add unique constraint to prevent future duplicates
ALTER TABLE fee_calculations
ADD CONSTRAINT unique_fee_calc_tenant_client_year
UNIQUE (tenant_id, client_id, year);

-- Step 13: Cleanup
DROP TABLE fee_calc_winners;

-- Add comment
COMMENT ON CONSTRAINT unique_fee_calc_tenant_client_year ON fee_calculations IS
'Ensures only one fee calculation per client per year per tenant. New calculations should UPDATE existing records.';
