/**
 * Auto Letters System - Unified Letter Generation Types
 *
 * Categories:
 * - קליטת חברה (Company Onboarding)
 * - קביעת מועדים (Setting Dates)
 * - מסמכים חסרים (Missing Documents)
 * - מכתבי זירוז (Reminder Letters)
 * - אישורים לבנק/מוסדות (Bank Approvals)
 */

import type {
  CompanyOnboardingTemplateType,
  VatRegistrationVariables,
  PriceQuoteVariables,
  PreviousAccountantRequestVariables,
} from './company-onboarding.types';
import { VAT_REGISTRATION_DEFAULT_SUBJECT, PRICE_QUOTE_DEFAULT_SUBJECT, PREVIOUS_ACCOUNTANT_REQUEST_DEFAULT_SUBJECT } from './company-onboarding.types';

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

/** Available letter categories */
export type AutoLetterCategory =
  | 'company_onboarding'   // קליטת חברה
  | 'setting_dates'        // קביעת מועדים
  | 'missing_documents'    // מסמכים חסרים
  | 'reminder_letters'     // מכתבי זירוז
  | 'bank_approvals'       // אישורים לבנק/מוסדות
  | 'mortgage_approvals'   // אישורי משכנתא
  | 'tax_notices'          // הודעות מס
  | 'audit_completion'     // סיום ביקורת דוחות כספיים
  | 'tax_advances';        // מקדמות מ"ה

/** Configuration for a letter category */
export interface CategoryConfig {
  id: AutoLetterCategory;
  label: string;
  description: string;
  icon: 'Building2' | 'Calendar' | 'FileSearch' | 'FileCheck' | 'Bell' | 'Landmark' | 'Home' | 'Receipt' | 'ClipboardCheck' | 'Banknote';
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
    id: 'reminder_letters',
    label: 'מכתבי זירוז',
    description: 'מכתבי תזכורת וזירוז למנהלות חשבונות וללקוחות',
    icon: 'Bell',
    enabled: true,
  },
  {
    id: 'bank_approvals',
    label: 'אישורי הכנסות',
    description: 'אישורי הכנסות ומסמכים לבנקים ומוסדות',
    icon: 'Landmark',
    enabled: true,
  },
  {
    id: 'mortgage_approvals',
    label: 'אישורי משכנתא',
    description: 'אישורי רו"ח לצורך קבלת משכנתא - לחברות בע"מ ועוסקים',
    icon: 'Home',
    enabled: true,
  },
  {
    id: 'tax_notices',
    label: 'הודעות מס',
    description: 'הודעות בנושא מיסים, חבויות ותשלומים לרשות המסים',
    icon: 'Receipt',
    enabled: true,
  },
  {
    id: 'audit_completion',
    label: 'סיום ביקורת דוחות כספיים',
    description: 'מכתבים בנושא סיום ביקורת ועריכת דוחות כספיים',
    icon: 'ClipboardCheck',
    enabled: true,
  },
  {
    id: 'tax_advances',
    label: 'מקדמות מ"ה',
    description: 'מקדמות מס הכנסה שוטפות - חודשיות ורבעוניות',
    icon: 'Banknote',
    enabled: true,
  },
];

// ============================================================================
// TEMPLATE TYPE DEFINITIONS
// ============================================================================

