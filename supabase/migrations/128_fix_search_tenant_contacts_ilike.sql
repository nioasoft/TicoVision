-- Fix: Add ILIKE for partial search support
-- Full-text search only works for complete words, ILIKE enables autocomplete-style partial matching
-- Problem: User types "אס" and expects to find "אסף בן עטיה", but full-text search doesn't support partial matches

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
    tc.contact_type::TEXT,
    tc.job_title
  FROM tenant_contacts tc
  WHERE tc.tenant_id = p_tenant_id
    AND (
      tc.full_name ILIKE '%' || p_search_term || '%' OR
      tc.email ILIKE '%' || p_search_term || '%' OR
      tc.phone ILIKE '%' || p_search_term || '%'
    )
  ORDER BY
    CASE WHEN tc.full_name ILIKE p_search_term || '%' THEN 0 ELSE 1 END,
    tc.full_name
  LIMIT 20;
END;
$$;
