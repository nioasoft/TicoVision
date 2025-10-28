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
