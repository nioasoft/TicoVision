/**
 * Tzlul Approvals Documents - TypeScript Types
 *
 * This file contains all type definitions for the 5 Tzlul company approval documents:
 * 1. Violation Correction Letter (מכתב תיקון הפרות)
 * 2. Summer Bonus Opinion (חוות דעת מענק קיץ)
 * 3. Excellence Bonus Opinion (חוות דעת מענק מצויינות)
 * 4. Employee Payments Approval (אישור תשלומים לעובדים)
 * 5. Transferred Amounts Approval (אישור העברת סכומים)
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Tzlul client company name - used to find client ID */
export const TZLUL_CLIENT_NAME = 'צלול ניקיון ואחזקה בע"מ';

/** Tzlul company tax ID */
export const TZLUL_TAX_ID = '514327642';

// ============================================================================
// SHARED DATA (common to all 5 documents)
// ============================================================================

export interface TzlulSharedData {
  /** Document generation date in YYYY-MM-DD format */
  document_date: string;
}

// ============================================================================
// DOCUMENT #1: Violation Correction Letter (מכתב תיקון הפרות)
// ============================================================================

export interface ViolationCorrectionVariables extends TzlulSharedData {
  /** Array of recipient address lines (dynamic - can add more) */
  recipient_lines: string[];

  /** Date when violations occurred (DD/MM/YYYY format for display) */
  violations_date: string;
}

// ============================================================================
// DOCUMENT #2: Summer Bonus Opinion (חוות דעת מענק קיץ)
// ============================================================================

export interface SummerBonusVariables extends TzlulSharedData {
  /** Month/Year format e.g., "6/2025" */
  month_year: string;

  /** Location name e.g., "רשות שדות התעופה – גשר אלנבי" */
  location: string;

  /** Contract number e.g., "2022/070/0002/00" */
  contract_number: string;

  /** Total amount in ILS */
  total_amount: number;

  /** Array of invoice numbers e.g., ["41190", "41191"] */
  invoice_numbers: string[];
}

// ============================================================================
// DOCUMENT #3: Excellence Bonus Opinion (חוות דעת מענק מצויינות)
// ============================================================================

export interface ExcellenceBonusVariables extends TzlulSharedData {
  /** Statement date in DD/MM/YYYY format e.g., "5/05/2025" */
  statement_date: string;
}

// ============================================================================
// DOCUMENT #4: Employee Payments Approval (אישור תשלומים לעובדים)
// ============================================================================

export interface EmployeePaymentRow {
  /** Employee full name */
  name: string;

  /** Israeli ID number (ת.ז.) */
  id_number: string;

  /** Payment month in Hebrew e.g., "ספט-25" */
  month: string;

  /** Payment amount in ILS */
  amount: number;

  /** Payment date in DD/MM/YY format e.g., "09/10/25" */
  payment_date: string;
}

export interface EmployeePaymentsVariables extends TzlulSharedData {
  /** Recipient address lines */
  recipient_lines: string[];

  /** Tender number e.g., "שנ/20/2023" */
  tender_number: string;

  /** Municipality/Authority name e.g., "עיריית אשקלון" */
  municipality_name: string;

  /** Period start in MM/YY format e.g., "09/25" */
  period_start: string;

  /** Period end in MM/YY format e.g., "09/25" */
  period_end: string;

  /** Array of employee payment rows */
  employees_table: EmployeePaymentRow[];
}

// ============================================================================
// DOCUMENT #5: Transferred Amounts Approval (אישור העברת סכומים)
// ============================================================================

export interface TransferredAmountsVariables extends TzlulSharedData {
  /** Period start in DD/MM/YY format e.g., "01/01/24" */
  period_start: string;

  /** Period end in DD/MM/YY format e.g., "31/08/25" */
  period_end: string;

  /** As of date in DD/MM/YY format e.g., "22/09/25" */
  as_of_date: string;
}

// ============================================================================
// TEMPLATE TYPE DEFINITIONS (for generated_letters table)
// ============================================================================

export type TzlulTemplateType =
  | 'tzlul_violation_correction'    // Document #1
  | 'tzlul_summer_bonus'            // Document #2
  | 'tzlul_excellence_bonus'        // Document #3
  | 'tzlul_employee_payments'       // Document #4
  | 'tzlul_transferred_amounts';    // Document #5

/** Union type of all possible Tzlul document variables */
export type TzlulVariables =
  | ViolationCorrectionVariables
  | SummerBonusVariables
  | ExcellenceBonusVariables
  | EmployeePaymentsVariables
  | TransferredAmountsVariables;

// ============================================================================
// UI FORM STATE (for managing form data)
// ============================================================================

export interface TzlulFormState {
  /** Currently selected letter type index (0-4) */
  selectedLetterType: number;

  /** Shared data (document date) */
  sharedData: Partial<TzlulSharedData>;

