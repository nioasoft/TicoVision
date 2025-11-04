-- Migration: Performance Optimization - Fix duplicate indexes and RLS initplan
-- Date: 2025-11-04
-- Purpose: Remove duplicate indexes and optimize RLS policies for better performance
--
-- Performance Impact: HIGH
-- - Removes 4 duplicate indexes (saves storage, reduces maintenance overhead)
-- - Optimizes 50+ RLS policies to evaluate auth functions once per query (not per row)
-- - Expected query performance improvement: 2-10x for large result sets
--
-- Issues Fixed:
-- 1. Duplicate indexes on tenant_activity_logs and tenant_usage_stats
-- 2. Auth RLS initplan issues (auth functions re-evaluated per row)

-- ============================================================================
-- PART 1: Remove Duplicate Indexes
-- ============================================================================

-- Table: tenant_activity_logs
-- Keep: _created_at, _tenant_id, _user_id (more descriptive names)
-- Drop: _created, _tenant, _user (shorter, less clear names)

DROP INDEX IF EXISTS idx_tenant_activity_logs_created;
DROP INDEX IF EXISTS idx_tenant_activity_logs_tenant;
DROP INDEX IF EXISTS idx_tenant_activity_logs_user;

COMMENT ON INDEX idx_tenant_activity_logs_created_at IS
'Performance: Sorts activity logs by creation date DESC. Duplicate idx_tenant_activity_logs_created removed.';

COMMENT ON INDEX idx_tenant_activity_logs_tenant_id IS
'Performance: Filters activity logs by tenant. Duplicate idx_tenant_activity_logs_tenant removed.';

COMMENT ON INDEX idx_tenant_activity_logs_user_id IS
'Performance: Filters activity logs by user. Duplicate idx_tenant_activity_logs_user removed.';

-- Table: tenant_usage_stats
-- Keep: _tenant_id (more descriptive)
-- Drop: _tenant (shorter, less clear)

DROP INDEX IF EXISTS idx_tenant_usage_stats_tenant;

COMMENT ON INDEX idx_tenant_usage_stats_tenant_id IS
'Performance: Filters usage stats by tenant. Duplicate idx_tenant_usage_stats_tenant removed.';

-- ============================================================================
-- PART 2: Fix Auth RLS InitPlan Issues
-- ============================================================================
-- Problem: auth.uid() and get_current_tenant_id() are re-evaluated for EVERY row
-- Solution: Wrap in (select ...) to evaluate ONCE per query
--
-- Pattern:
-- ❌ WHERE user_id = auth.uid()
-- ✅ WHERE user_id = (select auth.uid())
--
-- Performance Impact: 2-10x faster for queries that return many rows

-- ============================================================================
-- Table: audit_logs
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view audit logs in their tenant" ON audit_logs;

