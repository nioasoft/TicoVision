-- ================================================
-- Migration: Fix Collection Dashboard View - Duplicate Letters Issue
-- Date: 2025-11-02
-- Description:
--   Fix collection_dashboard_view to handle 1-to-many generated_letters relationship
--   Use LATERAL JOIN to get only the most recent letter per fee_calculation
--   This fixes the 400 Bad Request error when querying the collection dashboard
-- ================================================

-- Drop existing view
DROP VIEW IF EXISTS collection_dashboard_view;

-- Recreate view with LATERAL join to get only most recent letter
CREATE VIEW collection_dashboard_view AS
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

FROM fee_calculations fc
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

WHERE fc.status IN ('sent', 'paid', 'partial_paid');

COMMENT ON VIEW collection_dashboard_view IS
'Complete collection dashboard data with most recent letter per fee calculation.
Uses LATERAL JOIN to avoid duplicate rows when multiple letters exist.
Fixed: 400 Bad Request error by ensuring 1-to-1 relationship with generated_letters.';
