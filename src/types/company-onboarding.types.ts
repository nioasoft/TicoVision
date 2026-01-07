/**
 * Company Onboarding Documents - TypeScript Types
 *
 * This file contains all type definitions for Company Onboarding letters:
 * 1. VAT Registration Letter (מכתב פתיחת תיקי מע"מ)
 * Future: Income Tax Registration, etc.
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default subject for VAT Registration letter */
export const VAT_REGISTRATION_DEFAULT_SUBJECT = 'הנחיות להעברת מסמכים לצורך פתיחת תיקי מע"מ';

/** Default subject for Price Quote letter */
export const PRICE_QUOTE_DEFAULT_SUBJECT = 'הצעת מחיר לשירותי ראיית חשבון';

/** Default subject for Previous Accountant Request letter */
export const PREVIOUS_ACCOUNTANT_REQUEST_DEFAULT_SUBJECT = 'פנייה לרואה חשבון קודם למשיכת תיקים';

// ============================================================================
// SHARED DATA (common to all Company Onboarding documents)
// ============================================================================

export interface CompanyOnboardingSharedData {
  /** Document generation date in YYYY-MM-DD format */
  document_date: string;

  /** Recipient name (company/group) - from selected client/group */
  company_name: string;

  /** Additional recipient line (contact person + title), e.g., "לידי יהודה פיינגנבאום סמנכ"ל כספים" */
  recipient_line?: string;

  /** Google Drive folder link for uploading documents */
  google_drive_link: string;
}

// ============================================================================
// DOCUMENT #1: VAT Registration Letter (מכתב פתיחת תיקי מע"מ)
// ============================================================================

export interface VatRegistrationVariables extends CompanyOnboardingSharedData {
  /** Subject line (הנדון) */
  subject: string;

  /** Show WOLT section in the letter (default: true) */
  show_wolt_section: boolean;
}

// ============================================================================
// DOCUMENT #2: Price Quote Letter (הצעת מחיר)
// ============================================================================

export interface PriceQuoteVariables extends CompanyOnboardingSharedData {
  /** Subject line (הנדון) */
  subject: string;

  /** Fee amount in ILS (before VAT) */
  fee_amount: number;

  /** Tax year (default: 2026) */
  tax_year: number;

  /** Show section 8 - transfer from previous accountant (default: false) */
  show_transfer_section: boolean;

  /** Additional notes to appear after fee amount and before bank details */
  additional_notes?: string;
}

// ============================================================================
// DOCUMENT #3: Previous Accountant Request Letter (פנייה לרואה חשבון קודם)
// ============================================================================

export interface PreviousAccountantRequestVariables {
  /** Document generation date in YYYY-MM-DD format */
  document_date: string;

  /** Multiple subject lines (company names) - can have 1 or more */
  subjects: string[];

  /** Email address for receiving documents */
  email_for_documents: string;
}

// ============================================================================
// TEMPLATE TYPE DEFINITIONS (for generated_letters table)
// ============================================================================

export type CompanyOnboardingTemplateType =
  | 'company_onboarding_vat_registration'           // Document #1
  | 'company_onboarding_price_quote_small'          // Document #2a - Small Company
  | 'company_onboarding_price_quote_restaurant'     // Document #2b - Restaurant
  | 'company_onboarding_previous_accountant';       // Document #3 - Previous Accountant Request

/** Union type of all possible Company Onboarding document variables */
export type CompanyOnboardingVariables =
  | VatRegistrationVariables
  | PriceQuoteVariables
  | PreviousAccountantRequestVariables;

// ============================================================================
// UI FORM STATE (for managing form data)
// ============================================================================

export interface CompanyOnboardingFormState {
  /** Currently selected letter type index (0-based) */
  selectedLetterType: number;

  /** Recipient mode: client or group */
  recipientMode: 'client' | 'group';

  /** Selected client ID (when recipientMode is 'client') */
  selectedClientId: string | null;

  /** Selected group ID (when recipientMode is 'group') */
  selectedGroupId: string | null;

  /** Shared data (date, recipient, drive link) */
  sharedData: Partial<CompanyOnboardingSharedData>;

