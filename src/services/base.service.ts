import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: unknown;
}

export abstract class BaseService {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected async getTenantId(): Promise<string> {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      throw new Error('No tenant ID found. User must be authenticated.');
    }
    return tenantId;
  }

  protected handleError(error: PostgrestError | Error): Error {
    if ('code' in error && 'message' in error) {
      return new Error(`Database error: ${error.message} (${error.code})`);
    }
    return error instanceof Error ? error : new Error('Unknown error occurred');
  }

  protected async logAction(
    action: string,
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
        module: this.tableName,
        resource_id: resourceId,
        details,
        ip_address: window.location.hostname,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  protected buildPaginationQuery(
    query: any,
    params: PaginationParams
  ) {
    const { page = 1, pageSize = 20, sortBy, sortOrder = 'desc' } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    if (sortBy) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    return query;
  }

  protected buildFilterQuery(
    query: any,
    filters: FilterParams
  ) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          query = query.ilike(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });

    return query;
  }
}