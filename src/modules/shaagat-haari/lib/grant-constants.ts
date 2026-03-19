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

  /** Monthly reporting — eligibility tiers and gray-area factor */
  MONTHLY_THRESHOLDS: {
    GRAY_AREA_FACTOR: 0.92,
    MIN_THRESHOLD: 25,
    TIER_1: { min: 25, max: 40, rate: 7 },
    TIER_2: { min: 40, max: 60, rate: 11 },
    TIER_3: { min: 60, max: 80, rate: 15 },
    TIER_4: { min: 80, max: 100, rate: 22 },
  },

  /** Bimonthly reporting — eligibility tiers and gray-area factor */
  BIMONTHLY_THRESHOLDS: {
    GRAY_AREA_FACTOR: 0.92,
    MIN_THRESHOLD: 12.5,
    TIER_1: { min: 12.5, max: 20, rate: 7 },
    TIER_2: { min: 20, max: 30, rate: 11 },
    TIER_3: { min: 30, max: 40, rate: 15 },
    TIER_4: { min: 40, max: 50, rate: 22 },
  },

  // ────────────── Salary constants ──────────────

  SALARY: {
    /** Employer cost multiplier for regular businesses */
    REGULAR_MULTIPLIER: 1.25,
    /** Employer cost multiplier for NGOs / non-profits */
    NGO_MULTIPLIER: 1.325,
    /** Salary grant factor — 75% of adjusted salary */
    GRANT_FACTOR: 0.75,
    /** Average national salary (₪) — base for per-employee salary cap */
    CAP_PER_EMPLOYEE: 13_773,
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
  /** Enhanced rate multiplier for fixed expenses — when actual fixed costs exceed calculated grant */
  ENHANCED_RATE_MULTIPLIER: 1.5,

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
  { minRevenue: 12_000,  maxRevenue: 50_000,  tier1: 1_833, tier2: 1_833,  tier3: 1_833,  tier4: 1_833  },
  { minRevenue: 50_000,  maxRevenue: 90_000,  tier1: 3_300, tier2: 3_300,  tier3: 3_300,  tier4: 3_300  },
  { minRevenue: 90_000,  maxRevenue: 120_000, tier1: 4_400, tier2: 4_400,  tier3: 4_400,  tier4: 4_400  },
  { minRevenue: 120_000, maxRevenue: 150_000, tier1: 2_776, tier2: 4_164,  tier3: 6_662,  tier4: 8_328  },
  { minRevenue: 150_000, maxRevenue: 200_000, tier1: 3_273, tier2: 4_910,  tier3: 7_855,  tier4: 9_819  },
  { minRevenue: 200_000, maxRevenue: 250_000, tier1: 4_190, tier2: 6_285,  tier3: 10_056, tier4: 12_570 },
  { minRevenue: 250_000, maxRevenue: 300_000, tier1: 4_897, tier2: 7_346,  tier3: 11_752, tier4: 14_691 },
];
