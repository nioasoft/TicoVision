-- Fix: Cast contact_type ENUM to TEXT in search_tenant_contacts function
-- The function declares return type as TEXT but was selecting ENUM directly
-- Error: 'Returned type contact_type does not match expected type text in column 5'

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
    tc.contact_type::TEXT,  -- Cast ENUM to TEXT to match return type
    tc.job_title
  FROM tenant_contacts tc
  WHERE tc.tenant_id = p_tenant_id
    AND tc.search_vector @@ plainto_tsquery('simple', p_search_term)
  ORDER BY ts_rank(tc.search_vector, plainto_tsquery('simple', p_search_term)) DESC;
END;
$$;
