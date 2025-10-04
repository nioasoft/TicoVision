-- Migration: Update User Metadata Function
-- Purpose: Replace auth.admin.updateUserById with SECURITY DEFINER function
-- Security: Only admins can update users, automatic tenant isolation

-- Create function to update user role and metadata
CREATE OR REPLACE FUNCTION public.update_user_role_and_metadata(
  p_user_id UUID,
  p_role user_role DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_permissions JSONB DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_current_metadata JSONB;
  v_updated_metadata JSONB;
BEGIN
  -- Get current tenant
  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found. User must be authenticated with tenant_id.';
  END IF;

  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access
    WHERE user_tenant_access.user_id = auth.uid()
      AND user_tenant_access.tenant_id = v_tenant_id
      AND user_tenant_access.role = 'admin'
      AND user_tenant_access.is_active = true
  ) THEN
    RAISE EXCEPTION 'Permission denied. Only active admins can update users.';
  END IF;

  -- Verify target user exists in this tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access
    WHERE user_tenant_access.user_id = p_user_id
      AND user_tenant_access.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'User % not found in current tenant', p_user_id;
  END IF;

  -- Update user_tenant_access table
  UPDATE user_tenant_access SET
    role = COALESCE(p_role, role),
    is_active = COALESCE(p_is_active, is_active),
    permissions = COALESCE(p_permissions, permissions),
    last_accessed_at = NOW(),
    updated_at = NOW()
  WHERE user_tenant_access.user_id = p_user_id
    AND user_tenant_access.tenant_id = v_tenant_id;

  -- Update auth.users metadata if any user data changed
  IF p_role IS NOT NULL OR p_full_name IS NOT NULL OR p_phone IS NOT NULL THEN
    -- Get current metadata
    SELECT raw_user_meta_data INTO v_current_metadata
    FROM auth.users
    WHERE id = p_user_id;

    -- Build updated metadata (preserve existing values, override with new ones)
    v_updated_metadata := COALESCE(v_current_metadata, '{}'::jsonb);

    IF p_role IS NOT NULL THEN
      v_updated_metadata := v_updated_metadata || jsonb_build_object('role', p_role);
    END IF;

    IF p_full_name IS NOT NULL THEN
      v_updated_metadata := v_updated_metadata || jsonb_build_object('full_name', p_full_name);
    END IF;

    IF p_phone IS NOT NULL THEN
      v_updated_metadata := v_updated_metadata || jsonb_build_object('phone', p_phone);
    END IF;

    -- Update auth.users
    UPDATE auth.users SET
      raw_user_meta_data = v_updated_metadata,
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.update_user_role_and_metadata IS
  'Admin-only function to update user roles and metadata. Updates both user_tenant_access and auth.users tables.';

-- Grant execute permission to authenticated users (function will check admin role internally)
GRANT EXECUTE ON FUNCTION public.update_user_role_and_metadata TO authenticated;
