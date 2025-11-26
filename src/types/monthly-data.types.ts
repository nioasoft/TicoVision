/**
 * Monthly Data Types for Foreign Workers Rolling 14-Month Window
 * Used by:
 * - Tab 1: Accountant Turnover (client_monthly_reports with type 'accountant_turnover')
 * - Tab 2: Israeli Workers (client_monthly_reports with type 'israeli_workers')
 * - Tab 5: Salary Report (foreign_worker_monthly_data - per worker per month)
 */

// ==============================================
// DATABASE TYPES
// ==============================================

/** Report type discriminator for client_monthly_reports table */
export type ClientReportType = 'accountant_turnover' | 'israeli_workers';

/** Month range record from client_month_range table */
export interface ClientMonthRange {
  id: string;
  tenant_id: string;
  client_id: string;
  start_month: string; // ISO date string (YYYY-MM-DD)
  end_month: string;   // ISO date string (YYYY-MM-DD)
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/** Monthly report record from client_monthly_reports table */
export interface ClientMonthlyReport {
  id: string;
  tenant_id: string;
  client_id: string;
  report_type: ClientReportType;
  month_date: string;           // ISO date string (YYYY-MM-DD, first day of month)
  turnover_amount?: number;     // For accountant_turnover type (ILS)
  employee_count?: number;      // For israeli_workers type
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/** Worker monthly data record from foreign_worker_monthly_data table */
export interface ForeignWorkerMonthlyData {
  id: string;
  tenant_id: string;
  client_id: string;
  worker_id: string;
  month_date: string;           // ISO date string (YYYY-MM-DD, first day of month)
  salary: number;               // Base salary in ILS
  supplement: number;           // Supplement/bonus in ILS
  created_at: string;
  updated_at: string;
  created_by?: string;
}

/** Extended worker monthly data with worker details (from RPC function) */
export interface WorkerMonthlyDataWithDetails extends ForeignWorkerMonthlyData {
  worker_name: string;
  passport_number: string;
  nationality?: string;
}

// ==============================================
// UI TYPES
// ==============================================

/** Month range with computed properties */
export interface MonthRange {
  startMonth: Date;
  endMonth: Date;
  months: Date[];  // Array of all months in range
  monthCount: number;
}

/** Deletion preview data for confirmation dialog */
export interface DeletionPreview {
  beforeDate: Date;
  clientReports: {
    reportType: ClientReportType;
    monthDate: Date;
    turnoverAmount?: number;
    employeeCount?: number;
  }[];
  workerData: {
    workerId: string;
    workerName: string;
    passportNumber: string;
    monthDate: Date;
    salary: number;
    supplement: number;
  }[];
  summary: {
    totalClientReports: number;
    totalWorkerRecords: number;
  };
}

// ==============================================
// SERVICE TYPES
// ==============================================

/** Input for upserting client monthly report */
export interface UpsertClientMonthlyReportInput {
  clientId: string;
  reportType: ClientReportType;
  monthDate: Date;
  turnoverAmount?: number;
  employeeCount?: number;
  notes?: string;
}

/** Input for upserting worker monthly data */
export interface UpsertWorkerMonthlyDataInput {
  clientId: string;
  workerId: string;
  monthDate: Date;
  salary: number;
  supplement: number;
}

/** Bulk upsert record for client reports */
export interface BulkClientReportRecord {
  month_date: string;  // ISO date string
  turnover_amount?: number;
  employee_count?: number;
}

/** Bulk upsert record for worker data */
export interface BulkWorkerDataRecord {
  month_date: string;  // ISO date string
  salary: number;
  supplement: number;
}

// ==============================================
// CONTEXT TYPES
// ==============================================

/** State for MonthRangeContext */
export interface MonthRangeContextState {
  /** Current month range (null if no data exists) */
  range: MonthRange | null;

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;

  /** Currently selected client ID */
  clientId: string | null;

  /** Pending deletion (waiting for confirmation) */
  pendingDeletion: {
    monthsToDelete: Date[];
    preview: DeletionPreview;
  } | null;
}

/** Actions for MonthRangeContext */
export interface MonthRangeContextActions {
  /** Load or refresh month range for a client */
  loadMonthRange: (clientId: string) => Promise<void>;

  /** Initialize range with default 12 months from a start date */
  initializeRange: (clientId: string, startDate: Date) => Promise<void>;

  /** Extend range by adding months (handles 14-month limit) */
  extendRange: (direction: 'past' | 'future', monthCount: number) => Promise<void>;

  /** Confirm pending deletion */
  confirmDeletion: () => Promise<void>;

  /** Cancel pending deletion */
  cancelDeletion: () => void;

  /** Clear context state */
  reset: () => void;
}

/** Full MonthRangeContext value */
export type MonthRangeContextValue = MonthRangeContextState & MonthRangeContextActions;

// ==============================================
// UTILITY TYPES
// ==============================================

/** Hebrew month names for display */
export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
] as const;

/** Maximum months allowed in rolling window */
export const MAX_MONTHS = 14;

/** Default initial months when creating new range */
export const DEFAULT_INITIAL_MONTHS = 12;
