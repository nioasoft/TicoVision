-- Migration: Move http extension to separate schema
-- Date: 2025-11-04
-- Purpose: Move http extension from public schema to extensions schema for security
--
-- Supabase Advisor Issue: extension_in_public
-- Severity: WARN
-- Impact: Extensions in public schema can create security vulnerabilities
--
-- Solution: Move http extension to dedicated "extensions" schema

-- ============================================================================
-- 1. Create extensions schema if it doesn't exist
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS extensions;

COMMENT ON SCHEMA extensions IS
'Dedicated schema for PostgreSQL extensions to isolate them from application tables and reduce security risks.';

-- ============================================================================
-- 2. Move http extension to extensions schema
-- ============================================================================
-- Note: We need to drop and recreate because ALTER EXTENSION SET SCHEMA
-- is not supported for all extensions
DROP EXTENSION IF EXISTS http CASCADE;

CREATE EXTENSION IF NOT EXISTS http
  SCHEMA extensions
  VERSION '1.6';

COMMENT ON EXTENSION http IS
'HTTP client for PostgreSQL, allows making HTTP requests from SQL. Isolated in extensions schema for security.';

-- ============================================================================
-- 3. Grant usage to authenticated users
-- ============================================================================
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;

-- ============================================================================
-- 4. Update search_path for functions that use http extension
-- ============================================================================
-- If any functions use the http extension, their search_path should include extensions schema
-- Example:
-- ALTER FUNCTION your_function_name SET search_path = public, extensions, pg_temp;

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Run this to verify http extension is now in extensions schema:
--
-- SELECT
--   e.extname as extension_name,
--   n.nspname as schema_name,
--   CASE
--     WHEN n.nspname = 'extensions' THEN '✓ In extensions schema'
--     WHEN n.nspname = 'public' THEN '✗ Still in public'
--     ELSE '? In unexpected schema'
--   END as status
-- FROM pg_extension e
-- JOIN pg_namespace n ON e.extnamespace = n.oid
-- WHERE e.extname = 'http';