/** All auto-letter template types */
export type AutoLetterTemplateType =
  // Company Onboarding
  | 'company_onboarding_vat_registration'
  | 'company_onboarding_vat_file_opened'
  | 'company_onboarding_previous_accountant'
  // Setting Dates
  | 'setting_dates_cutoff'
  | 'setting_dates_meeting_reminder'
  | 'setting_dates_general_deadline'
  | 'setting_dates_financial_statements'
  // Missing Documents
  | 'missing_documents_general'
  // Reminder Letters (מכתבי זירוז)
  | 'reminder_letters_personal_report'
  | 'reminder_letters_bookkeeper_balance'
  // Bank Approvals (אישורים לבנק/מוסדות)
  | 'bank_approvals_income_confirmation'
  // Mortgage Approvals (אישורי משכנתא)
  | 'mortgage_approvals_audited_company'       // בעל שליטה - דוחות מבוקרים
  | 'mortgage_approvals_unaudited_company'     // בעל שליטה - טרם בוקרו
  | 'mortgage_approvals_osek_submitted'        // עוסק - דוח הוגש
  | 'mortgage_approvals_osek_unsubmitted'      // עוסק - טרם הוגש
  // Tax Notices (הודעות מס)
  | 'tax_notices_payment_notice'
  // Audit Completion (סיום ביקורת דוחות כספיים)
  | 'audit_completion_general'
  // Tax Advances (מקדמות מ"ה)
  | 'tax_advances_monthly'
  | 'tax_advances_quarterly';

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
    {
      id: 'vat_file_opened',
      label: 'פתיחת תיק מע״מ - הודעה',
      description: 'הודעה ללקוח על פתיחת תיק מע״מ בהצלחה עם כל הפרטים',
      templateType: 'company_onboarding_vat_file_opened',
      icon: 'FileCheck',
    },
    {
      id: 'price_quote_small',
      label: 'הצעת מחיר - חברה קטנה',
      description: 'הצעת מחיר לשירותי ראיית חשבון לחברה קטנה',
      templateType: 'company_onboarding_price_quote_small',
      icon: 'Receipt',
    },
    {
      id: 'price_quote_restaurant',
      label: 'הצעת מחיר - מסעדה',
      description: 'הצעת מחיר לשירותי ראיית חשבון למסעדות',
      templateType: 'company_onboarding_price_quote_restaurant',
      icon: 'UtensilsCrossed',
    },
    {
      id: 'previous_accountant_request',
      label: 'פנייה לרואה חשבון קודם',
      description: 'בקשת מסמכים ותיקים מרואה חשבון קודם',
      templateType: 'company_onboarding_previous_accountant',
      icon: 'UserMinus',
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
  reminder_letters: [
    {
      id: 'personal_report_reminder',
      label: 'תזכורת למסמכים לדוחות אישיים',
      description: 'תזכורת ללקוח להשלמת מסמכים לדוח האישי',
      templateType: 'reminder_letters_personal_report',
      icon: 'FileText',
    },
    {
      id: 'bookkeeper_balance_reminder',
      label: 'זירוז מנהלת חשבונות למאזן',
      description: 'הנחיות למנהלת החשבונות לקראת ישיבת מאזנים',
      templateType: 'reminder_letters_bookkeeper_balance',
      icon: 'Calculator',
    },
  ],
  bank_approvals: [
    {
      id: 'income_confirmation',
      label: 'אישור הכנסות',
      description: 'אישור הכנסות לבנקים ומוסדות',
      templateType: 'bank_approvals_income_confirmation',
      icon: 'Receipt',
    },
  ],
  mortgage_approvals: [
    {
      id: 'audited_company',
      label: 'בעל שליטה - דוחות מבוקרים',
      description: 'אישור רו"ח לבעל שליטה בחברה בע"מ עם דוחות כספיים מבוקרים',
      templateType: 'mortgage_approvals_audited_company',
      icon: 'FileCheck',
    },
    {
      id: 'unaudited_company',
      label: 'בעל שליטה - טרם בוקרו',
      description: 'אישור רו"ח לבעל שליטה בחברה בע"מ שדוחותיה טרם בוקרו',
      templateType: 'mortgage_approvals_unaudited_company',
      icon: 'FileSearch',
    },
    {
      id: 'osek_submitted',
      label: 'עוסק מורשה/פטור - דוח הוגש',
      description: 'אישור רו"ח לעוסק שדוח המס שלו הוגש לרשויות',
      templateType: 'mortgage_approvals_osek_submitted',
      icon: 'CheckCircle',
    },
    {
      id: 'osek_unsubmitted',
      label: 'עוסק מורשה/פטור - טרם הוגש',
      description: 'אישור רו"ח לעוסק שדוח המס שלו טרם הוגש',
      templateType: 'mortgage_approvals_osek_unsubmitted',
      icon: 'Clock',
    },
  ],
  tax_notices: [
    {
      id: 'tax_payment_notice',
      label: 'הודעה על יתרת מס לתשלום',
      description: 'הודעה ללקוח על יתרת חבות מס לאחר שידור דוחות כספיים',
      templateType: 'tax_notices_payment_notice',
      icon: 'FileText',
    },
  ],
  audit_completion: [
    {
      id: 'general',
      label: 'מכתב סיום ביקורת דוחות כספיים',
      description: 'מכתב המודיע על צפי סיום עבודת הביקורת ועריכת הדוחות הכספיים',
      templateType: 'audit_completion_general',
      icon: 'ClipboardCheck',
    },
  ],
  tax_advances: [
    {
      id: 'monthly_advance',
      label: 'מקדמה חודשית',
      description: 'הודעה על מקדמה חודשית למס הכנסה',
      templateType: 'tax_advances_monthly',
      icon: 'Calendar',
    },
    {
      id: 'quarterly_advance',
      label: 'מקדמה רבעונית',
      description: 'הודעה על מקדמה רבעונית למס הכנסה',
      templateType: 'tax_advances_quarterly',
      icon: 'CalendarDays',
    },
  ],
};

