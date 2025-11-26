-- Migration 130: Foreign Workers Table
-- Description: Store foreign worker data for Salary Report with smart passport search
-- Date: 2025-11-26
--
-- Requirements:
-- - Workers belong to ONE client only (not shared like contacts)
-- - Passport number is GLOBALLY UNIQUE per tenant (cannot exist at different clients)
-- - Smart search by passport number for auto-fill

-- ==============================================
-- TABLE: foreign_workers
-- ==============================================

CREATE TABLE foreign_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Worker information (passport first as primary identifier)
  passport_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nationality TEXT,
  salary INTEGER DEFAULT 0,       -- Base salary in ILS
  supplement INTEGER DEFAULT 0,   -- "תוספת" (bonus/supplement) in ILS

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- UNIQUE passport per tenant (prevents duplicate workers across all clients)
  CONSTRAINT unique_tenant_passport UNIQUE(tenant_id, passport_number)
);

-- Table comments
COMMENT ON TABLE foreign_workers IS 'Foreign workers - each belongs to ONE client, passport unique per tenant';
COMMENT ON COLUMN foreign_workers.passport_number IS 'Passport number - primary identifier, unique per tenant';
COMMENT ON COLUMN foreign_workers.supplement IS 'תוספת - bonus/supplement payment in ILS';

-- ==============================================
-- INDEXES
-- ==============================================

CREATE INDEX idx_foreign_workers_tenant ON foreign_workers(tenant_id);
CREATE INDEX idx_foreign_workers_client ON foreign_workers(client_id);
CREATE INDEX idx_foreign_workers_passport ON foreign_workers(tenant_id, passport_number);

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE foreign_workers ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see workers in their tenant
CREATE POLICY foreign_workers_tenant_isolation ON foreign_workers
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  );

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_foreign_workers_updated_at
  BEFORE UPDATE ON foreign_workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTION: Find worker by passport (exact match)
-- ==============================================

CREATE OR REPLACE FUNCTION public.find_worker_by_passport(
  p_tenant_id UUID,
  p_passport_number TEXT
)
RETURNS TABLE (
  id UUID,
  client_id UUID,
  passport_number TEXT,
  full_name TEXT,
  nationality TEXT,
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
    fw.id,
    fw.client_id,
    fw.passport_number,
    fw.full_name,
    fw.nationality,
    fw.salary,
    fw.supplement
  FROM foreign_workers fw
  WHERE fw.tenant_id = p_tenant_id
    AND fw.passport_number = p_passport_number
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION find_worker_by_passport IS 'Find existing worker by passport number (exact match)';
