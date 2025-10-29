-- Migration: Collection System - Extend fee_calculations table
-- Description: Add payment method tracking, partial payment support, and reminder tracking
-- Date: 2025-10-27

-- Add new columns to fee_calculations for collection system
ALTER TABLE fee_calculations
  -- Payment method tracking
  ADD COLUMN IF NOT EXISTS payment_method_selected TEXT
    CHECK (payment_method_selected IN ('bank_transfer', 'cc_single', 'cc_installments', 'checks')),
  ADD COLUMN IF NOT EXISTS payment_method_selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS amount_after_selected_discount NUMERIC(12,2),

  -- Partial payment support
  ADD COLUMN IF NOT EXISTS partial_payment_amount NUMERIC(12,2) DEFAULT 0,

  -- Reminder tracking
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN fee_calculations.payment_method_selected IS 'Payment method chosen by client: bank_transfer (9% discount) | cc_single (8% discount) | cc_installments (4% discount) | checks (0% discount)';
COMMENT ON COLUMN fee_calculations.payment_method_selected_at IS 'Timestamp when client selected payment method';
COMMENT ON COLUMN fee_calculations.amount_after_selected_discount IS 'Final amount after client-selected discount applied';
COMMENT ON COLUMN fee_calculations.partial_payment_amount IS 'Amount paid in partial payments';
COMMENT ON COLUMN fee_calculations.last_reminder_sent_at IS 'Last reminder sent timestamp for collection tracking';
COMMENT ON COLUMN fee_calculations.reminder_count IS 'Number of payment reminders sent to client';

-- Create index for collection dashboard queries (status filtering)
CREATE INDEX IF NOT EXISTS idx_fee_calculations_status
  ON fee_calculations(tenant_id, status);

-- Create index for reminder engine queries (finding fees needing reminders)
CREATE INDEX IF NOT EXISTS idx_fee_calculations_reminders
  ON fee_calculations(tenant_id, last_reminder_sent_at)
  WHERE status IN ('sent', 'partial_paid');

COMMENT ON INDEX idx_fee_calculations_status IS 'Performance index for collection dashboard status filtering';
COMMENT ON INDEX idx_fee_calculations_reminders IS 'Performance index for reminder engine queries - partial index for efficiency';
-- Migration: Collection System - Extend generated_letters table
-- Description: Add email tracking (sent, opened, last opened, open count)
-- Date: 2025-10-27

-- Add email tracking columns to generated_letters
ALTER TABLE generated_letters
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN generated_letters.sent_at IS 'Timestamp when letter was sent via email';
COMMENT ON COLUMN generated_letters.opened_at IS 'First time client opened the email (tracking pixel)';
COMMENT ON COLUMN generated_letters.last_opened_at IS 'Most recent time client opened the email';
COMMENT ON COLUMN generated_letters.open_count IS 'Total number of times client opened the email';

-- Create index for collection tracking queries
CREATE INDEX IF NOT EXISTS idx_generated_letters_tracking
  ON generated_letters(tenant_id, sent_at, opened_at);

