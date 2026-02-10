/**
 * Annual Balance Sheets Types
 * Types for the annual financial statement preparation workflow module
 */

// ============================================================================
// Status workflow
// ============================================================================

export const BALANCE_STATUSES = [
  'waiting_for_materials',
  'materials_received',
  'assigned_to_auditor',
  'in_progress',
  'work_completed',
  'office_approved',
  'report_transmitted',
  'advances_updated',
] as const;

export type BalanceStatus = (typeof BALANCE_STATUSES)[number];

export interface BalanceStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  order: number;
}

export const BALANCE_STATUS_CONFIG: Record<BalanceStatus, BalanceStatusConfig> = {
  waiting_for_materials: { label: 'טרם התקבל חומר לידנו', color: 'text-gray-700', bgColor: 'bg-gray-100', order: 1 },
  materials_received: { label: 'הגיע חומר', color: 'text-blue-700', bgColor: 'bg-blue-100', order: 2 },
  assigned_to_auditor: { label: 'שויך למבקר', color: 'text-purple-700', bgColor: 'bg-purple-100', order: 3 },
  in_progress: { label: 'בעבודה', color: 'text-orange-700', bgColor: 'bg-orange-100', order: 4 },
  work_completed: { label: 'ממתין לאישור', color: 'text-yellow-700', bgColor: 'bg-yellow-100', order: 5 },
  office_approved: { label: 'משרד אישר', color: 'text-cyan-700', bgColor: 'bg-cyan-100', order: 6 },
  report_transmitted: { label: 'דוח שודר', color: 'text-green-700', bgColor: 'bg-green-100', order: 7 },
  advances_updated: { label: 'מקדמות עודכנו', color: 'text-emerald-700', bgColor: 'bg-emerald-100', order: 8 },
};

/** Solid background colors for stacked progress bars */
export const STATUS_BAR_COLORS: Record<BalanceStatus, string> = {
  waiting_for_materials: 'bg-gray-400',
  materials_received: 'bg-blue-500',
  assigned_to_auditor: 'bg-purple-500',
  in_progress: 'bg-orange-500',
  work_completed: 'bg-yellow-500',
  office_approved: 'bg-cyan-500',
  report_transmitted: 'bg-green-500',
  advances_updated: 'bg-emerald-500',
};

/**
 * Get the next valid status in the workflow
 * Skips 'office_approved' status - goes directly from 'work_completed' to 'report_transmitted'
 */
export function getNextStatus(current: BalanceStatus): BalanceStatus | null {
  const currentIndex = BALANCE_STATUSES.indexOf(current);
  if (currentIndex === -1 || currentIndex === BALANCE_STATUSES.length - 1) return null;
  
  // Skip 'office_approved' - go directly from 'work_completed' to 'report_transmitted'
  if (current === 'work_completed') {
    return 'report_transmitted';
  }
  
  const nextStatus = BALANCE_STATUSES[currentIndex + 1];
  // If next status is 'office_approved', skip to the one after it
  if (nextStatus === 'office_approved') {
    return BALANCE_STATUSES[currentIndex + 2] || null;
  }
  
  return nextStatus;
}

/**
 * Check if a status transition is valid (forward only, unless admin revert)
 * Allows skipping 'office_approved' - direct transition from 'work_completed' to 'report_transmitted'
 */
export function isValidTransition(from: BalanceStatus, to: BalanceStatus, isAdmin: boolean): boolean {
  const fromIndex = BALANCE_STATUSES.indexOf(from);
  const toIndex = BALANCE_STATUSES.indexOf(to);
  if (isAdmin) return fromIndex !== toIndex; // Admin can go backward or forward
  
  // Allow skipping 'office_approved' - direct transition from 'work_completed' to 'report_transmitted'
  if (from === 'work_completed' && to === 'report_transmitted') {
    return true;
  }
  
  // Don't allow transitioning to 'office_approved'
  if (to === 'office_approved') {
    return false;
  }
  
  return toIndex === fromIndex + 1; // Non-admin can only go forward by one step
}

// ============================================================================
// Core interfaces
// ============================================================================

export interface AnnualBalanceSheet {
  id: string;
  tenant_id: string;
  client_id: string;
  year: number;
  status: BalanceStatus;

