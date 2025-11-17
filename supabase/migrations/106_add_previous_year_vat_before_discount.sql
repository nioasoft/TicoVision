-- Migration: Add previous_year_amount_with_vat_before_discount to fee_calculations
-- Purpose: Support displaying "סכום בסיס אחרי מע"מ" (לפני הנחה) in previous year data
-- Created: 2025-01-17

-- Add new column for previous year amount with VAT before discount
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS previous_year_amount_with_vat_before_discount DECIMAL(10,2);

-- Add comment explaining the field
COMMENT ON COLUMN fee_calculations.previous_year_amount_with_vat_before_discount IS
'Previous year base amount with 18% VAT added, BEFORE applying discount. Calculated as: previous_year_amount * 1.18';

-- Note: This is an auto-calculated field, not user input
-- The value should be computed in the application as:
-- previous_year_amount_with_vat_before_discount = previous_year_amount * 1.18
