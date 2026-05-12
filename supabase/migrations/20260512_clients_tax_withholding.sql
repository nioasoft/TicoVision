-- ════════════════════════════════════════════════════════════════════
-- Clients: tax withholding at source (ניכוי מס במקור)
--   tax_withholding_status      = 'yes' | 'no' | NULL (not yet specified)
--   tax_withholding_percentage  = withholding %, 0–100, only relevant when status='yes'
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tax_withholding_status TEXT
    CHECK (tax_withholding_status IN ('yes', 'no')),
  ADD COLUMN IF NOT EXISTS tax_withholding_percentage NUMERIC(5, 2)
    CHECK (tax_withholding_percentage IS NULL OR (tax_withholding_percentage >= 0 AND tax_withholding_percentage <= 100));

-- A percentage only makes sense when status='yes'
ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_tax_withholding_pct_only_when_yes;
ALTER TABLE clients
  ADD CONSTRAINT clients_tax_withholding_pct_only_when_yes
  CHECK (tax_withholding_percentage IS NULL OR tax_withholding_status = 'yes');

-- Partial index — 'no' is the signal worth flagging, keep it cheap to find
CREATE INDEX IF NOT EXISTS idx_clients_tax_withholding_no
  ON clients (tenant_id) WHERE tax_withholding_status = 'no';

COMMENT ON COLUMN clients.tax_withholding_status IS
  'ניכוי מס במקור: yes = client has withholding (percentage required); no = no withholding (flagged as problematic in UI); NULL = not yet specified';
COMMENT ON COLUMN clients.tax_withholding_percentage IS
  'אחוז ניכוי מס במקור (0–100). Only set when tax_withholding_status = yes.';
