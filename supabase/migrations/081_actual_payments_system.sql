-- ================================================
-- Migration: Actual Payments & Deviation Tracking System
-- Date: 2025-01-06
-- Description:
--   Complete system for tracking actual payments received from clients,
--   comparing them to expected amounts (with discounts), and alerting on deviations.
--
-- Components:
--   1. actual_payments - Detailed payment records with VAT breakdown
--   2. payment_installments - Installment schedule tracking
--   3. payment_deviations - Deviation alerts and review system
--   4. fee_tracking_enhanced_view - Comprehensive view combining all data
--   5. calculate_payment_deviation() - Deviation calculation function
--
-- Payment Methods & Discounts:
--   - bank_transfer: 9% discount (most recommended)
--   - cc_single: 8% discount
--   - cc_installments: 4% discount
--   - checks: 0% discount
-- ================================================

-- ================================================
-- PART 1: CREATE TABLES
-- ================================================

-- Table: actual_payments
-- Tracks actual payments received from clients with full VAT breakdown
CREATE TABLE actual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,

  -- Payment amounts (CRITICAL: Before VAT + VAT + With VAT)
  amount_paid NUMERIC(12,2) NOT NULL,              -- Total amount paid (same as amount_with_vat)
  amount_before_vat NUMERIC(12,2) NOT NULL,        -- Before VAT (18%)
  amount_vat NUMERIC(12,2) NOT NULL,               -- VAT amount (18% of amount_before_vat)
  amount_with_vat NUMERIC(12,2) NOT NULL,          -- Total with VAT

  -- Payment details
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cc_single', 'cc_installments', 'checks')),
  payment_reference TEXT,                          -- Transaction reference / check numbers
  num_installments INTEGER CHECK (num_installments IS NULL OR num_installments > 0),

  -- File attachments (references to client_attachments table)
  attachment_ids UUID[],                           -- Array of client_attachments IDs

  -- Notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_vat_calculation CHECK (amount_with_vat = amount_before_vat + amount_vat),
  CONSTRAINT valid_amount_paid CHECK (amount_paid = amount_with_vat)
);

-- Indexes for actual_payments
CREATE INDEX idx_actual_payments_tenant ON actual_payments(tenant_id);
CREATE INDEX idx_actual_payments_client ON actual_payments(client_id);
CREATE INDEX idx_actual_payments_fee_calc ON actual_payments(fee_calculation_id);
CREATE INDEX idx_actual_payments_date ON actual_payments(payment_date);
CREATE INDEX idx_actual_payments_method ON actual_payments(payment_method);

-- Comments for actual_payments
COMMENT ON TABLE actual_payments IS 'Actual payments received from clients, including amounts before/with VAT and full payment details';
COMMENT ON COLUMN actual_payments.amount_paid IS 'Total amount paid (equals amount_with_vat)';
COMMENT ON COLUMN actual_payments.amount_before_vat IS 'Amount before 18% VAT';
COMMENT ON COLUMN actual_payments.amount_vat IS '18% VAT amount';
COMMENT ON COLUMN actual_payments.amount_with_vat IS 'Total amount including VAT';
COMMENT ON COLUMN actual_payments.payment_method IS 'Payment method: bank_transfer (9%) | cc_single (8%) | cc_installments (4%) | checks (0%)';
COMMENT ON COLUMN actual_payments.attachment_ids IS 'Array of client_attachments IDs for proof of payment documents';
COMMENT ON COLUMN actual_payments.num_installments IS 'Number of installments (for cc_installments or checks)';

-- ================================================

-- Table: payment_installments
-- Tracks installment schedule for payments (checks, credit card installments)
CREATE TABLE payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actual_payment_id UUID NOT NULL REFERENCES actual_payments(id) ON DELETE CASCADE,

  -- Installment details
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  installment_date DATE NOT NULL,                  -- Due date
  installment_amount NUMERIC(12,2) NOT NULL CHECK (installment_amount > 0),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_date DATE,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_paid_status CHECK (
    (status = 'paid' AND paid_date IS NOT NULL) OR
    (status != 'paid' AND paid_date IS NULL)
  )
);