CREATE POLICY "Admins can view audit logs in their tenant"
ON audit_logs
FOR SELECT
TO public
USING (
  (tenant_id = (select get_current_tenant_id()))
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.tenant_id = audit_logs.tenant_id
      AND uta.user_id = (select auth.uid())
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: client_contacts (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "Users can delete client contacts in their tenant" ON client_contacts;
DROP POLICY IF EXISTS "Users can insert client contacts in their tenant" ON client_contacts;
DROP POLICY IF EXISTS "Users can update client contacts in their tenant" ON client_contacts;
DROP POLICY IF EXISTS "Users can view client contacts in their tenant" ON client_contacts;

CREATE POLICY "Users can view client contacts in their tenant"
ON client_contacts
FOR SELECT
TO public
USING (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

CREATE POLICY "Users can insert client contacts in their tenant"
ON client_contacts
FOR INSERT
TO public
WITH CHECK (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

CREATE POLICY "Users can update client contacts in their tenant"
ON client_contacts
FOR UPDATE
TO public
USING (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

CREATE POLICY "Users can delete client contacts in their tenant"
ON client_contacts
FOR DELETE
TO public
USING (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: client_phones (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "accountant_view_client_phones" ON client_phones;
DROP POLICY IF EXISTS "accountant_manage_client_phones" ON client_phones;
DROP POLICY IF EXISTS "accountant_update_client_phones" ON client_phones;
DROP POLICY IF EXISTS "admin_all_client_phones" ON client_phones;

CREATE POLICY "accountant_view_client_phones"
ON client_phones
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
  )
);

CREATE POLICY "accountant_manage_client_phones"
ON client_phones
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
  )
);

CREATE POLICY "accountant_update_client_phones"
ON client_phones
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
  )
);

CREATE POLICY "admin_all_client_phones"
ON client_phones
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: clients (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "users_read_clients_by_role" ON clients;
DROP POLICY IF EXISTS "users_insert_clients_by_role" ON clients;
DROP POLICY IF EXISTS "users_update_clients_by_role" ON clients;
DROP POLICY IF EXISTS "users_delete_clients_by_role" ON clients;

CREATE POLICY "users_read_clients_by_role"
ON clients
FOR SELECT
TO public
USING (
  is_super_admin((select auth.uid()))
  OR (
    tenant_id = (select get_current_tenant_id())
    AND (
      -- Admins can see all clients
      EXISTS (
        SELECT 1
        FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = clients.tenant_id
          AND uta.role = 'admin'
          AND uta.is_active = true
      )
      -- Accountants/bookkeepers can see assigned clients
      OR (
        EXISTS (
          SELECT 1
          FROM user_tenant_access uta
          WHERE uta.user_id = (select auth.uid())
            AND uta.tenant_id = clients.tenant_id
            AND uta.role IN ('accountant', 'bookkeeper')
            AND uta.is_active = true
        )
        AND EXISTS (
          SELECT 1
          FROM user_client_assignments uca
          WHERE uca.user_id = (select auth.uid())
            AND uca.client_id = clients.id
            AND uca.tenant_id = clients.tenant_id
        )
      )
      -- Client users can see their own client record
      OR (
        EXISTS (
          SELECT 1
          FROM user_tenant_access uta
          WHERE uta.user_id = (select auth.uid())
            AND uta.tenant_id = clients.tenant_id
            AND uta.role = 'client'
            AND uta.is_active = true
        )
        AND EXISTS (
          SELECT 1
          FROM user_client_assignments uca
          WHERE uca.user_id = (select auth.uid())
            AND uca.client_id = clients.id
            AND uca.tenant_id = clients.tenant_id
        )
      )
    )
  )
);

CREATE POLICY "users_insert_clients_by_role"
ON clients
FOR INSERT
TO public
WITH CHECK (
  is_super_admin((select auth.uid()))
  OR (
    tenant_id = (select get_current_tenant_id())
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = clients.tenant_id
        AND uta.role IN ('admin', 'accountant', 'bookkeeper')
        AND uta.is_active = true
    )
  )
);

CREATE POLICY "users_update_clients_by_role"
ON clients
FOR UPDATE
TO public
USING (
  is_super_admin((select auth.uid()))
  OR (
    tenant_id = (select get_current_tenant_id())
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = clients.tenant_id
        AND uta.role = 'admin'
        AND uta.is_active = true
    )
  )
  OR (
    tenant_id = (select get_current_tenant_id())
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = clients.tenant_id
        AND uta.role IN ('accountant', 'bookkeeper')
        AND uta.is_active = true
    )
    AND EXISTS (
      SELECT 1
      FROM user_client_assignments uca
      WHERE uca.user_id = (select auth.uid())
        AND uca.client_id = clients.id
        AND uca.tenant_id = clients.tenant_id
    )
  )
)
WITH CHECK (
  is_super_admin((select auth.uid()))
  OR (
    tenant_id = (select get_current_tenant_id())
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = clients.tenant_id
        AND uta.role IN ('admin', 'accountant', 'bookkeeper')
        AND uta.is_active = true
    )
  )
);

CREATE POLICY "users_delete_clients_by_role"
ON clients
FOR DELETE
TO public
USING (
  is_super_admin((select auth.uid()))
  OR (
    tenant_id = (select get_current_tenant_id())
    AND EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = clients.tenant_id
        AND uta.role = 'admin'
        AND uta.is_active = true
    )
  )
);

