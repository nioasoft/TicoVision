/**
 * Auto Letters System - Unified Letter Generation Types
 *
 * Categories:
 * - קליטת חברה (Company Onboarding)
 * - קביעת מועדים (Setting Dates)
 * - מסמכים חסרים (Missing Documents)
 * - אישורים שנתיים (Annual Approvals) - Future
 */

import type {
  CompanyOnboardingTemplateType,
  VatRegistrationVariables,
} from './company-onboarding.types';
import { VAT_REGISTRATION_DEFAULT_SUBJECT } from './company-onboarding.types';

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

/** Available letter categories */
export type AutoLetterCategory =
  | 'company_onboarding'   // קליטת חברה
  | 'setting_dates'        // קביעת מועדים
  | 'missing_documents'    // מסמכים חסרים
  | 'annual_approvals';    // אישורים שנתיים

/** Configuration for a letter category */
export interface CategoryConfig {
  id: AutoLetterCategory;
  label: string;
  description: string;
  icon: 'Building2' | 'Calendar' | 'FileSearch' | 'FileCheck';
  enabled: boolean;
}

/** All available categories */
export const AUTO_LETTER_CATEGORIES: CategoryConfig[] = [
  {
    id: 'company_onboarding',
    label: 'קליטת חברה',
    description: 'מכתבים לקליטת חברות חדשות - פתיחת תיקים במע"מ, מס הכנסה ועוד',
    icon: 'Building2',
    enabled: true,
  },
  {
    id: 'setting_dates',
    label: 'קביעת מועדים',
    description: 'מכתבי תזכורות, קביעת מועדים ודדליינים',
    icon: 'Calendar',
    enabled: true,
  },
  {
    id: 'missing_documents',
    label: 'מסמכים חסרים',
    description: 'מכתבים לבקשת מסמכים חסרים מלקוחות',
    icon: 'FileSearch',
    enabled: true,
  },
  {
    id: 'annual_approvals',
    label: 'אישורים שנתיים',
    description: 'אישורים שנתיים וחידוש אישורים',
    icon: 'FileCheck',
    enabled: false,
  },
];

// ============================================================================
// TEMPLATE TYPE DEFINITIONS
// ============================================================================

/** All auto-letter template types */
export type AutoLetterTemplateType =
  // Company Onboarding
  | 'company_onboarding_vat_registration'
  // Setting Dates
  | 'setting_dates_cutoff'
  | 'setting_dates_meeting_reminder'
  | 'setting_dates_general_deadline'
  | 'setting_dates_financial_statements'
  // Missing Documents
  | 'missing_documents_general';

// ============================================================================
// LETTER TYPE DEFINITIONS
// ============================================================================

/** Base letter type interface */
export interface LetterTypeConfig {
  id: string;
  label: string;
  description: string;
  templateType: AutoLetterTemplateType | CompanyOnboardingTemplateType;
  icon: string;
}

/** Letter types organized by category */
export const LETTER_TYPES_BY_CATEGORY: Record<AutoLetterCategory, LetterTypeConfig[]> = {
  company_onboarding: [
    {
      id: 'vat_registration',
      label: 'פתיחת תיקי מע״מ',
      description: 'הנחיות להעברת מסמכים לפתיחת תיק במע"מ',
      templateType: 'company_onboarding_vat_registration',
      icon: 'FileText',
    },
  ],
  setting_dates: [
    {
      id: 'cutoff_date',
      label: 'קביעת מועד חיתוך',
      description: 'מכתב לקביעת מועד חיתוך לדו"חות',
      templateType: 'setting_dates_cutoff',
      icon: 'CalendarClock',
    },
    {
      id: 'meeting_reminder',
      label: 'תזכורת לפגישה',
      description: 'תזכורת על פגישה קרובה',
      templateType: 'setting_dates_meeting_reminder',
      icon: 'Bell',
    },
    {
      id: 'general_deadline',
      label: 'מכתב דדליין כללי',
      description: 'הודעה על דדליין כללי',
      templateType: 'setting_dates_general_deadline',
      icon: 'Clock',
    },
    {
      id: 'financial_statements',
      label: 'ישיבה על מאזנים',
      description: 'הזמנה לישיבה על מאזנים/דו"חות כספיים',
      templateType: 'setting_dates_financial_statements',
      icon: 'FileSpreadsheet',
    },
  ],
  missing_documents: [
    {
      id: 'general_missing',
      label: 'מכתב מסמכים חסרים',
      description: 'בקשה להמצאת מסמכים חסרים',
      templateType: 'missing_documents_general',
      icon: 'FileQuestion',
    },
  ],
  annual_approvals: [],
};

