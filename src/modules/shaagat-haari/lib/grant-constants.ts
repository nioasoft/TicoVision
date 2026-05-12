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
 * Final grant amounts for small businesses (annual revenue ≤ 300,000 ₪).
 *
 * Per the law (ספר החוקים 3525, 4.5.2026, §38לז(ב)):
 *   "ניזוק ... זכאי לפיצויים בסכום של פי 2 מהסכום המפורט בפסקאות שלהלן"
 *
 * The amounts in this table are the FINAL payable amounts (× 2 already applied).
 * Base amounts in the law: 1,864 / 3,356 / 4,475 / 2,823 / 3,329 / 4,261 / 4,980.
 *
 * For tiers 120K-300K, damage coefficient applies (§38לז(ה)):
 *   25-40% → ×1, 40-60% → ×1.5, 60-80% → ×2.4, 80%+ → ×3
 * Formula: base × damage_coefficient × 2 (no intermediate rounding).
 *
 * For tiers 12K-120K, no damage coefficient — uniform amount regardless of decline.
 *
 * Columns: tier1=25-40%, tier2=40-60%, tier3=60-80%, tier4=80-100%
 */
export const SMALL_BUSINESS_LOOKUP: SmallBusinessLookupEntry[] = [
  // Uniform amounts × 2:
  { minRevenue: 12_000,  maxRevenue: 50_000,  tier1: 3_728,  tier2: 3_728,  tier3: 3_728,  tier4: 3_728  },
  { minRevenue: 50_000,  maxRevenue: 90_000,  tier1: 6_712,  tier2: 6_712,  tier3: 6_712,  tier4: 6_712  },
  { minRevenue: 90_000,  maxRevenue: 120_000, tier1: 8_950,  tier2: 8_950,  tier3: 8_950,  tier4: 8_950  },
  // With damage coefficient: base × {1, 1.5, 2.4, 3} × 2
  { minRevenue: 120_000, maxRevenue: 150_000, tier1: 5_646,  tier2: 8_469,  tier3: 13_550, tier4: 16_938 },
  { minRevenue: 150_000, maxRevenue: 200_000, tier1: 6_658,  tier2: 9_987,  tier3: 15_979, tier4: 19_974 },
  { minRevenue: 200_000, maxRevenue: 250_000, tier1: 8_522,  tier2: 12_783, tier3: 20_453, tier4: 25_566 },
  { minRevenue: 250_000, maxRevenue: 300_000, tier1: 9_960,  tier2: 14_940, tier3: 23_904, tier4: 29_880 },
];