// ============================================================================
// SHARED DATA (common to all auto letters)
// ============================================================================

export interface AutoLetterSharedData {
  /** Document generation date in YYYY-MM-DD format */
  document_date: string;

  /** Recipient name (company/group) - from selected client/group */
  company_name: string;

  /** Company ID (ח.פ.) - from selected client */
  company_id?: string;

  /** Additional recipient line (contact person + title) */
  recipient_line?: string;
}

// ============================================================================
// COMPANY ONBOARDING VARIABLES
// ============================================================================

/** Variables for Company Onboarding - VAT File Opened notification */
export interface VatFileOpenedVariables extends AutoLetterSharedData {
  subject: string;
  /** מספר ח.פ (9 ספרות) */
  company_id: string;
  /** מספר עוסק מורשה */
  vat_number: string;
  /** תדירות דיווח (חודשי / דו-חודשי) */
  vat_report_frequency: 'חודשי' | 'דו-חודשי';
  /** מועד דיווח ראשון (לדוגמה: 15/5/2025) */
  vat_first_report_date: string;
  /** בגין חודש (לדוגמה: אפריל 2025) */
  vat_first_report_period: string;
  /** קישור לתעודת עוסק מורשה (אופציונלי) */
  certificate_link?: string;
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

/** Variables for Reminder Letters - Personal Report Reminder */
export interface PersonalReportReminderVariables extends AutoLetterSharedData {
  subject: string;
  tax_year: string;               // שנת המס
  free_text_documents: string;    // רשימת המסמכים הנדרשים (טקסט חופשי)
  bookkeeper_name: string;        // שם מנה"ח לשליחה
  google_drive_link?: string;     // לינק לגוגל דרייב (אופציונלי)
}

/** Variables for Reminder Letters - Bookkeeper Balance Reminder */
export interface BookkeeperBalanceReminderVariables extends AutoLetterSharedData {
  subject: string;
  meeting_date: string;           // תאריך הישיבה
  bookkeeper_name: string;        // שם מנהל/ת החשבונות
  fiscal_year: string;            // שנת המס
}

/** Single income entry for income confirmation letter */
export interface IncomeEntry {
  month: string;    // חודש בעברית (ינואר, פברואר...)
  year: number;     // שנה
  amount: number;   // סכום (לפני מע"מ)
}

/** Variables for Bank Approvals - Income Confirmation letter */
export interface IncomeConfirmationVariables extends AutoLetterSharedData {
  subject?: string;
  recipient_name: string;           // לכבוד (נמען - בנק, מוסד וכו')
  period_text?: string;             // תקופה (נגזר אוטומטית מהטבלה)
  income_entries: IncomeEntry[];    // טבלת הכנסות
  // Note: company_name and company_id come from AutoLetterSharedData
}

/** Single shareholder entry for mortgage income confirmation letter */
export interface ShareholderEntry {
  name: string;                     // שם בעל מניות
  id_number: string;                // מספר מזהה
  holding_percentage: number;       // אחוז החזקה בחברה
}

/** Variables for Bank Approvals - Mortgage Income Confirmation letter (DEPRECATED - use mortgage_approvals) */
export interface MortgageIncomeVariables extends AutoLetterSharedData {
  // שם הבנק (שדה פתוח)
  bank_name: string;

  // פרטי מבקש/ת המשכנתא
  applicant_name: string;
  applicant_role: string;           // תפקיד בחברה

  // תקופה
  period_months: number;
  period_end_date: string;          // YYYY-MM-DD

  // נתונים כספיים (3 שדות)
  revenue_turnover: number;         // מחזור ההכנסות (ללא מע"מ)
  salary_expenses: number;          // הוצאות השכר
  estimated_profit: number;         // רווח חשבונאי משוער לפני מס

  // בעלי מניות
  registrar_report_date: string;    // תאריך דוח רשם החברות
  shareholders: ShareholderEntry[]; // טבלה דינמית

