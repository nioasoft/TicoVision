/**
 * Shaagat HaAri Grants — TypeScript Types
 *
 * Single source of truth for all type definitions in the grants module.
 * Formula source: DOCS/SHAAGAT_HAARI_FORMULAS.md
 */

// ─────────────────────────────────────────────────────────────────────────────
// Primitive enums / union types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Six distinct calculation tracks, each with unique comparison periods.
 * The UI exposes only: standard, new_business, northern.
 * cash_basis and contractor are supported in calculations but gated in the UI.
 */
export type TrackType =
  | 'standard'      // מסלול רגיל — 03/2025 vs 03/2026
  | 'small'         // מסלול קטנים — lookup table (≤ 300,000 ₪ annual 2022)
  | 'cash_basis'    // בסיס מזומן — 04/2025 vs 04/2026
  | 'new_business'  // עסק חדש (מ-01/01/2025)
  | 'northern'      // עסקים בצפון (מסלול אדום) — 03/2023 vs 03/2026
  | 'contractor';   // קבלנים — ×0.68, מחזור 04/2026

/**
 * Business type — affects employer cost multiplier only (1.25 vs 1.325).
 * Orthogonal to track type.
 */
export type BusinessType = 'regular' | 'ngo';

/**
 * VAT reporting frequency — affects eligibility thresholds and comparison periods.
 */
export type ReportingType = 'monthly' | 'bimonthly';

/**
 * Eligibility determination result.
 */
export type EligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'GRAY_AREA';

// ─────────────────────────────────────────────────────────────────────────────
// Track config — discriminated union
// ─────────────────────────────────────────────────────────────────────────────

interface BaseTrackConfig {
  trackType: TrackType;
  reportingType: ReportingType;
  businessType: BusinessType;
}

export interface StandardTrackConfig extends BaseTrackConfig {
  trackType: 'standard';
  /** Base period: 03/2025 (monthly) or 3-4/2025 (bimonthly) */
  revenueBasePeriod: string;
  /** Comparison period: 03/2026 (monthly) or 3-4/2026 (bimonthly) */
  revenueComparisonPeriod: string;
  /** Inputs averaging period: calendar year 2025 */
  inputsAveragingPeriod: string;
}

export interface SmallBusinessTrackConfig extends BaseTrackConfig {
  trackType: 'small';
  /**
   * Annual revenue in the base year used for the small-business lookup
   * (must be ≤ 300,000).
   *
   * Per the Tax Consultants Institute clarification (May 2026):
   *   • Businesses opened before 1.1.2025 → full year 2025 revenue
   *   • Businesses opened on/after 1.1.2025 → annualized average
   *     from 1.7.2025 (or opening date if later) to 28.2.2026
   */
  annualRevenueBaseYear: number;
}

export interface CashBasisTrackConfig extends BaseTrackConfig {
  trackType: 'cash_basis';
  /** Base: 04/2025 (monthly) or 3-4/2025 (bimonthly) */
  revenueBasePeriod: string;
  /** Comparison: 04/2026 (monthly) or 3-4/2026 (bimonthly) */
  revenueComparisonPeriod: string;
  /**
   * March 2026 decline percentage.
   * Must be < 40% (monthly) or < 20% (bimonthly) to use this track.
   */
  marchDecline: number;
}

export interface NewBusinessTrackConfig extends BaseTrackConfig {
  trackType: 'new_business';
  /** Business opening date — determines averaging period */
  openingDate: Date;
  /** Start of averaging period (03/2025 or the period following opening) */
  averagingStartDate: Date;
  /** Number of active months used for annualized revenue calculation */
  activeMonths: number;
}

export interface NorthernTrackConfig extends BaseTrackConfig {
  trackType: 'northern';
  /** Base: 03/2023 (monthly) or 3-4/2023 (bimonthly) */
  revenueBasePeriod: string;
  /** Inputs period: 09/2022-08/2023 */
  inputsAveragingPeriod: string;
}

export interface ContractorTrackConfig extends BaseTrackConfig {
  trackType: 'contractor';
  /** Base: average 07/2025-02/2026 */
  revenueBasePeriod: string;
  /** Comparison: 04/2026 (monthly) or 3-4/2026 (bimonthly) */
  revenueComparisonPeriod: string;
}

export type TrackConfig =
  | StandardTrackConfig
  | SmallBusinessTrackConfig
  | CashBasisTrackConfig
  | NewBusinessTrackConfig
  | NorthernTrackConfig
  | ContractorTrackConfig;

// ─────────────────────────────────────────────────────────────────────────────
// Eligibility
// ─────────────────────────────────────────────────────────────────────────────

export interface EligibilityInput {
  revenueBase: number;
  revenueComparison: number;
  capitalRevenuesBase: number;
  capitalRevenuesComparison: number;
  selfAccountingRevenuesBase: number;
  selfAccountingRevenuesComparison: number;
  reportingType: ReportingType;
  /** Used to validate 12,000 ≤ annualRevenue ≤ 400,000,000 */
  annualRevenue: number;
}

