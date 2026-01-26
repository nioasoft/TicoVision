import { supabase } from '@/lib/supabase';
import { BaseService } from '@/services/base.service';
import { userService } from '@/services/user.service';
import type {
  TicketWithDetails,
  TicketDashboardData,
  TicketFilters,
  TicketSort,
  TicketKPIs,
  CreateTicketDto,
  CreateReplyDto,
  SupportTicketReply,
  SupportTicketStatus,
  CategoryWithSubcategories,
  AssignableUser,
  KanbanColumn,
  SupportTicketHistory,
  TicketSettings,
} from '../types/ticket.types';

class TicketServiceClass extends BaseService {
  constructor() {
    super('support_tickets');
  }

  // =============================================
  // DASHBOARD & KANBAN
  // =============================================

  async getDashboardData(
    filters?: TicketFilters,
    sort?: TicketSort,
    options?: { statusKeys?: string[] }
  ): Promise<ServiceResponse<TicketDashboardData>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all visible statuses for columns
      const { data: statuses, error: statusError } = await supabase
        .from('support_ticket_statuses')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_visible_on_board', true)
        .order('column_order');

      if (statusError) throw statusError;

      // Build ticket query
      const statusKeys = options?.statusKeys;
      const visibleStatuses = statusKeys?.length
        ? (statuses || []).filter(status => statusKeys.includes(status.key))
        : (statuses || []);

      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          category:support_ticket_categories!category_id(*),
          subcategory:support_ticket_categories!subcategory_id(*),
          status:support_ticket_statuses(*),
          matched_client:clients(id, company_name, email, phone)
        `)
        .eq('tenant_id', tenantId);

      if (statusKeys?.length) {
        const statusIds = visibleStatuses.map(status => status.id);
        if (statusIds.length > 0) {
          query = query.in('status_id', statusIds);
        }
      }

      // Apply filters
      if (filters?.status_id) {
        query = query.eq('status_id', filters.status_id);
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.assigned_to === null) {
        query = query.is('assigned_to', null);
      } else if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.is_new_lead !== undefined) {
        query = query.eq('is_new_lead', filters.is_new_lead);
      }
      if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,submitter_name.ilike.%${filters.search}%,submitter_email.ilike.%${filters.search}%`);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply sort
      const sortField = sort?.field || 'created_at';
      const sortOrder = sort?.order || 'desc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data: tickets, error: ticketError } = await query;

      if (ticketError) throw ticketError;

      // Get reply counts per ticket using optimized RPC
      const ticketIds = tickets?.map(t => t.id) || [];
      const replyCountMap: Record<string, number> = {};

      if (ticketIds.length > 0) {
        const { data: replyCounts } = await supabase.rpc('get_ticket_reply_counts', {
          p_ticket_ids: ticketIds,
        });
        replyCounts?.forEach((r: { ticket_id: string; reply_count: number }) => {
          replyCountMap[r.ticket_id] = r.reply_count;
        });
      }

      // Organize tickets into columns
      const columns: KanbanColumn[] = visibleStatuses.map(status => ({
        id: status.id,
        key: status.key,
        name: status.name,
        name_hebrew: status.name_hebrew,
        color: status.color,
        icon: status.icon,
        column_order: status.column_order,
        tickets: (tickets || [])
          .filter(t => t.status_id === status.id)
          .map(t => ({
            ...t,
            reply_count: replyCountMap[t.id] || 0,
          })) as TicketWithDetails[],
        ticket_count: (tickets || []).filter(t => t.status_id === status.id).length,
      }));

      // Calculate KPIs
      const kpis = await this.calculateKPIs(tenantId);

      return {
        data: { columns, kpis },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  private async calculateKPIs(tenantId: string): Promise<TicketKPIs> {
    // Use optimized RPC for all KPIs in a single query
    const { data: kpis, error } = await supabase.rpc('get_ticket_kpis', {
      p_tenant_id: tenantId,
    });

    if (error || !kpis) {
      console.error('Error calculating KPIs:', error);
      return {
        total_open: 0,
        total_today: 0,
        avg_response_time_hours: null,
        unassigned_count: 0,
        urgent_count: 0,
      };
    }

    return {
      total_open: kpis.total_open || 0,
      total_today: kpis.total_today || 0,
      avg_response_time_hours: kpis.avg_response_time_hours || null,
      unassigned_count: kpis.unassigned_count || 0,
      urgent_count: kpis.urgent_count || 0,
    };
  }

  // =============================================
  // TICKET CRUD
  // =============================================

  async getById(ticketId: string): Promise<ServiceResponse<TicketWithDetails>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          category:support_ticket_categories!category_id(*),
          subcategory:support_ticket_categories!subcategory_id(*),
          status:support_ticket_statuses(*),
          matched_client:clients(id, company_name, email, phone)
        `)
        .eq('id', ticketId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data: data as TicketWithDetails, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async create(data: CreateTicketDto): Promise<ServiceResponse<TicketWithDetails>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get default status
      const { data: defaultStatus } = await supabase
        .from('support_ticket_statuses')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_default_for_new', true)
        .single();

      if (!defaultStatus) {
        throw new Error('No default status found for tickets');
      }

      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({
          tenant_id: tenantId,
          submitter_name: data.submitter_name,
          submitter_email: data.submitter_email,
          submitter_phone: data.submitter_phone || null,
          submitter_company_name: data.submitter_company_name || null,
          submitter_tax_id: data.submitter_tax_id || null,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
          subject: data.subject,
          description: data.description,
          priority: data.priority || 'normal',
          status_id: defaultStatus.id,
          source: data.source || 'internal',
          assigned_to: data.assigned_to || null,
          assigned_at: data.assigned_to ? new Date().toISOString() : null,
          assigned_by: data.assigned_to ? user?.id : null,
          due_date: data.due_date || null,
          created_by: user?.id,
        })
        .select(`
          *,
          category:support_ticket_categories!category_id(*),
          subcategory:support_ticket_categories!subcategory_id(*),
          status:support_ticket_statuses(*),
          matched_client:clients(id, company_name, email, phone)
        `)
        .single();

      if (error) throw error;

      await this.logAction('ticket_created', ticket.id, {
        subject: data.subject,
        category_id: data.category_id,
        assigned_to: data.assigned_to,
      });

      // Log to history
      await this.addHistory(ticket.id, tenantId, 'created', null, null, null);

      return { data: ticket as TicketWithDetails, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateStatus(ticketId: string, statusId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get old status
      const { data: oldTicket } = await supabase
        .from('support_tickets')
        .select('status_id, notify_client_on_update')
        .eq('id', ticketId)
        .single();

      // Check if new status is closed
      const { data: newStatus } = await supabase
        .from('support_ticket_statuses')
        .select('is_closed_status, name_hebrew')
        .eq('id', statusId)
        .single();

      const { error } = await supabase
        .from('support_tickets')
        .update({
          status_id: statusId,
          updated_at: new Date().toISOString(),
          resolved_at: newStatus?.is_closed_status ? new Date().toISOString() : null,
        })
        .eq('id', ticketId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('status_changed', ticketId, {
        old_status_id: oldTicket?.status_id,
        new_status_id: statusId,
      });

      // Log to history
      await this.addHistory(ticketId, tenantId, 'status_changed', 'status_id', oldTicket?.status_id, statusId);

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async assign(ticketId: string, userId: string | null): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get old assignment
      const { data: oldTicket } = await supabase
        .from('support_tickets')
        .select('assigned_to')
        .eq('id', ticketId)
        .single();

      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: userId,
          assigned_at: userId ? new Date().toISOString() : null,
          assigned_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction(userId ? 'assigned' : 'unassigned', ticketId, {
        old_assigned_to: oldTicket?.assigned_to,
        new_assigned_to: userId,
      });

      // Log to history
      await this.addHistory(
        ticketId,
        tenantId,
        userId ? 'assigned' : 'unassigned',
        'assigned_to',
        oldTicket?.assigned_to,
        userId
      );

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updatePriority(ticketId: string, priority: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: oldTicket } = await supabase
        .from('support_tickets')
        .select('priority')
        .eq('id', ticketId)
        .single();

      const { error } = await supabase
        .from('support_tickets')
        .update({
          priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.addHistory(ticketId, tenantId, 'priority_changed', 'priority', oldTicket?.priority, priority);

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async linkClient(ticketId: string, clientId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('support_tickets')
        .update({
          matched_client_id: clientId,
          matched_by: 'manual',
          is_new_lead: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.addHistory(ticketId, tenantId, 'client_linked', 'matched_client_id', null, clientId);

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // =============================================
  // REPLIES
  // =============================================

  async getReplies(ticketId: string): Promise<ServiceResponse<SupportTicketReply[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async addReply(ticketId: string, reply: CreateReplyDto): Promise<ServiceResponse<SupportTicketReply>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('support_ticket_replies')
        .insert({
          tenant_id: tenantId,
          ticket_id: ticketId,
          content: reply.content,
          is_internal: reply.is_internal || false,
          is_from_client: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket's first_response_at if this is the first reply
      await supabase
        .from('support_tickets')
        .update({
          first_response_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .is('first_response_at', null);

      await this.addHistory(
        ticketId,
        tenantId,
        reply.is_internal ? 'internal_note' : 'replied',
        null,
        null,
        null
      );

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // =============================================
  // CATEGORIES & STATUSES
  // =============================================

  async getCategories(): Promise<ServiceResponse<CategoryWithSubcategories[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_ticket_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      // Organize into hierarchy
      const mainCategories = data.filter(c => c.level === 1);
      const subcategories = data.filter(c => c.level === 2);

      const result: CategoryWithSubcategories[] = mainCategories.map(cat => ({
        ...cat,
        subcategories: subcategories
          .filter(sub => sub.parent_id === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getStatuses(): Promise<ServiceResponse<SupportTicketStatus[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_ticket_statuses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('column_order');

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // =============================================
  // USERS
  // =============================================

  async getAssignableUsers(): Promise<ServiceResponse<AssignableUser[]>> {
    try {
      // Get all active users (no role filter)
      const usersResponse = await userService.getUsers(undefined, {
        is_active: true,
      });

      if (usersResponse.error) {
        return { data: null, error: usersResponse.error };
      }

      // Filter to accountants and admins (רואי חשבון ומנהלי מערכת)
      const users = (usersResponse.data?.users || [])
        .filter((user) => user.role === 'accountant' || user.role === 'admin')
        .map((user) => ({
          id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          avatar_url: null,
        }));

      return { data: users, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // =============================================
  // HISTORY
  // =============================================

  async getHistory(ticketId: string): Promise<ServiceResponse<SupportTicketHistory[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_ticket_history')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  private async addHistory(
    ticketId: string,
    tenantId: string,
    action: string,
    fieldChanged: string | null,
    oldValue: string | null,
    newValue: string | null
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('support_ticket_history').insert({
        tenant_id: tenantId,
        ticket_id: ticketId,
        action,
        field_changed: fieldChanged,
        old_value: oldValue,
        new_value: newValue,
        performed_by: user?.id,
      });
    } catch (error) {
      console.error('Failed to add history:', error);
    }
  }

  // =============================================
  // SETTINGS
  // =============================================

  async getSettings(): Promise<ServiceResponse<TicketSettings>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_ticket_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        // If no settings exist, return defaults
        if (error.code === 'PGRST116') {
          return {
            data: {
              id: '',
              tenant_id: tenantId,
              visible_column_keys: ['new', 'in_progress', 'in_review', 'completed'],
              auto_assign_enabled: false,
              default_assignee_id: null,
              round_robin_enabled: false,
              notify_on_new_ticket: true,
              notify_assignee_on_assign: true,
              default_response_hours: 24,
              urgent_response_hours: 4,
              auto_archive_days: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        throw error;
      }

      return { data: data as TicketSettings, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateSettings(settings: Partial<TicketSettings>): Promise<ServiceResponse<TicketSettings>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('support_ticket_settings')
        .upsert({
          tenant_id: tenantId,
          ...settings,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('settings_updated', null, settings);

      return { data: data as TicketSettings, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateStatusWipLimit(
    statusId: string,
    wipLimit: number | null,
    warnAtPercent?: number
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('support_ticket_statuses')
        .update({
          wip_limit: wipLimit,
          warn_at_percent: warnAtPercent ?? 80,
        })
        .eq('id', statusId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const ticketService = new TicketServiceClass();
