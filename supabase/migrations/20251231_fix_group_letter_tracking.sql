-- ================================================
-- Migration: Fix Group Letter Tracking in Fee Tracking
-- Date: 2025-12-31
-- Description:
--   Fix get_fee_tracking_data() to consider letters sent to groups.
--   Previously, clients who received letters via their group showed as "not_sent"
--   because the function only checked generated_letters.client_id = clients.id
--   Now it also checks if generated_letters.group_id = clients.group_id
-- ================================================

DROP FUNCTION IF EXISTS get_fee_tracking_data(UUID, INT);

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
  payment_date DATE,
  payment_method_selected TEXT,
  amount_after_selected_discount NUMERIC,
  payment_method_selected_at TIMESTAMPTZ,
  -- Additional fields for payer tracking
  payer_client_id UUID,
  payer_client_name TEXT,
  payment_role TEXT
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

    -- Letter status (now includes group letters!)
    (gl.id IS NOT NULL AND gl.sent_at IS NOT NULL) AS has_letter,
    gl.id AS letter_id,
    gl.sent_at AS letter_sent_at,

    -- Payment status (derived from fee calculation status)
    CASE
      WHEN fc.id IS NULL THEN 'not_calculated'
      WHEN fc.status = 'paid' THEN 'paid'
      WHEN fc.status = 'partial_paid' THEN 'partial_paid'
      WHEN gl.id IS NULL OR gl.sent_at IS NULL THEN 'not_sent'
      WHEN fc.status IN ('sent', 'overdue') THEN 'pending'
      ELSE 'pending'
    END AS payment_status,

    -- Payment details
    fc.total_amount AS payment_amount,
    fc.payment_date,

    -- Payment method selection
    fc.payment_method_selected,
    fc.amount_after_selected_discount,
    fc.payment_method_selected_at,

    -- Payer info (for groups where one client pays for others)
    payer.id AS payer_client_id,
    payer.company_name AS payer_client_name,
    COALESCE(c.payment_role, 'independent')::TEXT AS payment_role

  FROM clients c

  -- Get most recent fee calculation for this year
  LEFT JOIN LATERAL (
    SELECT
      fc_inner.id,
      fc_inner.status,
      fc_inner.total_amount,
      fc_inner.payment_date,
      fc_inner.created_at,
      fc_inner.payment_method_selected,
      fc_inner.amount_after_selected_discount,
      fc_inner.payment_method_selected_at
    FROM fee_calculations fc_inner
    WHERE fc_inner.client_id = c.id
      AND fc_inner.tenant_id = p_tenant_id
      AND fc_inner.year = p_tax_year
    ORDER BY fc_inner.created_at DESC
    LIMIT 1
  ) fc ON true

  -- Get most recent generated letter for this calculation
  -- FIX: Now also checks for group letters (where client belongs to the group)
  LEFT JOIN LATERAL (
    SELECT
      gl_inner.id,
      gl_inner.sent_at
    FROM generated_letters gl_inner
    WHERE gl_inner.tenant_id = p_tenant_id
      AND (
        -- Direct letter to this client
        gl_inner.client_id = c.id
        -- OR letter sent to client's group
        OR (gl_inner.group_id IS NOT NULL AND c.group_id IS NOT NULL AND gl_inner.group_id = c.group_id)
      )
      -- If we have a fee calculation, prefer letters linked to it
      AND (fc.id IS NULL OR gl_inner.fee_calculation_id = fc.id OR gl_inner.group_calculation_id IS NOT NULL)
    ORDER BY gl_inner.created_at DESC
    LIMIT 1
  ) gl ON true

  -- Get payer client (if this client has a payer assigned)
  LEFT JOIN clients payer ON payer.id = c.payer_client_id AND payer.tenant_id = p_tenant_id

  WHERE c.tenant_id = p_tenant_id
    AND c.status = 'active'
  ORDER BY c.company_name;
END;
$$;

COMMENT ON FUNCTION get_fee_tracking_data IS
'Returns complete fee tracking data for all active clients for a given tax year.
Shows calculation status, letter status, and payment status for each client.
FIX (2025-12-31): Now correctly identifies letters sent to groups - clients who received
a letter via their group will show as "sent" instead of "not_sent".';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_fee_tracking_data(UUID, INT) TO authenticated;
