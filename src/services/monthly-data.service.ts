/**
 * Monthly Data Service
 * Handles persistent storage for rolling 14-month data in Foreign Workers tabs:
 * - Tab 1: Accountant Turnover (client_monthly_reports)
 * - Tab 2: Israeli Workers (client_monthly_reports)
 * - Tab 5: Salary Report (foreign_worker_monthly_data)
 */

import { BaseService, type ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  ClientReportType,
  ClientMonthRange,
  ClientMonthlyReport,
  ForeignWorkerMonthlyData,
  WorkerMonthlyDataWithDetails,
  MonthRange,
  DeletionPreview,
  BulkClientReportRecord,
  BulkWorkerDataRecord,
  HEBREW_MONTHS,
  MAX_MONTHS,
  DEFAULT_INITIAL_MONTHS,
} from '@/types/monthly-data.types';

// Re-export constants
export { HEBREW_MONTHS, MAX_MONTHS, DEFAULT_INITIAL_MONTHS } from '@/types/monthly-data.types';

// Hebrew month names for display
const HEBREW_MONTH_NAMES = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
] as const;

export class MonthlyDataService extends BaseService {
  constructor() {
    super('monthly_data');
  }

  // ==============================================
  // STATIC UTILITY METHODS
  // ==============================================

  /**
   * Convert Date to first day of month (ISO string)
   * e.g., new Date('2025-01-15') -> '2025-01-01'
   */
  static dateToMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  }

  /**
   * Convert ISO date string to Date object
   * e.g., '2025-01-01' -> Date
   */
  static monthKeyToDate(monthKey: string): Date {
    return new Date(monthKey);
  }

  /**
   * Convert Date to Hebrew display string
   * e.g., new Date('2025-01-01') -> 'ינואר 2025'
   */
  static dateToHebrew(date: Date): string {
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    return `${HEBREW_MONTH_NAMES[monthIndex]} ${year}`;
  }

  /**
   * Convert Hebrew month string to Date
   * e.g., 'ינואר 2025' -> Date
   */
  static hebrewToDate(hebrew: string): Date | null {
    const parts = hebrew.trim().split(' ');
    if (parts.length !== 2) return null;

    const [monthName, yearStr] = parts;
    const monthIndex = HEBREW_MONTH_NAMES.indexOf(monthName as typeof HEBREW_MONTH_NAMES[number]);

    if (monthIndex === -1) return null;

    return new Date(parseInt(yearStr), monthIndex, 1);
  }

  /**
   * Convert MM/YYYY format to Date
   * e.g., '01/2025' -> Date
   */
  static mmYearToDate(mmYear: string): Date | null {
    const match = mmYear.match(/^(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, 1);
  }

  /**
   * Convert Date to MM/YYYY format
   * e.g., Date -> '01/2025'
   */
  static dateToMMYear(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${year}`;
  }

  /**
   * Generate array of month dates between start and end (inclusive)
   */
  static generateMonthsArray(startMonth: Date, endMonth: Date): Date[] {
    const months: Date[] = [];
    const current = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
    const end = new Date(endMonth.getFullYear(), endMonth.getMonth(), 1);

    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  /**
   * Calculate month count between two dates
   */
  static getMonthCount(startMonth: Date, endMonth: Date): number {
    return (endMonth.getFullYear() - startMonth.getFullYear()) * 12 +
           (endMonth.getMonth() - startMonth.getMonth()) + 1;
  }

  // ==============================================
  // MONTH RANGE METHODS (Branch-based)
  // ==============================================

  /**
   * Get month range for a branch
   */
  async getBranchMonthRange(branchId: string): Promise<ServiceResponse<MonthRange | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('client_month_range')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return { data: null, error: null };
      }

      const startMonth = new Date(data.start_month);
      const endMonth = new Date(data.end_month);

      return {
        data: {
          startMonth,
          endMonth,
          months: MonthlyDataService.generateMonthsArray(startMonth, endMonth),
          monthCount: MonthlyDataService.getMonthCount(startMonth, endMonth),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Set or update month range for a branch
   */
  async setBranchMonthRange(
    branchId: string,
    clientId: string,
    startMonth: Date,
    endMonth: Date
  ): Promise<ServiceResponse<MonthRange>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('client_month_range')
        .upsert({
          tenant_id: tenantId,
          client_id: clientId,
          branch_id: branchId,
          start_month: MonthlyDataService.dateToMonthKey(startMonth),
          end_month: MonthlyDataService.dateToMonthKey(endMonth),
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,branch_id',
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('set_month_range', branchId, {
        start_month: MonthlyDataService.dateToMonthKey(startMonth),
        end_month: MonthlyDataService.dateToMonthKey(endMonth),
      });

      return {
        data: {
          startMonth,
          endMonth,
          months: MonthlyDataService.generateMonthsArray(startMonth, endMonth),
          monthCount: MonthlyDataService.getMonthCount(startMonth, endMonth),
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * @deprecated Use getBranchMonthRange instead
   */
  async getClientMonthRange(clientId: string): Promise<ServiceResponse<MonthRange | null>> {
    // Get default branch and use it
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: null, error: null };
    }

    return this.getBranchMonthRange(branches[0].id);
  }

  /**
   * @deprecated Use setBranchMonthRange instead
   */
  async setClientMonthRange(
    clientId: string,
    startMonth: Date,
    endMonth: Date
  ): Promise<ServiceResponse<MonthRange>> {
    // Get default branch and use it
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: null, error: new Error('No default branch found for client') };
    }

    return this.setBranchMonthRange(branches[0].id, clientId, startMonth, endMonth);
  }

  // ==============================================
  // BRANCH MONTHLY REPORTS (Tab 1 & Tab 2)
  // ==============================================

  /**
   * Get branch monthly reports by type
   */
  async getBranchMonthlyReports(
    branchId: string,
    reportType: ClientReportType,
    limit: number = 14
  ): Promise<ServiceResponse<ClientMonthlyReport[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('client_monthly_reports')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .eq('report_type', reportType)
        .order('month_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Upsert a single branch monthly report
   */
  async upsertBranchMonthlyReport(
    branchId: string,
    clientId: string,
    reportType: ClientReportType,
    monthDate: Date,
    data: { turnoverAmount?: number; employeeCount?: number; notes?: string }
  ): Promise<ServiceResponse<ClientMonthlyReport>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: result, error } = await supabase
        .from('client_monthly_reports')
        .upsert({
          tenant_id: tenantId,
          client_id: clientId,
          branch_id: branchId,
          report_type: reportType,
          month_date: MonthlyDataService.dateToMonthKey(monthDate),
          turnover_amount: data.turnoverAmount,
          employee_count: data.employeeCount,
          notes: data.notes,
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,branch_id,report_type,month_date',
        })
        .select()
        .single();

      if (error) throw error;

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Bulk upsert branch monthly reports
   */
  async bulkUpsertBranchMonthlyReports(
    branchId: string,
    clientId: string,
    reportType: ClientReportType,
    records: BulkClientReportRecord[]
  ): Promise<ServiceResponse<{ saved: number }>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const upsertData = records.map(r => ({
        tenant_id: tenantId,
        client_id: clientId,
        branch_id: branchId,
        report_type: reportType,
        month_date: r.month_date,
        turnover_amount: r.turnover_amount,
        employee_count: r.employee_count,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('client_monthly_reports')
        .upsert(upsertData, {
          onConflict: 'tenant_id,branch_id,report_type,month_date',
        })
        .select();

      if (error) throw error;

      await this.logAction('bulk_upsert_reports', branchId, {
        report_type: reportType,
        count: records.length,
      });

      return { data: { saved: data?.length || 0 }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete branch monthly reports before a date
   */
  async deleteOldBranchReports(
    branchId: string,
    reportType: ClientReportType,
    beforeDate: Date
  ): Promise<ServiceResponse<{ deleted: number }>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('client_monthly_reports')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .eq('report_type', reportType)
        .lt('month_date', MonthlyDataService.dateToMonthKey(beforeDate))
        .select();

      if (error) throw error;

      return { data: { deleted: data?.length || 0 }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // Deprecated client-based methods for backward compatibility
  /** @deprecated Use getBranchMonthlyReports instead */
  async getClientMonthlyReports(
    clientId: string,
    reportType: ClientReportType,
    limit: number = 14
  ): Promise<ServiceResponse<ClientMonthlyReport[]>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: [], error: null };
    }

    return this.getBranchMonthlyReports(branches[0].id, reportType, limit);
  }

  /** @deprecated Use upsertBranchMonthlyReport instead */
  async upsertClientMonthlyReport(
    clientId: string,
    reportType: ClientReportType,
    monthDate: Date,
    data: { turnoverAmount?: number; employeeCount?: number; notes?: string }
  ): Promise<ServiceResponse<ClientMonthlyReport>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: null, error: new Error('No default branch found') };
    }

    return this.upsertBranchMonthlyReport(branches[0].id, clientId, reportType, monthDate, data);
  }

  /** @deprecated Use bulkUpsertBranchMonthlyReports instead */
  async bulkUpsertClientMonthlyReports(
    clientId: string,
    reportType: ClientReportType,
    records: BulkClientReportRecord[]
  ): Promise<ServiceResponse<{ saved: number }>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: null, error: new Error('No default branch found') };
    }

    return this.bulkUpsertBranchMonthlyReports(branches[0].id, clientId, reportType, records);
  }

  /** @deprecated Use deleteOldBranchReports instead */
  async deleteOldClientReports(
    clientId: string,
    reportType: ClientReportType,
    beforeDate: Date
  ): Promise<ServiceResponse<{ deleted: number }>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: { deleted: 0 }, error: null };
    }

    return this.deleteOldBranchReports(branches[0].id, reportType, beforeDate);
  }

  // ==============================================
  // WORKER MONTHLY DATA (Tab 5) - Branch-based
  // ==============================================

  /**
   * Get worker monthly data for a branch
   */
  async getBranchWorkerMonthlyData(
    branchId: string,
    workerId?: string,
    limit: number = 14
  ): Promise<ServiceResponse<WorkerMonthlyDataWithDetails[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('foreign_worker_monthly_data')
        .select(`
          *,
          foreign_workers!inner (
            full_name,
            passport_number,
            nationality
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .order('month_date', { ascending: false })
        .limit(limit);

      if (workerId) {
        query = query.eq('worker_id', workerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to flat structure
      const transformed = (data || []).map((row: Record<string, unknown>) => ({
        ...row,
        worker_name: (row.foreign_workers as Record<string, string>)?.full_name,
        passport_number: (row.foreign_workers as Record<string, string>)?.passport_number,
        nationality: (row.foreign_workers as Record<string, string>)?.nationality,
      })) as WorkerMonthlyDataWithDetails[];

      return { data: transformed, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Upsert worker monthly data for a branch
   */
  async upsertBranchWorkerMonthlyData(
    branchId: string,
    clientId: string,
    workerId: string,
    monthDate: Date,
    salary: number,
    supplement: number
  ): Promise<ServiceResponse<ForeignWorkerMonthlyData>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('foreign_worker_monthly_data')
        .upsert({
          tenant_id: tenantId,
          client_id: clientId,
          branch_id: branchId,
          worker_id: workerId,
          month_date: MonthlyDataService.dateToMonthKey(monthDate),
          salary,
          supplement,
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,branch_id,worker_id,month_date',
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Bulk upsert worker monthly data for a branch
   */
  async bulkUpsertBranchWorkerMonthlyData(
    branchId: string,
    clientId: string,
    workerId: string,
    records: BulkWorkerDataRecord[]
  ): Promise<ServiceResponse<{ saved: number }>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const upsertData = records.map(r => ({
        tenant_id: tenantId,
        client_id: clientId,
        branch_id: branchId,
        worker_id: workerId,
        month_date: r.month_date,
        salary: r.salary,
        supplement: r.supplement,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('foreign_worker_monthly_data')
        .upsert(upsertData, {
          onConflict: 'tenant_id,branch_id,worker_id,month_date',
        })
        .select();

      if (error) throw error;

      await this.logAction('bulk_upsert_worker_data', branchId, {
        worker_id: workerId,
        count: records.length,
      });

      return { data: { saved: data?.length || 0 }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete old worker monthly data for a branch
   */
  async deleteOldBranchWorkerData(
    branchId: string,
    beforeDate: Date
  ): Promise<ServiceResponse<{ deleted: number }>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('foreign_worker_monthly_data')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('branch_id', branchId)
        .lt('month_date', MonthlyDataService.dateToMonthKey(beforeDate))
        .select();

      if (error) throw error;

      return { data: { deleted: data?.length || 0 }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ==============================================
  // DELETION PREVIEW & CLEANUP (Branch-based)
  // ==============================================

  /**
   * Get comprehensive deletion preview for a branch
   */
  async getBranchDeletionPreview(
    branchId: string,
    beforeDate: Date
  ): Promise<ServiceResponse<DeletionPreview>> {
    try {
      const { data, error } = await supabase
        .rpc('get_branch_deletion_preview', {
          p_branch_id: branchId,
          p_before_date: MonthlyDataService.dateToMonthKey(beforeDate),
        });

      if (error) throw error;

      // Transform the JSONB response
      const preview: DeletionPreview = {
        beforeDate,
        clientReports: (data.client_reports || []).map((r: Record<string, unknown>) => ({
          reportType: r.report_type as ClientReportType,
          monthDate: new Date(r.month_date as string),
          turnoverAmount: r.turnover_amount as number | undefined,
          employeeCount: r.employee_count as number | undefined,
        })),
        workerData: (data.worker_data || []).map((r: Record<string, unknown>) => ({
          workerId: r.worker_id as string,
          workerName: r.worker_name as string,
          passportNumber: r.passport_number as string,
          monthDate: new Date(r.month_date as string),
          salary: r.salary as number,
          supplement: r.supplement as number,
        })),
        summary: {
          totalClientReports: data.summary?.total_client_reports || 0,
          totalWorkerRecords: data.summary?.total_worker_records || 0,
        },
      };

      return { data: preview, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete all old data for a branch (both reports and worker data)
   */
  async cleanupBranchData(
    branchId: string,
    beforeDate: Date
  ): Promise<ServiceResponse<{ deletedReports: number; deletedWorkerData: number }>> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_branch_monthly_data', {
          p_branch_id: branchId,
          p_before_date: MonthlyDataService.dateToMonthKey(beforeDate),
        });

      if (error) throw error;

      await this.logAction('cleanup_monthly_data', branchId, {
        before_date: MonthlyDataService.dateToMonthKey(beforeDate),
        deleted_reports: data?.[0]?.deleted_client_reports || 0,
        deleted_worker_data: data?.[0]?.deleted_worker_data || 0,
      });

      return {
        data: {
          deletedReports: data?.[0]?.deleted_client_reports || 0,
          deletedWorkerData: data?.[0]?.deleted_worker_data || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ==============================================
  // DEPRECATED CLIENT-BASED METHODS (Tab 5)
  // ==============================================

  /** @deprecated Use getBranchWorkerMonthlyData instead */
  async getWorkerMonthlyData(
    clientId: string,
    workerId?: string,
    limit: number = 14
  ): Promise<ServiceResponse<WorkerMonthlyDataWithDetails[]>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: [], error: null };
    }

    return this.getBranchWorkerMonthlyData(branches[0].id, workerId, limit);
  }

  /** @deprecated Use upsertBranchWorkerMonthlyData instead */
  async upsertWorkerMonthlyData(
    clientId: string,
    workerId: string,
    monthDate: Date,
    salary: number,
    supplement: number
  ): Promise<ServiceResponse<ForeignWorkerMonthlyData>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: null, error: new Error('No default branch found') };
    }

    return this.upsertBranchWorkerMonthlyData(branches[0].id, clientId, workerId, monthDate, salary, supplement);
  }

  /** @deprecated Use bulkUpsertBranchWorkerMonthlyData instead */
  async bulkUpsertWorkerMonthlyData(
    clientId: string,
    workerId: string,
    records: BulkWorkerDataRecord[]
  ): Promise<ServiceResponse<{ saved: number }>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: null, error: new Error('No default branch found') };
    }

    return this.bulkUpsertBranchWorkerMonthlyData(branches[0].id, clientId, workerId, records);
  }

  /** @deprecated Use deleteOldBranchWorkerData instead */
  async deleteOldWorkerData(
    clientId: string,
    beforeDate: Date
  ): Promise<ServiceResponse<{ deleted: number }>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: { deleted: 0 }, error: null };
    }

    return this.deleteOldBranchWorkerData(branches[0].id, beforeDate);
  }

  /** @deprecated Use getBranchDeletionPreview instead */
  async getDeletionPreview(
    clientId: string,
    beforeDate: Date
  ): Promise<ServiceResponse<DeletionPreview>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return {
        data: {
          beforeDate,
          clientReports: [],
          workerData: [],
          summary: { totalClientReports: 0, totalWorkerRecords: 0 },
        },
        error: null,
      };
    }

    return this.getBranchDeletionPreview(branches[0].id, beforeDate);
  }

  /** @deprecated Use cleanupBranchData instead */
  async cleanupClientData(
    clientId: string,
    beforeDate: Date
  ): Promise<ServiceResponse<{ deletedReports: number; deletedWorkerData: number }>> {
    const { data: branches } = await supabase
      .from('client_branches')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_default', true)
      .limit(1);

    if (!branches || branches.length === 0) {
      return { data: { deletedReports: 0, deletedWorkerData: 0 }, error: null };
    }

    return this.cleanupBranchData(branches[0].id, beforeDate);
  }
}

// Export singleton instance
export const monthlyDataService = new MonthlyDataService();
