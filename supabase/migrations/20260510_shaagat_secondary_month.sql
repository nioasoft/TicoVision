-- ════════════════════════════════════════════════════════════════════════════
-- Shaagat HaAri — Secondary month (April) support + RPC enrichment
-- ════════════════════════════════════════════════════════════════════════════
--   1. Add `secondary_period` + `secondary_month` to accounting submissions
--   2. Update `get_shaagat_accounting_form_by_token` to also return
--      `client_tax_id` and `secondary_period` so the public form can do
--      identity verification and show the second month step.
-- Backwards compatible — existing single-month rows keep working.

ALTER TABLE shaagat_accounting_submissions
  ADD COLUMN IF NOT EXISTS secondary_period TEXT,
  ADD COLUMN IF NOT EXISTS secondary_month JSONB;

COMMENT ON COLUMN shaagat_accounting_submissions.secondary_period IS
  'Secondary salary period label (e.g. "04/2026"). NULL = single-month submission.';

COMMENT ON COLUMN shaagat_accounting_submissions.secondary_month IS
  'Secondary month salary payload (Form 102 fields). Same shape as the row''s top-level salary_* columns.';

-- Refresh the RPC so the public form can verify tax_id + render April step.
CREATE OR REPLACE FUNCTION public.get_shaagat_accounting_form_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', acs.id,
    'client_name', c.company_name,
    'client_tax_id', c.tax_id,
    'salary_period', acs.salary_period,
    'secondary_period', acs.secondary_period,
    'is_submitted', acs.submitted_by_email IS NOT NULL
  ) INTO v_result
  FROM shaagat_accounting_submissions acs
  JOIN clients c ON acs.client_id = c.id
  WHERE acs.submission_token = p_token
    AND acs.token_expires_at > NOW();

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shaagat_accounting_form_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shaagat_accounting_form_by_token(TEXT) TO authenticated;
