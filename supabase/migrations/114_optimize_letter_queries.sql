-- Migration: Optimize letter queries with composite indexes
-- Date: 2025-11-19
-- Purpose: Add composite indexes for common query patterns in letter system

-- Analysis of common queries:
-- 1. List letters by tenant + status + created_at (most common - letter history)
-- 2. List letters by tenant + client_id + created_at (client's letter history)
-- 3. Search letters by tenant + search_vector (full-text search)
-- 4. List fee letters by tenant + fee_calculation_id (fee-related letters)

-- ============================================================================
-- COMPOSITE INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Index 1: Tenant + Status + Created_At (DESC)
-- Used by: LetterHistoryPage, getAllLetters() with status filter
-- Query pattern: WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_status_created
  ON generated_letters(tenant_id, status, created_at DESC);

COMMENT ON INDEX idx_generated_letters_tenant_status_created IS
'Optimizes letter history queries filtered by status (sent_email, draft, saved). Used in LetterHistoryPage.';

-- Index 2: Tenant + Client + Created_At (DESC)
-- Used by: Client letter history, groupByClient() queries
-- Query pattern: WHERE tenant_id = ? AND client_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_client_created
  ON generated_letters(tenant_id, client_id, created_at DESC)
  WHERE client_id IS NOT NULL;

COMMENT ON INDEX idx_generated_letters_tenant_client_created IS
'Optimizes queries for letters by specific client. Partial index (excludes NULL client_id). Used in client history views.';

-- Index 3: Tenant + Fee Calculation (for fee letters only)
-- Used by: Fee tracking, showOnlyFeeLetters filter
-- Query pattern: WHERE tenant_id = ? AND fee_calculation_id IS NOT NULL
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_fee
  ON generated_letters(tenant_id, fee_calculation_id, created_at DESC)
  WHERE fee_calculation_id IS NOT NULL;

COMMENT ON INDEX idx_generated_letters_tenant_fee IS
'Optimizes queries for fee-related letters only. Partial index. Used in fee tracking and feeLettersOnly filter.';

-- Index 4: Tenant + Template Type (for template filtering)
-- Used by: Template filter in LetterHistoryPage
-- Query pattern: WHERE tenant_id = ? AND template_type = ?
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_template
  ON generated_letters(tenant_id, template_type, created_at DESC)
  WHERE template_type IS NOT NULL;

COMMENT ON INDEX idx_generated_letters_tenant_template IS
'Optimizes queries filtered by template type (external, internal_audit, bookkeeping, retainer). Partial index.';

-- Index 5: Tenant + Created_At + Status (covering index)
-- Used by: General letter listing with date range
-- Query pattern: WHERE tenant_id = ? AND created_at BETWEEN ? AND ? AND status IN (?)
CREATE INDEX IF NOT EXISTS idx_generated_letters_tenant_created_status
  ON generated_letters(tenant_id, created_at DESC, status);

COMMENT ON INDEX idx_generated_letters_tenant_created_status IS
'Covering index for date-range queries with status filter. Used in advanced filters with dateFrom/dateTo.';

-- ============================================================================
-- ANALYZE EXISTING INDEXES
-- ============================================================================

-- Already exists from migration 113:
-- idx_generated_letters_search_vector (GIN index for full-text search)

-- Already exists from previous migrations (check):
-- idx_generated_letters_tenant_id (basic tenant filtering)
-- idx_generated_letters_client_id (basic client filtering)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all new indexes were created
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'generated_letters'
  AND indexname IN (
    'idx_generated_letters_tenant_status_created',
    'idx_generated_letters_tenant_client_created',
    'idx_generated_letters_tenant_fee',
    'idx_generated_letters_tenant_template',
    'idx_generated_letters_tenant_created_status'
  );

  IF index_count < 5 THEN
    RAISE EXCEPTION 'Migration failed: Expected 5 new indexes, found %', index_count;
  END IF;

  RAISE NOTICE 'Successfully created 5 composite indexes on generated_letters';
END $$;

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

-- Expected improvements:
-- 1. Letter history queries: 10-50x faster (depending on dataset size)
-- 2. Client letter history: 20-100x faster
-- 3. Fee letter filtering: 15-30x faster
-- 4. Template type filtering: 10-20x faster
-- 5. Date range queries: 5-15x faster

-- Index sizes (estimated for 10,000 letters):
-- idx_generated_letters_tenant_status_created: ~500 KB
-- idx_generated_letters_tenant_client_created: ~400 KB (partial)
-- idx_generated_letters_tenant_fee: ~200 KB (partial)
-- idx_generated_letters_tenant_template: ~300 KB (partial)
-- idx_generated_letters_tenant_created_status: ~500 KB

-- Total additional storage: ~2 MB for 10,000 letters (negligible)

-- ============================================================================
-- MAINTENANCE
-- ============================================================================

-- Indexes are automatically maintained by PostgreSQL
-- Run ANALYZE after bulk inserts:
-- ANALYZE generated_letters;

-- Check index usage (after some time in production):
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename = 'generated_letters'
-- ORDER BY idx_scan DESC;
