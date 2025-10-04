-- Migration: Fix accountant/bookkeeper client access bug
-- Purpose: Restrict accountants and bookkeepers to see ONLY assigned clients
-- Bug: Migration 014 incorrectly gave accountants access to ALL clients in tenant
-- Date: 2025-10-03

-- Drop the buggy policy from Migration 014
DROP POLICY IF EXISTS "users_read_clients_by_role" ON clients;

-- Create CORRECT policy with proper accountant/bookkeeper restrictions
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

COMMENT ON POLICY "users_read_clients_by_role" ON clients IS
'Users can read clients based on role: super_admin (all), admin (all in tenant), accountant/bookkeeper (only assigned via user_client_assignments), client (only assigned)';

-- Note: The MANAGE policy from Migration 014 is still correct
-- Only admins can INSERT/UPDATE/DELETE clients, accountants/bookkeepers are read-only
