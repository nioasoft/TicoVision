/**
 * Shaagat HaAri Grants — Numeric Constants
 *
 * Single source of truth for all numeric constants used in grant calculations.
 * Formula source: DOCS/SHAAGAT_HAARI_FORMULAS.md
 *
 * ⚠️ Do NOT hardcode these values anywhere else in the codebase.
 *    All calculation code must import from this file.
 */

import type { SmallBusinessLookupEntry } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Main constants object
// ─────────────────────────────────────────────────────────────────────────────

export const GRANT_CONSTANTS = {
  // ────────────── Eligibility thresholds ──────────────

  /**
   * Gray zone buffer in absolute percentage points below MIN_THRESHOLD.
   * Example: monthly threshold = 25%, buffer = 1.5 → gray zone is 23.5%–24.99%.
   * Below the buffer → NOT_ELIGIBLE.
   */
  GRAY_ZONE_BUFFER_PERCENT: 1.5,

  /** Monthly reporting — eligibility tiers */
  MONTHLY_THRESHOLDS: {
    MIN_THRESHOLD: 25,
    TIER_1: { min: 25, max: 40, rate: 7 },
    TIER_2: { min: 40, max: 60, rate: 11 },
    TIER_3: { min: 60, max: 80, rate: 15 },
    TIER_4: { min: 80, max: 100, rate: 22 },
  },

  /** Bimonthly reporting — eligibility tiers */
  BIMONTHLY_THRESHOLDS: {
    MIN_THRESHOLD: 12.5,
    TIER_1: { min: 12.5, max: 20, rate: 7 },
    TIER_2: { min: 20, max: 30, rate: 11 },
    TIER_3: { min: 30, max: 40, rate: 15 },
    TIER_4: { min: 40, max: 50, rate: 22 },
  },

  /**
   * Initial-filter screen always uses bimonthly Mar–Apr 2026 vs Mar–Apr 2025.
   * Track-specific periods (standard/northern/contractor/...) are applied later
   * in the detailed eligibility/calculation flow.
   */
  INITIAL_FILTER_PERIOD: {
    currentLabel: '03-04/2026',
    comparisonLabel: '03-04/2025',
    reportingType: 'bimonthly' as const,
  },

  // ────────────── Salary constants ──────────────

  SALARY: {
    /** Employer cost multiplier for regular businesses */
    REGULAR_MULTIPLIER: 1.25,
    /** Employer cost multiplier for NGOs / non-profits */
    NGO_MULTIPLIER: 1.325,
    /** Salary grant factor — 75% of adjusted salary */
    GRANT_FACTOR: 0.75,
    /** Average national salary (₪) — base for per-employee salary cap.
     *  Source: official Q&A (Q16) per Bituach Leumi §2(b), effective 1.1.2026.
     *  Updated from 13,967 → 13,769 (12.5.2026) after cross-check with
     *  haravot-barzel.org.il/ari_qa/ — see DOCS/SHAAGAT_HAARI_OFFICIAL_QA_111.md. */
    CAP_PER_EMPLOYEE: 13_769,
  },

  // ────────────── Overall grant caps ──────────────

  GRANT_CAP: {
    /** Default cap (₪) — annual revenue below 100M */
    DEFAULT: 600_000,
    /** Maximum cap (₪) — annual revenue ≥ 300M */
    MAX: 1_200_000,
    /** Annual revenue threshold where progressive cap begins (₪) */
    TIER_START: 100_000_000,
    /** Annual revenue threshold where progressive cap ends (₪) */
    TIER_END: 300_000_000,
    /** Progressive cap rate — 0.3% per ₪ above TIER_START */
    RATE: 0.003,
  },

  // ────────────── Annual revenue range ──────────────

  ANNUAL_REVENUE: {
    MIN: 12_000,
    MAX: 400_000_000,
  },

  // ────────────── Multipliers ──────────────

  /** Bimonthly decline multiplier — applied to decline% for salary grant only */
  BIMONTHLY_DECLINE_MULTIPLIER: 2,
  /** Maximum effective decline after bimonthly multiplication */
  BIMONTHLY_DECLINE_CAP: 100,
  /** Contractor track final grant multiplier */
  CONTRACTOR_MULTIPLIER: 0.68,
  /** Enhanced rate multiplier for fixed expenses — when actual fixed costs exceed calculated grant.
   *  Updated to ×2 per Tax Consultants Institute professional letter (May 2026). Was ×1.5. */
  ENHANCED_RATE_MULTIPLIER: 2,

  // ────────────── Direct damage grant ──────────────

  DIRECT_DAMAGE: {
    ADDITIONAL_PERIODS: 6,
    /** Cap on taxable income for bimonthly reporting period (₪) */
    BIMONTHLY_INCOME_CAP: 30_000,
    MIN_DAYS_UNUSED: 15,
  },

  // ────────────── Service fee ──────────────

  SERVICE_FEE: {
    /** Fixed service fee (₪) before VAT — same for all tenants */
    AMOUNT: 1_350,
    /** Israeli VAT rate */
    VAT_RATE: 0.18,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Small business lookup table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fixed grant amounts for small businesses (annual revenue 2022 ≤ 300,000 ₪).
 * Businesses with revenue ≤ 120,000 receive a flat amount regardless of decline tier,
 * provided they meet the minimum eligibility threshold.
 *
 * Columns: tier1=25-40%, tier2=40-60%, tier3=60-80%, tier4=80-100%
 */
export const SMALL_BUSINESS_LOOKUP: SmallBusinessLookupEntry[] = [
  // Updated per Tax Consultants Institute professional letter (May 2026).
  // All amounts increased ~1.7% relative to the prior presentation.
  { minRevenue: 12_000,  maxRevenue: 50_000,  tier1: 1_864, tier2: 1_864,  tier3: 1_864,  tier4: 1_864  },
  { minRevenue: 50_000,  maxRevenue: 90_000,  tier1: 3_356, tier2: 3_356,  tier3: 3_356,  tier4: 3_356  },
  { minRevenue: 90_000,  maxRevenue: 120_000, tier1: 4_475, tier2: 4_475,  tier3: 4_475,  tier4: 4_475  },
  { minRevenue: 120_000, maxRevenue: 150_000, tier1: 2_823, tier2: 4_235,  tier3: 6_775,  tier4: 8_469  },
  { minRevenue: 150_000, maxRevenue: 200_000, tier1: 3_329, tier2: 4_994,  tier3: 7_990,  tier4: 9_987  },
  { minRevenue: 200_000, maxRevenue: 250_000, tier1: 4_261, tier2: 6_392,  tier3: 10_226, tier4: 12_783 },
  { minRevenue: 250_000, maxRevenue: 300_000, tier1: 4_980, tier2: 7_470,  tier3: 11_952, tier4: 14_940 },
];
