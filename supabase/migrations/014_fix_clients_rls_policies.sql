-- Migration: Fix clients RLS policies to use user_tenant_access instead of tenant_users
-- Purpose: tenant_users is DEPRECATED - all policies must use user_tenant_access
-- Date: 2025-10-03

-- Drop old policies that reference deprecated tenant_users table
DROP POLICY IF EXISTS "Accountants and admins can manage clients" ON clients;
DROP POLICY IF EXISTS "admins_manage_clients" ON clients;
DROP POLICY IF EXISTS "users_view_assigned_clients" ON clients;

-- Create unified SELECT policy that supports all roles
CREATE POLICY "users_read_clients_by_role"
ON clients
FOR SELECT
TO public
USING (
  -- Super admin sees all clients
  is_super_admin(auth.uid())
  OR
  -- Regular users see clients from their tenant
  (
    tenant_id = get_current_tenant_id()
    AND
    (
      -- Admins, accountants, bookkeepers see all clients in tenant
      EXISTS (
        SELECT 1
        FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
        AND uta.tenant_id = clients.tenant_id
        AND uta.role IN ('admin', 'accountant', 'bookkeeper')
        AND uta.is_active = true
      )
      OR
      -- Client role users only see their assigned clients
      EXISTS (
        SELECT 1
        FROM user_client_assignments uca
        WHERE uca.user_id = auth.uid()
        AND uca.client_id = clients.id
        AND uca.tenant_id = clients.tenant_id
      )
    )
  )
);

-- Create unified INSERT/UPDATE/DELETE policy
CREATE POLICY "users_manage_clients_by_role"
ON clients
FOR ALL
TO public
USING (
  -- Super admin can manage all clients
  is_super_admin(auth.uid())
  OR
  -- Admins, accountants, bookkeepers can manage clients in their tenant
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
)
WITH CHECK (
  -- Same check for INSERT - ensure tenant_id is correct
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

COMMENT ON POLICY "users_read_clients_by_role" ON clients IS
'Users can read clients based on role: super_admin (all), admin/accountant/bookkeeper (all in tenant), client (only assigned)';

COMMENT ON POLICY "users_manage_clients_by_role" ON clients IS
'Admin, accountant, and bookkeeper can manage clients in their tenant. Super admin can manage all clients.';
