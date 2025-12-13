-- Migration: Add assignment_id to get_client_contacts_detailed RPC
-- Purpose: Enable proper contact deletion by returning the assignment ID
-- Without this, deleteContact cannot find the correct assignment to delete

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_client_contacts_detailed(uuid);

-- Recreate with assignment_id column
CREATE OR REPLACE FUNCTION public.get_client_contacts_detailed(p_client_id uuid)
RETURNS TABLE(
  contact_id uuid,
  assignment_id uuid,  -- NEW: The client_contact_assignments.id for updates/deletes
  full_name text,
  email text,
  phone text,
  phone_secondary text,  -- NEW: Secondary phone number
  contact_type contact_type,
  job_title text,
  is_primary boolean,
  email_preference text,
  role_at_client text,
  notes text,
  assignment_notes text,  -- NEW: Notes from the assignment
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid,
  tenant_id uuid,
  signature_path text
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
    cca.id AS assignment_id,  -- NEW: Return the assignment ID
    tc.full_name,
    tc.email,
    tc.phone,
    tc.phone_secondary,  -- NEW: Include secondary phone
    tc.contact_type,
    tc.job_title,
    cca.is_primary,
    cca.email_preference,
    cca.role_at_client,
    tc.notes,  -- Contact notes
    cca.notes AS assignment_notes,  -- NEW: Assignment-specific notes
    cca.created_at,
    tc.updated_at,
    tc.created_by,
    tc.tenant_id,
    tc.signature_path
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
Added assignment_id, phone_secondary, and assignment_notes in migration 20251213.
The assignment_id is required for proper update/delete operations.';
