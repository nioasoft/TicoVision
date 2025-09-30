-- Migration: Add client_contacts table for managing multiple contacts per client
-- Created: 2025-01-15
-- Purpose: Allow multiple contact persons per client with different roles

-- Create ENUM type for contact types
CREATE TYPE contact_type AS ENUM (
  'owner',              -- בעלים
  'accountant_manager', -- מנהלת חשבונות
  'secretary',          -- מזכירה
  'cfo',               -- סמנכ"ל כספים
  'board_member',      -- חבר דירקטוריון
  'legal_counsel',     -- יועץ משפטי
  'other'              -- אחר
);

-- Create client_contacts table
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Contact type and details
  contact_type contact_type NOT NULL DEFAULT 'other',
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT, -- Free text position/title

  -- Flags
  is_primary BOOLEAN DEFAULT false, -- Primary contact for this client
  is_active BOOLEAN DEFAULT true,

  -- Additional info
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add comments
COMMENT ON TABLE public.client_contacts IS 'Multiple contact persons per client with different roles';
COMMENT ON COLUMN public.client_contacts.contact_type IS 'Type of contact: owner, accountant manager, secretary, etc.';
COMMENT ON COLUMN public.client_contacts.is_primary IS 'Marks the primary contact person for this client';
COMMENT ON COLUMN public.client_contacts.position IS 'Free text position/title for the contact';

-- Create indexes for better performance
CREATE INDEX idx_client_contacts_tenant_id ON public.client_contacts(tenant_id);
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_contact_type ON public.client_contacts(contact_type);
CREATE INDEX idx_client_contacts_is_primary ON public.client_contacts(is_primary) WHERE is_primary = true;

-- Enable RLS (Row Level Security)
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_contacts
-- Policy: Users can view contacts for clients in their tenant
CREATE POLICY "Users can view client contacts in their tenant"
  ON public.client_contacts
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenant_access
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: Users can insert contacts for clients in their tenant
CREATE POLICY "Users can insert client contacts in their tenant"
  ON public.client_contacts
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenant_access
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: Users can update contacts for clients in their tenant
CREATE POLICY "Users can update client contacts in their tenant"
  ON public.client_contacts
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenant_access
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: Users can delete contacts for clients in their tenant
CREATE POLICY "Users can delete client contacts in their tenant"
  ON public.client_contacts
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.user_tenant_access
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_client_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_client_contacts_updated_at();

-- Migration for existing contact_name field
-- Copy existing contact data to client_contacts as primary contact
INSERT INTO public.client_contacts (
  tenant_id,
  client_id,
  contact_type,
  full_name,
  email,
  phone,
  is_primary,
  created_at
)
SELECT
  c.tenant_id,
  c.id as client_id,
  'other'::contact_type, -- Default to 'other' for existing contacts
  c.contact_name,
  c.contact_email,
  c.contact_phone,
  true, -- Mark as primary contact
  c.created_at
FROM public.clients c
WHERE c.contact_name IS NOT NULL
  AND c.contact_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.client_contacts cc
    WHERE cc.client_id = c.id
  );

-- Add comment explaining the migration
COMMENT ON TABLE public.client_contacts IS 'Multiple contact persons per client. Existing contact_name from clients table migrated as primary contacts.';