-- Migration: Add missing indexes on foreign keys
-- Date: 2025-11-04
-- Purpose: Add B-tree indexes on all foreign key columns that are missing them
--
-- Performance Impact: HIGH
-- - Speeds up JOIN operations by 10-100x
-- - Reduces query time for foreign key lookups
-- - Critical for queries with WHERE clauses on foreign keys
--
-- Tables affected: 12 foreign keys across 7 tables

-- ============================================================================
-- 1. client_interactions table
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_client_interactions_fee_calculation_id
  ON client_interactions(fee_calculation_id);

COMMENT ON INDEX idx_client_interactions_fee_calculation_id IS
'Performance: Speeds up lookups of interactions by fee calculation (used in collection dashboard view)';

-- ============================================================================
-- 2. fee_calculations table
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fee_calculations_fee_type_id
  ON fee_calculations(fee_type_id);

COMMENT ON INDEX idx_fee_calculations_fee_type_id IS
'Performance: Speeds up filtering fees by type (annual, bookkeeping, etc.)';

-- ============================================================================
-- 3. generated_letters table
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_generated_letters_template_id
  ON generated_letters(template_id);

COMMENT ON INDEX idx_generated_letters_template_id IS
'Performance: Speeds up grouping letters by template type';

-- ============================================================================
-- 4. letter_templates table (2 indexes)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_letter_templates_header_template_id
  ON letter_templates(header_template_id);

CREATE INDEX IF NOT EXISTS idx_letter_templates_footer_template_id
  ON letter_templates(footer_template_id);

COMMENT ON INDEX idx_letter_templates_header_template_id IS
'Performance: Speeds up template loading with header components';

COMMENT ON INDEX idx_letter_templates_footer_template_id IS
'Performance: Speeds up template loading with footer components';

-- ============================================================================
-- 5. payment_disputes table (2 indexes)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_disputes_client_id
  ON payment_disputes(client_id);

CREATE INDEX IF NOT EXISTS idx_payment_disputes_fee_calculation_id
  ON payment_disputes(fee_calculation_id);

COMMENT ON INDEX idx_payment_disputes_client_id IS
'Performance: Speeds up finding all disputes for a client';

COMMENT ON INDEX idx_payment_disputes_fee_calculation_id IS
'Performance: Critical for collection dashboard - checks if fee has dispute';

-- ============================================================================
-- 6. payment_method_selections table (3 indexes)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_method_selections_client_id
  ON payment_method_selections(client_id);

CREATE INDEX IF NOT EXISTS idx_payment_method_selections_generated_letter_id
  ON payment_method_selections(generated_letter_id);

CREATE INDEX IF NOT EXISTS idx_payment_method_selections_payment_transaction_id
  ON payment_method_selections(payment_transaction_id);

COMMENT ON INDEX idx_payment_method_selections_client_id IS
'Performance: Speeds up finding payment method choices by client';

COMMENT ON INDEX idx_payment_method_selections_generated_letter_id IS
'Performance: Speeds up tracking which letter led to payment selection';

COMMENT ON INDEX idx_payment_method_selections_payment_transaction_id IS
'Performance: Speeds up linking payment selections to Cardcom transactions';

-- ============================================================================
-- 7. payment_reminders table
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_reminders_client_id
  ON payment_reminders(client_id);

COMMENT ON INDEX idx_payment_reminders_client_id IS
'Performance: Speeds up finding all reminders sent to a client';

-- ============================================================================
-- 8. user_client_assignments table
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_client_assignments_tenant_id
  ON user_client_assignments(tenant_id);

COMMENT ON INDEX idx_user_client_assignments_tenant_id IS
'Performance: Speeds up filtering user-client assignments by tenant';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all indexes were created:
--
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
--   AND indexname IN (
--     'idx_client_interactions_fee_calculation_id',
--     'idx_fee_calculations_fee_type_id',
--     'idx_generated_letters_template_id',
--     'idx_letter_templates_header_template_id',
--     'idx_letter_templates_footer_template_id',
--     'idx_payment_disputes_client_id',
--     'idx_payment_disputes_fee_calculation_id',
--     'idx_payment_method_selections_client_id',
--     'idx_payment_method_selections_generated_letter_id',
--     'idx_payment_method_selections_payment_transaction_id',
--     'idx_payment_reminders_client_id',
--     'idx_user_client_assignments_tenant_id'
--   )
-- ORDER BY tablename, indexname;

-- ============================================================================
-- Performance Impact Analysis
-- ============================================================================
-- Before: JOIN on unindexed foreign key = Sequential Scan (slow)
-- After:  JOIN on indexed foreign key = Index Scan (10-100x faster)
--
-- Most Critical Indexes (immediate impact):
-- 1. idx_payment_disputes_fee_calculation_id - Used in collection_dashboard_view
-- 2. idx_client_interactions_fee_calculation_id - Used in collection_dashboard_view
-- 3. idx_payment_method_selections_fee_calculation_id - Already exists
-- 4. idx_fee_calculations_fee_type_id - Used in fee filtering/reports
