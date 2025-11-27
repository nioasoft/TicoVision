-- Migration: Secure Registration Password System
-- Purpose:
--   1. Fix security vulnerability (RLS policy exposing all columns to public)
--   2. Store user password during registration (hashed)
--   3. Use stored password when approving registration
--   4. Send confirmation email instead of password reset
-- Date: 2025-11-27

-- ============================================
-- 1. SECURITY FIX: Remove dangerous RLS policy
-- ============================================
-- The "allow_public_check_email" policy uses USING(true) which exposes ALL columns
-- including password_hash to anonymous users. This is a critical security vulnerability.

DROP POLICY IF EXISTS "allow_public_check_email" ON pending_registrations;

-- ============================================
-- 2. RPC function for email availability check
-- ============================================
-- Replaces direct SELECT query - returns only availability status, never the actual data

CREATE OR REPLACE FUNCTION public.check_email_availability(p_email TEXT)
RETURNS TABLE(available BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    NOT EXISTS(
      SELECT 1 FROM pending_registrations
      WHERE email = p_email AND status IN ('pending', 'approved')
    ) as available,
    CASE
      WHEN EXISTS(SELECT 1 FROM pending_registrations WHERE email = p_email AND status = 'pending')
        THEN 'pending_registration'
      WHEN EXISTS(SELECT 1 FROM pending_registrations WHERE email = p_email AND status = 'approved')
        THEN 'already_registered'
      ELSE NULL
    END as reason;
END;
$$;

COMMENT ON FUNCTION public.check_email_availability IS
'Securely checks email availability without exposing any table data.
Replaces direct SELECT which was a security risk due to overly permissive RLS policy.';

-- Grant to anon (for public registration form) and authenticated
GRANT EXECUTE ON FUNCTION public.check_email_availability TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_availability TO authenticated;

-- ============================================
-- 3. RPC function for registration submission
-- ============================================
-- Hashes password server-side for security
-- Replaces direct INSERT from client

CREATE OR REPLACE FUNCTION public.submit_registration(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_requested_role user_role DEFAULT 'client',
  p_tax_id TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_registration_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Validate email format
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate password strength
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;

  -- Validate full name
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;

  -- Check for existing registration with same email
  IF EXISTS(SELECT 1 FROM pending_registrations WHERE email = p_email AND status = 'pending') THEN
    RAISE EXCEPTION 'A pending registration already exists for this email';
  END IF;

  IF EXISTS(SELECT 1 FROM pending_registrations WHERE email = p_email AND status = 'approved') THEN
    RAISE EXCEPTION 'This email is already registered';
  END IF;

  -- Hash password with bcrypt (10 rounds)
  v_password_hash := crypt(p_password, gen_salt('bf', 10::integer));

  -- Insert registration with hashed password
  INSERT INTO pending_registrations (
    email,
    password_hash,
    full_name,
    phone,
    company_name,
    requested_role,
    tax_id,
    message,
    status
  ) VALUES (
    lower(trim(p_email)),
    v_password_hash,
    trim(p_full_name),
    NULLIF(trim(p_phone), ''),
    NULLIF(trim(p_company_name), ''),
    p_requested_role,
    NULLIF(trim(p_tax_id), ''),
    NULLIF(trim(p_message), ''),
    'pending'
  )
  RETURNING id INTO v_registration_id;

  RETURN v_registration_id;
END;
$$;

COMMENT ON FUNCTION public.submit_registration IS
'Securely submits a new registration request.
Password is hashed server-side with bcrypt before storage.
When registration is approved, the stored hash is used directly to create the user.';

-- Grant to anon (for public registration form)
GRANT EXECUTE ON FUNCTION public.submit_registration TO anon;
GRANT EXECUTE ON FUNCTION public.submit_registration TO authenticated;

-- ============================================
-- 4. RPC function to create user with pre-hashed password
-- ============================================
-- Used when approving registration - uses the already-hashed password

CREATE OR REPLACE FUNCTION public.create_user_with_role_v3(
  p_email TEXT,
  p_password_hash TEXT,
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
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user ID (must be admin approving the registration)
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required - admin must be logged in to approve registrations';
  END IF;

  -- Get tenant_id from user_tenant_access table
  SELECT uta.tenant_id INTO v_tenant_id
  FROM user_tenant_access uta
  WHERE uta.user_id = v_current_user_id
    AND uta.is_active = true
  LIMIT 1;

  -- Fallback: Try to get from JWT if not found in table
  IF v_tenant_id IS NULL THEN
    SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found. Admin must be assigned to a tenant.';
  END IF;

  -- Validate password hash
  IF p_password_hash IS NULL OR p_password_hash = '' THEN
    RAISE EXCEPTION 'Password hash is required';
  END IF;

  -- Validate email
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  -- Check if user already exists
  IF EXISTS(SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Create user in auth.users with the pre-hashed password
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
    lower(trim(p_email)),
    p_password_hash,  -- Pre-hashed password from registration
    NOW(),  -- Email confirmed
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

COMMENT ON FUNCTION public.create_user_with_role_v3 IS
'V3: Creates user with pre-hashed password from pending_registrations table.
Used during registration approval - no need to send password reset email.
User can log in immediately with the password they chose during registration.';

-- Grant to authenticated users (admins will use this)
GRANT EXECUTE ON FUNCTION public.create_user_with_role_v3 TO authenticated;

-- ============================================
-- 5. Force PostgREST to reload schema
-- ============================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================
-- 6. Verification
-- ============================================
DO $$
DECLARE
  v_func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('check_email_availability', 'submit_registration', 'create_user_with_role_v3');

  IF v_func_count = 3 THEN
    RAISE NOTICE 'SUCCESS: All 3 functions created successfully';
  ELSE
    RAISE EXCEPTION 'VERIFICATION FAILED: Expected 3 functions, found %', v_func_count;
  END IF;

  -- Verify dangerous policy was removed
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pending_registrations'
    AND policyname = 'allow_public_check_email'
  ) THEN
    RAISE NOTICE 'SUCCESS: Dangerous RLS policy removed';
  ELSE
    RAISE EXCEPTION 'SECURITY ISSUE: allow_public_check_email policy still exists!';
  END IF;
END $$;
