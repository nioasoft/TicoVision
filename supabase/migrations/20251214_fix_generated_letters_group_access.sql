-- Migration: Fix generated_letters RLS policies to support group assignments
-- Purpose: Allow accountants/bookkeepers with group assignments to create/view/update letters
-- Date: 2025-12-14
-- Fixes: Accountants assigned to groups couldn't create letters for clients in those groups

-- ============================================================================
-- Table: generated_letters - Update 3 policies to support group assignments
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_view_assigned_letters" ON generated_letters;
DROP POLICY IF EXISTS "staff_create_letters_for_assigned" ON generated_letters;
DROP POLICY IF EXISTS "staff_update_assigned_letters" ON generated_letters;

-- Policy 1: SELECT - Users can view letters for assigned clients (direct OR via group)
CREATE POLICY "users_view_assigned_letters"
ON generated_letters
FOR SELECT
TO public
USING (
  -- Admins can see all letters in their tenant
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
  -- Accountants/bookkeepers with DIRECT client assignment
  OR EXISTS (
    SELECT 1
    FROM user_client_assignments uca
    WHERE uca.user_id = (select auth.uid())
      AND uca.client_id = generated_letters.client_id
      AND uca.tenant_id = generated_letters.tenant_id
  )
  -- NEW: Accountants/bookkeepers with GROUP assignment
  OR (
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM clients c
      JOIN user_group_assignments uga ON uga.group_id = c.group_id
      WHERE c.id = generated_letters.client_id
      AND uga.user_id = (select auth.uid())
      AND uga.tenant_id = generated_letters.tenant_id
      AND c.group_id IS NOT NULL
    )
  )
);

-- Policy 2: INSERT - Staff can create letters for assigned clients (direct OR via group)
CREATE POLICY "staff_create_letters_for_assigned"
ON generated_letters
FOR INSERT
TO public
WITH CHECK (
  -- Admins can create letters for any client in their tenant
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
  -- Accountants/bookkeepers with DIRECT client assignment
  OR EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    JOIN user_client_assignments uca ON uca.user_id = uta.user_id
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uca.client_id = generated_letters.client_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
  )
  -- NEW: Accountants/bookkeepers with GROUP assignment
  OR (
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM clients c
      JOIN user_group_assignments uga ON uga.group_id = c.group_id
      WHERE c.id = generated_letters.client_id
      AND uga.user_id = (select auth.uid())
      AND uga.tenant_id = generated_letters.tenant_id
      AND c.group_id IS NOT NULL
    )
  )
);

-- Policy 3: UPDATE - Staff can update letters for assigned clients (direct OR via group)
CREATE POLICY "staff_update_assigned_letters"
ON generated_letters
FOR UPDATE
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  AND (
    -- Admins can update any letter in their tenant
    EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = generated_letters.tenant_id
        AND uta.role = 'admin'
        AND uta.is_active = true
    )
    -- Accountants/bookkeepers with DIRECT client assignment
    OR EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      JOIN user_client_assignments uca ON uca.user_id = uta.user_id
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = generated_letters.tenant_id
        AND uca.client_id = generated_letters.client_id
        AND uta.role IN ('accountant', 'bookkeeper')
        AND uta.is_active = true
    )
    -- NEW: Accountants/bookkeepers with GROUP assignment
    OR (
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = generated_letters.tenant_id
        AND uta.role IN ('accountant', 'bookkeeper')
        AND uta.is_active = true
      )
      AND EXISTS (
        SELECT 1 FROM clients c
        JOIN user_group_assignments uga ON uga.group_id = c.group_id
        WHERE c.id = generated_letters.client_id
        AND uga.user_id = (select auth.uid())
        AND uga.tenant_id = generated_letters.tenant_id
        AND c.group_id IS NOT NULL
      )
    )
  )
)
WITH CHECK (
  tenant_id = (select get_current_tenant_id())
);

-- Add comment for documentation
COMMENT ON POLICY "users_view_assigned_letters" ON generated_letters IS
'Controls letter visibility: admins see all, accountants/bookkeepers see direct assignments + group assignments';

COMMENT ON POLICY "staff_create_letters_for_assigned" ON generated_letters IS
'Controls letter creation: admins can create for all, accountants/bookkeepers can create for direct assignments + group assignments';

COMMENT ON POLICY "staff_update_assigned_letters" ON generated_letters IS
'Controls letter updates: admins can update all, accountants/bookkeepers can update direct assignments + group assignments';
