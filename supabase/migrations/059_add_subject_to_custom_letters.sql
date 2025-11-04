-- Migration: Add subject column to custom_letter_bodies
-- Description: Add email subject field to custom letter templates
-- Created: 2025-11-02

-- ============================================================================
-- ADD COLUMN: subject
-- Purpose: Store email subject for custom letter templates
-- ============================================================================

ALTER TABLE custom_letter_bodies
ADD COLUMN IF NOT EXISTS subject TEXT;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON COLUMN custom_letter_bodies.subject IS 'Email subject line for this custom letter template (optional)';
