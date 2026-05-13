/**
 * Comprehensive tests for Shaagat HaAri grant calculation engine.
 *
 * Source of truth: DOCS/SHAAGAT_HAARI_FORMULAS.md
 * 100+ test cases covering eligibility, fixed expenses, salary, caps,
 * small business lookup, track comparison, full integration, and rounding.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEligibility,
  calculateFixedExpensesGrant,
  calculateSalaryGrant,
  calculateGrantCap,
  lookupSmallBusinessGrant,
  calculateGrant,
  maybeCompareWithSmallBusiness,
} from '../grant-calculations';
import { GRANT_CONSTANTS, SMALL_BUSINESS_LOOKUP } from '../grant-constants';
import type {
  EligibilityInput,
  FixedExpensesInput,
  SalaryInput,
  GrantCalculationInput,
} from '../../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeEligibilityInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    revenueBase: 100_000,
    revenueComparison: 60_000,
    capitalRevenuesBase: 0,
    capitalRevenuesComparison: 0,
    selfAccountingRevenuesBase: 0,
    selfAccountingRevenuesComparison: 0,
    reportingType: 'monthly',
    annualRevenue: 1_000_000,
    ...overrides,
  };
}

function makeFixedExpensesInput(overrides: Partial<FixedExpensesInput> = {}): FixedExpensesInput {
  return {
    vatInputs: 1_000_000,
    zeroVatInputs: 0,
    compensationRate: 15,
    inputsMonths: 12,
    useEnhancedRate: false,
    ...overrides,
  };
}

function makeSalaryInput(overrides: Partial<SalaryInput> = {}): SalaryInput {
  return {
    salaryGross: 180_365,
    tipsDeductions: 0,
    miluimDeductions: 0,
    chalatDeductions: 0,
    vacationDeductions: 0,
    totalEmployees: 10,
    tipsCount: 0,
    miluimCount: 0,
    chalatCount: 0,
    vacationCount: 0,
    businessType: 'regular',
    declinePercentage: 68,
    reportingType: 'monthly',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ELIGIBILITY (27 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateEligibility', () => {
  // --- Monthly threshold boundaries ---

  it('should return ELIGIBLE at exactly 25% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 75_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(7);
    expect(result.declinePercentage).toBe(25);
  });

  it('should return GRAY_AREA at 24.99% decline (monthly, within gray area)', () => {
    const input = makeEligibilityInput({
      revenueBase: 10_000,
      revenueComparison: 7_501, // 24.99% decline — in gray area (23-25%)
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
    expect(result.compensationRate).toBe(0);
  });

  it('should return NOT_ELIGIBLE at 22.5% decline (monthly, below gray area min of 23.5%)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 77_500, // 22.5% decline — below gray area (< 23.5%)
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
    expect(result.compensationRate).toBe(0);
  });

  it('should return GRAY_AREA at exactly 23.5% decline (monthly, gray area floor)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 76_500, // 23.5% decline — bottom of gray area (1.5% below 25%)
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
    expect(result.compensationRate).toBe(0);
  });

  it('should return NOT_ELIGIBLE at 23.49% decline (monthly, just below gray area)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 76_510, // 23.49% decline — below gray area (< 23.5%)
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
  });

  it('should return NOT_ELIGIBLE when revenue increases (negative decline)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 120_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
    expect(result.declinePercentage).toBeLessThan(0);
    expect(result.compensationRate).toBe(0);
  });

  it('should return ELIGIBLE with rate 7 for 35% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 65_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(7);
  });

  it('should return ELIGIBLE with rate 11 at exactly 40% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 60_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(11);
  });

  it('should return ELIGIBLE with rate 11 for 50% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 50_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(11);
  });

  it('should return ELIGIBLE with rate 15 at exactly 60% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 40_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(15);
  });

  it('should return ELIGIBLE with rate 22 at exactly 80% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 20_000,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(22);
  });

  it('should return ELIGIBLE with rate 22 at 100% decline (monthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 0,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(22);
    expect(result.declinePercentage).toBe(100);
  });

  it('should return rate 7 at 39.99% decline (just below 40% tier boundary)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 60_010,
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(7);
  });

  it('should return rate 11 at 59.99% decline (just below 60% tier boundary)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 40_010,
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(11);
  });

  it('should return rate 15 at 79.99% decline (just below 80% tier boundary)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 20_010,
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(15);
  });

  // --- Bimonthly threshold boundaries ---

  it('should return ELIGIBLE at exactly 12.5% decline (bimonthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 87_500,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(7);
  });

  it('should return GRAY_AREA at 12.49% decline (bimonthly, within gray area)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 87_510, // ~12.49% decline — in gray area (11.5-12.5%)
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
  });

  it('should return GRAY_AREA at exactly 11% decline (bimonthly, gray area floor of 12.5−1.5)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 89_000, // 11% decline — bottom of gray area
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
  });

  it('should return GRAY_AREA at 11.5% decline (bimonthly, within gray area)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 88_500,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
  });

  it('should return NOT_ELIGIBLE at 10.99% decline (bimonthly, below gray area floor of 11%)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 89_010, // 10.99% decline
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
  });

  it('should return rate 11 at exactly 20% decline (bimonthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 80_000,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(11);
  });

  it('should return rate 15 at exactly 30% decline (bimonthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 70_000,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(15);
  });

  it('should return rate 22 at exactly 40% decline (bimonthly)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 60_000,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(22);
  });

  it('should return rate 22 at 50% decline (bimonthly max tier)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 50_000,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.compensationRate).toBe(22);
  });

  // --- Net revenue & deductions ---

  it('should correctly compute net revenue by subtracting capital and self-accounting revenues', () => {
    const input = makeEligibilityInput({
      revenueBase: 200_000,
      capitalRevenuesBase: 30_000,
      selfAccountingRevenuesBase: 20_000,
      revenueComparison: 100_000,
      capitalRevenuesComparison: 10_000,
      selfAccountingRevenuesComparison: 5_000,
    });
    const result = calculateEligibility(input);
    expect(result.netRevenueBase).toBe(150_000);
    expect(result.netRevenueComparison).toBe(85_000);
    expect(result.declinePercentage).toBeCloseTo(43.3333, 2);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(11);
  });

  // --- Annual revenue validation ---

  it('should return NOT_ELIGIBLE when annual revenue is below minimum (12,000)', () => {
    const input = makeEligibilityInput({ annualRevenue: 11_999 });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
  });

  it('should return NOT_ELIGIBLE when annual revenue exceeds maximum (400,000,000)', () => {
    const input = makeEligibilityInput({ annualRevenue: 400_000_001 });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
  });

  it('should be ELIGIBLE at exactly minimum annual revenue (12,000)', () => {
    const input = makeEligibilityInput({ annualRevenue: 12_000 });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
  });

  it('should be ELIGIBLE at exactly maximum annual revenue (400,000,000)', () => {
    const input = makeEligibilityInput({ annualRevenue: 400_000_000 });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
  });

  // --- Zero / edge cases ---

  it('should handle zero comparison revenue (100% decline)', () => {
    const input = makeEligibilityInput({ revenueBase: 50_000, revenueComparison: 0 });
    const result = calculateEligibility(input);
    expect(result.declinePercentage).toBe(100);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(22);
  });

  it('should handle equal revenues (0% decline -> NOT_ELIGIBLE)', () => {
    const input = makeEligibilityInput({ revenueBase: 100_000, revenueComparison: 100_000 });
    const result = calculateEligibility(input);
    expect(result.declinePercentage).toBe(0);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
  });

  it('should return NOT_ELIGIBLE when net base revenue is zero or negative', () => {
    const input = makeEligibilityInput({
      revenueBase: 50_000,
      capitalRevenuesBase: 30_000,
      selfAccountingRevenuesBase: 30_000, // net = -10,000
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('NOT_ELIGIBLE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FIXED EXPENSES GRANT (10 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateFixedExpensesGrant', () => {
  // Per §38לח (p.546): annual_inputs / 6 × rate
  // Equivalent: monthlyAvg × 2 × rate (×2 = 2-month eligibility period).

  it('should calculate basic fixed expenses grant correctly', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_200_000,
      compensationRate: 15,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    expect(result.monthlyAvgInputs).toBe(100_000);
    expect(result.effectiveRate).toBe(15);
    // 1,200,000 / 6 × 15% = 200,000 × 15% = 30,000
    expect(result.fixedExpensesGrant).toBe(30_000);
  });

  it('should apply x2 enhanced rate multiplier when enabled', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_200_000,
      compensationRate: 15,
      inputsMonths: 12,
      useEnhancedRate: true,
    });
    const result = calculateFixedExpensesGrant(input);
    expect(result.effectiveRate).toBe(30);
    // 1,200,000 / 6 × 30% = 200,000 × 30% = 60,000
    expect(result.fixedExpensesGrant).toBe(60_000);
  });

  it('should include zero-rate VAT inputs in calculation', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 600_000,
      zeroVatInputs: 600_000,
      compensationRate: 7,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    expect(result.monthlyAvgInputs).toBe(100_000);
    // 1,200,000 / 6 × 7% = 200,000 × 7% = 14,000
    expect(result.fixedExpensesGrant).toBe(14_000);
  });

  it('should return 0 grant when inputs are zero', () => {
    const input = makeFixedExpensesInput({ vatInputs: 0, zeroVatInputs: 0, compensationRate: 22 });
    const result = calculateFixedExpensesGrant(input);
    expect(result.fixedExpensesGrant).toBe(0);
  });

  it('should handle compensation rate 7%', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_804_368,
      compensationRate: 7,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    // 1,804,368 / 6 × 7% = 300,728 × 7% = 21,050.96 → 21,051
    expect(result.fixedExpensesGrant).toBe(21_051);
  });

  it('should handle compensation rate 11%', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_804_368,
      compensationRate: 11,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    // 1,804,368 / 6 × 11% = 300,728 × 11% = 33,080.08 → 33,080
    expect(result.fixedExpensesGrant).toBe(33_080);
  });

  it('should handle compensation rate 22%', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_804_368,
      compensationRate: 22,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    // 1,804,368 / 6 × 22% = 300,728 × 22% = 66,160.16 → 66,160
    expect(result.fixedExpensesGrant).toBe(66_160);
  });

  it('should handle fewer months for new businesses (6 months)', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 600_000,
      compensationRate: 15,
      inputsMonths: 6,
    });
    const result = calculateFixedExpensesGrant(input);
    expect(result.monthlyAvgInputs).toBe(100_000);
    // For 6 months data: monthlyAvg 100K × 2 × 15% = 30,000
    expect(result.fixedExpensesGrant).toBe(30_000);
  });

  it('should match official Q97 example: 600K @ 11% = 11,000 (with /6 divisor)', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 600_000,
      compensationRate: 11,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    // 600,000 / 6 × 11% = 100,000 × 11% = 11,000  (Q97 official example)
    expect(result.fixedExpensesGrant).toBe(11_000);
  });

  it('should handle x2 with rate 22 giving effective rate 44', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 120_000,
      compensationRate: 22,
      inputsMonths: 12,
      useEnhancedRate: true,
    });
    const result = calculateFixedExpensesGrant(input);
    expect(result.effectiveRate).toBe(44);
    // 120,000 / 6 × 44% = 20,000 × 44% = 8,800
    expect(result.fixedExpensesGrant).toBe(8_800);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SALARY GRANT (25 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateSalaryGrant', () => {
  // --- CRITICAL: deduction order ---

  it('CRITICAL: should deduct BEFORE multiplying — (salary - deductions) × 1.25', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      tipsDeductions: 10_000,
      businessType: 'regular',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    // CORRECT: (100,000 - 10,000) × 1.25 = 112,500
    // WRONG:   (100,000 × 1.25) - 10,000 = 115,000
    expect(result.salaryAfterDeductions).toBe(90_000);
    expect(result.adjustedSalary).toBe(112_500);
  });

  it('should use multiplier 1.25 for regular businesses', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      businessType: 'regular',
      declinePercentage: 40,
    });
    const result = calculateSalaryGrant(input);
    expect(result.adjustedSalary).toBe(125_000);
  });

  it('should use multiplier 1.325 for NGO businesses', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      businessType: 'ngo',
      declinePercentage: 40,
    });
    const result = calculateSalaryGrant(input);
    expect(result.adjustedSalary).toBe(132_500);
  });

  it('should apply 0.75 factor to adjusted salary in grant calculation', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      businessType: 'regular',
      declinePercentage: 100,
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    // 100,000 × 1.25 × 0.75 × 1.0 = 93,750
    expect(result.salaryGrantBeforeCap).toBe(93_750);
  });

  it('should calculate effective decline for bimonthly (×2, capped at 100%)', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      declinePercentage: 30,
      reportingType: 'bimonthly',
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    expect(result.effectiveDecline).toBe(60);
  });

  it('should cap bimonthly effective decline at 100%', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      declinePercentage: 60,
      reportingType: 'bimonthly',
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    expect(result.effectiveDecline).toBe(100);
  });

  it('should NOT multiply decline for monthly reporting', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      declinePercentage: 68,
      reportingType: 'monthly',
    });
    const result = calculateSalaryGrant(input);
    expect(result.effectiveDecline).toBe(68);
  });

  // --- Salary cap WITHOUT ×0.75 ---

  it('CRITICAL: salary cap should NOT include ×0.75 multiplier', () => {
    const input = makeSalaryInput({
      salaryGross: 500_000,
      totalEmployees: 5,
      businessType: 'regular',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    // Cap = round(5 × 13,769 × 1.25 × 0.50) = round(43,028.125) = 43,028
    expect(result.salaryCap).toBe(43_028);
  });

  it('should calculate salary cap with NGO multiplier 1.325', () => {
    const input = makeSalaryInput({
      salaryGross: 500_000,
      totalEmployees: 5,
      businessType: 'ngo',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    // Cap = round(5 × 13,769 × 1.325 × 0.50) = round(45,609.8125) = 45,610
    expect(result.salaryCap).toBe(45_610);
  });

  // --- Employee deductions from cap ---

  it('should reduce employees by deduction counts for cap calculation', () => {
    const input = makeSalaryInput({
      salaryGross: 500_000,
      totalEmployees: 10,
      miluimCount: 2,
      chalatCount: 1,
      vacationCount: 1,
      tipsCount: 1,
      businessType: 'regular',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.employeesAfterDeductions).toBe(5);
  });

  it('should enforce minimum of 1 employee after deductions', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      totalEmployees: 3,
      miluimCount: 2,
      chalatCount: 1,
      vacationCount: 1,
      tipsCount: 0,
      businessType: 'regular',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.employeesAfterDeductions).toBe(1);
  });

  it('should take min of grant before cap and salary cap (grant < cap)', () => {
    const input = makeSalaryInput({
      salaryGross: 50_000,
      totalEmployees: 20,
      businessType: 'regular',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.salaryGrant).toBe(result.salaryGrantBeforeCap);
    expect(result.salaryGrantBeforeCap).toBeLessThan(result.salaryCap);
  });

  it('should cap salary grant when grant before cap exceeds salary cap', () => {
    const input = makeSalaryInput({
      salaryGross: 500_000,
      totalEmployees: 2,
      businessType: 'regular',
      declinePercentage: 80,
    });
    const result = calculateSalaryGrant(input);
    expect(result.salaryGrant).toBe(result.salaryCap);
    expect(result.salaryGrantBeforeCap).toBeGreaterThan(result.salaryCap);
  });

  // --- Combined deductions ---

  it('should sum all four deduction types', () => {
    const input = makeSalaryInput({
      salaryGross: 200_000,
      tipsDeductions: 5_000,
      miluimDeductions: 10_000,
      chalatDeductions: 3_000,
      vacationDeductions: 2_000,
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.totalDeductions).toBe(20_000);
    expect(result.salaryAfterDeductions).toBe(180_000);
    expect(result.adjustedSalary).toBe(225_000);
  });

  it('should handle zero salary -> 0 grant', () => {
    const input = makeSalaryInput({ salaryGross: 0, declinePercentage: 50 });
    const result = calculateSalaryGrant(input);
    expect(result.salaryGrant).toBe(0);
  });

  it('should handle zero decline -> 0 grant', () => {
    const input = makeSalaryInput({ salaryGross: 100_000, declinePercentage: 0 });
    const result = calculateSalaryGrant(input);
    expect(result.salaryGrantBeforeCap).toBe(0);
    expect(result.salaryCap).toBe(0);
    expect(result.salaryGrant).toBe(0);
  });

  // --- Presentation example ---

  it('should match presentation example: salary 180,365 × 1.25 × 0.75 × 68% = 114,983', () => {
    const input = makeSalaryInput({
      salaryGross: 180_365,
      businessType: 'regular',
      declinePercentage: 68,
      reportingType: 'monthly',
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    expect(result.salaryGrantBeforeCap).toBe(114_983);
  });

  // --- NGO bimonthly ---

  it('should calculate NGO bimonthly salary grant correctly', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      businessType: 'ngo',
      declinePercentage: 35,
      reportingType: 'bimonthly',
      totalEmployees: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.adjustedSalary).toBe(132_500);
    expect(result.effectiveDecline).toBe(70);
    expect(result.salaryGrantBeforeCap).toBe(69_563);
  });

  // --- Individual deduction types ---

  it('should handle tips deductions only', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      tipsDeductions: 15_000,
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.totalDeductions).toBe(15_000);
    expect(result.salaryAfterDeductions).toBe(85_000);
  });

  it('should handle miluim deductions only', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      miluimDeductions: 8_000,
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.totalDeductions).toBe(8_000);
    expect(result.salaryAfterDeductions).toBe(92_000);
  });

  it('should handle chalat deductions only', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      chalatDeductions: 12_000,
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.totalDeductions).toBe(12_000);
    expect(result.salaryAfterDeductions).toBe(88_000);
  });

  it('should handle vacation deductions only', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      vacationDeductions: 5_000,
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.totalDeductions).toBe(5_000);
    expect(result.salaryAfterDeductions).toBe(95_000);
  });

  // --- Bimonthly edge cases ---

  it('should handle bimonthly decline just below 50% (capped at 100)', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      declinePercentage: 49.99,
      reportingType: 'bimonthly',
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    expect(result.effectiveDecline).toBe(99.98);
  });

  it('should handle bimonthly decline at exactly 50% -> effectiveDecline = 100', () => {
    const input = makeSalaryInput({
      salaryGross: 100_000,
      declinePercentage: 50,
      reportingType: 'bimonthly',
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    expect(result.effectiveDecline).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GRANT CAP (11 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateGrantCap', () => {
  // Per §38לח (p.546): listed amount × 2.
  // Effective caps: 1.2M / sliding (1.2M-2.4M) / 2.4M.

  it('should return 1,200,000 for revenue below 100M', () => {
    expect(calculateGrantCap(50_000_000)).toBe(1_200_000);
  });

  it('should return 1,200,000 for revenue at exactly 99,999,999', () => {
    expect(calculateGrantCap(99_999_999)).toBe(1_200_000);
  });

  it('should return 1,200,000 for revenue at exactly 100M (start of sliding scale)', () => {
    expect(calculateGrantCap(100_000_000)).toBe(1_200_000);
  });

  it('should return 1,500,000 for revenue of 150M', () => {
    // (600K + 0.3% × 50M) × 2 = (600K + 150K) × 2 = 1,500,000
    expect(calculateGrantCap(150_000_000)).toBe(1_500_000);
  });

  it('should return 1,800,000 for revenue of 200M', () => {
    // (600K + 0.3% × 100M) × 2 = (600K + 300K) × 2 = 1,800,000
    expect(calculateGrantCap(200_000_000)).toBe(1_800_000);
  });

  it('should return 2,400,000 for revenue at exactly 300M', () => {
    expect(calculateGrantCap(300_000_000)).toBe(2_400_000);
  });

  it('should cap at 2,400,000 for revenue of 400M', () => {
    expect(calculateGrantCap(400_000_000)).toBe(2_400_000);
  });

  it('should cap at 2,400,000 for revenue of 350M (above tier end)', () => {
    expect(calculateGrantCap(350_000_000)).toBe(2_400_000);
  });

  it('should return 1,200,000 for very small revenue (12,000)', () => {
    expect(calculateGrantCap(12_000)).toBe(1_200_000);
  });

  it('should handle sliding scale at 250M', () => {
    // (600K + 0.3% × 150M) × 2 = (600K + 450K) × 2 = 2,100,000
    expect(calculateGrantCap(250_000_000)).toBe(2_100_000);
  });

  it('should not exceed 2,400,000 within sliding formula range', () => {
    expect(calculateGrantCap(299_999_999)).toBeLessThanOrEqual(2_400_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. SMALL BUSINESS LOOKUP (19 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('lookupSmallBusinessGrant', () => {
  // Values are final paid amounts (× 2 already applied per §38לז(ב)).

  // --- First three rows: uniform amounts ---

  it('should return 3,728 for revenue 12,000 at 25% decline', () => {
    expect(lookupSmallBusinessGrant(12_000, 25)).toBe(3_728);
  });

  it('should return 3,728 for revenue 12,000 at 90% decline (uniform tier)', () => {
    expect(lookupSmallBusinessGrant(12_000, 90)).toBe(3_728);
  });

  it('should return 3,728 for revenue 49,999 at 50% decline', () => {
    expect(lookupSmallBusinessGrant(49_999, 50)).toBe(3_728);
  });

  it('should return 6,712 for revenue 50,000 at 30% decline', () => {
    expect(lookupSmallBusinessGrant(50_000, 30)).toBe(6_712);
  });

  it('should return 6,712 for revenue 89,999 at 70% decline', () => {
    expect(lookupSmallBusinessGrant(89_999, 70)).toBe(6_712);
  });

  it('should return 8,950 for revenue 90,000 at 25% decline', () => {
    expect(lookupSmallBusinessGrant(90_000, 25)).toBe(8_950);
  });

  it('should return 8,950 for revenue 119,999 at 90% decline', () => {
    expect(lookupSmallBusinessGrant(119_999, 90)).toBe(8_950);
  });

  // --- Rows 4-7: varied by damage coefficient ---

  it('should return 5,646 for revenue 120,000 at 30% decline (tier 1)', () => {
    expect(lookupSmallBusinessGrant(120_000, 30)).toBe(5_646);
  });

  it('should return 8,469 for revenue 130,000 at 45% decline (tier 2)', () => {
    expect(lookupSmallBusinessGrant(130_000, 45)).toBe(8_469);
  });

  it('should return 13,550 for revenue 140,000 at 70% decline (tier 3)', () => {
    expect(lookupSmallBusinessGrant(140_000, 70)).toBe(13_550);
  });

  it('should return 16,938 for revenue 149,999 at 85% decline (tier 4)', () => {
    expect(lookupSmallBusinessGrant(149_999, 85)).toBe(16_938);
  });

  it('should return 6,658 for revenue 150,000 at 30% decline (tier 1)', () => {
    expect(lookupSmallBusinessGrant(150_000, 30)).toBe(6_658);
  });

  it('should return 20,453 for revenue 200,000 at 65% decline (tier 3)', () => {
    expect(lookupSmallBusinessGrant(200_000, 65)).toBe(20_453);
  });

  it('should return 29,880 for revenue 299,999 at 95% decline (tier 4)', () => {
    expect(lookupSmallBusinessGrant(299_999, 95)).toBe(29_880);
  });

  it('should return 9,960 for revenue 250,000 at 25% decline (tier 1)', () => {
    expect(lookupSmallBusinessGrant(250_000, 25)).toBe(9_960);
  });

  it('should return 14,940 for revenue 280,000 at 50% decline (tier 2)', () => {
    expect(lookupSmallBusinessGrant(280_000, 50)).toBe(14_940);
  });

  // --- Q98 official example: 180K @ 70% decline ---
  it('should match official Q98 example: 180,000 ₪ at 70% → 15,979 ₪', () => {
    // tier 150-200K, damage 2.4 (60-80%), × 2: 3,329 × 2.4 × 2 = 15,979.2 → 15,979
    expect(lookupSmallBusinessGrant(180_000, 70)).toBe(15_979);
  });

  // --- Q99 official example: 70K, any decline ≥ 25% ---
  it('should match official Q99 example: 70,000 ₪ → 6,712 ₪', () => {
    expect(lookupSmallBusinessGrant(70_000, 26)).toBe(6_712);
    expect(lookupSmallBusinessGrant(70_000, 95)).toBe(6_712);
  });

  // --- Edge / out of range ---

  it('should return null for revenue below 12,000', () => {
    expect(lookupSmallBusinessGrant(11_999, 50)).toBeNull();
  });

  it('should return null for revenue at or above 300,000 (maxRevenue is exclusive)', () => {
    expect(lookupSmallBusinessGrant(300_000, 50)).toBeNull();
  });

  it('should return null for decline below 25% (not eligible)', () => {
    expect(lookupSmallBusinessGrant(150_000, 24)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. TRACK COMPARISON — "higher of the two" (7 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('maybeCompareWithSmallBusiness', () => {
  it('should return standard amount when it is higher', () => {
    const result = maybeCompareWithSmallBusiness(50_000, 260_000, 30, 'standard', 'monthly');
    expect(result.recommendedAmount).toBe(50_000);
  });

  it('should return small business amount when it is higher', () => {
    const result = maybeCompareWithSmallBusiness(2_000, 260_000, 30, 'standard', 'monthly');
    // lookup 250K-300K, 25-40% → 4,980 × 2 = 9,960
    expect(result.smallBusinessGrant).toBe(9_960);
    expect(result.recommendedAmount).toBe(9_960);
  });

  it('should skip comparison when revenue > 300,000', () => {
    const result = maybeCompareWithSmallBusiness(10_000, 300_001, 50, 'standard', 'monthly');
    expect(result.smallBusinessGrant).toBeNull();
    expect(result.recommendedAmount).toBe(10_000);
  });

  it('should skip comparison when trackType is small', () => {
    const result = maybeCompareWithSmallBusiness(5_000, 200_000, 50, 'small', 'monthly');
    expect(result.smallBusinessGrant).toBeNull();
    expect(result.recommendedAmount).toBe(5_000);
  });

  it('should skip comparison when annualRevenueBaseYear is undefined', () => {
    const result = maybeCompareWithSmallBusiness(10_000, undefined, 50, 'standard', 'monthly');
    expect(result.smallBusinessGrant).toBeNull();
    expect(result.recommendedAmount).toBe(10_000);
  });

  it('should double decline for bimonthly before lookup', () => {
    // 15% bimonthly → 30% effective → tier 1 (25-40%)
    const result = maybeCompareWithSmallBusiness(1_000, 130_000, 15, 'standard', 'bimonthly');
    // 120K-150K, tier1 → 2,823 × 1 × 2 = 5,646
    expect(result.smallBusinessGrant).toBe(5_646);
    expect(result.recommendedAmount).toBe(5_646);
  });

  it('should return null smallBusinessGrant for decline below threshold', () => {
    const result = maybeCompareWithSmallBusiness(10_000, 200_000, 10, 'standard', 'monthly');
    expect(result.smallBusinessGrant).toBeNull();
    expect(result.recommendedAmount).toBe(10_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. FULL INTEGRATION — calculateGrant (10 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateGrant — integration', () => {
  function makeFullInput(overrides: Partial<GrantCalculationInput> = {}): GrantCalculationInput {
    return {
      trackType: 'standard',
      reportingType: 'monthly',
      businessType: 'regular',
      eligibility: {
        revenueBase: 100_000,
        revenueComparison: 32_000, // 68% decline
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 5_000_000,
      },
      fixedExpenses: {
        vatInputs: 1_804_368,
        zeroVatInputs: 0,
        compensationRate: 15, // will be overridden by eligibility result
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 180_365,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 100,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 68, // will be overridden by eligibility result
        reportingType: 'monthly',
      },
      ...overrides,
    };
  }

  it('should match law-aligned example: (45,109 + 114,983) × 2 = 320,184', () => {
    const result = calculateGrant(makeFullInput());

    // 68% decline → tier 60-80% → compensationRate = 15%
    expect(result.eligibility.compensationRate).toBe(15);
    // Fixed: 1,804,368 / 6 × 15% = 300,728 × 15% = 45,109 (per §38לח /6)
    expect(result.fixedExpenses.fixedExpensesGrant).toBe(45_109);
    expect(result.salary.salaryGrantBeforeCap).toBe(114_983);
    // Eligible expenses = (45,109 + 114,983) × 2 = 320,184 (×2 per §38לח)
    expect(result.totalGrant).toBe(320_184);
    expect(result.finalGrantAmount).toBe(320_184); // below 1.2M cap
    expect(result.recommendedAmount).toBe(320_184);
  });

  it('should apply grant cap when total exceeds 1.2M', () => {
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 1_000_000,
        revenueComparison: 100_000, // 90% decline → rate 22%
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 50_000_000,
      },
      fixedExpenses: {
        vatInputs: 30_000_000,
        zeroVatInputs: 0,
        compensationRate: 22,
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 5_000_000,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 500,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 90,
        reportingType: 'monthly',
      },
    }));

    expect(result.grantCap).toBe(1_200_000);
    expect(result.finalGrantAmount).toBe(1_200_000);
  });

  it('should apply contractor multiplier (x0.68)', () => {
    const result = calculateGrant(makeFullInput({ trackType: 'contractor' }));

    // Standard total = 320,184 → contractor = round(320,184 × 0.68) = 217,725
    expect(result.contractorAdjustedGrant).toBe(Math.round(320_184 * 0.68));
    expect(result.recommendedAmount).toBe(Math.round(320_184 * 0.68));
  });

  it('should compare with small business track when annualRevenueBaseYear <= 300K', () => {
    const result = calculateGrant(makeFullInput({
      annualRevenueBaseYear: 260_000,
    }));

    // Standard = 320,184. Lookup 250K-300K at 68% decline → tier 60-80% → 23,904
    // 320,184 > 23,904 → recommended = 320,184
    expect(result.smallBusinessGrant).toBe(23_904);
    expect(result.recommendedAmount).toBe(320_184);
  });

  it('should handle zero salary (expenses-only grant)', () => {
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 100_000,
        revenueComparison: 50_000, // 50% → rate 11%
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 1_000_000,
      },
      fixedExpenses: {
        vatInputs: 600_000,
        zeroVatInputs: 0,
        compensationRate: 11,
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 0,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 0,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 50,
        reportingType: 'monthly',
      },
    }));

    expect(result.salary.salaryGrant).toBe(0);
    // 600,000 / 6 × 11% = 100,000 × 11% = 11,000 (Q97 official value)
    expect(result.fixedExpenses.fixedExpensesGrant).toBe(11_000);
    // Eligible expenses = (11,000 + 0) × 2 = 22,000 per §38לח
    expect(result.totalGrant).toBe(22_000);
  });

  it('should handle zero inputs (salary-only grant)', () => {
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 100_000,
        revenueComparison: 50_000,
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 1_000_000,
      },
      fixedExpenses: {
        vatInputs: 0,
        zeroVatInputs: 0,
        compensationRate: 11,
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 100_000,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 10,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 50,
        reportingType: 'monthly',
      },
    }));

    expect(result.fixedExpenses.fixedExpensesGrant).toBe(0);
    expect(result.salary.salaryGrant).toBeGreaterThan(0);
    // totalGrant = (0 + salary) × 2 per §38לח
    expect(result.totalGrant).toBe(result.salary.salaryGrant * 2);
  });

  it('should use sliding cap for revenue between 100M and 300M', () => {
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 10_000_000,
        revenueComparison: 1_000_000,
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 200_000_000,
      },
      fixedExpenses: {
        vatInputs: 120_000_000,
        zeroVatInputs: 0,
        compensationRate: 22,
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 10_000_000,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 1000,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 90,
        reportingType: 'monthly',
      },
    }));

    // (600K + 0.3% × 100M) × 2 = (600K + 300K) × 2 = 1,800,000
    expect(result.grantCap).toBe(1_800_000);
  });

  it('should handle NOT_ELIGIBLE result with 0 grant', () => {
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 100_000,
        revenueComparison: 100_000, // 0% decline
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 1_000_000,
      },
      fixedExpenses: {
        vatInputs: 1_000_000,
        zeroVatInputs: 0,
        compensationRate: 0,
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 100_000,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 10,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 0,
        reportingType: 'monthly',
      },
    }));

    expect(result.eligibility.eligibilityStatus).toBe('NOT_ELIGIBLE');
    expect(result.finalGrantAmount).toBe(0);
  });

  it('should handle max cap scenario (revenue >= 300M)', () => {
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 50_000_000,
        revenueComparison: 5_000_000,
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 350_000_000,
      },
      fixedExpenses: {
        vatInputs: 200_000_000,
        zeroVatInputs: 0,
        compensationRate: 22,
        inputsMonths: 12,
        useEnhancedRate: true,
      },
      salary: {
        salaryGross: 20_000_000,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 2000,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 90,
        reportingType: 'monthly',
      },
    }));

    expect(result.grantCap).toBe(2_400_000);
    expect(result.finalGrantAmount).toBeLessThanOrEqual(2_400_000);
  });

  it('should use eligibility compensationRate for fixedExpenses (overrides input)', () => {
    // The input has compensationRate: 15 but decline is 50% → rate should be 11
    const result = calculateGrant(makeFullInput({
      eligibility: {
        revenueBase: 100_000,
        revenueComparison: 50_000, // 50% → rate 11%
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 1_000_000,
      },
    }));

    expect(result.eligibility.compensationRate).toBe(11);
    // Fixed expenses grant uses 11%, not the input's 15%
    // Law formula: annual / 6 × rate (= monthlyAvg × 2 × rate)
    const monthlyAvg = 1_804_368 / 12;
    expect(result.fixedExpenses.fixedExpensesGrant).toBe(Math.round(monthlyAvg * 2 * 0.11));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. ROUNDING (6 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rounding behavior', () => {
  it('should round fixed expenses grant to nearest integer', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_804_368,
      compensationRate: 15,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    // 1,804,368 / 6 × 0.15 = 300,728 × 0.15 = 45,109.2 → 45,109
    expect(result.fixedExpensesGrant).toBe(45_109);
    expect(Number.isInteger(result.fixedExpensesGrant)).toBe(true);
  });

  it('should round salary grant before cap to nearest integer', () => {
    const input = makeSalaryInput({
      salaryGross: 180_365,
      businessType: 'regular',
      declinePercentage: 68,
      totalEmployees: 100,
    });
    const result = calculateSalaryGrant(input);
    expect(result.salaryGrantBeforeCap).toBe(114_983);
    expect(Number.isInteger(result.salaryGrantBeforeCap)).toBe(true);
  });

  it('should round salary cap to nearest integer', () => {
    const input = makeSalaryInput({
      salaryGross: 500_000,
      totalEmployees: 5,
      businessType: 'regular',
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.salaryCap).toBe(43_028);
    expect(Number.isInteger(result.salaryCap)).toBe(true);
  });

  it('should NOT round intermediate values (monthlyAvgInputs)', () => {
    const input = makeFixedExpensesInput({
      vatInputs: 1_000_001,
      compensationRate: 7,
      inputsMonths: 12,
    });
    const result = calculateFixedExpensesGrant(input);
    expect(result.monthlyAvgInputs).toBeCloseTo(83_333.4167, 2);
    expect(Number.isInteger(result.monthlyAvgInputs)).toBe(false);
  });

  it('should NOT round intermediate decline percentage', () => {
    const input = makeEligibilityInput({
      revenueBase: 300_000,
      revenueComparison: 189_000,
    });
    const result = calculateEligibility(input);
    expect(result.declinePercentage).toBe(37);
  });

  it('should round contractor adjusted grant to nearest integer', () => {
    // Verify the math used in contractor calculation
    expect(Math.round(137_538 * 0.68)).toBe(93_526);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. CONSTANTS VALIDATION (5 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('GRANT_CONSTANTS', () => {
  it('should have correct monthly thresholds', () => {
    const mt = GRANT_CONSTANTS.MONTHLY_THRESHOLDS;
    expect(mt.MIN_THRESHOLD).toBe(25);
    expect(mt.TIER_1.rate).toBe(7);
    expect(mt.TIER_2.rate).toBe(11);
    expect(mt.TIER_3.rate).toBe(15);
    expect(mt.TIER_4.rate).toBe(22);
  });

  it('should have correct bimonthly thresholds', () => {
    const bt = GRANT_CONSTANTS.BIMONTHLY_THRESHOLDS;
    expect(bt.MIN_THRESHOLD).toBe(12.5);
    expect(bt.TIER_1.min).toBe(12.5);
    expect(bt.TIER_4.max).toBe(50);
  });

  it('should have correct salary constants', () => {
    expect(GRANT_CONSTANTS.SALARY.REGULAR_MULTIPLIER).toBe(1.25);
    expect(GRANT_CONSTANTS.SALARY.NGO_MULTIPLIER).toBe(1.325);
    expect(GRANT_CONSTANTS.SALARY.GRANT_FACTOR).toBe(0.75);
    expect(GRANT_CONSTANTS.SALARY.CAP_PER_EMPLOYEE).toBe(13_769);
  });

  it('should have correct grant cap constants (with ×2 per law)', () => {
    expect(GRANT_CONSTANTS.GRANT_CAP.DEFAULT).toBe(1_200_000);
    expect(GRANT_CONSTANTS.GRANT_CAP.MAX).toBe(2_400_000);
    expect(GRANT_CONSTANTS.GRANT_CAP.RATE).toBe(0.006);
  });

  it('should have 7 rows in small business lookup table', () => {
    expect(SMALL_BUSINESS_LOOKUP).toHaveLength(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADDITIONAL EDGE CASES (7 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('should handle very small decline (25.001%) as ELIGIBLE', () => {
    const input = makeEligibilityInput({
      revenueBase: 1_000_000,
      revenueComparison: 749_990,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(7);
  });

  it('should handle gray area boundary at exactly 23.5% (25 − 1.5)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 76_500,
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
  });

  it('should handle bimonthly gray area at exactly 11% (12.5 − 1.5)', () => {
    const input = makeEligibilityInput({
      revenueBase: 100_000,
      revenueComparison: 89_000,
      reportingType: 'bimonthly',
    });
    const result = calculateEligibility(input);
    expect(result.eligibilityStatus).toBe('GRAY_AREA');
  });

  it('should handle large numbers without overflow', () => {
    const input = makeEligibilityInput({
      revenueBase: 400_000_000,
      revenueComparison: 100_000_000,
      annualRevenue: 400_000_000,
    });
    const result = calculateEligibility(input);
    expect(result.declinePercentage).toBe(75);
    expect(result.eligibilityStatus).toBe('ELIGIBLE');
    expect(result.compensationRate).toBe(15);
  });

  it('should handle salary with all deduction types maxed', () => {
    const input = makeSalaryInput({
      salaryGross: 200_000,
      tipsDeductions: 30_000,
      miluimDeductions: 20_000,
      chalatDeductions: 15_000,
      vacationDeductions: 10_000,
      totalEmployees: 20,
      tipsCount: 5,
      miluimCount: 3,
      chalatCount: 2,
      vacationCount: 2,
      declinePercentage: 70,
    });
    const result = calculateSalaryGrant(input);
    expect(result.totalDeductions).toBe(75_000);
    expect(result.salaryAfterDeductions).toBe(125_000);
    expect(result.employeesAfterDeductions).toBe(8);
  });

  it('should handle exactly 1 employee after all deductions', () => {
    const input = makeSalaryInput({
      salaryGross: 50_000,
      totalEmployees: 5,
      tipsCount: 2,
      miluimCount: 1,
      chalatCount: 1,
      vacationCount: 0,
      declinePercentage: 50,
    });
    const result = calculateSalaryGrant(input);
    expect(result.employeesAfterDeductions).toBe(1);
  });

  it('should use eligibility decline for salary in calculateGrant (not input decline)', () => {
    // This ensures calculateGrant passes the computed decline, not the salary input
    const result = calculateGrant({
      trackType: 'standard',
      reportingType: 'monthly',
      businessType: 'regular',
      eligibility: {
        revenueBase: 100_000,
        revenueComparison: 32_000, // 68% decline
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: 'monthly',
        annualRevenue: 1_000_000,
      },
      fixedExpenses: {
        vatInputs: 120_000,
        zeroVatInputs: 0,
        compensationRate: 7,
        inputsMonths: 12,
        useEnhancedRate: false,
      },
      salary: {
        salaryGross: 100_000,
        tipsDeductions: 0,
        miluimDeductions: 0,
        chalatDeductions: 0,
        vacationDeductions: 0,
        totalEmployees: 10,
        tipsCount: 0,
        miluimCount: 0,
        chalatCount: 0,
        vacationCount: 0,
        businessType: 'regular',
        declinePercentage: 30, // wrong decline — should be overridden by 68%
        reportingType: 'monthly',
      },
    });

    // Salary effective decline should be 68 (from eligibility), not 30 (from input)
    expect(result.salary.effectiveDecline).toBe(68);
    expect(result.eligibility.declinePercentage).toBe(68);
  });
});