-- ============================================================================
-- Table: custom_letter_bodies (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "select_custom_letter_bodies" ON custom_letter_bodies;
DROP POLICY IF EXISTS "insert_custom_letter_bodies" ON custom_letter_bodies;
DROP POLICY IF EXISTS "update_custom_letter_bodies" ON custom_letter_bodies;
DROP POLICY IF EXISTS "delete_custom_letter_bodies" ON custom_letter_bodies;

CREATE POLICY "select_custom_letter_bodies"
ON custom_letter_bodies
FOR SELECT
TO public
USING (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

CREATE POLICY "insert_custom_letter_bodies"
ON custom_letter_bodies
FOR INSERT
TO public
WITH CHECK (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

CREATE POLICY "update_custom_letter_bodies"
ON custom_letter_bodies
FOR UPDATE
TO public
USING (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

CREATE POLICY "delete_custom_letter_bodies"
ON custom_letter_bodies
FOR DELETE
TO public
USING (
  tenant_id IN (
    SELECT uta.tenant_id
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: fee_calculations (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "staff_manage_assigned_fee_calculations" ON fee_calculations;
DROP POLICY IF EXISTS "clients_view_own_fee_calculations" ON fee_calculations;
DROP POLICY IF EXISTS "Bookkeepers can insert fee calculations" ON fee_calculations;

CREATE POLICY "staff_manage_assigned_fee_calculations"
ON fee_calculations
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = fee_calculations.tenant_id
      AND uta.role IN ('admin', 'accountant', 'bookkeeper')
      AND uta.is_active = true
      AND (
        uta.role = 'admin'
        OR EXISTS (
          SELECT 1
          FROM user_client_assignments uca
          WHERE uca.user_id = uta.user_id
            AND uca.client_id = fee_calculations.client_id
            AND uca.tenant_id = fee_calculations.tenant_id
        )
      )
  )
);

CREATE POLICY "clients_view_own_fee_calculations"
ON fee_calculations
FOR SELECT
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    JOIN user_client_assignments uca ON uca.user_id = uta.user_id
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = fee_calculations.tenant_id
      AND uca.client_id = fee_calculations.client_id
      AND uca.tenant_id = fee_calculations.tenant_id
      AND uta.role = 'client'
      AND uta.is_active = true
  )
);

CREATE POLICY "Bookkeepers can insert fee calculations"
ON fee_calculations
FOR INSERT
TO public
WITH CHECK (
  tenant_id = (select get_current_tenant_id())
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.tenant_id = fee_calculations.tenant_id
      AND uta.user_id = (select auth.uid())
      AND uta.role IN ('admin', 'accountant', 'bookkeeper')
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: generated_letters (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "users_view_assigned_letters" ON generated_letters;
DROP POLICY IF EXISTS "staff_create_letters_for_assigned" ON generated_letters;
DROP POLICY IF EXISTS "staff_update_assigned_letters" ON generated_letters;
DROP POLICY IF EXISTS "admins_delete_letters" ON generated_letters;

CREATE POLICY "users_view_assigned_letters"
ON generated_letters
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
  OR EXISTS (
    SELECT 1
    FROM user_client_assignments uca
    WHERE uca.user_id = (select auth.uid())
      AND uca.client_id = generated_letters.client_id
      AND uca.tenant_id = generated_letters.tenant_id
  )
);

CREATE POLICY "staff_create_letters_for_assigned"
ON generated_letters
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
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
);

CREATE POLICY "staff_update_assigned_letters"
ON generated_letters
FOR UPDATE
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  AND (
    EXISTS (
      SELECT 1
      FROM user_tenant_access uta
      WHERE uta.user_id = (select auth.uid())
        AND uta.tenant_id = generated_letters.tenant_id
        AND uta.role = 'admin'
        AND uta.is_active = true
    )
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
  )
)
WITH CHECK (
  tenant_id = (select get_current_tenant_id())
);

CREATE POLICY "admins_delete_letters"
ON generated_letters
FOR DELETE
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: notification_settings (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "user_isolation" ON notification_settings;

CREATE POLICY "user_isolation"
ON notification_settings
FOR ALL
TO public
USING (
  user_id = (select auth.uid())
);

-- ============================================================================
-- Table: pending_registrations (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "admins_can_view" ON pending_registrations;
DROP POLICY IF EXISTS "admins_can_update" ON pending_registrations;
DROP POLICY IF EXISTS "admins_can_delete" ON pending_registrations;

CREATE POLICY "admins_can_view"
ON pending_registrations
FOR SELECT
TO public
USING (
  is_tenant_admin((select auth.uid()))
);

CREATE POLICY "admins_can_update"
ON pending_registrations
FOR UPDATE
TO public
USING (
  is_tenant_admin((select auth.uid()))
)
WITH CHECK (
  is_tenant_admin((select auth.uid()))
);

CREATE POLICY "admins_can_delete"
ON pending_registrations
FOR DELETE
TO public
USING (
  is_tenant_admin((select auth.uid()))
);

-- ============================================================================
-- Table: super_admins (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "users_can_read_own_super_admin_status" ON super_admins;
DROP POLICY IF EXISTS "service_role_can_manage" ON super_admins;

CREATE POLICY "users_can_read_own_super_admin_status"
ON super_admins
FOR SELECT
TO public
USING (
  (select auth.uid()) = user_id
);

CREATE POLICY "service_role_can_manage"
ON super_admins
FOR ALL
TO public
USING (
  (select auth.role()) = 'service_role'
)
WITH CHECK (
  (select auth.role()) = 'service_role'
);

-- ============================================================================
-- Table: tenant_activity_logs (3 policies)
-- ============================================================================

DROP POLICY IF EXISTS "activity_logs_tenant_read" ON tenant_activity_logs;
DROP POLICY IF EXISTS "allow_tenant_admins_view_logs" ON tenant_activity_logs;
DROP POLICY IF EXISTS "allow_super_admin_all_logs" ON tenant_activity_logs;

CREATE POLICY "activity_logs_tenant_read"
ON tenant_activity_logs
FOR SELECT
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  OR is_super_admin((select auth.uid()))
);

CREATE POLICY "allow_tenant_admins_view_logs"
ON tenant_activity_logs
FOR SELECT
TO public
USING (
  tenant_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access
    WHERE user_tenant_access.user_id = (select auth.uid())
      AND user_tenant_access.tenant_id = tenant_activity_logs.tenant_id
      AND user_tenant_access.role IN ('owner', 'admin')
      AND user_tenant_access.is_active = true
  )
);

CREATE POLICY "allow_super_admin_all_logs"
ON tenant_activity_logs
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM super_admins
    WHERE super_admins.user_id = (select auth.uid())
      AND super_admins.is_active = true
  )
);

-- ============================================================================
-- Table: tenant_settings (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_settings_tenant_read" ON tenant_settings;
DROP POLICY IF EXISTS "tenant_settings_admin_update" ON tenant_settings;

CREATE POLICY "tenant_settings_tenant_read"
ON tenant_settings
FOR SELECT
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  OR is_super_admin((select auth.uid()))
);

CREATE POLICY "tenant_settings_admin_update"
ON tenant_settings
FOR UPDATE
TO public
USING (
  is_super_admin((select auth.uid()))
  OR EXISTS (
    SELECT 1
    FROM user_tenant_access
    WHERE user_tenant_access.tenant_id = tenant_settings.tenant_id
      AND user_tenant_access.user_id = (select auth.uid())
      AND user_tenant_access.role IN ('owner', 'admin')
      AND user_tenant_access.is_active = true
  )
);

-- ============================================================================
-- Table: tenant_subscriptions (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "subscriptions_read" ON tenant_subscriptions;
DROP POLICY IF EXISTS "allow_tenant_users_view_subscription" ON tenant_subscriptions;
DROP POLICY IF EXISTS "subscriptions_super_manage" ON tenant_subscriptions;
DROP POLICY IF EXISTS "allow_super_admin_all_subscriptions" ON tenant_subscriptions;

CREATE POLICY "subscriptions_read"
ON tenant_subscriptions
FOR SELECT
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  OR is_super_admin((select auth.uid()))
);

CREATE POLICY "allow_tenant_users_view_subscription"
ON tenant_subscriptions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access
    WHERE user_tenant_access.user_id = (select auth.uid())
      AND user_tenant_access.tenant_id = tenant_subscriptions.tenant_id
      AND user_tenant_access.is_active = true
  )
);

