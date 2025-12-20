/**
 * Capital Declaration Service
 * Manages capital declaration lifecycle, documents, and status tracking
 */

import { BaseService, type ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  CapitalDeclaration,
  CapitalDeclarationDocument,
  CapitalDeclarationStatus,
  CreateDeclarationForm,
  DeclarationWithCounts,
  CategoryDocumentCount,
  DeclarationPriority,
  DeclarationCommunication,
  CommunicationWithUser,
  CreateCommunicationDto,
  StatusHistoryEntry,
} from '@/types/capital-declaration.types';

const STORAGE_BUCKET = 'capital-declarations';

class CapitalDeclarationServiceClass extends BaseService {
  constructor() {
    super('capital_declarations');
  }

  /**
   * Generate unique public token for portal access
   */
  private generateToken(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Create new capital declaration
   */
  async create(
    form: CreateDeclarationForm,
    contactId?: string
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const declarationData = {
        tenant_id: tenantId,
        contact_name: form.contact_name,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        contact_phone_secondary: form.contact_phone_secondary || null,
        contact_id: contactId || null,
        client_id: form.client_id,
        group_id: form.group_id,
        tax_year: form.tax_year,
        declaration_date: form.declaration_date,
        subject: form.subject || 'הצהרת הון',
        google_drive_link: form.google_drive_link || null,
        notes: form.notes || null,
        status: 'draft' as CapitalDeclarationStatus,
        public_token: this.generateToken(),
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(declarationData)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_declaration', data.id, {
        tax_year: form.tax_year,
        contact_name: form.contact_name,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all declarations for tenant with pagination and filtering
   */
  async getAll(params: {
    page?: number;
    pageSize?: number;
    status?: CapitalDeclarationStatus;
    year?: number;
    searchQuery?: string;
  } = {}): Promise<ServiceResponse<{ declarations: DeclarationWithCounts[]; total: number }>> {
    try {
      const { page = 1, pageSize = 20, status, year, searchQuery } = params;
      const tenantId = await this.getTenantId();

      let query = supabase
        .from(this.tableName)
        .select(`
          *,
          clients(company_name),
          client_groups(group_name_hebrew)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (year) query = query.eq('tax_year', year);
      if (searchQuery) {
        query = query.or(`contact_name.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      // Get document counts for each declaration
      const declarations: DeclarationWithCounts[] = await Promise.all(
        (data || []).map(async (decl) => {
          const { data: counts } = await supabase.rpc('get_declaration_document_counts', {
            p_declaration_id: decl.id,
          });

          const document_counts: CategoryDocumentCount[] = (counts || []).map((c: { category: string; count: number }) => ({
            category: c.category as CategoryDocumentCount['category'],
            count: Number(c.count),
          }));

          const total_documents = document_counts.reduce((sum, c) => sum + c.count, 0);
          const categories_complete = document_counts.filter(c => c.count > 0).length;

          return {
            ...decl,
            document_counts,
            total_documents,
            categories_complete,
            client_name: decl.clients?.company_name,
            group_name: decl.client_groups?.group_name_hebrew,
          } as DeclarationWithCounts;
        })
      );

      return { data: { declarations, total: count || 0 }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get single declaration by ID
   */
  async getById(id: string): Promise<ServiceResponse<DeclarationWithCounts>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .select(`
          *,
          clients(company_name),
          client_groups(group_name_hebrew)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      // Get document counts
      const { data: counts } = await supabase.rpc('get_declaration_document_counts', {
        p_declaration_id: id,
      });

      const document_counts: CategoryDocumentCount[] = (counts || []).map((c: { category: string; count: number }) => ({
        category: c.category as CategoryDocumentCount['category'],
        count: Number(c.count),
      }));

      const total_documents = document_counts.reduce((sum, c) => sum + c.count, 0);
      const categories_complete = document_counts.filter(c => c.count > 0).length;

      return {
        data: {
          ...data,
          document_counts,
          total_documents,
          categories_complete,
          client_name: data.clients?.company_name,
          group_name: data.client_groups?.group_name_hebrew,
        } as DeclarationWithCounts,
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update declaration
   */
  async update(
    id: string,
    updates: Partial<CapitalDeclaration>
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_declaration', id, { updates });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update declaration status (simple, without history)
   * @deprecated Use updateStatusWithHistory for user-initiated changes
   */
  async updateStatus(
    id: string,
    status: CapitalDeclarationStatus
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ status })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_declaration_status', id, { status });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update declaration status with history tracking
   * Records who changed the status, when, and optional notes
   */
  async updateStatusWithHistory(
    id: string,
    newStatus: CapitalDeclarationStatus,
    notes?: string
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from(this.tableName)
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      const fromStatus = current.status as CapitalDeclarationStatus;

      // Update the status
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ status: newStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      // Record in history
      const { error: historyError } = await supabase
        .from('capital_declaration_status_history')
        .insert({
          tenant_id: tenantId,
          declaration_id: id,
          from_status: fromStatus,
          to_status: newStatus,
          notes: notes || null,
          changed_by: user.id,
          changed_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Failed to record status history:', historyError);
        // Don't fail the whole operation, status was updated successfully
      }

      await this.logAction('update_declaration_status', id, {
        from_status: fromStatus,
        to_status: newStatus,
        notes
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get status change history for a declaration
   */
  async getStatusHistory(declarationId: string): Promise<ServiceResponse<StatusHistoryEntry[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('capital_declaration_status_history')
        .select('*')
        .eq('declaration_id', declarationId)
        .eq('tenant_id', tenantId)
        .order('changed_at', { ascending: false });

      if (error) throw error;

      // Get user names for display
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(h => h.changed_by))];
        const { data: users } = await supabase.auth.admin.listUsers();

        // If admin API fails, try to get user metadata from user_tenant_access
        const { data: utaData } = await supabase
          .from('user_tenant_access')
          .select('user_id, full_name')
          .in('user_id', userIds);

        const userMap = new Map<string, string>();
        if (utaData) {
          utaData.forEach(u => userMap.set(u.user_id, u.full_name || 'משתמש'));
        }

        // Add names to history entries
        const historyWithNames = data.map(h => ({
          ...h,
          changed_by_name: userMap.get(h.changed_by) || 'משתמש'
        }));

        return { data: historyWithNames as StatusHistoryEntry[], error: null };
      }

      return { data: data as StatusHistoryEntry[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete declaration
   */
  async delete(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Delete documents from storage first
      const { data: docs } = await supabase
        .from('capital_declaration_documents')
        .select('storage_path')
        .eq('declaration_id', id);

      if (docs && docs.length > 0) {
        const paths = docs.map(d => d.storage_path);
        await supabase.storage.from(STORAGE_BUCKET).remove(paths);
      }

      // Delete declaration (cascade will delete document records)
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('delete_declaration', id);

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get documents for a declaration
   */
  async getDocuments(declarationId: string): Promise<ServiceResponse<CapitalDeclarationDocument[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('capital_declaration_documents')
        .select('*')
        .eq('declaration_id', declarationId)
        .eq('tenant_id', tenantId)
        .order('category', { ascending: true })
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get signed URL for document download
   */
  async getDocumentUrl(storagePath: string): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (error || !data) throw error || new Error('Failed to generate URL');

      return { data: data.signedUrl, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get document first
      const { data: doc, error: fetchError } = await supabase
        .from('capital_declaration_documents')
        .select('*')
        .eq('id', documentId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !doc) throw new Error('Document not found');

      // Delete from storage
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]);

      // Delete from database
      const { error } = await supabase
        .from('capital_declaration_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      await this.logAction('delete_declaration_document', documentId, {
        declaration_id: doc.declaration_id,
        file_name: doc.file_name,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Link declaration to generated letter
   */
  async linkLetter(declarationId: string, letterId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from(this.tableName)
        .update({ letter_id: letterId })
        .eq('id', declarationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get portal link for sharing
   * Always uses production URL for links that are sent to clients
   */
  getPortalLink(token: string): string {
    // Use production URL, not window.location.origin (which could be localhost)
    const baseUrl = 'https://ticovision.vercel.app';
    return `${baseUrl}/capital-declaration/${token}`;
  }

  /**
   * Get years with declarations (for filtering)
   */
  async getAvailableYears(): Promise<ServiceResponse<number[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .select('tax_year')
        .eq('tenant_id', tenantId)
        .order('tax_year', { ascending: false });

      if (error) throw error;

      const years = [...new Set((data || []).map(d => d.tax_year))];

      return { data: years, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // DASHBOARD METHODS
  // ============================================================================

  /**
   * Update declaration priority
   */
  async updatePriority(
    id: string,
    priority: DeclarationPriority
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ priority })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_declaration_priority', id, { priority });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Assign declaration to accountant
   */
  async updateAssignment(
    id: string,
    userId: string | null
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          assigned_to: userId,
          assigned_at: userId ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_declaration_assignment', id, { assigned_to: userId });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update tax authority due date (official deadline)
   */
  async updateTaxAuthorityDueDate(
    id: string,
    dueDate: string | null
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ tax_authority_due_date: dueDate })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_tax_authority_due_date', id, { tax_authority_due_date: dueDate });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update internal due date (manager set deadline)
   */
  async updateInternalDueDate(
    id: string,
    dueDate: string | null
  ): Promise<ServiceResponse<CapitalDeclaration>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .update({ internal_due_date: dueDate })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_internal_due_date', id, { internal_due_date: dueDate });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Upload tax authority due date document (request screenshot)
   */
  async uploadTaxAuthorityDueDateDocument(
    declarationId: string,
    file: File
  ): Promise<ServiceResponse<string>> {
    try {
      const tenantId = await this.getTenantId();

      // Generate unique path
      const ext = file.name.split('.').pop() || 'png';
      const path = `${tenantId}/${declarationId}/tax-authority-request.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update declaration with path
      const { error: updateError } = await supabase
        .from(this.tableName)
        .update({ tax_authority_due_date_document_path: path })
        .eq('id', declarationId)
        .eq('tenant_id', tenantId);

      if (updateError) throw updateError;

      await this.logAction('upload_tax_authority_document', declarationId, { path });

      return { data: path, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get signed URL for due date document
   */
  async getDueDateDocumentUrl(storagePath: string): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600); // 1 hour

      if (error || !data) throw error || new Error('Failed to generate URL');

      return { data: data.signedUrl, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // COMMUNICATION METHODS
  // ============================================================================

  /**
   * Get communications for a declaration
   */
  async getCommunications(
    declarationId: string
  ): Promise<ServiceResponse<CommunicationWithUser[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('capital_declaration_communications')
        .select('*')
        .eq('declaration_id', declarationId)
        .eq('tenant_id', tenantId)
        .order('communicated_at', { ascending: false });

      if (error) throw error;

      // Get user names for created_by
      const communications: CommunicationWithUser[] = await Promise.all(
        (data || []).map(async (comm) => {
          let created_by_name: string | undefined;
          if (comm.created_by) {
            // Use RPC to get user info instead of admin API
            const { data: userInfo } = await supabase.rpc('get_user_info', {
              p_user_id: comm.created_by,
            });

            if (userInfo?.[0]) {
              created_by_name = userInfo[0].full_name || userInfo[0].email?.split('@')[0] || undefined;
            }
          }

          return {
            ...comm,
            created_by_name,
          } as CommunicationWithUser;
        })
      );

      return { data: communications, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Log a new communication
   */
  async logCommunication(
    dto: CreateCommunicationDto
  ): Promise<ServiceResponse<DeclarationCommunication>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const communicationData = {
        tenant_id: tenantId,
        declaration_id: dto.declaration_id,
        communication_type: dto.communication_type,
        direction: dto.direction || 'outbound',
        subject: dto.subject || null,
        content: dto.content || null,
        outcome: dto.outcome || null,
        letter_id: dto.letter_id || null,
        communicated_at: dto.communicated_at || new Date().toISOString(),
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('capital_declaration_communications')
        .insert(communicationData)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('log_declaration_communication', data.id, {
        declaration_id: dto.declaration_id,
        communication_type: dto.communication_type,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get communication count for a declaration
   */
  async getCommunicationCount(declarationId: string): Promise<ServiceResponse<number>> {
    try {
      const tenantId = await this.getTenantId();

      const { count, error } = await supabase
        .from('capital_declaration_communications')
        .select('*', { count: 'exact', head: true })
        .eq('declaration_id', declarationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      return { data: count || 0, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get last communication date for a declaration
   */
  async getLastCommunicationDate(declarationId: string): Promise<ServiceResponse<string | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('capital_declaration_communications')
        .select('communicated_at')
        .eq('declaration_id', declarationId)
        .eq('tenant_id', tenantId)
        .order('communicated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { data: data?.communicated_at || null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // DASHBOARD QUERY METHODS
  // ============================================================================

  /**
   * Get all declarations with dashboard sorting and filtering
   * Sort order: critical first → urgent → by due_date (closest first) → by created_at
   */
  async getDashboard(params: {
    page?: number;
    pageSize?: number;
    status?: CapitalDeclarationStatus | CapitalDeclarationStatus[];
    year?: number;
    searchQuery?: string;
    priority?: DeclarationPriority;
    assignedTo?: string; // Filter by assigned accountant
  } = {}): Promise<ServiceResponse<{ declarations: DeclarationWithCounts[]; total: number }>> {
    try {
      const { page = 1, pageSize = 20, status, year, searchQuery, priority, assignedTo } = params;
      const tenantId = await this.getTenantId();

      let query = supabase
        .from(this.tableName)
        .select(`
          *,
          clients(company_name),
          client_groups(group_name_hebrew)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          query = query.in('status', status);
        } else {
          query = query.eq('status', status);
        }
      }
      if (year) query = query.eq('tax_year', year);
      if (priority) query = query.eq('priority', priority);
      if (assignedTo) query = query.eq('assigned_to', assignedTo);
      if (searchQuery) {
        query = query.or(`contact_name.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`);
      }

      // Get all for client-side sorting (we'll paginate after sorting)
      const { data: allData, count, error } = await query;

      if (error) throw error;

      // Sort by priority then tax_authority_due_date
      const sortedData = (allData || []).sort((a, b) => {
        // 1. Critical first
        if (a.priority === 'critical' && b.priority !== 'critical') return -1;
        if (b.priority === 'critical' && a.priority !== 'critical') return 1;

        // 2. Urgent second
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;

        // 3. By tax_authority_due_date (closest first, nulls last)
        if (a.tax_authority_due_date && b.tax_authority_due_date) {
          return new Date(a.tax_authority_due_date).getTime() - new Date(b.tax_authority_due_date).getTime();
        }
        if (a.tax_authority_due_date && !b.tax_authority_due_date) return -1;
        if (!a.tax_authority_due_date && b.tax_authority_due_date) return 1;

        // 4. By created_at (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Paginate
      const from = (page - 1) * pageSize;
      const paginatedData = sortedData.slice(from, from + pageSize);

      // Enrich with document counts and communication info
      const declarations: DeclarationWithCounts[] = await Promise.all(
        paginatedData.map(async (decl) => {
          // Get document counts
          const { data: counts } = await supabase.rpc('get_declaration_document_counts', {
            p_declaration_id: decl.id,
          });

          const document_counts: CategoryDocumentCount[] = (counts || []).map((c: { category: string; count: number }) => ({
            category: c.category as CategoryDocumentCount['category'],
            count: Number(c.count),
          }));

          const total_documents = document_counts.reduce((sum, c) => sum + c.count, 0);
          const categories_complete = document_counts.filter(c => c.count > 0).length;

          // Get last communication
          const { data: lastComm } = await supabase
            .from('capital_declaration_communications')
            .select('communicated_at')
            .eq('declaration_id', decl.id)
            .order('communicated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get communication count
          const { count: commCount } = await supabase
            .from('capital_declaration_communications')
            .select('*', { count: 'exact', head: true })
            .eq('declaration_id', decl.id);

          // Get assigned user name
          let assigned_to_name: string | undefined;
          if (decl.assigned_to) {
            const { data: userData } = await supabase.rpc('get_user_email', {
              p_user_id: decl.assigned_to,
            });
            if (userData) {
              assigned_to_name = userData;
            }
          }

          return {
            ...decl,
            document_counts,
            total_documents,
            categories_complete,
            client_name: decl.clients?.company_name,
            group_name: decl.client_groups?.group_name_hebrew,
            assigned_to_name,
            last_communication_at: lastComm?.communicated_at || null,
            communication_count: commCount || 0,
          } as DeclarationWithCounts;
        })
      );

      return { data: { declarations, total: count || 0 }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get accountants in tenant for assignment dropdown
   */
  async getTenantAccountants(): Promise<ServiceResponse<{ id: string; name: string; email: string }[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('user_tenant_access')
        .select('user_id, role')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('role', ['admin', 'accountant']);

      if (error) throw error;

      // Get user details for each
      const accountants = await Promise.all(
        (data || []).map(async (uta) => {
          const { data: userInfo } = await supabase.rpc('get_user_info', {
            p_user_id: uta.user_id,
          });

          const info = userInfo?.[0] || { email: '', full_name: 'Unknown' };

          return {
            id: uta.user_id,
            name: info.full_name || info.email?.split('@')[0] || 'Unknown',
            email: info.email || '',
          };
        })
      );

      return { data: accountants, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Generate WhatsApp link for reminder
   */
  generateWhatsAppLink(
    phone: string,
    contactName: string,
    taxYear: number,
    portalLink: string,
    tenantName: string,
    assignedAccountantName?: string
  ): string {
    // Format phone for WhatsApp (remove leading 0, add 972)
    let formattedPhone = phone.replace(/[\s-]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '972' + formattedPhone.slice(1);
    }

    // Build signature:
    // [שם רואה החשבון המטפל]
    // משרד רואי חשבון
    // [שם המשרד]
    const signatureLines = [];
    if (assignedAccountantName) {
      signatureLines.push(assignedAccountantName);
    }
    signatureLines.push('משרד רואי חשבון');
    signatureLines.push(tenantName);
    const signature = signatureLines.join('\n');

    const message = `שלום ${contactName},

זוהי תזכורת בנוגע להצהרת ההון לשנת ${taxYear}.
נא להעלות את המסמכים הנדרשים בקישור:
${portalLink}

בברכה,
${signature}`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  }
}

// Export singleton instance
export const capitalDeclarationService = new CapitalDeclarationServiceClass();
