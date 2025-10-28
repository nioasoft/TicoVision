-- Migration: Collection System - Create reminder_rules table
-- Description: Configurable rules for automated payment reminders
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create reminder_rules table
CREATE TABLE IF NOT EXISTS reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Trigger conditions (JSONB for flexibility)
  trigger_conditions JSONB NOT NULL,

  -- Actions (JSONB for flexibility)
  actions JSONB NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE reminder_rules IS 'Configurable automated reminder rules for payment collection';

-- Add column comments
COMMENT ON COLUMN reminder_rules.name IS 'Rule name (e.g., "לא נפתח המכתב - 7 ימים")';
COMMENT ON COLUMN reminder_rules.description IS 'Detailed description of what this rule does';
COMMENT ON COLUMN reminder_rules.trigger_conditions IS 'JSONB: {days_since_sent: 7, payment_status: ["sent"], opened: false}';
COMMENT ON COLUMN reminder_rules.actions IS 'JSONB: {send_email: true, email_template_id: "reminder_no_open_7d", notify_sigal: true}';
COMMENT ON COLUMN reminder_rules.is_active IS 'Toggle to enable/disable rule without deleting it';
COMMENT ON COLUMN reminder_rules.priority IS 'Lower number = higher priority (0 = highest)';

-- Create index for active rules ordered by priority
CREATE INDEX idx_reminder_rules_active
  ON reminder_rules(tenant_id, priority)
  WHERE is_active = TRUE;

-- Create RLS policy for tenant isolation
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON reminder_rules
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON reminder_rules IS 'Multi-tenant isolation - users can only access rules from their tenant';

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_reminder_rules_updated_at
  BEFORE UPDATE ON reminder_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default reminder rules (will be populated per tenant)
-- Rule 1: Not Opened (7 days)
INSERT INTO reminder_rules (tenant_id, name, description, trigger_conditions, actions, priority)
SELECT
  id as tenant_id,
  'לא נפתח המכתב - 7 ימים',
  'תזכורת אוטומטית ללקוחות שלא פתחו את המכתב תוך 7 ימים',
  '{"days_since_sent": 7, "payment_status": ["sent"], "opened": false, "payment_method_selected": null}'::jsonb,
  '{"send_email": true, "email_template": "reminder_no_open_7d", "notify_sigal": true, "include_mistake_button": true}'::jsonb,
  10
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules
  WHERE reminder_rules.tenant_id = tenants.id
  AND reminder_rules.name = 'לא נפתח המכתב - 7 ימים'
);

-- Rule 2: Not Selected (14 days)
INSERT INTO reminder_rules (tenant_id, name, description, trigger_conditions, actions, priority)
SELECT
  id as tenant_id,
  'לא בחר אופן תשלום - 14 ימים',
  'תזכורת אוטומטית ללקוחות שפתחו את המכתב אך לא בחרו אופן תשלום תוך 14 ימים',
  '{"days_since_sent": 14, "payment_status": ["sent"], "opened": true, "payment_method_selected": null}'::jsonb,
  '{"send_email": true, "email_template": "reminder_no_selection_14d", "notify_sigal": true, "include_mistake_button": true}'::jsonb,
  20
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules
  WHERE reminder_rules.tenant_id = tenants.id
  AND reminder_rules.name = 'לא בחר אופן תשלום - 14 ימים'
);

-- Rule 3: Abandoned Cardcom (2 days)
INSERT INTO reminder_rules (tenant_id, name, description, trigger_conditions, actions, priority)
SELECT
  id as tenant_id,
  'נטש Cardcom - 2 ימים',
  'תזכורת ללקוחות שבחרו תשלום בכרטיס אשראי אך לא השלימו תשלום ב-Cardcom',
  '{"payment_method_selected": ["cc_single", "cc_installments"], "completed_payment": false, "days_since_selection": 2}'::jsonb,
  '{"send_email": true, "email_template": "reminder_abandoned_cart_2d", "notify_sigal": false, "include_mistake_button": false}'::jsonb,
  30
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules
  WHERE reminder_rules.tenant_id = tenants.id
  AND reminder_rules.name = 'נטש Cardcom - 2 ימים'
);

-- Rule 4: Checks Overdue (30 days)
INSERT INTO reminder_rules (tenant_id, name, description, trigger_conditions, actions, priority)
SELECT
  id as tenant_id,
  'המחאות לא הגיעו - 30 ימים',
  'תזכורת ללקוחות שבחרו תשלום בהמחאות אך לא שלחו אותן תוך 30 ימים',
  '{"payment_method_selected": "checks", "payment_status": ["sent"], "days_since_selection": 30}'::jsonb,
  '{"send_email": true, "email_template": "reminder_checks_overdue_30d", "notify_sigal": true, "include_mistake_button": true}'::jsonb,
  40
FROM tenants
WHERE NOT EXISTS (
  SELECT 1 FROM reminder_rules
  WHERE reminder_rules.tenant_id = tenants.id
  AND reminder_rules.name = 'המחאות לא הגיעו - 30 ימים'
);

COMMENT ON TABLE reminder_rules IS 'Default reminder rules created for all tenants. Rules are configurable per tenant.';
