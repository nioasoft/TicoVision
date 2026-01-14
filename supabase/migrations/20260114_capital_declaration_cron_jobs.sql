-- Capital Declaration Reminder Cron Jobs
-- Migration: 20260114_capital_declaration_cron_jobs.sql
-- Purpose: Schedule automated reminder jobs via pg_cron

-- ============================================================================
-- Schedule 1: Daily Capital Declaration Client Reminders
-- Runs at 7:00 AM UTC (9:00 AM Israel winter time, 10:00 AM summer time)
-- Sends automatic reminders to clients every 9 days (configurable)
-- ============================================================================
SELECT cron.schedule(
    'capital-declaration-client-reminders',
    '0 7 * * *',
    $$
        SELECT
            net.http_post(
                url := 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/capital-declaration-reminder-engine',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                ),
                body := '{}'::jsonb
            ) AS request_id;
    $$
);

COMMENT ON COLUMN cron.job.jobname IS 'capital-declaration-client-reminders: Daily automatic reminders to clients (9-day cycle)';

-- ============================================================================
-- Schedule 2: Weekly Capital Declaration Report
-- Runs at 7:00 AM UTC on Sundays (9:00 AM Israel)
-- Sends summary report to manager and triggers banner
-- ============================================================================
SELECT cron.schedule(
    'capital-declaration-weekly-report',
    '0 7 * * 0',
    $$
        SELECT
            net.http_post(
                url := 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/capital-declaration-weekly-report',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
                ),
                body := '{}'::jsonb
            ) AS request_id;
    $$
);

COMMENT ON COLUMN cron.job.jobname IS 'capital-declaration-weekly-report: Sunday summary to manager with banner trigger';

-- ============================================================================
-- Update monitoring view to include new jobs
-- ============================================================================
CREATE OR REPLACE VIEW cron_job_monitoring AS
SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.command,
    j.active,
    jrd.start_time as last_run_start,
    jrd.end_time as last_run_end,
    jrd.status as last_run_status,
    jrd.return_message as last_run_message,
    CASE
        WHEN jrd.end_time IS NULL AND jrd.start_time IS NOT NULL THEN 'Running'
        WHEN jrd.status = 'succeeded' THEN 'Success'
        WHEN jrd.status = 'failed' THEN 'Failed'
        ELSE 'Never Run'
    END as current_status
FROM cron.job j
LEFT JOIN LATERAL (
    SELECT *
    FROM cron.job_run_details
    WHERE jobid = j.jobid
    ORDER BY start_time DESC
    LIMIT 1
) jrd ON true
ORDER BY j.jobname;

-- ============================================================================
-- Success message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Capital Declaration Cron Jobs - Setup Complete';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'New scheduled jobs:';
    RAISE NOTICE '  1. capital-declaration-client-reminders';
    RAISE NOTICE '     Schedule: 0 7 * * * (Daily at 7:00 AM UTC)';
    RAISE NOTICE '     Purpose: Send automatic reminders to clients';
    RAISE NOTICE '';
    RAISE NOTICE '  2. capital-declaration-weekly-report';
    RAISE NOTICE '     Schedule: 0 7 * * 0 (Sundays at 7:00 AM UTC)';
    RAISE NOTICE '     Purpose: Send weekly summary + trigger banner';
    RAISE NOTICE '';
    RAISE NOTICE 'To view all scheduled jobs:';
    RAISE NOTICE '  SELECT * FROM cron_job_monitoring;';
    RAISE NOTICE '';
    RAISE NOTICE 'To unschedule (if needed):';
    RAISE NOTICE '  SELECT cron.unschedule(''capital-declaration-client-reminders'');';
    RAISE NOTICE '  SELECT cron.unschedule(''capital-declaration-weekly-report'');';
    RAISE NOTICE '=================================================';
END $$;
