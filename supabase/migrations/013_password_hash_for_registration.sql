-- Migration: Add password_hash to pending_registrations and create hash_password function
-- Purpose: Allow users to choose password during registration instead of temp password flow
-- Date: 2025-10-03

-- Ensure pgcrypto extension is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add password_hash column to pending_registrations
ALTER TABLE pending_registrations
ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN pending_registrations.password_hash IS 'Bcrypt hashed password chosen by user during registration';

-- Create function to hash passwords securely on server-side
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use bcrypt (crypt with bf algorithm) for secure password hashing
  -- Cost factor 10 is a good balance between security and performance
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

COMMENT ON FUNCTION public.hash_password IS 'Securely hash a password using bcrypt - called from client to avoid sending plain passwords';

-- Grant execute permission to authenticated users (needed for registration)
GRANT EXECUTE ON FUNCTION public.hash_password(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_password(TEXT) TO anon; -- Also allow anonymous for registration form

-- Drop existing create_user_with_role function first
DROP FUNCTION IF EXISTS public.create_user_with_role(TEXT, TEXT, TEXT, TEXT, user_role, JSONB);

-- Modify create_user_with_role to accept optional password_hash
-- This allows using user's chosen password instead of always requiring plain password
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT DEFAULT NULL,
  p_password_hash TEXT DEFAULT NULL,
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
  v_password_to_use TEXT;
BEGIN
  -- Get current user's tenant
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found';
  END IF;

  -- Determine which password to use
  IF p_password_hash IS NOT NULL THEN
    -- Use provided hash directly (from pending_registrations)
    v_password_to_use := p_password_hash;
  ELSIF p_password IS NOT NULL THEN
    -- Hash the plain password
    v_password_to_use := crypt(p_password, gen_salt('bf', 10));
  ELSE
    RAISE EXCEPTION 'Either p_password or p_password_hash must be provided';
  END IF;

  -- Create user in auth.users using admin API
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
    v_password_to_use,
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

COMMENT ON FUNCTION public.create_user_with_role IS 'Create user with role - accepts either plain password or pre-hashed password';