  // דיבידנד (אופציונלי)
  has_dividend: boolean;            // האם חולק דיבידנד
  dividend_date?: string;           // תאריך חלוקה
  dividend_details?: string;        // פרטי הסכומים
}

// ============================================================================
// MORTGAGE APPROVALS VARIABLES (אישורי משכנתא)
// ============================================================================

/** Variables for Mortgage Approvals - Audited Company (בעל שליטה - דוחות מבוקרים) */
export interface MortgageAuditedCompanyVariables extends AutoLetterSharedData {
  // שם הבנק
  bank_name: string;

  // פרטי מבקש/ת המשכנתא
  applicant_name: string;
  applicant_role: string;           // תפקיד בחברה

  // נתוני הדוח המבוקר
  audited_year: number;             // שנת הדוח המבוקר (2024)
  audit_date: string;               // תאריך חוות הדעת (YYYY-MM-DD)

  // נתונים כספיים מהדוח המבוקר
  revenue_turnover: number;         // מחזור ההכנסות (ללא מע"מ)
  net_profit_current: number;       // רווח נקי לפני מס - שנה נוכחית
  net_profit_previous: number;      // רווח נקי - שנה קודמת
  retained_earnings: number;        // יתרת עודפים

  // בעלי מניות (מרשם החברות)
  registrar_report_date: string;    // תאריך דוח רשם החברות
  shareholders: ShareholderEntry[]; // טבלה דינמית

  // דיבידנד (אופציונלי)
  has_dividend: boolean;
  dividend_date?: string;
  dividend_details?: string;
}

/** Variables for Mortgage Approvals - Unaudited Company (בעל שליטה - טרם בוקרו) */
export interface MortgageUnauditedCompanyVariables extends AutoLetterSharedData {
  // שם הבנק
  bank_name: string;

  // פרטי מבקש/ת המשכנתא
  applicant_name: string;
  applicant_role: string;

  // תקופה
  period_months: number;
  period_end_date: string;          // YYYY-MM-DD

  // נתונים כספיים (בלתי מבוקרים)
  revenue_turnover: number;         // מחזור ההכנסות (ללא מע"מ)
  salary_expenses: number;          // הוצאות השכר
  estimated_profit: number;         // רווח חשבונאי משוער לפני מס

  // בעלי מניות
  registrar_report_date: string;
  shareholders: ShareholderEntry[];

  // דיבידנד (אופציונלי)
  has_dividend: boolean;
  dividend_date?: string;
  dividend_details?: string;

  // צירוף דוח מבוקר (אופציונלי)
  has_audited_report_attachment?: boolean;
  ebitda_amount?: number;
}

/** Variables for Mortgage Approvals - Osek Submitted (עוסק - דוח הוגש) */
export interface MortgageOsekSubmittedVariables extends AutoLetterSharedData {
  // שם הבנק
  bank_name: string;

  // פרטי מבקש/ת המשכנתא
  applicant_name: string;

  // נתוני הדוח שהוגש
  report_year: number;              // שנת הדוח
  submission_date: string;          // תאריך הגשה (YYYY-MM-DD)
  tax_office: string;               // שם משרד השומה

  // נתונים כספיים
  revenue_turnover: number;         // מחזור הכנסות (ללא מע"מ)
  taxable_income: number;           // הכנסה חייבת מיגיעה אישית
  income_tax: number;               // סכום מס ההכנסה
}

/** Variables for Mortgage Approvals - Osek Unsubmitted (עוסק - טרם הוגש) */
export interface MortgageOsekUnsubmittedVariables extends AutoLetterSharedData {
  // שם הבנק
  bank_name: string;

  // פרטי מבקש/ת המשכנתא
  applicant_name: string;

  // תקופה (דוח בלתי מבוקר)
  period_months: number;
  period_end_date: string;          // YYYY-MM-DD

  // נתונים כספיים (בלתי מבוקרים)
  revenue_turnover: number;         // מחזור הכנסות (ללא מע"מ)
  estimated_profit: number;         // רווח משוער לפני מס

  // דוח אחרון שהוגש
  last_submitted_year: number;      // שנת הדוח האחרון שהוגש
  last_submission_date: string;     // תאריך הגשתו
  tax_office: string;               // משרד השומה

  // נקודות זיכוי
  credit_points: number;            // מספר נקודות הזיכוי

