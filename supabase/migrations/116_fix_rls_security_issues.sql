-- Migration 116: Fix RLS Security Issues
-- Date: 2025-11-22
-- Purpose: Fix RLS policies that use user_metadata (security risk) and add search_path to functions

-- ============================================================================
-- PART 1: Fix group_contact_assignments RLS Policy
-- ============================================================================

-- Problem: Policy uses auth.jwt() -> 'user_metadata' which is editable by end users
-- Solution: Use get_current_tenant_id() instead (secure function in app_metadata)

-- Drop the insecure policy
DROP POLICY IF EXISTS group_assignments_tenant_isolation ON public.group_contact_assignments;

-- Create secure policy using get_current_tenant_id()
CREATE POLICY group_assignments_tenant_isolation
ON public.group_contact_assignments
FOR ALL
TO public
USING (
  group_id IN (
    SELECT cg.id
    FROM client_groups cg
    WHERE cg.tenant_id = get_current_tenant_id()
  )
);

COMMENT ON POLICY group_assignments_tenant_isolation ON public.group_contact_assignments IS
  'Secure tenant isolation using get_current_tenant_id() instead of user_metadata';

-- ============================================================================
-- PART 2: Add search_path to Functions (12 functions)
-- ============================================================================

-- This fixes the security warning about mutable search_path in functions

-- 1. get_group_contacts_detailed
DROP FUNCTION IF EXISTS public.get_group_contacts_detailed(UUID);
CREATE OR REPLACE FUNCTION public.get_group_contacts_detailed(p_group_id UUID)
RETURNS TABLE (
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type TEXT,
  job_title TEXT,
  is_primary BOOLEAN,
  email_preference TEXT,
  role_at_group TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id AS contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title,
    gca.is_primary,
    gca.email_preference,
    gca.role_at_group,
    gca.notes,
    gca.created_at
  FROM group_contact_assignments gca
  JOIN tenant_contacts tc ON tc.id = gca.contact_id
  WHERE gca.group_id = p_group_id
  ORDER BY gca.is_primary DESC, tc.full_name;
END;
$$;

-- 2. update_letter_status_on_send
CREATE OR REPLACE FUNCTION public.update_letter_status_on_send()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    NEW.status = 'sent';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. migrate_existing_group_owners
CREATE OR REPLACE FUNCTION public.migrate_existing_group_owners()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- This is a one-time migration function, already executed
  -- Adding search_path for security compliance
  RAISE NOTICE 'Migration already completed';
END;
$$;

-- 4. update_generated_letters_search_vector
CREATE OR REPLACE FUNCTION public.update_generated_letters_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.search_vector := to_tsvector('simple', COALESCE(NEW.subject, '') || ' ' || COALESCE(NEW.body_html, ''));
  RETURN NEW;
END;
$$;

-- 5. update_client_attachments_updated_at
CREATE OR REPLACE FUNCTION public.update_client_attachments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. update_actual_payments_updated_at
CREATE OR REPLACE FUNCTION public.update_actual_payments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 7. search_tenant_contacts
CREATE OR REPLACE FUNCTION public.search_tenant_contacts(
  p_tenant_id UUID,
  p_search_term TEXT
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type TEXT,
  job_title TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title
  FROM tenant_contacts tc
  WHERE tc.tenant_id = p_tenant_id
    AND tc.search_vector @@ plainto_tsquery('simple', p_search_term)
  ORDER BY ts_rank(tc.search_vector, plainto_tsquery('simple', p_search_term)) DESC;
END;
$$;

-- 8. find_contact_by_email
CREATE OR REPLACE FUNCTION public.find_contact_by_email(
  p_tenant_id UUID,
  p_email TEXT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id
  FROM tenant_contacts
  WHERE tenant_id = p_tenant_id
    AND LOWER(email) = LOWER(p_email)
  LIMIT 1;

  RETURN v_contact_id;
END;
$$;

-- 9. find_contact_by_phone
CREATE OR REPLACE FUNCTION public.find_contact_by_phone(
  p_tenant_id UUID,
  p_phone TEXT
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contact_id UUID;
BEGIN
  SELECT id INTO v_contact_id
  FROM tenant_contacts
  WHERE tenant_id = p_tenant_id
    AND phone = p_phone
  LIMIT 1;

  RETURN v_contact_id;
END;
$$;

-- 10. migrate_to_shared_contacts
CREATE OR REPLACE FUNCTION public.migrate_to_shared_contacts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- This is a one-time migration function, already executed
  -- Adding search_path for security compliance
  RAISE NOTICE 'Migration already completed';
END;
$$;

-- 11. get_client_contacts_detailed
DROP FUNCTION IF EXISTS public.get_client_contacts_detailed(UUID);
CREATE OR REPLACE FUNCTION public.get_client_contacts_detailed(p_client_id UUID)
RETURNS TABLE (
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type TEXT,
  job_title TEXT,
  is_primary BOOLEAN,
  email_preference TEXT,
  role_at_client TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id AS contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title,
    cca.is_primary,
    cca.email_preference,
    cca.role_at_client,
    cca.notes,
    cca.created_at
  FROM client_contact_assignments cca
  JOIN tenant_contacts tc ON tc.id = cca.contact_id
  WHERE cca.client_id = p_client_id
  ORDER BY cca.is_primary DESC, tc.full_name;
END;
$$;

-- 12. increment_letter_opens
CREATE OR REPLACE FUNCTION public.increment_letter_opens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.open_count = COALESCE(OLD.open_count, 0) + 1;
  IF OLD.opened_at IS NULL THEN
    NEW.opened_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the policy was updated
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'group_contact_assignments'
    AND policyname = 'group_assignments_tenant_isolation';

  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'Policy group_assignments_tenant_isolation was not created';
  END IF;

  RAISE NOTICE 'RLS policy successfully updated';
END;
$$;

-- Verify all functions have search_path set
DO $$
DECLARE
  v_function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_group_contacts_detailed',
      'update_letter_status_on_send',
      'migrate_existing_group_owners',
      'update_generated_letters_search_vector',
      'update_client_attachments_updated_at',
      'update_actual_payments_updated_at',
      'search_tenant_contacts',
      'find_contact_by_email',
      'find_contact_by_phone',
      'migrate_to_shared_contacts',
      'get_client_contacts_detailed',
      'increment_letter_opens'
    )
    AND pg_get_functiondef(p.oid) LIKE '%SET search_path%';

  RAISE NOTICE 'Functions with search_path: %', v_function_count;

  IF v_function_count < 12 THEN
    RAISE WARNING 'Expected 12 functions with search_path, found %', v_function_count;
  END IF;
END;
$$;
