-- Migration: Remove password_hash from pending_registrations (Security Fix)
-- Purpose: Eliminate security vulnerability where password hashes stored in application table
-- Solution: Use Supabase Auth's built-in password reset flow instead
-- Date: 2025-10-04
-- Related to: Critical Security Issue - password_hash in application table

-- Step 1: Remove password_hash column from pending_registrations
-- This forces us to use secure invitation-based flow
ALTER TABLE pending_registrations
DROP COLUMN IF EXISTS password_hash;

COMMENT ON TABLE pending_registrations IS 'Registration requests awaiting admin approval. Uses invitation tokens for password setup (no password hashes stored).';

-- Step 2: Drop hash_password function (no longer needed)
DROP FUNCTION IF EXISTS public.hash_password(TEXT);

-- Step 3: Revert create_user_with_role to NOT accept password_hash
-- This forces admins to use invitation flow
DROP FUNCTION IF EXISTS public.create_user_with_role(TEXT, TEXT, TEXT, TEXT, TEXT, user_role, JSONB);

-- Recreate without password_hash parameter
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT, -- Temporary password (will be reset immediately via email)
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_role user_role DEFAULT 'client'::user_role,
  p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  user_id UUID,
  tenant_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Get current user's tenant
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found';
  END IF;

  -- Validate password provided
  IF p_password IS NULL OR p_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;

  -- Hash the temporary password
  v_password_hash := crypt(p_password, gen_salt('bf', 10));

  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_password_hash,
    NOW(), -- Email confirmed immediately
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'tenant_id', v_tenant_id::TEXT,
      'role', p_role::TEXT,
      'full_name', p_full_name,
      'phone', p_phone
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO v_user_id;

  -- Create user_tenant_access record
  INSERT INTO user_tenant_access (
    user_id,
    tenant_id,
    role,
    permissions,
    is_active,
    is_primary,
    granted_at
  ) VALUES (
    v_user_id,
    v_tenant_id,
    p_role::VARCHAR,
    p_permissions,
    true,
    true,
    NOW()
  );

  -- Return user details
  RETURN QUERY SELECT
    v_user_id,
    v_tenant_id,
    p_email,
    p_full_name,
    p_role::TEXT;
END;
$$;

COMMENT ON FUNCTION public.create_user_with_role IS 'Create user with temporary password - admin must immediately send password reset email for security';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;
