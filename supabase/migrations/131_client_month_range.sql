-- Migration 131: Client Month Range Table
-- Description: Track shared month range for rolling 14-month window (Foreign Workers tabs)
-- Date: 2025-11-26
--
-- Requirements:
-- - Each client has ONE shared month range across all 3 monthly tabs
-- - Range has start_month and end_month (both stored as first day of month)
-- - Maximum span: 14 months

-- ==============================================
-- TABLE: client_month_range
-- ==============================================

CREATE TABLE client_month_range (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Month range (stored as first day of month for consistent comparisons)
  start_month DATE NOT NULL,  -- e.g., 2024-11-01
  end_month DATE NOT NULL,    -- e.g., 2025-12-01

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- One range per client
  CONSTRAINT unique_client_month_range UNIQUE(tenant_id, client_id),

  -- Ensure dates are first day of month
  CONSTRAINT start_month_first_day CHECK (EXTRACT(DAY FROM start_month) = 1),
  CONSTRAINT end_month_first_day CHECK (EXTRACT(DAY FROM end_month) = 1),

  -- Ensure end >= start
  CONSTRAINT valid_date_range CHECK (end_month >= start_month),

  -- Maximum 14 months span (months_between = 0 to 13)
  CONSTRAINT max_14_months CHECK (
    EXTRACT(YEAR FROM end_month) * 12 + EXTRACT(MONTH FROM end_month) -
    (EXTRACT(YEAR FROM start_month) * 12 + EXTRACT(MONTH FROM start_month)) <= 13
  )
);

-- Table comments
COMMENT ON TABLE client_month_range IS 'Shared month range for foreign workers tabs - rolling 14-month window';
COMMENT ON COLUMN client_month_range.start_month IS 'First day of start month (e.g., 2024-11-01)';
COMMENT ON COLUMN client_month_range.end_month IS 'First day of end month (e.g., 2025-12-01)';

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_client_month_range_tenant ON client_month_range(tenant_id);
CREATE INDEX idx_client_month_range_client ON client_month_range(client_id);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE client_month_range ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see ranges in their tenant
CREATE POLICY client_month_range_tenant_isolation ON client_month_range
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  );

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_client_month_range_updated_at
  BEFORE UPDATE ON client_month_range
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Get month range for a client
CREATE OR REPLACE FUNCTION public.get_client_month_range(
  p_client_id UUID
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
  WHERE cmr.client_id = p_client_id
    AND cmr.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_client_month_range IS 'Get month range for a client with month count';

-- Upsert month range for a client
CREATE OR REPLACE FUNCTION public.upsert_client_month_range(
  p_client_id UUID,
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
  v_id UUID;
BEGIN
  -- Get tenant and user from JWT
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
  v_user_id := auth.uid();

  -- Normalize dates to first day of month
  p_start_month := DATE_TRUNC('month', p_start_month)::DATE;
  p_end_month := DATE_TRUNC('month', p_end_month)::DATE;

  -- Upsert the range
  INSERT INTO client_month_range (
    tenant_id, client_id, start_month, end_month, created_by
  )
  VALUES (
    v_tenant_id, p_client_id, p_start_month, p_end_month, v_user_id
  )
  ON CONFLICT (tenant_id, client_id)
  DO UPDATE SET
    start_month = EXCLUDED.start_month,
    end_month = EXCLUDED.end_month,
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION upsert_client_month_range IS 'Create or update month range for a client';

-- Generate array of months in a range
CREATE OR REPLACE FUNCTION public.generate_months_array(
  p_start_month DATE,
  p_end_month DATE
)
RETURNS DATE[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_months DATE[];
  v_current DATE;
BEGIN
  v_current := DATE_TRUNC('month', p_start_month)::DATE;
  p_end_month := DATE_TRUNC('month', p_end_month)::DATE;

  WHILE v_current <= p_end_month LOOP
    v_months := array_append(v_months, v_current);
    v_current := v_current + INTERVAL '1 month';
  END LOOP;

  RETURN v_months;
END;
$$;

COMMENT ON FUNCTION generate_months_array IS 'Generate array of month dates between start and end';

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 131: client_month_range table created';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Table: client_month_range';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  - get_client_month_range(client_id)';
  RAISE NOTICE '  - upsert_client_month_range(client_id, start, end)';
  RAISE NOTICE '  - generate_months_array(start, end)';
END $$;
