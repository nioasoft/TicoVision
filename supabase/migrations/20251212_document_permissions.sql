-- Migration: Add document_permissions table for document-level access control
-- This table stores permission overrides for document categories and types

-- Create document_permissions table
CREATE TABLE IF NOT EXISTS public.document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Polymorphic: can reference category OR document type
  permission_scope TEXT NOT NULL CHECK (permission_scope IN ('category', 'document_type')),
  scope_id TEXT NOT NULL,  -- category_id (e.g., 'foreign-workers') or document_type_id (e.g., 'foreign-workers:salary-report')

  -- Permission configuration
  allowed_roles TEXT[] NOT NULL DEFAULT '{}',
  denied_roles TEXT[] NOT NULL DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Ensure unique per tenant+scope+scope_id
  UNIQUE(tenant_id, permission_scope, scope_id)
);

-- Add comment for documentation
COMMENT ON TABLE public.document_permissions IS 'Stores permission overrides for document categories and types. Overrides can restrict or expand access based on roles.';
COMMENT ON COLUMN public.document_permissions.permission_scope IS 'Either "category" for category-level overrides or "document_type" for specific document type overrides';
COMMENT ON COLUMN public.document_permissions.scope_id IS 'The category ID (e.g., "foreign-workers") or document type ID (e.g., "foreign-workers:accountant-turnover")';
COMMENT ON COLUMN public.document_permissions.allowed_roles IS 'Roles that are explicitly allowed access (overrides defaults)';
COMMENT ON COLUMN public.document_permissions.denied_roles IS 'Roles that are explicitly denied access (takes precedence over allowed_roles)';

-- Enable RLS
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation for reading
CREATE POLICY "document_permissions_tenant_isolation"
  ON public.document_permissions
  FOR SELECT
  USING (tenant_id = public.get_current_tenant_id());

-- RLS Policy: Only admins can insert/update/delete
CREATE POLICY "document_permissions_admin_write"
  ON public.document_permissions
  FOR ALL
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenant_access
      WHERE user_id = auth.uid()
      AND tenant_id = document_permissions.tenant_id
      AND role = 'admin'
    )
    OR public.is_super_admin(auth.uid())
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_document_permissions_lookup
  ON public.document_permissions(tenant_id, permission_scope, scope_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_document_permissions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS document_permissions_updated_at ON public.document_permissions;
CREATE TRIGGER document_permissions_updated_at
  BEFORE UPDATE ON public.document_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_permissions_updated_at();

-- Add document_type_id column to generated_letters for tracking
ALTER TABLE public.generated_letters
ADD COLUMN IF NOT EXISTS document_type_id TEXT;

-- Create index for efficient queries by document type
CREATE INDEX IF NOT EXISTS idx_generated_letters_document_type
  ON public.generated_letters(tenant_id, document_type_id);

-- Function to check document permission
CREATE OR REPLACE FUNCTION public.check_document_permission(
  p_document_type_id TEXT,
  p_category_id TEXT,
  p_user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_type_override RECORD;
  v_category_override RECORD;
BEGIN
  -- Get current tenant
  v_tenant_id := get_current_tenant_id();

  -- Super admin always has access
  IF is_super_admin(auth.uid()) THEN
    RETURN TRUE;
  END IF;

  -- Check document type-level override first (most specific)
  SELECT * INTO v_type_override
  FROM document_permissions
  WHERE tenant_id = v_tenant_id
    AND permission_scope = 'document_type'
    AND scope_id = p_document_type_id
  LIMIT 1;

  IF FOUND THEN
    -- If explicitly denied, return false
    IF p_user_role = ANY(v_type_override.denied_roles) THEN
      RETURN FALSE;
    END IF;
    -- If explicitly allowed, return true
    IF p_user_role = ANY(v_type_override.allowed_roles) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Check category-level override
  SELECT * INTO v_category_override
  FROM document_permissions
  WHERE tenant_id = v_tenant_id
    AND permission_scope = 'category'
    AND scope_id = p_category_id
  LIMIT 1;

  IF FOUND THEN
    -- If explicitly denied, return false
    IF p_user_role = ANY(v_category_override.denied_roles) THEN
      RETURN FALSE;
    END IF;
    -- If explicitly allowed, return true
    IF p_user_role = ANY(v_category_override.allowed_roles) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- No override found - return NULL to indicate default should be used
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.check_document_permission IS 'Checks if a user role has permission to access a document type. Returns TRUE/FALSE for explicit overrides, NULL for default behavior.';
