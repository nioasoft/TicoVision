-- Migration: Deactivate User Account Function
-- Purpose: Replace auth.admin.updateUserById (soft delete) with SECURITY DEFINER function
-- Security: Only admins can deactivate users, automatic tenant isolation

-- Create function to deactivate user account
CREATE OR REPLACE FUNCTION public.deactivate_user_account(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'User deleted by admin'
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
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
    RAISE EXCEPTION 'Permission denied. Only active admins can deactivate users.';
  END IF;

  -- Verify target user exists in this tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access
    WHERE user_tenant_access.user_id = p_user_id
      AND user_tenant_access.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'User % not found in current tenant', p_user_id;
  END IF;

  -- Prevent admin from deactivating themselves
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot deactivate their own accounts';
  END IF;

  -- Soft delete in user_tenant_access (mark as inactive)
  UPDATE user_tenant_access SET
    is_active = false,
    revoked_at = NOW(),
    revoke_reason = p_reason,
    updated_at = NOW()
  WHERE user_tenant_access.user_id = p_user_id
    AND user_tenant_access.tenant_id = v_tenant_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to deactivate user % in tenant', p_user_id;
  END IF;

  -- Ban the user in auth.users (prevents login across all tenants)
  -- Note: We use banned_until with a far future date to effectively disable the account
  UPDATE auth.users SET
    banned_until = '2099-12-31 23:59:59'::timestamp,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.deactivate_user_account IS
  'Admin-only function to deactivate user accounts (soft delete). Marks user as inactive in tenant and bans from authentication.';

-- Grant execute permission to authenticated users (function will check admin role internally)
GRANT EXECUTE ON FUNCTION public.deactivate_user_account TO authenticated;
