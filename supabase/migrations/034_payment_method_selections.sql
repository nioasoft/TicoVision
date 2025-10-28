-- Migration: Collection System - Create payment_method_selections table
-- Description: Track when clients select payment methods and discount applied
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create payment_method_selections table
CREATE TABLE IF NOT EXISTS payment_method_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,
  generated_letter_id UUID NOT NULL REFERENCES generated_letters(id) ON DELETE CASCADE,

  -- Selection details
  selected_method TEXT NOT NULL
    CHECK (selected_method IN ('bank_transfer', 'cc_single', 'cc_installments', 'checks')),
  original_amount NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL,
  amount_after_discount NUMERIC(12,2) NOT NULL,

  -- Completion tracking
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  completed_payment BOOLEAN DEFAULT FALSE,
  payment_transaction_id UUID REFERENCES payment_transactions(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE payment_method_selections IS 'Tracks client payment method selections and discount application';

-- Add column comments
COMMENT ON COLUMN payment_method_selections.selected_method IS 'bank_transfer (9% discount) | cc_single (8%) | cc_installments (4%) | checks (0%)';
COMMENT ON COLUMN payment_method_selections.original_amount IS 'Amount before discount applied';
COMMENT ON COLUMN payment_method_selections.discount_percent IS 'Discount percentage applied (0-9%)';
COMMENT ON COLUMN payment_method_selections.amount_after_discount IS 'Final amount client will pay';
COMMENT ON COLUMN payment_method_selections.completed_payment IS 'TRUE if payment was completed (via Cardcom webhook or manual confirmation)';

-- Create index for queries by fee_calculation_id
CREATE INDEX idx_payment_selections_fee
  ON payment_method_selections(tenant_id, fee_calculation_id);

-- Create RLS policy for tenant isolation
ALTER TABLE payment_method_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payment_method_selections
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON payment_method_selections IS 'Multi-tenant isolation - users can only access selections from their tenant';
