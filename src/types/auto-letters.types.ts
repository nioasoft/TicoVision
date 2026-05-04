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
import { VAT_REGISTRATION_DEFAULT_SUBJECT, PRICE_QUOTE_DEFAULT_SUBJECT } from './company-onboarding.types';

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
  | 'company_registrar'    // רשם החברות
  | 'audit_completion'     // סיום ביקורת דוחות כספיים
  | 'tax_advances'         // מקדמות מ"ה
  | 'protocols'            // פרוטוקולים
  | 'tax_refund'           // החזרי מס
  | 'state_backed_loans';  // הלוואות בערבות מדינה

/** Configuration for a letter category */
export interface CategoryConfig {
  id: AutoLetterCategory;
  label: string;
  description: string;
  icon: 'Building2' | 'Calendar' | 'FileSearch' | 'FileCheck' | 'Bell' | 'Landmark' | 'Home' | 'Receipt' | 'ClipboardCheck' | 'Banknote' | 'FileSignature' | 'ReceiptText';
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
    id: 'company_registrar',
    label: 'רשם החברות',
    description: 'מכתבים בנושא רשם החברות - אגרות שנתיות ועוד',
    icon: 'Building2',
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
    description: 'הודעות על שיעור מקדמות מס הכנסה',
    icon: 'Banknote',
    enabled: true,
  },
  {
    id: 'protocols',
    label: 'פרוטוקולים',
    description: 'פרוטוקולים מאסיפות בעלי מניות',
    icon: 'FileSignature',
    enabled: true,
  },
  {
    id: 'tax_refund',
    label: 'החזרי מס',
    description: 'פניות לפקיד שומה בבקשה להחזר מס',
    icon: 'ReceiptText',
    enabled: true,
  },
  {
    id: 'state_backed_loans',
    label: 'הלוואות בערבות מדינה',
    description: 'מכתבים לצורך בקשת הלוואה מקרן ההלוואות לעסקים קטנים ובינוניים בערבות מדינה',
    icon: 'Landmark',
    enabled: true,
  },
];