-- Indexes for payment_installments
CREATE INDEX idx_installments_tenant ON payment_installments(tenant_id);
CREATE INDEX idx_installments_payment ON payment_installments(actual_payment_id);
CREATE INDEX idx_installments_status ON payment_installments(status);
CREATE INDEX idx_installments_date ON payment_installments(installment_date);

-- Comments for payment_installments
COMMENT ON TABLE payment_installments IS 'Installment schedule for payments (checks, credit card installments)';
COMMENT ON COLUMN payment_installments.status IS 'pending: not yet paid | paid: received | overdue: past due date';

-- ================================================

-- Table: payment_deviations
-- Tracks deviations between expected and actual payment amounts
CREATE TABLE payment_deviations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,
  actual_payment_id UUID NOT NULL REFERENCES actual_payments(id) ON DELETE CASCADE,

  -- Expected vs Actual
  expected_discount_percent NUMERIC(5,2),          -- Discount % from payment method (9, 8, 4, 0)
  expected_amount NUMERIC(12,2),                   -- Expected amount after discount
  actual_amount NUMERIC(12,2),                     -- Actual amount paid

  -- Deviation calculation
  deviation_amount NUMERIC(12,2),                  -- Difference (expected - actual)
  deviation_percent NUMERIC(5,2),                  -- Percentage difference

  -- Alert system
  alert_level TEXT NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical')),
  alert_message TEXT,

  -- Review status
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for payment_deviations
CREATE INDEX idx_deviations_tenant ON payment_deviations(tenant_id);
CREATE INDEX idx_deviations_client ON payment_deviations(client_id);
CREATE INDEX idx_deviations_fee_calc ON payment_deviations(fee_calculation_id);
CREATE INDEX idx_deviations_alert_level ON payment_deviations(alert_level);
CREATE INDEX idx_deviations_reviewed ON payment_deviations(reviewed) WHERE reviewed = false;

-- Comments for payment_deviations
COMMENT ON TABLE payment_deviations IS 'Tracks deviations between expected and actual payment amounts with alert system';
COMMENT ON COLUMN payment_deviations.alert_level IS 'info: <1% deviation | warning: 1-5% deviation | critical: >5% deviation';
COMMENT ON COLUMN payment_deviations.deviation_amount IS 'Expected - Actual (positive = underpaid, negative = overpaid)';

-- ================================================
-- PART 2: UPDATE fee_calculations TABLE
-- ================================================

-- Add columns for linking to actual payments and deviation tracking
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS actual_payment_id UUID REFERENCES actual_payments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS has_deviation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deviation_alert_level TEXT CHECK (deviation_alert_level IS NULL OR deviation_alert_level IN ('info', 'warning', 'critical'));

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_fee_calc_actual_payment ON fee_calculations(actual_payment_id);
CREATE INDEX IF NOT EXISTS idx_fee_calc_has_deviation ON fee_calculations(has_deviation) WHERE has_deviation = true;

-- Comments
COMMENT ON COLUMN fee_calculations.actual_payment_id IS 'Link to actual payment record (if payment received)';
COMMENT ON COLUMN fee_calculations.has_deviation IS 'True if payment amount deviates from expected amount';
COMMENT ON COLUMN fee_calculations.deviation_alert_level IS 'Alert level for deviation: info (<1%) | warning (1-5%) | critical (>5%)';

-- ================================================
-- PART 3: ROW LEVEL SECURITY POLICIES
-- ================================================

-- Enable RLS on all new tables
ALTER TABLE actual_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deviations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for actual_payments
CREATE POLICY "Users can view actual_payments from their tenant"
  ON actual_payments FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert actual_payments for their tenant"
  ON actual_payments FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update actual_payments from their tenant"
  ON actual_payments FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete actual_payments from their tenant"
  ON actual_payments FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- RLS Policies for payment_installments
