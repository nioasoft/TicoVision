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

/** Returns the compensation rate (0, 7, 11, 15, 22) for a given decline% and reporting type. */
function getCompensationRate(
  declinePercentage: number,
  isMonthly: boolean,
): { status: EligibilityStatus; rate: number } {
  const thresholds = isMonthly
    ? GRANT_CONSTANTS.MONTHLY_THRESHOLDS
    : GRANT_CONSTANTS.BIMONTHLY_THRESHOLDS;

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

  // Below minimum threshold — check gray area
  const grayAreaMin = thresholds.MIN_THRESHOLD * thresholds.GRAY_AREA_FACTOR;
  if (declinePercentage >= grayAreaMin) {
    return { status: 'GRAY_AREA', rate: 0 };
  }

  return { status: 'NOT_ELIGIBLE', rate: 0 };
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
    reportingType,
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

  // Step 3 — Determine tier
  const isMonthly = reportingType === 'monthly';
  const { status, rate } = getCompensationRate(declinePercentage, isMonthly);

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
 * Calculates the fixed expenses grant.
 *
 * Implements formula section 3.2 from SHAAGAT_HAARI_FORMULAS.md.
 *
 * @param input - Annual inputs totals, compensation rate, months, enhanced flag
 * @returns Monthly average inputs, effective rate, and final grant (rounded)
 */
export function calculateFixedExpensesGrant(
  input: FixedExpensesInput,
): FixedExpensesResult {
  const { vatInputs, zeroVatInputs, compensationRate, inputsMonths, useEnhancedRate } =
    input;

  // Monthly average inputs — full precision
  const monthlyAvgInputs = (vatInputs + zeroVatInputs) / inputsMonths;

  // Effective rate — optionally enhanced ×1.5
  const effectiveRate = useEnhancedRate
    ? compensationRate * GRANT_CONSTANTS.ENHANCED_RATE_MULTIPLIER
    : compensationRate;

  // Final grant — round only here
  const fixedExpensesGrant = Math.round(monthlyAvgInputs * (effectiveRate / 100));

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
    reportingType,
  } = input;

  const { SALARY, BIMONTHLY_DECLINE_MULTIPLIER, BIMONTHLY_DECLINE_CAP } =
    GRANT_CONSTANTS;

  // Step 1 — Adjusted salary (deduct BEFORE multiplying)
  const totalDeductions =
    tipsDeductions + miluimDeductions + chalatDeductions + vacationDeductions;
  const salaryAfterDeductions = salaryGross - totalDeductions;
  const multiplier =
    businessType === 'ngo' ? SALARY.NGO_MULTIPLIER : SALARY.REGULAR_MULTIPLIER;
  const adjustedSalary = salaryAfterDeductions * multiplier;

  // Step 2 — Effective decline (bimonthly ×2, capped at 100%)
  const effectiveDecline =
    reportingType === 'bimonthly'
      ? Math.min(declinePercentage * BIMONTHLY_DECLINE_MULTIPLIER, BIMONTHLY_DECLINE_CAP)
      : declinePercentage;

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
 * @param annualRevenue2022 - Annual revenue in 2022 (must be 12,000-300,000)
 * @param declinePercentage - Decline percentage (used for monthly tiers: 25-40, 40-60, 60-80, 80-100)
 * @returns Fixed grant amount, or null if revenue is out of lookup range
 */
export function lookupSmallBusinessGrant(
  annualRevenue2022: number,
  declinePercentage: number,
): number | null {
  const row = SMALL_BUSINESS_LOOKUP.find(
    (entry) =>
      annualRevenue2022 >= entry.minRevenue && annualRevenue2022 < entry.maxRevenue,
  );

  if (!row) return null;

  // Monthly tiers: 25-40 / 40-60 / 60-80 / 80-100
  // NOTE: bimonthly clients have their decline doubled before calling this function
  const { MONTHLY_THRESHOLDS: MT } = GRANT_CONSTANTS;

  if (declinePercentage >= MT.TIER_4.min) return row.tier4;
  if (declinePercentage >= MT.TIER_3.min) return row.tier3;
  if (declinePercentage >= MT.TIER_2.min) return row.tier2;
  if (declinePercentage >= MT.TIER_1.min) return row.tier1;

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
 *   - annualRevenue2022 ≤ 300,000
 *   - trackType !== 'small'
 *
 * For bimonthly clients: uses effectiveDecline (already ×2) for the lookup.
 *
 * @param finalGrantAmount - Already-capped grant from the main calculation
 * @param annualRevenue2022 - Annual revenue in 2022
 * @param declinePercentage - Raw decline percentage (before bimonthly multiplier)
 * @param trackType - Current track — skipped if already 'small'
 * @param reportingType - Determines whether to double the decline for the lookup
 * @returns Object with smallBusinessGrant (or null) and recommendedAmount
 */
export function maybeCompareWithSmallBusiness(
  finalGrantAmount: number,
  annualRevenue2022: number | undefined,
  declinePercentage: number,
  trackType: TrackType,
  reportingType: 'monthly' | 'bimonthly',
): { smallBusinessGrant: number | null; recommendedAmount: number } {
  const SMALL_BUSINESS_MAX_REVENUE = 300_000;

  if (
    trackType === 'small' ||
    annualRevenue2022 === undefined ||
    annualRevenue2022 > SMALL_BUSINESS_MAX_REVENUE
  ) {
    return { smallBusinessGrant: null, recommendedAmount: finalGrantAmount };
  }

  // For bimonthly: use effective decline (×2, max 100) for the lookup tier
  const lookupDecline =
    reportingType === 'bimonthly'
      ? Math.min(
          declinePercentage * GRANT_CONSTANTS.BIMONTHLY_DECLINE_MULTIPLIER,
          GRANT_CONSTANTS.BIMONTHLY_DECLINE_CAP,
        )
      : declinePercentage;

  const smallBusinessGrant = lookupSmallBusinessGrant(annualRevenue2022, lookupDecline);

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
  const { trackType, reportingType, eligibility, fixedExpenses, salary, annualRevenue2022 } =
    input;

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
    reportingType,
  };
  const salaryResult = calculateSalaryGrant(salaryInput);

  // 4 — Total grant
  const totalGrant = fixedExpensesResult.fixedExpensesGrant + salaryResult.salaryGrant;

  // 5 — Overall grant cap
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
    annualRevenue2022,
    eligibilityResult.declinePercentage,
    trackType,
    reportingType,
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
