-- Migration: Auto-sync app_metadata from user_tenant_access
-- Issue: Users cannot login because RLS policies require app_metadata.tenant_id and app_metadata.role
-- Solution: Create trigger that automatically syncs app_metadata from user_tenant_access table
-- Impact: Users can login and access data immediately after tenant access is granted

-- =============================================================================
-- PROBLEM:
-- After Migration 125, all RLS policies require app_metadata (not user_metadata)
-- But the application creates users with empty app_metadata
-- Result: Users can't login because they have no access to any data
-- =============================================================================

-- =============================================================================
-- SOLUTION:
-- Create trigger that automatically updates auth.users.raw_app_metadata
-- whenever a user_tenant_access record is inserted or updated
-- This ensures app_metadata is always in sync with tenant access
-- =============================================================================

-- Function: Sync app_metadata from user_tenant_access
CREATE OR REPLACE FUNCTION public.sync_user_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  primary_access RECORD;
BEGIN
  -- Get the primary tenant access for this user
  SELECT tenant_id, role
  INTO primary_access
  FROM public.user_tenant_access
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND is_primary = true
    AND is_active = true
  LIMIT 1;

  -- If we found primary access, update the user's app_metadata
  IF primary_access IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_build_object(
      'tenant_id', primary_access.tenant_id,
      'role', primary_access.role
    )
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger: Sync app_metadata on INSERT/UPDATE to user_tenant_access
DROP TRIGGER IF EXISTS sync_app_metadata_on_insert ON public.user_tenant_access;
CREATE TRIGGER sync_app_metadata_on_insert
  AFTER INSERT ON public.user_tenant_access
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_app_metadata();

DROP TRIGGER IF EXISTS sync_app_metadata_on_update ON public.user_tenant_access;
CREATE TRIGGER sync_app_metadata_on_update
  AFTER UPDATE ON public.user_tenant_access
  FOR EACH ROW
  WHEN (
    OLD.is_primary IS DISTINCT FROM NEW.is_primary
    OR OLD.is_active IS DISTINCT FROM NEW.is_active
    OR OLD.role IS DISTINCT FROM NEW.role
  )
  EXECUTE FUNCTION public.sync_user_app_metadata();

-- Add comment
COMMENT ON FUNCTION public.sync_user_app_metadata() IS
  'Automatically syncs auth.users.raw_app_metadata from user_tenant_access table.
   Ensures app_metadata.tenant_id and app_metadata.role are always up-to-date.
   Fixes login issues after Migration 125 (user_metadata → app_metadata).';

-- =============================================================================
-- ONE-TIME FIX: Update all existing users
-- This will fix users who were created before this migration
-- =============================================================================

DO $$
DECLARE
  user_record RECORD;
  primary_access RECORD;
  updated_count INT := 0;
BEGIN
  -- Loop through all users who have tenant access
  FOR user_record IN
    SELECT DISTINCT user_id
    FROM public.user_tenant_access
    WHERE is_active = true
  LOOP
    -- Get their primary tenant access
    SELECT tenant_id, role
    INTO primary_access
    FROM public.user_tenant_access
    WHERE user_id = user_record.user_id
      AND is_primary = true
      AND is_active = true
    LIMIT 1;

    -- Update their app_metadata
    IF primary_access IS NOT NULL THEN
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_build_object(
        'tenant_id', primary_access.tenant_id,
        'role', primary_access.role
      )
      WHERE id = user_record.user_id;

      updated_count := updated_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Updated app_metadata for % existing users', updated_count;
END $$;

-- Verify the fix worked
SELECT
  'Migration 126: Auto-sync app_metadata' AS status,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE raw_app_meta_data ? 'tenant_id') AS users_with_tenant_id,
  COUNT(*) FILTER (WHERE raw_app_meta_data ? 'role') AS users_with_role
FROM auth.users
WHERE id IN (SELECT user_id FROM public.user_tenant_access WHERE is_active = true);
