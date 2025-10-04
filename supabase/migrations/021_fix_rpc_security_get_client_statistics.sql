-- Migration: Fix security vulnerability in get_client_statistics RPC function
-- Purpose: Validate that user has access to requested tenant_id before returning data
-- Security Issue: Function accepts tenant_id without validating user belongs to that tenant
-- Date: 2025-10-03

-- Drop the vulnerable version
DROP FUNCTION IF EXISTS get_client_statistics(UUID);

-- Create secure version with tenant validation
CREATE OR REPLACE FUNCTION public.get_client_statistics(p_tenant_id UUID)
RETURNS TABLE(
  total_clients BIGINT,
  active_clients BIGINT,
  inactive_clients BIGINT,
  pending_clients BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_current_tenant UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();

  -- Return empty result if not authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user is super admin
  IF is_super_admin(v_user_id) THEN
    -- Super admins can query any tenant
    RETURN QUERY
    SELECT
      COUNT(*)::BIGINT AS total_clients,
      COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_clients,
      COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT AS inactive_clients,
      COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_clients
    FROM clients
    WHERE tenant_id = p_tenant_id;
    RETURN;
  END IF;

  -- For regular users: validate tenant_id matches their tenant
  v_current_tenant := get_current_tenant_id();

  IF v_current_tenant IS NULL THEN
    RAISE EXCEPTION 'No tenant associated with user';
  END IF;

  -- SECURITY CHECK: Ensure requested tenant matches user's tenant
  IF p_tenant_id != v_current_tenant THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access data from other tenants';
  END IF;

  -- Return statistics for user's tenant only
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_clients,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_clients,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT AS inactive_clients,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_clients
  FROM clients
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_client_statistics(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_client_statistics(UUID) IS
'Returns client statistics for a tenant. Validates that non-super-admin users can only query their own tenant. Super admins can query any tenant.';

-- ============================================================================
-- SECURITY IMPROVEMENT SUMMARY
-- ============================================================================
-- BEFORE: Any authenticated user could call get_client_statistics(any_tenant_id)
--         and receive data from any tenant
--
-- AFTER:  Regular users can ONLY query their own tenant (validated via get_current_tenant_id)
--         Super admins can query any tenant
--         Throws exception if user tries to access unauthorized tenant
