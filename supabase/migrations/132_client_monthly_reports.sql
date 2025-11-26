-- Migration 132: Client Monthly Reports Table
-- Description: Store monthly data for Tab 1 (Accountant Turnover) and Tab 2 (Israeli Workers)
-- Date: 2025-11-26
--
-- Requirements:
-- - Tab 1: Accountant Turnover - monthly business amounts (DECIMAL)
-- - Tab 2: Israeli Workers - monthly employee counts (INTEGER)
-- - Data persists between sessions
-- - Rolling 14-month window (auto-cleanup of older data)

-- ==============================================
-- ENUM: client_report_type
-- ==============================================

DO $$ BEGIN
  CREATE TYPE client_report_type AS ENUM (
    'accountant_turnover',   -- Tab 1: Monthly business turnover
    'israeli_workers'        -- Tab 2: Monthly Israeli employee count
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE client_report_type IS 'Report type for client monthly reports';

-- ==============================================
-- TABLE: client_monthly_reports
-- ==============================================

CREATE TABLE client_monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Report type discriminator
  report_type client_report_type NOT NULL,

  -- Month (stored as first day of month)
  month_date DATE NOT NULL,

  -- Data fields (use appropriate one based on report_type)
  turnover_amount DECIMAL(12,2),  -- For accountant_turnover (ILS)
  employee_count INTEGER,          -- For israeli_workers

  -- Optional notes
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- One record per client per report type per month
  CONSTRAINT unique_client_report_month UNIQUE(tenant_id, client_id, report_type, month_date),

  -- Ensure month_date is first day of month
  CONSTRAINT month_date_first_day CHECK (EXTRACT(DAY FROM month_date) = 1),

  -- Validation: ensure correct field is populated based on type
  CONSTRAINT valid_turnover_data CHECK (
    report_type != 'accountant_turnover' OR turnover_amount IS NOT NULL
  ),
  CONSTRAINT valid_workers_data CHECK (
    report_type != 'israeli_workers' OR employee_count IS NOT NULL
  ),

  -- Validation: non-negative values
  CONSTRAINT positive_turnover CHECK (turnover_amount IS NULL OR turnover_amount >= 0),
  CONSTRAINT positive_employees CHECK (employee_count IS NULL OR employee_count >= 0)
);

-- Table comments
COMMENT ON TABLE client_monthly_reports IS 'Monthly data for accountant turnover and Israeli workers tabs';
COMMENT ON COLUMN client_monthly_reports.report_type IS 'accountant_turnover (Tab 1) or israeli_workers (Tab 2)';
COMMENT ON COLUMN client_monthly_reports.month_date IS 'First day of month (e.g., 2025-01-01)';
COMMENT ON COLUMN client_monthly_reports.turnover_amount IS 'Monthly turnover in ILS (for accountant_turnover type)';
COMMENT ON COLUMN client_monthly_reports.employee_count IS 'Number of Israeli employees (for israeli_workers type)';

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_cmr_tenant ON client_monthly_reports(tenant_id);
CREATE INDEX idx_cmr_client ON client_monthly_reports(client_id);
CREATE INDEX idx_cmr_type_month ON client_monthly_reports(tenant_id, report_type, month_date);
CREATE INDEX idx_cmr_client_type ON client_monthly_reports(client_id, report_type);
CREATE INDEX idx_cmr_month_date ON client_monthly_reports(month_date);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE client_monthly_reports ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see reports in their tenant
CREATE POLICY cmr_tenant_isolation ON client_monthly_reports
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  );

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_client_monthly_reports_updated_at
  BEFORE UPDATE ON client_monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Get all reports for a client by type (sorted by month descending)
