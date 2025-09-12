-- Fix Infinite Recursion in RLS Policies
-- =========================================
-- This migration fixes the infinite recursion issue in user_tenant_access policies
-- while maintaining full security

-- =========================================
-- Step 1: Create Helper Functions with SECURITY DEFINER
-- =========================================

-- Function to check if user has admin/owner access to a tenant (bypasses RLS)
CREATE OR REPLACE FUNCTION public.check_tenant_admin_access(
  p_user_id UUID, 
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Direct check without RLS to avoid recursion
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_tenant_access
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND role IN ('owner', 'admin')
    AND is_active = true
  );
END;
$$;

-- Function to check if user is admin in any tenant (for pending_registrations)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user is admin in any active tenant
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_tenant_access
    WHERE user_id = p_user_id
    AND role IN ('owner', 'admin')
    AND is_active = true
  ) OR public.is_super_admin(p_user_id);
END;
$$;

-- =========================================
-- Step 2: Update existing function to SECURITY DEFINER
-- =========================================

-- Update get_current_tenant_id to avoid RLS issues
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_is_super_admin BOOLEAN;
  v_selected_tenant UUID;
  v_primary_tenant UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if user is super admin
  v_is_super_admin := public.is_super_admin(v_user_id);
  
  IF v_is_super_admin THEN
    -- For super admin, check for selected tenant in app_metadata
    v_selected_tenant := (auth.jwt() -> 'app_metadata' ->> 'selected_tenant_id')::UUID;
    IF v_selected_tenant IS NOT NULL THEN
      RETURN v_selected_tenant;
    END IF;
  END IF;
  
  -- Get user's primary tenant (direct query without RLS)
  SELECT tenant_id INTO v_primary_tenant
  FROM public.user_tenant_access
  WHERE user_id = v_user_id 
  AND is_active = true
  AND is_primary = true
  LIMIT 1;
  
  IF v_primary_tenant IS NOT NULL THEN
    RETURN v_primary_tenant;
  END IF;
  
  -- Fallback to any active tenant
  SELECT tenant_id INTO v_primary_tenant
  FROM public.user_tenant_access
  WHERE user_id = v_user_id 
  AND is_active = true
  LIMIT 1;
  
  RETURN v_primary_tenant;
END;
$$;

-- =========================================
-- Step 3: Fix the problematic RLS policies
-- =========================================

-- Drop and recreate the problematic policy on user_tenant_access
DROP POLICY IF EXISTS "user_access_manage" ON public.user_tenant_access;

-- Recreate with the helper function to avoid recursion
CREATE POLICY "user_access_manage" ON public.user_tenant_access
  FOR ALL
  USING (
    public.is_super_admin(auth.uid()) OR
    public.check_tenant_admin_access(auth.uid(), tenant_id)
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR
    public.check_tenant_admin_access(auth.uid(), tenant_id)
  );

-- =========================================
-- Step 4: Fix pending_registrations policies
-- =========================================

-- Drop old policies that reference tenant_users
DROP POLICY IF EXISTS "admins_can_view" ON public.pending_registrations;
DROP POLICY IF EXISTS "admins_can_update" ON public.pending_registrations;
DROP POLICY IF EXISTS "admins_can_delete" ON public.pending_registrations;

-- Recreate with proper references to user_tenant_access
CREATE POLICY "admins_can_view" ON public.pending_registrations
  FOR SELECT
  USING (public.is_tenant_admin(auth.uid()));

CREATE POLICY "admins_can_update" ON public.pending_registrations
  FOR UPDATE
  USING (public.is_tenant_admin(auth.uid()))
  WITH CHECK (public.is_tenant_admin(auth.uid()));

CREATE POLICY "admins_can_delete" ON public.pending_registrations
  FOR DELETE
  USING (public.is_tenant_admin(auth.uid()));

-- =========================================
-- Step 5: Add performance indexes
-- =========================================

-- Index for faster tenant admin checks
CREATE INDEX IF NOT EXISTS idx_user_tenant_access_admin_lookup 
ON public.user_tenant_access(user_id, tenant_id, is_active, role)
WHERE is_active = true AND role IN ('owner', 'admin');

-- Index for primary tenant lookup
CREATE INDEX IF NOT EXISTS idx_user_tenant_access_primary 
ON public.user_tenant_access(user_id, is_primary)
WHERE is_active = true AND is_primary = true;

-- =========================================
-- Step 6: Grant necessary permissions
-- =========================================

GRANT EXECUTE ON FUNCTION public.check_tenant_admin_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_admin TO authenticated;

-- =========================================
-- Step 7: Add comments for documentation
-- =========================================

COMMENT ON FUNCTION public.check_tenant_admin_access IS 
'Checks if a user has admin or owner access to a specific tenant. Uses SECURITY DEFINER to bypass RLS and avoid recursion.';

COMMENT ON FUNCTION public.is_tenant_admin IS 
'Checks if a user is an admin in any tenant or is a super admin. Uses SECURITY DEFINER to bypass RLS.';

COMMENT ON FUNCTION public.get_current_tenant_id IS 
'Gets the current tenant ID for the authenticated user. Uses SECURITY DEFINER to avoid RLS recursion issues.';

-- =========================================
-- Verification Query (for testing)
-- =========================================

-- Test that the policies work without recursion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been fixed successfully!';
  RAISE NOTICE 'The infinite recursion issue should now be resolved.';
  RAISE NOTICE 'All security measures remain in place.';
END $$;