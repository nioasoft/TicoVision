-- Add penalty management to capital declarations
-- Migration: 20251228_add_penalty_management.sql
-- Purpose: Add submission tracking, late submission flag, and penalty management

-- ============================================================================
-- PART A: Submission Tracking Fields
-- ============================================================================

-- Add submission screenshot path (single file)
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS submission_screenshot_path TEXT;

-- Add actual submission timestamp
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- Add late submission flag
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS was_submitted_late BOOLEAN DEFAULT FALSE;

-- Comments
COMMENT ON COLUMN capital_declarations.submission_screenshot_path IS 'Storage path to submission proof screenshot from tax authority';
COMMENT ON COLUMN capital_declarations.submitted_at IS 'Timestamp when declaration was actually submitted to tax authority';
COMMENT ON COLUMN capital_declarations.was_submitted_late IS 'Flag indicating if submission was made after the deadline';

-- ============================================================================
-- PART B: Penalty Status Enum
-- ============================================================================

-- Create penalty status enum type
DO $$ BEGIN
    CREATE TYPE penalty_status AS ENUM (
        'received',          -- התקבל - penalty notice received
        'appeal_submitted',  -- הוגש ערעור - appeal filed
        'cancelled',         -- נמחק - penalty was cancelled
        'paid_by_client',    -- שולם על ידי לקוח - client paid
        'paid_by_office'     -- שולם על ידי משרד - office paid
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART C: Penalty Fields
-- ============================================================================

-- Add penalty amount
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_amount NUMERIC(12,2);

-- Add penalty status
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_status penalty_status;

-- Add penalty received date
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_received_date DATE;

-- Add penalty notes
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_notes TEXT;

-- Comments
COMMENT ON COLUMN capital_declarations.penalty_amount IS 'Original penalty amount in NIS';
COMMENT ON COLUMN capital_declarations.penalty_status IS 'Current status of the penalty: received, appeal_submitted, cancelled, paid_by_client, paid_by_office';
COMMENT ON COLUMN capital_declarations.penalty_received_date IS 'Date when penalty notice was received';
COMMENT ON COLUMN capital_declarations.penalty_notes IS 'General notes about the penalty';

-- ============================================================================
-- PART D: Appeal Fields
-- ============================================================================

-- Add appeal date
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS appeal_date DATE;

-- Add appeal notes
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS appeal_notes TEXT;

-- Comments
COMMENT ON COLUMN capital_declarations.appeal_date IS 'Date when appeal was submitted';
COMMENT ON COLUMN capital_declarations.appeal_notes IS 'Notes about the appeal';

-- ============================================================================
-- PART E: Payment Fields
-- ============================================================================

-- Add penalty paid date
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_paid_date DATE;

-- Add actual penalty amount paid
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_paid_amount NUMERIC(12,2);

-- Add who paid (client or office)
ALTER TABLE capital_declarations
ADD COLUMN IF NOT EXISTS penalty_paid_by TEXT CHECK (penalty_paid_by IS NULL OR penalty_paid_by IN ('client', 'office'));

-- Comments
COMMENT ON COLUMN capital_declarations.penalty_paid_date IS 'Date when penalty was paid';
COMMENT ON COLUMN capital_declarations.penalty_paid_amount IS 'Actual amount paid (may differ from original penalty)';
COMMENT ON COLUMN capital_declarations.penalty_paid_by IS 'Who paid the penalty: client or office';

-- ============================================================================
-- PART F: Performance Indexes
-- ============================================================================

-- Index for filtering declarations with penalties
CREATE INDEX IF NOT EXISTS idx_capital_declarations_has_penalty
ON capital_declarations(tenant_id, penalty_status)
WHERE penalty_status IS NOT NULL;

-- Index for late submissions
CREATE INDEX IF NOT EXISTS idx_capital_declarations_late_submission
ON capital_declarations(tenant_id, was_submitted_late)
WHERE was_submitted_late = TRUE;

-- Index for submitted declarations
CREATE INDEX IF NOT EXISTS idx_capital_declarations_submitted
ON capital_declarations(tenant_id, status)
WHERE status = 'submitted';
