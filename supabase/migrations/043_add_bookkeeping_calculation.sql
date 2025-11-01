-- Migration: Add bookkeeping_calculation JSONB field to fee_calculations
-- Purpose: Store separate calculation for internal bookkeeping (letter F)
-- Date: 2025-01-31

-- Add bookkeeping_calculation JSONB column
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS bookkeeping_calculation JSONB DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN fee_calculations.bookkeeping_calculation IS
'חישוב נפרד עבור הנהלת חשבונות (ללקוחות פנימיים בלבד). מבנה: {base_amount, apply_inflation_index, inflation_rate, inflation_adjustment, real_adjustment, real_adjustment_reason, discount_percentage, discount_amount, final_amount, vat_amount, total_with_vat}';