  /** Document-specific data for each letter type */
  documentData: {
    vatRegistration: Partial<VatRegistrationVariables>;
    priceQuote: Partial<PriceQuoteVariables>;
    previousAccountantRequest: Partial<PreviousAccountantRequestVariables>;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Letter type configuration for Company Onboarding documents */
export interface CompanyOnboardingLetterType {
  /** Letter type index (0-based) */
  index: number;

  /** Letter label in Hebrew */
  label: string;

  /** Letter description */
  description: string;

  /** Associated template type */
  templateType: CompanyOnboardingTemplateType;

  /** Icon name (from lucide-react) */
  icon: string;
}

/** Configuration for all Company Onboarding letter types */
export const COMPANY_ONBOARDING_LETTER_TYPES: CompanyOnboardingLetterType[] = [
  {
    index: 0,
    label: 'פתיחת תיקי מע"מ',
    description: 'הנחיות להעברת מסמכים לפתיחת תיק במע"מ',
    templateType: 'company_onboarding_vat_registration',
    icon: 'FileText',
  },
  {
    index: 1,
    label: 'הצעת מחיר - חברה קטנה',
    description: 'הצעת מחיר לשירותי ראיית חשבון לחברה קטנה',
    templateType: 'company_onboarding_price_quote_small',
    icon: 'Receipt',
  },
  {
    index: 2,
    label: 'הצעת מחיר - מסעדה',
    description: 'הצעת מחיר לשירותי ראיית חשבון למסעדות',
    templateType: 'company_onboarding_price_quote_restaurant',
    icon: 'UtensilsCrossed',
  },
  {
    index: 3,
    label: 'פנייה לרואה חשבון קודם',
    description: 'בקשת מסמכים ותיקים מרואה חשבון קודם',
    templateType: 'company_onboarding_previous_accountant',
    icon: 'UserMinus',
  },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/** Validate shared data is complete */
export function validateCompanyOnboardingSharedData(
  data: Partial<CompanyOnboardingSharedData>
): data is CompanyOnboardingSharedData {
  return (
    !!data.document_date &&
    !!data.company_name &&
    !!data.google_drive_link
  );
}

/** Validate VAT Registration document data */
export function validateVatRegistration(
  data: Partial<VatRegistrationVariables>
): data is VatRegistrationVariables {
  return (
    validateCompanyOnboardingSharedData(data) &&
    !!data.subject &&
    typeof data.show_wolt_section === 'boolean'
  );
}

/** Validate Price Quote document data */
export function validatePriceQuote(
  data: Partial<PriceQuoteVariables>
): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject?.trim() &&
    data.fee_amount && data.fee_amount > 0 &&
    data.tax_year && data.tax_year >= 2024
  );
}

/** Validate Previous Accountant Request document data */
export function validatePreviousAccountantRequest(
  data: Partial<PreviousAccountantRequestVariables>
): boolean {
  return !!(
    data.document_date &&
    data.subjects &&
    data.subjects.length > 0 &&
    data.subjects.every(s => s.trim()) &&
    data.email_for_documents?.trim()
  );
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Create initial form state with empty values */
export function createInitialCompanyOnboardingFormState(): CompanyOnboardingFormState {
  return {
    selectedLetterType: 0,
    recipientMode: 'client',
    selectedClientId: null,
    selectedGroupId: null,
    sharedData: {
      document_date: new Date().toISOString().split('T')[0],
      company_name: '',
      recipient_line: '',
      google_drive_link: '',
    },
    documentData: {
      vatRegistration: {
        subject: VAT_REGISTRATION_DEFAULT_SUBJECT,
        show_wolt_section: true,
      },
      priceQuote: {
        subject: PRICE_QUOTE_DEFAULT_SUBJECT,
        fee_amount: 0,
        tax_year: 2026,
        show_transfer_section: false,
        additional_notes: '',
      },
      previousAccountantRequest: {
        subjects: [''],
        email_for_documents: 'helli@franco.co.il',
      },
    },
  };
}

/** Get default variables for VAT Registration */
export function getDefaultVatRegistrationVariables(): Partial<VatRegistrationVariables> {
  return {
    subject: VAT_REGISTRATION_DEFAULT_SUBJECT,
    show_wolt_section: true,
  };
}

/** Get default variables for Price Quote */
export function getDefaultPriceQuoteVariables(): Partial<PriceQuoteVariables> {
  return {
    subject: PRICE_QUOTE_DEFAULT_SUBJECT,
    fee_amount: 0,
    tax_year: 2026,
    show_transfer_section: false,
    additional_notes: '',
  };
}

/** Get default variables for Previous Accountant Request */
export function getDefaultPreviousAccountantRequestVariables(): Partial<PreviousAccountantRequestVariables> {
  return {
    subjects: [''],
    email_for_documents: 'helli@franco.co.il',
  };
}
