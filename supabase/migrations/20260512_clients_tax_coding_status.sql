-- ════════════════════════════════════════════════════════════════════
-- Clients: replace free-text `tax_coding` with explicit `tax_coding_status`
-- 'regular' = needs Form 1214 (default for active clients)
-- 'zero'    = 1214 filed as zero — excluded from Shaagat HaAri etc.
-- NULL      = inactive/unknown
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tax_coding_status TEXT
    CHECK (tax_coding_status IN ('regular', 'zero'));

-- NOTE on legacy data: the old `tax_coding` column was historically used as a
-- placeholder ('0' for ~760 rows, empty for 1) — NOT as a real "zero" marker.
-- Per product decision, we ignore legacy values and backfill purely by status:
-- every active client starts as 'regular'; users mark individual clients as
-- 'zero' manually from the UI.
UPDATE clients
  SET tax_coding_status = 'regular'
  WHERE status = 'active' AND tax_coding_status IS NULL;

-- Drop the old free-text column (replaced by explicit status)
ALTER TABLE clients DROP COLUMN IF EXISTS tax_coding;

-- Partial index — only 'zero' rows are selective enough to matter
CREATE INDEX IF NOT EXISTS idx_clients_tax_coding_zero
  ON clients (tenant_id) WHERE tax_coding_status = 'zero';

COMMENT ON COLUMN clients.tax_coding_status IS
  '1214 status: regular = needs Form 1214; zero = files as zero (excluded from revenue-based modules); NULL = not applicable';
