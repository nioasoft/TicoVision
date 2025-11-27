-- Migration 136: Client Branches for Foreign Workers Module
-- Description: Add branch support to foreign workers data - allows same client to have multiple branches
-- Date: 2025-11-27
--
-- Use Case: Company "מן רה" has two branches with same tax_id but different foreign workers data
-- Each branch has its own workers, monthly data, and reports
-- Letters will show: "Company Name - Branch Name"

-- ==============================================
-- TABLE: client_branches
-- ==============================================

CREATE TABLE client_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Branch identification
  name TEXT NOT NULL,                    -- e.g., "סניף א", "סניף תל אביב", "ראשי"
  is_default BOOLEAN DEFAULT false,      -- Primary/default branch
  is_active BOOLEAN DEFAULT true,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Unique branch name per client
  CONSTRAINT unique_branch_name_per_client UNIQUE(tenant_id, client_id, name)
);

-- Only one default branch per client
CREATE UNIQUE INDEX idx_one_default_branch_per_client
  ON client_branches(tenant_id, client_id) WHERE (is_default = true);

-- Indexes
CREATE INDEX idx_client_branches_tenant ON client_branches(tenant_id);
CREATE INDEX idx_client_branches_client ON client_branches(client_id);
CREATE INDEX idx_client_branches_active ON client_branches(tenant_id, is_active) WHERE is_active = true;

-- Table comments
COMMENT ON TABLE client_branches IS 'Branches for clients - used only in foreign workers module';
COMMENT ON COLUMN client_branches.name IS 'Branch name - e.g., סניף א, סניף תל אביב';
COMMENT ON COLUMN client_branches.is_default IS 'Default branch for clients without multiple branches';

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE client_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_branches_tenant_isolation ON client_branches
  FOR ALL
  USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID);

-- ==============================================
-- TRIGGERS
-- ==============================================

CREATE TRIGGER update_client_branches_updated_at
  BEFORE UPDATE ON client_branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- STEP 1: Add nullable branch_id to existing tables
-- ==============================================

-- foreign_workers
ALTER TABLE foreign_workers
  ADD COLUMN branch_id UUID REFERENCES client_branches(id) ON DELETE CASCADE;
CREATE INDEX idx_foreign_workers_branch ON foreign_workers(branch_id);

-- foreign_worker_monthly_data
ALTER TABLE foreign_worker_monthly_data
  ADD COLUMN branch_id UUID REFERENCES client_branches(id) ON DELETE CASCADE;
CREATE INDEX idx_fwmd_branch ON foreign_worker_monthly_data(branch_id);

-- client_month_range
ALTER TABLE client_month_range
  ADD COLUMN branch_id UUID REFERENCES client_branches(id) ON DELETE CASCADE;
CREATE INDEX idx_client_month_range_branch ON client_month_range(branch_id);

-- client_monthly_reports
ALTER TABLE client_monthly_reports
  ADD COLUMN branch_id UUID REFERENCES client_branches(id) ON DELETE CASCADE;
CREATE INDEX idx_cmr_branch ON client_monthly_reports(branch_id);

-- ==============================================
-- STEP 2: Create default branches for clients with existing data
-- ==============================================

-- Create default branch for clients with foreign_workers data
INSERT INTO client_branches (tenant_id, client_id, name, is_default, created_by)
SELECT DISTINCT
  fw.tenant_id,
  fw.client_id,
  'ראשי',
  true,
  fw.created_by
FROM foreign_workers fw
WHERE NOT EXISTS (
  SELECT 1 FROM client_branches cb
  WHERE cb.tenant_id = fw.tenant_id AND cb.client_id = fw.client_id
)
ON CONFLICT DO NOTHING;

-- Create default branch for clients with client_month_range data (if not already created)
INSERT INTO client_branches (tenant_id, client_id, name, is_default)
SELECT DISTINCT
  cmr.tenant_id,
  cmr.client_id,
  'ראשי',
  true
FROM client_month_range cmr
WHERE NOT EXISTS (
  SELECT 1 FROM client_branches cb
  WHERE cb.tenant_id = cmr.tenant_id AND cb.client_id = cmr.client_id
)
ON CONFLICT DO NOTHING;

-- Create default branch for clients with client_monthly_reports data (if not already created)
INSERT INTO client_branches (tenant_id, client_id, name, is_default)
SELECT DISTINCT
  cmr.tenant_id,
  cmr.client_id,
  'ראשי',
  true
