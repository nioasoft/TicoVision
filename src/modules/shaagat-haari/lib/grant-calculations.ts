/**
 * Shaagat HaAri Grants — Calculation Engine
 *
 * SINGLE SOURCE OF TRUTH for all grant calculations.
 * All code in the codebase that needs a grant amount must call from this file only.
 *
 * Formula source: DOCS/SHAAGAT_HAARI_FORMULAS.md
 *
 * Rules:
 * - Pure functions only — no side effects, no DB access
 * - Math.round() only on final results, not intermediates
 * - All numeric constants come from grant-constants.ts
 *
 * ⚠️ COMMON HISTORICAL ERRORS (do not repeat):
 *    #1: (salary × 1.25) - deductions  ← WRONG
 *        (salary - deductions) × 1.25  ← CORRECT
 *    #2: salaryCap includes ×0.75     ← WRONG (cap is without ×0.75 per the presentation)
 */

import { GRANT_CONSTANTS, SMALL_BUSINESS_LOOKUP } from './grant-constants';
import type {
  EligibilityInput,
  EligibilityResult,
  EligibilityStatus,
  FixedExpensesInput,
  FixedExpensesResult,
  GrantBreakdown,
  GrantCalculationInput,
  SalaryInput,
  SalaryResult,
  TrackType,
} from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the compensation rate (0, 7, 11, 15, 22) for a given decline%.
 *
 * Per §38לח (verified 13.5.2026): single threshold table applies to the
 * decline measured over the 2-month eligibility period, regardless of
 * VAT filing frequency (monthly or bimonthly).
 */
function getCompensationRate(
  declinePercentage: number,
): { status: EligibilityStatus; rate: number } {
  const thresholds = GRANT_CONSTANTS.ELIGIBILITY_THRESHOLDS;

  // Below or no decline
  if (declinePercentage <= 0) {
    return { status: 'NOT_ELIGIBLE', rate: 0 };
  }

  // Tier check (ordered: highest first to catch highest rate)
  if (declinePercentage >= thresholds.TIER_4.min) {
    return { status: 'ELIGIBLE', rate: thresholds.TIER_4.rate };
  }
  if (declinePercentage >= thresholds.TIER_3.min) {
    return { status: 'ELIGIBLE', rate: thresholds.TIER_3.rate };
  }
  if (declinePercentage >= thresholds.TIER_2.min) {
    return { status: 'ELIGIBLE', rate: thresholds.TIER_2.rate };
  }
  if (declinePercentage >= thresholds.TIER_1.min) {
    return { status: 'ELIGIBLE', rate: thresholds.TIER_1.rate };
  }

  // Below minimum threshold — check gray area (1.5%-points buffer below threshold)
  const grayAreaMin = thresholds.MIN_THRESHOLD - GRANT_CONSTANTS.GRAY_ZONE_BUFFER_PERCENT;
  if (declinePercentage >= grayAreaMin) {
    return { status: 'GRAY_AREA', rate: 0 };
  }

  return { status: 'NOT_ELIGIBLE', rate: 0 };
}

/**
 * Quick eligibility helper for the internal initial-filter screen.
 * Uses the 2-month eligibility period Mar–Apr 2026 vs Mar–Apr 2025
 * (the law's standard period — track-specific shifts apply later).
 *
 * @param baseRevenue - Revenue for Mar–Apr 2025 (sum over 2 months)
 * @param comparisonRevenue - Revenue for Mar–Apr 2026 (sum over 2 months)
 * @returns Status, decline %, and the gray-zone bounds for display
 */
