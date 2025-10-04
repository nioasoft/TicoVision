-- Migration: Add client role support for viewing fee_calculations
-- Purpose: Allow clients to view fee calculations for their assigned clients
-- Gap: Security audit found clients cannot access their own fee calculations
-- Date: 2025-10-03

-- THE PROBLEM:
-- Current policies on fee_calculations:
--   - "Bookkeepers can insert fee calculations" (INSERT) - Staff only
--   - "staff_manage_assigned_fee_calculations" (ALL) - Staff only (accountant/bookkeeper/admin)
--   - "users_view_assigned_fee_calculations" (SELECT) - Admin or user_client_assignments
--
-- Issue: "users_view_assigned_fee_calculations" doesn't explicitly check for client role
-- Need to add explicit support for client role users

-- Create new policy specifically for client role users
CREATE POLICY "clients_view_own_fee_calculations"
ON fee_calculations
FOR SELECT
TO public
USING (
  tenant_id = get_current_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    INNER JOIN user_client_assignments uca ON uca.user_id = uta.user_id
    WHERE uta.user_id = auth.uid()
    AND uta.tenant_id = fee_calculations.tenant_id
    AND uca.client_id = fee_calculations.client_id
    AND uca.tenant_id = fee_calculations.tenant_id
    AND uta.role = 'client'
    AND uta.is_active = true
  )
);

COMMENT ON POLICY "clients_view_own_fee_calculations" ON fee_calculations IS
'Client role users can view fee calculations for their assigned clients';

-- The complete policy set after this migration:
-- ✅ Bookkeepers can insert fee calculations (INSERT) - Staff can create
-- ✅ staff_manage_assigned_fee_calculations (ALL) - Staff manage assigned
-- ✅ users_view_assigned_fee_calculations (SELECT) - Admin + assigned users
-- ✅ clients_view_own_fee_calculations (SELECT) - Client role explicit access

COMMENT ON TABLE fee_calculations IS
'Automated fee calculations. RLS enforced: Admins see all, staff see assigned, clients see their own.';

-- ============================================================================
-- ACCESS MATRIX AFTER THIS MIGRATION
-- ============================================================================
-- Role          | View All | View Assigned | Create | Update | Delete
-- --------------|----------|---------------|--------|--------|--------
-- Super Admin   | ✅       | ✅            | ✅     | ✅     | ✅
-- Admin         | ✅       | ✅            | ✅     | ✅     | ✅
-- Accountant    | ❌       | ✅            | ✅     | ✅     | ✅
-- Bookkeeper    | ❌       | ✅            | ✅     | ✅     | ✅
-- Client        | ❌       | ✅ (NEW)      | ❌     | ❌     | ❌
