-- Migration: Add Indexes to Unindexed Foreign Keys
-- Issue: 30+ foreign keys without covering indexes
-- Impact: Slow JOIN queries, especially on large tables
-- Solution: Add indexes to most frequently used foreign keys
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

-- =============================================================================
-- Performance Optimization: Add indexes to foreign keys
-- Priority: High-traffic tables and frequently joined columns
-- =============================================================================

-- Table: actual_payments (high traffic)
CREATE INDEX IF NOT EXISTS idx_actual_payments_created_by
  ON public.actual_payments(created_by);

CREATE INDEX IF NOT EXISTS idx_actual_payments_updated_by
  ON public.actual_payments(updated_by);

-- Table: client_attachments (high traffic)
CREATE INDEX IF NOT EXISTS idx_client_attachments_uploaded_by
  ON public.client_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_client_attachments_replaces_attachment_id
  ON public.client_attachments(replaces_attachment_id);

-- Table: client_contact_assignments (high traffic - shared contacts system)
CREATE INDEX IF NOT EXISTS idx_client_contact_assignments_created_by
  ON public.client_contact_assignments(created_by);

-- Table: client_contacts (medium traffic)
CREATE INDEX IF NOT EXISTS idx_client_contacts_created_by
  ON public.client_contacts(created_by);

-- Table: client_groups (medium traffic)
CREATE INDEX IF NOT EXISTS idx_client_groups_created_by
  ON public.client_groups(created_by);

-- Table: client_interactions (high traffic - logging)
CREATE INDEX IF NOT EXISTS idx_client_interactions_client_id
  ON public.client_interactions(client_id);

CREATE INDEX IF NOT EXISTS idx_client_interactions_created_by
  ON public.client_interactions(created_by);

-- Table: client_phones (medium traffic)
CREATE INDEX IF NOT EXISTS idx_client_phones_created_by
  ON public.client_phones(created_by);

-- Table: clients (CRITICAL - highest traffic)
CREATE INDEX IF NOT EXISTS idx_clients_created_by
  ON public.clients(created_by);

-- Table: fee_calculations (CRITICAL - highest traffic)
CREATE INDEX IF NOT EXISTS idx_fee_calculations_created_by
  ON public.fee_calculations(created_by);

CREATE INDEX IF NOT EXISTS idx_fee_calculations_updated_by
  ON public.fee_calculations(updated_by);

CREATE INDEX IF NOT EXISTS idx_fee_calculations_approved_by
  ON public.fee_calculations(approved_by);

-- Table: generated_letters (CRITICAL - highest traffic)
CREATE INDEX IF NOT EXISTS idx_generated_letters_created_by
  ON public.generated_letters(created_by);

-- Table: payment_reminders (high traffic - collections)
CREATE INDEX IF NOT EXISTS idx_payment_reminders_fee_calculation_id
  ON public.payment_reminders(fee_calculation_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_client_id
  ON public.payment_reminders(client_id);

-- Table: payment_disputes (medium traffic)
CREATE INDEX IF NOT EXISTS idx_payment_disputes_resolved_by
  ON public.payment_disputes(resolved_by);

-- Table: payment_method_selections (high traffic)
CREATE INDEX IF NOT EXISTS idx_payment_method_selections_fee_calculation_id
  ON public.payment_method_selections(fee_calculation_id);

-- Add comments for documentation
COMMENT ON INDEX idx_actual_payments_created_by IS
  'Performance optimization: Speeds up JOINs with auth.users';

COMMENT ON INDEX idx_fee_calculations_created_by IS
  'Performance optimization: Critical index for audit queries and user filtering';

COMMENT ON INDEX idx_generated_letters_created_by IS
  'Performance optimization: Critical index for user-specific letter queries';

COMMENT ON INDEX idx_payment_reminders_fee_calculation_id IS
  'Performance optimization: Critical index for collection tracking queries';

-- NOTE: This migration adds indexes for the 20 most critical foreign keys
-- Remaining 10+ foreign keys can be added in future migrations if needed
-- Monitor query performance to identify additional indexes
