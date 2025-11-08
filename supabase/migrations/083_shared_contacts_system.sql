-- Migration 083: Shared Contacts System
-- Description: Create tenant-wide contact pool and many-to-many client assignments
-- Date: 2025-11-08
-- Author: Claude Code

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================
-- TABLE: tenant_contacts
-- Description: Shared contact pool for all contacts across tenant
-- Each contact stored once, can be linked to multiple clients
-- ==============================================

CREATE TABLE tenant_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact information
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  contact_type contact_type NOT NULL, -- Reuse existing ENUM
  job_title TEXT, -- Job title / role (renamed from 'position' to avoid SQL keyword conflict)
  notes TEXT,

  -- Full-text search optimization (Hebrew + English support)
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(full_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(job_title, '')
    )
  ) STORED,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Constraints: Prevent exact duplicates within tenant
  CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email),
  CONSTRAINT unique_tenant_phone UNIQUE(tenant_id, phone),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT at_least_one_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Add table comment
COMMENT ON TABLE tenant_contacts IS 'Shared contact pool - each contact stored once, can be assigned to multiple clients';

-- Column comments
COMMENT ON COLUMN tenant_contacts.search_vector IS 'Full-text search index for fast autocomplete (Hebrew + English)';
COMMENT ON COLUMN tenant_contacts.contact_type IS 'Reuses existing contact_type ENUM from client_contacts';

-- ==============================================
-- TABLE: client_contact_assignments
-- Description: Many-to-many junction table linking clients to contacts
-- Allows one contact to be associated with multiple clients
-- ==============================================

CREATE TABLE client_contact_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES tenant_contacts(id) ON DELETE CASCADE,

  -- Client-specific settings for this contact
  is_primary BOOLEAN DEFAULT false NOT NULL,
  email_preference TEXT DEFAULT 'all' NOT NULL CHECK (email_preference IN ('all', 'important_only', 'none')),
  role_at_client TEXT, -- Specific role/title at THIS client (can differ from general position)
  notes TEXT, -- Client-specific notes about this contact

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_client_contact UNIQUE(client_id, contact_id), -- One contact can't be assigned twice to same client
  CONSTRAINT one_primary_per_client UNIQUE NULLS NOT DISTINCT (client_id, is_primary)
    DEFERRABLE INITIALLY DEFERRED -- Only one primary contact per client
);

-- Add table comment
COMMENT ON TABLE client_contact_assignments IS 'Junction table: links contacts to clients (many-to-many relationship)';

-- Column comments
COMMENT ON COLUMN client_contact_assignments.role_at_client IS 'Contact role specific to THIS client (may differ from general position)';
COMMENT ON COLUMN client_contact_assignments.is_primary IS 'Only one contact per client can be primary (enforced by unique constraint)';

-- ==============================================
-- INDEXES
-- ==============================================

-- tenant_contacts indexes
CREATE INDEX idx_tenant_contacts_tenant ON tenant_contacts(tenant_id);
CREATE INDEX idx_tenant_contacts_search ON tenant_contacts USING GIN(search_vector);
CREATE INDEX idx_tenant_contacts_email ON tenant_contacts(tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX idx_tenant_contacts_phone ON tenant_contacts(tenant_id, phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_tenant_contacts_type ON tenant_contacts(tenant_id, contact_type);
CREATE INDEX idx_tenant_contacts_name ON tenant_contacts(tenant_id, full_name);

-- client_contact_assignments indexes
CREATE INDEX idx_client_assignments_client ON client_contact_assignments(client_id);
CREATE INDEX idx_client_assignments_contact ON client_contact_assignments(contact_id);
CREATE INDEX idx_client_assignments_primary ON client_contact_assignments(client_id, is_primary) WHERE is_primary = true;

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE tenant_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contact_assignments ENABLE ROW LEVEL SECURITY;

-- tenant_contacts RLS: Users can only see contacts in their tenant
CREATE POLICY tenant_contacts_tenant_isolation ON tenant_contacts
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
  );

-- client_contact_assignments RLS: Users can only see assignments for clients in their tenant
CREATE POLICY client_assignments_tenant_isolation ON client_contact_assignments
  FOR ALL
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    )
  );

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp for tenant_contacts
CREATE TRIGGER update_tenant_contacts_updated_at
  BEFORE UPDATE ON tenant_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at timestamp for client_contact_assignments
