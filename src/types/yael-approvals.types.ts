/**
 * Yael Software Systems Approvals - Type Definitions
 * אישורים לחברת יעל תכנה ומערכות
 *
 * This file mirrors the Tzlul approvals structure to support multiple letter types.
 * Currently supports:
 *  1. CPA National Insurance Approval (אישור רו"ח - דוח תקורות שוטף לביטוח לאומי)
 *  2. Overhead Rate Compliance (אישור רו"ח בדבר עמידה בשיעור תקורה לנותני השירותים)
 *
 * Adding a new letter type:
 *  - Add a literal to YaelTemplateType (must also exist in AutoLetterTemplateType)
 *  - Add a *SpecificVariables interface extending YaelSharedData
 *  - Add it to YaelFormState.documentData with a key
 *  - Add a validator
 *  - Add an entry to YAEL_LETTER_TYPES
 *  - Add the form rendering case in YaelApprovalsPage
 */

import type { AutoLetterTemplateType } from './auto-letters.types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Yael client company name - used to find client ID */
export const YAEL_CLIENT_NAME = 'יעל תכנה ומערכות בע"מ';

/** Yael company tax ID */
export const YAEL_TAX_ID = '510378771';

/** Yael client ID - fallback for restricted users who can't query clients table */
export const YAEL_CLIENT_ID = 'f742db38-aae0-4a9f-bd17-4dee58ad9765';

/** Default recipient name shown in the CPA approval recipient field */
export const YAEL_DEFAULT_RECIPIENT = YAEL_CLIENT_NAME;

/** Default subject for CPA National Insurance Approval */
export const YAEL_CPA_APPROVAL_DEFAULT_SUBJECT =
  'דוח תקורות שוטף לגבי כלל נותני השירותים בביטוח לאומי';

/** Default subject for Overhead Rate Compliance approval */
export const YAEL_OVERHEAD_RATE_DEFAULT_SUBJECT =
  'אישור רו"ח בדבר עמידה בשיעור תקורה לנותני השירותים';

// ============================================================================
// SHARED DATA (common to all Yael documents)
// ============================================================================

export interface YaelSharedData {
  /** Document generation date in YYYY-MM-DD format */
  document_date: string;
}

// ============================================================================
// DOCUMENT #1: CPA National Insurance Approval (אישור רו"ח - דוח תקורות שוטף לביטוח לאומי)
// ============================================================================

/** Variables specific to the CPA approval letter (excluding shared data) */
export interface YaelCpaApprovalSpecificVariables {
  /** Recipient company name shown in "לכבוד" section */
  recipient_name: string;
  /** Period end date (ISO YYYY-MM-DD) - "לשנה שנסתיימה ביום..." */
  period_end_date: string;
}

/** Full variables for CPA approval (shared + specific) */
export interface YaelCpaApprovalVariables extends YaelSharedData, YaelCpaApprovalSpecificVariables {}

// ============================================================================
// DOCUMENT #2: Overhead Rate Compliance (אישור רו"ח בדבר עמידה בשיעור תקורה לנותני השירותים)
// ============================================================================

/** Variables specific to the Overhead Rate Compliance letter (excluding shared data) */
export interface YaelOverheadRateComplianceSpecificVariables {
  /** Ordering office name shown in "לכבוד" header (משרד מזמין) */
  recipient_office_name: string;
  /** Supplier/bidder name as it appears in the body (default: Yael Software Systems) */
  supplier_name: string;
  /** Tender number (e.g. "1-2009") */
  tender_number: string;
}

/** Full variables for Overhead Rate Compliance (shared + specific) */
export interface YaelOverheadRateComplianceVariables extends YaelSharedData, YaelOverheadRateComplianceSpecificVariables {}

// ============================================================================
// TEMPLATE TYPE DEFINITIONS
// ============================================================================

/**
 * Yael template types - subset of AutoLetterTemplateType.
 * All Yael letters are routed through the generic auto-letter infrastructure
 * (template.service.ts → generateAutoLetterDocument).
 */