/** Maps category ID to its permission key for access control */
export const CATEGORY_PERMISSION_MAP: Record<AutoLetterCategory, string> = {
  company_onboarding: 'documents:auto-letters:company_onboarding',
  setting_dates: 'documents:auto-letters:setting_dates',
  missing_documents: 'documents:auto-letters:missing_documents',
  reminder_letters: 'documents:auto-letters:reminder_letters',
  bank_approvals: 'documents:auto-letters:bank_approvals',
  mortgage_approvals: 'documents:auto-letters:mortgage_approvals',
  tax_notices: 'documents:auto-letters:tax_notices',
  company_registrar: 'documents:auto-letters:company_registrar',
  audit_completion: 'documents:auto-letters:audit_completion',
  tax_advances: 'documents:auto-letters:tax_advances',
  protocols: 'documents:auto-letters:protocols',
  tax_refund: 'documents:auto-letters:tax_refund',
  state_backed_loans: 'documents:auto-letters:state_backed_loans',
} as const;

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
  | 'tax_notices_controlling_shareholder_3t1'
  | 'tax_notices_capital_gains'
  // Yael Software Systems Approvals (אישורים לחברת יעל תכנה ומערכות) — standalone module, not in LETTER_TYPES_BY_CATEGORY
  | 'yael_cpa_national_insurance_approval'
  | 'yael_overhead_rate_compliance'           // נספח י - אישור עמידה בשיעור תקורה לנותני השירותים
  // Company Registrar (רשם החברות)
  | 'company_registrar_annual_fee'
  // Audit Completion (סיום ביקורת דוחות כספיים)
  | 'audit_completion_general'
  // Tax Advances (מקדמות מ"ה)
  | 'tax_advances_rate_notification'
  // Protocols (פרוטוקולים)
  | 'protocols_accountant_appointment'  // פרוטוקול מינוי רואה חשבון
  // Tax Refund (החזרי מס)
  | 'tax_refund_request'               // פנייה לפקיד שומה - החזר מס
  // State-Backed Loans (הלוואות בערבות מדינה)
  | 'state_backed_loans_directors_declaration'  // הצהרת מנהלים
  | 'state_backed_loans_accountants_opinion';   // חוות דעת רואה חשבון

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
      label: 'בקשת מסמכים לטובת פתיחת תיק במע״מ',
      description: 'הנחיות להעברת מסמכים לפתיחת תיק במע"מ',
      templateType: 'company_onboarding_vat_registration',
      icon: 'FileText',
    },
    {
      id: 'vat_file_opened',
      label: 'הודעה על פתיחת תיק מע״מ',
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
      label: 'הודעה על יתרת מס לתשלום - חברה',
      description: 'הודעה ללקוח על יתרת מס לאחר שידור דוחות כספיים',
      templateType: 'tax_notices_payment_notice',
      icon: 'FileText',
    },
    {
      id: 'controlling_shareholder_3t1',
      label: 'תשלום חוב מס בעל שליטה בגין 3(ט)(1)',
      description: 'הודעה לבעל שליטה על חבות מס דיבידנד בגין משיכות מהחברה',
      templateType: 'tax_notices_controlling_shareholder_3t1',
      icon: 'FileText',
    },
    {
      id: 'capital_gains',
      label: 'הודעה על מס רווח הון',
      description: 'הודעה ליחיד על מס רווח הון בגין מכירת מניות בחברה',
      templateType: 'tax_notices_capital_gains',
      icon: 'FileText',
    },
  ],
  company_registrar: [
    {
      id: 'annual_fee_notice',
      label: 'אגרה שנתית לרשם החברות',
      description: 'הודעה ללקוח על חובת תשלום אגרה שנתית לרשם החברות',
      templateType: 'company_registrar_annual_fee',
      icon: 'Building2',
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
      id: 'rate_notification',
      label: 'הודעה על שיעור מקדמה',
      description: 'הודעה ללקוח על שיעור מקדמת מס החברות שנקבע',
      templateType: 'tax_advances_rate_notification',
      icon: 'Percent',
    },
  ],
  protocols: [
    {
      id: 'accountant_appointment',
      label: 'פרוטוקול מינוי רואה חשבון',
      description: 'פרוטוקול מאסיפת בעלי מניות למינוי רואה חשבון חדש',
      templateType: 'protocols_accountant_appointment',
      icon: 'FileSignature',
    },
  ],
  tax_refund: [
    {
      id: 'request',
      label: 'פנייה לפקיד שומה - החזר מס',
      description: 'פנייה לפקיד שומה בבקשה להחזר מס - עם אפשרויות דחיפות וטקסט מחמיר',
      templateType: 'tax_refund_request',
      icon: 'FileText',
    },
  ],
  state_backed_loans: [
    {
      id: 'directors_declaration',
      label: 'הצהרת מנהלים',
      description: 'הצהרת מנהלים לצורך בקשת הלוואה מקרן ההלוואות לעסקים קטנים ובינוניים בערבות מדינה',
      templateType: 'state_backed_loans_directors_declaration',
      icon: 'FileSignature',
    },
    {
      id: 'accountants_opinion',
      label: 'חוות דעת רואה חשבון',
      description: 'דוח מיוחד של רואה החשבון לצורך בקשת הלוואה מקרן ההלוואות לעסקים קטנים ובינוניים בערבות מדינה',
      templateType: 'state_backed_loans_accountants_opinion',
      icon: 'FileCheck',
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
  type?: 'month' | 'year';  // סוג השורה - חודשית או שנתית. ברירת מחדל: 'month' (לתאימות אחורה)
  month?: string;           // חודש בעברית (ינואר, פברואר...) - חובה רק כש-type='month'
  year: number;             // שנה
  amount: number;           // סכום (לפני מע"מ)
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
  applicant_salary: number;         // שכר מבקש/ת המשכנתא
  estimated_profit: number;         // רווח חשבונאי משוער לפני מס
  ebitda_adjusted: number;          // EBITDA מתואם (בתוספת שכר בעל שליטה)

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

/** Meeting type options for rate notification */
export type MeetingType = 'רבעונית' | 'שלישונית' | 'חצי-שנתית';

/** Variables for Tax Advances - Rate Notification (הודעה על שיעור מקדמה) */
export interface TaxAdvancesRateNotificationVariables extends AutoLetterSharedData {
  subject: string;
  /** שנת המס */
  tax_year: number;
  /** שיעור המקדמה שנקבע באחוזים */
  advance_rate: number;
  /** סוג פגישה (רבעונית/שלישונית/חצי-שנתית) */
  meeting_type: MeetingType;
  /** האם החלטנו על שיעור שונה */
  rate_is_different: boolean;
  /** שיעור המקדמה שהחלטנו (כשהטוגל דולק) */
  decided_rate?: number;
}

// ============================================================================
// PROTOCOLS VARIABLES (פרוטוקולים)
// ============================================================================

/** Single attendee entry for protocol */
export interface AttendeeEntry {
  /** שם הנוכח */
  name: string;
  /** האם יו"ר */
  is_chairman: boolean;
}

/** Variables for Protocols - Accountant Appointment (פרוטוקול מינוי רואה חשבון) */
export interface AccountantAppointmentVariables extends AutoLetterSharedData {
  /** תאריך האסיפה */
  meeting_date: string;
  /** שם היו"ר */
  chairman_name: string;
  /** רשימת הנוכחים (כולל היו"ר) */
  attendees: AttendeeEntry[];
  /** שם משרד רואי החשבון הקודם */
  previous_firm: string;
  /** שם משרד רואי החשבון החדש (קבוע: "פרנקו ושות' - רואי חשבון") */
  new_firm: string;
}

// ============================================================================
// TAX REFUND VARIABLES (החזרי מס)
// ============================================================================

/** Variables for Tax Refund letter */
export interface TaxRefundVariables extends AutoLetterSharedData {
  /** שנת המס */
  tax_year: number;
  /** סכום ההחזר */
  refund_amount: number;
  /** תאריך הגשת הדוח (YYYY-MM-DD) */
  filing_date: string;
  /** שם פקיד השומה / משרד השומה */
  tax_office_name: string;
  /** כתובת משרד השומה */
  tax_office_address: string;
  /** כמות ימים שחלפו מאז הגשת הדוח */
  days_since_filing: number;
  /** הצגת באנר "הודעה דחופה" */
  is_urgent: boolean;
  /** טקסט מחמיר - מוסיף "ולמרות פניות חוזרות..." + "נבקשכם בתוקף" */
  show_strong_text: boolean;
}

// ============================================================================
// STATE-BACKED LOANS VARIABLES (הלוואות בערבות מדינה)
// ============================================================================

/** Yearly figures for 3 consecutive years used in state-backed loan tables */
export interface YearlyFigures {
  y1: number;
  y2: number;
  y3: number;
}

/** Variables for State-Backed Loans - Directors' Declaration (הצהרת מנהלים) */
export interface DirectorsDeclarationVariables extends AutoLetterSharedData {
  /** שנה פיסקלית: "נכון ליום 31 בדצמבר ____" */
  fiscal_year: number;
  /** תאריך סף לחוב מס: "שמועד היווצרותו היה לפני יום ___" (YYYY-MM-DD) */
  tax_debt_cutoff_date: string;
  /** השנה המופיעה בעמודה הראשונה של הטבלאות (למשל 2023) */
  financial_table_year_1: number;
  /** השנה המופיעה בעמודה השנייה (למשל 2024) */
  financial_table_year_2: number;
  /** השנה המופיעה בעמודה השלישית (למשל 2025) */
  financial_table_year_3: number;
  /** טבלה 1, שורה 1: עלות שכר בעלים */
  owners_salary_cost: YearlyFigures;
  /** טבלה 1, שורה 2: עלות שכר בעלי עניין */
  related_parties_salary_cost: YearlyFigures;
  /** טבלה 1, שורה 3: יתרת חו"ז בעלים */
  owners_current_account_balance: YearlyFigures;
  /** טבלה 1, שורה 4: יתרת חו"ז צדדים קשורים */
  related_parties_current_account_balance: YearlyFigures;
  /** טבלה 2, שורה 1: שכר מנהל */
  manager_salary: YearlyFigures;
  /** טבלה 2, שורה 2: שכר בני משפחה */
  family_members_salary: YearlyFigures;
  /** טבלה 2, שורה 3: הטבות אחרות (דיבידנד/דמי ניהול/אחר) */
  other_benefits: YearlyFigures;
  /** שם המנהל האחראי לענייני כספים ותוארו */
  financial_responsible_manager_name: string;
  /** שם המנהל בפועל ותוארו */
  acting_manager_name: string;
}

/** Variables for State-Backed Loans - Accountant's Opinion (חוות דעת רואה חשבון) */
export interface AccountantsOpinionVariables extends AutoLetterSharedData {
  /** תאריך הצהרת המנהלים המצורפת (YYYY-MM-DD) */
  declaration_date: string;
  /** תאריך החתימה של חוות הדעת (YYYY-MM-DD) */
  signature_date: string;
  /** שם העיר (לצד חתימת רואה החשבון) */
  city_name: string;
  /** שם רואה החשבון */
  accountant_name: string;
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
  tax_payment_notice: 'יתרת מס לתשלום בגין שנת המס',
  controlling_shareholder_3t1: 'תשלום חוב מס בעל שליטה בגין סעיף 3(ט)(1)',
  capital_gains: 'הודעה על מס רווח הון',
  annual_fee_notice: 'חיוב אגרה שנתית לרשם החברות',
  // Audit Completion (סיום ביקורת דוחות כספיים)
  audit_completion_general: 'סיום ביקורת ועריכת דוח כספי',
  // Tax Advances (מקדמות מ"ה)
  tax_advances_rate_notification: 'הודעה על שיעור מקדמות מס',
  // Protocols (פרוטוקולים)
  protocols_accountant_appointment: 'פרוטוקול מאסיפת בעלי המניות',
  // Tax Refund (החזרי מס)
  tax_refund_request: 'בקשה להחזר מס',
  // State-Backed Loans (הלוואות בערבות מדינה)
  state_backed_loans_directors_declaration: 'הצהרת מנהלים לצורך בקשת הלוואה מקרן ההלוואות לעסקים קטנים ובינוניים בערבות מדינה',
  state_backed_loans_accountants_opinion: 'חוות דעת רואה חשבון בדבר הנתונים הכספיים הכלולים בהצהרת הנהלת החברה',
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
  controllingShareholder3T1: Partial<ControllingShareholder3T1Variables>;
  capitalGains: Partial<CapitalGainsVariables>;
}

/** Document data for Company Registrar letters */
export interface CompanyRegistrarDocumentData {
  annualFeeNotice: Partial<AnnualFeeNoticeVariables>;
}

/** Document data for Audit Completion letters */
export interface AuditCompletionDocumentData {
  general: Partial<AuditCompletionVariables>;
}

/** Document data for Tax Advances letters */
export interface TaxAdvancesDocumentData {
  rateNotification: Partial<TaxAdvancesRateNotificationVariables>;
}

/** Document data for Protocols letters */
export interface ProtocolsDocumentData {
  accountantAppointment: Partial<AccountantAppointmentVariables>;
}

/** Document data for Reminder Letters */
export interface ReminderLettersDocumentData {
  personalReportReminder: Partial<PersonalReportReminderVariables>;
  bookkeeperBalanceReminder: Partial<BookkeeperBalanceReminderVariables>;
}

/** Document data for Tax Refund letters */
export interface TaxRefundDocumentData {
  request: Partial<TaxRefundVariables>;
}

/** Document data for State-Backed Loans letters */
export interface StateBackedLoansDocumentData {
  directorsDeclaration: Partial<DirectorsDeclarationVariables>;
  accountantsOpinion: Partial<AccountantsOpinionVariables>;
}

/** Adhoc contact (not saved in system) */
export interface AdhocContact {
  name: string;
  email: string;
  company_id?: string;  // For mortgage approvals - allows entering tax ID manually
  hide_recipient_header?: boolean;  // For mortgage approvals - hide "לכבוד" when recipient is also the applicant
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
    company_registrar: CompanyRegistrarDocumentData;
    audit_completion: AuditCompletionDocumentData;
    tax_advances: TaxAdvancesDocumentData;
    protocols: ProtocolsDocumentData;
    tax_refund: TaxRefundDocumentData;
    state_backed_loans: StateBackedLoansDocumentData;
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
          applicant_salary: 0,
          estimated_profit: 0,
          ebitda_adjusted: 0,
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
        controllingShareholder3T1: {
          gender: 'male',
          greeting_name: '',
          tax_year: String(new Date().getFullYear() - 1),
          tax_amount: undefined,
          tax_payment_link: '',
        },
        capitalGains: {
          gender: 'male',
          greeting_name: '',
          sold_company_name: '',
          sale_amount: undefined,
          tax_amount: undefined,
        },
      },
      company_registrar: {
        annualFeeNotice: {
          fee_year: 2026,
          fee_amount: 1338,
          discount_deadline: '31/03/2026',
        },
      },
      audit_completion: {
        general: {
          audit_year: new Date().getFullYear() - 1,
          completion_date: '',
        },
      },
      tax_advances: {
        rateNotification: {
          subject: DEFAULT_SUBJECTS.tax_advances_rate_notification,
          tax_year: new Date().getFullYear(),
          advance_rate: undefined,
          meeting_type: 'רבעונית',
          rate_is_different: false,
        },
      },
      protocols: {
        accountantAppointment: {
          meeting_date: '',
          chairman_name: '',
          attendees: [{ name: '', is_chairman: true }],
          previous_firm: '',
          new_firm: "פרנקו ושות' - רואי חשבון",
        },
      },
      tax_refund: {
        request: {
          tax_year: new Date().getFullYear() - 1,
          refund_amount: undefined,
          filing_date: '',
          tax_office_name: '',
          tax_office_address: '',
          days_since_filing: 30,
          is_urgent: false,
          show_strong_text: false,
        },
      },
      state_backed_loans: {
        directorsDeclaration: {
          fiscal_year: new Date().getFullYear() - 1,
          tax_debt_cutoff_date: '',
          financial_table_year_1: new Date().getFullYear() - 2,
          financial_table_year_2: new Date().getFullYear() - 1,
          financial_table_year_3: new Date().getFullYear(),
          owners_salary_cost: { y1: 0, y2: 0, y3: 0 },
          related_parties_salary_cost: { y1: 0, y2: 0, y3: 0 },
          owners_current_account_balance: { y1: 0, y2: 0, y3: 0 },
          related_parties_current_account_balance: { y1: 0, y2: 0, y3: 0 },
          manager_salary: { y1: 0, y2: 0, y3: 0 },
          family_members_salary: { y1: 0, y2: 0, y3: 0 },
          other_benefits: { y1: 0, y2: 0, y3: 0 },
          financial_responsible_manager_name: '',
          acting_manager_name: '',
        },
        accountantsOpinion: {
          declaration_date: '',
          signature_date: '',
          city_name: '',
          accountant_name: '',
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
export const TAX_PAYMENT_NOTICE_DEFAULT_SUBJECT = 'יתרת מס לתשלום בגין שנת המס';

/** Variables for Controlling Shareholder 3(ט)(1) Tax Debt letter (תשלום חוב מס בעל שליטה) */
export interface ControllingShareholder3T1Variables extends AutoLetterSharedData {
  /** מין הנמען (זכר/נקבה) - משפיע על ניסוח גוף המכתב */
  gender: 'male' | 'female';
  /** שם פרטי לפנייה אישית */
  greeting_name: string;
  /** שנת המס */
  tax_year: string;
  /** סכום חבות המס לתשלום */
  tax_amount?: number;
  /** קישור לתשלום באזור האישי של רשות המסים (אופציונלי) */
  tax_payment_link?: string;
}

/** Default subject for Controlling Shareholder 3(ט)(1) letter */
export const CONTROLLING_SHAREHOLDER_3T1_DEFAULT_SUBJECT = 'תשלום חוב מס בעל שליטה בגין סעיף 3(ט)(1)';

/** Variables for Capital Gains Tax Notice letter (הודעה על מס רווח הון) */
export interface CapitalGainsVariables extends AutoLetterSharedData {
  /** מין הנמען (זכר/נקבה) - משפיע על ניסוח גוף המכתב */
  gender: 'male' | 'female';
  /** שם פרטי לפנייה אישית */
  greeting_name: string;
  /** שם החברה שמניותיה נמכרו */
  sold_company_name: string;
  /** סכום עסקת המכירה */
  sale_amount?: number;
  /** סכום מס רווח ההון לתשלום */
  tax_amount?: number;
}

/** Default subject for Capital Gains Tax Notice */
export const CAPITAL_GAINS_DEFAULT_SUBJECT = 'הודעה על מס רווח הון';

/** Variables for Annual Fee Notice letter (אגרה שנתית לרשם החברות) */
export interface AnnualFeeNoticeVariables extends AutoLetterSharedData {
  /** שנת האגרה */
  fee_year: number;
  /** סכום האגרה */
  fee_amount: number;
  /** תאריך אחרון להנחה (פורמט DD/MM/YYYY) */
  discount_deadline: string;
}

/** Default subject for Annual Fee Notice */
export const ANNUAL_FEE_NOTICE_DEFAULT_SUBJECT = 'חיוב אגרה שנתית לרשם החברות';

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

/** Validate Controlling Shareholder 3(ט)(1) letter */
export function validateControllingShareholder3T1(data: Partial<ControllingShareholder3T1Variables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    (data.gender === 'male' || data.gender === 'female') &&
    data.greeting_name?.trim() &&
    data.tax_year?.trim() &&
    data.tax_amount !== undefined &&
    data.tax_amount > 0
  );
}

/** Validate Capital Gains Tax Notice letter */
export function validateCapitalGains(data: Partial<CapitalGainsVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    (data.gender === 'male' || data.gender === 'female') &&
    data.greeting_name?.trim() &&
    data.sold_company_name?.trim() &&
    data.sale_amount !== undefined &&
    data.sale_amount > 0 &&
    data.tax_amount !== undefined &&
    data.tax_amount > 0
  );
}

/** Validate Annual Fee Notice letter */
export function validateAnnualFeeNotice(data: Partial<AnnualFeeNoticeVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.fee_year && data.fee_year > 2000 &&
    data.fee_amount !== undefined &&
    data.fee_amount > 0 &&
    data.discount_deadline?.trim()
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
    data.ebitda_adjusted !== undefined &&
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

/** Validate Tax Advances - Rate Notification letter */
export function validateTaxAdvancesRateNotification(data: Partial<TaxAdvancesRateNotificationVariables>): boolean {
  const baseValid = !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.tax_year && data.tax_year > 2000 &&
    data.advance_rate !== undefined &&
    data.advance_rate > 0 &&
    data.advance_rate <= 100 &&
    data.meeting_type
  );

  if (!baseValid) return false;

  // When rate_is_different is true, decided_rate is required
  if (data.rate_is_different) {
    return !!(
      data.decided_rate !== undefined &&
      data.decided_rate > 0 &&
      data.decided_rate <= 100
    );
  }

  return true;
}

// ============================================================================
// PROTOCOLS VALIDATION
// ============================================================================

/** Validate Protocol - Accountant Appointment (פרוטוקול מינוי רואה חשבון) */
export function validateAccountantAppointment(data: Partial<AccountantAppointmentVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    data.meeting_date &&
    data.chairman_name?.trim() &&
    data.attendees &&
    data.attendees.length > 0 &&
    data.attendees.every(a => a.name?.trim()) &&
    data.previous_firm?.trim()
  );
}

// ============================================================================
// TAX REFUND VALIDATION
// ============================================================================

/** Validate Tax Refund letter */
export function validateTaxRefund(data: Partial<TaxRefundVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.tax_year && data.tax_year > 2000 &&
    data.refund_amount !== undefined &&
    data.refund_amount > 0 &&
    data.filing_date &&
    data.tax_office_name?.trim() &&
    data.tax_office_address?.trim() &&
    data.days_since_filing !== undefined &&
    data.days_since_filing > 0
  );
}

