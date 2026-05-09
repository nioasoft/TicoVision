-- ============================================================================
-- Migration: shaagat_initial_filter_view
-- Date: 2026-05-08
-- Purpose: Power the new internal "Initial Filter" screen for Shaagat HaAri.
--
-- Shows ALL active clients with:
--   * Their latest eligibility check (if any)
--   * A flag indicating whether the client has unpaid annual retainer fees
--     for the CURRENT calendar year
--
-- Replaces the previous "feasibility public form first" flow with an internal
-- list that the accountant works through one client at a time.
-- ============================================================================

CREATE OR REPLACE VIEW shaagat_initial_filter_view
WITH (security_invoker = true)
AS
WITH latest_eligibility AS (
  SELECT DISTINCT ON (ec.client_id)
    ec.id                          AS eligibility_check_id,
    ec.client_id,
    ec.tenant_id,
    ec.eligibility_status,
    ec.decline_percentage,
    ec.compensation_rate,
    ec.payment_status               AS shaagat_fee_payment_status,
    ec.email_sent,
    ec.is_relevant,
    ec.created_at                   AS check_created_at,
    ec.track_type,
    ec.reporting_type,
    ec.business_type
  FROM shaagat_eligibility_checks ec
  WHERE ec.is_active = true
  ORDER BY ec.client_id, ec.created_at DESC
),
annual_retainer_status AS (
  SELECT
    fc.client_id,
    fc.tenant_id,
    -- True when the client has at least one current-year fee_calculation that
    -- is NOT in a terminal-paid state.
    bool_or(fc.status NOT IN ('paid', 'cancelled')) AS has_unpaid_annual_retainer,
    -- True only if the client has at least one current-year row at all.
    count(*) > 0                                     AS has_any_current_year_fee
  FROM fee_calculations fc
  WHERE fc.year = EXTRACT(YEAR FROM CURRENT_DATE)::int
  GROUP BY fc.client_id, fc.tenant_id
)
SELECT
  c.id                                                       AS client_id,
  c.tenant_id,
  c.company_name,
  c.company_name_hebrew,
  c.tax_id,
  c.status                                                   AS client_status,
  -- Eligibility (NULL when the client has not been checked yet)
  le.eligibility_check_id,
  le.eligibility_status,
  le.decline_percentage,
  le.compensation_rate,
  le.shaagat_fee_payment_status,
  le.email_sent,
  le.is_relevant,
  le.check_created_at,
  le.track_type,
  le.reporting_type,
  le.business_type,
  -- Annual retainer (current-year fee_calculations)
  COALESCE(ar.has_unpaid_annual_retainer, false)             AS has_unpaid_annual_retainer,
  COALESCE(ar.has_any_current_year_fee, false)               AS has_any_current_year_fee
FROM clients c
LEFT JOIN latest_eligibility le
       ON le.client_id  = c.id
      AND le.tenant_id  = c.tenant_id
LEFT JOIN annual_retainer_status ar
       ON ar.client_id  = c.id
      AND ar.tenant_id  = c.tenant_id
WHERE c.status = 'active';

COMMENT ON VIEW shaagat_initial_filter_view IS
  'Active clients with their latest Shaagat HaAri eligibility check and current-year retainer status. Backs the InitialFilterPage.';
