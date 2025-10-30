-- Migration: Force PostgREST to recognize create_user_with_role
-- Purpose: Drop and recreate function to force schema cache refresh
-- Issue: PostgREST returning 404 despite function existing in database
-- Date: 2025-10-30

-- Drop function completely
DROP FUNCTION IF EXISTS public.create_user_with_role CASCADE;

-- Recreate with exact same definition (forces PostgREST refresh)
CREATE OR REPLACE FUNCTION public.create_user_with_role(
  p_email TEXT,
  p_password TEXT,
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
  v_password_hash TEXT;
BEGIN
  -- Get current authenticated user ID
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required - user must be logged in';
  END IF;

  -- Get tenant_id from user_tenant_access table (more reliable than JWT)
  SELECT uta.tenant_id INTO v_tenant_id
  FROM user_tenant_access uta
  WHERE uta.user_id = v_current_user_id
    AND uta.is_active = true
  LIMIT 1;

  -- Fallback: Try to get from JWT if not found in table
  IF v_tenant_id IS NULL THEN
    SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;
  END IF;

  -- Final check - tenant must exist
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found for user %. Please ensure user is assigned to a tenant.', v_current_user_id;
  END IF;

  -- Validate password provided
  IF p_password IS NULL OR p_password = '' THEN
    RAISE EXCEPTION 'Password is required';
  END IF;

  -- Hash the temporary password with EXPLICIT TYPE CAST
  v_password_hash := crypt(p_password, gen_salt('bf', 10::integer));

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
    NOW(),
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

COMMENT ON FUNCTION public.create_user_with_role IS
'Create user with temporary password. Forces PostgREST cache refresh. Uses explicit type cast for gen_salt cost parameter. Looks up tenant from user_tenant_access table (more reliable than JWT). Admin must immediately send password reset email for security.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_with_role TO service_role;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify function was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'create_user_with_role'
  ) THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: Function create_user_with_role was not created!';
  ELSE
    RAISE NOTICE 'SUCCESS: Function create_user_with_role recreated - PostgREST should see it now';
  END IF;
END $$;