CREATE TRIGGER update_client_assignments_updated_at
  BEFORE UPDATE ON client_contact_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function: Search contacts by query (autocomplete)
CREATE OR REPLACE FUNCTION search_tenant_contacts(
  search_query TEXT,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type contact_type,
  job_title TEXT,
  client_count BIGINT
) AS $$
DECLARE
  current_tenant_id UUID;
BEGIN
  -- Get current tenant
  current_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  -- Search using trigram similarity and full-text search
  RETURN QUERY
  SELECT
    tc.id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title,
    COUNT(cca.id) as client_count
  FROM tenant_contacts tc
  LEFT JOIN client_contact_assignments cca ON tc.id = cca.contact_id
  WHERE tc.tenant_id = current_tenant_id
    AND (
      tc.full_name ILIKE '%' || search_query || '%' OR
      tc.email ILIKE '%' || search_query || '%' OR
      tc.phone ILIKE '%' || search_query || '%' OR
      tc.search_vector @@ plainto_tsquery('simple', search_query)
    )
  GROUP BY tc.id
  ORDER BY
    -- Prioritize exact matches
    CASE
      WHEN tc.full_name ILIKE search_query THEN 1
      WHEN tc.full_name ILIKE search_query || '%' THEN 2
      WHEN tc.email ILIKE search_query || '%' THEN 3
      ELSE 4
    END,
    tc.full_name
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION search_tenant_contacts IS 'Autocomplete search for contacts - returns matches with client count';

-- Function: Find contact by email (exact match)
CREATE OR REPLACE FUNCTION find_contact_by_email(
  contact_email TEXT
)
RETURNS UUID AS $$
DECLARE
  current_tenant_id UUID;
  found_contact_id UUID;
BEGIN
  current_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  SELECT id INTO found_contact_id
  FROM tenant_contacts
  WHERE tenant_id = current_tenant_id
    AND LOWER(email) = LOWER(contact_email)
  LIMIT 1;

  RETURN found_contact_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION find_contact_by_email IS 'Find existing contact by email (case-insensitive)';

-- Function: Find contact by phone (exact match)
CREATE OR REPLACE FUNCTION find_contact_by_phone(
  contact_phone TEXT
)
RETURNS UUID AS $$
DECLARE
  current_tenant_id UUID;
  found_contact_id UUID;
BEGIN
  current_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  SELECT id INTO found_contact_id
  FROM tenant_contacts
  WHERE tenant_id = current_tenant_id
    AND phone = contact_phone
  LIMIT 1;

  RETURN found_contact_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION find_contact_by_phone IS 'Find existing contact by phone number';

-- Function: Get all contacts for a client with details
CREATE OR REPLACE FUNCTION get_client_contacts_detailed(
  p_client_id UUID
)
RETURNS TABLE(
  assignment_id UUID,
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type contact_type,
  job_title TEXT,
  is_primary BOOLEAN,
  email_preference TEXT,
  role_at_client TEXT,
  notes TEXT,
  other_clients_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cca.id as assignment_id,
    tc.id as contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title,
    cca.is_primary,
    cca.email_preference,
    cca.role_at_client,
    cca.notes,
    (
      SELECT COUNT(*)::BIGINT
      FROM client_contact_assignments
      WHERE contact_id = tc.id AND client_id != p_client_id
    ) as other_clients_count
  FROM client_contact_assignments cca
  JOIN tenant_contacts tc ON cca.contact_id = tc.id
  WHERE cca.client_id = p_client_id
  ORDER BY cca.is_primary DESC, tc.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_client_contacts_detailed IS 'Get all contacts for a client with full details and count of other clients sharing this contact';
