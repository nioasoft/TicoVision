-- Migration: Add applied_discount_percent to actual_payments
-- Purpose: Allow manual discount selection when client didn't choose via email

-- Add column for the discount percentage that was actually applied
ALTER TABLE actual_payments
ADD COLUMN IF NOT EXISTS applied_discount_percent NUMERIC(5,2);

-- Add comment explaining the column
COMMENT ON COLUMN actual_payments.applied_discount_percent IS
'The discount percentage that was actually applied during payment recording. May differ from client selection if payment was recorded manually.';

-- Create index for reporting queries
CREATE INDEX IF NOT EXISTS idx_actual_payments_applied_discount
ON actual_payments(applied_discount_percent)
WHERE applied_discount_percent IS NOT NULL;
