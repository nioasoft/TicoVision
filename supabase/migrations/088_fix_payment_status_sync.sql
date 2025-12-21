-- ================================================
-- Migration: Fix Payment Status Synchronization
-- Date: 2025-12-21
-- Description:
--   1. Fix get_fee_tracking_data() - payment_status derivation logic
--      (check 'paid' status BEFORE checking letter sent status)
--   2. Update collection_dashboard_view to include actual_payments data
--   3. Add helper function for consistent payment status derivation
-- ================================================

-- ================================================
-- Fix 1: Update get_fee_tracking_data() function
-- CRITICAL: Check 'paid'/'partial_paid' status BEFORE checking letter status
-- This fixes the bug where paid clients show as 'not_sent'
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
  payment_method_selected_at TIMESTAMPTZ
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
    -- CRITICAL FIX: Check paid/partial_paid BEFORE checking letter sent
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
    fc.payment_method_selected_at

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
FIXED (2025-12-21): payment_status now correctly checks paid/partial_paid BEFORE letter sent status.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_fee_tracking_data(UUID, INT) TO authenticated;

-- ================================================
-- Fix 2: Drop and recreate collection_dashboard_view
-- Add actual_payments data for consistency
-- ================================================
DROP VIEW IF EXISTS collection_dashboard_view;

CREATE VIEW collection_dashboard_view
WITH (security_invoker=true)
AS
WITH latest_fee_per_client AS (
  SELECT DISTINCT ON (fc.tenant_id, fc.client_id)
    fc.*
  FROM fee_calculations fc
  WHERE fc.status IN ('sent', 'paid', 'partial_paid')
  ORDER BY fc.tenant_id, fc.client_id, fc.created_at DESC
)
SELECT
  fc.id AS fee_calculation_id,
  fc.tenant_id,
  fc.client_id,
  c.company_name,
  c.company_name_hebrew,
  c.contact_email,
  c.contact_phone,

  -- Letter tracking (from most recent letter only)
  gl.sent_at AS letter_sent_date,
  gl.opened_at AS letter_opened_at,
  gl.open_count AS letter_open_count,
  EXTRACT(DAY FROM NOW() - gl.sent_at)::INTEGER AS days_since_sent,

  -- Fee amounts
  fc.total_amount AS amount_original,
  fc.payment_method_selected,
  fc.amount_after_selected_discount,

  -- Payment status - use fee_calculations.status directly
  fc.status AS payment_status,

  -- Amount paid - prefer actual_payments, fallback to partial_payment_amount
  COALESCE(ap.amount_paid, fc.partial_payment_amount, 0) AS amount_paid,

  -- Amount remaining
  (fc.total_amount - COALESCE(ap.amount_paid, fc.partial_payment_amount, 0)) AS amount_remaining,

  -- Reminder tracking
  fc.reminder_count,
  fc.last_reminder_sent_at,

  -- Dispute status
  (
    SELECT COUNT(*) > 0
    FROM payment_disputes pd
    WHERE pd.fee_calculation_id = fc.id
      AND pd.status = 'pending'
  ) AS has_dispute,

  -- Interaction tracking
  (
    SELECT MAX(ci.interacted_at)
    FROM client_interactions ci
    WHERE ci.fee_calculation_id = fc.id
  ) AS last_interaction,

  (
    SELECT COUNT(*)
    FROM client_interactions ci
    WHERE ci.fee_calculation_id = fc.id
  ) AS interaction_count,

  -- NEW: Actual payment info for complete data
  ap.id AS actual_payment_id,
  ap.payment_method AS actual_payment_method,
  ap.payment_date AS actual_payment_date,
  ap.payment_reference AS actual_payment_reference,

  -- Deviation info
  fc.has_deviation,
  fc.deviation_alert_level

FROM latest_fee_per_client fc
JOIN clients c ON c.id = fc.client_id

-- LATERAL JOIN to get only the most recent generated_letter per fee_calculation
LEFT JOIN LATERAL (
  SELECT
    sent_at,
    opened_at,
    open_count
  FROM generated_letters
  WHERE fee_calculation_id = fc.id
  ORDER BY sent_at DESC
  LIMIT 1
) gl ON true

-- LEFT JOIN to actual_payments to get actual payment data
LEFT JOIN actual_payments ap ON ap.fee_calculation_id = fc.id;

COMMENT ON VIEW collection_dashboard_view IS
'Collection dashboard data showing ONE row per client (most recent fee calculation only).
Uses DISTINCT ON (tenant_id, client_id) to eliminate duplicate client rows.
Uses LATERAL JOIN to get most recent letter per fee calculation.
Includes actual_payments data for consistent payment tracking.
Uses security_invoker=true to respect RLS policies.
UPDATED (2025-12-21): Added actual_payments join for unified payment data.';

-- ================================================
-- Fix 3: Create helper function for consistent payment status
-- This can be used anywhere we need to derive payment status
-- ================================================
CREATE OR REPLACE FUNCTION derive_payment_status(
  p_fee_status TEXT,
  p_has_letter BOOLEAN
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- CRITICAL: Check paid/partial_paid FIRST, regardless of letter status
  IF p_fee_status = 'paid' THEN
    RETURN 'paid';
  ELSIF p_fee_status = 'partial_paid' THEN
    RETURN 'partial_paid';
  ELSIF p_fee_status IS NULL THEN
    RETURN 'not_calculated';
  ELSIF NOT p_has_letter THEN
    RETURN 'not_sent';
  ELSIF p_fee_status IN ('sent', 'overdue') THEN
    RETURN 'pending';
  ELSE
    RETURN 'pending';
  END IF;
END;
$$;

COMMENT ON FUNCTION derive_payment_status IS
'Derives payment status from fee status and letter sent status.
CRITICAL: Always returns paid/partial_paid if fee status indicates payment,
regardless of whether a letter was sent.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION derive_payment_status(TEXT, BOOLEAN) TO authenticated;
