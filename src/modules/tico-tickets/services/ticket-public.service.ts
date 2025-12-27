import { supabase } from '@/lib/supabase';
import type {
  PublicTicketView,
  PublicReplyView,
  PublicTicketSubmission,
  TicketSubmissionResult,
  CategoryWithSubcategories,
} from '../types/ticket.types';

/**
 * Public service for Tico Tickets
 * No authentication required - uses public token for access
 */
class TicketPublicServiceClass {
  /**
   * Get ticket by public token for tracking page
   */
  async getByToken(token: string): Promise<PublicTicketView | null> {
    try {
      // Call RPC function that handles tracking
      const { data, error } = await supabase.rpc('get_ticket_by_public_token', {
        p_token: token,
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const ticket = data[0];

      // Get public replies
      const { data: replies } = await supabase.rpc('get_public_ticket_replies', {
        p_token: token,
      });

      return {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        status_key: ticket.status_key,
        status_name: ticket.status_name,
        status_color: ticket.status_color,
        priority: ticket.priority,
        category_name: ticket.category_name,
        subcategory_name: ticket.subcategory_name,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        resolved_at: ticket.resolved_at,
        tenant_name: ticket.tenant_name,
        replies: (replies || []).map((r: {
          id: string;
          content: string;
          is_from_client: boolean;
          sender_name: string;
          created_at: string;
        }) => ({
          id: r.id,
          content: r.content,
          is_from_client: r.is_from_client,
          sender_name: r.sender_name,
          created_at: r.created_at,
        })),
      };
    } catch (error) {
      console.error('Error fetching ticket by token:', error);
      return null;
    }
  }

  /**
   * Submit a new ticket via public form
   * Uses direct Supabase insert with service role for now
   * TODO: Move to Edge Function for email confirmation
   */
  async submit(data: PublicTicketSubmission): Promise<TicketSubmissionResult> {
    try {
      // Get default tenant (for now, later will use tenant_slug)
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single();

      if (tenantError || !tenant) {
        return { success: false, error: 'Tenant not found' };
      }

      // Get default status
      const { data: defaultStatus, error: statusError } = await supabase
        .from('support_ticket_statuses')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_default_for_new', true)
        .single();

      if (statusError || !defaultStatus) {
        return { success: false, error: 'Default status not configured' };
      }

      // Insert ticket (trigger will handle client matching and ticket_number)
      const { data: ticket, error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          tenant_id: tenant.id,
          submitter_name: data.submitter_name,
          submitter_email: data.submitter_email,
          submitter_phone: data.submitter_phone || null,
          submitter_company_name: data.submitter_company_name || null,
          submitter_tax_id: data.submitter_tax_id || null,
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
          subject: data.subject,
          description: data.description,
          status_id: defaultStatus.id,
          source: 'public_form',
          priority: 'normal',
        })
        .select('ticket_number, public_token')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return { success: false, error: 'Failed to create ticket' };
      }

      return {
        success: true,
        ticket_number: ticket.ticket_number,
        tracking_url: `/tico-tickets/track/${ticket.public_token}`,
      };
    } catch (error) {
      console.error('Error submitting ticket:', error);
      return {
        success: false,
        error: 'Failed to submit ticket. Please try again.',
      };
    }
  }

  /**
   * Add a reply from the client via public portal
   */
  async addClientReply(token: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get ticket info from token
      const { data: ticket, error: fetchError } = await supabase
        .from('support_tickets')
        .select('id, tenant_id, submitter_name, submitter_email')
        .eq('public_token', token)
        .single();

      if (fetchError || !ticket) {
        return { success: false, error: 'Ticket not found' };
      }

      // Insert reply
      const { error } = await supabase.from('support_ticket_replies').insert({
        tenant_id: ticket.tenant_id,
        ticket_id: ticket.id,
        content,
        is_internal: false,
        is_from_client: true,
        sender_name: ticket.submitter_name,
        sender_email: ticket.submitter_email,
      });

      if (error) {
        return { success: false, error: 'Failed to add reply' };
      }

      // Update ticket's updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.id);

      return { success: true };
    } catch (error) {
      console.error('Error adding client reply:', error);
      return { success: false, error: 'Failed to add reply' };
    }
  }

  /**
   * Get categories for public form
   * Uses default tenant or specified tenant slug
   */
  async getCategories(tenantSlug?: string): Promise<CategoryWithSubcategories[]> {
    try {
      // For now, get categories from the default tenant
      // In production, you'd resolve tenant by slug or subdomain
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .single();

      if (!tenant) {
        return [];
      }

      const { data, error } = await supabase
        .from('support_ticket_categories')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error || !data) {
        return [];
      }

      // Organize into hierarchy
      const mainCategories = data.filter(c => c.level === 1);
      const subcategories = data.filter(c => c.level === 2);

      return mainCategories.map(cat => ({
        ...cat,
        subcategories: subcategories
          .filter(sub => sub.parent_id === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export const ticketPublicService = new TicketPublicServiceClass();
