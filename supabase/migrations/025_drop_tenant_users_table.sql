-- Migration: Drop deprecated tenant_users table
-- Purpose: Complete migration from tenant_users to user_tenant_access
-- Prerequisites: All policies, functions, and views have been migrated
-- Date: 2025-10-03

-- ============================================================================
-- SAFETY CHECK: Verify no remaining dependencies
-- ============================================================================
-- Before running this migration, we verified:
-- ✅ All 9 RLS policies migrated to use user_tenant_access (Migration 020)
-- ✅ All 3 functions migrated to use user_tenant_access (Migration 023)
-- ✅ user_profiles view dropped (Migration 024)
-- ✅ No foreign keys pointing TO tenant_users
-- ✅ RLS policies on tenant_users will be dropped with the table
-- ✅ Triggers on tenant_users will be dropped with the table
-- ✅ Indexes on tenant_users will be dropped with the table

-- ============================================================================
-- DROP THE DEPRECATED TABLE
-- ============================================================================

-- CASCADE will automatically drop:
-- - All RLS policies on this table
-- - All triggers on this table
-- - All indexes on this table
-- - Any remaining dependencies
DROP TABLE IF EXISTS tenant_users CASCADE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After this migration:
-- ✅ tenant_users table completely removed
-- ✅ All authorization now uses user_tenant_access table
-- ✅ Role-based access control fully implemented with client assignments
-- ✅ Database is cleaner and follows the correct architecture

COMMENT ON TABLE user_tenant_access IS
'Multi-tenant access control - REPLACES deprecated tenant_users table. Source of truth for user-tenant-role relationships.';

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Migrations 016-025 completed a full architecture overhaul:
--
-- Migration 016: Created user_client_assignments table
-- Migration 017: Fixed clients RLS policy for accountant assignments
-- Migration 018: Fixed get_users_for_tenant() role hierarchy
-- Migration 019: Removed conflicting users_manage_clients_by_role policy
-- Migration 020: Migrated 9 RLS policies from tenant_users to user_tenant_access
-- Migration 021: Fixed RPC security in get_client_statistics
-- Migration 022: Removed old broad tenant_* policies from clients
-- Migration 023: Migrated 3 functions from tenant_users to user_tenant_access
-- Migration 024: Dropped user_profiles view
-- Migration 025: Dropped tenant_users table (THIS MIGRATION)
--
-- Result: Clean, secure, role-based multi-tenant architecture
