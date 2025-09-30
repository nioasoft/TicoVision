import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams, FilterParams } from './base.service';
import { supabase } from '@/lib/supabase';

// Client types
export type ClientType = 'company' | 'freelancer' | 'salary_owner';
export type CompanyStatus = 'active' | 'inactive';
export type CompanySubtype = 'commercial_restaurant' | 'commercial_other' | 'realestate' | 'holdings';
export type ActivityLevel = 'minor' | 'significant';
export type InternalExternal = 'internal' | 'external';
export type CollectionResponsibility = 'tiko' | 'shani';

// Contact types
export type ContactType = 'owner' | 'accountant_manager' | 'secretary' | 'cfo' | 'board_member' | 'legal_counsel' | 'other';
export type EmailPreference = 'all' | 'important_only' | 'none';

export interface ClientContact {
  id: string;
  tenant_id: string;
  client_id: string;
  contact_type: ContactType;
  full_name: string;
  email?: string;
  phone?: string;
  email_preference: EmailPreference;
  is_primary: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateClientContactDto {
  contact_type: ContactType;
  full_name: string;
  email?: string;
  phone?: string;
  email_preference?: EmailPreference;
  is_primary?: boolean;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateClientContactDto extends Partial<CreateClientContactDto> {}

export interface ClientGroup {
  id: string;
  tenant_id: string;
  group_name: string;
  group_name_hebrew?: string;
  primary_owner: string;
  secondary_owners?: string[];
  combined_billing: boolean;
  combined_letters: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  company_name: string;
  company_name_hebrew?: string;
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
  };
  status: 'active' | 'inactive' | 'pending';
  // New classification fields
  client_type: ClientType;
  company_status: CompanyStatus;
  company_subtype?: CompanySubtype;
  activity_level?: ActivityLevel;
  internal_external: InternalExternal;
  pays_fees: boolean;
  receives_letters: boolean;
  group_id?: string;
  group?: ClientGroup; // For joined queries
  shareholders?: string[];
  collection_responsibility: CollectionResponsibility;
  contacts?: ClientContact[]; // For joined queries
  // Additional fields
  business_type?: string;
  incorporation_date?: string;
  annual_revenue?: number;
  employee_count?: number;
  payment_terms?: number;
  preferred_language?: 'he' | 'en';
  assigned_accountant?: string;
  notes?: string;
  tags?: string[];
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientDto {
  company_name: string;
  company_name_hebrew?: string;
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postal_code?: string;
  };
  status?: 'active' | 'inactive' | 'pending';
  // Classification fields
  client_type?: ClientType;
  company_status?: CompanyStatus;
  company_subtype?: CompanySubtype;
  activity_level?: ActivityLevel;
  internal_external?: InternalExternal;
  pays_fees?: boolean;
  receives_letters?: boolean;
  group_id?: string;
  shareholders?: string[];
  collection_responsibility?: CollectionResponsibility;
  // Additional fields
  business_type?: string;
  incorporation_date?: string;
  annual_revenue?: number;
  employee_count?: number;
  payment_terms?: number;
  preferred_language?: 'he' | 'en';
  assigned_accountant?: string;
  notes?: string;
  tags?: string[];
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
        .select(`
          *,
          group:client_groups(*)
        `)
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

  async getClients(): Promise<ServiceResponse<ClientsListResponse>> {
    // Wrapper method for backward compatibility - returns all clients
    return this.list();
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

  async getRelatedCompanies(groupId: string): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, company_name, company_name_hebrew, tax_id, client_type')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .order('company_name');

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

  // Client Groups Management
  async createGroup(data: {
    group_name: string;
    group_name_hebrew?: string;
    primary_owner: string;
    secondary_owners?: string[];
    combined_billing?: boolean;
    combined_letters?: boolean;
    notes?: string;
  }): Promise<ServiceResponse<ClientGroup>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: group, error } = await supabase
        .from('client_groups')
        .insert({
          ...data,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('create_client_group', group.id, { group_name: data.group_name });

      return { data: group, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateGroup(
    id: string,
    data: Partial<{
      group_name: string;
      group_name_hebrew?: string;
      primary_owner: string;
      secondary_owners?: string[];
      combined_billing?: boolean;
      combined_letters?: boolean;
      notes?: string;
    }>
  ): Promise<ServiceResponse<ClientGroup>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: group, error } = await supabase
        .from('client_groups')
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

      await this.logAction('update_client_group', id, { changes: data });

      return { data: group, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getGroups(): Promise<ServiceResponse<ClientGroup[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: groups, error } = await supabase
        .from('client_groups')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('group_name', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: groups || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getGroupById(id: string): Promise<ServiceResponse<ClientGroup>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: group, error } = await supabase
        .from('client_groups')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: group, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getClientsByGroup(groupId: string): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .order('company_name', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: clients || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async deleteGroup(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // First, unlink all clients from this group
      await supabase
        .from('clients')
        .update({ group_id: null })
        .eq('tenant_id', tenantId)
        .eq('group_id', id);

      const { error } = await supabase
        .from('client_groups')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      await this.logAction('delete_client_group', id);

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  // Get clients by various filters
  async getActiveCompanies(): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_type', 'company')
        .eq('company_status', 'active');

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: clients || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getPayingClients(): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('pays_fees', true);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: clients || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getLetterRecipients(): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('receives_letters', true);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: clients || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ==================== Contact Management ====================

  /**
   * Get all contacts for a specific client
   */
  async getClientContacts(clientId: string): Promise<ServiceResponse<ClientContact[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: contacts, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: contacts || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Add a new contact to a client
   */
  async addContact(clientId: string, data: CreateClientContactDto): Promise<ServiceResponse<ClientContact>> {
    try {
      const tenantId = await this.getTenantId();

      // If this contact is marked as primary, unset other primary contacts for this client
      if (data.is_primary) {
        await supabase
          .from('client_contacts')
          .update({ is_primary: false })
          .eq('tenant_id', tenantId)
          .eq('client_id', clientId)
          .eq('is_primary', true);
      }

      const { data: contact, error } = await supabase
        .from('client_contacts')
        .insert({
          ...data,
          tenant_id: tenantId,
          client_id: clientId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log the action
      await this.logAction('add_contact', clientId, { contact_id: contact.id, contact_name: data.full_name });

      return { data: contact, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId: string, data: UpdateClientContactDto): Promise<ServiceResponse<ClientContact>> {
    try {
      const tenantId = await this.getTenantId();

      // Get the contact's client_id and current is_primary status
      const { data: existingContact } = await supabase
        .from('client_contacts')
        .select('client_id, is_primary')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      if (!existingContact) {
        return { data: null, error: new Error('Contact not found') };
      }

      // If this contact is being set as primary, unset other primary contacts
      if (data.is_primary) {
        await supabase
          .from('client_contacts')
          .update({ is_primary: false })
          .eq('tenant_id', tenantId)
          .eq('client_id', existingContact.client_id)
          .eq('is_primary', true)
          .neq('id', contactId);
      }

      const { data: contact, error } = await supabase
        .from('client_contacts')
        .update(data)
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // If this is/was a primary contact, sync to client table
      if (existingContact.is_primary || data.is_primary) {
        await this.syncPrimaryContactToClient(existingContact.client_id);
      }

      // Log the action
      await this.logAction('update_contact', existingContact.client_id, { contact_id: contactId });

      return { data: contact, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a contact (soft delete by setting is_active to false)
   */
  async deleteContact(contactId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Get the contact's client_id before deleting
      const { data: existingContact } = await supabase
        .from('client_contacts')
        .select('client_id, full_name')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      if (!existingContact) {
        return { data: null, error: new Error('Contact not found') };
      }

      const { error } = await supabase
        .from('client_contacts')
        .update({ is_active: false })
        .eq('id', contactId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log the action
      await this.logAction('delete_contact', existingContact.client_id, {
        contact_id: contactId,
        contact_name: existingContact.full_name
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Set a contact as the primary contact for a client
   */
  async setPrimaryContact(contactId: string): Promise<ServiceResponse<ClientContact>> {
    try {
      const tenantId = await this.getTenantId();

      // Get the contact's client_id
      const { data: existingContact } = await supabase
        .from('client_contacts')
        .select('client_id')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      if (!existingContact) {
        return { data: null, error: new Error('Contact not found') };
      }

      // Unset all other primary contacts for this client
      await supabase
        .from('client_contacts')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('client_id', existingContact.client_id)
        .eq('is_primary', true);

      // Set this contact as primary
      const { data: contact, error } = await supabase
        .from('client_contacts')
        .update({ is_primary: true })
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Sync primary contact to client table
      await this.syncPrimaryContactToClient(existingContact.client_id);

      // Log the action
      await this.logAction('set_primary_contact', existingContact.client_id, { contact_id: contactId });

      return { data: contact, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Sync primary contact data to the client table
   * This maintains backward compatibility with old contact fields in clients table
   */
  private async syncPrimaryContactToClient(clientId: string): Promise<void> {
    try {
      const tenantId = await this.getTenantId();

      // Get primary contact
      const { data: primaryContact } = await supabase
        .from('client_contacts')
        .select('full_name, email, phone')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .eq('is_active', true)
        .single();

      if (primaryContact) {
        // Update client table with primary contact info
        await supabase
          .from('clients')
          .update({
            contact_name: primaryContact.full_name,
            contact_email: primaryContact.email || '',
            contact_phone: primaryContact.phone || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId)
          .eq('tenant_id', tenantId);
      }
    } catch (error) {
      // Log error but don't throw - this is a sync operation
      console.error('Failed to sync primary contact to client:', error);
    }
  }
}

export const clientService = new ClientService();