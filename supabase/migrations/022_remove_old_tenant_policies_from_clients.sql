-- Migration: Remove old broad tenant policies from clients table
-- Purpose: These policies conflict with the new role-based policies
-- Bug: clients_tenant_* policies grant access to ALL users in tenant without checking role/assignments
-- Date: 2025-10-03

-- THE PROBLEM:
-- Old policies from migration 001_initial_schema.sql still exist:
--   - clients_tenant_read (SELECT) - Allows ANY user in tenant to see ALL clients
--   - clients_tenant_insert (INSERT) - Allows ANY user in tenant to create clients
--   - clients_tenant_update (UPDATE) - Allows ANY user in tenant to update ALL clients
--   - clients_tenant_delete (DELETE) - Allows ANY user in tenant to delete ALL clients
--
-- These conflict with the new role-based policies:
--   - users_read_clients_by_role - Checks assignments for accountants
--   - users_insert_clients_by_role - Checks role permissions
--   - users_update_clients_by_role - Checks assignments for accountants
--   - users_delete_clients_by_role - Admin only
--
-- PostgreSQL uses OR logic: if ANY policy passes, access is granted
-- Result: Accountants see ALL clients because they pass clients_tenant_read

-- Drop all 4 old broad policies
DROP POLICY IF EXISTS "clients_tenant_read" ON clients;
DROP POLICY IF EXISTS "clients_tenant_insert" ON clients;
DROP POLICY IF EXISTS "clients_tenant_update" ON clients;
DROP POLICY IF EXISTS "clients_tenant_delete" ON clients;

-- After this migration, ONLY the role-based policies remain:
-- ✅ users_read_clients_by_role (SELECT) - Accountants see ONLY assigned clients
-- ✅ users_insert_clients_by_role (INSERT) - Admin/accountant/bookkeeper can create
-- ✅ users_update_clients_by_role (UPDATE) - Accountants can update ONLY assigned clients
-- ✅ users_delete_clients_by_role (DELETE) - Admin only

COMMENT ON TABLE clients IS
'Client companies managed by accounting firms. RLS enforced with role-based policies only.';
