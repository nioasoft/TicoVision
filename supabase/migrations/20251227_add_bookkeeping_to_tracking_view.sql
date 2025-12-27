-- Migration: Add bookkeeping fields to fee_tracking_enhanced_view
-- Date: 2024-12-27
-- Description: Adds bookkeeping_before_vat and bookkeeping_with_vat columns to the enhanced tracking view

-- Drop and recreate the view to add new columns
DROP VIEW IF EXISTS fee_tracking_enhanced_view;

CREATE VIEW fee_tracking_enhanced_view
WITH (security_invoker = true)
AS
SELECT
  fc.id as fee_calculation_id,
  fc.tenant_id,
  fc.client_id,
  c.company_name,
  c.tax_id,
  fc.year,

  -- Original amounts (theoretical)
  fc.final_amount as original_amount,
  fc.calculated_before_vat as original_before_vat,
  fc.calculated_with_vat as original_with_vat,

  -- Bookkeeping amounts (monthly - divide by 12)
  ROUND((fc.bookkeeping_calculation->>'final_amount')::numeric / 12, 2) as bookkeeping_before_vat,
  ROUND((fc.bookkeeping_calculation->>'total_with_vat')::numeric / 12, 2) as bookkeeping_with_vat,

  -- Selected payment method & expected amount
  fc.payment_method_selected,
  fc.amount_after_selected_discount as expected_amount,

  -- Expected discount percentage
  CASE fc.payment_method_selected
    WHEN 'bank_transfer' THEN 9
    WHEN 'cc_single' THEN 8
    WHEN 'cc_installments' THEN 4
    WHEN 'checks' THEN 0
    ELSE 0
  END as expected_discount_percent,

  -- Actual payment details
  ap.id as actual_payment_id,
  ap.amount_paid as actual_amount_paid,
  ap.amount_before_vat as actual_before_vat,
  ap.amount_with_vat as actual_with_vat,
  ap.payment_date as actual_payment_date,
  ap.payment_method as actual_payment_method,
  ap.payment_reference,
  ap.num_installments,
  ap.attachment_ids,

  -- Deviation details
  pd.id as deviation_id,
  pd.deviation_amount,
  pd.deviation_percent,
  pd.alert_level as deviation_alert_level,
  pd.alert_message as deviation_alert_message,
  pd.reviewed as deviation_reviewed,
  pd.reviewed_by as deviation_reviewed_by,
  pd.reviewed_at as deviation_reviewed_at,
  pd.review_notes as deviation_review_notes,

  -- Status
  fc.status,
  fc.payment_date as fee_payment_date,
  fc.has_deviation,

  -- Installment counts
  (SELECT COUNT(*) FROM payment_installments pi WHERE pi.actual_payment_id = ap.id) as installment_count,
  (SELECT COUNT(*) FROM payment_installments pi WHERE pi.actual_payment_id = ap.id AND pi.status = 'paid') as installments_paid,
  (SELECT COUNT(*) FROM payment_installments pi WHERE pi.actual_payment_id = ap.id AND pi.status = 'overdue') as installments_overdue,

  -- File attachment count
  COALESCE(array_length(ap.attachment_ids, 1), 0) as attachment_count,

  -- Timestamps
  fc.created_at,
  fc.updated_at,
  ap.created_at as payment_created_at,
  ap.updated_at as payment_updated_at

FROM fee_calculations fc
LEFT JOIN clients c ON fc.client_id = c.id AND fc.tenant_id = c.tenant_id
LEFT JOIN actual_payments ap ON fc.actual_payment_id = ap.id
LEFT JOIN payment_deviations pd ON fc.id = pd.fee_calculation_id
WHERE fc.tenant_id = get_current_tenant_id();

COMMENT ON VIEW fee_tracking_enhanced_view IS 'Enhanced view - bookkeeping amounts are monthly (divided by 12)';
