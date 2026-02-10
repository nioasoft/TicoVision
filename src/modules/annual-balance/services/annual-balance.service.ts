/**
 * Annual Balance Service
 *
 * Handles CRUD operations and workflow transitions for annual balance sheets.
 * Each method follows the BaseService pattern with tenant isolation.
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type {
  AnnualBalanceSheet,
  AnnualBalanceSheetWithClient,
  AnnualBalanceSheetWithDetails,
  BalanceStatus,
  BalanceStatusHistory,
  BalanceDashboardStats,
  BalanceFilters,
  AuditorSummary,
} from '../types/annual-balance.types';
import { BALANCE_STATUSES, BALANCE_STATUS_CONFIG, isValidTransition } from '../types/annual-balance.types';
import { balanceChatService } from './balance-chat.service';

const CLIENT_SELECT = 'id, company_name, company_name_hebrew, tax_id, client_type, tax_coding';

class AnnualBalanceService extends BaseService {
  constructor() {
    super('annual_balance_sheets');
  }

  /**
   * Get all balance sheets with pagination, filters, and client join
   */
  async getAll(
    filters: BalanceFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<{ data: AnnualBalanceSheetWithClient[]; total: number }>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('annual_balance_sheets')
        .select(
          `*, client:clients(${CLIENT_SELECT})`,
          { count: 'exact' }
        )
        .eq('tenant_id', tenantId)
        .eq('year', filters.year);

      // Filter inactive records by default (unless showInactive is true)
      if (!filters.showInactive) {
        query = query.eq('is_active', true);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.auditor_id) {
        query = query.eq('auditor_id', filters.auditor_id);
      }
      if (filters.search || filters.hasTaxCoding !== undefined) {
        // Filter by client properties - two-step approach since PostgREST
        // .or() doesn't reliably filter on embedded/joined resource fields
        let clientQuery = supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId);

        if (filters.search) {
          clientQuery = clientQuery.or(
            `company_name.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`
          );
        }

        if (filters.hasTaxCoding === true) {
          clientQuery = clientQuery
            .not('tax_coding', 'is', null)
            .neq('tax_coding', '')
            .neq('tax_coding', '0');
        } else if (filters.hasTaxCoding === false) {
          clientQuery = clientQuery.or('tax_coding.is.null,tax_coding.eq.,tax_coding.eq.0');
        }

        const { data: matchingClients } = await clientQuery;

        const matchingIds = matchingClients?.map((c) => c.id) ?? [];
        if (matchingIds.length === 0) {
          return { data: { data: [], total: 0 }, error: null };
        }
        query = query.in('client_id', matchingIds);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('updated_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      const rows = (data ?? []) as unknown as AnnualBalanceSheetWithClient[];

      // Enrich rows with auditor name/email
      const uniqueAuditorIds = [...new Set(rows.map((r) => r.auditor_id).filter(Boolean))] as string[];
      const auditorMap = new Map<string, { email: string; name: string }>();

      for (const auditorId of uniqueAuditorIds) {
        try {
          const { data: authUser } = await supabase.rpc('get_user_with_auth', {
            p_user_id: auditorId,
          });
          if (authUser && authUser.length > 0) {
            const fullName = authUser[0].full_name || '';
            auditorMap.set(auditorId, {
              email: authUser[0].email,
              name: fullName || authUser[0].email,
            });
          }
        } catch {
          // Skip - no enrichment for this auditor
        }
      }

      const enrichedRows = rows.map((row) => {
        if (row.auditor_id && auditorMap.has(row.auditor_id)) {
          const info = auditorMap.get(row.auditor_id)!;
          return { ...row, auditor_email: info.email, auditor_name: info.name };
        }
        return row;
      });

      return {
        data: {
          data: enrichedRows,
          total: count ?? 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get a single balance sheet by ID with full details
   */
  async getById(id: string): Promise<ServiceResponse<AnnualBalanceSheetWithDetails>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .select(`*, client:clients(${CLIENT_SELECT})`)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      // Fetch auditor details separately if assigned
      let auditor: { id: string; email: string; name: string } | null = null;
      if (data.auditor_id) {
        const { data: userData } = await supabase
          .from('user_tenant_access')
          .select('user_id')
          .eq('user_id', data.auditor_id)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .single();

        if (userData) {
          const { data: authUser } = await supabase.rpc('get_user_with_auth', {
            p_user_id: data.auditor_id,
          });
          if (authUser && authUser.length > 0) {
            const fullName = authUser[0].full_name || '';
            auditor = {
              id: data.auditor_id,
              email: authUser[0].email,
              name: fullName || authUser[0].email,
            };
          }
        }
      }

      const result: AnnualBalanceSheetWithDetails = {
        ...(data as unknown as AnnualBalanceSheetWithClient),
        auditor,
      };

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all balance sheets for a specific client (all years)
   */
  async getByClientId(clientId: string): Promise<ServiceResponse<AnnualBalanceSheet[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('year', { ascending: false });

      if (error) throw error;

      return { data: data as AnnualBalanceSheet[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Open a new balance year - batch insert for all active companies + partnerships
   * Returns the count of created records
   */
  async openYear(year: number): Promise<ServiceResponse<{ created: number; skipped: number }>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if year already has records
      const { count: existingCount } = await supabase
        .from('annual_balance_sheets')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('year', year);

      if (existingCount && existingCount > 0) {
        return {
          data: null,
          error: new Error(`שנת ${year} כבר פתוחה עם ${existingCount} תיקים`),
        };
      }

      // Get all active companies and partnerships
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .in('client_type', ['company', 'partnership']);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        return {
          data: { created: 0, skipped: 0 },
          error: null,
        };
      }

      // Batch insert all clients
      const records = clients.map((client) => ({
        tenant_id: tenantId,
        client_id: client.id,
        year,
        status: 'waiting_for_materials' as const,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from('annual_balance_sheets')
        .insert(records)
        .select('id');

      if (insertError) throw insertError;

      const created = inserted?.length ?? 0;

      await this.logAction('open_balance_year', undefined, {
        year,
        clients_count: created,
      });

      return {
        data: { created, skipped: 0 },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update status with audit trail logging
   */
  async updateStatus(
    id: string,
    newStatus: BalanceStatus,
    note?: string,
    isAdmin: boolean = false
  ): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get current record
      const { data: current, error: fetchError } = await supabase
        .from('annual_balance_sheets')
        .select('status, auditor_confirmed')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = current.status as BalanceStatus;

      // Guard: cannot start work without auditor confirmation
      if (newStatus === 'in_progress' && !current.auditor_confirmed) {
        return {
          data: null,
          error: new Error('יש לאשר קבלת תיק לפני תחילת עבודה'),
        };
      }

      // Validate transition
      if (!isValidTransition(currentStatus, newStatus, isAdmin)) {
        return {
          data: null,
          error: new Error(`מעבר לא חוקי מ-${currentStatus} ל-${newStatus}`),
        };
      }

      // Build update object with status-specific timestamp fields
      const updateData: Record<string, unknown> = { status: newStatus };
      const now = new Date().toISOString();

      const fromIndex = BALANCE_STATUSES.indexOf(currentStatus);
      const toIndex = BALANCE_STATUSES.indexOf(newStatus);
      const isRevert = toIndex < fromIndex;

      if (isRevert) {
        // Null out timestamp fields for all statuses AFTER the target
        const statusesToClear = BALANCE_STATUSES.slice(toIndex + 1);
        for (const clearedStatus of statusesToClear) {
          switch (clearedStatus) {
            case 'materials_received':
              updateData.materials_received_at = null;
              updateData.materials_received_by = null;
              break;
            case 'assigned_to_auditor':
              updateData.meeting_date = null;
              break;
            case 'in_progress':
              updateData.work_started_at = null;
              break;
            case 'work_completed':
              updateData.work_completed_at = null;
              break;
            case 'office_approved':
              updateData.office_approved_at = null;
              updateData.office_approved_by = null;
              break;
            case 'report_transmitted':
              updateData.report_transmitted_at = null;
              break;
            case 'advances_updated':
              updateData.advances_updated_at = null;
              break;
          }
        }

        // If reverting before assigned_to_auditor, reset auditor confirmation
        const assignedIndex = BALANCE_STATUSES.indexOf('assigned_to_auditor');
        if (toIndex < assignedIndex) {
          updateData.auditor_confirmed = false;
          updateData.auditor_confirmed_at = null;
        }
      } else {
        // Forward transition - set timestamp for the target status
        switch (newStatus) {
          case 'materials_received':
            updateData.materials_received_at = now;
            updateData.materials_received_by = user?.id;
            break;
          case 'in_progress':
            updateData.work_started_at = now;
            break;
          case 'work_completed':
            updateData.work_completed_at = now;
            break;
          case 'office_approved':
            updateData.office_approved_at = now;
            updateData.office_approved_by = user?.id;
            break;
          case 'report_transmitted':
            updateData.report_transmitted_at = now;
            break;
          case 'advances_updated':
            updateData.advances_updated_at = now;
            break;
        }
      }

      // Update the record
      const { data: updated, error: updateError } = await supabase
        .from('annual_balance_sheets')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log status change in history
      const historyNote = isRevert && note
        ? `[החזרת סטטוס] ${note}`
        : isRevert
          ? '[החזרת סטטוס]'
          : note ?? null;

      const { error: historyError } = await supabase
        .from('balance_sheet_status_history')
        .insert({
          balance_sheet_id: id,
          tenant_id: tenantId,
          from_status: currentStatus,
          to_status: newStatus,
          changed_by: user?.id ?? '',
          note: historyNote,
        });

      if (historyError) {
        console.error('Failed to log status history:', historyError);
      }

      // System message in balance chat (fire-and-forget)
      const fromLabel = BALANCE_STATUS_CONFIG[currentStatus].label;
      const toLabel = BALANCE_STATUS_CONFIG[newStatus].label;
      const systemContent = isRevert
        ? `סטטוס הוחזר: ${fromLabel} → ${toLabel}`
        : `סטטוס שונה: ${fromLabel} → ${toLabel}`;
      balanceChatService.sendSystemMessage(id, systemContent);

      await this.logAction('update_balance_status', id, {
        from_status: currentStatus,
        to_status: newStatus,
        note,
      });

      return { data: updated as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark materials received using the RPC function (available to bookkeepers)
   */
  async markMaterialsReceived(
    balanceSheetId: string,
    receivedAt?: string,
    backupLink?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('mark_materials_received', {
        p_balance_sheet_id: balanceSheetId,
        p_received_at: receivedAt ?? new Date().toISOString(),
        p_backup_link: backupLink ?? null,
      });

      if (error) throw error;

      await this.logAction('mark_materials_received', balanceSheetId, {
        received_at: receivedAt,
        backup_link: backupLink,
      });

      // System message in balance chat (fire-and-forget)
      balanceChatService.sendSystemMessage(balanceSheetId, 'חומרים התקבלו');

      return { data: undefined, error: null };
    } catch (error) {
      return { data: undefined, error: this.handleError(error as Error) };
    }
  }

  /**
   * Assign auditor and auto-set assignment date (meeting_date)
   */
  async assignAuditor(
    id: string,
    auditorId: string
  ): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get current record
      const { data: current, error: fetchError } = await supabase
        .from('annual_balance_sheets')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      const currentStatus = current.status as BalanceStatus;

      // Build update - auto-set assignment timestamp, advance status if materials_received
      const updateData: Record<string, unknown> = {
        auditor_id: auditorId,
        meeting_date: new Date().toISOString(),
      };

      if (currentStatus === 'materials_received') {
        updateData.status = 'assigned_to_auditor';
      }

      const { data: updated, error: updateError } = await supabase
        .from('annual_balance_sheets')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Log status change if status was updated
      if (currentStatus === 'materials_received') {
        await supabase.from('balance_sheet_status_history').insert({
          balance_sheet_id: id,
          tenant_id: tenantId,
          from_status: currentStatus,
          to_status: 'assigned_to_auditor',
          changed_by: user?.id ?? '',
          note: `שויך למבקר`,
        });
      }

      // System message in balance chat (fire-and-forget)
      // Wrap lookup + send in async IIFE so the await for auditor name
      // does NOT block the parent operation (preserves fire-and-forget principle)
      void (async () => {
        try {
          const { data: auditorInfo } = await supabase.rpc('get_user_with_auth', {
            p_user_id: auditorId,
          });
          const auditorDisplayName = auditorInfo?.[0]?.full_name || auditorInfo?.[0]?.email || '';
          balanceChatService.sendSystemMessage(id, `מאזן שויך למבקר ${auditorDisplayName}`);
        } catch {
          // Non-critical — silently ignore
        }
      })();

      await this.logAction('assign_auditor', id, {
        auditor_id: auditorId,
      });

      return { data: updated as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get dashboard statistics - counts per status and per auditor
   */
  async getDashboardStats(year: number): Promise<ServiceResponse<BalanceDashboardStats>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all active records for the year to compute stats
      const { data: records, error } = await supabase
        .from('annual_balance_sheets')
        .select('status, auditor_id')
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .eq('is_active', true);

      if (error) throw error;

      if (!records || records.length === 0) {
        const emptyByStatus = Object.fromEntries(
          BALANCE_STATUSES.map((s) => [s, 0])
        ) as Record<BalanceStatus, number>;

        return {
          data: { totalCases: 0, byStatus: emptyByStatus, byAuditor: [] },
          error: null,
        };
      }

      // Count by status
      const byStatus = Object.fromEntries(
        BALANCE_STATUSES.map((s) => [s, 0])
      ) as Record<BalanceStatus, number>;

      // Count by auditor
      const auditorMap = new Map<string, Partial<Record<BalanceStatus, number>>>();

      for (const record of records) {
        const status = record.status as BalanceStatus;
        byStatus[status] = (byStatus[status] || 0) + 1;

        if (record.auditor_id) {
          if (!auditorMap.has(record.auditor_id)) {
            auditorMap.set(record.auditor_id, {});
          }
          const auditorStats = auditorMap.get(record.auditor_id)!;
          auditorStats[status] = (auditorStats[status] || 0) + 1;
        }
      }

      // Get auditor emails
      const auditorIds = Array.from(auditorMap.keys());
      const byAuditor: AuditorSummary[] = [];

      if (auditorIds.length > 0) {
        for (const auditorId of auditorIds) {
          const stats = auditorMap.get(auditorId)!;
          const total = Object.values(stats).reduce((sum, count) => sum + (count || 0), 0);

          // Try to get email + name via RPC
          let email = auditorId; // fallback
          let name = auditorId; // fallback
          try {
            const { data: authUser } = await supabase.rpc('get_user_with_auth', {
              p_user_id: auditorId,
            });
            if (authUser && authUser.length > 0) {
              email = authUser[0].email;
              const fullName = authUser[0].full_name || '';
              name = fullName || email;
            }
          } catch {
            // Use ID as fallback
          }

          byAuditor.push({
            auditor_id: auditorId,
            auditor_email: email,
            auditor_name: name,
            total,
            byStatus: stats,
          });
        }

        // Sort by total descending
        byAuditor.sort((a, b) => b.total - a.total);
      }

      return {
        data: {
          totalCases: records.length,
          byStatus,
          byAuditor,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get status history for a balance sheet
   */
  async getStatusHistory(balanceSheetId: string): Promise<ServiceResponse<BalanceStatusHistory[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('balance_sheet_status_history')
        .select('*')
        .eq('balance_sheet_id', balanceSheetId)
        .eq('tenant_id', tenantId)
        .order('changed_at', { ascending: true });

      if (error) throw error;

      return { data: data as BalanceStatusHistory[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update advances info for a balance sheet
   */
  async updateAdvances(
    id: string,
    advancesAmount: number,
    letterId?: string
  ): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .update({
          new_advances_amount: advancesAmount,
          advances_updated_at: new Date().toISOString(),
          advances_letter_id: letterId ?? null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_advances', id, {
        amount: advancesAmount,
        letter_id: letterId,
      });

      return { data: data as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update debt letter info for a balance sheet
   */
  async updateDebtLetter(
    id: string,
    sent: boolean,
    letterId?: string
  ): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .update({
          debt_letter_sent: sent,
          debt_letter_id: letterId ?? null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update notes for a balance sheet
   */
  async updateNotes(id: string, notes: string): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .update({ notes })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Confirm auditor assignment - auditor acknowledges receipt of file
   */
  async confirmAssignment(id: string): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .update({
          auditor_confirmed: true,
          auditor_confirmed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      // Log confirmation in status history
      await supabase.from('balance_sheet_status_history').insert({
        balance_sheet_id: id,
        tenant_id: tenantId,
        from_status: 'assigned_to_auditor',
        to_status: 'assigned_to_auditor',
        changed_by: user?.id ?? '',
        note: 'מבקר אישר קבלת תיק',
      });

      // System message in balance chat (fire-and-forget)
      balanceChatService.sendSystemMessage(id, 'מבקר אישר קבלת תיק');

      await this.logAction('confirm_assignment', id);

      return { data: data as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update advance rate fields - DB trigger auto-calculates rate and alert
   */
  async updateAdvanceRate(
    id: string,
    data: { taxAmount: number; turnover: number; currentAdvanceRate: number }
  ): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: updated, error } = await supabase
        .from('annual_balance_sheets')
        .update({
          tax_amount: data.taxAmount,
          turnover: data.turnover,
          current_advance_rate: data.currentAdvanceRate,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_advance_rate', id, data);

      return { data: updated as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Toggle year activity for a balance sheet
   */
  async toggleYearActivity(
    id: string,
    isActive: boolean
  ): Promise<ServiceResponse<AnnualBalanceSheet>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('annual_balance_sheets')
        .update({ is_active: isActive })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('toggle_year_activity', id, { is_active: isActive });

      return { data: data as AnnualBalanceSheet, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get count of clients that would be added for a year (preview for open year dialog)
   */
  async getOpenYearPreview(year: number): Promise<ServiceResponse<{ clientCount: number; yearExists: boolean }>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if year already exists
      const { count: existingCount } = await supabase
        .from('annual_balance_sheets')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('year', year);

      // Count eligible clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .in('client_type', ['company', 'partnership']);

      return {
        data: {
          clientCount: clientCount ?? 0,
          yearExists: (existingCount ?? 0) > 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

// Export singleton instance
export const annualBalanceService = new AnnualBalanceService();
