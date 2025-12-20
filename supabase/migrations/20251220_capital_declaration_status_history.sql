-- Capital Declaration Status History
-- Adds new statuses and tracks status changes with notes

-- 1. Update existing 'completed' to 'submitted' before changing constraint
UPDATE capital_declarations SET status = 'submitted' WHERE status = 'completed';

-- 2. Update CHECK constraint - remove 'completed', add new statuses
ALTER TABLE capital_declarations
DROP CONSTRAINT IF EXISTS capital_declarations_status_check;

ALTER TABLE capital_declarations
ADD CONSTRAINT capital_declarations_status_check
CHECK (status IN (
    'draft',              -- טיוטה
    'sent',               -- נשלח
    'in_progress',        -- הלקוח התחיל
    'waiting_documents',  -- ממתין למסמכים
    'reviewing',          -- בבדיקה
    'in_preparation',     -- בהכנה
    'pending_approval',   -- ממתין לאישור
    'submitted',          -- הוגש (הסטטוס הסופי)
    'waiting'             -- ממתין (דחייה)
));

-- 3. Create status history table
CREATE TABLE IF NOT EXISTS capital_declaration_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    declaration_id UUID NOT NULL REFERENCES capital_declarations(id) ON DELETE CASCADE,

    from_status TEXT,  -- null for first entry
    to_status TEXT NOT NULL,
    notes TEXT,        -- optional notes from accountant

    changed_by UUID NOT NULL REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE capital_declaration_status_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies
CREATE POLICY "Tenant isolation for status history"
ON capital_declaration_status_history
FOR ALL
USING (tenant_id = public.get_current_tenant_id());

-- 6. Indexes for performance
CREATE INDEX idx_status_history_declaration
ON capital_declaration_status_history(declaration_id);

CREATE INDEX idx_status_history_changed_at
ON capital_declaration_status_history(changed_at DESC);

-- 7. Grant permissions
GRANT ALL ON capital_declaration_status_history TO authenticated;
