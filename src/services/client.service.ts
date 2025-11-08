import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams, FilterParams } from './base.service';
import { supabase } from '@/lib/supabase';
import TenantContactService from './tenant-contact.service';

// Client types
export type ClientType = 'company' | 'freelancer' | 'salary_owner' | 'partnership' | 'nonprofit';
export type CompanyStatus = 'active' | 'inactive';
export type CompanySubtype = 'commercial_restaurant' | 'commercial_other' | 'realestate' | 'holdings';
export type ActivityLevel = 'minor' | 'significant';
export type InternalExternal = 'internal' | 'external';
export type CollectionResponsibility = 'tiko' | 'shani';

// Payment role in group
export type PaymentRole = 'independent' | 'member' | 'primary_payer';

// Phone types
export type PhoneType = 'office' | 'mobile' | 'fax';

export interface ClientPhone {
  id: string;
  tenant_id: string;
  client_id: string;
  phone_type: PhoneType;
  phone_number: string;
  is_primary: boolean;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateClientPhoneDto {
  phone_type: PhoneType;
  phone_number: string;
  is_primary?: boolean;
  is_active?: boolean;
  notes?: string;
}

export interface UpdateClientPhoneDto extends Partial<CreateClientPhoneDto> {}

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
  group_name_hebrew: string; // Hebrew name only (required)
  primary_owner: string;
  secondary_owners?: string[];
  combined_billing: boolean;
  combined_letters: boolean;
  company_structure_link?: string; // Link to company structure (optional)
  canva_link?: string; // Link to Canva (optional)
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
  commercial_name?: string; // NEW: שם מסחרי
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
  is_retainer: boolean; // NEW: לקוח ריטיינר - מקבל מכתבי E1/E2
  group_id?: string;
  group?: ClientGroup; // For joined queries
  payment_role: PaymentRole; // NEW: תפקיד תשלום בקבוצה
  shareholders?: string[];
  collection_responsibility: CollectionResponsibility;
  contacts?: ClientContact[]; // For joined queries
  phones?: ClientPhone[]; // For joined queries
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
  commercial_name?: string; // NEW: שם מסחרי
  tax_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  // Accountant fields (required from client creation)
  accountant_name: string;
  accountant_email: string;
  accountant_phone: string;
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
  is_retainer?: boolean; // NEW: לקוח ריטיינר - מקבל מכתבי E1/E2
  group_id?: string;
  payment_role?: PaymentRole; // NEW: תפקיד תשלום בקבוצה
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

export class ClientService extends BaseService {
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

      // Validate required fields
      const requiredFields: Array<{ key: keyof CreateClientDto | string; label: string }> = [
        { key: 'company_name', label: 'שם החברה' },
        { key: 'commercial_name', label: 'שם מסחרי' },
        { key: 'contact_name', label: 'שם איש קשר' },
        { key: 'contact_email', label: 'אימייל איש קשר' },
        { key: 'contact_phone', label: 'טלפון איש קשר' },
        { key: 'accountant_name', label: 'שם מנהלת חשבונות' },
        { key: 'accountant_email', label: 'אימייל מנהלת חשבונות' },
        { key: 'accountant_phone', label: 'טלפון מנהלת חשבונות' },
      ];

      const missingFields = requiredFields.filter(({ key }) => {
        const value = data[key as keyof CreateClientDto];
        return !value || (typeof value === 'string' && !value.trim());
      });

      if (missingFields.length > 0) {
        return {
          data: null,
          error: new Error(
            `שדות חובה חסרים: ${missingFields.map(f => f.label).join(', ')}`
          ),
        };
      }

      // Validate address fields
      if (!data.address?.street?.trim() || !data.address?.city?.trim() || !data.address?.postal_code?.trim()) {
        return {
          data: null,
          error: new Error('שדות כתובת חובה: רחוב, עיר ומיקוד'),
        };
      }

