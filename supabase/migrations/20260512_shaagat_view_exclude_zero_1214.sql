-- ════════════════════════════════════════════════════════════════════
-- Shaagat HaAri: exclude clients with tax_coding_status='zero' from the
-- unified dashboard view. These clients file Form 1214 as zero, meaning
-- they have no qualifying revenues — they are structurally ineligible
-- for revenue-based grants, so showing them only adds noise.
-- NULL passes through (legacy / inactive rows aren't accidentally hidden).
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.shaagat_initial_filter_view AS
 WITH latest_eligibility AS (
         SELECT DISTINCT ON (ec.client_id) ec.id AS eligibility_check_id,
            ec.client_id,
            ec.tenant_id,
            ec.eligibility_status,
            ec.decline_percentage,
            ec.compensation_rate,
            ec.payment_status AS shaagat_fee_payment_status,
            ec.email_sent,
            ec.is_relevant,
            ec.created_at AS check_created_at,
            ec.track_type,
            ec.reporting_type,
            ec.business_type
           FROM shaagat_eligibility_checks ec
          WHERE ec.is_active = true
          ORDER BY ec.client_id, ec.created_at DESC
        ), latest_accounting AS (
         SELECT DISTINCT ON (acs.client_id) acs.id AS accounting_submission_id,
            acs.client_id,
            acs.tenant_id,
            acs.submitted_by_email,
            acs.created_at AS accounting_created_at,
            acs.updated_at AS accounting_updated_at
           FROM shaagat_accounting_submissions acs
          WHERE acs.submitted_by_email IS NOT NULL
          ORDER BY acs.client_id, acs.updated_at DESC
        ), latest_calculation AS (
         SELECT DISTINCT ON (dc.client_id) dc.id AS calculation_id,
            dc.client_id,
            dc.tenant_id,
            dc.calculation_step,
            dc.is_completed AS calculation_completed,
            dc.client_approved,
            dc.client_approved_at,
            dc.final_grant_amount
           FROM shaagat_detailed_calculations dc
          WHERE dc.is_active = true
          ORDER BY dc.client_id, dc.created_at DESC
        ), latest_submission AS (
         SELECT DISTINCT ON (ts.client_id) ts.id AS submission_id,
            ts.client_id,
            ts.tenant_id,
            ts.status AS submission_status,
            ts.submission_number,
            ts.submission_date,
            ts.expected_amount,
            ts.received_amount,
            ts.advance_received,
            ts.advance_due_date,
            ts.determination_due_date,
            ts.full_payment_due_date,
            ts.is_closed AS submission_is_closed
           FROM shaagat_tax_submissions ts
          ORDER BY ts.client_id, ts.submission_date DESC NULLS LAST, ts.created_at DESC
        ), annual_retainer_status AS (
         SELECT fc.client_id,
            fc.tenant_id,
            bool_or(fc.status <> ALL (ARRAY['paid'::text, 'cancelled'::text])) AS has_unpaid_annual_retainer,
            count(*) > 0 AS has_any_current_year_fee
           FROM fee_calculations fc
          WHERE fc.year = EXTRACT(year FROM CURRENT_DATE)::integer
          GROUP BY fc.client_id, fc.tenant_id
        )
 SELECT c.id AS client_id,
    c.tenant_id,
    c.company_name,
    c.company_name_hebrew,
    c.tax_id,
    c.status AS client_status,
    le.eligibility_check_id,
    le.eligibility_status,
    le.decline_percentage,
    le.compensation_rate,
    le.shaagat_fee_payment_status,
    le.email_sent,
    le.is_relevant,
    le.check_created_at,
    le.track_type,
    le.reporting_type,
    le.business_type,
    COALESCE(ar.has_unpaid_annual_retainer, false) AS has_unpaid_annual_retainer,
    COALESCE(ar.has_any_current_year_fee, false) AS has_any_current_year_fee,
    la.accounting_submission_id,
    la.accounting_updated_at AS accounting_submitted_at,
    lc.calculation_id,
    lc.calculation_step,
    lc.calculation_completed,
    lc.client_approved,
    lc.client_approved_at,
    lc.final_grant_amount,
    ls.submission_id,
    ls.submission_status,
    ls.submission_number,
    ls.submission_date,
    ls.expected_amount,
    ls.received_amount,
    ls.advance_received,
    ls.advance_due_date,
    ls.determination_due_date,
    ls.full_payment_due_date,
    ls.submission_is_closed
   FROM clients c
     LEFT JOIN latest_eligibility le ON le.client_id = c.id AND le.tenant_id = c.tenant_id
     LEFT JOIN annual_retainer_status ar ON ar.client_id = c.id AND ar.tenant_id = c.tenant_id
     LEFT JOIN latest_accounting la ON la.client_id = c.id AND la.tenant_id = c.tenant_id
     LEFT JOIN latest_calculation lc ON lc.client_id = c.id AND lc.tenant_id = c.tenant_id
     LEFT JOIN latest_submission ls ON ls.client_id = c.id AND ls.tenant_id = c.tenant_id
  WHERE c.status = 'active'::text
    AND c.company_status = 'active'::text
    AND (c.tax_coding_status IS NULL OR c.tax_coding_status <> 'zero');
