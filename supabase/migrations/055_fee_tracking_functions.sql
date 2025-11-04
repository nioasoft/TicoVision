-- ================================================
-- Migration: Fee Tracking System Functions
-- Date: 2025-01-11
-- Description:
--   1. get_fee_tracking_data() - Track all clients' fee calculation status
--   2. get_dashboard_summary() - Optimized single-query dashboard data
-- ================================================

-- ================================================
-- Function 1: Get Fee Tracking Data
-- Returns complete tracking data for all active clients for a given tax year
-- ================================================
CREATE OR REPLACE FUNCTION get_fee_tracking_data(
  p_tenant_id UUID,
  p_tax_year INT
)
RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  client_name_hebrew TEXT,
  tax_id TEXT,
  has_calculation BOOLEAN,
  calculation_id UUID,
  calculation_status TEXT,
  calculation_amount NUMERIC,
  calculation_created_at TIMESTAMPTZ,
  has_letter BOOLEAN,
  letter_id UUID,
  letter_sent_at TIMESTAMPTZ,
  payment_status TEXT,
  payment_amount NUMERIC,
  payment_date TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS client_id,
    c.company_name AS client_name,
    c.company_name_hebrew,
    c.tax_id,

    -- Calculation status
    (fc.id IS NOT NULL) AS has_calculation,
    fc.id AS calculation_id,
    fc.status AS calculation_status,
    fc.total_amount AS calculation_amount,
    fc.created_at AS calculation_created_at,

    -- Letter status
    (gl.id IS NOT NULL AND gl.sent_at IS NOT NULL) AS has_letter,
    gl.id AS letter_id,
    gl.sent_at AS letter_sent_at,

    -- Payment status (derived from fee calculation status)
    CASE
      WHEN fc.id IS NULL THEN 'not_calculated'
      WHEN gl.id IS NULL OR gl.sent_at IS NULL THEN 'not_sent'
      WHEN fc.status = 'paid' THEN 'paid'
      WHEN fc.status = 'partial_paid' THEN 'partial_paid'
      WHEN fc.status IN ('sent', 'overdue') THEN 'pending'
      ELSE 'pending'
    END AS payment_status,

    -- Payment details
    fc.total_amount AS payment_amount,
    fc.payment_date

  FROM clients c

  -- Get most recent fee calculation for this year
  LEFT JOIN LATERAL (
    SELECT
      fc_inner.id,
      fc_inner.status,
      fc_inner.total_amount,
      fc_inner.payment_date,
      fc_inner.created_at
    FROM fee_calculations fc_inner
    WHERE fc_inner.client_id = c.id
      AND fc_inner.tenant_id = p_tenant_id
      AND fc_inner.year = p_tax_year
    ORDER BY fc_inner.created_at DESC
    LIMIT 1
  ) fc ON true

  -- Get most recent generated letter for this calculation
  LEFT JOIN LATERAL (
    SELECT
      gl_inner.id,
      gl_inner.sent_at
    FROM generated_letters gl_inner
    WHERE gl_inner.client_id = c.id
      AND gl_inner.tenant_id = p_tenant_id
      AND (fc.id IS NULL OR gl_inner.fee_calculation_id = fc.id)
    ORDER BY gl_inner.created_at DESC
    LIMIT 1
  ) gl ON true

  WHERE c.tenant_id = p_tenant_id
    AND c.status = 'active'
  ORDER BY c.company_name;
END;
$$;

COMMENT ON FUNCTION get_fee_tracking_data IS
'Returns complete fee tracking data for all active clients for a given tax year.
Shows calculation status, letter status, and payment status for each client.';

-- ================================================
-- Function 2: Get Dashboard Summary (Optimized)
-- Single query that returns all dashboard KPIs
-- Replaces 3 separate queries for better performance
-- ================================================
CREATE OR REPLACE FUNCTION get_dashboard_summary(
  p_tenant_id UUID,
  p_tax_year INT
)
RETURNS TABLE (
  -- Budget Standard (שכר טרחה + הנהלת חשבונות)
  audit_before_vat NUMERIC,
  audit_with_vat NUMERIC,
  bookkeeping_before_vat NUMERIC,
  bookkeeping_with_vat NUMERIC,

  -- Letter Stats (מספר לקוחות ששלחנו להם)
  clients_sent_count INT,

  -- Payment Stats (מספר לקוחות ששילמו/ממתינים + סכומים)
  clients_paid_count INT,
  clients_pending_count INT,
  amount_collected NUMERIC,
  amount_pending NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH fee_data AS (
    SELECT
      fc.id AS fee_id,
      fc.client_id,
      fc.status,
      fc.final_amount,
      fc.total_amount,
      fc.vat_amount,
      fc.bookkeeping_calculation,
      EXISTS(
        SELECT 1
        FROM generated_letters gl
        WHERE gl.fee_calculation_id = fc.id
          AND gl.sent_at IS NOT NULL
      ) AS has_sent_letter
    FROM fee_calculations fc
    WHERE fc.tenant_id = p_tenant_id
      AND fc.year = p_tax_year
  )
  SELECT
    -- Budget Standard - Audit (שכר טרחה)
    COALESCE(SUM(fd.final_amount), 0)::NUMERIC AS audit_before_vat,
    COALESCE(SUM(fd.total_amount), 0)::NUMERIC AS audit_with_vat,

    -- Budget Standard - Bookkeeping (הנהלת חשבונות)
    COALESCE(
      SUM((fd.bookkeeping_calculation->>'final_amount')::NUMERIC),
      0
    )::NUMERIC AS bookkeeping_before_vat,
    COALESCE(
      SUM((fd.bookkeeping_calculation->>'total_with_vat')::NUMERIC),
      0
    )::NUMERIC AS bookkeeping_with_vat,

    -- Letter Stats - Count distinct clients who were sent letters
    COUNT(DISTINCT CASE WHEN fd.has_sent_letter THEN fd.client_id END)::INT AS clients_sent_count,

    -- Payment Stats - Clients who paid
    COUNT(DISTINCT CASE WHEN fd.status = 'paid' THEN fd.client_id END)::INT AS clients_paid_count,

    -- Payment Stats - Clients pending payment
    COUNT(DISTINCT
      CASE
        WHEN fd.status IN ('sent', 'overdue', 'partial_paid') THEN fd.client_id
      END
    )::INT AS clients_pending_count,

    -- Payment Stats - Amount collected (paid)
    COALESCE(
      SUM(CASE WHEN fd.status = 'paid' THEN fd.total_amount ELSE 0 END),
      0
    )::NUMERIC AS amount_collected,

    -- Payment Stats - Amount pending (sent but not paid)
    COALESCE(
      SUM(
        CASE
          WHEN fd.status IN ('sent', 'overdue', 'partial_paid') THEN fd.total_amount
          ELSE 0
        END
      ),
      0
    )::NUMERIC AS amount_pending

  FROM fee_data fd;
END;
$$;

COMMENT ON FUNCTION get_dashboard_summary IS
'Optimized single-query function that returns all dashboard KPIs for a given tax year.
Replaces 3 separate queries (getBudgetStandard, getLetterStats, getPaymentStats) for better performance.';

-- ================================================
-- Grant permissions for both functions
-- ================================================
GRANT EXECUTE ON FUNCTION get_fee_tracking_data(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_summary(UUID, INT) TO authenticated;
