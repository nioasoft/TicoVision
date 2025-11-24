/**
 * Foreign Workers Approval Documents - TypeScript Types
 *
 * This file contains all type definitions for the 5 foreign workers documents:
 * 1. Accountant Turnover Report (דוח מחזורים רו"ח)
 * 2. Israeli Workers Report (דוח עובדים ישראליים)
 * 3. Living Business 2025 (עסק חי 2025)
 * 4. Turnover/Costs Approval (אישור מחזור/עלויות)
 * 5. Salary Report (דוח שכר)
 */

// ============================================================================
// SHARED DATA (common to all 5 documents)
// ============================================================================

export interface ForeignWorkerSharedData {
  /** Client/company name (e.g., "חברת XYZ בע"מ") */
  company_name: string;

  /** 9-digit Israeli tax ID */
  tax_id: string;

  /** Document generation date in YYYY-MM-DD format */
  document_date: string;
}

// ============================================================================
// DOCUMENT #1: Accountant Turnover Report (דוח מחזורים רו"ח)
// ============================================================================

export interface MonthlyTurnover {
  /** Month name in Hebrew (e.g., "ינואר 2024") */
  month: string;

  /** Turnover amount for this month in ILS */
  amount: number;
}

export interface AccountantTurnoverVariables extends ForeignWorkerSharedData {
  /** Array of 12 monthly turnover entries (one per month) */
  monthly_turnover: MonthlyTurnover[];
}

// ============================================================================
// DOCUMENT #2: Israeli Workers Report (דוח עובדים ישראליים)
// ============================================================================

export interface MonthlyWorkers {
  /** Month name in Hebrew (e.g., "ינואר 2024") */
  month: string;

  /** Number of Israeli employees in this month */
  employee_count: number;
}

export interface IsraeliWorkersVariables extends ForeignWorkerSharedData {
  /** Array of 12 monthly worker counts (one per month) */
  israeli_workers: MonthlyWorkers[];

  /** Calculated average number of workers across all 12 months */
  average_workers: number;
}

// ============================================================================
// DOCUMENT #3: Living Business 2025 (עסק חי 2025)
// ============================================================================

export interface LivingBusinessVariables extends ForeignWorkerSharedData {
  /** Number of foreign expert workers the company will employ */
  foreign_experts_count: number;
}

// ============================================================================
// DOCUMENT #4: Turnover/Costs Approval (אישור מחזור/עלויות)
// ============================================================================

export type TurnoverApprovalScenario = '12_plus' | '4_to_11' | 'up_to_3';

/** Scenario A: Company operating 12+ months */
export interface Scenario12Plus {
  /** Start date of 12-month period */
  period_start: string;

  /** End date of 12-month period */
  period_end: string;

  /** Total turnover for the 12-month period */
  total_turnover: number;

  /** Total costs for the 12-month period */
  total_costs: number;
}

/** Scenario B: Company operating 4-11 months */
export interface Scenario4To11 {
  /** Start date of operation period */
  period_start: string;

  /** End date of operation period */
  period_end: string;

  /** Number of months operated (4-11) */
  months_count: number;

  /** Total turnover during this period */
  total_turnover: number;

  /** Total costs during this period */
  total_costs: number;

  /** Projected annual turnover (extrapolated to 12 months) */
  projected_annual_turnover: number;

  /** Projected annual costs (extrapolated to 12 months) */
  projected_annual_costs: number;
}

/** Scenario C: Company operating ≤3 months */
export interface ScenarioUpTo3 {
  /** Estimated annual turnover based on business plan */
  estimated_annual_turnover: number;

  /** Estimated annual costs based on business plan */
  estimated_annual_costs: number;

  /** Source/basis for estimates (e.g., "תוכנית עסקית מאושרת") */
  estimate_basis: string;
}

export interface TurnoverApprovalVariables extends ForeignWorkerSharedData {
  /** Which scenario applies to this company */
  scenario: TurnoverApprovalScenario;

  /** Data for 12+ months scenario (if applicable) */
  scenario_12_plus?: Scenario12Plus;

  /** Data for 4-11 months scenario (if applicable) */
  scenario_4_to_11?: Scenario4To11;

  /** Data for ≤3 months scenario (if applicable) */
  scenario_up_to_3?: ScenarioUpTo3;
}

// ============================================================================
// DOCUMENT #5: Salary Report (דוח שכר)
// ============================================================================

export interface WorkerData {
  /** Worker's full name */
  full_name: string;

  /** Passport number */
  passport_number: string;

  /** Month of employment (e.g., "01/2024") */
  month: string;

  /** Worker's nationality */
  nationality: string;

  /** Monthly salary in ILS */
  salary: number;
}

export interface SalaryReportVariables extends ForeignWorkerSharedData {
  /** Start of reporting period (YYYY-MM-DD) */
  period_start: string;

  /** End of reporting period (YYYY-MM-DD) */
  period_end: string;

  /** Array of worker salary data for all workers in the period */
  workers_data: WorkerData[];
}

