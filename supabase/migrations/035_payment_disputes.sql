-- Migration: Collection System - Create payment_disputes table
-- Description: Track client disputes when they claim "שילמתי" (I already paid)
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create payment_disputes table
CREATE TABLE IF NOT EXISTS payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,

  -- Client's claim
  dispute_reason TEXT,
  claimed_payment_date DATE,
  claimed_payment_method TEXT
    CHECK (claimed_payment_method IN ('bank_transfer', 'credit_card', 'check', 'cash', 'other')),
  claimed_amount NUMERIC(12,2),
  claimed_reference TEXT,

  -- Resolution
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved_paid', 'resolved_unpaid', 'invalid')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE payment_disputes IS 'Client disputes when they claim payment was already made';

-- Add column comments
COMMENT ON COLUMN payment_disputes.dispute_reason IS 'Client explanation for dispute (e.g., "שילמתי בהעברה בנקאית")';
COMMENT ON COLUMN payment_disputes.claimed_payment_date IS 'Date client claims they made payment';
COMMENT ON COLUMN payment_disputes.claimed_payment_method IS 'Payment method client claims to have used';
COMMENT ON COLUMN payment_disputes.claimed_amount IS 'Amount client claims to have paid';
COMMENT ON COLUMN payment_disputes.claimed_reference IS 'Bank reference number, check number, or transaction ID';
COMMENT ON COLUMN payment_disputes.status IS 'pending (new) | resolved_paid (confirmed) | resolved_unpaid (rejected) | invalid (false claim)';
COMMENT ON COLUMN payment_disputes.resolved_by IS 'Admin/staff user who resolved the dispute';
COMMENT ON COLUMN payment_disputes.resolution_notes IS 'Sigal notes on how dispute was resolved';

-- Create index for pending disputes (most common query)
CREATE INDEX idx_payment_disputes_pending
  ON payment_disputes(tenant_id, status)
  WHERE status = 'pending';

-- Create RLS policy for tenant isolation
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payment_disputes
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON payment_disputes IS 'Multi-tenant isolation - users can only access disputes from their tenant';