CREATE POLICY "subscriptions_super_manage"
ON tenant_subscriptions
FOR ALL
TO public
USING (
  is_super_admin((select auth.uid()))
);

CREATE POLICY "allow_super_admin_all_subscriptions"
ON tenant_subscriptions
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM super_admins
    WHERE super_admins.user_id = (select auth.uid())
      AND super_admins.is_active = true
  )
);

-- ============================================================================
-- Table: tenant_usage_stats (4 policies)
-- ============================================================================

DROP POLICY IF EXISTS "usage_stats_read" ON tenant_usage_stats;
DROP POLICY IF EXISTS "allow_tenant_users_view_stats" ON tenant_usage_stats;
DROP POLICY IF EXISTS "usage_stats_super_manage" ON tenant_usage_stats;
DROP POLICY IF EXISTS "allow_super_admin_all_stats" ON tenant_usage_stats;

CREATE POLICY "usage_stats_read"
ON tenant_usage_stats
FOR SELECT
TO public
USING (
  tenant_id = (select get_current_tenant_id())
  OR is_super_admin((select auth.uid()))
);

CREATE POLICY "allow_tenant_users_view_stats"
ON tenant_usage_stats
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access
    WHERE user_tenant_access.user_id = (select auth.uid())
      AND user_tenant_access.tenant_id = tenant_usage_stats.tenant_id
      AND user_tenant_access.is_active = true
  )
);

