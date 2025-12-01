import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams } from './base.service';
import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  module: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditFilter {
  user_id?: string;
  module?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}

export interface AuditSummary {
  total_actions: number;
  actions_by_module: Record<string, number>;
  actions_by_user: Record<string, number>;
  recent_actions: AuditLog[];
}

class AuditService extends BaseService {
  constructor() {
    super('audit_logs');
  }

  async log(
    action: string,
    module: string,
    resourceId?: string,
    details?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const tenantId = await this.getTenantId();

      await supabase.from('audit_logs').insert({
        tenant_id: tenantId,
        user_id: user?.id,
        user_email: user?.email,
        action,
        module,
        resource_id: resourceId,
        details,
        ip_address: this.getClientIP(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  async getLogs(
    filter?: AuditFilter,
    pagination?: PaginationParams
  ): Promise<ServiceResponse<{
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
  }>> {
    try {
      const tenantId = await this.getTenantId();
      const { page = 1, pageSize = 50 } = pagination || {};

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filter) {
        if (filter.user_id) {
          query = query.eq('user_id', filter.user_id);
        }
        if (filter.module) {
          query = query.eq('module', filter.module);
        }
        if (filter.action) {
          query = query.ilike('action', `%${filter.action}%`);
        }
        if (filter.date_from) {
          query = query.gte('created_at', filter.date_from);
        }
        if (filter.date_to) {
          query = query.lte('created_at', filter.date_to);
        }
      }

      if (pagination) {
        query = this.buildPaginationQuery(query, pagination);
      }

      const { data: logs, error, count } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return {
        data: {
          logs: logs || [],
          total: count || 0,
          page,
          pageSize,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getUserActivity(
    userId: string,
    days = 30
  ): Promise<ServiceResponse<AuditLog[]>> {
    try {
      const tenantId = await this.getTenantId();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .gte('created_at', dateFrom.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: logs || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getResourceHistory(
    resourceId: string,
    module?: string
  ): Promise<ServiceResponse<AuditLog[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false });

      if (module) {
        query = query.eq('module', module);
      }

      const { data: logs, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: logs || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getSummary(days = 7): Promise<ServiceResponse<AuditSummary>> {
    try {
      const tenantId = await this.getTenantId();
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', dateFrom.toISOString());

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      const summary: AuditSummary = {
        total_actions: logs?.length || 0,
        actions_by_module: {},
        actions_by_user: {},
        recent_actions: [],
      };

      if (logs && logs.length > 0) {
        // Count by module
        logs.forEach(log => {
          summary.actions_by_module[log.module] = 
            (summary.actions_by_module[log.module] || 0) + 1;
          
          const userKey = log.user_email || log.user_id || 'unknown';
          summary.actions_by_user[userKey] = 
            (summary.actions_by_user[userKey] || 0) + 1;
        });

        // Get recent actions
        summary.recent_actions = logs
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
      }

      return { data: summary, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async exportLogs(
    filter?: AuditFilter,
    format: 'csv' | 'json' = 'csv'
  ): Promise<ServiceResponse<string>> {
    try {
      const { data: logsData } = await this.getLogs(filter, { pageSize: 10000 });
      
      if (!logsData || logsData.logs.length === 0) {
        return { data: '', error: null };
      }

      if (format === 'json') {
        return { data: JSON.stringify(logsData.logs, null, 2), error: null };
      }

      // CSV format
      const headers = [
        'Created At',
        'User Email',
        'Action',
        'Module',
        'Resource ID',
        'IP Address',
        'Details'
      ];

      const rows = logsData.logs.map(log => [
        this.formatDateTimeIsraeli(log.created_at),
        log.user_email || '',
        log.action,
        log.module,
        log.resource_id || '',
        log.ip_address || '',
        JSON.stringify(log.details || {})
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      return { data: csv, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async cleanupOldLogs(daysToKeep = 90): Promise<ServiceResponse<number>> {
    try {
      const tenantId = await this.getTenantId();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data: deleted, error } = await supabase
        .from('audit_logs')
        .delete()
        .eq('tenant_id', tenantId)
        .lt('created_at', cutoffDate.toISOString())
        .select();

      if (error) {
        return { data: 0, error: this.handleError(error) };
      }

      const count = deleted?.length || 0;
      
      await this.log('cleanup_audit_logs', 'system', undefined, {
        deleted_count: count,
        cutoff_date: cutoffDate.toISOString(),
        days_kept: daysToKeep,
      });

      return { data: count, error: null };
    } catch (error) {
      return { data: 0, error: this.handleError(error as Error) };
    }
  }

  private getClientIP(): string | undefined {
    // Client-side cannot reliably get IP without external service
    // Return undefined (which JSON.stringify removes, or Supabase treats as missing)
    // Actually, Supabase insert expects optional, so undefined is fine if passed as value for optional key.
    // But let's return null if we want explicit null in DB.
    return undefined;
  }

  private formatDateTimeIsraeli(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  // Helper method for critical actions that should always be logged
  async logCriticalAction(
    action: string,
    module: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.log(action, module, undefined, {
        ...details,
        critical: true,
        timestamp_local: new Date().toISOString(),
      });
    } catch (error) {
      // Critical actions should be logged even if there's an error
      console.error('Failed to log critical action:', { action, module, details, error });
      
      // You might want to send this to an external service
      // or store it locally for later sync
    }
  }
}

export const auditService = new AuditService();
