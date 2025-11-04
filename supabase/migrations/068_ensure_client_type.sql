-- ================================================
-- Migration: Ensure client type column exists
-- Date: 2025-01-04
-- Description: Verify and create client type column if needed
-- ================================================

-- בדוק ווודא שעמודת type קיימת
DO $$
BEGIN
  -- אם העמודה לא קיימת, צור אותה
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients'
    AND column_name = 'type'
  ) THEN
    ALTER TABLE clients
    ADD COLUMN type client_type DEFAULT 'company';

    CREATE INDEX idx_clients_type
    ON clients(tenant_id, type);

    COMMENT ON COLUMN clients.type IS
    'סוג לקוח: company, freelancer, salary_owner, partnership, nonprofit';

    RAISE NOTICE 'Column type added to clients table';
  ELSE
    RAISE NOTICE 'Column type already exists in clients table';
  END IF;
END $$;

-- וודא ש-client_type enum קיים
DO $$
BEGIN
  -- אם ה-enum לא קיים, צור אותו
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_type') THEN
    CREATE TYPE client_type AS ENUM ('company', 'freelancer', 'salary_owner', 'partnership', 'nonprofit');
    RAISE NOTICE 'Created client_type enum';
  ELSE
    RAISE NOTICE 'client_type enum already exists';
  END IF;
END $$;