  // צירוף דוח מבוקר (אופציונלי)
  has_audited_report_attachment?: boolean;
  ebitda_amount?: number;
}

// ============================================================================
// AUDIT COMPLETION VARIABLES (סיום ביקורת דוחות כספיים)
// ============================================================================

/** Variables for Audit Completion letter */
export interface AuditCompletionVariables extends AutoLetterSharedData {
  /** שנת המס של הביקורת */
  audit_year: number;
  /** צפי סיום הביקורת (תאריך) */
  completion_date: string;
  /** שורה ראשונה של "לכבוד" (לדוגמה: "בנק מזרחי טפחות") */
  addressee_line1: string;
  /** שורה שנייה של "לכבוד" (לדוגמה: "באמצעות הפקיד המטפל") - אופציונלי */
  addressee_line2?: string;
}

// ============================================================================
// TAX ADVANCES VARIABLES (מקדמות מ"ה)
// ============================================================================

/** Variables for Tax Advances - Monthly */
export interface TaxAdvancesMonthlyVariables extends AutoLetterSharedData {
  subject: string;
  /** שנת המס */
  tax_year: number;
  /** חודש המקדמה */
  advance_month: string;
  /** סכום המקדמה */
  advance_amount: number;
  /** תאריך יעד לתשלום */
  due_date: string;
}

/** Variables for Tax Advances - Quarterly */
export interface TaxAdvancesQuarterlyVariables extends AutoLetterSharedData {
  subject: string;
  /** שנת המס */
  tax_year: number;
  /** רבעון (1-4) */
  quarter: number;
  /** סכום המקדמה */
  advance_amount: number;
  /** תאריך יעד לתשלום */
  due_date: string;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SUBJECTS = {
  // Company Onboarding
  vat_file_opened: 'פתיחת תיק מס ערך מוסף (מע"מ)',
  // Setting Dates
  cutoff_date: 'קביעת מועד חיתוך לדו"חות',
  meeting_reminder: 'תזכורת לפגישה',
  general_deadline: 'הודעה על דדליין',
  financial_statements: 'הזמנה לישיבה על מאזנים',
  missing_documents: 'בקשה להמצאת מסמכים חסרים',
  personal_report_reminder: 'השלמות לדוח האישי',
  bookkeeper_balance_reminder: 'סיכום פרטיכל מישיבה',
  income_confirmation: 'אישור הכנסות',
  // Mortgage Approvals (אישורי משכנתא)
  mortgage_audited_company: 'אישור רו"ח למשכנתא - בעל שליטה (דוחות מבוקרים)',
  mortgage_unaudited_company: 'אישור רו"ח למשכנתא - בעל שליטה (דוחות בלתי מבוקרים)',
  mortgage_osek_submitted: 'אישור רו"ח למשכנתא - עוסק (דוח הוגש)',
  mortgage_osek_unsubmitted: 'אישור רו"ח למשכנתא - עוסק (דוח בלתי מבוקר)',
  tax_payment_notice: 'יתרה לתשלום חבות המס שנותרה למס הכנסה',
  // Audit Completion (סיום ביקורת דוחות כספיים)
  audit_completion_general: 'סיום ביקורת ועריכת דוח כספי',
  // Tax Advances (מקדמות מ"ה)
  tax_advances_monthly: 'מקדמת מס הכנסה חודשית',
  tax_advances_quarterly: 'מקדמת מס הכנסה רבעונית',
} as const;

// ============================================================================
// FORM STATE
// ============================================================================

/** Document data for Company Onboarding letters */
export interface CompanyOnboardingDocumentData {
  vatRegistration: Partial<VatRegistrationVariables>;
  vatFileOpened: Partial<VatFileOpenedVariables>;
  priceQuote: Partial<PriceQuoteVariables>;
  previousAccountantRequest: Partial<PreviousAccountantRequestVariables>;
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

/** Document data for Bank Approvals letters */
export interface BankApprovalsDocumentData {
  incomeConfirmation: Partial<IncomeConfirmationVariables>;
}

/** Document data for Mortgage Approvals letters */
export interface MortgageApprovalsDocumentData {
  auditedCompany: Partial<MortgageAuditedCompanyVariables>;
  unauditedCompany: Partial<MortgageUnauditedCompanyVariables>;
  osekSubmitted: Partial<MortgageOsekSubmittedVariables>;
  osekUnsubmitted: Partial<MortgageOsekUnsubmittedVariables>;
}

/** Document data for Tax Notices letters */
export interface TaxNoticesDocumentData {
  taxPaymentNotice: Partial<TaxPaymentNoticeVariables>;
}

/** Document data for Audit Completion letters */
export interface AuditCompletionDocumentData {
  general: Partial<AuditCompletionVariables>;
}

/** Document data for Tax Advances letters */
export interface TaxAdvancesDocumentData {
  monthlyAdvance: Partial<TaxAdvancesMonthlyVariables>;
  quarterlyAdvance: Partial<TaxAdvancesQuarterlyVariables>;
}

/** Document data for Reminder Letters */
export interface ReminderLettersDocumentData {
  personalReportReminder: Partial<PersonalReportReminderVariables>;
  bookkeeperBalanceReminder: Partial<BookkeeperBalanceReminderVariables>;
}

/** Adhoc contact (not saved in system) */
export interface AdhocContact {
  name: string;
  email: string;
}

/** Complete form state for Auto Letters */
export interface AutoLetterFormState {
  /** Currently selected category */
  selectedCategory: AutoLetterCategory;