CREATE POLICY "usage_stats_super_manage"
ON tenant_usage_stats
FOR ALL
TO public
USING (
  is_super_admin((select auth.uid()))
);

CREATE POLICY "allow_super_admin_all_stats"
ON tenant_usage_stats
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM super_admins
    WHERE super_admins.user_id = (select auth.uid())
      AND super_admins.is_active = true
  )
);

-- ============================================================================
-- Table: tenants (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage their tenant" ON tenants;

CREATE POLICY "Admins can manage their tenant"
ON tenants
FOR ALL
TO public
USING (
  id = (select get_current_tenant_id())
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.tenant_id = tenants.id
      AND uta.user_id = (select auth.uid())
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: user_client_assignments (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "users_view_own_assignments" ON user_client_assignments;
DROP POLICY IF EXISTS "admins_manage_assignments" ON user_client_assignments;

CREATE POLICY "users_view_own_assignments"
ON user_client_assignments
FOR SELECT
TO public
USING (
  user_id = (select auth.uid())
);

CREATE POLICY "admins_manage_assignments"
ON user_client_assignments
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = (select auth.uid())
      AND uta.tenant_id = user_client_assignments.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
  )
);

-- ============================================================================
-- Table: user_tenant_access (2 policies)
-- ============================================================================

DROP POLICY IF EXISTS "user_access_read" ON user_tenant_access;
DROP POLICY IF EXISTS "user_access_manage" ON user_tenant_access;

CREATE POLICY "user_access_read"
ON user_tenant_access
FOR SELECT
TO public
USING (
  user_id = (select auth.uid())
  OR tenant_id = (select get_current_tenant_id())
  OR is_super_admin((select auth.uid()))
);

CREATE POLICY "user_access_manage"
ON user_tenant_access
FOR ALL
TO public
USING (
  is_super_admin((select auth.uid()))
  OR check_tenant_admin_access((select auth.uid()), tenant_id)
)
WITH CHECK (
  is_super_admin((select auth.uid()))
  OR check_tenant_admin_access((select auth.uid()), tenant_id)
);

-- ============================================================================
-- Table: webhook_logs (1 policy)
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can view webhook logs" ON webhook_logs;

CREATE POLICY "Super admins can view webhook logs"
ON webhook_logs
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM super_admins
    WHERE super_admins.user_id = (select auth.uid())
      AND super_admins.is_active = true
  )
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these after migration to verify fixes:
--
-- 1. Check duplicate indexes removed:
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_tenant_activity_logs_created',
--     'idx_tenant_activity_logs_tenant',
--     'idx_tenant_activity_logs_user',
--     'idx_tenant_usage_stats_tenant'
--   );
-- Expected: 0 rows (all removed)
--
-- 2. Check RLS policies updated (sample):
-- SELECT policyname, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename = 'clients'
--   AND policyname = 'users_read_clients_by_role';
-- Expected: qual contains "(select auth.uid())" not "auth.uid()"
--
-- 3. Test query performance (before/after):
-- EXPLAIN ANALYZE
-- SELECT * FROM clients WHERE tenant_id = 'your-tenant-id';
-- Expected: InitPlan should show auth functions evaluated once, not per row
