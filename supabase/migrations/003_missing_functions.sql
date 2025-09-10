-- ================================================
-- TicoVision AI - Missing Functions and Permissions
-- Version: 3.0
-- Date: December 2024
-- Description: Add missing RPC functions and auth.users access
-- ================================================

-- ================================================
-- FUNCTION: get_client_statistics
-- Returns statistics about clients for a tenant
-- ================================================
CREATE OR REPLACE FUNCTION get_client_statistics(p_tenant_id UUID)
RETURNS TABLE(
  total_clients BIGINT,
  active_clients BIGINT,
  inactive_clients BIGINT,
  pending_clients BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_clients,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_clients,
    COUNT(*) FILTER (WHERE status = 'inactive')::BIGINT AS inactive_clients,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT AS pending_clients
  FROM clients
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_client_statistics(UUID) TO authenticated;

-- ================================================
-- VIEW: user_profiles
-- Provides safe access to auth.users data
-- ================================================
CREATE OR REPLACE VIEW user_profiles AS
SELECT 
  u.id,
  u.tenant_id,
  u.role,
  u.full_name,
  u.phone,
  u.department,
  u.is_active,
  u.permissions,
  u.created_at,
  u.updated_at,
  au.email,
  au.last_sign_in_at,
  au.created_at as auth_created_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id;

-- Grant select permission to authenticated users
GRANT SELECT ON user_profiles TO authenticated;

-- ================================================
-- RLS POLICIES for user_profiles view
-- ================================================

-- Enable RLS on the view (through a workaround using a function)
CREATE OR REPLACE FUNCTION get_user_profiles()
RETURNS SETOF user_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM user_profiles
  WHERE tenant_id = get_current_tenant_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_profiles() TO authenticated;

-- ================================================
-- FUNCTION: get_user_with_auth
-- Get user data with auth.users info safely
-- ================================================
CREATE OR REPLACE FUNCTION get_user_with_auth(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  role user_role,
  full_name TEXT,
  phone TEXT,
  department TEXT,
  is_active BOOLEAN,
  permissions JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check that the user belongs to the same tenant
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id 
    AND tenant_id = get_current_tenant_id()
  ) THEN
    RAISE EXCEPTION 'User not found or access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.tenant_id,
    u.role,
    u.full_name,
    u.phone,
    u.department,
    u.is_active,
    u.permissions,
    u.created_at,
    u.updated_at,
    au.email,
    au.last_sign_in_at
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_with_auth(UUID) TO authenticated;

-- ================================================
-- FUNCTION: list_users_with_auth
-- List all users with auth info for a tenant
-- ================================================
CREATE OR REPLACE FUNCTION list_users_with_auth()
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  role user_role,
  full_name TEXT,
  phone TEXT,
  department TEXT,
  is_active BOOLEAN,
  permissions JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  last_sign_in_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.tenant_id,
    u.role,
    u.full_name,
    u.phone,
    u.department,
    u.is_active,
    u.permissions,
    u.created_at,
    u.updated_at,
    au.email,
    au.last_sign_in_at
  FROM users u
  LEFT JOIN auth.users au ON u.id = au.id
  WHERE u.tenant_id = get_current_tenant_id()
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION list_users_with_auth() TO authenticated;

-- ================================================
-- Additional helper functions
-- ================================================

-- Function to get fee calculation summary
CREATE OR REPLACE FUNCTION get_fee_summary(p_tenant_id UUID)
RETURNS TABLE(
  total_fees BIGINT,
  total_draft BIGINT,
  total_sent BIGINT,
  total_paid BIGINT,
  total_overdue BIGINT,
  total_cancelled BIGINT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_fees,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT AS total_draft,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT AS total_sent,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT AS total_paid,
    COUNT(*) FILTER (WHERE status = 'overdue')::BIGINT AS total_overdue,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT AS total_cancelled,
    COALESCE(SUM(final_amount), 0)::NUMERIC AS total_amount,
    COALESCE(SUM(final_amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC AS paid_amount,
    COALESCE(SUM(final_amount) FILTER (WHERE status IN ('sent', 'overdue')), 0)::NUMERIC AS pending_amount
  FROM fee_calculations
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_fee_summary(UUID) TO authenticated;

-- ================================================
-- Fix for auth.users access in queries
-- Create a security definer function for user queries
-- ================================================
CREATE OR REPLACE FUNCTION get_users_for_tenant()
RETURNS TABLE(
  id UUID,
  tenant_id UUID,
  role user_role,
  full_name TEXT,
  phone TEXT,
  department TEXT,
  is_active BOOLEAN,
  permissions JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  last_sign_in_at TIMESTAMPTZ
) AS $$
DECLARE
  current_tenant UUID;
BEGIN
  -- Get current tenant ID
  current_tenant := get_current_tenant_id();
  
  -- Return users for this tenant with auth data
  RETURN QUERY
  SELECT 
    u.id,
    u.tenant_id,
    u.role,
    u.full_name,
    u.phone,
    u.department,
    u.is_active,
    u.permissions,
    u.created_at,
    u.updated_at,
    au.email,
    au.last_sign_in_at
  FROM users u
  INNER JOIN auth.users au ON u.id = au.id
  WHERE u.tenant_id = current_tenant
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_users_for_tenant() TO authenticated;

-- ================================================
-- Comments for documentation
-- ================================================
COMMENT ON FUNCTION get_client_statistics(UUID) IS 'Returns client statistics for a specific tenant';
COMMENT ON FUNCTION get_user_with_auth(UUID) IS 'Returns user data with auth.users info for a specific user';
COMMENT ON FUNCTION list_users_with_auth() IS 'Lists all users with auth info for the current tenant';
COMMENT ON FUNCTION get_fee_summary(UUID) IS 'Returns fee calculation summary for a tenant';
COMMENT ON FUNCTION get_users_for_tenant() IS 'Returns all users with auth data for the current tenant';
COMMENT ON VIEW user_profiles IS 'Safe view for accessing user data with auth.users info';