export function quickBimonthlyEligibility(
  baseRevenue: number,
  comparisonRevenue: number,
): {
  declinePercentage: number;
  status: EligibilityStatus;
  grayAreaMin: number;
  minThreshold: number;
} {
  const minThreshold = GRANT_CONSTANTS.ELIGIBILITY_THRESHOLDS.MIN_THRESHOLD;
  const grayAreaMin = minThreshold - GRANT_CONSTANTS.GRAY_ZONE_BUFFER_PERCENT;

  if (baseRevenue <= 0) {
    return {
      declinePercentage: 0,
      status: 'NOT_ELIGIBLE',
      grayAreaMin,
      minThreshold,
    };
  }

  const declinePercentage =
    ((baseRevenue - comparisonRevenue) / baseRevenue) * 100;

  const { status } = getCompensationRate(declinePercentage);

  return {
    declinePercentage,
    status,
    grayAreaMin,
    minThreshold,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Eligibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates eligibility status and compensation rate.
 *
 * Implements formula section 3.1 from SHAAGAT_HAARI_FORMULAS.md.
 *
 * @param input - Revenue figures, adjustments, and reporting type
 * @returns Net revenues, decline%, eligibility status, and compensation rate
 */
export function calculateEligibility(input: EligibilityInput): EligibilityResult {
  const {
    revenueBase,
    revenueComparison,
    capitalRevenuesBase,
    capitalRevenuesComparison,
    selfAccountingRevenuesBase,
    selfAccountingRevenuesComparison,
    annualRevenue,
  } = input;

  // Step 1 — Net revenues
  const netRevenueBase =
    revenueBase - capitalRevenuesBase - selfAccountingRevenuesBase;
  const netRevenueComparison =
    revenueComparison - capitalRevenuesComparison - selfAccountingRevenuesComparison;

  // Annual revenue range validation
  const { MIN, MAX } = GRANT_CONSTANTS.ANNUAL_REVENUE;
  if (annualRevenue < MIN || annualRevenue > MAX) {
    return {
      netRevenueBase,
      netRevenueComparison,
      declinePercentage: 0,
      eligibilityStatus: 'NOT_ELIGIBLE',
      compensationRate: 0,
    };
  }

  // Negative base revenue means we cannot calculate
  if (netRevenueBase <= 0) {
    return {
      netRevenueBase,
      netRevenueComparison,
      declinePercentage: 0,
      eligibilityStatus: 'NOT_ELIGIBLE',
      compensationRate: 0,
    };
  }

  // Step 2 — Decline percentage (full precision, no rounding)
  const declinePercentage =
    ((netRevenueBase - netRevenueComparison) / netRevenueBase) * 100;

  // Step 3 — Determine tier (single threshold table — same for monthly and bimonthly)
  const { status, rate } = getCompensationRate(declinePercentage);

  return {
    netRevenueBase,
    netRevenueComparison,
    declinePercentage,
    eligibilityStatus: status,
    compensationRate: rate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Fixed Expenses Grant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the fixed expenses grant (bimonthly equivalent).
 *
 * Implements formula section 3.2 from SHAAGAT_HAARI_FORMULAS.md, aligned with
 * the law text (§38לח, p.546):
 *   "סך כל התשומות השוטפות בשנה הקודמת, מחולק ב-6 ומוכפל במקדם הוצאות קבועות"
 *
 * The annual inputs are divided by 6 (equivalent to monthly average × 2, since
 * the eligibility period is 2 months). For new businesses the same logic applies
 * via the inputsMonths parameter — for N months of data, divisor is N/2.
 *
 * @param input - Annual inputs totals, compensation rate, months, enhanced flag
 * @returns Monthly average inputs (informational), effective rate, and bimonthly grant (rounded)
 */
export function calculateFixedExpensesGrant(
  input: FixedExpensesInput,
): FixedExpensesResult {
  const { vatInputs, zeroVatInputs, compensationRate, inputsMonths, useEnhancedRate } =
    input;

  // Monthly average inputs — full precision (kept for diagnostic output)
  const monthlyAvgInputs = (vatInputs + zeroVatInputs) / inputsMonths;

  // Effective rate — optionally enhanced ×2 (was ×1.5; updated May 2026)
  const effectiveRate = useEnhancedRate
    ? compensationRate * GRANT_CONSTANTS.ENHANCED_RATE_MULTIPLIER
    : compensationRate;

  // Law's formula: annual inputs ÷ 6 × rate
  // Equivalent: monthlyAvg × 2 × rate (× 2 because eligibility = 2 months)
  const fixedExpensesGrant = Math.round(
    monthlyAvgInputs * 2 * (effectiveRate / 100),
  );

  return { monthlyAvgInputs, effectiveRate, fixedExpensesGrant };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Salary Grant
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the salary grant.
 *
 * Implements formula section 3.3 from SHAAGAT_HAARI_FORMULAS.md.
 *
 * ⚠️ CRITICAL: deductions are subtracted BEFORE multiplying, not after.
 * ⚠️ CRITICAL: salary cap does NOT include ×0.75 factor.
 *
 * @param input - Salary data, employee counts, business type, decline%, reporting type
 * @returns Full salary grant breakdown (rounded finals)
 */
export function calculateSalaryGrant(input: SalaryInput): SalaryResult {
  const {
    salaryGross,
    tipsDeductions,
    miluimDeductions,
    chalatDeductions,
    vacationDeductions,
    totalEmployees,
    tipsCount,
    miluimCount,
    chalatCount,
    vacationCount,
    businessType,
    declinePercentage,
  } = input;

  const { SALARY } = GRANT_CONSTANTS;

  // Step 1 — Adjusted salary (deduct BEFORE multiplying)
  const totalDeductions =
    tipsDeductions + miluimDeductions + chalatDeductions + vacationDeductions;
  const salaryAfterDeductions = salaryGross - totalDeductions;
  const multiplier =
    businessType === 'ngo' ? SALARY.NGO_MULTIPLIER : SALARY.REGULAR_MULTIPLIER;
  const adjustedSalary = salaryAfterDeductions * multiplier;

  // Step 2 — Effective decline = raw decline (single 2-month period per §38לח;
  // no doubling for bimonthly filers — verified 13.5.2026).
  const effectiveDecline = declinePercentage;

  // Step 3 — Grant before cap (round final only)
  const salaryGrantBeforeCap = Math.round(
    adjustedSalary * SALARY.GRANT_FACTOR * (effectiveDecline / 100),
  );

  // Step 4 — Salary cap (NO ×0.75 — see formula doc and historical error note)
  const employeeDeductions = miluimCount + chalatCount + vacationCount + tipsCount;
  const employeesAfterDeductions = Math.max(totalEmployees - employeeDeductions, 1);
  const salaryCap = Math.round(
    employeesAfterDeductions *
      SALARY.CAP_PER_EMPLOYEE *
      multiplier *
      (effectiveDecline / 100),
  );

  // Step 5 — Final salary grant
  const salaryGrant = Math.min(salaryGrantBeforeCap, salaryCap);

  return {
    totalDeductions,
    salaryAfterDeductions,
    adjustedSalary,
    effectiveDecline,
    salaryGrantBeforeCap,
    employeesAfterDeductions,
    salaryCap,
    salaryGrant,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Grant cap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates the overall grant cap based on annual revenue.
 *
 * Implements formula section 3.4 from SHAAGAT_HAARI_FORMULAS.md.
 *
 * Tiers:
 *   < 100M  → 600,000
 *   100M-300M → 600,000 + 0.003 × (revenue − 100M), max 1,200,000
 *   ≥ 300M  → 1,200,000
 *
 * @param annualRevenue - Annual revenue in ILS
 * @returns Grant cap in ILS
 */
export function calculateGrantCap(annualRevenue: number): number {
  const { DEFAULT, MAX, TIER_START, TIER_END, RATE } = GRANT_CONSTANTS.GRANT_CAP;

  if (annualRevenue < TIER_START) {
    return DEFAULT;
  }
  if (annualRevenue >= TIER_END) {
    return MAX;
  }
  // Progressive: 600,000 + 0.003 × (revenue − 100,000,000), capped at 1,200,000
  return Math.min(DEFAULT + RATE * (annualRevenue - TIER_START), MAX);
}

// ─────────────────────────────────────────────────────────────────────────────
// Small business lookup
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Looks up the small business fixed grant from the table.
 *
 * Implements formula section 4 from SHAAGAT_HAARI_FORMULAS.md.
 *
 * @param annualRevenueBaseYear - Annual revenue in the base year (must be 12,000-300,000).
 *   Pre-1.1.2025 businesses: full year 2025. Post-1.1.2025: annualized 25/26 average.
 * @param declinePercentage - Decline percentage (used for monthly tiers: 25-40, 40-60, 60-80, 80-100)
 * @returns Fixed grant amount, or null if revenue is out of lookup range
 */
export function lookupSmallBusinessGrant(
  annualRevenueBaseYear: number,
  declinePercentage: number,
): number | null {
  const row = SMALL_BUSINESS_LOOKUP.find(
    (entry) =>
      annualRevenueBaseYear >= entry.minRevenue &&
      annualRevenueBaseYear < entry.maxRevenue,
  );

  if (!row) return null;

  // Single tier table: 25-40 / 40-60 / 60-80 / 80-100 (applies to the
  // decline measured over the 2-month eligibility period, per §38לח).
  const { ELIGIBILITY_THRESHOLDS: T } = GRANT_CONSTANTS;

  if (declinePercentage >= T.TIER_4.min) return row.tier4;
  if (declinePercentage >= T.TIER_3.min) return row.tier3;
  if (declinePercentage >= T.TIER_2.min) return row.tier2;
  if (declinePercentage >= T.TIER_1.min) return row.tier1;

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small business comparison
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares the calculated grant with the small business lookup grant and returns the higher.
 *
 * Implements formula section 3.6 from SHAAGAT_HAARI_FORMULAS.md.
 *
 * Only applies when:
 *   - annualRevenueBaseYear ≤ 300,000
 *   - trackType !== 'small'
 *
 * Uses raw 2-month-period decline (no bimonthly doubling — verified §38לח).
 *
 * @param finalGrantAmount - Already-capped grant from the main calculation
 * @param annualRevenueBaseYear - Annual revenue in the base year for size determination
 * @param declinePercentage - Decline percentage measured over the 2-month period
 * @param trackType - Current track — skipped if already 'small'
 * @returns Object with smallBusinessGrant (or null) and recommendedAmount
 */
export function maybeCompareWithSmallBusiness(
  finalGrantAmount: number,
  annualRevenueBaseYear: number | undefined,
  declinePercentage: number,
  trackType: TrackType,
): { smallBusinessGrant: number | null; recommendedAmount: number } {
  const SMALL_BUSINESS_MAX_REVENUE = 300_000;

  if (
    trackType === 'small' ||
    annualRevenueBaseYear === undefined ||
    annualRevenueBaseYear > SMALL_BUSINESS_MAX_REVENUE
  ) {
    return { smallBusinessGrant: null, recommendedAmount: finalGrantAmount };
  }

  // Decline used for lookup = raw decline over the 2-month period.
  // No bimonthly doubling — the law uses a single threshold table on the
  // raw 2-month decline regardless of VAT filing frequency.
  const smallBusinessGrant = lookupSmallBusinessGrant(
    annualRevenueBaseYear,
    declinePercentage,
  );

  if (smallBusinessGrant === null) {
    return { smallBusinessGrant: null, recommendedAmount: finalGrantAmount };
  }

  return {
    smallBusinessGrant,
    recommendedAmount: Math.max(finalGrantAmount, smallBusinessGrant),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main grant calculation entry point.
 *
 * Orchestrates the full calculation pipeline:
 *   eligibility → fixedExpenses → salary → cap → contractor adjustment → small business comparison
 *
 * @param input - Full grant calculation input
 * @returns Complete grant breakdown with all intermediates and final recommended amount
 */
export function calculateGrant(input: GrantCalculationInput): GrantBreakdown {
  const {
    trackType,
    eligibility,
    fixedExpenses,
    salary,
    annualRevenueBaseYear,
  } = input;

  // 1 — Eligibility
  const eligibilityResult = calculateEligibility(eligibility);

  // 2 — Fixed expenses grant (using compensation rate from eligibility)
  const fixedExpensesInput: FixedExpensesInput = {
    ...fixedExpenses,
    compensationRate: eligibilityResult.compensationRate,
  };
  const fixedExpensesResult = calculateFixedExpensesGrant(fixedExpensesInput);

  // 3 — Salary grant
  const salaryInput: SalaryInput = {
    ...salary,
    declinePercentage: eligibilityResult.declinePercentage,
  };
  const salaryResult = calculateSalaryGrant(salaryInput);

  // 4 — Eligible expenses (הוצאות מזכות) per §38לח (p.546):
  //   הוצאות מזכות = (הוצאות קבועות + חלק השכר המזכה) × 2
  // The ×2 represents the 2-month eligibility period (March–April 2026).
  // Per CPA guidance (12.5.2026): apply ×2 to the SUM, then compare to cap.
  const subTotal = fixedExpensesResult.fixedExpensesGrant + salaryResult.salaryGrant;
  const totalGrant = subTotal * 2;

  // 5 — Overall grant cap (cap is also based on listed amount × 2 per §38לח)
  const grantCap = calculateGrantCap(eligibility.annualRevenue);
  const cappedGrant = Math.min(totalGrant, grantCap);

  // 6 — Contractor track adjustment (×0.68)
  let finalGrantAmount = cappedGrant;
  let contractorAdjustedGrant: number | undefined;

  if (trackType === 'contractor') {
    contractorAdjustedGrant = Math.round(
      cappedGrant * GRANT_CONSTANTS.CONTRACTOR_MULTIPLIER,
    );
    finalGrantAmount = contractorAdjustedGrant;
  }

  // 7 — Small business comparison ("take the higher")
  const { smallBusinessGrant, recommendedAmount } = maybeCompareWithSmallBusiness(
    finalGrantAmount,
    annualRevenueBaseYear,
    eligibilityResult.declinePercentage,
    trackType,
  );

  return {
    eligibility: eligibilityResult,
    fixedExpenses: fixedExpensesResult,
    salary: salaryResult,
    totalGrant,
    grantCap,
    finalGrantAmount,
    contractorAdjustedGrant,
    smallBusinessGrant: smallBusinessGrant ?? undefined,
    recommendedAmount,
  };
}
