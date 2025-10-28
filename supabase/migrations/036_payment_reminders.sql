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