// ============================================================================
// SHARED DATA (common to all auto letters)
// ============================================================================

export interface AutoLetterSharedData {
  /** Document generation date in YYYY-MM-DD format */
  document_date: string;

  /** Recipient name (company/group) - from selected client/group */
  company_name: string;

  /** Additional recipient line (contact person + title) */
  recipient_line?: string;
}

// ============================================================================
// DOCUMENT-SPECIFIC VARIABLES
// ============================================================================

/** Variables for Setting Dates - Cutoff Date letter */
export interface CutoffDateVariables extends AutoLetterSharedData {
  subject: string;
  cutoff_date: string;        // תאריך החיתוך
  report_type: string;        // סוג הדו"ח (שנתי, רבעוני וכו')
  additional_notes?: string;  // הערות נוספות
}

/** Variables for Setting Dates - Meeting Reminder letter */
export interface MeetingReminderVariables extends AutoLetterSharedData {
  subject: string;
  meeting_date: string;       // תאריך הפגישה
  meeting_time: string;       // שעת הפגישה
  meeting_location: string;   // מיקום הפגישה
  meeting_topic: string;      // נושא הפגישה
  additional_notes?: string;  // הערות נוספות
}

/** Variables for Setting Dates - General Deadline letter */
export interface GeneralDeadlineVariables extends AutoLetterSharedData {
  subject: string;
  deadline_date: string;      // תאריך הדדליין
  deadline_topic: string;     // נושא הדדליין
  required_actions: string;   // פעולות נדרשות
  additional_notes?: string;  // הערות נוספות
}

/** Variables for Setting Dates - Financial Statements Meeting letter */
export interface FinancialStatementsMeetingVariables extends AutoLetterSharedData {
  subject: string;
  meeting_date: string;       // תאריך הישיבה
  meeting_time: string;       // שעת הישיבה
  meeting_location: string;   // מיקום הישיבה
  fiscal_year: string;        // שנת המאזן
  additional_notes?: string;  // הערות נוספות
}

/** Variables for Missing Documents letter */
export interface MissingDocumentsVariables extends AutoLetterSharedData {
  subject: string;
  missing_documents_list: string;  // רשימת המסמכים החסרים (טקסט חופשי)
  deadline_date?: string;          // תאריך יעד להמצאה (אופציונלי)
  additional_notes?: string;       // הערות נוספות
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SUBJECTS = {
  cutoff_date: 'קביעת מועד חיתוך לדו"חות',
  meeting_reminder: 'תזכורת לפגישה',
  general_deadline: 'הודעה על דדליין',
  financial_statements: 'הזמנה לישיבה על מאזנים',
  missing_documents: 'בקשה להמצאת מסמכים חסרים',
} as const;

// ============================================================================
// FORM STATE
// ============================================================================

/** Document data for Company Onboarding letters */
export interface CompanyOnboardingDocumentData {
  vatRegistration: Partial<VatRegistrationVariables>;
}

/** Document data for Setting Dates letters */
export interface SettingDatesDocumentData {
  cutoffDate: Partial<CutoffDateVariables>;
  meetingReminder: Partial<MeetingReminderVariables>;
  generalDeadline: Partial<GeneralDeadlineVariables>;
  financialStatements: Partial<FinancialStatementsMeetingVariables>;
}

/** Document data for Missing Documents letters */
export interface MissingDocumentsDocumentData {
  generalMissing: Partial<MissingDocumentsVariables>;
}

/** Document data for Annual Approvals letters (placeholder) */
export interface AnnualApprovalsDocumentData {
  // Will be populated when letter types are added
}

/** Complete form state for Auto Letters */
export interface AutoLetterFormState {
  /** Currently selected category */
  selectedCategory: AutoLetterCategory;

  /** Currently selected letter type ID within the category */
  selectedLetterTypeId: string | null;

  /** Recipient mode: single client or group */
  recipientMode: 'client' | 'group';

  /** Selected client ID (when recipientMode is 'client') */
  selectedClientId: string | null;