  /** Document-specific data for each letter type */
  documentData: {
    violationCorrection: Partial<ViolationCorrectionVariables>;
    summerBonus: Partial<SummerBonusVariables>;
    excellenceBonus: Partial<ExcellenceBonusVariables>;
    employeePayments: Partial<EmployeePaymentsVariables>;
    transferredAmounts: Partial<TransferredAmountsVariables>;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Letter type configuration for the 5 documents */
export interface TzlulLetterType {
  /** Letter type index (0-4) */
  index: number;

  /** Letter label in Hebrew */
  label: string;

  /** Letter description */
  description: string;

  /** Associated template type */
  templateType: TzlulTemplateType;
}

/** Configuration for all 5 letter types */
export const TZLUL_LETTER_TYPES: TzlulLetterType[] = [
  {
    index: 0,
    label: 'מכתב תיקון הפרות',
    description: 'חוות דעת רואה חשבון בהתייחס לתיקון הפרות',
    templateType: 'tzlul_violation_correction',
  },
  {
    index: 1,
    label: 'חוות דעת מענק קיץ',
    description: 'חוות דעת רו"ח לעניין תשלומי מענק קיץ',
    templateType: 'tzlul_summer_bonus',
  },
  {
    index: 2,
    label: 'חוות דעת מענק מצויינות',
    description: 'חוות דעת רו"ח בדבר מענק מצויינות',
    templateType: 'tzlul_excellence_bonus',
  },
  {
    index: 3,
    label: 'אישור תשלומים לעובדים',
    description: 'אישור רו"ח בדבר תשלום השכר לעובדים',
    templateType: 'tzlul_employee_payments',
  },
  {
    index: 4,
    label: 'אישור העברת סכומים',
    description: 'אישור רו"ח בדבר העברת סכומים שנוכו',
    templateType: 'tzlul_transferred_amounts',
  },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/** Validate shared data is complete */
export function validateTzlulSharedData(data: Partial<TzlulSharedData>): data is TzlulSharedData {
  return !!data.document_date;
}

/** Validate violation correction document data */
export function validateViolationCorrection(data: Partial<ViolationCorrectionVariables>): data is ViolationCorrectionVariables {
  return (
    validateTzlulSharedData(data) &&
    Array.isArray(data.recipient_lines) &&
    data.recipient_lines.length > 0 &&
    !!data.violations_date
  );
}

/** Validate summer bonus document data */
export function validateSummerBonus(data: Partial<SummerBonusVariables>): data is SummerBonusVariables {
  return (
    validateTzlulSharedData(data) &&
    !!data.month_year &&
    !!data.location &&
    !!data.contract_number &&
    typeof data.total_amount === 'number' &&
    data.total_amount > 0 &&
    Array.isArray(data.invoice_numbers) &&
    data.invoice_numbers.length > 0
  );
}

/** Validate excellence bonus document data */
export function validateExcellenceBonus(data: Partial<ExcellenceBonusVariables>): data is ExcellenceBonusVariables {
  return (
    validateTzlulSharedData(data) &&
    !!data.statement_date
  );
}

/** Validate employee payments document data */
export function validateEmployeePayments(data: Partial<EmployeePaymentsVariables>): data is EmployeePaymentsVariables {
  return (
    validateTzlulSharedData(data) &&
    Array.isArray(data.recipient_lines) &&
    data.recipient_lines.length > 0 &&
    !!data.tender_number &&
    !!data.municipality_name &&
    !!data.period_start &&
    !!data.period_end &&
    Array.isArray(data.employees_table) &&
    data.employees_table.length > 0
  );
}

/** Validate transferred amounts document data */
export function validateTransferredAmounts(data: Partial<TransferredAmountsVariables>): data is TransferredAmountsVariables {
  return (
    validateTzlulSharedData(data) &&
    !!data.period_start &&
    !!data.period_end &&
    !!data.as_of_date
  );
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

/** Create initial form state with empty values */
export function createInitialTzlulFormState(): TzlulFormState {
  return {
    selectedLetterType: 0,
    sharedData: {
      document_date: new Date().toISOString().split('T')[0],
    },
    documentData: {
      violationCorrection: {
        recipient_lines: [''],
        violations_date: '',
      },
      summerBonus: {
        month_year: '',
        location: '',
        contract_number: '',
        total_amount: 0,
        invoice_numbers: [''],
      },
      excellenceBonus: {
        statement_date: '',
      },
      employeePayments: {
        recipient_lines: ['החברה למשק וכלכלה של השלטון המקומי בע"מ', 'היחידה לאכיפת זכויות עובדים'],
        tender_number: '',
        municipality_name: '',
        period_start: '',
        period_end: '',
        employees_table: [],
      },
      transferredAmounts: {
        period_start: '',
        period_end: '',
        as_of_date: '',
      },
    },
  };
}
