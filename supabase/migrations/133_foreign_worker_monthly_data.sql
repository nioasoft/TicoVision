-- Migration 133: Foreign Worker Monthly Data Table
-- Description: Store monthly salary data for Tab 5 (Salary Report) - per worker per month
-- Date: 2025-11-26
--
-- Requirements:
-- - Each foreign worker has monthly salary + supplement records
-- - Data persists between sessions
-- - Rolling 14-month window (auto-cleanup of older data)
-- - Links to foreign_workers table (Migration 130)

-- ==============================================
-- TABLE: foreign_worker_monthly_data
-- ==============================================

CREATE TABLE foreign_worker_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES foreign_workers(id) ON DELETE CASCADE,

  -- Month (stored as first day of month)
  month_date DATE NOT NULL,

  -- Salary data
  salary INTEGER NOT NULL DEFAULT 0,       -- Base salary in ILS
  supplement INTEGER NOT NULL DEFAULT 0,   -- "תוספת" (bonus/supplement) in ILS

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- One record per worker per month
  CONSTRAINT unique_worker_month_data UNIQUE(tenant_id, client_id, worker_id, month_date),

  -- Ensure month_date is first day of month
  CONSTRAINT fwmd_month_date_first_day CHECK (EXTRACT(DAY FROM month_date) = 1),

  -- Validation: non-negative values
  CONSTRAINT positive_salary CHECK (salary >= 0),
  CONSTRAINT positive_supplement CHECK (supplement >= 0)
);

-- Table comments
COMMENT ON TABLE foreign_worker_monthly_data IS 'Monthly salary data for foreign workers - per worker per month';
COMMENT ON COLUMN foreign_worker_monthly_data.worker_id IS 'FK to foreign_workers table';
COMMENT ON COLUMN foreign_worker_monthly_data.month_date IS 'First day of month (e.g., 2025-01-01)';
COMMENT ON COLUMN foreign_worker_monthly_data.salary IS 'Base monthly salary in ILS';
COMMENT ON COLUMN foreign_worker_monthly_data.supplement IS 'Monthly supplement/bonus in ILS (תוספת)';

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_fwmd_tenant ON foreign_worker_monthly_data(tenant_id);
CREATE INDEX idx_fwmd_client ON foreign_worker_monthly_data(client_id);
CREATE INDEX idx_fwmd_worker ON foreign_worker_monthly_data(worker_id);
CREATE INDEX idx_fwmd_month ON foreign_worker_monthly_data(tenant_id, month_date);
CREATE INDEX idx_fwmd_client_month ON foreign_worker_monthly_data(client_id, month_date);
CREATE INDEX idx_fwmd_worker_month ON foreign_worker_monthly_data(worker_id, month_date);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE foreign_worker_monthly_data ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see data in their tenant
CREATE POLICY fwmd_tenant_isolation ON foreign_worker_monthly_data
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  );

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_foreign_worker_monthly_data_updated_at
  BEFORE UPDATE ON foreign_worker_monthly_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Get all monthly data for a client (optionally filtered by worker)
