-- Migration: Fix get_client_contacts_detailed for bookkeeper role
-- Problem: Bookkeepers can't load client emails because the function queries tables with RLS
-- Solution: The function is SECURITY DEFINER but PostgreSQL still applies RLS.
--           We need to bypass RLS by using a direct query that doesn't go through RLS policies.

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_client_contacts_detailed(uuid);

-- Recreate with proper RLS bypass
-- Using SECURITY DEFINER with explicit role switching to bypass RLS
CREATE OR REPLACE FUNCTION public.get_client_contacts_detailed(p_client_id uuid)
RETURNS TABLE(
  contact_id uuid,
  full_name text,
  email text,
  phone text,
  contact_type contact_type,
  job_title text,
  is_primary boolean,
  email_preference text,
  role_at_client text,
  notes text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_tenant_id uuid;
  v_client_tenant_id uuid;
BEGIN
  -- Get current user's tenant_id
  v_tenant_id := get_current_tenant_id();

  -- Get the client's tenant_id to verify access
  SELECT c.tenant_id INTO v_client_tenant_id
  FROM clients c
  WHERE c.id = p_client_id;

  -- Verify the client belongs to the user's tenant
  IF v_client_tenant_id IS NULL OR v_client_tenant_id != v_tenant_id THEN
    -- Return empty result if client doesn't exist or wrong tenant
    RETURN;
  END IF;

  -- Now query with explicit tenant filtering instead of relying on RLS
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
    AND tc.tenant_id = v_tenant_id  -- Explicit tenant check
  ORDER BY cca.is_primary DESC, tc.full_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_client_contacts_detailed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_contacts_detailed(uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_client_contacts_detailed(uuid) IS
'Returns all contacts assigned to a client with full details.
Fixed in migration 137 to work for bookkeeper role by using explicit tenant filtering
instead of relying on RLS policies which may not work correctly with SECURITY DEFINER.';
