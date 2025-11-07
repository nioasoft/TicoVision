-- ================================================
-- Migration: Update Budget with Actual Amounts (After Discounts)
-- Date: 2025-01-12
-- Description:
--   Update get_budget_by_category() to return both:
--   1. Standard amounts (theoretical max - before discounts)
--   2. Actual amounts (what's really coming in - after discounts)
--
--   Actual amounts use amount_after_selected_discount when available,
--   fallback to total_amount for clients who haven't selected payment method yet.
--
--   This ensures Dashboard matches Collections page (Collections is Source of Truth)
-- ================================================

DROP FUNCTION IF EXISTS get_budget_by_category(UUID, INT);

CREATE OR REPLACE FUNCTION get_budget_by_category(
  p_tenant_id UUID,
  p_tax_year INT
)
RETURNS TABLE (
  -- ראיית חשבון - חיצוניים
  audit_external_before_vat NUMERIC,
  audit_external_with_vat NUMERIC,
  audit_external_actual_before_vat NUMERIC,  -- NEW: actual after discounts
  audit_external_actual_with_vat NUMERIC,    -- NEW: actual with VAT
  audit_external_count INT,

  -- ראיית חשבון - פנימיים
  audit_internal_before_vat NUMERIC,
  audit_internal_with_vat NUMERIC,
  audit_internal_actual_before_vat NUMERIC,  -- NEW
  audit_internal_actual_with_vat NUMERIC,    -- NEW
  audit_internal_count INT,

  -- ראיית חשבון - ריטיינר (1/3)
  audit_retainer_before_vat NUMERIC,
  audit_retainer_with_vat NUMERIC,
  audit_retainer_actual_before_vat NUMERIC,  -- NEW
  audit_retainer_actual_with_vat NUMERIC,    -- NEW
  audit_retainer_count INT,

  -- הנהלת חשבונות - פנימיים
  bookkeeping_internal_before_vat NUMERIC,
  bookkeeping_internal_with_vat NUMERIC,
  bookkeeping_internal_actual_before_vat NUMERIC,  -- NEW
  bookkeeping_internal_actual_with_vat NUMERIC,    -- NEW
  bookkeeping_internal_count INT,

  -- הנהלת חשבונות - ריטיינר (2/3)
  bookkeeping_retainer_before_vat NUMERIC,
  bookkeeping_retainer_with_vat NUMERIC,
  bookkeeping_retainer_actual_before_vat NUMERIC,  -- NEW
  bookkeeping_retainer_actual_with_vat NUMERIC,    -- NEW
  bookkeeping_retainer_count INT,

  -- עצמאים
  freelancers_before_vat NUMERIC,
  freelancers_with_vat NUMERIC,
  freelancers_actual_before_vat NUMERIC,  -- NEW
  freelancers_actual_with_vat NUMERIC,    -- NEW
  freelancers_count INT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_vat_rate NUMERIC := 0.18; -- 18% מע"מ
BEGIN
  RETURN QUERY
  WITH client_fees AS (
    SELECT
      fc.id AS fee_id,
      fc.client_id,
      fc.final_amount AS audit_amount,
      fc.total_amount AS audit_total,
      fc.vat_amount AS audit_vat,

      -- NEW: Actual amounts after discount (if selected, else use standard)
      COALESCE(fc.amount_after_selected_discount, fc.final_amount) AS audit_actual_amount,

      -- הנהלת חשבונות (אם קיים)
      (fc.bookkeeping_calculation->>'final_amount')::NUMERIC AS bookkeeping_amount,
      (fc.bookkeeping_calculation->>'total_with_vat')::NUMERIC AS bookkeeping_total,

      -- מאפייני לקוח
      c.is_retainer,
      c.type AS client_type,

      -- האם יש הנהלת חשבונות
      CASE
        WHEN fc.bookkeeping_calculation IS NOT NULL
        AND (fc.bookkeeping_calculation->>'final_amount')::NUMERIC > 0
        THEN true
        ELSE false
      END AS has_bookkeeping

    FROM fee_calculations fc
    JOIN clients c ON fc.client_id = c.id
    WHERE fc.tenant_id = p_tenant_id
      AND fc.year = p_tax_year
  ),

  category_sums AS (
    SELECT
      -- ראיית חשבון - חיצוניים (אין bookkeeping, לא ריטיינר)
      -- Standard amounts
      SUM(CASE WHEN NOT has_bookkeeping AND NOT is_retainer
          THEN audit_amount ELSE 0 END) AS audit_external_before_vat,
      SUM(CASE WHEN NOT has_bookkeeping AND NOT is_retainer
          THEN COALESCE(audit_total, audit_amount * (1 + v_vat_rate)) ELSE 0 END) AS audit_external_with_vat,
      -- NEW: Actual amounts (after discount)
      SUM(CASE WHEN NOT has_bookkeeping AND NOT is_retainer
          THEN audit_actual_amount ELSE 0 END) AS audit_external_actual_before_vat,
      SUM(CASE WHEN NOT has_bookkeeping AND NOT is_retainer
          THEN audit_actual_amount * (1 + v_vat_rate) ELSE 0 END) AS audit_external_actual_with_vat,
      COUNT(DISTINCT CASE WHEN NOT has_bookkeeping AND NOT is_retainer
          THEN client_id END) AS audit_external_count,

      -- ראיית חשבון - פנימיים (יש bookkeeping, לא ריטיינר)
      -- Standard amounts
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN audit_amount ELSE 0 END) AS audit_internal_before_vat,
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN COALESCE(audit_total, audit_amount * (1 + v_vat_rate)) ELSE 0 END) AS audit_internal_with_vat,
      -- NEW: Actual amounts
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN audit_actual_amount ELSE 0 END) AS audit_internal_actual_before_vat,
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN audit_actual_amount * (1 + v_vat_rate) ELSE 0 END) AS audit_internal_actual_with_vat,
      COUNT(DISTINCT CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN client_id END) AS audit_internal_count,

      -- ראיית חשבון - ריטיינר (1/3)
      -- Standard amounts
      SUM(CASE WHEN is_retainer
          THEN audit_amount * 1.0 / 3.0 ELSE 0 END) AS audit_retainer_before_vat,
      SUM(CASE WHEN is_retainer
          THEN COALESCE(audit_total, audit_amount * (1 + v_vat_rate)) * 1.0 / 3.0 ELSE 0 END) AS audit_retainer_with_vat,
      -- NEW: Actual amounts
      SUM(CASE WHEN is_retainer
          THEN audit_actual_amount * 1.0 / 3.0 ELSE 0 END) AS audit_retainer_actual_before_vat,
      SUM(CASE WHEN is_retainer
          THEN audit_actual_amount * (1 + v_vat_rate) * 1.0 / 3.0 ELSE 0 END) AS audit_retainer_actual_with_vat,
      COUNT(DISTINCT CASE WHEN is_retainer
          THEN client_id END) AS audit_retainer_count,

      -- הנהלת חשבונות - פנימיים (יש bookkeeping, לא ריטיינר)
      -- Standard amounts
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN bookkeeping_amount ELSE 0 END) AS bookkeeping_internal_before_vat,
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN COALESCE(bookkeeping_total, bookkeeping_amount * (1 + v_vat_rate)) ELSE 0 END) AS bookkeeping_internal_with_vat,
      -- NEW: Actual amounts (bookkeeping doesn't have discounts yet, so same as standard)
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN bookkeeping_amount ELSE 0 END) AS bookkeeping_internal_actual_before_vat,
      SUM(CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN COALESCE(bookkeeping_total, bookkeeping_amount * (1 + v_vat_rate)) ELSE 0 END) AS bookkeeping_internal_actual_with_vat,
      COUNT(DISTINCT CASE WHEN has_bookkeeping AND NOT is_retainer
          THEN client_id END) AS bookkeeping_internal_count,

      -- הנהלת חשבונות - ריטיינר (2/3)
      -- Standard amounts
      SUM(CASE WHEN is_retainer
          THEN audit_amount * 2.0 / 3.0 ELSE 0 END) AS bookkeeping_retainer_before_vat,
      SUM(CASE WHEN is_retainer
          THEN COALESCE(audit_total, audit_amount * (1 + v_vat_rate)) * 2.0 / 3.0 ELSE 0 END) AS bookkeeping_retainer_with_vat,
      -- NEW: Actual amounts
      SUM(CASE WHEN is_retainer
          THEN audit_actual_amount * 2.0 / 3.0 ELSE 0 END) AS bookkeeping_retainer_actual_before_vat,
      SUM(CASE WHEN is_retainer
          THEN audit_actual_amount * (1 + v_vat_rate) * 2.0 / 3.0 ELSE 0 END) AS bookkeeping_retainer_actual_with_vat,
      COUNT(DISTINCT CASE WHEN is_retainer
          THEN client_id END) AS bookkeeping_retainer_count,

      -- עצמאים (כל ההכנסות מהם)
      -- Standard amounts
      SUM(CASE WHEN client_type = 'freelancer'
          THEN audit_amount + COALESCE(bookkeeping_amount, 0) ELSE 0 END) AS freelancers_before_vat,
      SUM(CASE WHEN client_type = 'freelancer'
          THEN COALESCE(audit_total, audit_amount * (1 + v_vat_rate))
               + COALESCE(bookkeeping_total, bookkeeping_amount * (1 + v_vat_rate), 0)
          ELSE 0 END) AS freelancers_with_vat,
      -- NEW: Actual amounts
      SUM(CASE WHEN client_type = 'freelancer'
          THEN audit_actual_amount + COALESCE(bookkeeping_amount, 0) ELSE 0 END) AS freelancers_actual_before_vat,
      SUM(CASE WHEN client_type = 'freelancer'
          THEN audit_actual_amount * (1 + v_vat_rate)
               + COALESCE(bookkeeping_total, bookkeeping_amount * (1 + v_vat_rate), 0)
          ELSE 0 END) AS freelancers_actual_with_vat,
      COUNT(DISTINCT CASE WHEN client_type = 'freelancer'
          THEN client_id END) AS freelancers_count

    FROM client_fees
  )
  SELECT
    -- ראיית חשבון - חיצוניים
    COALESCE(audit_external_before_vat, 0)::NUMERIC,
    COALESCE(audit_external_with_vat, 0)::NUMERIC,
    COALESCE(audit_external_actual_before_vat, 0)::NUMERIC,  -- NEW
    COALESCE(audit_external_actual_with_vat, 0)::NUMERIC,    -- NEW
    COALESCE(audit_external_count, 0)::INT,

    -- ראיית חשבון - פנימיים
    COALESCE(audit_internal_before_vat, 0)::NUMERIC,
    COALESCE(audit_internal_with_vat, 0)::NUMERIC,
    COALESCE(audit_internal_actual_before_vat, 0)::NUMERIC,  -- NEW
    COALESCE(audit_internal_actual_with_vat, 0)::NUMERIC,    -- NEW
    COALESCE(audit_internal_count, 0)::INT,

    -- ראיית חשבון - ריטיינר
    COALESCE(audit_retainer_before_vat, 0)::NUMERIC,
    COALESCE(audit_retainer_with_vat, 0)::NUMERIC,
    COALESCE(audit_retainer_actual_before_vat, 0)::NUMERIC,  -- NEW
    COALESCE(audit_retainer_actual_with_vat, 0)::NUMERIC,    -- NEW
    COALESCE(audit_retainer_count, 0)::INT,

    -- הנהלת חשבונות - פנימיים
    COALESCE(bookkeeping_internal_before_vat, 0)::NUMERIC,
    COALESCE(bookkeeping_internal_with_vat, 0)::NUMERIC,
    COALESCE(bookkeeping_internal_actual_before_vat, 0)::NUMERIC,  -- NEW
    COALESCE(bookkeeping_internal_actual_with_vat, 0)::NUMERIC,    -- NEW
    COALESCE(bookkeeping_internal_count, 0)::INT,

    -- הנהלת חשבונות - ריטיינר
    COALESCE(bookkeeping_retainer_before_vat, 0)::NUMERIC,
    COALESCE(bookkeeping_retainer_with_vat, 0)::NUMERIC,
    COALESCE(bookkeeping_retainer_actual_before_vat, 0)::NUMERIC,  -- NEW
    COALESCE(bookkeeping_retainer_actual_with_vat, 0)::NUMERIC,    -- NEW
    COALESCE(bookkeeping_retainer_count, 0)::INT,

    -- עצמאים
    COALESCE(freelancers_before_vat, 0)::NUMERIC,
    COALESCE(freelancers_with_vat, 0)::NUMERIC,
    COALESCE(freelancers_actual_before_vat, 0)::NUMERIC,  -- NEW
    COALESCE(freelancers_actual_with_vat, 0)::NUMERIC,    -- NEW
    COALESCE(freelancers_count, 0)::INT

  FROM category_sums;
END;
$$;

COMMENT ON FUNCTION get_budget_by_category IS
'מחזיר פירוט מלא של התקציב לפי קטגוריות עם סכומים תקן ובפועל.
- סכומים תקן (Standard): מחירון מלא לפני הנחות
- סכומים בפועל (Actual): מה שבאמת נכנס אחרי הנחות של אמצעי תשלום
- השתמש ב-COALESCE(amount_after_selected_discount, final_amount) כדי להראות את המציאות
- התאמה מלאה עם דף הגביה (Collections)';

GRANT EXECUTE ON FUNCTION get_budget_by_category(UUID, INT) TO authenticated;
