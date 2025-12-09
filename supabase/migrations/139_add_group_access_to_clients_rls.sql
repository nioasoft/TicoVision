-- Migration: Add group-based access to clients RLS policy
-- Purpose: Allow users with group assignments to see clients in their assigned groups
-- Date: 2025-12-09
-- Fixes: Bookkeepers with group assignments couldn't see clients in those groups

-- Drop existing policy
DROP POLICY IF EXISTS "users_read_clients_by_role" ON clients;

-- Create updated policy with group support
CREATE POLICY "users_read_clients_by_role"
ON clients
FOR SELECT
TO public
USING (
  is_super_admin((select auth.uid()))
  OR (
    tenant_id = (select get_current_tenant_id())
    AND (
      -- Admins can see all clients in their tenant
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = clients.tenant_id
        AND uta.role = 'admin'
        AND uta.is_active = true
      )

      -- Accountants/bookkeepers with DIRECT client assignment
      OR (
        EXISTS (
          SELECT 1 FROM user_tenant_access uta
          WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = clients.tenant_id
          AND uta.role IN ('accountant', 'bookkeeper')
          AND uta.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_client_assignments uca
          WHERE uca.user_id = (select auth.uid())
          AND uca.client_id = clients.id
          AND uca.tenant_id = clients.tenant_id
        )
      )

      -- NEW: Accountants/bookkeepers with GROUP assignment
      -- If user is assigned to a group, they can see all clients in that group
      OR (
        EXISTS (
          SELECT 1 FROM user_tenant_access uta
          WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = clients.tenant_id
          AND uta.role IN ('accountant', 'bookkeeper')
          AND uta.is_active = true
        )
        AND clients.group_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM user_group_assignments uga
          WHERE uga.user_id = (select auth.uid())
          AND uga.group_id = clients.group_id
          AND uga.tenant_id = clients.tenant_id
        )
      )

      -- Client role users can see their assigned client
      OR (
        EXISTS (
          SELECT 1 FROM user_tenant_access uta
          WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = clients.tenant_id
          AND uta.role = 'client'
          AND uta.is_active = true
        )
        AND EXISTS (
          SELECT 1 FROM user_client_assignments uca
          WHERE uca.user_id = (select auth.uid())
          AND uca.client_id = clients.id
          AND uca.tenant_id = clients.tenant_id
        )
      )
    )
  )
);

COMMENT ON POLICY "users_read_clients_by_role" ON clients IS
'Controls client visibility: admins see all, accountants/bookkeepers see direct assignments + group assignments, clients see only their own record';
