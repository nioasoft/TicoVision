-- Migration: Update all remaining RLS policies from tenant_users to user_tenant_access
-- Purpose: Complete migration from deprecated tenant_users table to user_tenant_access
-- Affected: 9 policies across 5 tables (fee_calculations, generated_letters, audit_logs, tenants, user_client_assignments)
-- Date: 2025-10-03

-- ============================================================================
-- CRITICAL: fee_calculations table (4 policies) - Phase 1 core functionality
-- ============================================================================

-- 1. DROP and RECREATE: Accountants and admins can manage fee calculations
DROP POLICY IF EXISTS "Accountants and admins can manage fee calculations" ON fee_calculations;

CREATE POLICY "Accountants and admins can manage fee calculations"
ON fee_calculations
FOR ALL
TO public
USING (
  (tenant_id = get_current_tenant_id())
  AND EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.tenant_id = fee_calculations.tenant_id
      AND uta.user_id = auth.uid()
      AND uta.role IN ('admin', 'accountant')
      AND uta.is_active = true
  )
);

-- 2. DROP and RECREATE: Bookkeepers can insert fee calculations
DROP POLICY IF EXISTS "Bookkeepers can insert fee calculations" ON fee_calculations;

CREATE POLICY "Bookkeepers can insert fee calculations"
ON fee_calculations
FOR INSERT
TO public
WITH CHECK (
  (tenant_id = get_current_tenant_id())
  AND EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.tenant_id = fee_calculations.tenant_id
      AND uta.user_id = auth.uid()
      AND uta.role IN ('admin', 'accountant', 'bookkeeper')
      AND uta.is_active = true
  )
);

-- 3. DROP and RECREATE: staff_manage_assigned_fee_calculations
DROP POLICY IF EXISTS "staff_manage_assigned_fee_calculations" ON fee_calculations;

CREATE POLICY "staff_manage_assigned_fee_calculations"
ON fee_calculations
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_access uta
    INNER JOIN user_client_assignments uca ON uca.user_id = uta.user_id
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = fee_calculations.tenant_id
      AND uca.client_id = fee_calculations.client_id
      AND uta.role IN ('accountant', 'bookkeeper', 'admin')
      AND uta.is_active = true
  )
);

-- 4. DROP and RECREATE: users_view_assigned_fee_calculations
DROP POLICY IF EXISTS "users_view_assigned_fee_calculations" ON fee_calculations;

CREATE POLICY "users_view_assigned_fee_calculations"
ON fee_calculations
FOR SELECT
TO public
USING (
  -- Admins see all fee calculations in their tenant
  EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = fee_calculations.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
  OR
  -- Users see fee calculations for their assigned clients
  EXISTS (
    SELECT 1 FROM user_client_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.client_id = fee_calculations.client_id
      AND uca.tenant_id = fee_calculations.tenant_id
  )
);

COMMENT ON POLICY "Accountants and admins can manage fee calculations" ON fee_calculations IS
'Admins and accountants have full access to fee calculations in their tenant';

COMMENT ON POLICY "Bookkeepers can insert fee calculations" ON fee_calculations IS
'Admins, accountants, and bookkeepers can create new fee calculations';

COMMENT ON POLICY "staff_manage_assigned_fee_calculations" ON fee_calculations IS
'Staff can manage fee calculations for clients they are assigned to';

COMMENT ON POLICY "users_view_assigned_fee_calculations" ON fee_calculations IS
'Admins see all fee calculations, others see only for assigned clients';

-- ============================================================================
-- CRITICAL: generated_letters table (2 policies) - Phase 1 automation
-- ============================================================================

-- 5. DROP and RECREATE: staff_create_letters_for_assigned
DROP POLICY IF EXISTS "staff_create_letters_for_assigned" ON generated_letters;

CREATE POLICY "staff_create_letters_for_assigned"
ON generated_letters
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_tenant_access uta
    INNER JOIN user_client_assignments uca ON uca.user_id = uta.user_id
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uca.client_id = generated_letters.client_id
      AND uta.role IN ('accountant', 'bookkeeper', 'admin')
      AND uta.is_active = true
  )
);

-- 6. DROP and RECREATE: users_view_assigned_letters
DROP POLICY IF EXISTS "users_view_assigned_letters" ON generated_letters;

CREATE POLICY "users_view_assigned_letters"
ON generated_letters
FOR SELECT
TO public
USING (
  -- Admins see all letters in their tenant
  EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
  OR
  -- Users see letters for their assigned clients
  EXISTS (
    SELECT 1 FROM user_client_assignments uca
    WHERE uca.user_id = auth.uid()
      AND uca.client_id = generated_letters.client_id
      AND uca.tenant_id = generated_letters.tenant_id
  )
);

COMMENT ON POLICY "staff_create_letters_for_assigned" ON generated_letters IS
'Staff can create letters for clients they are assigned to';

COMMENT ON POLICY "users_view_assigned_letters" ON generated_letters IS
'Admins see all letters, others see only for assigned clients';

-- ============================================================================
-- MEDIUM: audit_logs table (1 policy) - Compliance
-- ============================================================================

-- 7. DROP and RECREATE: Admins can view audit logs in their tenant
DROP POLICY IF EXISTS "Admins can view audit logs in their tenant" ON audit_logs;

CREATE POLICY "Admins can view audit logs in their tenant"
ON audit_logs
FOR SELECT
TO public
USING (
  (tenant_id = get_current_tenant_id())
  AND EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.tenant_id = audit_logs.tenant_id
      AND uta.user_id = auth.uid()
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

COMMENT ON POLICY "Admins can view audit logs in their tenant" ON audit_logs IS
'Only admins can view audit logs for their tenant';

-- ============================================================================
-- MEDIUM: tenants table (1 policy) - Tenant management
-- ============================================================================

-- 8. DROP and RECREATE: Admins can manage their tenant
DROP POLICY IF EXISTS "Admins can manage their tenant" ON tenants;

CREATE POLICY "Admins can manage their tenant"
ON tenants
FOR ALL
TO public
USING (
  (id = get_current_tenant_id())
  AND EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.tenant_id = tenants.id
      AND uta.user_id = auth.uid()
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

COMMENT ON POLICY "Admins can manage their tenant" ON tenants IS
'Admins have full access to their tenant settings';

-- ============================================================================
-- MEDIUM: user_client_assignments table (1 policy) - Assignment management
-- ============================================================================

-- 9. DROP and RECREATE: admins_manage_assignments
DROP POLICY IF EXISTS "admins_manage_assignments" ON user_client_assignments;

CREATE POLICY "admins_manage_assignments"
ON user_client_assignments
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = user_client_assignments.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

COMMENT ON POLICY "admins_manage_assignments" ON user_client_assignments IS
'Admins can manage user-client assignments in their tenant';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Updated 9 policies across 5 tables:
-- ✅ fee_calculations: 4 policies (core Phase 1 functionality)
-- ✅ generated_letters: 2 policies (automation)
-- ✅ audit_logs: 1 policy (compliance)
-- ✅ tenants: 1 policy (management)
-- ✅ user_client_assignments: 1 policy (assignments)
--
-- All references to tenant_users have been replaced with user_tenant_access
-- The tenant_users table can now be safely dropped in a future migration
