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
