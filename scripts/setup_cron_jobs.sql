-- Setup Supabase Cron Jobs for Collection System
-- Run this in SQL Editor: https://app.supabase.com/project/zbqfeebrhberddvfkuhe/sql/new

-- Enable http extension for calling Edge Functions
CREATE EXTENSION IF NOT EXISTS http;

-- Schedule 1: Daily Collection Reminder Engine
-- Runs at 7:00 AM UTC (9:00 AM Israel winter / 10:00 AM summer)
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

-- Schedule 2: Hourly Alert Monitor
-- Runs every hour
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

-- Verify cron jobs were created
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname IN ('daily-collection-reminders', 'hourly-alert-monitor')
ORDER BY jobname;
