-- Migration: Fix users_read_clients_by_role fallback clause
-- Purpose: Add role='client' check to fallback OR condition
-- Bug: Lines 52-59 in Migration 017 grant access based on assignment without checking role
-- Date: 2025-10-03

-- THE PROBLEM:
-- The policy has 3 OR conditions:
--   1. is_admin() - Correct
--   2. (is_accountant/bookkeeper AND has_assignment) - Correct
--   3. has_assignment - BUG! Should be (is_client AND has_assignment)
--
-- PostgreSQL RLS uses OR logic, so condition #3 grants access to anyone with assignments
-- including accountants, bypassing the restrictions in condition #2

DROP POLICY IF EXISTS "users_read_clients_by_role" ON clients;

CREATE POLICY "users_read_clients_by_role"
ON clients
FOR SELECT
TO public
USING (
  -- Super admin sees all clients
  is_super_admin(auth.uid())
  OR
  -- Regular users see clients from their tenant based on role
  (
    tenant_id = get_current_tenant_id()
    AND
    (
      -- Admins see ALL clients in their tenant
      EXISTS (
        SELECT 1
        FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
        AND uta.tenant_id = clients.tenant_id
        AND uta.role = 'admin'
        AND uta.is_active = true
      )
      OR
      -- Accountants and bookkeepers see ONLY assigned clients
      (
        EXISTS (
          SELECT 1
          FROM user_tenant_access uta
          WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = clients.tenant_id
          AND uta.role IN ('accountant', 'bookkeeper')
          AND uta.is_active = true
        )
        AND EXISTS (
          SELECT 1
          FROM user_client_assignments uca
          WHERE uca.user_id = auth.uid()
          AND uca.client_id = clients.id
          AND uca.tenant_id = clients.tenant_id
        )
      )
      OR
      -- Client role users ONLY see their assigned clients (FIXED: Added role check)
      (
        EXISTS (
          SELECT 1
          FROM user_tenant_access uta
          WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = clients.tenant_id
          AND uta.role = 'client'
          AND uta.is_active = true
        )
        AND EXISTS (
          SELECT 1
          FROM user_client_assignments uca
          WHERE uca.user_id = auth.uid()
          AND uca.client_id = clients.id
          AND uca.tenant_id = clients.tenant_id
        )
      )
    )
  )
);

COMMENT ON POLICY "users_read_clients_by_role" ON clients IS
'Users can read clients based on role: super_admin (all), admin (all in tenant), accountant/bookkeeper (only assigned), client (only assigned). Each role explicitly checked to prevent bypass.';

-- ============================================================================
-- BEFORE vs AFTER
-- ============================================================================
-- BEFORE (Migration 017):
-- OR EXISTS (assignment check without role check)
-- Result: Accountants could bypass restriction via fallback clause
--
-- AFTER (Migration 026):
-- OR (is_client AND EXISTS(assignment check))
-- Result: Only client role can use fallback clause, accountants restricted to condition #2