CREATE OR REPLACE FUNCTION public.get_client_monthly_reports(
  p_client_id UUID,
  p_report_type client_report_type,
  p_limit INTEGER DEFAULT 14
)
RETURNS TABLE (
  id UUID,
  month_date DATE,
  turnover_amount DECIMAL(12,2),
  employee_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cmr.id,
    cmr.month_date,
    cmr.turnover_amount,
    cmr.employee_count,
    cmr.notes,
    cmr.created_at,
    cmr.updated_at
  FROM client_monthly_reports cmr
  WHERE cmr.client_id = p_client_id
    AND cmr.report_type = p_report_type
    AND cmr.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  ORDER BY cmr.month_date DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_client_monthly_reports IS 'Get monthly reports for a client by type';

-- Upsert a single monthly report
CREATE OR REPLACE FUNCTION public.upsert_client_monthly_report(
  p_client_id UUID,
  p_report_type client_report_type,
  p_month_date DATE,
  p_turnover_amount DECIMAL(12,2) DEFAULT NULL,
  p_employee_count INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_id UUID;
BEGIN
  -- Get tenant and user from JWT
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  -- Normalize date to first day of month
  p_month_date := DATE_TRUNC('month', p_month_date)::DATE;

  -- Upsert the report
  INSERT INTO client_monthly_reports (
    tenant_id, client_id, report_type, month_date,
    turnover_amount, employee_count, notes, created_by
  )
  VALUES (
    v_tenant_id, p_client_id, p_report_type, p_month_date,
    p_turnover_amount, p_employee_count, p_notes, v_user_id
  )
  ON CONFLICT (tenant_id, client_id, report_type, month_date)
  DO UPDATE SET
    turnover_amount = COALESCE(EXCLUDED.turnover_amount, client_monthly_reports.turnover_amount),
    employee_count = COALESCE(EXCLUDED.employee_count, client_monthly_reports.employee_count),
    notes = COALESCE(EXCLUDED.notes, client_monthly_reports.notes),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_client_monthly_report IS 'Create or update a monthly report record';

-- Bulk upsert for multiple months (for generating 12 months at once)
CREATE OR REPLACE FUNCTION public.bulk_upsert_client_monthly_reports(
  p_client_id UUID,
  p_report_type client_report_type,
  p_records JSONB  -- Array of {month_date, turnover_amount?, employee_count?}
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_record JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Get tenant and user from JWT
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  -- Process each record
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO client_monthly_reports (
      tenant_id, client_id, report_type, month_date,
      turnover_amount, employee_count, created_by
    )
    VALUES (
      v_tenant_id,
      p_client_id,
      p_report_type,
      DATE_TRUNC('month', (v_record->>'month_date')::DATE)::DATE,
      (v_record->>'turnover_amount')::DECIMAL(12,2),
      (v_record->>'employee_count')::INTEGER,
      v_user_id
    )
    ON CONFLICT (tenant_id, client_id, report_type, month_date)
    DO UPDATE SET
      turnover_amount = COALESCE(EXCLUDED.turnover_amount, client_monthly_reports.turnover_amount),
      employee_count = COALESCE(EXCLUDED.employee_count, client_monthly_reports.employee_count),
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION bulk_upsert_client_monthly_reports IS 'Bulk create/update monthly reports from JSON array';

-- Delete old reports for a client (used when auto-deleting oldest months)
CREATE OR REPLACE FUNCTION public.delete_old_client_monthly_reports(
  p_client_id UUID,
  p_report_type client_report_type,
  p_before_date DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_count INTEGER;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  DELETE FROM client_monthly_reports
  WHERE tenant_id = v_tenant_id
    AND client_id = p_client_id
    AND report_type = p_report_type
    AND month_date < p_before_date;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION delete_old_client_monthly_reports IS 'Delete monthly reports before a given date';

-- Get deletion preview (data that will be lost)
CREATE OR REPLACE FUNCTION public.get_deletion_preview(
  p_client_id UUID,
  p_before_date DATE
)
RETURNS TABLE (
  report_type TEXT,
  month_date DATE,
  turnover_amount DECIMAL(12,2),
  employee_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cmr.report_type::TEXT,
    cmr.month_date,
    cmr.turnover_amount,
    cmr.employee_count
  FROM client_monthly_reports cmr
  WHERE cmr.client_id = p_client_id
    AND cmr.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    AND cmr.month_date < p_before_date
  ORDER BY cmr.month_date ASC;
END;
$$;

COMMENT ON FUNCTION get_deletion_preview IS 'Preview data that will be deleted (for confirmation dialog)';

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 132: client_monthly_reports table created';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Table: client_monthly_reports';
  RAISE NOTICE 'Enum: client_report_type (accountant_turnover, israeli_workers)';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - get_client_monthly_reports(client_id, type, limit)';
  RAISE NOTICE '  - upsert_client_monthly_report(client_id, type, month, ...)';
  RAISE NOTICE '  - bulk_upsert_client_monthly_reports(client_id, type, records)';
  RAISE NOTICE '  - delete_old_client_monthly_reports(client_id, type, before_date)';
  RAISE NOTICE '  - get_deletion_preview(client_id, before_date)';
END $$;
