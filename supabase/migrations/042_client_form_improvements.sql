-- ================================================
-- Migration: Client Form Improvements
-- Date: 2025-01-29
-- Description: Add commercial name, phone numbers table, and new client types
-- ================================================

-- 1. Add commercial name to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS commercial_name TEXT;

COMMENT ON COLUMN clients.commercial_name IS 'שם מסחרי של הלקוח (אופציונלי)';

-- 2. Add new client types: partnership and nonprofit
DO $$ BEGIN
  -- Add 'partnership' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'client_type' AND e.enumlabel = 'partnership') THEN
    ALTER TYPE client_type ADD VALUE 'partnership';
  END IF;

  -- Add 'nonprofit' if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type t
                 JOIN pg_enum e ON t.oid = e.enumtypid
                 WHERE t.typname = 'client_type' AND e.enumlabel = 'nonprofit') THEN
    ALTER TYPE client_type ADD VALUE 'nonprofit';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- If client_type enum doesn't exist, create it
    CREATE TYPE client_type AS ENUM ('company', 'freelancer', 'salary_owner', 'partnership', 'nonprofit');
END $$;

-- 3. Create client_phones table for multiple phone numbers
CREATE TABLE IF NOT EXISTS client_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone_type TEXT NOT NULL CHECK (phone_type IN ('office', 'mobile', 'fax')),
  phone_number TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, client_id, phone_number)
);

COMMENT ON TABLE client_phones IS 'טבלת טלפונים ללקוחות - תומכת במספר טלפונים לכל לקוח';
COMMENT ON COLUMN client_phones.phone_type IS 'סוג טלפון: office (משרד), mobile (נייד), fax (פקס)';
COMMENT ON COLUMN client_phones.is_primary IS 'האם זה הטלפון הראשי של הלקוח';

-- 4. Enable RLS on client_phones
ALTER TABLE client_phones ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for client_phones (based on client_contacts pattern)

-- Policy: Admin can do everything
CREATE POLICY "admin_all_client_phones"
  ON client_phones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role = 'admin'
      AND uta.is_active = true
    )
  );

-- Policy: Accountant/Bookkeeper can view phones for their tenant
CREATE POLICY "accountant_view_client_phones"
  ON client_phones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
    )
  );

-- Policy: Accountant/Bookkeeper can insert/update phones
CREATE POLICY "accountant_manage_client_phones"
  ON client_phones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
    )
  );

CREATE POLICY "accountant_update_client_phones"
  ON client_phones
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = client_phones.tenant_id
      AND uta.role IN ('accountant', 'bookkeeper')
      AND uta.is_active = true
    )
  );

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_client_phones_client_id ON client_phones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_phones_tenant_id ON client_phones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_phones_primary ON client_phones(client_id) WHERE is_primary = true;

-- 7. Create function to ensure only one primary phone per client
CREATE OR REPLACE FUNCTION ensure_one_primary_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Set all other phones for this client to non-primary
    UPDATE client_phones
    SET is_primary = false
    WHERE client_id = NEW.client_id
    AND id != NEW.id
    AND is_primary = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for primary phone enforcement
DROP TRIGGER IF EXISTS trigger_ensure_one_primary_phone ON client_phones;
CREATE TRIGGER trigger_ensure_one_primary_phone
  AFTER INSERT OR UPDATE OF is_primary
  ON client_phones
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_one_primary_phone();

-- 9. Add updated_at trigger for client_phones
CREATE OR REPLACE FUNCTION update_client_phones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_phones_timestamp ON client_phones;
CREATE TRIGGER trigger_update_client_phones_timestamp
  BEFORE UPDATE ON client_phones
  FOR EACH ROW
  EXECUTE FUNCTION update_client_phones_timestamp();
