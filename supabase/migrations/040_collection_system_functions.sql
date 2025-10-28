-- Migration: Collection System - Helper functions and views
-- Description: Database functions and views for collection dashboard queries
-- Date: 2025-10-27

-- Function 1: Get collection statistics for dashboard KPIs
CREATE OR REPLACE FUNCTION get_collection_statistics(p_tenant_id UUID)
RETURNS TABLE (
  total_expected NUMERIC,
  total_received NUMERIC,
  total_pending NUMERIC,
  collection_rate NUMERIC,
  clients_sent INTEGER,
  clients_paid INTEGER,
  clients_pending INTEGER,
  alerts_unopened INTEGER,
  alerts_no_selection INTEGER,
  alerts_abandoned INTEGER,
  alerts_disputes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH fee_stats AS (
    SELECT
      COALESCE(SUM(total_amount), 0) as total_expected,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_received,
      COALESCE(SUM(CASE WHEN status IN ('sent', 'partial_paid') THEN total_amount - COALESCE(partial_payment_amount, 0) ELSE 0 END), 0) as total_pending,
      COUNT(DISTINCT CASE WHEN status IN ('sent', 'paid', 'partial_paid') THEN client_id END) as clients_sent,
      COUNT(DISTINCT CASE WHEN status = 'paid' THEN client_id END) as clients_paid,
      COUNT(DISTINCT CASE WHEN status IN ('sent', 'partial_paid') THEN client_id END) as clients_pending
    FROM fee_calculations
    WHERE tenant_id = p_tenant_id
  ),
  alert_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE gl.opened_at IS NULL AND fc.created_at < NOW() - INTERVAL '7 days') as alerts_unopened,
      COUNT(*) FILTER (WHERE gl.opened_at IS NOT NULL AND fc.payment_method_selected IS NULL AND fc.created_at < NOW() - INTERVAL '14 days') as alerts_no_selection,
      COUNT(*) FILTER (WHERE pms.completed_payment = FALSE AND pms.selected_method IN ('cc_single', 'cc_installments') AND pms.selected_at < NOW() - INTERVAL '2 days') as alerts_abandoned
    FROM fee_calculations fc
    LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
    LEFT JOIN payment_method_selections pms ON pms.fee_calculation_id = fc.id
    WHERE fc.tenant_id = p_tenant_id
      AND fc.status IN ('sent', 'partial_paid')
  ),
  dispute_stats AS (
    SELECT COUNT(*) as alerts_disputes
    FROM payment_disputes
    WHERE tenant_id = p_tenant_id
      AND status = 'pending'
  )
  SELECT
    fs.total_expected,
    fs.total_received,
    fs.total_pending,
    CASE
      WHEN fs.total_expected > 0 THEN ROUND((fs.total_received / fs.total_expected) * 100, 2)
      ELSE 0
    END as collection_rate,
    fs.clients_sent::INTEGER,
    fs.clients_paid::INTEGER,
    fs.clients_pending::INTEGER,
    als.alerts_unopened::INTEGER,
    als.alerts_no_selection::INTEGER,
    als.alerts_abandoned::INTEGER,
    ds.alerts_disputes::INTEGER
  FROM fee_stats fs
  CROSS JOIN alert_stats als
  CROSS JOIN dispute_stats ds;
END;
$$;

COMMENT ON FUNCTION get_collection_statistics(UUID) IS 'Returns collection dashboard KPIs for a tenant';

-- Function 2: Get fees needing reminders (used by reminder engine)
CREATE OR REPLACE FUNCTION get_fees_needing_reminders(p_tenant_id UUID, p_rule_id UUID)
RETURNS TABLE (
  fee_calculation_id UUID,
  client_id UUID,
  client_email TEXT,
  amount NUMERIC,
  days_since_sent INTEGER,
  opened BOOLEAN,
  payment_method_selected TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conditions JSONB;
  v_days_since_sent INTEGER;
  v_payment_status TEXT[];
  v_opened BOOLEAN;
  v_payment_method_selected TEXT;
BEGIN
  -- Get rule conditions
  SELECT trigger_conditions INTO v_conditions
  FROM reminder_rules
  WHERE id = p_rule_id AND tenant_id = p_tenant_id AND is_active = TRUE;

  IF v_conditions IS NULL THEN
    RETURN;
  END IF;

  -- Extract conditions
  v_days_since_sent := (v_conditions->>'days_since_sent')::INTEGER;
  v_payment_status := ARRAY(SELECT jsonb_array_elements_text(v_conditions->'payment_status'));
  v_opened := (v_conditions->>'opened')::BOOLEAN;
  v_payment_method_selected := v_conditions->>'payment_method_selected';

  RETURN QUERY
  SELECT
    fc.id as fee_calculation_id,
    fc.client_id,
    c.contact_email as client_email,
    fc.total_amount as amount,
    EXTRACT(DAY FROM NOW() - fc.created_at)::INTEGER as days_since_sent,
    (gl.opened_at IS NOT NULL) as opened,
    fc.payment_method_selected
  FROM fee_calculations fc
  JOIN clients c ON c.id = fc.client_id
  LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
  WHERE fc.tenant_id = p_tenant_id
    AND fc.status = ANY(v_payment_status)
    AND EXTRACT(DAY FROM NOW() - fc.created_at) >= v_days_since_sent
    AND (v_opened IS NULL OR (gl.opened_at IS NOT NULL) = v_opened)
    AND (v_payment_method_selected IS NULL OR fc.payment_method_selected IS NULL)
    AND (fc.last_reminder_sent_at IS NULL OR fc.last_reminder_sent_at < NOW() - INTERVAL '7 days');
END;
$$;

COMMENT ON FUNCTION get_fees_needing_reminders(UUID, UUID) IS 'Returns fees matching a reminder rule criteria for automated reminder engine';

-- View 1: Collection Dashboard View (combines multiple tables)
CREATE OR REPLACE VIEW collection_dashboard_view AS
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

COMMENT ON VIEW collection_dashboard_view IS 'Combined view for collection dashboard - includes all relevant data for Sigal collection tracking';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_collection_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fees_needing_reminders(UUID, UUID) TO authenticated;
GRANT SELECT ON collection_dashboard_view TO authenticated;
