-- Migration: Migrate 3 functions from tenant_users to user_tenant_access
-- Purpose: Remove all dependencies on deprecated tenant_users table
-- Affected: get_user_accessible_clients, get_user_with_auth, list_users_with_auth
-- Date: 2025-10-03

-- ============================================================================
-- Function 1: get_user_accessible_clients
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_accessible_clients(UUID);

CREATE OR REPLACE FUNCTION public.get_user_accessible_clients(p_user_id UUID)
RETURNS TABLE(client_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_role VARCHAR;
BEGIN
  -- Get user's tenant and role
  SELECT uta.tenant_id, uta.role
  INTO v_tenant_id, v_user_role
  FROM user_tenant_access uta
  WHERE uta.user_id = p_user_id
  AND uta.is_active = true
  AND uta.is_primary = true
  LIMIT 1;

  -- If user has no tenant access, return empty
  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Admin sees all clients in their tenant
  IF v_user_role = 'admin' THEN
    RETURN QUERY
    SELECT c.id
    FROM clients c
    WHERE c.tenant_id = v_tenant_id
    ORDER BY c.company_name;
    RETURN;
  END IF;

  -- Accountants and bookkeepers see only assigned clients
  IF v_user_role IN ('accountant', 'bookkeeper') THEN
    RETURN QUERY
    SELECT uca.client_id
    FROM user_client_assignments uca
    WHERE uca.user_id = p_user_id
    AND uca.tenant_id = v_tenant_id
    ORDER BY uca.assigned_at DESC;
    RETURN;
  END IF;

  -- Other roles (client) see their assigned clients
  RETURN QUERY
  SELECT uca.client_id
  FROM user_client_assignments uca
  WHERE uca.user_id = p_user_id
  AND uca.tenant_id = v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_clients(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_user_accessible_clients(UUID) IS
'Returns list of client IDs accessible to a user based on their role and assignments';

-- ============================================================================
-- Function 2: get_user_with_auth
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_with_auth(UUID);

CREATE OR REPLACE FUNCTION public.get_user_with_auth(p_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  tenant_id UUID,
  role VARCHAR,
  permissions JSONB,
  is_active BOOLEAN,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_tenant UUID;
BEGIN
  -- Get current tenant
  v_current_tenant := get_current_tenant_id();

  -- Validate user exists in current tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access uta
    WHERE uta.user_id = p_user_id
    AND uta.tenant_id = v_current_tenant
    AND uta.is_active = true
  ) THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;

  -- Return user with auth data
  RETURN QUERY
  SELECT
    uta.user_id,
    uta.tenant_id,
    uta.role,
    uta.permissions,
    uta.is_active,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS full_name,
    au.raw_user_meta_data->>'phone' AS phone,
    au.last_sign_in_at,
    COALESCE(uta.granted_at, au.created_at) AS created_at,
    au.updated_at
  FROM user_tenant_access uta
  LEFT JOIN auth.users au ON uta.user_id = au.id
  WHERE uta.user_id = p_user_id
  AND uta.tenant_id = v_current_tenant
  AND uta.is_active = true
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_with_auth(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_user_with_auth(UUID) IS
'Returns user details with auth data for a specific user in current tenant';

-- ============================================================================
-- Function 3: list_users_with_auth
-- ============================================================================

DROP FUNCTION IF EXISTS list_users_with_auth();

CREATE OR REPLACE FUNCTION public.list_users_with_auth()
RETURNS TABLE(
  user_id UUID,
  tenant_id UUID,
  role VARCHAR,
  permissions JSONB,
  is_active BOOLEAN,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_tenant UUID;
BEGIN
  -- Get current tenant
  v_current_tenant := get_current_tenant_id();

  IF v_current_tenant IS NULL THEN
    RETURN;
  END IF;

  -- Return all users in current tenant with auth data
  RETURN QUERY
  SELECT
    uta.user_id,
    uta.tenant_id,
    uta.role,
    uta.permissions,
    uta.is_active,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS full_name,
    au.raw_user_meta_data->>'phone' AS phone,
    au.last_sign_in_at,
    COALESCE(uta.granted_at, au.created_at) AS created_at,
    au.updated_at
  FROM user_tenant_access uta
  LEFT JOIN auth.users au ON uta.user_id = au.id
  WHERE uta.tenant_id = v_current_tenant
  AND uta.is_active = true
  ORDER BY uta.granted_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_users_with_auth() TO authenticated;

COMMENT ON FUNCTION public.list_users_with_auth() IS
'Returns list of all users in current tenant with their auth data';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✅ Migrated 3 functions from tenant_users to user_tenant_access:
--    1. get_user_accessible_clients - Returns client IDs accessible to user
--    2. get_user_with_auth - Returns specific user details with auth data
--    3. list_users_with_auth - Returns all users in tenant with auth data
--
-- All functions now use user_tenant_access instead of tenant_users