  /** Currently selected letter type ID within the category */
  selectedLetterTypeId: string | null;

  /** Recipient mode: single client, group, system contact, or adhoc contact */
  recipientMode: 'client' | 'group' | 'contact' | 'adhoc';

  /** Selected client ID (when recipientMode is 'client') */
  selectedClientId: string | null;

  /** Selected group ID (when recipientMode is 'group') */
  selectedGroupId: string | null;

  /** Selected contact ID (when recipientMode is 'contact') */
  selectedContactId: string | null;

  /** Adhoc contact details (when recipientMode is 'adhoc') */
  adhocContact: AdhocContact | null;

  /** Shared data across all letter types */
  sharedData: Partial<AutoLetterSharedData>;

  /** Category-specific document data */
  documentData: {
    company_onboarding: CompanyOnboardingDocumentData;
    setting_dates: SettingDatesDocumentData;
    missing_documents: MissingDocumentsDocumentData;
    reminder_letters: ReminderLettersDocumentData;
    bank_approvals: BankApprovalsDocumentData;
    mortgage_approvals: MortgageApprovalsDocumentData;
    tax_notices: TaxNoticesDocumentData;
    audit_completion: AuditCompletionDocumentData;
    tax_advances: TaxAdvancesDocumentData;
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
    selectedContactId: null,
    adhocContact: null,
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
        vatFileOpened: {
          subject: DEFAULT_SUBJECTS.vat_file_opened,
          company_id: '',
          vat_number: '',
          vat_report_frequency: 'חודשי',
          vat_first_report_date: '',
          vat_first_report_period: '',
          certificate_link: '',
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
      reminder_letters: {
        personalReportReminder: {
          subject: DEFAULT_SUBJECTS.personal_report_reminder,
          tax_year: String(new Date().getFullYear() - 1),
          free_text_documents: '',
          bookkeeper_name: '',
        },
        bookkeeperBalanceReminder: {
          subject: DEFAULT_SUBJECTS.bookkeeper_balance_reminder,
          meeting_date: '',
          bookkeeper_name: '',
          fiscal_year: String(new Date().getFullYear() - 1),
        },
      },
      bank_approvals: {
        incomeConfirmation: {
          subject: DEFAULT_SUBJECTS.income_confirmation,
          recipient_name: '',
          period_text: '',
          income_entries: [],
        },
      },
      mortgage_approvals: {
        auditedCompany: {
          bank_name: '',
          applicant_name: '',
          applicant_role: '',
          audited_year: new Date().getFullYear() - 1,
          audit_date: '',
          revenue_turnover: 0,
          net_profit_current: 0,
          net_profit_previous: 0,
          retained_earnings: 0,
          registrar_report_date: '',
          shareholders: [{ name: '', id_number: '', holding_percentage: 100 }],
          has_dividend: false,
          dividend_date: '',
          dividend_details: '',
        },
        unauditedCompany: {
          bank_name: '',
          applicant_name: '',
          applicant_role: '',
          period_months: 12,
          period_end_date: '',
          revenue_turnover: 0,
          salary_expenses: 0,
          estimated_profit: 0,
          registrar_report_date: '',
          shareholders: [{ name: '', id_number: '', holding_percentage: 100 }],
          has_dividend: false,
          dividend_date: '',
          dividend_details: '',
        },
        osekSubmitted: {
          bank_name: '',
          applicant_name: '',
          report_year: new Date().getFullYear() - 1,
          submission_date: '',
          tax_office: '',
          revenue_turnover: 0,
          taxable_income: 0,
          income_tax: 0,
        },
        osekUnsubmitted: {
          bank_name: '',
          applicant_name: '',
          period_months: 12,
          period_end_date: '',
          revenue_turnover: 0,
          estimated_profit: 0,
          last_submitted_year: new Date().getFullYear() - 2,
          last_submission_date: '',
          tax_office: '',
          credit_points: 2.25,
        },
      },
      tax_notices: {
        taxPaymentNotice: {
          tax_year: String(new Date().getFullYear() - 1),
          greeting_name: '',
          tax_amount: undefined,
          tax_payment_link: '',
        },
      },
      audit_completion: {
        general: {
          audit_year: new Date().getFullYear() - 1,
          completion_date: '',
        },
      },
      tax_advances: {
        monthlyAdvance: {
          subject: DEFAULT_SUBJECTS.tax_advances_monthly,
          tax_year: new Date().getFullYear(),
          advance_month: '',
          advance_amount: 0,
          due_date: '',
        },
        quarterlyAdvance: {
          subject: DEFAULT_SUBJECTS.tax_advances_quarterly,
          tax_year: new Date().getFullYear(),
          quarter: 1,
          advance_amount: 0,
          due_date: '',
        },
      },
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

/** Validate VAT File Opened notification */
export function validateVatFileOpened(data: Partial<VatFileOpenedVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.subject?.trim() &&
    data.company_id?.trim() &&
    data.vat_number?.trim() &&
    data.vat_report_frequency &&
    data.vat_first_report_date?.trim() &&
    data.vat_first_report_period?.trim()
  );
}

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

/** Validate Personal Report Reminder letter */
export function validatePersonalReportReminder(data: Partial<PersonalReportReminderVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.tax_year &&
    data.free_text_documents?.trim() &&
    data.bookkeeper_name?.trim()
  );
}

/** Validate Bookkeeper Balance Reminder letter */
export function validateBookkeeperBalanceReminder(data: Partial<BookkeeperBalanceReminderVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name &&
    data.subject &&
    data.meeting_date &&
    data.bookkeeper_name?.trim() &&
    data.fiscal_year
  );
}

/** Validate Income Confirmation letter */
export function validateIncomeConfirmation(data: Partial<IncomeConfirmationVariables>): boolean {
  return !!(
    data.document_date &&
    data.recipient_name?.trim() &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    data.income_entries &&
    data.income_entries.length > 0 &&
    data.income_entries.every(entry =>
      entry.month?.trim() &&
      entry.year > 0 &&
      entry.amount > 0
    )
  );
}

/** Validate Mortgage Income Confirmation letter */
export function validateMortgageIncome(data: Partial<MortgageIncomeVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    data.bank_name?.trim() &&
    data.applicant_name?.trim() &&
    data.applicant_role?.trim() &&
    data.period_months &&
    data.period_months > 0 &&
    data.period_end_date &&
    data.revenue_turnover !== undefined &&
    data.salary_expenses !== undefined &&
    data.estimated_profit !== undefined &&
    data.registrar_report_date &&
    data.shareholders &&
    data.shareholders.length > 0 &&
    data.shareholders.every(sh =>
      sh.name?.trim() &&
      sh.id_number?.trim() &&
      sh.holding_percentage >= 0 &&
      sh.holding_percentage <= 100
    )
  );
}

// ============================================================================
// TAX NOTICES VARIABLES & VALIDATION
// ============================================================================

/** Variables for Tax Payment Notice letter */
export interface TaxPaymentNoticeVariables extends AutoLetterSharedData {
  /** שנת המס */
  tax_year: string;
  /** שם לפנייה אישית (למשל "פלוני") */
  greeting_name: string;
  /** סכום חבות המס לתשלום */
  tax_amount?: number;
  /** קישור לתשלום באזור האישי של רשות המסים */
  tax_payment_link?: string;
}

/** Default subject for Tax Payment Notice */
export const TAX_PAYMENT_NOTICE_DEFAULT_SUBJECT = 'יתרה לתשלום חבות המס שנותרה למס הכנסה';

/** Validate Tax Payment Notice letter */
export function validateTaxPaymentNotice(data: Partial<TaxPaymentNoticeVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.tax_year?.trim() &&
    data.greeting_name?.trim() &&
    data.tax_amount !== undefined &&
    data.tax_amount > 0
  );
}

// ============================================================================
// MORTGAGE APPROVALS VALIDATION FUNCTIONS
// ============================================================================

/** Validate Mortgage Approvals - Audited Company (בעל שליטה - דוחות מבוקרים) */
export function validateMortgageAuditedCompany(data: Partial<MortgageAuditedCompanyVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    data.bank_name?.trim() &&
    data.applicant_name?.trim() &&
    data.applicant_role?.trim() &&
    data.audited_year && data.audited_year > 2000 &&
    data.audit_date &&
    data.revenue_turnover !== undefined &&
    data.net_profit_current !== undefined &&
    data.net_profit_previous !== undefined &&
    data.retained_earnings !== undefined &&
    data.registrar_report_date &&
    data.shareholders &&
    data.shareholders.length > 0 &&
    data.shareholders.every(sh =>
      sh.name?.trim() &&
      sh.id_number?.trim() &&
      sh.holding_percentage >= 0
    )
  );
}

