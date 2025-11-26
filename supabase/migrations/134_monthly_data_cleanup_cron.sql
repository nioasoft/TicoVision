-- Migration 134: Monthly Data Cleanup Cron Job
-- Description: Automated cleanup of monthly data older than 14 months
-- Date: 2025-11-26
--
-- Requirements:
-- - pg_cron job runs monthly (1st of each month at 2:00 AM UTC)
-- - Deletes data from client_monthly_reports older than 14 months
-- - Deletes data from foreign_worker_monthly_data older than 14 months
-- - Logs cleanup results

-- ==============================================
-- CLEANUP FUNCTION
-- ==============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_monthly_data()
RETURNS TABLE (
  deleted_client_reports INTEGER,
  deleted_worker_data INTEGER,
  cutoff_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cutoff_date DATE;
  v_deleted_client_reports INTEGER;
  v_deleted_worker_data INTEGER;
BEGIN
  -- Calculate cutoff: 14 months ago from the first of current month
  v_cutoff_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '14 months';

  -- Delete old client monthly reports
  DELETE FROM client_monthly_reports
  WHERE month_date < v_cutoff_date;
  GET DIAGNOSTICS v_deleted_client_reports = ROW_COUNT;

  -- Delete old worker monthly data
  DELETE FROM foreign_worker_monthly_data
  WHERE month_date < v_cutoff_date;
  GET DIAGNOSTICS v_deleted_worker_data = ROW_COUNT;

  -- Log the cleanup (visible in Supabase logs)
  IF v_deleted_client_reports > 0 OR v_deleted_worker_data > 0 THEN
    RAISE NOTICE 'Monthly data cleanup completed: deleted % client reports and % worker data records older than %',
      v_deleted_client_reports, v_deleted_worker_data, v_cutoff_date;
  ELSE
    RAISE NOTICE 'Monthly data cleanup: no old records to delete (cutoff: %)', v_cutoff_date;
  END IF;

  -- Return results
  RETURN QUERY SELECT v_deleted_client_reports, v_deleted_worker_data, v_cutoff_date;
END;
$$;

COMMENT ON FUNCTION cleanup_old_monthly_data IS 'Removes monthly data older than 14 months (rolling window)';

-- ==============================================
-- MANUAL CLEANUP FUNCTION (for specific client)
-- ==============================================

CREATE OR REPLACE FUNCTION public.cleanup_client_monthly_data(
  p_client_id UUID,
  p_before_date DATE
)
RETURNS TABLE (
  deleted_client_reports INTEGER,
  deleted_worker_data INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_deleted_client_reports INTEGER;
  v_deleted_worker_data INTEGER;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  -- Delete client monthly reports
  DELETE FROM client_monthly_reports
  WHERE tenant_id = v_tenant_id
    AND client_id = p_client_id
    AND month_date < p_before_date;
  GET DIAGNOSTICS v_deleted_client_reports = ROW_COUNT;

  -- Delete worker monthly data
  DELETE FROM foreign_worker_monthly_data
  WHERE tenant_id = v_tenant_id
    AND client_id = p_client_id
    AND month_date < p_before_date;
  GET DIAGNOSTICS v_deleted_worker_data = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_client_reports, v_deleted_worker_data;
END;
$$;

COMMENT ON FUNCTION cleanup_client_monthly_data IS 'Manually clean up monthly data for a specific client';

-- ==============================================
-- COMPREHENSIVE DELETION PREVIEW
-- ==============================================

CREATE OR REPLACE FUNCTION public.get_comprehensive_deletion_preview(
  p_client_id UUID,
  p_before_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  SELECT jsonb_build_object(
    'before_date', p_before_date,
    'client_reports', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'report_type', report_type,
        'month_date', month_date,
        'turnover_amount', turnover_amount,
        'employee_count', employee_count
      ) ORDER BY month_date), '[]'::jsonb)
      FROM client_monthly_reports
      WHERE tenant_id = v_tenant_id
        AND client_id = p_client_id
        AND month_date < p_before_date
    ),
    'worker_data', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'worker_id', fwmd.worker_id,
        'worker_name', fw.full_name,
        'passport_number', fw.passport_number,
        'month_date', fwmd.month_date,
        'salary', fwmd.salary,
        'supplement', fwmd.supplement
      ) ORDER BY fwmd.month_date, fw.full_name), '[]'::jsonb)
      FROM foreign_worker_monthly_data fwmd
      JOIN foreign_workers fw ON fwmd.worker_id = fw.id
      WHERE fwmd.tenant_id = v_tenant_id
        AND fwmd.client_id = p_client_id
        AND fwmd.month_date < p_before_date
    ),
    'summary', jsonb_build_object(
      'total_client_reports', (
        SELECT COUNT(*)
        FROM client_monthly_reports
        WHERE tenant_id = v_tenant_id
          AND client_id = p_client_id
          AND month_date < p_before_date
      ),
      'total_worker_records', (
        SELECT COUNT(*)
        FROM foreign_worker_monthly_data
        WHERE tenant_id = v_tenant_id
          AND client_id = p_client_id
          AND month_date < p_before_date
      ),
      'total_salary_sum', (
        SELECT COALESCE(SUM(salary + supplement), 0)
        FROM foreign_worker_monthly_data
        WHERE tenant_id = v_tenant_id
          AND client_id = p_client_id
          AND month_date < p_before_date
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_comprehensive_deletion_preview IS 'Get comprehensive preview of all data to be deleted (for confirmation dialog)';

-- ==============================================
-- SCHEDULE PG_CRON JOB
-- ==============================================

-- Schedule monthly cleanup (runs on 1st of each month at 2:00 AM UTC)
-- This is 4:00 AM Israel winter time, 5:00 AM summer time
SELECT cron.schedule(
  'monthly-data-cleanup',
  '0 2 1 * *',  -- At 02:00 on day 1 of every month
  $$SELECT * FROM cleanup_old_monthly_data();$$
);

-- ==============================================
-- MONITORING VIEW
-- ==============================================

-- Add monthly data stats to monitoring view
CREATE OR REPLACE VIEW monthly_data_stats AS
SELECT
  tenant_id,
  'client_monthly_reports' AS table_name,
  COUNT(*) AS total_records,
  MIN(month_date) AS oldest_month,
  MAX(month_date) AS newest_month,
  COUNT(DISTINCT client_id) AS unique_clients
FROM client_monthly_reports
GROUP BY tenant_id

UNION ALL

SELECT
  tenant_id,
  'foreign_worker_monthly_data' AS table_name,
  COUNT(*) AS total_records,
  MIN(month_date) AS oldest_month,
  MAX(month_date) AS newest_month,
  COUNT(DISTINCT client_id) AS unique_clients
FROM foreign_worker_monthly_data
GROUP BY tenant_id;

COMMENT ON VIEW monthly_data_stats IS 'Statistics for monthly data tables - useful for monitoring';

-- RLS for the view
ALTER VIEW monthly_data_stats SET (security_invoker = true);

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 134: Monthly data cleanup cron job created';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Cron Job: monthly-data-cleanup';
  RAISE NOTICE 'Schedule: 1st of each month at 02:00 UTC';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - cleanup_old_monthly_data() - Global cleanup (14 months)';
  RAISE NOTICE '  - cleanup_client_monthly_data(client_id, before_date) - Per-client cleanup';
  RAISE NOTICE '  - get_comprehensive_deletion_preview(client_id, before_date) - Preview for UI';
  RAISE NOTICE '';
  RAISE NOTICE 'View: monthly_data_stats - Monitoring statistics';
  RAISE NOTICE '';
  RAISE NOTICE 'To view cron job status:';
  RAISE NOTICE '  SELECT * FROM cron_job_monitoring WHERE jobname = ''monthly-data-cleanup'';';
END $$;
