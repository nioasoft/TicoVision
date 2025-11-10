-- Migration 096: Make template_id nullable for component-based letters
-- Date: 2025-01-10
-- Author: Claude Code
-- Reason: Template mode letters use component-based system (Header + Body + Payment + Footer)
--         and rely on template_type instead of template_id from letter_templates table

-- 1. Make template_id nullable
ALTER TABLE generated_letters
  ALTER COLUMN template_id DROP NOT NULL;

-- 2. Add check constraint: either template_id OR template_type must exist
ALTER TABLE generated_letters
  ADD CONSTRAINT check_template_id_or_type
  CHECK (template_id IS NOT NULL OR template_type IS NOT NULL);

-- 3. Add descriptive comment
COMMENT ON COLUMN generated_letters.template_id IS
  'Template ID from letter_templates table (for custom letters). NULL for component-based letters that use template_type instead (annual_fee, internal_audit, etc.)';

COMMENT ON COLUMN generated_letters.template_type IS
  'Template type identifier (annual_fee, internal_audit, etc.). Used for component-based letters assembled from /templates/components/ and /templates/bodies/. Custom letters use template_id instead.';

-- 4. Add migration record
COMMENT ON TABLE generated_letters IS
  'Stores generated letters sent to clients. Supports two modes:
   1. Custom mode: Uses template_id (references letter_templates)
   2. Template mode: Uses template_type (component-based: header + body + payment + footer)';