CREATE OR REPLACE FUNCTION public.get_worker_monthly_data(
  p_client_id UUID,
  p_worker_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 14
)
RETURNS TABLE (
  id UUID,
  worker_id UUID,
  worker_name TEXT,
  passport_number TEXT,
  nationality TEXT,
  month_date DATE,
  salary INTEGER,
  supplement INTEGER,
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
    fwmd.id,
    fwmd.worker_id,
    fw.full_name AS worker_name,
    fw.passport_number,
    fw.nationality,
    fwmd.month_date,
    fwmd.salary,
    fwmd.supplement,
    fwmd.created_at,
    fwmd.updated_at
  FROM foreign_worker_monthly_data fwmd
  JOIN foreign_workers fw ON fwmd.worker_id = fw.id
  WHERE fwmd.client_id = p_client_id
    AND fwmd.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    AND (p_worker_id IS NULL OR fwmd.worker_id = p_worker_id)
  ORDER BY fw.full_name, fwmd.month_date DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_worker_monthly_data IS 'Get monthly salary data for a client, optionally filtered by worker';

-- Upsert a single monthly data record
CREATE OR REPLACE FUNCTION public.upsert_worker_monthly_data(
  p_client_id UUID,
  p_worker_id UUID,
  p_month_date DATE,
  p_salary INTEGER DEFAULT 0,
  p_supplement INTEGER DEFAULT 0
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

  -- Upsert the data
  INSERT INTO foreign_worker_monthly_data (
    tenant_id, client_id, worker_id, month_date,
    salary, supplement, created_by
  )
  VALUES (
    v_tenant_id, p_client_id, p_worker_id, p_month_date,
    p_salary, p_supplement, v_user_id
  )
  ON CONFLICT (tenant_id, client_id, worker_id, month_date)
  DO UPDATE SET
    salary = EXCLUDED.salary,
    supplement = EXCLUDED.supplement,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_worker_monthly_data IS 'Create or update monthly salary data for a worker';

-- Bulk upsert for multiple months (for generating 12 months at once)
CREATE OR REPLACE FUNCTION public.bulk_upsert_worker_monthly_data(
  p_client_id UUID,
  p_worker_id UUID,
  p_records JSONB  -- Array of {month_date, salary, supplement}
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
    INSERT INTO foreign_worker_monthly_data (
      tenant_id, client_id, worker_id, month_date,
      salary, supplement, created_by
    )
    VALUES (
      v_tenant_id,
      p_client_id,
      p_worker_id,
      DATE_TRUNC('month', (v_record->>'month_date')::DATE)::DATE,
      COALESCE((v_record->>'salary')::INTEGER, 0),
      COALESCE((v_record->>'supplement')::INTEGER, 0),
      v_user_id
    )
    ON CONFLICT (tenant_id, client_id, worker_id, month_date)
    DO UPDATE SET
      salary = EXCLUDED.salary,
      supplement = EXCLUDED.supplement,
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION bulk_upsert_worker_monthly_data IS 'Bulk create/update monthly salary data from JSON array';

-- Delete old data for a client (used when auto-deleting oldest months)
CREATE OR REPLACE FUNCTION public.delete_old_worker_monthly_data(
  p_client_id UUID,
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

  DELETE FROM foreign_worker_monthly_data
  WHERE tenant_id = v_tenant_id
    AND client_id = p_client_id
    AND month_date < p_before_date;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION delete_old_worker_monthly_data IS 'Delete worker monthly data before a given date';

-- Get deletion preview for salary data
CREATE OR REPLACE FUNCTION public.get_salary_deletion_preview(
  p_client_id UUID,
  p_before_date DATE
)
RETURNS TABLE (
  worker_id UUID,
  worker_name TEXT,
  passport_number TEXT,
  month_date DATE,
  salary INTEGER,
  supplement INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fwmd.worker_id,
    fw.full_name AS worker_name,
    fw.passport_number,
    fwmd.month_date,
    fwmd.salary,
    fwmd.supplement
  FROM foreign_worker_monthly_data fwmd
  JOIN foreign_workers fw ON fwmd.worker_id = fw.id
  WHERE fwmd.client_id = p_client_id
    AND fwmd.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    AND fwmd.month_date < p_before_date
  ORDER BY fwmd.month_date ASC, fw.full_name;
END;
$$;

COMMENT ON FUNCTION get_salary_deletion_preview IS 'Preview salary data that will be deleted (for confirmation dialog)';

-- Get summary statistics for a worker across all months
CREATE OR REPLACE FUNCTION public.get_worker_salary_summary(
  p_client_id UUID,
  p_worker_id UUID
)
RETURNS TABLE (
  total_months INTEGER,
  total_salary BIGINT,
  total_supplement BIGINT,
  avg_salary NUMERIC,
  avg_supplement NUMERIC,
  min_month DATE,
  max_month DATE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_months,
    SUM(fwmd.salary)::BIGINT AS total_salary,
    SUM(fwmd.supplement)::BIGINT AS total_supplement,
    ROUND(AVG(fwmd.salary), 2) AS avg_salary,
    ROUND(AVG(fwmd.supplement), 2) AS avg_supplement,
    MIN(fwmd.month_date) AS min_month,
    MAX(fwmd.month_date) AS max_month
  FROM foreign_worker_monthly_data fwmd
  WHERE fwmd.client_id = p_client_id
    AND fwmd.worker_id = p_worker_id
    AND fwmd.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
END;
$$;

COMMENT ON FUNCTION get_worker_salary_summary IS 'Get salary summary statistics for a worker';

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 133: foreign_worker_monthly_data table created';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Table: foreign_worker_monthly_data';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - get_worker_monthly_data(client_id, worker_id, limit)';
  RAISE NOTICE '  - upsert_worker_monthly_data(client_id, worker_id, month, salary, supplement)';
  RAISE NOTICE '  - bulk_upsert_worker_monthly_data(client_id, worker_id, records)';
  RAISE NOTICE '  - delete_old_worker_monthly_data(client_id, before_date)';
  RAISE NOTICE '  - get_salary_deletion_preview(client_id, before_date)';
  RAISE NOTICE '  - get_worker_salary_summary(client_id, worker_id)';
END $$;
