-- Migration: Fix function search_path security warnings
-- Description: Add explicit search_path to prevent search path injection attacks
-- Date: 2025-11-01
-- Issue: Supabase linter warnings about mutable search_path in functions

-- Fix 1: update_client_contacts_updated_at
ALTER FUNCTION update_client_contacts_updated_at()
SET search_path = public, pg_temp;

-- Fix 2: check_primary_payer_exists
ALTER FUNCTION check_primary_payer_exists()
SET search_path = public, pg_temp;

-- Fix 3: get_collection_statistics
ALTER FUNCTION get_collection_statistics(UUID)
SET search_path = public, pg_temp;

-- Fix 4: get_fees_needing_reminders
ALTER FUNCTION get_fees_needing_reminders(UUID, UUID)
SET search_path = public, pg_temp;

-- Fix 5: ensure_one_primary_phone
ALTER FUNCTION ensure_one_primary_phone()
SET search_path = public, pg_temp;

-- Fix 6: update_client_phones_timestamp
ALTER FUNCTION update_client_phones_timestamp()
SET search_path = public, pg_temp;

-- Fix 7: get_fee_summary
ALTER FUNCTION get_fee_summary(UUID)
SET search_path = public, pg_temp;

COMMENT ON FUNCTION update_client_contacts_updated_at() IS 'Trigger function to update contacts updated_at timestamp. Uses explicit search_path for security.';
COMMENT ON FUNCTION check_primary_payer_exists() IS 'Trigger function to validate primary payer. Uses explicit search_path for security.';
COMMENT ON FUNCTION get_collection_statistics(UUID) IS 'Returns collection dashboard KPIs for a tenant. Uses explicit search_path for security.';
COMMENT ON FUNCTION get_fees_needing_reminders(UUID, UUID) IS 'Returns fees matching a reminder rule criteria. Uses explicit search_path for security.';
COMMENT ON FUNCTION ensure_one_primary_phone() IS 'Trigger function to ensure only one primary phone. Uses explicit search_path for security.';
COMMENT ON FUNCTION update_client_phones_timestamp() IS 'Trigger function to update client updated_at on phone changes. Uses explicit search_path for security.';
COMMENT ON FUNCTION get_fee_summary(UUID) IS 'Returns fee summary statistics for a tenant. Uses explicit search_path for security.';
