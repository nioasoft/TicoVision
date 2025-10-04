-- Migration: Drop user_profiles view that depends on tenant_users
-- Purpose: Remove last view dependency before dropping tenant_users table
-- Date: 2025-10-03

-- Drop the view (it references tenant_users)
DROP VIEW IF EXISTS user_profiles CASCADE;

-- Note: This view was created in migration 003_missing_functions.sql
-- It provided safe access to auth.users data combined with tenant_users
-- Now we have better alternatives:
--   - Use get_users_for_tenant() function (already migrated to user_tenant_access)
--   - Use list_users_with_auth() function (already migrated to user_tenant_access)
--   - Query user_tenant_access directly with proper RLS policies

COMMENT ON SCHEMA public IS
'Public schema - user_profiles view removed, use get_users_for_tenant() or list_users_with_auth() instead';