COMMENT ON INDEX idx_generated_letters_tracking IS 'Performance index for collection tracking queries (sent/opened status)';
-- Migration: Collection System - Create payment_method_selections table
-- Description: Track when clients select payment methods and discount applied
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create payment_method_selections table
CREATE TABLE IF NOT EXISTS payment_method_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,
  generated_letter_id UUID NOT NULL REFERENCES generated_letters(id) ON DELETE CASCADE,

  -- Selection details
  selected_method TEXT NOT NULL
    CHECK (selected_method IN ('bank_transfer', 'cc_single', 'cc_installments', 'checks')),
  original_amount NUMERIC(12,2) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL,
  amount_after_discount NUMERIC(12,2) NOT NULL,

  -- Completion tracking
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  completed_payment BOOLEAN DEFAULT FALSE,
  payment_transaction_id UUID REFERENCES payment_transactions(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE payment_method_selections IS 'Tracks client payment method selections and discount application';

-- Add column comments
COMMENT ON COLUMN payment_method_selections.selected_method IS 'bank_transfer (9% discount) | cc_single (8%) | cc_installments (4%) | checks (0%)';
COMMENT ON COLUMN payment_method_selections.original_amount IS 'Amount before discount applied';
COMMENT ON COLUMN payment_method_selections.discount_percent IS 'Discount percentage applied (0-9%)';
COMMENT ON COLUMN payment_method_selections.amount_after_discount IS 'Final amount client will pay';
COMMENT ON COLUMN payment_method_selections.completed_payment IS 'TRUE if payment was completed (via Cardcom webhook or manual confirmation)';

-- Create index for queries by fee_calculation_id
CREATE INDEX idx_payment_selections_fee
  ON payment_method_selections(tenant_id, fee_calculation_id);

-- Create RLS policy for tenant isolation
ALTER TABLE payment_method_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payment_method_selections
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON payment_method_selections IS 'Multi-tenant isolation - users can only access selections from their tenant';
-- Migration: Collection System - Create payment_disputes table
-- Description: Track client disputes when they claim "שילמתי" (I already paid)
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create payment_disputes table
CREATE TABLE IF NOT EXISTS payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,

  -- Client's claim
  dispute_reason TEXT,
  claimed_payment_date DATE,
  claimed_payment_method TEXT
    CHECK (claimed_payment_method IN ('bank_transfer', 'credit_card', 'check', 'cash', 'other')),
  claimed_amount NUMERIC(12,2),
  claimed_reference TEXT,

  -- Resolution
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved_paid', 'resolved_unpaid', 'invalid')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE payment_disputes IS 'Client disputes when they claim payment was already made';

-- Add column comments
COMMENT ON COLUMN payment_disputes.dispute_reason IS 'Client explanation for dispute (e.g., "שילמתי בהעברה בנקאית")';
COMMENT ON COLUMN payment_disputes.claimed_payment_date IS 'Date client claims they made payment';
COMMENT ON COLUMN payment_disputes.claimed_payment_method IS 'Payment method client claims to have used';
COMMENT ON COLUMN payment_disputes.claimed_amount IS 'Amount client claims to have paid';
COMMENT ON COLUMN payment_disputes.claimed_reference IS 'Bank reference number, check number, or transaction ID';
COMMENT ON COLUMN payment_disputes.status IS 'pending (new) | resolved_paid (confirmed) | resolved_unpaid (rejected) | invalid (false claim)';
COMMENT ON COLUMN payment_disputes.resolved_by IS 'Admin/staff user who resolved the dispute';
COMMENT ON COLUMN payment_disputes.resolution_notes IS 'Sigal notes on how dispute was resolved';

-- Create index for pending disputes (most common query)
CREATE INDEX idx_payment_disputes_pending
  ON payment_disputes(tenant_id, status)
  WHERE status = 'pending';

-- Create RLS policy for tenant isolation
ALTER TABLE payment_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payment_disputes
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON payment_disputes IS 'Multi-tenant isolation - users can only access disputes from their tenant';
-- Migration: Collection System - Create payment_reminders table
-- Description: Track all automated and manual payment reminders sent to clients
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create payment_reminders table
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type TEXT NOT NULL
    CHECK (reminder_type IN ('no_open', 'no_selection', 'abandoned_cart', 'checks_overdue', 'manual')),
  reminder_sequence INTEGER,

  -- Delivery
  sent_via TEXT
    CHECK (sent_via IN ('email', 'sms', 'both')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  template_used TEXT,

  -- Tracking
  email_opened BOOLEAN DEFAULT FALSE,
  email_opened_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE payment_reminders IS 'History of all payment reminders sent to clients (automated and manual)';

-- Add column comments
COMMENT ON COLUMN payment_reminders.reminder_type IS 'no_open (7d not opened) | no_selection (14d no payment choice) | abandoned_cart (2d Cardcom) | checks_overdue (30d) | manual (sent by Sigal)';
COMMENT ON COLUMN payment_reminders.reminder_sequence IS 'First reminder = 1, second = 2, etc.';
COMMENT ON COLUMN payment_reminders.sent_via IS 'Delivery channel: email, sms, or both';
COMMENT ON COLUMN payment_reminders.template_used IS 'Email template name used for this reminder';
COMMENT ON COLUMN payment_reminders.email_opened IS 'TRUE if client opened the reminder email (tracking pixel)';
COMMENT ON COLUMN payment_reminders.email_opened_at IS 'Timestamp when reminder email was opened';

-- Create index for reminder history queries (DESC for most recent first)
CREATE INDEX idx_payment_reminders
  ON payment_reminders(tenant_id, fee_calculation_id, sent_at DESC);

-- Create RLS policy for tenant isolation
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON payment_reminders
  FOR ALL
  USING (tenant_id = (SELECT get_current_tenant_id()));

COMMENT ON POLICY "tenant_isolation" ON payment_reminders IS 'Multi-tenant isolation - users can only access reminders from their tenant';
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
-- Migration: Collection System - Create notification_settings table
-- Description: User notification preferences for collection alerts (Sigal)
-- Date: 2025-10-27

-- Create extension for UUID generation (safe to call multiple times)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Alert thresholds (configurable by Sigal)
  notify_letter_not_opened_days INTEGER DEFAULT 7,
  notify_no_selection_days INTEGER DEFAULT 14,
  notify_abandoned_cart_days INTEGER DEFAULT 2,
  notify_checks_overdue_days INTEGER DEFAULT 30,

  -- Notification channels
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  notification_email TEXT,

  -- Reminder settings
  enable_automatic_reminders BOOLEAN DEFAULT TRUE,
  first_reminder_days INTEGER DEFAULT 14,
  second_reminder_days INTEGER DEFAULT 30,
  third_reminder_days INTEGER DEFAULT 60,

  -- Grouping
  group_daily_alerts BOOLEAN DEFAULT FALSE,
  daily_alert_time TIME DEFAULT '09:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Add table comment
COMMENT ON TABLE notification_settings IS 'User preferences for collection alerts and automatic reminders (per user, per tenant)';

-- Add column comments
COMMENT ON COLUMN notification_settings.notify_letter_not_opened_days IS 'Alert Sigal if letter not opened after X days (default: 7)';
COMMENT ON COLUMN notification_settings.notify_no_selection_days IS 'Alert Sigal if no payment method selected after X days (default: 14)';
COMMENT ON COLUMN notification_settings.notify_abandoned_cart_days IS 'Alert Sigal if Cardcom abandoned after X days (default: 2)';
COMMENT ON COLUMN notification_settings.notify_checks_overdue_days IS 'Alert Sigal if checks not received after X days (default: 30)';
COMMENT ON COLUMN notification_settings.enable_email_notifications IS 'Master toggle for email notifications';
COMMENT ON COLUMN notification_settings.notification_email IS 'Email address for notifications (default: user email from auth.users)';
COMMENT ON COLUMN notification_settings.enable_automatic_reminders IS 'Master toggle for automatic client reminders';
COMMENT ON COLUMN notification_settings.first_reminder_days IS 'Send first reminder after X days (default: 14)';
COMMENT ON COLUMN notification_settings.second_reminder_days IS 'Send second reminder after X days (default: 30)';
COMMENT ON COLUMN notification_settings.third_reminder_days IS 'Send third reminder after X days (default: 60)';
COMMENT ON COLUMN notification_settings.group_daily_alerts IS 'Group alerts into one daily summary email';
COMMENT ON COLUMN notification_settings.daily_alert_time IS 'Time to send daily alert summary (default: 09:00)';

-- Create RLS policy for user isolation (users manage their own settings)
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_isolation" ON notification_settings
  FOR ALL
  USING (user_id = auth.uid());

COMMENT ON POLICY "user_isolation" ON notification_settings IS 'Users can only access and modify their own notification settings';

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings for admin users in each tenant
-- This will be populated by application code when admins first access collection dashboard
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
-- Migration: Collection System - Helper functions and views
-- Description: Database functions and views for collection dashboard queries
-- Date: 2025-10-27

-- Function 1: Get collection statistics for dashboard KPIs
CREATE OR REPLACE FUNCTION get_collection_statistics(p_tenant_id UUID)
RETURNS TABLE (
  total_expected NUMERIC,
  total_received NUMERIC,
  total_pending NUMERIC,
  collection_rate NUMERIC,
  clients_sent INTEGER,
  clients_paid INTEGER,
  clients_pending INTEGER,
  alerts_unopened INTEGER,
  alerts_no_selection INTEGER,
  alerts_abandoned INTEGER,
  alerts_disputes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH fee_stats AS (
    SELECT
      COALESCE(SUM(total_amount), 0) as total_expected,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as total_received,
      COALESCE(SUM(CASE WHEN status IN ('sent', 'partial_paid') THEN total_amount - COALESCE(partial_payment_amount, 0) ELSE 0 END), 0) as total_pending,
      COUNT(DISTINCT CASE WHEN status IN ('sent', 'paid', 'partial_paid') THEN client_id END) as clients_sent,
      COUNT(DISTINCT CASE WHEN status = 'paid' THEN client_id END) as clients_paid,
      COUNT(DISTINCT CASE WHEN status IN ('sent', 'partial_paid') THEN client_id END) as clients_pending
    FROM fee_calculations
    WHERE tenant_id = p_tenant_id
  ),
  alert_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE gl.opened_at IS NULL AND fc.created_at < NOW() - INTERVAL '7 days') as alerts_unopened,
      COUNT(*) FILTER (WHERE gl.opened_at IS NOT NULL AND fc.payment_method_selected IS NULL AND fc.created_at < NOW() - INTERVAL '14 days') as alerts_no_selection,
      COUNT(*) FILTER (WHERE pms.completed_payment = FALSE AND pms.selected_method IN ('cc_single', 'cc_installments') AND pms.selected_at < NOW() - INTERVAL '2 days') as alerts_abandoned
    FROM fee_calculations fc
    LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
    LEFT JOIN payment_method_selections pms ON pms.fee_calculation_id = fc.id
    WHERE fc.tenant_id = p_tenant_id
      AND fc.status IN ('sent', 'partial_paid')
  ),
  dispute_stats AS (
    SELECT COUNT(*) as alerts_disputes
    FROM payment_disputes
    WHERE tenant_id = p_tenant_id
      AND status = 'pending'
  )
  SELECT
    fs.total_expected,
    fs.total_received,
    fs.total_pending,
    CASE
      WHEN fs.total_expected > 0 THEN ROUND((fs.total_received / fs.total_expected) * 100, 2)
      ELSE 0
    END as collection_rate,
    fs.clients_sent::INTEGER,
    fs.clients_paid::INTEGER,
    fs.clients_pending::INTEGER,
    als.alerts_unopened::INTEGER,
    als.alerts_no_selection::INTEGER,
    als.alerts_abandoned::INTEGER,
    ds.alerts_disputes::INTEGER
  FROM fee_stats fs
  CROSS JOIN alert_stats als
  CROSS JOIN dispute_stats ds;
END;
$$;

COMMENT ON FUNCTION get_collection_statistics(UUID) IS 'Returns collection dashboard KPIs for a tenant';

-- Function 2: Get fees needing reminders (used by reminder engine)
CREATE OR REPLACE FUNCTION get_fees_needing_reminders(p_tenant_id UUID, p_rule_id UUID)
RETURNS TABLE (
  fee_calculation_id UUID,
  client_id UUID,
  client_email TEXT,
  amount NUMERIC,
  days_since_sent INTEGER,
  opened BOOLEAN,
  payment_method_selected TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conditions JSONB;
  v_days_since_sent INTEGER;
  v_payment_status TEXT[];
  v_opened BOOLEAN;
  v_payment_method_selected TEXT;
BEGIN
  -- Get rule conditions
  SELECT trigger_conditions INTO v_conditions
  FROM reminder_rules
  WHERE id = p_rule_id AND tenant_id = p_tenant_id AND is_active = TRUE;

  IF v_conditions IS NULL THEN
    RETURN;
  END IF;

  -- Extract conditions
  v_days_since_sent := (v_conditions->>'days_since_sent')::INTEGER;
  v_payment_status := ARRAY(SELECT jsonb_array_elements_text(v_conditions->'payment_status'));
  v_opened := (v_conditions->>'opened')::BOOLEAN;
  v_payment_method_selected := v_conditions->>'payment_method_selected';

  RETURN QUERY
  SELECT
    fc.id as fee_calculation_id,
    fc.client_id,
    c.contact_email as client_email,
    fc.total_amount as amount,
    EXTRACT(DAY FROM NOW() - fc.created_at)::INTEGER as days_since_sent,
    (gl.opened_at IS NOT NULL) as opened,
    fc.payment_method_selected
  FROM fee_calculations fc
  JOIN clients c ON c.id = fc.client_id
  LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
  WHERE fc.tenant_id = p_tenant_id
    AND fc.status = ANY(v_payment_status)
    AND EXTRACT(DAY FROM NOW() - fc.created_at) >= v_days_since_sent
    AND (v_opened IS NULL OR (gl.opened_at IS NOT NULL) = v_opened)
    AND (v_payment_method_selected IS NULL OR fc.payment_method_selected IS NULL)
    AND (fc.last_reminder_sent_at IS NULL OR fc.last_reminder_sent_at < NOW() - INTERVAL '7 days');
END;
$$;

COMMENT ON FUNCTION get_fees_needing_reminders(UUID, UUID) IS 'Returns fees matching a reminder rule criteria for automated reminder engine';

-- View 1: Collection Dashboard View (combines multiple tables)
CREATE OR REPLACE VIEW collection_dashboard_view AS
SELECT
  fc.id as fee_calculation_id,
  fc.tenant_id,
  fc.client_id,
  c.company_name,
  c.company_name_hebrew,
  c.contact_email,
  c.contact_phone,

  -- Letter tracking
  gl.sent_at as letter_sent_date,
  gl.opened_at as letter_opened_at,
  gl.open_count as letter_open_count,
  EXTRACT(DAY FROM NOW() - gl.sent_at)::INTEGER as days_since_sent,

  -- Payment
  fc.total_amount as amount_original,
  fc.payment_method_selected,
  fc.amount_after_selected_discount,
  fc.status as payment_status,
  fc.partial_payment_amount as amount_paid,
  fc.total_amount - COALESCE(fc.partial_payment_amount, 0) as amount_remaining,

  -- Reminders
  fc.reminder_count,
  fc.last_reminder_sent_at,

  -- Disputes
  (SELECT COUNT(*) FROM payment_disputes pd WHERE pd.fee_calculation_id = fc.id AND pd.status = 'pending') > 0 as has_dispute,

  -- Interactions
  (SELECT MAX(interacted_at) FROM client_interactions ci WHERE ci.fee_calculation_id = fc.id) as last_interaction,
  (SELECT COUNT(*) FROM client_interactions ci WHERE ci.fee_calculation_id = fc.id) as interaction_count

FROM fee_calculations fc
JOIN clients c ON c.id = fc.client_id
LEFT JOIN generated_letters gl ON gl.fee_calculation_id = fc.id
WHERE fc.status IN ('sent', 'paid', 'partial_paid');

COMMENT ON VIEW collection_dashboard_view IS 'Combined view for collection dashboard - includes all relevant data for Sigal collection tracking';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_collection_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fees_needing_reminders(UUID, UUID) TO authenticated;
GRANT SELECT ON collection_dashboard_view TO authenticated;
