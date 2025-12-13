/**
 * Letter Template Selector
 * Determines which letter template(s) to send based on client type and fee calculation
 */

import type { LetterTemplateType } from '../types/letter.types';

export interface LetterSelectionInput {
  /** Client type: 'internal' (always includes bookkeeping) or 'external' */
  clientType: 'internal' | 'external';

  /** Is this a retainer client? (E1/E2 templates) */
  isRetainer: boolean;

  /** Primary calculation - apply inflation index? */
  applyInflation: boolean;

  /** Primary calculation - has real adjustment? */
  hasRealAdjustment: boolean;

  /** Bookkeeping calculation (internal only) - apply inflation? */
  bookkeepingApplyInflation?: boolean;

  /** Bookkeeping calculation (internal only) - has real adjustment? */
  bookkeepingHasRealAdjustment?: boolean;
}

export interface LetterSelectionResult {
  /** Primary letter template type */
  primaryTemplate: LetterTemplateType;

  /** Number of checks for primary letter (8 or 12) */
  primaryNumChecks: 8 | 12;

  /** Secondary letter template (only for internal clients) */
  secondaryTemplate?: LetterTemplateType;

  /** Number of checks for secondary letter (always 12 for bookkeeping) */
  secondaryNumChecks?: 8 | 12;
}

/**
 * Select the appropriate letter template(s) based on client and fee data
 *
 * Rules:
 * - External clients: A/B/C (8 checks)
 * - Internal clients: D + F (8 + 12 checks)
 * - Retainer clients: E1/E2 (12 checks)
 *
 * Letter types:
 * - A: external_index_only (חיצוניים - מדד)
 * - B: external_real_change (חיצוניים - ריאלי)
 * - C: external_as_agreed (חיצוניים - כפי שסוכם)
 * - D1-D3: internal_audit_* (ביקורת פנימית)
 * - E1-E2: retainer_* (ריטיינר)
 * - F1-F3: internal_bookkeeping_* (הנהלת חשבונות)
 */
export function selectLetterTemplate(input: LetterSelectionInput): LetterSelectionResult {
  // ==============================
  // RETAINER CLIENTS (E1/E2)
  // ==============================
  if (input.isRetainer) {
    const template: LetterTemplateType = input.hasRealAdjustment
      ? 'retainer_real'  // E2
      : 'retainer_index'; // E1

    return {
      primaryTemplate: template,
      primaryNumChecks: 12, // Always 12 checks for retainer
    };
  }

  // ==============================
  // INTERNAL CLIENTS (D + F)
  // Always 2 letters!
  // ==============================
  if (input.clientType === 'internal') {
    // --- Primary Letter: D (Internal Audit) ---
    let primaryTemplate: LetterTemplateType;
    if (input.hasRealAdjustment) {
      primaryTemplate = 'internal_audit_real'; // D2
    } else if (input.applyInflation) {
      primaryTemplate = 'internal_audit_index'; // D1
    } else {
      primaryTemplate = 'internal_audit_agreed'; // D3
    }

    // --- Secondary Letter: F (Bookkeeping) ---
    let secondaryTemplate: LetterTemplateType;
    if (input.bookkeepingHasRealAdjustment) {
      secondaryTemplate = 'internal_bookkeeping_real'; // F2
    } else if (input.bookkeepingApplyInflation) {
      secondaryTemplate = 'internal_bookkeeping_index'; // F1
    } else {
      secondaryTemplate = 'internal_bookkeeping_agreed'; // F3
    }

    return {
      primaryTemplate,
      primaryNumChecks: 8, // D = 8 checks
      secondaryTemplate,
      secondaryNumChecks: 12, // F = 12 checks (always!)
    };
  }

  // ==============================
  // EXTERNAL CLIENTS (A/B/C)
  // ==============================
  let template: LetterTemplateType;
  if (input.hasRealAdjustment) {
    template = 'external_real_change'; // B
  } else if (input.applyInflation) {
    template = 'external_index_only'; // A
  } else {
    template = 'external_as_agreed'; // C
  }

  return {
    primaryTemplate: template,
    primaryNumChecks: 8, // Always 8 checks for external
  };
}
