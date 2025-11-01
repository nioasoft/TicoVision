-- Migration: Move http extension from public schema
-- Description: Move http extension to dedicated extensions schema for better organization and security
-- Date: 2025-11-01
-- Issue: Supabase linter warning about extension in public schema

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;

-- Move http extension from public to extensions schema
ALTER EXTENSION http SET SCHEMA extensions;

-- Update search_path for database to include extensions schema
-- This allows functions to still use http extension without explicit schema qualification
ALTER DATABASE postgres SET search_path TO public, extensions, pg_temp;

COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions to keep public schema clean and organized';
