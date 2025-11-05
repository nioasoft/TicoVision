-- ================================================
-- Migration: Add Password Reset Functions
-- Date: 2025-01-12
-- Description:
--   Create hash_password and reset_user_password functions
--   with correct search_path including extensions schema
--   to access gen_salt() from pgcrypto extension
-- ================================================

-- Ensure pgcrypto extension is installed (safe if already exists)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ================================================
-- Function: hash_password
-- Purpose: Hash a password using bcrypt
-- ================================================
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions  -- ✅ Includes extensions for gen_salt()
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

COMMENT ON FUNCTION public.hash_password IS 'Hash password using bcrypt with 10 rounds - accessible to authenticated users';

-- ================================================
-- Function: reset_user_password
-- Purpose: Admin-only function to reset user passwords
-- ================================================
CREATE OR REPLACE FUNCTION public.reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, extensions, auth  -- ✅ Includes extensions for gen_salt()
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Get current tenant
  v_tenant_id := get_current_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found';
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
    RAISE EXCEPTION 'User not found in current tenant';
  END IF;

  -- Validate password strength (minimum 6 characters)
  IF LENGTH(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- Hash password using bcrypt
  v_encrypted_password := crypt(p_new_password, gen_salt('bf'));

  -- Update password in auth.users table
  UPDATE auth.users SET
    encrypted_password = v_encrypted_password,
    updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update password - user not found in auth.users';
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.reset_user_password IS 'Admin-only function to reset user passwords. Validates permissions, hashes password with bcrypt, and updates auth.users.';

-- ================================================
-- Grant Permissions
-- ================================================
GRANT EXECUTE ON FUNCTION public.hash_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_password(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated;

-- ================================================
-- Force PostgREST Schema Reload
-- ================================================
NOTIFY pgrst, 'reload schema';
