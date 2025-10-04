-- Migration: Create User with Role Function
-- Purpose: Replace auth.admin.createUser with SECURITY DEFINER function
-- Security: Only admins can create users, automatic tenant isolation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create function to create user with role
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'client'::user_role,
  p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role user_role,
  tenant_id UUID
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
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
    RAISE EXCEPTION 'Permission denied. Only active admins can create users.';
  END IF;

  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', p_email;
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = p_email) THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  END IF;

  -- Validate password strength (minimum 6 characters)
  IF LENGTH(p_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- Generate user ID
  v_user_id := gen_random_uuid();

  -- Hash password using bcrypt
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Create auth user
  -- Note: This requires SECURITY DEFINER to write to auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    NOW(), -- Auto-confirm email
    jsonb_build_object(
      'tenant_id', v_tenant_id,
      'role', p_role,
      'full_name', p_full_name,
      'phone', p_phone
    ),
    '{}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Create user_tenant_access record
  INSERT INTO user_tenant_access (
    user_id,
    tenant_id,
    role,
    is_active,
    is_primary,
    permissions,
    granted_at,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_tenant_id,
    p_role,
    true,
    true,
    p_permissions,
    NOW(),
    NOW(),
    NOW()
  );

  -- Return user data
  RETURN QUERY
  SELECT
    v_user_id,
    p_email,
    p_full_name,
    p_role,
    v_tenant_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.create_user_with_role IS
  'Admin-only function to create new users with roles. Requires active admin privileges and valid tenant context.';

-- Grant execute permission to authenticated users (function will check admin role internally)
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;
