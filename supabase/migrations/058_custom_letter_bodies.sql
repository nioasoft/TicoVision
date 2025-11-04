-- Migration: Custom Letter Bodies for Universal Letter Builder
-- Description: Table to store custom letter templates created by users (not fee-related)
-- Created: 2025-11-02

-- ============================================================================
-- TABLE: custom_letter_bodies
-- Purpose: Store custom letter body templates created via Universal Letter Builder
-- Note: This is separate from letter_templates (which are fee letter templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_letter_bodies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Multi-tenancy
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Template Metadata
    name TEXT NOT NULL, -- User-provided template name (e.g., "מכתב עדכון שנתי")
    description TEXT, -- Optional description

    -- Content
    plain_text TEXT NOT NULL, -- Original plain text with Markdown syntax
    parsed_html TEXT NOT NULL, -- Generated HTML after parsing

    -- Configuration
    includes_payment BOOLEAN DEFAULT FALSE, -- Whether this template includes payment section

    -- Audit Fields
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),

    -- Indexes
    CONSTRAINT custom_letter_bodies_name_unique UNIQUE (tenant_id, name)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index on tenant_id for fast tenant-specific queries
CREATE INDEX idx_custom_letter_bodies_tenant
ON custom_letter_bodies(tenant_id);

-- Index on created_at for sorting by date
CREATE INDEX idx_custom_letter_bodies_created
ON custom_letter_bodies(created_at DESC);

-- Index on name for search
CREATE INDEX idx_custom_letter_bodies_name
ON custom_letter_bodies(name);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE custom_letter_bodies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their tenant's custom letter bodies
CREATE POLICY select_custom_letter_bodies
ON custom_letter_bodies
FOR SELECT
USING (
    tenant_id IN (
        SELECT tenant_id
        FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- Policy: Users can insert custom letter bodies for their tenant
CREATE POLICY insert_custom_letter_bodies
ON custom_letter_bodies
FOR INSERT
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id
        FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- Policy: Users can update their tenant's custom letter bodies
CREATE POLICY update_custom_letter_bodies
ON custom_letter_bodies
FOR UPDATE
USING (
    tenant_id IN (
        SELECT tenant_id
        FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND is_active = true
    )
)
WITH CHECK (
    tenant_id IN (
        SELECT tenant_id
        FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- Policy: Users can delete their tenant's custom letter bodies
CREATE POLICY delete_custom_letter_bodies
ON custom_letter_bodies
FOR DELETE
USING (
    tenant_id IN (
        SELECT tenant_id
        FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND is_active = true
    )
);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_custom_letter_bodies_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_letter_bodies_timestamp
BEFORE UPDATE ON custom_letter_bodies
FOR EACH ROW
EXECUTE FUNCTION update_custom_letter_bodies_timestamp();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE custom_letter_bodies IS 'Custom letter body templates created via Universal Letter Builder (non-fee-related letters)';
COMMENT ON COLUMN custom_letter_bodies.id IS 'Unique identifier for the custom letter body';
COMMENT ON COLUMN custom_letter_bodies.tenant_id IS 'Tenant that owns this custom letter body';
COMMENT ON COLUMN custom_letter_bodies.name IS 'User-provided template name (unique per tenant)';
COMMENT ON COLUMN custom_letter_bodies.description IS 'Optional description of the template';
COMMENT ON COLUMN custom_letter_bodies.plain_text IS 'Original plain text input with Markdown-like syntax';
COMMENT ON COLUMN custom_letter_bodies.parsed_html IS 'Generated HTML after parsing plain text';
COMMENT ON COLUMN custom_letter_bodies.includes_payment IS 'Whether this template includes payment section with 4 buttons';
COMMENT ON COLUMN custom_letter_bodies.created_at IS 'Timestamp when template was created';
COMMENT ON COLUMN custom_letter_bodies.updated_at IS 'Timestamp when template was last updated';
COMMENT ON COLUMN custom_letter_bodies.created_by IS 'User who created this template';
