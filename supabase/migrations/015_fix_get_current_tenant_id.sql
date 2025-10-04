-- Migration: Fix get_current_tenant_id() to use user_tenant_access as source of truth
-- Purpose: JWT metadata may not always contain tenant_id, but user_tenant_access always does
-- Date: 2025-10-03

-- Update get_current_tenant_id() to fallback to user_tenant_access
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First try to get from JWT metadata (for backward compatibility)
  SELECT COALESCE(
    -- Try JWT first (fast, cached in session)
    (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID,
    -- If not in JWT, get from user_tenant_access (source of truth)
    (
      SELECT tenant_id
      FROM user_tenant_access
      WHERE user_id = auth.uid()
      AND is_active = true
      AND is_primary = true
      LIMIT 1
    )
  );
$$;

COMMENT ON FUNCTION public.get_current_tenant_id IS
'Returns current user tenant ID from JWT metadata or user_tenant_access (source of truth)';

-- Sync tenant_id to user metadata for all existing users
-- This improves performance by avoiding table lookup on every request
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data ||
  jsonb_build_object('tenant_id', (
    SELECT tenant_id::TEXT
    FROM user_tenant_access
    WHERE user_id = auth.users.id
    AND is_active = true
    AND is_primary = true
    LIMIT 1
  ))
WHERE EXISTS (
  SELECT 1 FROM user_tenant_access
  WHERE user_id = auth.users.id
  AND is_active = true
)
AND (
  -- Only update if tenant_id is missing or different
  (raw_user_meta_data ->> 'tenant_id') IS NULL
  OR
  (raw_user_meta_data ->> 'tenant_id')::UUID != (
    SELECT tenant_id
    FROM user_tenant_access
    WHERE user_id = auth.users.id
    AND is_active = true
    AND is_primary = true
    LIMIT 1
  )
);
