-- ================================================
-- Migration: Fix payment_date Type Mismatch
-- Date: 2025-11-02
-- Description:
--   Fix get_fee_tracking_data() function to handle DATE->TIMESTAMPTZ cast
--   The fee_calculations.payment_date is DATE, but function returns TIMESTAMPTZ
--   This was causing 400 Bad Request when calling the RPC function
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
    fc.payment_date::TIMESTAMPTZ AS payment_date  -- FIX: Cast DATE to TIMESTAMPTZ

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
Shows calculation status, letter status, and payment status for each client.
Fixed: payment_date cast from DATE to TIMESTAMPTZ for type consistency.';
