-- Migration: Add missing fee_calculation columns
-- Description: Add columns that exist in TypeScript interface but missing in cloud database
-- Date: 2025-01-28
-- Issue: PGRST204 - real_adjustment column not found in schema cache

-- Add missing columns to fee_calculations table
ALTER TABLE public.fee_calculations
  -- Current year calculations (missing columns)
  ADD COLUMN IF NOT EXISTS real_adjustment NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apply_inflation_index BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS calculated_inflation_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS real_adjustments JSONB,

  -- Previous year data (enhanced fields)
  ADD COLUMN IF NOT EXISTS previous_year_amount_before_discount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS previous_year_amount_after_discount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS previous_year_amount_with_vat NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS previous_year_data JSONB,

  -- Calculated amounts (current year)
  ADD COLUMN IF NOT EXISTS calculated_before_vat NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS calculated_with_vat NUMERIC(12,2),

  -- Year-over-year comparison
  ADD COLUMN IF NOT EXISTS year_over_year_change_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS year_over_year_change_amount NUMERIC(12,2),

  -- Metadata and approval
  ADD COLUMN IF NOT EXISTS calculation_metadata JSONB,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,

  -- Payment tracking (if missing)
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2);

-- Add column comments for documentation
COMMENT ON COLUMN public.fee_calculations.real_adjustment IS 'Real (non-inflation) adjustment amount';
COMMENT ON COLUMN public.fee_calculations.apply_inflation_index IS 'Whether to apply inflation index to base amount (default: true)';
COMMENT ON COLUMN public.fee_calculations.calculated_inflation_amount IS 'Calculated inflation amount based on rate and base';
COMMENT ON COLUMN public.fee_calculations.real_adjustments IS 'JSONB array of real adjustment records with amounts and reasons';
COMMENT ON COLUMN public.fee_calculations.previous_year_amount_before_discount IS 'Previous year amount before any discounts applied';
COMMENT ON COLUMN public.fee_calculations.previous_year_amount_after_discount IS 'Previous year amount after discount, before VAT';
COMMENT ON COLUMN public.fee_calculations.previous_year_amount_with_vat IS 'Previous year total amount including VAT';
COMMENT ON COLUMN public.fee_calculations.previous_year_data IS 'JSONB structured data from previous year for reference';
COMMENT ON COLUMN public.fee_calculations.calculated_before_vat IS 'Current year calculated amount before VAT';
COMMENT ON COLUMN public.fee_calculations.calculated_with_vat IS 'Current year calculated amount with VAT';
COMMENT ON COLUMN public.fee_calculations.year_over_year_change_percent IS 'Percentage change from previous year';
COMMENT ON COLUMN public.fee_calculations.year_over_year_change_amount IS 'Absolute amount change from previous year';
COMMENT ON COLUMN public.fee_calculations.calculation_metadata IS 'JSONB metadata: calculation method, formula version, notes';
COMMENT ON COLUMN public.fee_calculations.approved_by IS 'User who approved this fee calculation';
COMMENT ON COLUMN public.fee_calculations.approved_at IS 'Timestamp when fee calculation was approved';
COMMENT ON COLUMN public.fee_calculations.payment_reference IS 'External payment reference number';
COMMENT ON COLUMN public.fee_calculations.payment_terms IS 'Payment terms description';
COMMENT ON COLUMN public.fee_calculations.total_amount IS 'Total amount (alias for total_with_vat for compatibility)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fee_calculations_real_adjustment
  ON public.fee_calculations(tenant_id, real_adjustment)
  WHERE real_adjustment IS NOT NULL AND real_adjustment != 0;

CREATE INDEX IF NOT EXISTS idx_fee_calculations_approved
  ON public.fee_calculations(tenant_id, approved_at)
  WHERE approved_at IS NOT NULL;

COMMENT ON INDEX idx_fee_calculations_real_adjustment IS 'Index for queries filtering by real adjustments';
COMMENT ON INDEX idx_fee_calculations_approved IS 'Index for queries filtering approved fee calculations';