export interface EligibilityResult {
  netRevenueBase: number;
  netRevenueComparison: number;
  /** Positive = decline, negative = growth */
  declinePercentage: number;
  eligibilityStatus: EligibilityStatus;
  /** 0, 7, 11, 15, or 22 */
  compensationRate: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixed Expenses Grant
// ─────────────────────────────────────────────────────────────────────────────

export interface FixedExpensesInput {
  /** Annual VAT inputs (regular rate) */
  vatInputs: number;
  /** Annual zero-rate VAT inputs */
  zeroVatInputs: number;
  /** Compensation rate from eligibility (7/11/15/22) */
  compensationRate: number;
  /** Number of months to average over — default 12, may be less for new businesses */
  inputsMonths: number;
  /** Whether to apply the ×2 enhanced rate multiplier (was ×1.5 before May 2026) */
  useEnhancedRate: boolean;
}

export interface FixedExpensesResult {
  monthlyAvgInputs: number;
  effectiveRate: number;
  fixedExpensesGrant: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Salary Grant
// ─────────────────────────────────────────────────────────────────────────────

export interface SalaryInput {
  /** Total gross salary March 2026 (form 102). April 2026 for contractors. */
  salaryGross: number;
  tipsDeductions: number;
  miluimDeductions: number;
  chalatDeductions: number;
  vacationDeductions: number;
  totalEmployees: number;
  tipsCount: number;
  miluimCount: number;
  chalatCount: number;
  vacationCount: number;
  businessType: BusinessType;
  /** Raw decline percentage (before bimonthly multiplier) */
  declinePercentage: number;
  reportingType: ReportingType;
}

export interface SalaryResult {
  totalDeductions: number;
  salaryAfterDeductions: number;
  adjustedSalary: number;
  effectiveDecline: number;
  salaryGrantBeforeCap: number;
  employeesAfterDeductions: number;
  salaryCap: number;
  salaryGrant: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grant cap
// ─────────────────────────────────────────────────────────────────────────────

export interface GrantCapResult {
  grantCap: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full grant breakdown
// ─────────────────────────────────────────────────────────────────────────────

export interface GrantBreakdown {
  eligibility: EligibilityResult;
  fixedExpenses: FixedExpensesResult;
  salary: SalaryResult;
  totalGrant: number;
  grantCap: number;
  finalGrantAmount: number;
  /** Set when contractor track applies the ×0.68 multiplier */
  contractorAdjustedGrant?: number;
  /** Set when small business comparison is run */
  smallBusinessGrant?: number;
  /** Highest of finalGrantAmount and smallBusinessGrant */
  recommendedAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Track comparison
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackComparisonEntry {
  trackType: TrackType;
  grantAmount: number;
  isEligible: boolean;
}

export interface TrackComparisonResult {
  entries: TrackComparisonEntry[];
  recommendedTrack: TrackType;
  recommendedAmount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main calculation input
// ─────────────────────────────────────────────────────────────────────────────

export interface GrantCalculationInput {
  trackType: TrackType;
  reportingType: ReportingType;
  businessType: BusinessType;
  eligibility: EligibilityInput;
  fixedExpenses: FixedExpensesInput;
  salary: SalaryInput;
  /**
   * Annual revenue in the base year for business-size determination — required
   * for the small-business "take-the-higher" comparison (≤ 300,000 ₪).
   * Pre-1.1.2025 businesses: full year 2025 revenue.
   * Post-1.1.2025 businesses: annualized average from 1.7.2025.
   */
  annualRevenueBaseYear?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small business lookup
// ─────────────────────────────────────────────────────────────────────────────

export interface SmallBusinessLookupEntry {
  minRevenue: number;
  maxRevenue: number;
  /** Grant amount for 25-40% decline tier */
  tier1: number;
  /** Grant amount for 40-60% decline tier */
  tier2: number;
  /** Grant amount for 60-80% decline tier */
  tier3: number;
  /** Grant amount for 80-100% decline tier */
  tier4: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB row types — matching migration tables
// ─────────────────────────────────────────────────────────────────────────────

export type GrantApplicationStatus =
  | 'feasibility_sent'
  | 'feasibility_completed'
  | 'data_collection'
  | 'calculation_ready'
  | 'fee_pending'
  | 'fee_paid'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'appeal'
  | 'paid_out'
  | 'archived';

export interface GrantApplicationRow {
  id: string;
  tenant_id: string;
  client_id: string;
  track_type: TrackType;
  reporting_type: ReportingType;
  business_type: BusinessType;
  status: GrantApplicationStatus;
  annual_revenue: number | null;
  annual_revenue_base_year: number | null;
  revenue_base: number | null;
  revenue_comparison: number | null;
  capital_revenues_base: number | null;
  capital_revenues_comparison: number | null;
  self_accounting_revenues_base: number | null;
  self_accounting_revenues_comparison: number | null;
  vat_inputs: number | null;
  zero_vat_inputs: number | null;
  inputs_months: number;
  use_enhanced_rate: boolean;
  salary_gross: number | null;
  tips_deductions: number | null;
  miluim_deductions: number | null;
  chalat_deductions: number | null;
  vacation_deductions: number | null;
  total_employees: number | null;
  tips_count: number | null;
  miluim_count: number | null;
  chalat_count: number | null;
  vacation_count: number | null;
  calculated_grant: number | null;
  service_fee_paid: boolean;
  submission_number: string | null;
  submission_screenshot_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface GrantSalaryDataRow {
  id: string;
  application_id: string;
  tenant_id: string;
  employee_count: number | null;
  salary_gross: number | null;
  tips_deductions: number | null;
  miluim_deductions: number | null;
  chalat_deductions: number | null;
  vacation_deductions: number | null;
  tips_count: number | null;
  miluim_count: number | null;
  chalat_count: number | null;
  vacation_count: number | null;
  salary_month: string | null;
  form_102_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantFixedExpensesRow {
  id: string;
  application_id: string;
  tenant_id: string;
  rent: number | null;
  electricity: number | null;
  water: number | null;
  phone_internet: number | null;
  insurance: number | null;
  maintenance: number | null;
  other_fixed: number | null;
  other_fixed_description: string | null;
  total_fixed_expenses: number | null;
  created_at: string;
  updated_at: string;
}
