-- Migration: Fix SECURITY DEFINER functions missing search_path
-- Date: 2025-11-04
-- Purpose: Add explicit search_path to 3 critical functions to prevent SQL injection attacks
--
-- Supabase Advisor Issue: function_search_path_mutable
-- Severity: WARN
-- Impact: Security vulnerability - functions could access malicious objects in other schemas
--
-- Functions fixed:
-- 1. get_collection_statistics
-- 2. get_fee_summary
-- 3. get_fees_needing_reminders

-- ============================================================================
-- 1. Fix get_collection_statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_collection_statistics(p_tenant_id uuid)
RETURNS TABLE(
  total_expected numeric,
  total_received numeric,
  total_pending numeric,
  collection_rate numeric,
  clients_sent integer,
  clients_paid integer,
  clients_pending integer,
  alerts_unopened integer,
  alerts_no_selection integer,
  alerts_abandoned integer,
  alerts_disputes integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

COMMENT ON FUNCTION public.get_collection_statistics IS
'Returns collection statistics for a tenant. SECURITY DEFINER with explicit search_path to prevent SQL injection.';

-- ============================================================================
-- 2. Fix get_fee_summary
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_fee_summary(p_tenant_id uuid)
RETURNS TABLE(
  total_fees bigint,
  total_draft bigint,
  total_sent bigint,
  total_paid bigint,
  total_overdue bigint,
  total_cancelled bigint,
  total_amount numeric,
  paid_amount numeric,
  pending_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_fees,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT AS total_draft,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT AS total_sent,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT AS total_paid,
    COUNT(*) FILTER (WHERE status = 'overdue')::BIGINT AS total_overdue,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS total_cancelled,
    COALESCE(SUM(final_amount), 0)::NUMERIC AS total_amount,
    COALESCE(SUM(final_amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC AS paid_amount,
    COALESCE(SUM(final_amount) FILTER (WHERE status IN ('sent', 'overdue')), 0)::NUMERIC AS pending_amount
  FROM fee_calculations
  WHERE tenant_id = p_tenant_id;
END;
$function$;

COMMENT ON FUNCTION public.get_fee_summary IS
'Returns fee summary statistics for a tenant. SECURITY DEFINER with explicit search_path to prevent SQL injection.';

-- ============================================================================
-- 3. Fix get_fees_needing_reminders
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_fees_needing_reminders(p_tenant_id uuid, p_rule_id uuid)
RETURNS TABLE(
  fee_calculation_id uuid,
  client_id uuid,
  client_email text,
  amount numeric,
  days_since_sent integer,
  opened boolean,
  payment_method_selected text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
$function$;

COMMENT ON FUNCTION public.get_fees_needing_reminders IS
'Returns fees that need reminders based on rule conditions. SECURITY DEFINER with explicit search_path to prevent SQL injection.';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all functions now have search_path:
--
-- SELECT
--   p.proname as function_name,
--   CASE
--     WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✓ HAS search_path'
--     ELSE '✗ MISSING search_path'
--   END as status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND prosecdef = true
--   AND p.proname IN ('get_collection_statistics', 'get_fee_summary', 'get_fees_needing_reminders')
-- ORDER BY p.proname;
