-- Migration: Merge Multiple Permissive RLS Policies for client_phones
-- Issue: Table has 2 permissive policies for each action (SELECT/INSERT/UPDATE)
-- Impact: Performance degradation - each policy is evaluated separately
-- Solution: Merge policies into single policy with OR logic
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

-- =============================================================================
-- client_phones table currently has:
-- 1. accountant_manage_client_phones - allows accountants
-- 2. admin_all_client_phones - allows admins
--
-- This causes duplicate evaluation for every row.
-- Solution: Merge into single policy that checks role once.
-- =============================================================================

-- DROP old policies
DROP POLICY IF EXISTS accountant_manage_client_phones ON public.client_phones;
DROP POLICY IF EXISTS admin_all_client_phones ON public.client_phones;
DROP POLICY IF EXISTS accountant_view_client_phones ON public.client_phones;
DROP POLICY IF EXISTS accountant_update_client_phones ON public.client_phones;

-- CREATE merged policy for SELECT
CREATE POLICY client_phones_select_policy ON public.client_phones
  FOR SELECT
  USING (
    tenant_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'tenant_id')::UUID
    AND (
      -- Allow admin full access
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      OR
      -- Allow accountant full access
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'accountant'
    )
  );

-- CREATE merged policy for INSERT
CREATE POLICY client_phones_insert_policy ON public.client_phones
  FOR INSERT
  WITH CHECK (
    tenant_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'tenant_id')::UUID
    AND (
      -- Allow admin full access
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      OR
      -- Allow accountant to manage phones
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'accountant'
    )
  );

-- CREATE merged policy for UPDATE
CREATE POLICY client_phones_update_policy ON public.client_phones
  FOR UPDATE
  USING (
    tenant_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'tenant_id')::UUID
    AND (
      -- Allow admin full access
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
      OR
      -- Allow accountant to update phones
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'accountant'
    )
  );

-- CREATE merged policy for DELETE
CREATE POLICY client_phones_delete_policy ON public.client_phones
  FOR DELETE
  USING (
    tenant_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'tenant_id')::UUID
    AND (
      -- Only admin can delete
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

-- Add comments
COMMENT ON POLICY client_phones_select_policy ON public.client_phones IS
  'Merged policy: Replaces accountant_view_client_phones + admin_all_client_phones. Performance optimized with subqueries.';

COMMENT ON POLICY client_phones_insert_policy ON public.client_phones IS
  'Merged policy: Replaces accountant_manage_client_phones + admin_all_client_phones. Performance optimized with subqueries.';

COMMENT ON POLICY client_phones_update_policy ON public.client_phones IS
  'Merged policy: Replaces accountant_update_client_phones + admin_all_client_phones. Performance optimized with subqueries.';

COMMENT ON POLICY client_phones_delete_policy ON public.client_phones IS
  'Merged policy: Only admin can delete. Performance optimized with subqueries.';