// ============================================================================
// STATE-BACKED LOANS VALIDATION
// ============================================================================

const isValidYear = (year: number | undefined): year is number =>
  typeof year === 'number' && year >= 2000 && year <= 2100;

const isValidYearlyFigures = (fig: YearlyFigures | undefined): fig is YearlyFigures =>
  !!fig &&
  typeof fig.y1 === 'number' && Number.isFinite(fig.y1) &&
  typeof fig.y2 === 'number' && Number.isFinite(fig.y2) &&
  typeof fig.y3 === 'number' && Number.isFinite(fig.y3);

/** Validate State-Backed Loans - Directors' Declaration */
export function validateDirectorsDeclaration(data: Partial<DirectorsDeclarationVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    isValidYear(data.fiscal_year) &&
    data.tax_debt_cutoff_date &&
    isValidYear(data.financial_table_year_1) &&
    isValidYear(data.financial_table_year_2) &&
    isValidYear(data.financial_table_year_3) &&
    isValidYearlyFigures(data.owners_salary_cost) &&
    isValidYearlyFigures(data.related_parties_salary_cost) &&
    isValidYearlyFigures(data.owners_current_account_balance) &&
    isValidYearlyFigures(data.related_parties_current_account_balance) &&
    isValidYearlyFigures(data.manager_salary) &&
    isValidYearlyFigures(data.family_members_salary) &&
    isValidYearlyFigures(data.other_benefits) &&
    data.financial_responsible_manager_name?.trim() &&
    data.acting_manager_name?.trim()
  );
}

/** Validate State-Backed Loans - Accountant's Opinion */
export function validateAccountantsOpinion(data: Partial<AccountantsOpinionVariables>): boolean {
  return !!(
    data.document_date &&
    data.company_name?.trim() &&
    data.company_id?.trim() &&
    data.declaration_date &&
    data.signature_date &&
    data.city_name?.trim() &&
    data.accountant_name?.trim()
  );
}
