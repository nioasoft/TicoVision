-- Fix valid_workers_data constraint to allow NULL for employee_count
-- This allows marking months as "inactive" (NULL) for Israeli workers reports

-- Drop the existing constraint
ALTER TABLE client_monthly_reports DROP CONSTRAINT IF EXISTS valid_workers_data;

-- Re-create the constraint allowing NULL for employee_count
-- The constraint was: report_type != 'israeli_workers' OR employee_count IS NOT NULL
-- We remove the second part to allow NULL
-- However, we might still want to ensure that IF it's not NULL, it's non-negative (which is covered by positive_employees constraint)
-- So effectively, for israeli_workers, employee_count CAN be NULL now.

-- If we want to ensure data integrity for other types, we can keep the check for them.
-- But for 'israeli_workers', we explicitly want to allow NULL.

-- Let's just drop it as the 'positive_employees' constraint already checks for non-negative if value exists.
-- And we now have a business rule that NULL means "inactive".

-- Optionally, we can add a constraint that ensures at least one of turnover_amount or employee_count is present?
-- No, because different report types use different fields.

-- We can add a more specific constraint if needed, but for now, dropping the strict NOT NULL requirement for israeli_workers is the fix.

-- Let's verify existing constraints first
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'client_monthly_reports'::regclass;

-- Re-applying a modified constraint if we want to be strict about other types (future proofing)
-- For now, removing it is safe as the application logic handles the types correctly.
