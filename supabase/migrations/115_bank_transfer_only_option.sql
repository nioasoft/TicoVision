-- Migration: Add bank transfer only option to fee calculations
-- Description: Allows users to replace standard payment section with bank transfer details only
-- Created: 2025-01-22

-- Add columns to fee_calculations table
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS bank_transfer_only BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bank_transfer_discount_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS bank_transfer_amount_before_vat NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS bank_transfer_amount_with_vat NUMERIC(12,2);

-- Add comment to explain the new columns
COMMENT ON COLUMN fee_calculations.bank_transfer_only IS
'Whether to use bank transfer only payment section instead of standard 4-option section';

COMMENT ON COLUMN fee_calculations.bank_transfer_discount_percentage IS
'Custom discount percentage for bank transfer (0-15%)';

COMMENT ON COLUMN fee_calculations.bank_transfer_amount_before_vat IS
'Amount after bank transfer discount, before VAT';

COMMENT ON COLUMN fee_calculations.bank_transfer_amount_with_vat IS
'Final amount after bank transfer discount, including VAT (18%)';

-- Add column to generated_letters table
ALTER TABLE generated_letters
ADD COLUMN IF NOT EXISTS uses_bank_transfer_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN generated_letters.uses_bank_transfer_only IS
'Whether this letter was generated with bank transfer only payment section';

-- Create index for querying letters with bank transfer only
CREATE INDEX IF NOT EXISTS idx_generated_letters_bank_transfer_only
ON generated_letters(tenant_id, uses_bank_transfer_only)
WHERE uses_bank_transfer_only = true;
