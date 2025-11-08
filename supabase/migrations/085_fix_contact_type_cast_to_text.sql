-- Migration 085: Fix contact_type ENUM to TEXT cast in get_client_contacts_detailed
-- Date: 2025-11-08
-- Issue: Function returns contact_type ENUM but TypeScript expects TEXT
-- Fix: Explicit cast to TEXT in return type and SELECT query

DROP FUNCTION IF EXISTS get_client_contacts_detailed(UUID);

CREATE OR REPLACE FUNCTION get_client_contacts_detailed(p_client_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type TEXT,  -- Changed from 'contact_type' ENUM to TEXT
  job_title TEXT,
  is_primary BOOLEAN,
  email_preference TEXT,
  role_at_client TEXT,
  assignment_notes TEXT,
  contact_notes TEXT,
  other_clients_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cca.id as assignment_id,
    tc.id as contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type::TEXT,  -- Explicit cast to TEXT
    tc.job_title,
    cca.is_primary,
    cca.email_preference,
    cca.role_at_client,
    cca.notes as assignment_notes,
    tc.notes as contact_notes,
    -- Fixed subquery with proper table alias (from migration 084)
    (
      SELECT COUNT(*)::BIGINT
      FROM client_contact_assignments cca2
      WHERE cca2.contact_id = tc.id AND cca2.client_id != p_client_id
    ) as other_clients_count
  FROM client_contact_assignments cca
  JOIN tenant_contacts tc ON cca.contact_id = tc.id
  WHERE cca.client_id = p_client_id
  ORDER BY cca.is_primary DESC, tc.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_client_contacts_detailed IS
  'Returns all contacts assigned to a client with full details. contact_type cast to TEXT for TypeScript compatibility.';