/** Validate Mortgage Approvals - Unaudited Company (בעל שליטה - טרם בוקרו) */
export function validateMortgageUnauditedCompany(data: Partial<MortgageUnauditedCompanyVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    data.bank_name?.trim() &&
    data.applicant_name?.trim() &&
    data.applicant_role?.trim() &&
    data.period_months && data.period_months > 0 &&
    data.period_end_date &&
    data.revenue_turnover !== undefined &&
    data.salary_expenses !== undefined &&
    data.estimated_profit !== undefined &&
    data.registrar_report_date &&
    data.shareholders &&
    data.shareholders.length > 0 &&
    data.shareholders.every(sh =>
      sh.name?.trim() &&
      sh.id_number?.trim() &&
      sh.holding_percentage >= 0
    )
  );
}

/** Validate Mortgage Approvals - Osek Submitted (עוסק מורשה/פטור - דוח הוגש) */
export function validateMortgageOsekSubmitted(data: Partial<MortgageOsekSubmittedVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.bank_name?.trim() &&
    data.applicant_name?.trim() &&
    data.report_year && data.report_year > 2000 &&
    data.submission_date &&
    data.tax_office?.trim() &&
    data.revenue_turnover !== undefined &&
    data.taxable_income !== undefined &&
    data.income_tax !== undefined
  );
}

