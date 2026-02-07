-- ============================================================================
-- Annual Balance Sheets Module (מאזנים שנתיים)
-- Migration applied via Supabase MCP on 2026-02-06
-- This file documents the schema for version control and reproducibility
-- ============================================================================

-- Main table: one record per client per year
CREATE TABLE IF NOT EXISTS annual_balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  -- Status workflow (8 steps)
  status TEXT NOT NULL DEFAULT 'waiting_for_materials' CHECK (status IN (
    'waiting_for_materials',
    'materials_received',
    'assigned_to_auditor',
    'in_progress',
    'work_completed',
    'office_approved',
    'report_transmitted',
    'advances_updated'
  )),

  -- Step 2: Materials received
  materials_received_at TIMESTAMPTZ,
  materials_received_by UUID REFERENCES auth.users(id),

  -- Step 3: Auditor assignment
  auditor_id UUID REFERENCES auth.users(id),
  meeting_date TIMESTAMPTZ,

  -- Step 4-5: Work progress
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,

  -- Step 6: Office approval
  office_approved_at TIMESTAMPTZ,
  office_approved_by UUID REFERENCES auth.users(id),

  -- Step 7: Report transmission
  report_transmitted_at TIMESTAMPTZ,

  -- Step 8: Tax advances
  new_advances_amount DECIMAL(15,2),
  advances_updated_at TIMESTAMPTZ,
  advances_letter_id UUID REFERENCES generated_letters(id),

  -- Debt letter (optional, not a status step)
  debt_letter_sent BOOLEAN DEFAULT false,
  debt_letter_id UUID REFERENCES generated_letters(id),

  -- General
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, client_id, year)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_abs_tenant_id ON annual_balance_sheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_abs_client_id ON annual_balance_sheets(client_id);
CREATE INDEX IF NOT EXISTS idx_abs_status ON annual_balance_sheets(status);
CREATE INDEX IF NOT EXISTS idx_abs_year ON annual_balance_sheets(year);
CREATE INDEX IF NOT EXISTS idx_abs_auditor_id ON annual_balance_sheets(auditor_id);
CREATE INDEX IF NOT EXISTS idx_abs_tenant_year ON annual_balance_sheets(tenant_id, year);

-- Status history / audit trail
CREATE TABLE IF NOT EXISTS balance_sheet_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_bssh_balance_sheet_id ON balance_sheet_status_history(balance_sheet_id);
CREATE INDEX IF NOT EXISTS idx_bssh_tenant_id ON balance_sheet_status_history(tenant_id);

-- Updated_at trigger (uses shared function update_updated_at_column)
CREATE TRIGGER trigger_abs_updated_at
  BEFORE UPDATE ON annual_balance_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE annual_balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_status_history ENABLE ROW LEVEL SECURITY;

-- annual_balance_sheets: all tenant users can SELECT
CREATE POLICY "abs_select_own_tenant"
  ON annual_balance_sheets FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = annual_balance_sheets.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- annual_balance_sheets: admin + accountant can INSERT
CREATE POLICY "abs_insert_admin_accountant"
  ON annual_balance_sheets FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = annual_balance_sheets.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- annual_balance_sheets: admin + accountant can UPDATE
CREATE POLICY "abs_update_admin_accountant"
  ON annual_balance_sheets FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = annual_balance_sheets.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- annual_balance_sheets: admin only can DELETE
CREATE POLICY "abs_delete_admin_only"
  ON annual_balance_sheets FOR DELETE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = annual_balance_sheets.tenant_id
          AND uta.role = 'admin'
          AND uta.is_active = true
      )
    )
  );

-- balance_sheet_status_history: all tenant users can SELECT
CREATE POLICY "bssh_select_own_tenant"
  ON balance_sheet_status_history FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_sheet_status_history.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- balance_sheet_status_history: admin + accountant can INSERT
CREATE POLICY "bssh_insert_admin_accountant"
  ON balance_sheet_status_history FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_sheet_status_history.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- ============================================================================
-- RPC function for bookkeepers to mark materials received
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_materials_received(
  p_balance_sheet_id UUID,
  p_received_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
  v_current_status TEXT;
BEGIN
  -- Get tenant_id from user metadata
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  -- Verify the record belongs to the user's tenant
  SELECT status INTO v_current_status
  FROM annual_balance_sheets
  WHERE id = p_balance_sheet_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;

  IF v_current_status != 'waiting_for_materials' THEN
    RAISE EXCEPTION 'Can only mark materials for cases in waiting_for_materials status';
  END IF;

  -- Update the record
  UPDATE annual_balance_sheets
  SET
    status = 'materials_received',
    materials_received_at = p_received_at,
    materials_received_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_balance_sheet_id AND tenant_id = v_tenant_id;

  -- Log status change
  INSERT INTO balance_sheet_status_history (balance_sheet_id, tenant_id, from_status, to_status, changed_by)
  VALUES (p_balance_sheet_id, v_tenant_id, 'waiting_for_materials', 'materials_received', auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
