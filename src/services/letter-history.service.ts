/**
 * Letter History Service
 * Service for managing letter history, viewing, resending, and exporting letters
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type GeneratedLetter = Database['public']['Tables']['generated_letters']['Row'];

export interface LetterHistoryFilters {
  status?: 'draft' | 'saved' | 'sent_email' | 'sent_whatsapp' | 'sent_print' | 'cancelled' | string[] | string; // Updated: new status values + array support
  templateType?: string;
  clientId?: string;
  groupId?: string; // NEW: Filter by group
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
  feeLettersOnly?: boolean; // Filter to show only fee letters
  isGeneral?: boolean; // Filter for letters without client or group (general letters)
}

export interface LetterHistoryItem extends GeneratedLetter {
  client_name?: string;
  client_company?: string;
  group_name_hebrew?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

class LetterHistoryService {
  /**
   * Get all letters (sent and drafts)
   */
  async getAllLetters(
    filters: LetterHistoryFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: 50 },
    sort: SortParams = { field: 'created_at', direction: 'desc' }
  ): Promise<{ data: LetterHistoryItem[]; total: number; error: Error | null }> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        throw new Error('No tenant ID found');
      }

      // Build query with client and group joins
      let query = supabase
        .from('generated_letters')
        .select(`
          *,
          client:clients (
            id,
            company_name,
            tax_id
          ),
          group:client_groups (
            id,
            group_name_hebrew
          )
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (filters.status) {
        // Support both single status and array of statuses
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.templateType) {
        query = query.eq('template_type', filters.templateType);
      }

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters.groupId) {
        query = query.eq('group_id', filters.groupId);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // NEW: Filter for fee letters only
      if (filters.feeLettersOnly) {
        query = query.not('fee_calculation_id', 'is', null);
      }

      // NEW: Filter for general letters (no client and no group)
      if (filters.isGeneral) {
        query = query.is('client_id', null).is('group_id', null);
      }

      // Exclude foreign worker documents from history
      // These documents should only appear in the foreign workers page
      // Must handle NULL values: include if NULL or if NOT matching foreign worker pattern
      query = query
        .or('template_type.is.null,template_type.not.ilike.foreign_worker_%')
        .or('document_type_id.is.null,document_type_id.not.ilike.foreign-workers:%');

      // Full-text search using search_vector (faster and supports Hebrew)
      if (filters.searchQuery) {
        // Convert search query to tsquery format (replace spaces with & for AND logic)
        const searchTerms = filters.searchQuery
          .trim()
          .split(/\s+/)
          .map(term => term.replace(/[^\w\u0590-\u05FF]/g, '')) // Keep only alphanumeric and Hebrew
          .filter(term => term.length > 0)
          .join(' & ');

        if (searchTerms) {
          query = query.textSearch('search_vector', searchTerms, {
            type: 'websearch',
            config: 'simple'
          });
        }
      }

      // Apply sorting
      query = query.order(sort.field, { ascending: sort.direction === 'asc' });

      // Apply pagination
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to include client_name and group info
      const transformedData: LetterHistoryItem[] = (data || []).map((letter: any) => ({
        ...letter,
        client_name: letter.client?.company_name,
        client_company: letter.client?.company_name,
        group_name_hebrew: letter.group?.group_name_hebrew,
      }));

      return {
        data: transformedData,
        total: count || 0,
        error: null,
      };
    } catch (error) {
      console.error('Error fetching letter history:', error);
      return {
        data: [],
        total: 0,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Get a single letter by ID
   */
  async getLetterById(letterId: string): Promise<{ data: GeneratedLetter | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching letter:', error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Resend letter to original recipients
   */
  async resendLetter(letterId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: letter, error: fetchError } = await this.getLetterById(letterId);

      if (fetchError || !letter) {
        throw fetchError || new Error('Letter not found');
      }

      // Get fresh session token for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      // Call send-letter Edge Function
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: letter.recipient_emails,
          recipientName: letter.variables_used?.company_name || 'לקוח יקר',
          templateType: letter.template_type,
          variables: letter.variables_used,
          clientId: letter.client_id,
          feeCalculationId: letter.fee_calculation_id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error resending letter:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Send letter to new recipients
   */
  async sendToNewRecipients(
    letterId: string,
    newEmails: string[]
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: letter, error: fetchError } = await this.getLetterById(letterId);

      if (fetchError || !letter) {
        throw fetchError || new Error('Letter not found');
      }

      // Get fresh session token for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      // Call send-letter Edge Function with new emails
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: newEmails,
          recipientName: letter.variables_used?.company_name || 'לקוח יקר',
          templateType: letter.template_type,
          variables: letter.variables_used,
          clientId: letter.client_id,
          feeCalculationId: letter.fee_calculation_id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error sending to new recipients:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Delete draft letter
   */
  async deleteDraft(letterId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      // First verify it's a draft
      const { data: letter, error: fetchError } = await this.getLetterById(letterId);

      if (fetchError || !letter) {
        throw fetchError || new Error('Letter not found');
      }

      if (!['draft', 'saved'].includes(letter.status!)) {
        throw new Error('Cannot delete sent letters - only drafts and saved letters can be deleted');
      }

      const { error } = await supabase
        .from('generated_letters')
        .delete()
        .eq('id', letterId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting draft:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Cancel a sent letter (excludes from collection tracking)
   */
  async cancelLetter(letterId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: letter, error: fetchError } = await this.getLetterById(letterId);

      if (fetchError || !letter) {
        throw fetchError || new Error('Letter not found');
      }

      // Only sent letters can be cancelled
      if (!['sent_email', 'sent_whatsapp', 'sent_print'].includes(letter.status!)) {
        throw new Error('רק מכתבים שנשלחו יכולים להתבטל');
      }

      // Get current user ID
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      const { error } = await supabase
        .from('generated_letters')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
        })
        .eq('id', letterId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error cancelling letter:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Restore a cancelled letter back to its original sent status
   */
  async restoreLetter(letterId: string, originalStatus: 'sent_email' | 'sent_whatsapp' | 'sent_print' = 'sent_email'): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: letter, error: fetchError } = await this.getLetterById(letterId);

      if (fetchError || !letter) {
        throw fetchError || new Error('Letter not found');
      }

      if (letter.status !== 'cancelled') {
        throw new Error('רק מכתבים מבוטלים יכולים לשוחזר');
      }

      const { error } = await supabase
        .from('generated_letters')
        .update({
          status: originalStatus,
          cancelled_at: null,
          cancelled_by: null,
        })
        .eq('id', letterId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error('Error restoring letter:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Get letters by client
   */
  async getLettersByClient(
    clientId: string,
    pagination: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<{ data: GeneratedLetter[]; total: number; error: Error | null }> {
    return this.getAllLetters({ clientId }, pagination);
  }

  /**
   * Get letter statistics
   */
  async getStatistics(): Promise<{
    total: number;
    sent: number;
    drafts: number;
    opened: number;
    error: Error | null;
  }> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        throw new Error('No tenant ID found');
      }

      const { data, error } = await supabase
        .from('generated_letters')
        .select('status')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const stats = {
        total: data.length,
        sent: data.filter(l => ['sent_email', 'sent_whatsapp', 'sent_print'].includes(l.status!)).length, // Updated: all sent types
        drafts: data.filter(l => ['draft', 'saved'].includes(l.status!)).length, // Updated: include saved
        opened: 0, // Deprecated: no longer tracking opens as separate status
        error: null,
      };

      return stats;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        total: 0,
        sent: 0,
        drafts: 0,
        opened: 0,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }
}

export const letterHistoryService = new LetterHistoryService();