  /** Selected group ID (when recipientMode is 'group') */
  selectedGroupId: string | null;

  /** Shared data across all letter types */
  sharedData: Partial<AutoLetterSharedData>;

  /** Category-specific document data */
  documentData: {
    company_onboarding: CompanyOnboardingDocumentData;
    setting_dates: SettingDatesDocumentData;
    missing_documents: MissingDocumentsDocumentData;
    annual_approvals: AnnualApprovalsDocumentData;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Create initial form state with default values */
export function createInitialAutoLetterFormState(): AutoLetterFormState {
  return {
    selectedCategory: 'company_onboarding',
    selectedLetterTypeId: null,
    recipientMode: 'client',
    selectedClientId: null,
    selectedGroupId: null,
    sharedData: {
      document_date: new Date().toISOString().split('T')[0],
      company_name: '',
      recipient_line: '',
    },
    documentData: {
      company_onboarding: {
        vatRegistration: {
          subject: VAT_REGISTRATION_DEFAULT_SUBJECT,
          show_wolt_section: true,
          google_drive_link: '',
        },
      },
      setting_dates: {
        cutoffDate: {
          subject: DEFAULT_SUBJECTS.cutoff_date,
          cutoff_date: '',
          report_type: 'שנתי',
        },
        meetingReminder: {
          subject: DEFAULT_SUBJECTS.meeting_reminder,
          meeting_date: '',
          meeting_time: '',
          meeting_location: 'במשרדנו',
          meeting_topic: '',
        },
        generalDeadline: {
          subject: DEFAULT_SUBJECTS.general_deadline,
          deadline_date: '',
          deadline_topic: '',
          required_actions: '',
        },
        financialStatements: {
          subject: DEFAULT_SUBJECTS.financial_statements,
          meeting_date: '',
          meeting_time: '',
          meeting_location: 'במשרדנו',
          fiscal_year: String(new Date().getFullYear() - 1),
        },
      },
      missing_documents: {
        generalMissing: {
          subject: DEFAULT_SUBJECTS.missing_documents,
          missing_documents_list: '',
        },
      },
      annual_approvals: {},
    },
  };
}

/** Get enabled categories only */
export function getEnabledCategories(): CategoryConfig[] {
  return AUTO_LETTER_CATEGORIES.filter(cat => cat.enabled);
}

/** Get letter types for a specific category */
export function getLetterTypesForCategory(category: AutoLetterCategory): LetterTypeConfig[] {
  return LETTER_TYPES_BY_CATEGORY[category] || [];
}

/** Get a specific letter type by category and ID */
export function getLetterTypeById(
  category: AutoLetterCategory,
  letterTypeId: string
): LetterTypeConfig | undefined {
  return LETTER_TYPES_BY_CATEGORY[category]?.find(lt => lt.id === letterTypeId);
}

/** Get category config by ID */
export function getCategoryById(categoryId: AutoLetterCategory): CategoryConfig | undefined {
  return AUTO_LETTER_CATEGORIES.find(cat => cat.id === categoryId);
}

/** Get the template type for a letter */
export function getTemplateType(
  category: AutoLetterCategory,
  letterTypeId: string
): AutoLetterTemplateType | CompanyOnboardingTemplateType | null {
  const letterType = getLetterTypeById(category, letterTypeId);
  if (!letterType) return null;
  return letterType.templateType;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/** Validate Cutoff Date letter */
export function validateCutoffDate(data: Partial<CutoffDateVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.cutoff_date &&
    data.report_type
  );
}

/** Validate Meeting Reminder letter */
export function validateMeetingReminder(data: Partial<MeetingReminderVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.meeting_date &&
    data.meeting_time &&
    data.meeting_location &&
    data.meeting_topic
  );
}

/** Validate General Deadline letter */
export function validateGeneralDeadline(data: Partial<GeneralDeadlineVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.deadline_date &&
    data.deadline_topic &&
    data.required_actions
  );
}

/** Validate Financial Statements Meeting letter */
export function validateFinancialStatementsMeeting(data: Partial<FinancialStatementsMeetingVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.meeting_date &&
    data.meeting_time &&
    data.meeting_location &&
    data.fiscal_year
  );
}

/** Validate Missing Documents letter */
export function validateMissingDocuments(data: Partial<MissingDocumentsVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.missing_documents_list?.trim()
  );
}
