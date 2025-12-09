-- Migration: Add custom_payment_text column to fee_calculations
-- Date: 2025-12-04
-- Description: Allows users to add custom text that appears above the payment section in fee letters

-- Add column to fee_calculations table
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS custom_payment_text TEXT DEFAULT NULL;

COMMENT ON COLUMN fee_calculations.custom_payment_text IS
  'Custom text (HTML) that is injected above the payment section in fee letters';

-- Add same column to group_fee_calculations for group letters
ALTER TABLE group_fee_calculations
ADD COLUMN IF NOT EXISTS custom_payment_text TEXT DEFAULT NULL;

COMMENT ON COLUMN group_fee_calculations.custom_payment_text IS
  'Custom text (HTML) that is injected above the payment section in group fee letters';
