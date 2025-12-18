-- Capital Declaration System (הצהרות הון)
-- Migration: 20251218_capital_declaration_system.sql
-- Purpose: Create tables, RLS policies, and helper functions for capital declaration feature

-- ============================================================================
-- ENUM: Document categories
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE capital_declaration_category AS ENUM (
        'bank',           -- בנק
        'real_estate',    -- נדל"ן
        'insurance',      -- קופות גמל וביטוח
        'vehicles',       -- רכבים
        'abroad',         -- נכסים בחו"ל
        'other'           -- נכסים/חובות נוספים
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABLE: capital_declarations
-- ============================================================================
CREATE TABLE IF NOT EXISTS capital_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Contact info (recipient)
    contact_name TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    contact_phone_secondary TEXT,
    contact_id UUID REFERENCES tenant_contacts(id) ON DELETE SET NULL,

    -- Client/Group association (optional, for history linking)
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    group_id UUID REFERENCES client_groups(id) ON DELETE SET NULL,

    -- Declaration details
    tax_year INTEGER NOT NULL,
    declaration_date DATE NOT NULL,
    subject TEXT NOT NULL DEFAULT 'הצהרת הון',
    google_drive_link TEXT,
    notes TEXT,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',              -- טיוטה - Created but not sent
        'sent',               -- נשלח - Letter sent to client
        'in_progress',        -- הלקוח התחיל - Client accessed portal
        'waiting_documents',  -- ממתין למסמכים - Partial uploads
        'reviewing',          -- בבדיקה - All documents received
        'completed'           -- הושלם - Process complete
    )),

    -- Public access
    public_token TEXT UNIQUE NOT NULL,
    portal_accessed_at TIMESTAMPTZ,
    portal_access_count INTEGER DEFAULT 0,

    -- Letter reference
    letter_id UUID REFERENCES generated_letters(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_capital_declarations_tenant ON capital_declarations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_capital_declarations_status ON capital_declarations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_capital_declarations_year ON capital_declarations(tenant_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_capital_declarations_token ON capital_declarations(public_token);
CREATE INDEX IF NOT EXISTS idx_capital_declarations_client ON capital_declarations(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capital_declarations_group ON capital_declarations(group_id) WHERE group_id IS NOT NULL;

-- Comments
COMMENT ON TABLE capital_declarations IS 'Capital declaration requests with public upload portal';
COMMENT ON COLUMN capital_declarations.public_token IS 'Unique token for public portal access (no auth required)';
COMMENT ON COLUMN capital_declarations.status IS 'Workflow status: draft -> sent -> in_progress -> waiting_documents -> reviewing -> completed';

-- ============================================================================
-- TABLE: capital_declaration_documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS capital_declaration_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    declaration_id UUID NOT NULL REFERENCES capital_declarations(id) ON DELETE CASCADE,

    -- Document info
    category capital_declaration_category NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,

    -- Metadata
    notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    uploaded_by_ip TEXT,

    -- Constraints
    CONSTRAINT valid_file_type CHECK (file_type IN ('application/pdf', 'image/jpeg', 'image/jpg', 'image/png'))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_declaration_docs_declaration ON capital_declaration_documents(declaration_id);
CREATE INDEX IF NOT EXISTS idx_declaration_docs_category ON capital_declaration_documents(declaration_id, category);
CREATE INDEX IF NOT EXISTS idx_declaration_docs_tenant ON capital_declaration_documents(tenant_id);

-- Comments
COMMENT ON TABLE capital_declaration_documents IS 'Documents uploaded by clients for capital declarations';

-- ============================================================================
-- RLS POLICIES: capital_declarations
-- ============================================================================
ALTER TABLE capital_declarations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tenant users can view declarations" ON capital_declarations;
DROP POLICY IF EXISTS "Tenant users can create declarations" ON capital_declarations;
DROP POLICY IF EXISTS "Tenant users can update declarations" ON capital_declarations;
DROP POLICY IF EXISTS "Tenant users can delete declarations" ON capital_declarations;
DROP POLICY IF EXISTS "Public can view by token" ON capital_declarations;

-- Authenticated users: full access to their tenant's declarations
CREATE POLICY "Tenant users can view declarations"
ON capital_declarations FOR SELECT
TO authenticated
USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID);

CREATE POLICY "Tenant users can create declarations"
ON capital_declarations FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID);

CREATE POLICY "Tenant users can update declarations"
ON capital_declarations FOR UPDATE
TO authenticated
USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID)
WITH CHECK (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID);

CREATE POLICY "Tenant users can delete declarations"
ON capital_declarations FOR DELETE
TO authenticated
USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID);

-- Public access by token (for portal)
CREATE POLICY "Public can view by token"
ON capital_declarations FOR SELECT
TO anon
USING (public_token IS NOT NULL);

-- ============================================================================
-- RLS POLICIES: capital_declaration_documents
-- ============================================================================
ALTER TABLE capital_declaration_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tenant users can manage declaration documents" ON capital_declaration_documents;
DROP POLICY IF EXISTS "Public can upload documents via token" ON capital_declaration_documents;
DROP POLICY IF EXISTS "Public can view documents via token" ON capital_declaration_documents;
DROP POLICY IF EXISTS "Public can delete documents via token" ON capital_declaration_documents;

-- Authenticated users: full access to their tenant's documents
CREATE POLICY "Tenant users can manage declaration documents"
ON capital_declaration_documents FOR ALL
TO authenticated
USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID)
WITH CHECK (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID);

