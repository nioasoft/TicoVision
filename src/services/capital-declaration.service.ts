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
   * Update declaration status
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
}

// Export singleton instance
export const capitalDeclarationService = new CapitalDeclarationServiceClass();