// ============================================================================
// TEMPLATE TYPE DEFINITIONS (for generated_letters table)
// ============================================================================

export type ForeignWorkerTemplateType =
  | 'foreign_worker_accountant_turnover'   // Document #1
  | 'foreign_worker_israeli_workers'       // Document #2
  | 'foreign_worker_living_business'       // Document #3
  | 'foreign_worker_turnover_approval'     // Document #4
  | 'foreign_worker_salary_report';        // Document #5

/** Union type of all possible foreign worker document variables */
export type ForeignWorkerVariables =
  | AccountantTurnoverVariables
  | IsraeliWorkersVariables
  | LivingBusinessVariables
  | TurnoverApprovalVariables
  | SalaryReportVariables;

// ============================================================================
// UI FORM STATE (for managing tabs and form data)
// ============================================================================

export interface ForeignWorkerFormState {
  /** Currently selected client ID */
  selectedClientId: string | null;

  /** Currently active tab (0-4 for 5 documents) */
  activeTab: number;

  /** Shared data filled in top form */
  sharedData: Partial<ForeignWorkerSharedData>;

  /** Document-specific data for each tab */
  documentData: {
    accountantTurnover: Partial<AccountantTurnoverVariables>;
    israeliWorkers: Partial<IsraeliWorkersVariables>;
    livingBusiness: Partial<LivingBusinessVariables>;
    turnoverApproval: Partial<TurnoverApprovalVariables>;
    salaryReport: Partial<SalaryReportVariables>;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/** Tab configuration for the 5 documents */
export interface ForeignWorkerTab {
  /** Tab index (0-4) */
  index: number;

  /** Tab label in Hebrew */
  label: string;

  /** Tab description */
  description: string;

  /** Associated template type */
  templateType: ForeignWorkerTemplateType;
}

/** Configuration for all 5 tabs */
export const FOREIGN_WORKER_TABS: ForeignWorkerTab[] = [
  {
    index: 0,
    label: 'דוח מחזורים רו"ח',
    description: 'דוח מחזורים חודשי - 12 חודשים',
    templateType: 'foreign_worker_accountant_turnover',
  },
  {
    index: 1,
    label: 'דוח עובדים ישראליים',
    description: 'מספר עובדים ישראליים לפי חודשים',
    templateType: 'foreign_worker_israeli_workers',
  },
  {
    index: 2,
    label: 'עסק חי 2025',
    description: 'אישור עסק חי למשרד הפנים',
    templateType: 'foreign_worker_living_business',
  },
  {
    index: 3,
    label: 'אישור מחזור/עלויות',
    description: 'אישור מחזור ועלויות - 3 תרחישים',
    templateType: 'foreign_worker_turnover_approval',
  },
  {
    index: 4,
    label: 'דוח שכר',
    description: 'טבלת דוח שכר - 12 חודשי עבודה',
    templateType: 'foreign_worker_salary_report',
  },
];

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/** Validate shared data is complete */
export function validateSharedData(data: Partial<ForeignWorkerSharedData>): data is ForeignWorkerSharedData {
  return !!(
    data.company_name &&
    data.tax_id &&
    data.document_date
  );
}

/** Validate accountant turnover document data */
export function validateAccountantTurnover(data: Partial<AccountantTurnoverVariables>): data is AccountantTurnoverVariables {
  return (
    validateSharedData(data) &&
    !!data.company_type &&
    Array.isArray(data.monthly_turnover) &&
    data.monthly_turnover.length === 12
  );
}

/** Validate Israeli workers document data */
export function validateIsraeliWorkers(data: Partial<IsraeliWorkersVariables>): data is IsraeliWorkersVariables {
  return (
    validateSharedData(data) &&
    Array.isArray(data.israeli_workers) &&
    data.israeli_workers.length === 12 &&
    typeof data.average_workers === 'number'
  );
}

/** Validate living business document data */
export function validateLivingBusiness(data: Partial<LivingBusinessVariables>): data is LivingBusinessVariables {
  return (
    validateSharedData(data) &&
    typeof data.foreign_experts_count === 'number' &&
    data.foreign_experts_count > 0
  );
}

/** Validate turnover approval document data */
export function validateTurnoverApproval(data: Partial<TurnoverApprovalVariables>): data is TurnoverApprovalVariables {
  if (!validateSharedData(data) || !data.scenario) return false;

  switch (data.scenario) {
    case '12_plus':
      return !!data.scenario_12_plus;
    case '4_to_11':
      return !!data.scenario_4_to_11;
    case 'up_to_3':
      return !!data.scenario_up_to_3;
    default:
      return false;
  }
}

/** Validate salary report document data */
export function validateSalaryReport(data: Partial<SalaryReportVariables>): data is SalaryReportVariables {
  return (
    validateSharedData(data) &&
    !!data.period_start &&
    !!data.period_end &&
    Array.isArray(data.workers_data) &&
    data.workers_data.length > 0
  );
}