FROM client_monthly_reports cmr
WHERE NOT EXISTS (
  SELECT 1 FROM client_branches cb
  WHERE cb.tenant_id = cmr.tenant_id AND cb.client_id = cmr.client_id
)
ON CONFLICT DO NOTHING;

-- ==============================================
-- STEP 3: Link existing data to default branches
-- ==============================================

-- Update foreign_workers
UPDATE foreign_workers fw
SET branch_id = cb.id
FROM client_branches cb
WHERE fw.client_id = cb.client_id
  AND fw.tenant_id = cb.tenant_id
  AND cb.is_default = true
  AND fw.branch_id IS NULL;

-- Update foreign_worker_monthly_data
UPDATE foreign_worker_monthly_data fwmd
SET branch_id = cb.id
FROM client_branches cb
WHERE fwmd.client_id = cb.client_id
  AND fwmd.tenant_id = cb.tenant_id
  AND cb.is_default = true
  AND fwmd.branch_id IS NULL;

-- Update client_month_range
UPDATE client_month_range cmr
SET branch_id = cb.id
FROM client_branches cb
WHERE cmr.client_id = cb.client_id
  AND cmr.tenant_id = cb.tenant_id
  AND cb.is_default = true
  AND cmr.branch_id IS NULL;

-- Update client_monthly_reports
UPDATE client_monthly_reports cmr
SET branch_id = cb.id
FROM client_branches cb
WHERE cmr.client_id = cb.client_id
  AND cmr.tenant_id = cb.tenant_id
  AND cb.is_default = true
  AND cmr.branch_id IS NULL;

-- ==============================================
-- STEP 4: Make branch_id NOT NULL
-- ==============================================

ALTER TABLE foreign_workers ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE foreign_worker_monthly_data ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE client_month_range ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE client_monthly_reports ALTER COLUMN branch_id SET NOT NULL;

-- ==============================================
-- STEP 5: Drop old constraints and add new ones (branch-based)
-- ==============================================

-- client_month_range: one range per BRANCH (not per client)
ALTER TABLE client_month_range DROP CONSTRAINT unique_client_month_range;
ALTER TABLE client_month_range
  ADD CONSTRAINT unique_branch_month_range UNIQUE(tenant_id, branch_id);

-- client_monthly_reports: per BRANCH
ALTER TABLE client_monthly_reports DROP CONSTRAINT unique_client_report_month;
ALTER TABLE client_monthly_reports
  ADD CONSTRAINT unique_branch_report_month UNIQUE(tenant_id, branch_id, report_type, month_date);

-- foreign_worker_monthly_data: per BRANCH (instead of client)
ALTER TABLE foreign_worker_monthly_data DROP CONSTRAINT unique_worker_month_data;
ALTER TABLE foreign_worker_monthly_data
  ADD CONSTRAINT unique_worker_branch_month_data UNIQUE(tenant_id, branch_id, worker_id, month_date);