/** Validate Mortgage Approvals - Osek Unsubmitted (עוסק מורשה/פטור - טרם הוגש) */
export function validateMortgageOsekUnsubmitted(data: Partial<MortgageOsekUnsubmittedVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.bank_name?.trim() &&
    data.applicant_name?.trim() &&
    data.period_months && data.period_months > 0 &&
    data.period_end_date &&
    data.revenue_turnover !== undefined &&
    data.estimated_profit !== undefined &&
    data.last_submitted_year && data.last_submitted_year > 2000 &&
    data.last_submission_date &&
    data.tax_office?.trim() &&
    data.credit_points !== undefined
  );
}

// ============================================================================
// AUDIT COMPLETION VALIDATION
// ============================================================================

/** Validate Audit Completion letter */
export function validateAuditCompletion(data: Partial<AuditCompletionVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&  // Client name (for "הנדון")
    data.addressee_line1?.trim() &&  // Addressee (for "לכבוד")
    data.audit_year && data.audit_year > 2000 &&
    data.completion_date
  );
}

// ============================================================================
// TAX ADVANCES VALIDATION
// ============================================================================

/** Validate Tax Advances - Monthly letter */
export function validateTaxAdvancesMonthly(data: Partial<TaxAdvancesMonthlyVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.subject?.trim() &&
    data.tax_year && data.tax_year > 2000 &&
    data.advance_month?.trim() &&
    data.advance_amount !== undefined &&
    data.advance_amount > 0 &&
    data.due_date
  );
}

/** Validate Tax Advances - Quarterly letter */
export function validateTaxAdvancesQuarterly(data: Partial<TaxAdvancesQuarterlyVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.subject?.trim() &&
    data.tax_year && data.tax_year > 2000 &&
    data.quarter && data.quarter >= 1 && data.quarter <= 4 &&
    data.advance_amount !== undefined &&
    data.advance_amount > 0 &&
    data.due_date
  );
}