CREATE POLICY "Users can view installments from their tenant"
  ON payment_installments FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert installments for their tenant"
  ON payment_installments FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update installments from their tenant"
  ON payment_installments FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete installments from their tenant"
  ON payment_installments FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- RLS Policies for payment_deviations
CREATE POLICY "Users can view deviations from their tenant"
  ON payment_deviations FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can insert deviations for their tenant"
  ON payment_deviations FOR INSERT
  WITH CHECK (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can update deviations from their tenant"
  ON payment_deviations FOR UPDATE
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "Users can delete deviations from their tenant"
  ON payment_deviations FOR DELETE
  USING (tenant_id = get_current_tenant_id());

-- ================================================
-- PART 4: DATABASE VIEWS
-- ================================================

-- View: fee_tracking_enhanced_view
-- Comprehensive view combining fee calculations, actual payments, and deviations
CREATE OR REPLACE VIEW fee_tracking_enhanced_view
WITH (security_invoker = true)
AS
SELECT
  fc.id as fee_calculation_id,
  fc.tenant_id,
  fc.client_id,
  c.company_name,
  c.tax_id,
  fc.year,

  -- Original amounts (theoretical)
  fc.final_amount as original_amount,
  fc.calculated_before_vat as original_before_vat,
  fc.calculated_with_vat as original_with_vat,

  -- Selected payment method & expected amount
  fc.payment_method_selected,
  fc.amount_after_selected_discount as expected_amount,

  -- Expected discount percentage
  CASE fc.payment_method_selected
    WHEN 'bank_transfer' THEN 9
    WHEN 'cc_single' THEN 8
    WHEN 'cc_installments' THEN 4
    WHEN 'checks' THEN 0
    ELSE 0
  END as expected_discount_percent,

  -- Actual payment details
  ap.id as actual_payment_id,
  ap.amount_paid as actual_amount_paid,
  ap.amount_before_vat as actual_before_vat,
  ap.amount_with_vat as actual_with_vat,
  ap.payment_date as actual_payment_date,
  ap.payment_method as actual_payment_method,
  ap.payment_reference,
  ap.num_installments,
  ap.attachment_ids,

  -- Deviation details
  pd.id as deviation_id,
  pd.deviation_amount,
  pd.deviation_percent,
  pd.alert_level as deviation_alert_level,
  pd.alert_message as deviation_alert_message,
  pd.reviewed as deviation_reviewed,
  pd.reviewed_by as deviation_reviewed_by,
  pd.reviewed_at as deviation_reviewed_at,
  pd.review_notes as deviation_review_notes,

  -- Status
  fc.status,
  fc.payment_date as fee_payment_date,
  fc.has_deviation,

  -- Installment counts
  (SELECT COUNT(*) FROM payment_installments pi WHERE pi.actual_payment_id = ap.id) as installment_count,
  (SELECT COUNT(*) FROM payment_installments pi WHERE pi.actual_payment_id = ap.id AND pi.status = 'paid') as installments_paid,
  (SELECT COUNT(*) FROM payment_installments pi WHERE pi.actual_payment_id = ap.id AND pi.status = 'overdue') as installments_overdue,

  -- File attachment count
  COALESCE(array_length(ap.attachment_ids, 1), 0) as attachment_count,

  -- Timestamps
  fc.created_at,
  fc.updated_at,
  ap.created_at as payment_created_at,
  ap.updated_at as payment_updated_at

FROM fee_calculations fc
LEFT JOIN clients c ON fc.client_id = c.id AND fc.tenant_id = c.tenant_id
LEFT JOIN actual_payments ap ON fc.actual_payment_id = ap.id
LEFT JOIN payment_deviations pd ON fc.id = pd.fee_calculation_id
WHERE fc.tenant_id = get_current_tenant_id();

COMMENT ON VIEW fee_tracking_enhanced_view IS 'Enhanced view combining fee calculations, actual payments, deviations, and installment tracking - filtered by current tenant';

-- ================================================
-- PART 5: DATABASE FUNCTIONS
-- ================================================

-- Function: calculate_payment_deviation()
-- Calculates deviation between expected and actual payment amounts with alert levels
CREATE OR REPLACE FUNCTION calculate_payment_deviation(
  p_fee_calculation_id UUID,
  p_actual_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_expected_amount NUMERIC;
  v_expected_discount NUMERIC;
  v_original_amount NUMERIC;
  v_deviation_amount NUMERIC;
  v_deviation_percent NUMERIC;
  v_alert_level TEXT;
  v_alert_message TEXT;
BEGIN
  -- Get expected amount and discount from fee_calculation
  SELECT
    COALESCE(amount_after_selected_discount, final_amount),
    final_amount,
    CASE payment_method_selected
      WHEN 'bank_transfer' THEN 9
      WHEN 'cc_single' THEN 8
      WHEN 'cc_installments' THEN 4
      WHEN 'checks' THEN 0
      ELSE 0
    END
  INTO v_expected_amount, v_original_amount, v_expected_discount
  FROM fee_calculations
  WHERE id = p_fee_calculation_id;

  -- Handle case where fee_calculation not found
  IF v_expected_amount IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Fee calculation not found',
      'success', false
    );
  END IF;

  -- Calculate deviation
  v_deviation_amount := v_expected_amount - p_actual_amount;

  -- Prevent division by zero
  IF v_expected_amount = 0 THEN
    v_deviation_percent := 0;
  ELSE
    v_deviation_percent := (v_deviation_amount / v_expected_amount) * 100;
  END IF;

  -- Determine alert level based on absolute deviation percentage
  IF ABS(v_deviation_percent) < 1 THEN
    v_alert_level := 'info';
    v_alert_message := 'תשלום תקין - סטייה מינימלית';
  ELSIF ABS(v_deviation_percent) < 5 THEN
    v_alert_level := 'warning';
    v_alert_message := format('סטייה קלה: ₪%s (%s%%)',
      ROUND(ABS(v_deviation_amount), 2),
      ROUND(ABS(v_deviation_percent), 2));
  ELSE
    v_alert_level := 'critical';
    v_alert_message := format('⚠️ סטייה משמעותית: ₪%s (%s%%)!',
      ROUND(ABS(v_deviation_amount), 2),
      ROUND(ABS(v_deviation_percent), 2));
  END IF;

  -- Add direction to message
  IF v_deviation_amount > 0 THEN
    v_alert_message := v_alert_message || ' - תשלום חסר';
  ELSIF v_deviation_amount < 0 THEN
    v_alert_message := v_alert_message || ' - תשלום עודף';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'expected_amount', v_expected_amount,
    'expected_discount_percent', v_expected_discount,
    'original_amount', v_original_amount,
    'actual_amount', p_actual_amount,
    'deviation_amount', v_deviation_amount,
    'deviation_percent', v_deviation_percent,
    'alert_level', v_alert_level,
    'alert_message', v_alert_message
  );
END;
$$;

COMMENT ON FUNCTION calculate_payment_deviation IS 'Calculates deviation between expected and actual payment amounts with Hebrew alert messages. Alert levels: info (<1%), warning (1-5%), critical (>5%)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_payment_deviation(UUID, NUMERIC) TO authenticated;

-- ================================================
-- PART 6: TRIGGERS (Auto-update updated_at)
-- ================================================

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_actual_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply trigger to actual_payments
CREATE TRIGGER update_actual_payments_timestamp
  BEFORE UPDATE ON actual_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_actual_payments_updated_at();

COMMENT ON FUNCTION update_actual_payments_updated_at IS 'Auto-updates updated_at timestamp on actual_payments changes';

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- Tables created:
--   - actual_payments (payment records with VAT breakdown)
--   - payment_installments (installment tracking)
--   - payment_deviations (deviation alerts)
--
-- Updates:
--   - fee_calculations (3 new columns for payment linking)
--
-- Views:
--   - fee_tracking_enhanced_view (comprehensive payment tracking)
--
-- Functions:
--   - calculate_payment_deviation() (deviation calculation)
--
-- Security:
--   - RLS policies enabled on all new tables
--   - Tenant isolation enforced via get_current_tenant_id()
-- ================================================
