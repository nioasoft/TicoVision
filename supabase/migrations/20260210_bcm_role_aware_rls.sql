-- ============================================================================
-- Role-aware RLS policies for balance_chat_messages
-- Phase 5: Participant Permissions
--
-- Replaces tenant-only SELECT and INSERT policies with role-aware versions:
-- - Admin/Accountant: full tenant access (all balances)
-- - Bookkeeper: only balances where they are the assigned auditor
--
-- Does NOT touch bcm_update_admin_accountant (UPDATE remains admin/accountant only)
-- ============================================================================

-- Drop existing tenant-only policies
DROP POLICY IF EXISTS "bcm_select_own_tenant" ON balance_chat_messages;
DROP POLICY IF EXISTS "bcm_insert_own_tenant" ON balance_chat_messages;

-- SELECT: role-aware access
-- Admin/Accountant = full tenant access, Bookkeeper = assigned auditor only
CREATE POLICY "bcm_select_by_role"
  ON balance_chat_messages FOR SELECT
  USING (
    is_super_admin((select auth.uid())) OR (
      tenant_id = (select get_current_tenant_id()) AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
          AND (
            uta.role IN ('admin', 'accountant')
            OR EXISTS (
              SELECT 1 FROM annual_balance_sheets abs
              WHERE abs.id = balance_chat_messages.balance_id
                AND abs.auditor_id = (select auth.uid())
            )
          )
      )
    )
  );

-- INSERT: role-aware access + impersonation prevention (user_id = auth.uid())
-- Same role logic as SELECT, plus enforces sender identity
CREATE POLICY "bcm_insert_by_role"
  ON balance_chat_messages FOR INSERT
  WITH CHECK (
    is_super_admin((select auth.uid())) OR (
      tenant_id = (select get_current_tenant_id()) AND
      user_id = (select auth.uid()) AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
          AND (
            uta.role IN ('admin', 'accountant')
            OR EXISTS (
              SELECT 1 FROM annual_balance_sheets abs
              WHERE abs.id = balance_chat_messages.balance_id
                AND abs.auditor_id = (select auth.uid())
            )
          )
      )
    )
  );
