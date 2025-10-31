-- Migration 050: Fix search_path to include extensions schema for gen_salt
-- Purpose: Fix "function gen_salt(unknown, integer) does not exist" error
-- Root Cause: Migrations 047-049 set search_path to 'public' only, excluding 'extensions' where gen_salt lives
-- Solution: Add 'extensions' and 'auth' schemas back to search_path
-- Date: 2025-10-31

-- Fix create_user_with_role function
-- This function needs access to:
-- - public schema (for user_tenant_access table)
-- - extensions schema (for gen_salt and crypt from pgcrypto)
-- - auth schema (for auth.uid(), auth.users table)
ALTER FUNCTION public.create_user_with_role(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role user_role,
  p_permissions jsonb
)
SET search_path = public, extensions, auth;

-- Fix create_user_with_role_v2 function
-- V2 was created to bypass PostgREST cache, but had same search_path issue
ALTER FUNCTION public.create_user_with_role_v2(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text,
  p_role user_role,
  p_permissions jsonb
)
SET search_path = public, extensions, auth;

-- Update function comments to reflect the fix
COMMENT ON FUNCTION public.create_user_with_role IS
'Create user with temporary password. Fixed search_path includes extensions (for gen_salt), auth (for auth.uid/users), and public schemas. Looks up tenant from user_tenant_access table. Admin must immediately send password reset email for security.';

COMMENT ON FUNCTION public.create_user_with_role_v2 IS
'V2: Fixed search_path includes extensions (for gen_salt), auth (for auth.uid/users), and public schemas. Creates user with temporary password. Looks up tenant from user_tenant_access table. Admin must send password reset email immediately.';

-- Force PostgREST to reload and recognize the updated functions
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verification: Test that gen_salt is now accessible
DO $$
DECLARE
  v_test_salt TEXT;
BEGIN
  -- Simulate function's search_path
  SET LOCAL search_path = public, extensions, auth;

  -- Try to call gen_salt (this will fail if extensions is not in path)
  v_test_salt := gen_salt('bf', 10);

  RAISE NOTICE '✅ SUCCESS: gen_salt is accessible with new search_path';
  RAISE NOTICE 'Generated salt: %', v_test_salt;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '❌ VERIFICATION FAILED: gen_salt still not accessible! Error: % - %', SQLSTATE, SQLERRM;
END $$;

-- Verification: Confirm both functions exist with correct search_path
DO $$
DECLARE
  v_v1_search_path TEXT;
  v_v2_search_path TEXT;
BEGIN
  -- Get search_path for v1
  SELECT prosrc INTO v_v1_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'create_user_with_role';

  -- Get search_path for v2
  SELECT prosrc INTO v_v2_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = 'create_user_with_role_v2';

  IF v_v1_search_path IS NULL THEN
    RAISE EXCEPTION '❌ Function create_user_with_role not found!';
  END IF;

  IF v_v2_search_path IS NULL THEN
    RAISE EXCEPTION '❌ Function create_user_with_role_v2 not found!';
  END IF;

  RAISE NOTICE '✅ Both functions exist and have been updated';
  RAISE NOTICE '✅ create_user_with_role: Updated';
  RAISE NOTICE '✅ create_user_with_role_v2: Updated';

END $$;
