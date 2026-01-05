-- ================================================
-- Migration: Fix Payment Status for Clients with Bookkeeping Fees
-- Date: 2026-01-05
-- Description:
--   Fixes a bug where clients with both accounting and bookkeeping fees
--   appear as "paid" when only accounting fee is paid.
--   Now compares total paid (from actual_payments) against expected total
--   (accounting + bookkeeping) to determine correct payment status.
-- ================================================

DROP FUNCTION IF EXISTS get_fee_tracking_data(UUID, INT);

CREATE OR REPLACE FUNCTION get_fee_tracking_data(
  p_tenant_id UUID,
  p_tax_year INT
)
RETURNS TABLE (
  -- Client info
  client_id UUID,
  client_name TEXT,
  client_name_hebrew TEXT,
  tax_id TEXT,

  -- Individual fee calculation
  has_calculation BOOLEAN,
  calculation_id UUID,
  calculation_status TEXT,
  calculation_amount NUMERIC,
  calculation_created_at TIMESTAMPTZ,

  -- Individual letter
  has_letter BOOLEAN,
  letter_id UUID,
  letter_sent_at TIMESTAMPTZ,

  -- Payment status (derived)
  payment_status TEXT,
  payment_amount NUMERIC,
  payment_date DATE,
  payment_method_selected TEXT,
  amount_after_selected_discount NUMERIC,
  payment_method_selected_at TIMESTAMPTZ,

  -- Payer info (for clients paid by another client)
  payer_client_id UUID,
  payer_client_name TEXT,
  payment_role TEXT,

  -- Group info (from clients table)
  group_id UUID,
  group_name TEXT,

  -- Group fee calculation data
  group_calculation_id UUID,
  group_audit_before_vat NUMERIC,
  group_audit_with_vat NUMERIC,
  group_bookkeeping_before_vat NUMERIC,
  group_bookkeeping_with_vat NUMERIC,
  group_calculation_status TEXT,
  group_letter_id UUID,
  group_letter_sent_at TIMESTAMPTZ
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

    -- Letter status (includes group letters)
    (gl.id IS NOT NULL AND gl.sent_at IS NOT NULL) AS has_letter,
    gl.id AS letter_id,
    gl.sent_at AS letter_sent_at,

    -- Payment status (FIX: now considers bookkeeping fees)
    -- Compare total paid against expected total (accounting + bookkeeping)
    CASE
      WHEN fc.id IS NULL THEN 'not_calculated'
      -- If total paid covers all fees (accounting + bookkeeping if exists)
      WHEN COALESCE(ap_sum.total_paid, 0) >= (
        fc.total_amount + COALESCE((fc.bookkeeping_calculation->>'total_with_vat')::NUMERIC, 0)
      ) THEN 'paid'
      -- If some payment was made but not covering all fees
      WHEN COALESCE(ap_sum.total_paid, 0) > 0 THEN 'partial_paid'
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
    COALESCE(c.payment_role, 'independent')::TEXT AS payment_role,

    -- Group info (from clients table)
    c.group_id,
    cg.group_name_hebrew AS group_name,

    -- Group fee calculation data
    gfc.id AS group_calculation_id,
    gfc.audit_final_amount AS group_audit_before_vat,
    gfc.audit_final_amount_with_vat AS group_audit_with_vat,
    gfc.bookkeeping_final_amount AS group_bookkeeping_before_vat,
    gfc.bookkeeping_final_amount_with_vat AS group_bookkeeping_with_vat,
    gfc.status::TEXT AS group_calculation_status,
    ggl.id AS group_letter_id,
    ggl.sent_at AS group_letter_sent_at

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
      fc_inner.payment_method_selected_at,
      fc_inner.bookkeeping_calculation
    FROM fee_calculations fc_inner
    WHERE fc_inner.client_id = c.id
      AND fc_inner.tenant_id = p_tenant_id
      AND fc_inner.year = p_tax_year
    ORDER BY fc_inner.created_at DESC
    LIMIT 1
  ) fc ON true

  -- NEW: Get sum of actual payments for this fee calculation
  LEFT JOIN LATERAL (
    SELECT SUM(ap_inner.amount_with_vat) AS total_paid
    FROM actual_payments ap_inner
    WHERE ap_inner.fee_calculation_id = fc.id
  ) ap_sum ON fc.id IS NOT NULL

  -- Get most recent generated letter for this calculation
  -- Includes both direct letters and group letters
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

  -- Get client group info
  LEFT JOIN client_groups cg ON cg.id = c.group_id AND cg.tenant_id = p_tenant_id

  -- Get group fee calculation for this year
  LEFT JOIN LATERAL (
    SELECT
      gfc_inner.id,
      gfc_inner.audit_final_amount,
      gfc_inner.audit_final_amount_with_vat,
      gfc_inner.bookkeeping_final_amount,
      gfc_inner.bookkeeping_final_amount_with_vat,
      gfc_inner.status
    FROM group_fee_calculations gfc_inner
    WHERE gfc_inner.group_id = c.group_id
      AND gfc_inner.tenant_id = p_tenant_id
      AND gfc_inner.year = p_tax_year
    ORDER BY gfc_inner.created_at DESC
    LIMIT 1
  ) gfc ON c.group_id IS NOT NULL

  -- Get group letter (sent to the group, not individual)
  LEFT JOIN LATERAL (
    SELECT
      ggl_inner.id,
      ggl_inner.sent_at
    FROM generated_letters ggl_inner
    WHERE ggl_inner.tenant_id = p_tenant_id
      AND ggl_inner.group_id = c.group_id
      AND ggl_inner.group_calculation_id = gfc.id
      AND ggl_inner.sent_at IS NOT NULL
    ORDER BY ggl_inner.created_at DESC
    LIMIT 1
  ) ggl ON c.group_id IS NOT NULL AND gfc.id IS NOT NULL

  WHERE c.tenant_id = p_tenant_id
    AND c.status = 'active'
  ORDER BY c.company_name;
END;
$$;

COMMENT ON FUNCTION get_fee_tracking_data IS
'Returns complete fee tracking data for all active clients for a given tax year.
Shows calculation status, letter status, and payment status for each client.
Also returns group fee calculation data for clients belonging to a group.
FIX (2026-01-05): Payment status now correctly considers bookkeeping fees.
If a client has both accounting and bookkeeping fees, they only show as "paid"
when total payments cover BOTH fee types.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_fee_tracking_data(UUID, INT) TO authenticated;