-- Note: passport uniqueness stays at tenant level (not per branch)
-- A passport cannot exist at different clients within the same tenant

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Get or create default branch for a client
CREATE OR REPLACE FUNCTION public.get_or_create_default_branch(
  p_client_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_branch_id UUID;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  -- Try to find existing default branch
  SELECT id INTO v_branch_id
  FROM client_branches
  WHERE tenant_id = v_tenant_id
    AND client_id = p_client_id
    AND is_default = true;

  IF v_branch_id IS NOT NULL THEN
    RETURN v_branch_id;
  END IF;

  -- Create default branch if none exists
  INSERT INTO client_branches (tenant_id, client_id, name, is_default)
  VALUES (v_tenant_id, p_client_id, 'ראשי', true)
  RETURNING id INTO v_branch_id;

  RETURN v_branch_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_default_branch IS 'Get default branch for client, creating one if needed';

-- Get branch display name for letters
CREATE OR REPLACE FUNCTION public.get_branch_display_name(
  p_branch_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_name TEXT;
  v_branch_name TEXT;
  v_is_default BOOLEAN;
BEGIN
  SELECT c.company_name, cb.name, cb.is_default
  INTO v_company_name, v_branch_name, v_is_default
  FROM client_branches cb
  JOIN clients c ON cb.client_id = c.id
  WHERE cb.id = p_branch_id
    AND cb.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  IF v_company_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- For default branch named "ראשי", return just company name
  IF v_is_default AND v_branch_name = 'ראשי' THEN
    RETURN v_company_name;
  END IF;

  -- For named branches, return "Company - Branch"
  RETURN v_company_name || ' - ' || v_branch_name;
END;
$$;

COMMENT ON FUNCTION get_branch_display_name IS 'Get display name for letters: "Company" or "Company - Branch"';

-- Get all branches for a client
CREATE OR REPLACE FUNCTION public.get_client_branches(
  p_client_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  is_default BOOLEAN,
  is_active BOOLEAN,
  display_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.id,
    cb.name,
    cb.is_default,
    cb.is_active,
    get_branch_display_name(cb.id) AS display_name
  FROM client_branches cb
  WHERE cb.client_id = p_client_id
    AND cb.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    AND cb.is_active = true
  ORDER BY cb.is_default DESC, cb.name ASC;
END;
$$;

COMMENT ON FUNCTION get_client_branches IS 'Get all active branches for a client';

-- ==============================================
-- UPDATE EXISTING FUNCTIONS TO USE BRANCH_ID
-- ==============================================

-- Update get_client_month_range to use branch_id
CREATE OR REPLACE FUNCTION public.get_branch_month_range(
  p_branch_id UUID
)
RETURNS TABLE (
  start_month DATE,
  end_month DATE,
  month_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cmr.start_month,
    cmr.end_month,
    (EXTRACT(YEAR FROM cmr.end_month) * 12 + EXTRACT(MONTH FROM cmr.end_month) -
     (EXTRACT(YEAR FROM cmr.start_month) * 12 + EXTRACT(MONTH FROM cmr.start_month)) + 1)::INTEGER AS month_count
  FROM client_month_range cmr
  WHERE cmr.branch_id = p_branch_id
    AND cmr.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_branch_month_range IS 'Get month range for a branch with month count';

-- Upsert month range for a branch
CREATE OR REPLACE FUNCTION public.upsert_branch_month_range(
  p_branch_id UUID,
  p_start_month DATE,
  p_end_month DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_client_id UUID;
  v_id UUID;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  -- Get client_id from branch
  SELECT client_id INTO v_client_id
  FROM client_branches
  WHERE id = p_branch_id AND tenant_id = v_tenant_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  -- Normalize dates
  p_start_month := DATE_TRUNC('month', p_start_month)::DATE;
  p_end_month := DATE_TRUNC('month', p_end_month)::DATE;

  INSERT INTO client_month_range (
    tenant_id, client_id, branch_id, start_month, end_month, created_by
  )
  VALUES (
    v_tenant_id, v_client_id, p_branch_id, p_start_month, p_end_month, v_user_id
  )
  ON CONFLICT (tenant_id, branch_id)
  DO UPDATE SET
    start_month = EXCLUDED.start_month,
    end_month = EXCLUDED.end_month,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_branch_month_range IS 'Create or update month range for a branch';

-- Get monthly reports for a branch
CREATE OR REPLACE FUNCTION public.get_branch_monthly_reports(
  p_branch_id UUID,
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
  WHERE cmr.branch_id = p_branch_id
    AND cmr.report_type = p_report_type
    AND cmr.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  ORDER BY cmr.month_date DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_branch_monthly_reports IS 'Get monthly reports for a branch by type';

-- Upsert monthly report for a branch
CREATE OR REPLACE FUNCTION public.upsert_branch_monthly_report(
  p_branch_id UUID,
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
  v_client_id UUID;
  v_id UUID;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  SELECT client_id INTO v_client_id
  FROM client_branches
  WHERE id = p_branch_id AND tenant_id = v_tenant_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  p_month_date := DATE_TRUNC('month', p_month_date)::DATE;

  INSERT INTO client_monthly_reports (
    tenant_id, client_id, branch_id, report_type, month_date,
    turnover_amount, employee_count, notes, created_by
  )
  VALUES (
    v_tenant_id, v_client_id, p_branch_id, p_report_type, p_month_date,
    p_turnover_amount, p_employee_count, p_notes, v_user_id
  )
  ON CONFLICT (tenant_id, branch_id, report_type, month_date)
  DO UPDATE SET
    turnover_amount = COALESCE(EXCLUDED.turnover_amount, client_monthly_reports.turnover_amount),
    employee_count = COALESCE(EXCLUDED.employee_count, client_monthly_reports.employee_count),
    notes = COALESCE(EXCLUDED.notes, client_monthly_reports.notes),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_branch_monthly_report IS 'Create or update a monthly report for a branch';

-- Bulk upsert monthly reports for a branch
CREATE OR REPLACE FUNCTION public.bulk_upsert_branch_monthly_reports(
  p_branch_id UUID,
  p_report_type client_report_type,
  p_records JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_client_id UUID;
  v_record JSONB;
  v_count INTEGER := 0;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  SELECT client_id INTO v_client_id
  FROM client_branches
  WHERE id = p_branch_id AND tenant_id = v_tenant_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO client_monthly_reports (
      tenant_id, client_id, branch_id, report_type, month_date,
      turnover_amount, employee_count, created_by
    )
    VALUES (
      v_tenant_id,
      v_client_id,
      p_branch_id,
      p_report_type,
      DATE_TRUNC('month', (v_record->>'month_date')::DATE)::DATE,
      (v_record->>'turnover_amount')::DECIMAL(12,2),
      (v_record->>'employee_count')::INTEGER,
      v_user_id
    )
    ON CONFLICT (tenant_id, branch_id, report_type, month_date)
    DO UPDATE SET
      turnover_amount = COALESCE(EXCLUDED.turnover_amount, client_monthly_reports.turnover_amount),
      employee_count = COALESCE(EXCLUDED.employee_count, client_monthly_reports.employee_count),
      updated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION bulk_upsert_branch_monthly_reports IS 'Bulk upsert monthly reports for a branch';

-- Get worker monthly data for a branch
CREATE OR REPLACE FUNCTION public.get_branch_worker_monthly_data(
  p_branch_id UUID,
  p_worker_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 200
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
  WHERE fwmd.branch_id = p_branch_id
    AND fwmd.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    AND (p_worker_id IS NULL OR fwmd.worker_id = p_worker_id)
  ORDER BY fw.full_name, fwmd.month_date DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_branch_worker_monthly_data IS 'Get monthly salary data for a branch';

-- Upsert worker monthly data for a branch
CREATE OR REPLACE FUNCTION public.upsert_branch_worker_monthly_data(
  p_branch_id UUID,
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
  v_client_id UUID;
  v_id UUID;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  SELECT client_id INTO v_client_id
  FROM client_branches
  WHERE id = p_branch_id AND tenant_id = v_tenant_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;

  p_month_date := DATE_TRUNC('month', p_month_date)::DATE;

  INSERT INTO foreign_worker_monthly_data (
    tenant_id, client_id, branch_id, worker_id, month_date,
    salary, supplement, created_by
  )
  VALUES (
    v_tenant_id, v_client_id, p_branch_id, p_worker_id, p_month_date,
    p_salary, p_supplement, v_user_id
  )
  ON CONFLICT (tenant_id, branch_id, worker_id, month_date)
  DO UPDATE SET
    salary = EXCLUDED.salary,
    supplement = EXCLUDED.supplement,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_branch_worker_monthly_data IS 'Upsert worker monthly salary data for a branch';

-- Get branch workers
CREATE OR REPLACE FUNCTION public.get_branch_workers(
  p_branch_id UUID
)
RETURNS TABLE (
  id UUID,
  passport_number TEXT,
  full_name TEXT,
  nationality TEXT,
  salary INTEGER,
  supplement INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fw.id,
    fw.passport_number,
    fw.full_name,
    fw.nationality,
    fw.salary,
    fw.supplement,
    fw.created_at
  FROM foreign_workers fw
  WHERE fw.branch_id = p_branch_id
    AND fw.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  ORDER BY fw.full_name ASC;
END;
$$;

COMMENT ON FUNCTION get_branch_workers IS 'Get all foreign workers for a branch';

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 136: client_branches system created';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Table: client_branches';
  RAISE NOTICE 'Added branch_id to: foreign_workers, foreign_worker_monthly_data, client_month_range, client_monthly_reports';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - get_or_create_default_branch(client_id)';
  RAISE NOTICE '  - get_branch_display_name(branch_id)';
  RAISE NOTICE '  - get_client_branches(client_id)';
  RAISE NOTICE '  - get_branch_month_range(branch_id)';
  RAISE NOTICE '  - upsert_branch_month_range(branch_id, start, end)';
  RAISE NOTICE '  - get_branch_monthly_reports(branch_id, type, limit)';
  RAISE NOTICE '  - upsert_branch_monthly_report(branch_id, type, ...)';
  RAISE NOTICE '  - bulk_upsert_branch_monthly_reports(branch_id, type, records)';
  RAISE NOTICE '  - get_branch_worker_monthly_data(branch_id, worker_id, limit)';
  RAISE NOTICE '  - upsert_branch_worker_monthly_data(branch_id, worker_id, ...)';
  RAISE NOTICE '  - get_branch_workers(branch_id)';
END $$;
