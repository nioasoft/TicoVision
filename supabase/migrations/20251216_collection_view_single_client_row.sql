-- ================================================
-- Migration: Collection Dashboard View - Single Row Per Client
-- Date: 2025-12-16
-- Description:
--   Fix collection_dashboard_view to show only ONE row per client
--   Uses DISTINCT ON (tenant_id, client_id) to get only the most recent fee_calculation
--   This fixes the issue where clients appear multiple times when they have multiple fee_calculations
-- ================================================

-- Drop existing view
DROP VIEW IF EXISTS collection_dashboard_view;

-- Recreate view with DISTINCT ON to show only most recent fee per client
CREATE VIEW collection_dashboard_view
WITH (security_invoker=true)  -- CRITICAL: Respect RLS policies
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

  -- Payment status
  fc.status AS payment_status,
  fc.partial_payment_amount AS amount_paid,
  (fc.total_amount - COALESCE(fc.partial_payment_amount, 0)) AS amount_remaining,

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
  ) AS interaction_count

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
) gl ON true;

COMMENT ON VIEW collection_dashboard_view IS
'Collection dashboard data showing ONE row per client (most recent fee calculation only).
Uses DISTINCT ON (tenant_id, client_id) to eliminate duplicate client rows.
Uses LATERAL JOIN to get most recent letter per fee calculation.
Uses security_invoker=true to respect RLS policies.';
