-- Migration: Fix overly permissive tenant_isolation_policy on generated_letters
-- Purpose: Replace broad ALL policy with specific UPDATE/DELETE policies
-- Bug: tenant_isolation_policy (ALL) allows any user in tenant to modify/delete any letter
-- Date: 2025-10-03

-- THE PROBLEM:
-- "tenant_isolation_policy" uses ALL command with only tenant check
-- This grants SELECT/INSERT/UPDATE/DELETE to ANY user in the tenant
-- Conflicts with the more specific policies and creates security vulnerability

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "tenant_isolation_policy" ON generated_letters;

-- Create specific UPDATE policy - only staff can update letters for assigned clients
CREATE POLICY "staff_update_assigned_letters"
ON generated_letters
FOR UPDATE
TO public
USING (
  tenant_id = get_current_tenant_id()
  AND (
    -- Admins can update all letters in their tenant
    EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
    )
    OR
    -- Accountants/bookkeepers can update letters for assigned clients only
    EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      INNER JOIN user_client_assignments uca ON uca.user_id = uta.user_id
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uca.client_id = generated_letters.client_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
    )
  )
)
WITH CHECK (
  tenant_id = get_current_tenant_id()
);

-- Create specific DELETE policy - only admins can delete letters
CREATE POLICY "admins_delete_letters"
ON generated_letters
FOR DELETE
TO public
USING (
  tenant_id = get_current_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
    AND uta.tenant_id = generated_letters.tenant_id
    AND uta.role = 'admin'
    AND uta.is_active = true
  )
);

COMMENT ON POLICY "staff_update_assigned_letters" ON generated_letters IS
'Admins can update all letters, accountants/bookkeepers can update only for assigned clients';

COMMENT ON POLICY "admins_delete_letters" ON generated_letters IS
'Only admins can delete generated letters';

-- The remaining policies after this migration:
-- ✅ staff_create_letters_for_assigned (INSERT) - Staff create for assigned clients
-- ✅ users_view_assigned_letters (SELECT) - View based on assignments
-- ✅ staff_update_assigned_letters (UPDATE) - Update based on assignments
-- ✅ admins_delete_letters (DELETE) - Admin only

COMMENT ON TABLE generated_letters IS
'Generated letters sent to clients. RLS enforced: Admins have full access, staff limited to assigned clients.';

-- ============================================================================
-- BEFORE vs AFTER
-- ============================================================================
-- BEFORE:
-- - tenant_isolation_policy (ALL) allowed ANY user in tenant to do ANYTHING
-- - Security vulnerability: regular users could delete/modify any letter
--
-- AFTER:
-- - Specific policies for each operation
-- - UPDATE: Only admins + assigned staff
-- - DELETE: Admin only
-- - Clean, secure policy structure
