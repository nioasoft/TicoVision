-- Letters V2 Infrastructure
-- Add columns to support V2 system alongside V1
-- Migration: 091_letters_v2_infrastructure.sql

-- ============================================================================
-- MANUAL STEP REQUIRED: Create Storage Buckets via Supabase Dashboard or CLI
-- ============================================================================
--
-- Bucket 1: letter-assets-v2 (public)
-- Purpose: Store logo images, icons, etc. for V2 letters
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/svg+xml
--
-- Bucket 2: letter-pdfs (public)
-- Purpose: Store generated PDFs
-- Public: true
-- File size limit: 10MB
-- Allowed MIME types: application/pdf
--
-- CLI Commands to create buckets:
-- npx supabase storage create letter-assets-v2 --public
-- npx supabase storage create letter-pdfs --public
--
-- ============================================================================

-- Add V2-specific columns to generated_letters table
-- Using IF NOT EXISTS to be safe for re-runs

-- System version to track which system generated the letter
ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  system_version TEXT DEFAULT 'v1' CHECK (system_version IN ('v1', 'v2'));

-- Version tracking for letter edits
ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  version_number INT DEFAULT 1;

-- Flag to identify the latest version
ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  is_latest BOOLEAN DEFAULT true;

-- Reference to parent letter for edited versions
ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  parent_letter_id UUID REFERENCES generated_letters(id);

-- Storage URL for generated PDFs
ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  pdf_url TEXT;

-- Which rendering engine was used
ALTER TABLE generated_letters ADD COLUMN IF NOT EXISTS
  rendering_engine TEXT DEFAULT 'legacy' CHECK (rendering_engine IN ('legacy', 'unified'));

-- Add descriptive comments for documentation
COMMENT ON COLUMN generated_letters.system_version IS 'Which system generated this letter: v1 (old template system) or v2 (new unified system)';
COMMENT ON COLUMN generated_letters.version_number IS 'Version number for edited letters (starts at 1, increments with each edit)';
COMMENT ON COLUMN generated_letters.is_latest IS 'True if this is the latest version of the letter';
COMMENT ON COLUMN generated_letters.parent_letter_id IS 'References the original letter if this is an edited version';
COMMENT ON COLUMN generated_letters.pdf_url IS 'URL to generated PDF in Supabase Storage bucket';
COMMENT ON COLUMN generated_letters.rendering_engine IS 'Which rendering engine was used: legacy (old) or unified (new V2)';

-- Create indexes for efficient V2 queries
CREATE INDEX IF NOT EXISTS idx_letters_v2_system
  ON generated_letters(system_version, is_latest, created_at DESC)
  WHERE system_version = 'v2';

CREATE INDEX IF NOT EXISTS idx_letters_v2_versions
  ON generated_letters(parent_letter_id, version_number)
  WHERE parent_letter_id IS NOT NULL;

-- Index for finding latest letters by tenant
CREATE INDEX IF NOT EXISTS idx_letters_v2_latest_by_tenant
  ON generated_letters(tenant_id, is_latest, created_at DESC)
  WHERE is_latest = true;

-- Note: RLS policies remain unchanged - existing tenant-based policies work for V2
-- The current RLS ensures tenant isolation which applies to both V1 and V2 letters

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Letters V2 infrastructure migration completed successfully';
  RAISE NOTICE 'Remember to create Storage buckets via Supabase Dashboard or CLI';
END $$;