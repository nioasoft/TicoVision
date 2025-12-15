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
// TEMPLATE TYPE DEFINITIONS (for generated_letters table)
// ============================================================================

export type CompanyOnboardingTemplateType =
  | 'company_onboarding_vat_registration';    // Document #1
  // Future: 'company_onboarding_income_tax'

/** Union type of all possible Company Onboarding document variables */
export type CompanyOnboardingVariables =
  | VatRegistrationVariables;
  // Future: | IncomeTaxVariables

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
  // Future letter types will be added here:
  // {
  //   index: 1,
  //   label: 'פתיחת תיק מס הכנסה',
  //   description: 'הנחיות להעברת מסמכים לפתיחת תיק במס הכנסה',
  //   templateType: 'company_onboarding_income_tax',
  //   icon: 'Building2',
  // },
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