      // Set default payment_role based on group_id
      let paymentRole = data.payment_role || 'independent';
      if (data.group_id && !data.payment_role) {
        paymentRole = 'member'; // Default to member if group selected but no role specified
      }

      // Validate primary_payer constraint
      if (data.group_id && paymentRole === 'primary_payer') {
        const validationError = await this.validatePrimaryPayer(data.group_id, paymentRole);
        if (validationError) {
          return { data: null, error: validationError };
        }
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert({
          ...data,
          payment_role: paymentRole,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Auto-create primary contact (owner) using shared contacts system
      if (data.contact_name && data.contact_email) {
        try {
          // Create or find owner in tenant_contacts
          const owner = await TenantContactService.createOrGet({
            full_name: data.contact_name,
            email: data.contact_email,
            phone: data.contact_phone || null,
            contact_type: 'owner',
            job_title: 'איש קשר מהותי',
          });

          if (owner) {
            // Assign owner to client via client_contact_assignments
            await TenantContactService.assignToClient({
              client_id: client.id,
              contact_id: owner.id,
              is_primary: true, // Owner is the primary contact
              email_preference: 'all', // Default: receives all emails
              role_at_client: 'בעל הבית',
            });
          }
        } catch (contactError) {
          console.error('Failed to create/assign primary contact:', contactError);
          // Don't fail client creation if contact creation fails
        }
      }

      // Auto-create accountant contact using shared contacts system
      if (data.accountant_name && data.accountant_email) {
        try {
          // Create or find accountant in tenant_contacts
          const accountant = await TenantContactService.createOrGet({
            full_name: data.accountant_name,
            email: data.accountant_email,
            phone: data.accountant_phone || null,
            contact_type: 'accountant_manager',
            job_title: 'מנהלת חשבונות',
          });

          if (accountant) {
            // Assign accountant to client via client_contact_assignments
            await TenantContactService.assignToClient({
              client_id: client.id,
              contact_id: accountant.id,
              is_primary: false, // Accountant is parallel to primary, not primary itself
              email_preference: 'all', // Default: receives all emails
              role_at_client: 'מנהלת חשבונות',
            });
          }
        } catch (contactError) {
          console.error('Failed to create/assign accountant contact:', contactError);
          // Don't fail client creation if contact creation fails
        }
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

      // Validate primary_payer constraint if updating payment_role or group_id
      if (data.group_id && data.payment_role === 'primary_payer') {
        const validationError = await this.validatePrimaryPayer(data.group_id, 'primary_payer', id);
        if (validationError) {
          return { data: null, error: validationError };
        }
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

      // Build base query with group join
      let query = supabase
        .from('clients')
        .select('*, group:client_groups(*)', { count: 'exact' })
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
        .select('*, group:client_groups(*)')
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
    group_name_hebrew: string; // Hebrew name only (required)
    primary_owner: string;
    secondary_owners?: string[];
    combined_billing?: boolean;
    combined_letters?: boolean;
    company_structure_link?: string; // Link to company structure
    canva_link?: string; // Link to Canva
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

      await this.logAction('create_client_group', group.id, { group_name_hebrew: data.group_name_hebrew });

      return { data: group, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateGroup(
    id: string,
    data: Partial<{
      group_name_hebrew: string; // Hebrew name only (required)
      primary_owner: string;
      secondary_owners?: string[];
      combined_billing?: boolean;
      combined_letters?: boolean;
      company_structure_link?: string; // Link to company structure
      canva_link?: string; // Link to Canva
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
        .order('group_name_hebrew', { ascending: true });

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
      logger.error('Failed to sync primary contact to client:', error);
    }
  }

  /**
   * ================================================
   * PHONE MANAGEMENT (NEW)
   * ================================================
   */

  /**
   * Get all phones for a client
   */
  async getClientPhones(clientId: string): Promise<ServiceResponse<ClientPhone[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('client_phones')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Add a new phone number for a client
   */
  async addPhone(clientId: string, data: CreateClientPhoneDto): Promise<ServiceResponse<ClientPhone>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = (await supabase.auth.getUser()).data.user;

      const phoneData = {
        tenant_id: tenantId,
        client_id: clientId,
        phone_type: data.phone_type,
        phone_number: data.phone_number,
        is_primary: data.is_primary || false,
        is_active: data.is_active !== false,
        notes: data.notes || null,
        created_by: currentUser?.id,
      };

      const { data: phone, error } = await supabase
        .from('client_phones')
        .insert(phoneData)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('add_client_phone', phone.id, {
        client_id: clientId,
        phone_type: data.phone_type,
      });

      return { data: phone, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Update an existing phone number
   */
  async updatePhone(phoneId: string, data: UpdateClientPhoneDto): Promise<ServiceResponse<ClientPhone>> {
    try {
      const tenantId = await this.getTenantId();

      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: phone, error } = await supabase
        .from('client_phones')
        .update(updateData)
        .eq('id', phoneId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_client_phone', phoneId, { updates: Object.keys(data) });

      return { data: phone, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Delete a phone number (soft delete by setting is_active = false)
   */
  async deletePhone(phoneId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if this is the primary phone
      const { data: phone } = await supabase
        .from('client_phones')
        .select('is_primary, client_id')
        .eq('id', phoneId)
        .eq('tenant_id', tenantId)
        .single();

      if (!phone) {
        throw new Error('Phone not found');
      }

      // Soft delete: set is_active = false
      const { error } = await supabase
        .from('client_phones')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', phoneId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // If this was the primary phone, promote another active phone to primary
      if (phone.is_primary) {
        const { data: nextPhone } = await supabase
          .from('client_phones')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('client_id', phone.client_id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (nextPhone) {
          await this.setPrimaryPhone(nextPhone.id);
        }
      }

      await this.logAction('delete_client_phone', phoneId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Set a phone as the primary phone for a client
   */
  async setPrimaryPhone(phoneId: string): Promise<ServiceResponse<ClientPhone>> {
    try {
      const tenantId = await this.getTenantId();

      // Get the phone and its client
      const { data: phone, error: fetchError } = await supabase
        .from('client_phones')
        .select('client_id')
        .eq('id', phoneId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;
      if (!phone) throw new Error('Phone not found');

      // Unset all other phones as primary for this client
      await supabase
        .from('client_phones')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('client_id', phone.client_id)
        .neq('id', phoneId);

      // Set this phone as primary
      const { data: updatedPhone, error: updateError } = await supabase
        .from('client_phones')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', phoneId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) throw updateError;

      await this.logAction('set_primary_phone', phoneId, { client_id: phone.client_id });

      return { data: updatedPhone, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Validate primary_payer constraint - only one primary payer per group
   * @param groupId - The group ID to check
   * @param paymentRole - The payment role being set
   * @param excludeClientId - Optional client ID to exclude from check (for updates)
   * @returns Error if validation fails, null if valid
   */
  private async validatePrimaryPayer(
    groupId: string,
    paymentRole: PaymentRole,
    excludeClientId?: string
  ): Promise<Error | null> {
    if (paymentRole !== 'primary_payer') {
      return null; // No validation needed for other roles
    }

    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('clients')
        .select('id, company_name')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .eq('payment_role', 'primary_payer')
        .eq('status', 'active');

      // Exclude current client when updating
      if (excludeClientId) {
        query = query.neq('id', excludeClientId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return this.handleError(error);
      }

      if (data) {
        return new Error(
          `הקבוצה כבר יש לה משלם ראשי: ${data.company_name}. ` +
          `רק לקוח אחד יכול להיות משלם ראשי לכל קבוצה.`
        );
      }

      return null; // Valid - no existing primary payer
    } catch (error) {
      return this.handleError(error as Error);
    }
  }

  /**
   * Check if a group already has a primary payer
   * @param groupId - The group ID to check
   * @param excludeClientId - Optional client ID to exclude from check
   * @returns true if group has a primary payer, false otherwise
   */
  async isPrimaryPayerExists(
    groupId: string,
    excludeClientId?: string
  ): Promise<boolean> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .eq('payment_role', 'primary_payer')
        .eq('status', 'active');

      if (excludeClientId) {
        query = query.neq('id', excludeClientId);
      }

      const { data } = await query.maybeSingle();
      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the primary payer client for a group
   * @param groupId - The group ID
   * @returns The primary payer client or null
   */
  async getGroupPrimaryPayer(groupId: string): Promise<ServiceResponse<Client | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .eq('payment_role', 'primary_payer')
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update client's payment role
   * @param clientId - The client ID
   * @param paymentRole - The new payment role
   * @returns Updated client or error
   */
  async updatePaymentRole(
    clientId: string,
    paymentRole: PaymentRole
  ): Promise<ServiceResponse<Client>> {
    try {
      const tenantId = await this.getTenantId();

      // Get client's group_id first
      const { data: client } = await supabase
        .from('clients')
        .select('group_id')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single();

      if (!client?.group_id && paymentRole !== 'independent') {
        return {
          data: null,
          error: new Error('לא ניתן להגדיר תפקיד תשלום ללקוח שלא שייך לקבוצה')
        };
      }

      // Validate primary_payer if needed
      if (client?.group_id && paymentRole === 'primary_payer') {
        const validationError = await this.validatePrimaryPayer(client.group_id, paymentRole, clientId);
        if (validationError) {
          return { data: null, error: validationError };
        }
      }

      // Update payment role
      const { data: updated, error } = await supabase
        .from('clients')
        .update({
          payment_role: paymentRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('update_payment_role', clientId, { payment_role: paymentRole });

      return { data: updated, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Assign client to a group with payment role
   * Handles group assignment, role validation, and updating both fields atomically
   */
  async assignClientToGroup(
    clientId: string,
    groupId: string | null,
    paymentRole: PaymentRole = 'member'
  ): Promise<ServiceResponse<Client>> {
    try {
      const tenantId = await this.getTenantId();

      // Get client's current state
      const { data: client } = await supabase
        .from('clients')
        .select('group_id, payment_role')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single();

      if (!client) {
        return {
          data: null,
          error: new Error('לקוח לא נמצא')
        };
      }

      // If removing from group, set to independent
      if (groupId === null) {
        const { data: updated, error } = await supabase
          .from('clients')
          .update({
            group_id: null,
            payment_role: 'independent',
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) {
          return { data: null, error: this.handleError(error) };
        }

        await this.logAction('remove_from_group', clientId, {
          previous_group_id: client.group_id
        });

        return { data: updated, error: null };
      }

      // Validate payment role for group assignment
      if (paymentRole === 'independent') {
        return {
          data: null,
          error: new Error('לקוח בקבוצה לא יכול להיות עצמאי. בחר "חבר קבוצה" או "משלם ראשי"')
        };
      }

      // Validate primary_payer if needed
      if (paymentRole === 'primary_payer') {
        const validationError = await this.validatePrimaryPayer(groupId, paymentRole, clientId);
        if (validationError) {
          return { data: null, error: validationError };
        }
      }

      // Assign to group with payment role
      const { data: updated, error } = await supabase
        .from('clients')
        .update({
          group_id: groupId,
          payment_role: paymentRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('assign_to_group', clientId, {
        group_id: groupId,
        payment_role: paymentRole,
        previous_group_id: client.group_id
      });

      return { data: updated, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all clients not assigned to any group
   * Useful for adding clients to groups
   */
  async getUnassignedClients(): Promise<ServiceResponse<Client[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('group_id', null)
        .eq('status', 'active')
        .order('company_name');

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: clients || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const clientService = new ClientService();