-- Migration: Fix collection_dashboard_view security
-- Description: Add security_invoker=true to prevent SECURITY DEFINER warning
-- Date: 2025-11-01
-- Issue: Supabase linter warning about SECURITY DEFINER on view

-- Recreate view with explicit security_invoker=true
-- This ensures the view runs with the permissions of the querying user (not the creator)
-- and respects RLS policies on underlying tables
CREATE OR REPLACE VIEW collection_dashboard_view
WITH (security_invoker=true)
AS
SELECT
  fc.id as fee_calculation_id,
  fc.tenant_id,
  fc.client_id,
  c.company_name,
  c.company_name_hebrew,
  c.contact_email,
  c.contact_phone,

  -- Letter tracking
  gl.sent_at as letter_sent_date,
  gl.opened_at as letter_opened_at,
  gl.open_count as letter_open_count,
  EXTRACT(DAY FROM NOW() - gl.sent_at)::INTEGER as days_since_sent,

  -- Payment
  fc.total_amount as amount_original,
  fc.payment_method_selected,
  fc.amount_after_selected_discount,
  fc.status as payment_status,
  fc.partial_payment_amount as amount_paid,
  fc.total_amount - COALESCE(fc.partial_payment_amount, 0) as amount_remaining,

  -- Reminders
  fc.reminder_count,
  fc.last_reminder_sent_at,

  -- Disputes
  (SELECT COUNT(*) FROM payment_disputes pd WHERE pd.fee_calculation_id = fc.id AND pd.status = 'pending') > 0 as has_dispute,

  -- Interactions
  (SELECT MAX(interacted_at) FROM client_interactions ci WHERE ci.fee_calculation_id = fc.id) as last_interaction,
  (SELECT COUNT(*) FROM client_interactions ci WHERE ci.fee_calculation_id = fc.id) as interaction_count

FROM fee_calculations fc
JOIN clients c ON c.id = fc.client_id
LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
WHERE fc.status IN ('sent', 'paid', 'partial_paid');

COMMENT ON VIEW collection_dashboard_view IS 'Combined view for collection dashboard - includes all relevant data for Sigal collection tracking. Uses security_invoker to respect RLS policies.';
