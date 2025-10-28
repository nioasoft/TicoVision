-- Migration: Setup pg_cron for automated reminder engine
-- Description: Configure daily and hourly cron jobs for collection system
-- Date: 2025-01-27

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres (required for scheduling)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule 1: Daily Collection Reminder Engine
-- Runs at 7:00 AM UTC (9:00 AM Israel winter time, 10:00 AM summer time)
SELECT cron.schedule(
  'daily-collection-reminders',
  '0 7 * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/collection-reminder-engine',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'pg_cron extension for scheduling collection reminder engine';

-- Schedule 2: Hourly Alert Monitor
-- Runs every hour to check for time-sensitive alerts
SELECT cron.schedule(
  'hourly-alert-monitor',
  '0 * * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/alert-monitor',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);

-- Schedule 3: Daily Summary Email (9:00 AM Israel time = 7:00 AM UTC)
-- Sends daily collection summary to Sigal
SELECT cron.schedule(
  'daily-summary-email',
  '0 7 * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/daily-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      ) AS request_id;
  $$
);

-- Schedule 4: Mark Overdue Fees (runs at 1:00 AM UTC = 3:00 AM Israel time)
-- Updates fee_calculations.status to 'overdue' for fees past due date
SELECT cron.schedule(
  'mark-overdue-fees',
  '0 1 * * *',
  $$
    UPDATE fee_calculations
    SET status = 'overdue'
    WHERE status IN ('sent', 'partial_paid')
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE
      AND status != 'paid';
  $$
);

-- View all scheduled jobs
-- Run this query to see all cron jobs:
-- SELECT * FROM cron.job;

-- View cron job execution history
-- Run this query to see recent executions:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- IMPORTANT: To unschedule a job (use in development only):
-- SELECT cron.unschedule('daily-collection-reminders');
-- SELECT cron.unschedule('hourly-alert-monitor');
-- SELECT cron.unschedule('daily-summary-email');
-- SELECT cron.unschedule('mark-overdue-fees');

-- Grant necessary permissions for cron jobs
GRANT EXECUTE ON FUNCTION cron.schedule(text, text, text) TO postgres;
GRANT EXECUTE ON FUNCTION cron.unschedule(text) TO postgres;

-- Add table comment
COMMENT ON SCHEMA cron IS 'pg_cron schema for automated collection system tasks';

-- Create a monitoring view for cron job status
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

COMMENT ON VIEW cron_job_monitoring IS 'Monitoring view for pg_cron jobs - shows current status and last execution details';

-- Grant select on monitoring view
GRANT SELECT ON cron_job_monitoring TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ pg_cron setup completed successfully';
  RAISE NOTICE '📋 Scheduled jobs:';
  RAISE NOTICE '   1. daily-collection-reminders (7:00 AM UTC)';
  RAISE NOTICE '   2. hourly-alert-monitor (Every hour)';
  RAISE NOTICE '   3. daily-summary-email (7:00 AM UTC)';
  RAISE NOTICE '   4. mark-overdue-fees (1:00 AM UTC)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 To view job status, run:';
  RAISE NOTICE '   SELECT * FROM cron_job_monitoring;';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 To unschedule a job (development only):';
  RAISE NOTICE '   SELECT cron.unschedule(''job-name'');';
END $$;
