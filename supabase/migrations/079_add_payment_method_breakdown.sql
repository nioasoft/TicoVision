-- ================================================
-- Migration: Add Payment Method Breakdown Function
-- Date: 2025-01-12
-- Description:
--   Create function to return payment method breakdown
--   showing how many clients chose each payment method
--   and the total amounts for each method
-- ================================================

CREATE OR REPLACE FUNCTION get_payment_method_breakdown(
  p_tenant_id UUID,
  p_tax_year INT
)
RETURNS TABLE (
  -- העברה בנקאית (9% הנחה)
  bank_transfer_count INT,
  bank_transfer_amount NUMERIC,

  -- כרטיס אשראי תשלום יחיד (8% הנחה)
  cc_single_count INT,
  cc_single_amount NUMERIC,

  -- כרטיס אשראי תשלומים (4% הנחה)
  cc_installments_count INT,
  cc_installments_amount NUMERIC,

  -- המחאות (0% הנחה)
  checks_count INT,
  checks_amount NUMERIC,

  -- לא נבחר עדיין
  not_selected_count INT,
  not_selected_amount NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- העברה בנקאית
    COUNT(CASE WHEN fc.payment_method_selected = 'bank_transfer' THEN 1 END)::INT AS bank_transfer_count,
    COALESCE(SUM(CASE WHEN fc.payment_method_selected = 'bank_transfer'
                 THEN fc.amount_after_selected_discount END), 0)::NUMERIC AS bank_transfer_amount,

    -- כרטיס אשראי תשלום יחיד
    COUNT(CASE WHEN fc.payment_method_selected = 'cc_single' THEN 1 END)::INT AS cc_single_count,
    COALESCE(SUM(CASE WHEN fc.payment_method_selected = 'cc_single'
                 THEN fc.amount_after_selected_discount END), 0)::NUMERIC AS cc_single_amount,

    -- כרטיס אשראי תשלומים
    COUNT(CASE WHEN fc.payment_method_selected = 'cc_installments' THEN 1 END)::INT AS cc_installments_count,
    COALESCE(SUM(CASE WHEN fc.payment_method_selected = 'cc_installments'
                 THEN fc.amount_after_selected_discount END), 0)::NUMERIC AS cc_installments_amount,

    -- המחאות
    COUNT(CASE WHEN fc.payment_method_selected = 'checks' THEN 1 END)::INT AS checks_count,
    COALESCE(SUM(CASE WHEN fc.payment_method_selected = 'checks'
                 THEN fc.amount_after_selected_discount END), 0)::NUMERIC AS checks_amount,

    -- לא נבחר
    COUNT(CASE WHEN fc.payment_method_selected IS NULL THEN 1 END)::INT AS not_selected_count,
    COALESCE(SUM(CASE WHEN fc.payment_method_selected IS NULL
                 THEN fc.final_amount END), 0)::NUMERIC AS not_selected_amount

  FROM fee_calculations fc
  WHERE fc.tenant_id = p_tenant_id
    AND fc.year = p_tax_year;
END;
$$;

COMMENT ON FUNCTION get_payment_method_breakdown IS
'מחזיר פירוט של אמצעי תשלום: כמה לקוחות בחרו כל שיטה וסכום כולל.
- bank_transfer: העברה בנקאית (9% הנחה)
- cc_single: כרטיס אשראי תשלום יחיד (8% הנחה)
- cc_installments: כרטיס אשראי תשלומים (4% הנחה)
- checks: המחאות (0% הנחה)
- not_selected: לקוחות שעדיין לא בחרו';

GRANT EXECUTE ON FUNCTION get_payment_method_breakdown(UUID, INT) TO authenticated;
