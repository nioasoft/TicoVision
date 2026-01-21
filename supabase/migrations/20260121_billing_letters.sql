-- Migration: Billing Letters System
-- Date: 2026-01-21
-- Description: Creates billing_letters table for general billing letters (not fee-based)
--              Supports bank transfer only payment with flexible discounts

-- ============================================================================
-- 1. Create billing_letters table
-- ============================================================================

CREATE TABLE billing_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),

  -- תיאור החיוב (Service description)
  service_description TEXT NOT NULL,

  -- סכומים (Amounts)
  amount_before_vat NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(4,2) DEFAULT 18,
  vat_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,

  -- הנחה (Discount - bank transfer only)
  bank_discount_percentage NUMERIC(4,2) DEFAULT 0 CHECK (bank_discount_percentage >= 0 AND bank_discount_percentage <= 15),
  amount_after_discount NUMERIC(12,2),

  -- סטטוס (Status)
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),

  -- אופן שליחה (Sending method)
  sent_manually BOOLEAN DEFAULT FALSE,  -- TRUE = נשלח ידנית (לא דרך המערכת)
  sent_at TIMESTAMPTZ,                  -- מתי נשלח
  sent_method TEXT CHECK (sent_method IS NULL OR sent_method IN ('email', 'manual_mail', 'manual_hand', 'manual_other')),

  -- מעקב תשלום (Payment tracking)
  due_date DATE,
  payment_date DATE,
  payment_reference TEXT,

  -- קישורים (References)
  generated_letter_id UUID REFERENCES generated_letters(id),
  actual_payment_id UUID, -- Will be updated when linked to actual_payments

  -- מטאדטה (Metadata)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE billing_letters IS 'General billing letters for non-fee-based charges (e.g., one-time services)';
COMMENT ON COLUMN billing_letters.sent_manually IS 'TRUE if letter was marked as sent manually (not via email system)';
COMMENT ON COLUMN billing_letters.sent_method IS 'How the letter was sent: email (system), manual_mail (דואר רגיל), manual_hand (מסירה ידנית), manual_other (אחר)';
COMMENT ON COLUMN billing_letters.bank_discount_percentage IS 'Discount percentage for bank transfer payment (0-15%)';

-- ============================================================================
-- 2. Create indexes for performance
-- ============================================================================

CREATE INDEX idx_billing_letters_tenant ON billing_letters(tenant_id);
CREATE INDEX idx_billing_letters_client ON billing_letters(tenant_id, client_id);
CREATE INDEX idx_billing_letters_status ON billing_letters(tenant_id, status);
CREATE INDEX idx_billing_letters_created_at ON billing_letters(tenant_id, created_at DESC);

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================

ALTER TABLE billing_letters ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY billing_letters_tenant_policy ON billing_letters
  FOR ALL
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- ============================================================================
-- 4. Update actual_payments to support billing letters
-- ============================================================================

-- Add billing_letter_id column
ALTER TABLE actual_payments
  ADD COLUMN IF NOT EXISTS billing_letter_id UUID REFERENCES billing_letters(id);

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_actual_payments_billing_letter ON actual_payments(billing_letter_id) WHERE billing_letter_id IS NOT NULL;

-- Make fee_calculation_id nullable (since billing letters don't have fee calculations)
ALTER TABLE actual_payments
  ALTER COLUMN fee_calculation_id DROP NOT NULL;

-- Add constraint to ensure at least one source (fee_calculation or billing_letter)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'actual_payments_source_check'
  ) THEN
    ALTER TABLE actual_payments
      ADD CONSTRAINT actual_payments_source_check
      CHECK (fee_calculation_id IS NOT NULL OR billing_letter_id IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- 5. Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_billing_letters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

CREATE TRIGGER billing_letters_updated_at
  BEFORE UPDATE ON billing_letters
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_letters_updated_at();

-- ============================================================================
-- 6. Create unified collection view (Fee + Billing letters)
-- ============================================================================

CREATE OR REPLACE VIEW unified_collection_view AS
-- Fee calculations
SELECT
  'fee' as source_type,
  fc.id as source_id,
  fc.client_id,
  c.company_name,
  c.company_name_hebrew,
  fc.total_amount as amount,
  fc.status,
  gl.sent_at as letter_sent_date,
  fc.payment_date,
  NULL::TEXT as service_description,
  fc.tenant_id,
  fc.created_at
FROM fee_calculations fc
JOIN clients c ON c.id = fc.client_id
LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
WHERE fc.status IN ('sent', 'paid', 'partial_paid')

UNION ALL

-- Billing letters
SELECT
  'billing' as source_type,
  bl.id as source_id,
  bl.client_id,
  c.company_name,
  c.company_name_hebrew,
  bl.total_amount as amount,
  bl.status,
  COALESCE(gl.sent_at, bl.sent_at) as letter_sent_date,
  bl.payment_date,
  bl.service_description,
  bl.tenant_id,
  bl.created_at
FROM billing_letters bl
JOIN clients c ON c.id = bl.client_id
LEFT JOIN generated_letters gl ON gl.id = bl.generated_letter_id
WHERE bl.status IN ('sent', 'paid');

-- Add comment
COMMENT ON VIEW unified_collection_view IS 'Unified view combining fee calculations and billing letters for collection dashboard';

-- ============================================================================
-- 7. Grant necessary permissions
-- ============================================================================

-- Grant select on the view (authenticated users only via RLS)
GRANT SELECT ON unified_collection_view TO authenticated;
