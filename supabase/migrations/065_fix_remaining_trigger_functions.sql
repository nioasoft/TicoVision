-- Migration: Fix remaining 5 trigger functions missing search_path
-- Date: 2025-11-04
-- Purpose: Add explicit search_path to 5 trigger functions to prevent SQL injection
--
-- Supabase Advisor Issue: function_search_path_mutable
-- Severity: WARN
-- Impact: Security vulnerability - functions could access malicious objects in other schemas
--
-- Functions fixed:
-- 1. update_custom_letter_bodies_timestamp (trigger)
-- 2. check_primary_payer_exists (stable function)
-- 3. ensure_one_primary_phone (trigger)
-- 4. update_client_phones_timestamp (trigger)
-- 5. update_client_contacts_updated_at (trigger)

-- ============================================================================
-- 1. Fix update_custom_letter_bodies_timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_custom_letter_bodies_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_custom_letter_bodies_timestamp IS
'Trigger function to auto-update updated_at timestamp. Protected with explicit search_path.';

-- ============================================================================
-- 2. Fix check_primary_payer_exists
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_primary_payer_exists(
  p_tenant_id uuid,
  p_group_id uuid,
  p_client_id uuid DEFAULT NULL::uuid
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM clients
    WHERE tenant_id = p_tenant_id
      AND group_id = p_group_id
      AND payment_role = 'primary_payer'
      AND status = 'active'
      AND (p_client_id IS NULL OR id != p_client_id)
  );
END;
$function$;

COMMENT ON FUNCTION public.check_primary_payer_exists IS
'Checks if a primary payer exists in a client group. Protected with explicit search_path.';

-- ============================================================================
-- 3. Fix ensure_one_primary_phone
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ensure_one_primary_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other phones for this client to non-primary
    UPDATE client_phones
    SET is_primary = false
    WHERE client_id = NEW.client_id
    AND id != NEW.id
    AND is_primary = true;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.ensure_one_primary_phone IS
'Trigger function to ensure only one primary phone per client. Protected with explicit search_path.';

-- ============================================================================
-- 4. Fix update_client_phones_timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_client_phones_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_client_phones_timestamp IS
'Trigger function to auto-update updated_at timestamp. Protected with explicit search_path.';

-- ============================================================================
-- 5. Fix update_client_contacts_updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_client_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.update_client_contacts_updated_at IS
'Trigger function to auto-update updated_at timestamp. Protected with explicit search_path.';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify all 5 functions now have search_path:
--
-- SELECT
--   p.proname as function_name,
--   CASE
--     WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path = public, pg_temp%' THEN '✓ FIXED'
--     WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN '✓ HAS search_path'
--     ELSE '✗ MISSING search_path'
--   END as status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'update_custom_letter_bodies_timestamp',
--     'check_primary_payer_exists',
--     'ensure_one_primary_phone',
--     'update_client_phones_timestamp',
--     'update_client_contacts_updated_at'
--   )
-- ORDER BY p.proname;