export type YaelTemplateType = Extract<
  AutoLetterTemplateType,
  | 'yael_cpa_national_insurance_approval'
  | 'yael_overhead_rate_compliance'
>;

/** Union type of all possible Yael document variables */
export type YaelVariables = YaelCpaApprovalVariables | YaelOverheadRateComplianceVariables;

// ============================================================================
// UI FORM STATE
// ============================================================================

export interface YaelFormState {
  /** Currently selected letter type index */
  selectedLetterType: number;

  /** Shared data (document date) */
  sharedData: Partial<YaelSharedData>;

  /** Document-specific data for each letter type */
  documentData: {
    cpaApproval: Partial<YaelCpaApprovalSpecificVariables>;
    overheadRateCompliance: Partial<YaelOverheadRateComplianceSpecificVariables>;
  };
}

// ============================================================================
// LETTER TYPE CONFIGURATION
// ============================================================================

export interface YaelLetterType {
  /** Letter type index */
  index: number;

  /** Letter label in Hebrew */
  label: string;

  /** Letter description */
  description: string;

  /** Associated template type */
  templateType: YaelTemplateType;

  /** Default email subject */
  defaultSubject: string;
}

/** Configuration for all Yael letter types */
export const YAEL_LETTER_TYPES: YaelLetterType[] = [
  {
    index: 0,
    label: 'אישור רו"ח - דוח תקורות שוטף לביטוח לאומי',
    description: 'חוות דעת רו"ח על דוח תקורות שוטף לגבי כלל נותני השירותים בביטוח לאומי',
    templateType: 'yael_cpa_national_insurance_approval',
    defaultSubject: YAEL_CPA_APPROVAL_DEFAULT_SUBJECT,
  },
  {
    index: 1,
    label: 'אישור עמידה בשיעור תקורה (נספח י)',
    description: 'אישור רו"ח בדבר עמידה בשיעור תקורה לנותני השירותים',
    templateType: 'yael_overhead_rate_compliance',
    defaultSubject: YAEL_OVERHEAD_RATE_DEFAULT_SUBJECT,
  },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/** Validate shared data is complete */
export function validateYaelSharedData(data: Partial<YaelSharedData>): data is YaelSharedData {
  return !!data.document_date;
}

/** Validate CPA approval specific data (combined with shared data) */
export function validateCpaApproval(
  data: Partial<YaelCpaApprovalSpecificVariables & YaelSharedData>
): data is YaelCpaApprovalVariables {
  return (
    validateYaelSharedData(data) &&
    !!data.recipient_name?.trim() &&
    !!data.period_end_date
  );
}

/** Validate Overhead Rate Compliance specific data (combined with shared data) */
export function validateOverheadRateCompliance(
  data: Partial<YaelOverheadRateComplianceSpecificVariables & YaelSharedData>
): data is YaelOverheadRateComplianceVariables {
  return (
    validateYaelSharedData(data) &&
    !!data.recipient_office_name?.trim() &&
    !!data.supplier_name?.trim() &&
    !!data.tender_number?.trim()
  );
}

/**
 * @deprecated Kept for backward compatibility with the previous standalone page.
 * Use validateCpaApproval instead.
 */
export function validateYaelCpaApproval(data: Partial<YaelCpaApprovalVariables>): boolean {
  return validateCpaApproval(data);
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Create initial form state with empty values */
export function createInitialYaelFormState(): YaelFormState {
  return {
    selectedLetterType: 0,
    sharedData: {
      document_date: new Date().toISOString().split('T')[0],
    },
    documentData: {
      cpaApproval: {
        recipient_name: YAEL_DEFAULT_RECIPIENT,
        period_end_date: '',
      },
      overheadRateCompliance: {
        recipient_office_name: '',
        supplier_name: YAEL_DEFAULT_RECIPIENT,
        tender_number: '',
      },
    },
  };
}