  // Step 2: Materials received
  materials_received_at: string | null;
  materials_received_by: string | null;
  backup_link: string | null;

  // Step 3: Auditor assignment
  auditor_id: string | null;
  meeting_date: string | null; // Auto-set when auditor is assigned (תאריך שיוך)
  auditor_confirmed: boolean;
  auditor_confirmed_at: string | null;

  // Step 4-5: Work progress
  work_started_at: string | null;
  work_completed_at: string | null;

  // Step 6: Office approval
  office_approved_at: string | null;
  office_approved_by: string | null;

  // Step 7: Report transmission
  report_transmitted_at: string | null;

  // Step 8: Tax advances
  new_advances_amount: number | null;
  advances_updated_at: string | null;
  advances_letter_id: string | null;

  // Advance rate calculation
  tax_amount: number | null;
  turnover: number | null;
  current_advance_rate: number | null;
  calculated_advance_rate: number | null;
  advance_rate_alert: boolean;

  // Tax coding (Form 1214)
  tax_coding: string | null;

  // Year activity
  is_active: boolean;

  // Debt letter (optional)
  debt_letter_sent: boolean;
  debt_letter_id: string | null;

  // General
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnualBalanceSheetWithClient extends AnnualBalanceSheet {
  client: {
    id: string;
    company_name: string;
    company_name_hebrew: string | null;
    tax_id: string;
    client_type: string;
    tax_coding: string | null;
  };
}

export interface AnnualBalanceSheetWithDetails extends AnnualBalanceSheetWithClient {
  auditor: {
    id: string;
    email: string;
    name: string;
  } | null;
}

// ============================================================================
// Status history
// ============================================================================

export interface BalanceStatusHistory {
  id: string;
  balance_sheet_id: string;
  tenant_id: string;
  from_status: BalanceStatus | null;
  to_status: BalanceStatus;
  changed_by: string;
  changed_at: string;
  note: string | null;
}

// ============================================================================
// Dashboard stats
// ============================================================================

export interface BalanceDashboardStats {
  totalCases: number;
  byStatus: Record<BalanceStatus, number>;
  byAuditor: AuditorSummary[];
}

export interface AuditorSummary {
  auditor_id: string;
  auditor_email: string;
  auditor_name: string;
  total: number;
  byStatus: Partial<Record<BalanceStatus, number>>;
}

// ============================================================================
// Filters
// ============================================================================

export interface BalanceFilters {
  status?: BalanceStatus;
  auditor_id?: string;
  year: number;
  search?: string;
  showInactive?: boolean;
  hasTaxCoding?: boolean;
  hasUnread?: boolean;
}

// ============================================================================
// Permissions
// ============================================================================

export type BalanceUserRole = 'admin' | 'accountant' | 'bookkeeper';

export const BALANCE_PERMISSIONS: Record<string, BalanceUserRole[]> = {
  view: ['admin', 'accountant', 'bookkeeper'],
  mark_materials: ['admin', 'accountant', 'bookkeeper'],
  change_status: ['admin', 'accountant'],
  assign_auditor: ['admin', 'accountant'],
  confirm_assignment: ['admin', 'accountant'],
  open_year: ['admin'],
  revert_status: ['admin'],
  view_chat: ['admin', 'accountant', 'bookkeeper'],
  send_chat: ['admin', 'accountant', 'bookkeeper'],
};

/**
 * Check if a user role has permission for an action
 */
export function hasBalancePermission(role: string, action: keyof typeof BALANCE_PERMISSIONS): boolean {
  const allowedRoles = BALANCE_PERMISSIONS[action];
  return allowedRoles?.includes(role as BalanceUserRole) ?? false;
}

/**
 * Check if a user can access the balance chat.
 * Admin/accountant: always allowed for any balance in their tenant.
 * Bookkeeper: only if they are the assigned auditor for the balance.
 * All other roles: no access.
 */
export function canAccessBalanceChat(
  role: string,
  userId: string,
  balanceCase: { auditor_id: string | null }
): boolean {
  if (role === 'admin' || role === 'accountant') return true;
  if (role === 'bookkeeper' && balanceCase.auditor_id === userId) return true;
  return false;
}
