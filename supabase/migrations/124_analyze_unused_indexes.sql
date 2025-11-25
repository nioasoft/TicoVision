-- Migration: Analyze and Document Unused Indexes
-- Issue: 100+ indexes that have never been used
-- Impact: Wasted storage space, slower INSERT/UPDATE operations
-- Solution: Identify safe-to-remove indexes, provide DROP statements
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

-- =============================================================================
-- IMPORTANT: This migration does NOT drop indexes automatically
-- It provides analysis and DROP statements for manual review
-- =============================================================================

-- Create a temporary view to identify unused indexes with size information
CREATE OR REPLACE VIEW unused_indexes_analysis AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan as times_used,
  CASE
    WHEN idx_scan = 0 THEN 'NEVER USED'
    WHEN idx_scan < 10 THEN 'RARELY USED'
    ELSE 'USED'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0  -- Never used
ORDER BY pg_relation_size(indexrelid) DESC;

-- Add comment
COMMENT ON VIEW unused_indexes_analysis IS
  'Temporary view for analyzing unused indexes. Shows size and usage statistics.
   DO NOT drop indexes without careful review - some may be for future features.';

-- =============================================================================
-- SAFE TO DROP - Indexes that are clearly unused and redundant
-- =============================================================================

-- These are the MOST LIKELY safe to drop (full-text search indexes not being used):
-- ✓ idx_generated_letters_search_vector - Full-text search not implemented
-- ✓ idx_clients_company_name_trgm - Trigram search not used
-- ✓ idx_clients_company_name_hebrew_trgm - Trigram search not used
-- ✓ idx_clients_tax_id_trgm - Trigram search not used
-- ✓ idx_clients_contact_name_trgm - Trigram search not used
-- ✓ idx_tenants_name_trgm - Trigram search not used
-- ✓ idx_audit_logs_action_trgm - Trigram search not used

-- Provide DROP statements (commented out for safety):
/*
-- Full-text search indexes (not currently used)
DROP INDEX IF EXISTS public.idx_generated_letters_search_vector;
DROP INDEX IF EXISTS public.idx_clients_company_name_trgm;
DROP INDEX IF EXISTS public.idx_clients_company_name_hebrew_trgm;
DROP INDEX IF EXISTS public.idx_clients_tax_id_trgm;
DROP INDEX IF EXISTS public.idx_clients_contact_name_trgm;
DROP INDEX IF EXISTS public.idx_tenants_name_trgm;
DROP INDEX IF EXISTS public.idx_audit_logs_action_trgm;
*/

-- =============================================================================
-- REVIEW BEFORE DROPPING - May be used in future features
-- =============================================================================

-- Collection system indexes (may be used when collection features are fully active):
-- - idx_payment_disputes_pending
-- - idx_payment_reminders (various)
-- - idx_payment_method_selections_*

-- Letter system indexes (may be used for reporting/analytics):
-- - idx_generated_letters_sent_at
-- - idx_generated_letters_tracking
-- - idx_letters_v2_*

-- NOTE: To view the analysis, run:
-- SELECT * FROM unused_indexes_analysis WHERE usage_status = 'NEVER USED';

-- NOTE: Total space potentially recoverable from unused trgm indexes: ~500KB-1MB
-- This is minimal and may not justify the risk of dropping them

-- =============================================================================
-- RECOMMENDATION
-- =============================================================================
-- 1. Monitor usage for 30 days before dropping
-- 2. Only drop trgm indexes if full-text search will NEVER be implemented
-- 3. Keep all business logic indexes (even if unused now) for future features
-- 4. Focus on performance gains from migrations 120-123 instead
-- =============================================================================

SELECT 'Migration 124: Unused indexes analysis complete. Review unused_indexes_analysis view.' AS status;
