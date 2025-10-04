-- Migration: Fix get_users_for_tenant() to implement role hierarchy
-- Purpose: Restrict data returned based on caller's role
-- Bug: Function returns all users regardless of caller's role
-- Date: 2025-10-03

-- Drop old function
DROP FUNCTION IF EXISTS get_users_for_tenant();

-- Create new function with role-based filtering
CREATE OR REPLACE FUNCTION public.get_users_for_tenant()
RETURNS TABLE(
  tenant_id UUID,
  user_id UUID,
  role VARCHAR,
  permissions JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  last_sign_in_at TIMESTAMPTZ
) AS $$
DECLARE
  current_tenant UUID;
  current_user_id UUID;
  current_user_role VARCHAR;
  is_super BOOLEAN;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();

  -- Return empty if not authenticated
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if super admin
  is_super := is_super_admin(current_user_id);

  -- Super admins can see all users across all tenants
  IF is_super THEN
    RETURN QUERY
    SELECT
      uta.tenant_id,
      uta.user_id,
      uta.role,
      uta.permissions,
      uta.is_active,
      COALESCE(uta.granted_at, au.created_at) AS created_at,
      au.updated_at,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS full_name,
      au.raw_user_meta_data->>'phone' AS phone,
      au.last_sign_in_at
    FROM user_tenant_access uta
    LEFT JOIN auth.users au ON uta.user_id = au.id
    WHERE uta.is_active = true
    ORDER BY uta.granted_at DESC;
    RETURN;
  END IF;

  -- Get current tenant ID
  current_tenant := get_current_tenant_id();

  -- Return empty result if no tenant
  IF current_tenant IS NULL THEN
    RETURN;
  END IF;

  -- Get current user's role in this tenant
  SELECT uta.role INTO current_user_role
  FROM user_tenant_access uta
  WHERE uta.user_id = current_user_id
  AND uta.tenant_id = current_tenant
  AND uta.is_active = true
  LIMIT 1;

  -- Return empty if user has no role in tenant
  IF current_user_role IS NULL THEN
    RETURN;
  END IF;

  -- ADMIN: See all users in their tenant
  IF current_user_role = 'admin' THEN
    RETURN QUERY
    SELECT
      uta.tenant_id,
      uta.user_id,
      uta.role,
      uta.permissions,
      uta.is_active,
      COALESCE(uta.granted_at, au.created_at) AS created_at,
      au.updated_at,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS full_name,
      au.raw_user_meta_data->>'phone' AS phone,
      au.last_sign_in_at
    FROM user_tenant_access uta
    LEFT JOIN auth.users au ON uta.user_id = au.id
    WHERE uta.tenant_id = current_tenant
    AND uta.is_active = true
    ORDER BY uta.granted_at DESC;
    RETURN;
  END IF;

  -- ACCOUNTANT/BOOKKEEPER: See only users from their assigned clients
  IF current_user_role IN ('accountant', 'bookkeeper') THEN
    RETURN QUERY
    SELECT DISTINCT
      uta.tenant_id,
      uta.user_id,
      uta.role,
      uta.permissions,
      uta.is_active,
      COALESCE(uta.granted_at, au.created_at) AS created_at,
      au.updated_at,
      au.email,
      COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS full_name,
      au.raw_user_meta_data->>'phone' AS phone,
      au.last_sign_in_at
    FROM user_tenant_access uta
    LEFT JOIN auth.users au ON uta.user_id = au.id
    WHERE uta.tenant_id = current_tenant
    AND uta.is_active = true
    AND (
      -- Include themselves
      uta.user_id = current_user_id
      OR
      -- Include users from clients they're assigned to
      EXISTS (
        SELECT 1
        FROM user_client_assignments uca1
        INNER JOIN user_client_assignments uca2 ON uca1.client_id = uca2.client_id
        WHERE uca1.user_id = current_user_id
        AND uca2.user_id = uta.user_id
        AND uca1.tenant_id = current_tenant
      )
    )
    ORDER BY uta.granted_at DESC;
    RETURN;
  END IF;

  -- CLIENT: No access to users list
  -- Return empty result
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_users_for_tenant() TO authenticated;

COMMENT ON FUNCTION public.get_users_for_tenant() IS
'Returns users for current tenant with role-based filtering: super_admin (all), admin (all in tenant), accountant/bookkeeper (users from assigned clients), client (none)';
