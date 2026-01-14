-- Broadcast System Migration
-- Enables mass email/letter sending to clients via distribution lists

-- ============================================================================
-- 1. DISTRIBUTION LISTS - Static custom lists of clients
-- ============================================================================

CREATE TABLE distribution_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- List metadata
  name TEXT NOT NULL,                    -- e.g., "מסעדות אסייתיות"
  description TEXT,                      -- Optional description

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_list_name_per_tenant UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE distribution_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY distribution_lists_tenant_isolation ON distribution_lists
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Index
CREATE INDEX idx_distribution_lists_tenant ON distribution_lists(tenant_id);

-- ============================================================================
-- 2. DISTRIBUTION LIST MEMBERS - Junction table linking lists to clients
-- ============================================================================

CREATE TABLE distribution_list_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  list_id UUID NOT NULL REFERENCES distribution_lists(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Audit
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  added_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_client_per_list UNIQUE(list_id, client_id)
);

-- Enable RLS
ALTER TABLE distribution_list_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy (through distribution_lists)
CREATE POLICY list_members_tenant_isolation ON distribution_list_members
  FOR ALL USING (
    list_id IN (SELECT id FROM distribution_lists
                WHERE tenant_id = public.get_current_tenant_id())
  );

-- Indexes
CREATE INDEX idx_list_members_list ON distribution_list_members(list_id);
CREATE INDEX idx_list_members_client ON distribution_list_members(client_id);

-- ============================================================================
-- 3. BROADCASTS - Track each broadcast campaign
-- ============================================================================

CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Broadcast metadata
  name TEXT NOT NULL,                     -- Internal name for tracking
  subject TEXT NOT NULL,                  -- Email subject line

  -- Content (one of these will be set)
  template_type TEXT,                     -- If using existing template (e.g., 'external_index_only')
  custom_content_html TEXT,               -- If using custom content
  includes_payment_section BOOLEAN DEFAULT false,

  -- Recipient info
  list_type TEXT NOT NULL CHECK (list_type IN ('all', 'custom')),
  list_id UUID REFERENCES distribution_lists(id), -- NULL if 'all' (dynamic)
  recipient_count INTEGER NOT NULL DEFAULT 0,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,               -- For future scheduling feature
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Stats
  total_emails_sent INTEGER DEFAULT 0,
  total_emails_failed INTEGER DEFAULT 0,
  total_emails_opened INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY broadcasts_tenant_isolation ON broadcasts
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Indexes
CREATE INDEX idx_broadcasts_tenant ON broadcasts(tenant_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(tenant_id, status);
CREATE INDEX idx_broadcasts_list ON broadcasts(list_id) WHERE list_id IS NOT NULL;

-- ============================================================================
-- 4. BROADCAST RECIPIENTS - Track individual recipients per broadcast
-- ============================================================================

CREATE TABLE broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),

  -- Contact level tracking (one row per email sent)
  contact_id UUID REFERENCES tenant_contacts(id),
  email TEXT NOT NULL,                    -- The email address used
  recipient_name TEXT,                    -- Contact name for display

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,                     -- If failed, why

  -- Tracking
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  open_count INTEGER DEFAULT 0,

  -- Generated letter reference (for viewing sent content)
  generated_letter_id UUID REFERENCES generated_letters(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- RLS Policy (through broadcasts)
CREATE POLICY broadcast_recipients_tenant_isolation ON broadcast_recipients
  FOR ALL USING (
    broadcast_id IN (SELECT id FROM broadcasts
                     WHERE tenant_id = public.get_current_tenant_id())
  );

-- Indexes
CREATE INDEX idx_broadcast_recipients_broadcast ON broadcast_recipients(broadcast_id);
CREATE INDEX idx_broadcast_recipients_client ON broadcast_recipients(client_id);
CREATE INDEX idx_broadcast_recipients_status ON broadcast_recipients(broadcast_id, status);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Get all clients eligible for broadcast (receives_letters=true, status=active)
CREATE OR REPLACE FUNCTION get_broadcast_eligible_clients()
RETURNS TABLE(
  client_id UUID,
  company_name TEXT,
  company_name_hebrew TEXT,
  tax_id TEXT,
  contact_count BIGINT,
  email_count BIGINT
) AS $$
DECLARE
  current_tenant_id UUID;
BEGIN
  current_tenant_id := public.get_current_tenant_id();

  RETURN QUERY
  SELECT
    c.id as client_id,
    c.company_name,
    c.company_name_hebrew,
    c.tax_id,
    COUNT(DISTINCT cca.contact_id) as contact_count,
    COUNT(DISTINCT tc.email) FILTER (WHERE tc.email IS NOT NULL AND cca.email_preference != 'none') as email_count
  FROM clients c
  LEFT JOIN client_contact_assignments cca ON c.id = cca.client_id
  LEFT JOIN tenant_contacts tc ON cca.contact_id = tc.id
  WHERE c.tenant_id = current_tenant_id
    AND c.receives_letters = true
    AND c.status = 'active'
  GROUP BY c.id, c.company_name, c.company_name_hebrew, c.tax_id
  ORDER BY c.company_name_hebrew NULLS LAST, c.company_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get all email recipients for a single client (respecting email_preference)
CREATE OR REPLACE FUNCTION get_client_broadcast_emails(p_client_id UUID)
RETURNS TABLE(
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  email_preference TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as contact_id,
    tc.full_name,
    tc.email,
    cca.email_preference
  FROM client_contact_assignments cca
  JOIN tenant_contacts tc ON cca.contact_id = tc.id
  WHERE cca.client_id = p_client_id
    AND cca.email_preference != 'none'
    AND tc.email IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get list members with client details
CREATE OR REPLACE FUNCTION get_list_members_with_details(p_list_id UUID)
RETURNS TABLE(
  client_id UUID,
  company_name TEXT,
  company_name_hebrew TEXT,
  tax_id TEXT,
  contact_count BIGINT,
  email_count BIGINT,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as client_id,
    c.company_name,
    c.company_name_hebrew,
    c.tax_id,
    COUNT(DISTINCT cca.contact_id) as contact_count,
    COUNT(DISTINCT tc.email) FILTER (WHERE tc.email IS NOT NULL AND cca.email_preference != 'none') as email_count,
    dlm.added_at
  FROM distribution_list_members dlm
  JOIN clients c ON dlm.client_id = c.id
  LEFT JOIN client_contact_assignments cca ON c.id = cca.client_id
  LEFT JOIN tenant_contacts tc ON cca.contact_id = tc.id
  WHERE dlm.list_id = p_list_id
    AND c.status = 'active'
  GROUP BY c.id, c.company_name, c.company_name_hebrew, c.tax_id, dlm.added_at
  ORDER BY c.company_name_hebrew NULLS LAST, c.company_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================================

-- Updated_at trigger for distribution_lists
CREATE TRIGGER update_distribution_lists_updated_at
  BEFORE UPDATE ON distribution_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for broadcasts
CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE distribution_lists IS 'Custom mailing lists for broadcast feature';
COMMENT ON TABLE distribution_list_members IS 'Junction table linking distribution lists to clients';
COMMENT ON TABLE broadcasts IS 'Broadcast campaigns - mass email/letter sends';
COMMENT ON TABLE broadcast_recipients IS 'Individual recipients for each broadcast, tracks per-email status';

COMMENT ON FUNCTION get_broadcast_eligible_clients() IS 'Returns all clients eligible for broadcast (receives_letters=true, active)';
COMMENT ON FUNCTION get_client_broadcast_emails(UUID) IS 'Returns all email addresses for a client respecting email_preference';
COMMENT ON FUNCTION get_list_members_with_details(UUID) IS 'Returns list members with client details and email counts';
