-- Rename annual_revenue_2022 → annual_revenue_base_year
-- Per the official law Q&A (haravot-barzel.org.il/ari_qa, 12.5.2026):
--   The base year for size determination depends on opening date:
--     • Pre-1.1.2025 businesses: full year 2025 revenue
--     • Post-1.1.2025 businesses: annualized average from 1.7.2025
--     • Special businesses pre-1.1.2022: full year 2022 revenue
-- Old name (2022) was misleading — the actual year varies by business type.

ALTER TABLE public.shaagat_eligibility_checks
  RENAME COLUMN annual_revenue_2022 TO annual_revenue_base_year;

COMMENT ON COLUMN public.shaagat_eligibility_checks.annual_revenue_base_year IS
  'Annual revenue in the base year for business-size determination (≤300K small-business track lookup). Year varies by business type — see DOCS/SHAAGAT_HAARI_FORMULAS.md §4.';
