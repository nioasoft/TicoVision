-- Migration: Collection System - Create client_interactions table
-- Description: Track manual interactions with clients (phone calls, meetings, notes)
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create client_interactions table
CREATE TABLE IF NOT EXISTS client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID REFERENCES fee_calculations(id) ON DELETE SET NULL,

  -- Interaction details
  interaction_type TEXT NOT NULL
    CHECK (interaction_type IN ('phone_call', 'email_sent', 'meeting', 'note', 'whatsapp', 'other')),
  direction TEXT
    CHECK (direction IN ('outbound', 'inbound')),

  subject TEXT NOT NULL,
  content TEXT,
  outcome TEXT,

  interacted_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE client_interactions IS 'Manual interactions with clients logged by staff (Sigal, accountants)';

-- Add column comments
COMMENT ON COLUMN client_interactions.interaction_type IS 'Type of interaction: phone_call | email_sent | meeting | note | whatsapp | other';
COMMENT ON COLUMN client_interactions.direction IS 'outbound (staff initiated) | inbound (client initiated)';
COMMENT ON COLUMN client_interactions.subject IS 'Brief description of interaction (e.g., "תזכורת תשלום שכ״ט 2025")';
COMMENT ON COLUMN client_interactions.content IS 'Full details of what was discussed';
COMMENT ON COLUMN client_interactions.outcome IS 'Result of interaction (e.g., "הבטיח לשלם עד סוף החודש")';
COMMENT ON COLUMN client_interactions.interacted_at IS 'When the interaction occurred (can be backdated)';
COMMENT ON COLUMN client_interactions.created_by IS 'Staff member who logged this interaction';

-- Create index for client interaction history (DESC for most recent first)
CREATE INDEX idx_client_interactions
  ON client_interactions(tenant_id, client_id, interacted_at DESC);

-- Create RLS policy for tenant isolation
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON client_interactions
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON client_interactions IS 'Multi-tenant isolation - users can only access interactions from their tenant';
