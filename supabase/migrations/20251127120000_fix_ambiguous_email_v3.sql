-- Fix: Qualify column reference to avoid ambiguity
-- The RETURNS TABLE defines "email" column which conflicts with auth.users.email
-- Error: "column reference 'email' is ambiguous" when calling create_user_with_role_v3

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
  -- Get current authenticated user ID
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

  -- Fallback: Try to get from JWT
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

  -- Check if user already exists (FIX: qualify with table alias)
  IF EXISTS(SELECT 1 FROM auth.users au WHERE au.email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Create user in auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    p_password_hash,
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'tenant_id', v_tenant_id::TEXT,
      'role', p_role::TEXT,
      'full_name', p_full_name,
      'phone', p_phone
    ),
    NOW(), NOW(), '', '', '', ''
  ) RETURNING id INTO v_user_id;

  -- Create user_tenant_access record
  INSERT INTO user_tenant_access (
    user_id, tenant_id, role, permissions, is_active, is_primary, granted_at
  ) VALUES (
    v_user_id, v_tenant_id, p_role::VARCHAR, p_permissions, true, true, NOW()
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

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
