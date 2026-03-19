/**
 * Migration: Shaagat HaAri — Backup Schema
 * Creates a _backup schema with snapshot copies of all 10 shaagat tables.
 *
 * Strategy: Separate _backup schema + pg_cron daily job (or manual invocation).
 * Backups are append-only; each row carries a backed_up_at timestamp.
 * Suitable for point-in-time audit recovery without needing full pg_dump.
 *
 * Tables backed up:
 *   1. shaagat_feasibility_checks
 *   2. shaagat_eligibility_checks
 *   3. shaagat_detailed_calculations
 *   4. shaagat_tax_submissions
 *   5. shaagat_tax_letters
 *   6. shaagat_additional_periods
 *   7. shaagat_bank_details
 *   8. shaagat_accounting_submissions
 *   9. shaagat_email_logs
 *  10. shaagat_status_history
 */

-- ─────────────────────────────────────────────────────────────────────────────
-- Backup schema
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS _backup;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. shaagat_feasibility_checks backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_feasibility_checks AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_feasibility_checks
  WHERE FALSE; -- structure only, no data at migration time

ALTER TABLE _backup.shaagat_feasibility_checks
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. shaagat_eligibility_checks backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_eligibility_checks AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_eligibility_checks
  WHERE FALSE;

ALTER TABLE _backup.shaagat_eligibility_checks
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. shaagat_detailed_calculations backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_detailed_calculations AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_detailed_calculations
  WHERE FALSE;

ALTER TABLE _backup.shaagat_detailed_calculations
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. shaagat_tax_submissions backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_tax_submissions AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_tax_submissions
  WHERE FALSE;

ALTER TABLE _backup.shaagat_tax_submissions
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. shaagat_tax_letters backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_tax_letters AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_tax_letters
  WHERE FALSE;

ALTER TABLE _backup.shaagat_tax_letters
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. shaagat_additional_periods backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_additional_periods AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_additional_periods
  WHERE FALSE;

ALTER TABLE _backup.shaagat_additional_periods
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. shaagat_bank_details backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_bank_details AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_bank_details
  WHERE FALSE;

ALTER TABLE _backup.shaagat_bank_details
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. shaagat_accounting_submissions backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_accounting_submissions AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_accounting_submissions
  WHERE FALSE;

ALTER TABLE _backup.shaagat_accounting_submissions
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. shaagat_email_logs backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_email_logs AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_email_logs
  WHERE FALSE;

ALTER TABLE _backup.shaagat_email_logs
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. shaagat_status_history backup
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _backup.shaagat_status_history AS
  SELECT *, NOW()::timestamptz AS backed_up_at
  FROM public.shaagat_status_history
  WHERE FALSE;

ALTER TABLE _backup.shaagat_status_history
  ADD COLUMN IF NOT EXISTS backed_up_at timestamptz NOT NULL DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backup function: snapshot all 10 tables at once
-- Call manually or via pg_cron: SELECT public.backup_shaagat_tables();
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.backup_shaagat_tables()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ts timestamptz := NOW();
  v_counts jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  INSERT INTO _backup.shaagat_feasibility_checks
    SELECT *, v_ts FROM public.shaagat_feasibility_checks;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_feasibility_checks', v_count);

  INSERT INTO _backup.shaagat_eligibility_checks
    SELECT *, v_ts FROM public.shaagat_eligibility_checks;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_eligibility_checks', v_count);

  INSERT INTO _backup.shaagat_detailed_calculations
    SELECT *, v_ts FROM public.shaagat_detailed_calculations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_detailed_calculations', v_count);

  INSERT INTO _backup.shaagat_tax_submissions
    SELECT *, v_ts FROM public.shaagat_tax_submissions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_tax_submissions', v_count);

  INSERT INTO _backup.shaagat_tax_letters
    SELECT *, v_ts FROM public.shaagat_tax_letters;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_tax_letters', v_count);

  INSERT INTO _backup.shaagat_additional_periods
    SELECT *, v_ts FROM public.shaagat_additional_periods;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_additional_periods', v_count);

  INSERT INTO _backup.shaagat_bank_details
    SELECT *, v_ts FROM public.shaagat_bank_details;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_bank_details', v_count);

  INSERT INTO _backup.shaagat_accounting_submissions
    SELECT *, v_ts FROM public.shaagat_accounting_submissions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_accounting_submissions', v_count);

  INSERT INTO _backup.shaagat_email_logs
    SELECT *, v_ts FROM public.shaagat_email_logs;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_email_logs', v_count);

  INSERT INTO _backup.shaagat_status_history
    SELECT *, v_ts FROM public.shaagat_status_history;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('shaagat_status_history', v_count);

  RETURN jsonb_build_object(
    'backed_up_at', v_ts,
    'row_counts', v_counts
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron: daily backup at 02:00 UTC (05:00 Israel time)
-- Requires pg_cron extension enabled in Supabase dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'shaagat-daily-backup',
      '0 2 * * *',
      'SELECT public.backup_shaagat_tables()'
    );
    RAISE NOTICE 'pg_cron job "shaagat-daily-backup" scheduled (02:00 UTC daily)';
  ELSE
    RAISE NOTICE 'pg_cron not available. Run SELECT public.backup_shaagat_tables() manually or schedule via external cron.';
  END IF;
END
$$;

COMMENT ON FUNCTION public.backup_shaagat_tables() IS
  'Snapshots all 10 shaagat_* tables into _backup schema. '
  'Safe to run multiple times (append-only). '
  'Scheduled daily at 02:00 UTC via pg_cron if available.';