-- Public: can upload documents to declarations with valid token
CREATE POLICY "Public can upload documents via token"
ON capital_declaration_documents FOR INSERT
TO anon
WITH CHECK (
    declaration_id IN (
        SELECT id FROM capital_declarations WHERE public_token IS NOT NULL
    )
);

-- Public: can view documents for declarations with valid token
CREATE POLICY "Public can view documents via token"
ON capital_declaration_documents FOR SELECT
TO anon
USING (
    declaration_id IN (
        SELECT id FROM capital_declarations WHERE public_token IS NOT NULL
    )
);

-- Public: can delete their own uploaded documents
CREATE POLICY "Public can delete documents via token"
ON capital_declaration_documents FOR DELETE
TO anon
USING (
    declaration_id IN (
        SELECT id FROM capital_declarations WHERE public_token IS NOT NULL
    )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get declaration by public token (for portal)
CREATE OR REPLACE FUNCTION get_declaration_by_token(p_token TEXT)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    contact_name TEXT,
    tax_year INTEGER,
    declaration_date DATE,
    status TEXT,
    portal_accessed_at TIMESTAMPTZ,
    tenant_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.id,
        cd.tenant_id,
        cd.contact_name,
        cd.tax_year,
        cd.declaration_date,
        cd.status,
        cd.portal_accessed_at,
        t.name as tenant_name
    FROM capital_declarations cd
    JOIN tenants t ON cd.tenant_id = t.id
    WHERE cd.public_token = p_token;
END;
$$;

-- Function: Track portal access (update access time and count)
CREATE OR REPLACE FUNCTION track_declaration_portal_access(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE capital_declarations
    SET
        portal_accessed_at = COALESCE(portal_accessed_at, NOW()),
        portal_access_count = portal_access_count + 1,
        status = CASE
            WHEN status = 'sent' THEN 'in_progress'
            ELSE status
        END,
        updated_at = NOW()
    WHERE public_token = p_token;

    RETURN FOUND;
END;
$$;

-- Function: Get document counts by category for a declaration
CREATE OR REPLACE FUNCTION get_declaration_document_counts(p_declaration_id UUID)
RETURNS TABLE (
    category capital_declaration_category,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cdd.category,
        COUNT(*)::BIGINT
    FROM capital_declaration_documents cdd
    WHERE cdd.declaration_id = p_declaration_id
    GROUP BY cdd.category;
END;
$$;

-- Function: Update declaration status based on document uploads
CREATE OR REPLACE FUNCTION update_declaration_status_on_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_category_count INTEGER;
    v_total_docs INTEGER;
    v_current_status TEXT;
BEGIN
    -- Get current status
    SELECT status INTO v_current_status
    FROM capital_declarations
    WHERE id = NEW.declaration_id;

    -- Only update if status allows
    IF v_current_status IN ('sent', 'in_progress', 'waiting_documents') THEN
        -- Count distinct categories with documents
        SELECT COUNT(DISTINCT category) INTO v_category_count
        FROM capital_declaration_documents
        WHERE declaration_id = NEW.declaration_id;

        -- Count total documents
        SELECT COUNT(*) INTO v_total_docs
        FROM capital_declaration_documents
        WHERE declaration_id = NEW.declaration_id;

        -- Update status based on progress
        IF v_category_count >= 6 THEN
            UPDATE capital_declarations
            SET status = 'reviewing', updated_at = NOW()
            WHERE id = NEW.declaration_id;
        ELSIF v_total_docs > 0 THEN
            UPDATE capital_declarations
            SET status = 'waiting_documents', updated_at = NOW()
            WHERE id = NEW.declaration_id
            AND status IN ('sent', 'in_progress');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for auto-status update
DROP TRIGGER IF EXISTS trigger_update_declaration_status ON capital_declaration_documents;
CREATE TRIGGER trigger_update_declaration_status
    AFTER INSERT ON capital_declaration_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_declaration_status_on_upload();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_capital_declaration_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_capital_declaration_updated_at ON capital_declarations;
CREATE TRIGGER trigger_capital_declaration_updated_at
    BEFORE UPDATE ON capital_declarations
    FOR EACH ROW
    EXECUTE FUNCTION update_capital_declaration_updated_at();

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================
-- Note: Storage bucket and policies need to be created via Supabase Dashboard or API
-- Bucket name: capital-declarations
-- Public: false
-- File size limit: 15728640 (15MB)
-- Allowed MIME types: application/pdf, image/jpeg, image/jpg, image/png

-- Insert bucket if not exists (this may not work in all Supabase setups)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'capital-declarations',
    'capital-declarations',
    false,
    15728640,
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Authenticated users can manage files in their tenant folder
CREATE POLICY "Authenticated users can upload declaration files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'capital-declarations'
);

CREATE POLICY "Authenticated users can view declaration files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'capital-declarations'
);

CREATE POLICY "Authenticated users can delete declaration files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'capital-declarations'
);

-- Public can upload to declaration folders (path starts with declaration UUID)
CREATE POLICY "Public can upload to declaration folder"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'capital-declarations' AND
    (storage.foldername(name))[1] IN (
        SELECT id::TEXT FROM capital_declarations WHERE public_token IS NOT NULL
    )
);

-- Grant execute on functions to anon for public portal
GRANT EXECUTE ON FUNCTION get_declaration_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION track_declaration_portal_access(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_declaration_document_counts(UUID) TO anon;
