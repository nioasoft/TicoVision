-- ============================================================================
-- Protocol Management Module
-- ============================================================================
-- Creates tables for managing meeting protocols with attendees, decisions,
-- and content sections (announcements, background stories, recommendations)
-- ============================================================================

-- 1. protocols - Main protocol table
CREATE TABLE protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  group_id UUID REFERENCES client_groups(id) ON DELETE SET NULL,
  meeting_date DATE NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked')),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- At least one recipient required (client or group)
  CONSTRAINT recipient_required CHECK (client_id IS NOT NULL OR group_id IS NOT NULL)
);

-- 2. protocol_attendees - Meeting participants
CREATE TABLE protocol_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('contact', 'employee', 'external')),
  contact_id UUID REFERENCES tenant_contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. protocol_decisions - Decisions with responsibility tracking
CREATE TABLE protocol_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('normal', 'urgent')),
  responsibility_type TEXT NOT NULL CHECK (
    responsibility_type IN ('office', 'client', 'bookkeeper', 'other')
  ),
  assigned_employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_other_name TEXT,
  audit_report_year INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. protocol_content_sections - Free text sections (announcements, background, recommendations)
CREATE TABLE protocol_content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL CHECK (
    section_type IN ('announcement', 'background_story', 'recommendation')
  ),
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Protocols indexes
CREATE INDEX idx_protocols_tenant_id ON protocols(tenant_id);
CREATE INDEX idx_protocols_client_id ON protocols(client_id);
CREATE INDEX idx_protocols_group_id ON protocols(group_id);
CREATE INDEX idx_protocols_status ON protocols(status);
CREATE INDEX idx_protocols_meeting_date ON protocols(meeting_date DESC);
CREATE INDEX idx_protocols_created_at ON protocols(created_at DESC);

-- Protocol attendees indexes
CREATE INDEX idx_protocol_attendees_protocol_id ON protocol_attendees(protocol_id);
CREATE INDEX idx_protocol_attendees_contact_id ON protocol_attendees(contact_id);
CREATE INDEX idx_protocol_attendees_user_id ON protocol_attendees(user_id);

-- Protocol decisions indexes
CREATE INDEX idx_protocol_decisions_protocol_id ON protocol_decisions(protocol_id);
CREATE INDEX idx_protocol_decisions_responsibility ON protocol_decisions(responsibility_type);
CREATE INDEX idx_protocol_decisions_sort_order ON protocol_decisions(protocol_id, sort_order);

-- Protocol content sections indexes
CREATE INDEX idx_protocol_content_protocol_id ON protocol_content_sections(protocol_id);
CREATE INDEX idx_protocol_content_type ON protocol_content_sections(section_type);
CREATE INDEX idx_protocol_content_sort_order ON protocol_content_sections(protocol_id, sort_order);

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE protocol_content_sections ENABLE ROW LEVEL SECURITY;

-- Protocols policies
CREATE POLICY "protocols_select_tenant" ON protocols
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "protocols_insert_tenant" ON protocols
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "protocols_update_tenant" ON protocols
  FOR UPDATE USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "protocols_delete_tenant" ON protocols
  FOR DELETE USING (tenant_id = public.get_current_tenant_id());

-- Protocol attendees policies (via protocol's tenant)
CREATE POLICY "protocol_attendees_select" ON protocol_attendees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_attendees_insert" ON protocol_attendees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_attendees_update" ON protocol_attendees
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_attendees_delete" ON protocol_attendees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

-- Protocol decisions policies (via protocol's tenant)
CREATE POLICY "protocol_decisions_select" ON protocol_decisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_decisions_insert" ON protocol_decisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_decisions_update" ON protocol_decisions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_decisions_delete" ON protocol_decisions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

-- Protocol content sections policies (via protocol's tenant)
CREATE POLICY "protocol_content_select" ON protocol_content_sections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_content_insert" ON protocol_content_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_content_update" ON protocol_content_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

CREATE POLICY "protocol_content_delete" ON protocol_content_sections
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM protocols p
      WHERE p.id = protocol_id
      AND p.tenant_id = public.get_current_tenant_id()
    )
  );

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update timestamp trigger for protocols
CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON protocols
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE protocols IS 'Meeting protocols with clients or client groups';
COMMENT ON COLUMN protocols.status IS 'draft = editable, locked = finalized and read-only';
COMMENT ON COLUMN protocols.locked_at IS 'Timestamp when protocol was locked';
COMMENT ON COLUMN protocols.locked_by IS 'User who locked the protocol';
COMMENT ON COLUMN protocols.pdf_url IS 'URL to the generated PDF in storage';

COMMENT ON TABLE protocol_attendees IS 'Meeting participants from various sources';
COMMENT ON COLUMN protocol_attendees.source_type IS 'contact = client contact, employee = office staff, external = free text';
COMMENT ON COLUMN protocol_attendees.contact_id IS 'Reference to tenant_contacts if source_type = contact';
COMMENT ON COLUMN protocol_attendees.user_id IS 'Reference to auth.users if source_type = employee';
COMMENT ON COLUMN protocol_attendees.display_name IS 'Name to display (can be auto-filled from contact/user)';
COMMENT ON COLUMN protocol_attendees.role_title IS 'Job title or role of the attendee';

COMMENT ON TABLE protocol_decisions IS 'Action items and decisions from the meeting';
COMMENT ON COLUMN protocol_decisions.urgency IS 'normal = regular, urgent = requires immediate attention';
COMMENT ON COLUMN protocol_decisions.responsibility_type IS 'Who is responsible: office, client, bookkeeper, or other';
COMMENT ON COLUMN protocol_decisions.assigned_employee_id IS 'Specific employee if responsibility_type = office';
COMMENT ON COLUMN protocol_decisions.assigned_other_name IS 'Name if responsibility_type = other';
COMMENT ON COLUMN protocol_decisions.audit_report_year IS 'Related audit report year if applicable';

COMMENT ON TABLE protocol_content_sections IS 'Free-text content sections';
COMMENT ON COLUMN protocol_content_sections.section_type IS 'announcement, background_story, or recommendation';
