-- Migration: Reset User Password Function
-- Purpose: Replace auth.admin.updateUserById (password reset) with SECURITY DEFINER function
-- Security: Only admins can reset passwords, automatic tenant isolation

-- Create function to reset user password
CREATE OR REPLACE FUNCTION public.reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_encrypted_password TEXT;
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
    RAISE EXCEPTION 'Permission denied. Only active admins can reset passwords.';
  END IF;

  -- Verify target user exists in this tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access
    WHERE user_tenant_access.user_id = p_user_id
      AND user_tenant_access.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'User % not found in current tenant', p_user_id;
  END IF;

  -- Validate password strength (minimum 6 characters)
  IF LENGTH(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- Hash new password using bcrypt
  v_encrypted_password := crypt(p_new_password, gen_salt('bf'));

  -- Update password in auth.users
  UPDATE auth.users SET
    encrypted_password = v_encrypted_password,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update password for user %', p_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.reset_user_password IS
  'Admin-only function to reset user passwords. Requires active admin privileges and valid tenant context.';

-- Grant execute permission to authenticated users (function will check admin role internally)
GRANT EXECUTE ON FUNCTION public.reset_user_password TO authenticated;
