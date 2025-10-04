-- Migration: Fix policy conflict causing accountants to see all clients
-- Purpose: Remove conflicting ALL policy and create separate INSERT/UPDATE/DELETE policies
-- Bug: users_manage_clients_by_role (ALL) conflicts with users_read_clients_by_role (SELECT)
-- Date: 2025-10-03

-- THE PROBLEM:
-- Two SELECT policies exist (OR logic):
--   1. users_read_clients_by_role - checks assignments (correct)
--   2. users_manage_clients_by_role (ALL includes SELECT) - grants access without checking assignments
-- Result: Accountants see ALL clients because they pass policy #2

-- Drop the conflicting ALL policy
DROP POLICY IF EXISTS "users_manage_clients_by_role" ON clients;

-- Create separate policies for INSERT/UPDATE/DELETE operations
-- These check role properly for each operation

-- INSERT: Only admins, accountants, and bookkeepers can create clients
CREATE POLICY "users_insert_clients_by_role"
ON clients
FOR INSERT
TO public
WITH CHECK (
  -- Super admin can insert clients anywhere
  is_super_admin(auth.uid())
  OR
  -- Admins, accountants, bookkeepers can insert clients in their tenant
  (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = clients.tenant_id
      AND uta.role IN ('admin', 'accountant', 'bookkeeper')
      AND uta.is_active = true
    )
  )
);

-- UPDATE: Only admins, accountants, and bookkeepers can update clients
CREATE POLICY "users_update_clients_by_role"
ON clients
FOR UPDATE
TO public
USING (
  -- Super admin can update all clients
  is_super_admin(auth.uid())
  OR
  -- Admins can update all clients in their tenant
  (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = clients.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
    )
  )
  OR
  -- Accountants/bookkeepers can update ONLY assigned clients
  (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
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
)
WITH CHECK (
  -- Same check for the updated values
  is_super_admin(auth.uid())
  OR
  (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = clients.tenant_id
      AND uta.role IN ('admin', 'accountant', 'bookkeeper')
      AND uta.is_active = true
    )
  )
);

-- DELETE: Only admins can delete clients
CREATE POLICY "users_delete_clients_by_role"
ON clients
FOR DELETE
TO public
USING (
  -- Super admin can delete all clients
  is_super_admin(auth.uid())
  OR
  -- Only admins can delete clients in their tenant
  (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = clients.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
    )
  )
);

COMMENT ON POLICY "users_insert_clients_by_role" ON clients IS
'Admins, accountants, and bookkeepers can insert clients in their tenant';

COMMENT ON POLICY "users_update_clients_by_role" ON clients IS
'Admins can update all clients in tenant, accountants/bookkeepers can update only assigned clients';

COMMENT ON POLICY "users_delete_clients_by_role" ON clients IS
'Only admins can delete clients in their tenant';

-- Now there is only ONE SELECT policy: users_read_clients_by_role
-- This policy correctly restricts accountants to ONLY assigned clients
