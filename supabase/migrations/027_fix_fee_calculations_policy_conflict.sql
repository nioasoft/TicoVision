-- Migration: Fix conflicting ALL policies on fee_calculations
-- Purpose: Remove overly permissive policy that grants unrestricted access to accountants
-- Bug: "Accountants and admins can manage fee calculations" allows full access without assignment checks
-- Date: 2025-10-03

-- THE PROBLEM:
-- Two conflicting ALL policies:
--   1. "Accountants and admins can manage fee calculations" - Grants FULL access to all accountants
--   2. "staff_manage_assigned_fee_calculations" - Restricts to assigned clients only
--
-- Policy #1 is too broad and conflicts with the assignment-based access model

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Accountants and admins can manage fee calculations" ON fee_calculations;

-- Keep the assignment-based policy (already exists from Migration 020)
-- This ensures accountants/bookkeepers can only manage fee calculations for assigned clients

-- The remaining policies after this migration:
-- ✅ "Bookkeepers can insert fee calculations" (INSERT) - Allows creation
-- ✅ "staff_manage_assigned_fee_calculations" (ALL) - Assignment-based access
-- ✅ "users_view_assigned_fee_calculations" (SELECT) - View based on assignments

COMMENT ON TABLE fee_calculations IS
'Automated fee calculations. RLS enforced: Admins see all in tenant, staff see only assigned clients.';

-- ============================================================================
-- BEFORE vs AFTER
-- ============================================================================
-- BEFORE:
-- - Accountants could manage ALL fee calculations in tenant (via removed policy)
-- - Conflicting policies caused unpredictable behavior
--
-- AFTER:
-- - Accountants can only manage fee calculations for assigned clients
-- - Clean, consistent policy structure
