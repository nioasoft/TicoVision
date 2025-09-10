import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams, FilterParams } from './base.service';
import { supabase } from '@/lib/supabase';

export interface Client {
  id: string;
  tenant_id: string;
  company_name: string;
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
  };
  status: 'active' | 'inactive' | 'pending';
  group_id?: string;
  assigned_accountant?: string;
  internal_external?: 'internal' | 'external';
  collection_responsibility?: 'tiko' | 'shani';
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientDto {
  company_name: string;
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
  };
  status?: 'active' | 'inactive' | 'pending';
  group_id?: string;
  assigned_accountant?: string;
  internal_external?: 'internal' | 'external';
  collection_responsibility?: 'tiko' | 'shani';
  notes?: string;
}

export interface UpdateClientDto extends Partial<CreateClientDto> {}

export interface ClientsListResponse {
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
}

class ClientService extends BaseService {
  constructor() {
    super('clients');
  }

  async create(data: CreateClientDto): Promise<ServiceResponse<Client>> {
    try {
      const tenantId = await this.getTenantId();
      
      // Validate Israeli tax ID (9 digits)
      if (!this.validateTaxId(data.tax_id)) {
        return {
          data: null,
          error: new Error('Invalid Israeli tax ID. Must be 9 digits.')
        };
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          ...data,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('create_client', client.id, { company_name: data.company_name });

      return { data: client, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async update(id: string, data: UpdateClientDto): Promise<ServiceResponse<Client>> {
    try {
      const tenantId = await this.getTenantId();

      if (data.tax_id && !this.validateTaxId(data.tax_id)) {
        return {
          data: null,
          error: new Error('Invalid Israeli tax ID. Must be 9 digits.')
        };
      }

      const { data: client, error } = await supabase
        .from('clients')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('update_client', id, { changes: data });

      return { data: client, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async delete(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      await this.logAction('delete_client', id);

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  async getById(id: string): Promise<ServiceResponse<Client>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: client, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async list(
    pagination?: PaginationParams,
    filters?: FilterParams
  ): Promise<ServiceResponse<ClientsListResponse>> {
    try {
      const tenantId = await this.getTenantId();
      const { page = 1, pageSize = 20 } = pagination || {};

      // Build base query
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (filters) {
        query = this.buildFilterQuery(query, filters);
      }

      // Apply pagination and sorting
      if (pagination) {
        query = this.buildPaginationQuery(query, pagination);
      }

      const { data: clients, error, count } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return {
        data: {
          clients: clients || [],
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

  async search(searchTerm: string): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`company_name.ilike.%${searchTerm}%,company_name_hebrew.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`)
        .limit(20);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: clients || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getByTaxId(taxId: string): Promise<ServiceResponse<Client | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('tax_id', taxId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        return { data: null, error: this.handleError(error) };
      }

      return { data: client, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateStatus(id: string, status: 'active' | 'inactive' | 'pending'): Promise<ServiceResponse<Client>> {
    return this.update(id, { status });
  }

  async bulkUpdateStatus(
    ids: string[],
    status: 'active' | 'inactive' | 'pending'
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('clients')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      await this.logAction('bulk_update_status', undefined, { ids, status });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  async getStatistics(): Promise<ServiceResponse<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
  }>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: stats, error } = await supabase
        .rpc('get_client_statistics', { p_tenant_id: tenantId });

      if (error) {
        // If RPC doesn't exist, fall back to manual counting
        const { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('status')
          .eq('tenant_id', tenantId);

        if (clientError) {
          return { data: null, error: this.handleError(clientError) };
        }

        const statistics = {
          total: clients?.length || 0,
          active: clients?.filter(c => c.status === 'active').length || 0,
          inactive: clients?.filter(c => c.status === 'inactive').length || 0,
          pending: clients?.filter(c => c.status === 'pending').length || 0,
        };

        return { data: statistics, error: null };
      }

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  private validateTaxId(taxId: string): boolean {
    // Israeli tax ID validation (9 digits)
    if (!/^\d{9}$/.test(taxId)) {
      return false;
    }

    // Luhn algorithm for Israeli tax ID
    const digits = taxId.split('').map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      let num = digits[i] * ((i % 2) + 1);
      sum += num > 9 ? num - 9 : num;
    }

    return sum % 10 === 0;
  }
}

export const clientService = new ClientService();