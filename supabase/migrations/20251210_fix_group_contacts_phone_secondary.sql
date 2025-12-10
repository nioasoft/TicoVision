-- Migration: Fix get_group_contacts_detailed to include phone_secondary
-- Bug: Missing phone_secondary field causes contacts not to display after adding
-- Date: 2025-12-10

-- Drop existing function
DROP FUNCTION IF EXISTS get_group_contacts_detailed(UUID);

-- Recreate with phone_secondary included
CREATE OR REPLACE FUNCTION get_group_contacts_detailed(
  p_group_id UUID
)
RETURNS TABLE(
  assignment_id UUID,
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  phone_secondary TEXT,  -- ← ADDED: Missing field
  contact_type contact_type,
  job_title TEXT,
  is_primary BOOLEAN,
  notes TEXT,
  other_groups_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gca.id as assignment_id,
    tc.id as contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.phone_secondary,  -- ← ADDED: Return phone_secondary
    tc.contact_type,
    tc.job_title,
    gca.is_primary,
    gca.notes,
    (
      SELECT COUNT(*)::BIGINT
      FROM group_contact_assignments gca2
      WHERE gca2.contact_id = tc.id AND gca2.group_id != p_group_id
    ) as other_groups_count,
    gca.created_at
  FROM group_contact_assignments gca
  JOIN tenant_contacts tc ON gca.contact_id = tc.id
  WHERE gca.group_id = p_group_id
  ORDER BY gca.is_primary DESC NULLS LAST, tc.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_group_contacts_detailed IS
  'Returns all contacts assigned to a group with full details and reuse count (FIXED: includes phone_secondary)';
