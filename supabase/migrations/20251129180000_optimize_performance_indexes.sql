-- Performance Optimization Migration
-- Created at: 2025-11-29
-- Purpose: Add targeted indexes for Foreign Workers module and General Lookups
-- Safety: Uses IF NOT EXISTS to prevent conflicts

-- 1. Optimize Monthly Reports Lookup (Foreign Workers Dashboard)
-- Why: The dashboard filters by branch + type and sorts by date (DESC).
-- Without this, the DB scans all rows for a branch.
CREATE INDEX IF NOT EXISTS idx_client_monthly_reports_lookup 
ON public.client_monthly_reports (tenant_id, branch_id, report_type, month_date DESC);

-- 2. Optimize Worker Data Lookup (Salary Report)
-- Why: Calculating salary reports requires fetching data for specific workers by date.
CREATE INDEX IF NOT EXISTS idx_foreign_worker_data_lookup 
ON public.foreign_worker_monthly_data (tenant_id, branch_id, worker_id, month_date DESC);

-- 3. Optimize Generated Letters (File Manager & History)
-- Why: "History" tabs fetch letters by client ID sorted by creation date.
CREATE INDEX IF NOT EXISTS idx_generated_letters_client_history 
ON public.generated_letters (tenant_id, client_id, created_at DESC);

-- 4. Optimize Audit Logs (Security & Debugging)
-- Why: Audit logs grow fast. Queries usually filter by tenant and sort by time.
CREATE INDEX IF NOT EXISTS idx_audit_logs_timeline 
ON public.audit_logs (tenant_id, created_at DESC);

-- 5. Optimize Fee Calculations (Dashboard & Analytics)
-- Why: Fetching calculations for a specific year and client is a very common operation.
CREATE INDEX IF NOT EXISTS idx_fee_calculations_lookup 
ON public.fee_calculations (tenant_id, client_id, year DESC);

-- Comment confirming execution
COMMENT ON INDEX idx_client_monthly_reports_lookup IS 'Optimizes foreign worker dashboard queries';
