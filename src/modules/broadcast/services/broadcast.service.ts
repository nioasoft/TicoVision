import { BaseService } from '@/services/base.service';
import type { ServiceResponse, PaginationParams } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type {
  Broadcast,
  BroadcastRecipient,
  BroadcastHistoryRow,
  BroadcastDetails,
  CreateBroadcastDto,
  EligibleClient,
  ResolvedRecipient,
  RecipientSummary,
  ClientBroadcastEmail,
  SendProgress,
} from '../types/broadcast.types';

class BroadcastService extends BaseService {
  constructor() {
    super('broadcasts');
  }

  /**
   * Get all clients eligible for broadcast (receives_letters=true, status=active)
   * Used for the "All clients" general list
   */
  async getEligibleClients(): Promise<ServiceResponse<EligibleClient[]>> {
    try {
      const { data, error } = await supabase.rpc('get_broadcast_eligible_clients');

      if (error) throw this.handleError(error);

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get ALL active clients regardless of receives_letters setting
   * Used for custom list creation where user manually selects clients
   */
  async getAllActiveClients(): Promise<ServiceResponse<EligibleClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          company_name,
          company_name_hebrew,
          tax_id
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('company_name', { ascending: true });

      if (error) throw this.handleError(error);

      // Get contact counts for each client
      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client) => {
          const { count: contactCount } = await supabase
            .from('client_contact_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          const { count: emailCount } = await supabase
            .from('client_contact_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id)
            .neq('email_preference', 'none');

          return {
            client_id: client.id,
            company_name: client.company_name,
            company_name_hebrew: client.company_name_hebrew,
            tax_id: client.tax_id,
            contact_count: contactCount || 0,
            email_count: emailCount || 0,
          };
        })
      );

      return { data: clientsWithCounts, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Resolve recipients for a broadcast (get all emails)
   */
  async resolveRecipients(
    listType: 'all' | 'custom',
    listId?: string
  ): Promise<ServiceResponse<RecipientSummary>> {
    try {
      let clients: EligibleClient[];

      if (listType === 'all') {
        // Get all eligible clients
        const { data, error } = await supabase.rpc('get_broadcast_eligible_clients');
        if (error) throw this.handleError(error);
        clients = data || [];
      } else if (listId) {
        // Get members of the specific list
        const { data, error } = await supabase.rpc('get_list_members_with_details', {
          p_list_id: listId,
        });
        if (error) throw this.handleError(error);
        clients = (data || []).map((m: Record<string, unknown>) => ({
          client_id: m.client_id as string,
          company_name: m.company_name as string,
          company_name_hebrew: m.company_name_hebrew as string | null,
          tax_id: m.tax_id as string,
          contact_count: m.contact_count as number,
          email_count: m.email_count as number,
        }));
      } else {
        return { data: null, error: new Error('List ID is required for custom list type') };
      }

      // Get detailed contact info for each client
      const resolvedClients: ResolvedRecipient[] = await Promise.all(
        clients.map(async (client) => {
          const { data: emails } = await supabase.rpc('get_client_broadcast_emails', {
            p_client_id: client.client_id,
          });

          return {
            client_id: client.client_id,
            company_name: client.company_name,
            company_name_hebrew: client.company_name_hebrew,
            contacts: (emails || []).map((e: ClientBroadcastEmail) => ({
              contact_id: e.contact_id,
              full_name: e.full_name,
              email: e.email,
            })),
          };
        })
      );

      const totalEmails = resolvedClients.reduce((sum, c) => sum + c.contacts.length, 0);

      const summary: RecipientSummary = {
        total_clients: resolvedClients.length,
        total_emails: totalEmails,
        clients: resolvedClients,
      };

      return { data: summary, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create a new broadcast (draft status)
   */
  async createBroadcast(dto: CreateBroadcastDto): Promise<ServiceResponse<Broadcast>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Resolve recipients to get count
      const { data: recipients, error: recipientsError } = await this.resolveRecipients(
        dto.list_type,
        dto.list_id
      );

      if (recipientsError) throw recipientsError;

      // Create the broadcast
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          tenant_id: tenantId,
          name: dto.name,
          subject: dto.subject,
          list_type: dto.list_type,
          list_id: dto.list_id || null,
          template_type: dto.template_type || null,
          custom_content_html: dto.custom_content_html || null,
          includes_payment_section: dto.includes_payment_section || false,
          recipient_count: recipients?.total_clients || 0,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();

      if (broadcastError) throw this.handleError(broadcastError);

      // Create recipient records
      if (recipients && recipients.clients.length > 0) {
        const recipientRecords = recipients.clients.flatMap((client) =>
          client.contacts.map((contact) => ({
            broadcast_id: broadcast.id,
            client_id: client.client_id,
            contact_id: contact.contact_id,
            email: contact.email,
            recipient_name: contact.full_name,
            status: 'pending' as const,
          }))
        );

        const { error: insertError } = await supabase
          .from('broadcast_recipients')
          .insert(recipientRecords);

        if (insertError) throw this.handleError(insertError);
      }

      await this.logAction('create_broadcast', broadcast.id, { name: dto.name });

      return { data: broadcast, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Send a broadcast (triggers the edge function)
   */
  async sendBroadcast(broadcastId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Update status to sending
      const { error: updateError } = await supabase
        .from('broadcasts')
        .update({
          status: 'sending',
          started_at: new Date().toISOString(),
        })
        .eq('id', broadcastId);

      if (updateError) throw this.handleError(updateError);

      // Call the edge function
      const { error: functionError } = await supabase.functions.invoke('send-broadcast', {
        body: {
          broadcastId,
          tenantId,
        },
      });

      if (functionError) {
        // Revert status on error
        await supabase
          .from('broadcasts')
          .update({ status: 'failed' })
          .eq('id', broadcastId);

        throw functionError;
      }

      await this.logAction('send_broadcast', broadcastId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get broadcast progress (for polling during send)
   */
  async getBroadcastProgress(broadcastId: string): Promise<ServiceResponse<SendProgress>> {
    try {
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .select('id, status, recipient_count, total_emails_sent, total_emails_failed')
        .eq('id', broadcastId)
        .single();

      if (broadcastError) throw this.handleError(broadcastError);

      const total = broadcast.recipient_count || 0;
      const sent = broadcast.total_emails_sent || 0;
      const failed = broadcast.total_emails_failed || 0;
      const processed = sent + failed;

      const progress: SendProgress = {
        broadcast_id: broadcast.id,
        status: broadcast.status,
        total,
        sent,
        failed,
        progress_percent: total > 0 ? Math.round((processed / total) * 100) : 0,
      };

      return { data: progress, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get broadcast history with pagination
   */
  async getHistory(params: PaginationParams = {}): Promise<ServiceResponse<BroadcastHistoryRow[]>> {
    try {
      const tenantId = await this.getTenantId();
      const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('broadcasts')
        .select(`
          *,
          distribution_lists (
            name
          )
        `)
        .eq('tenant_id', tenantId)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (error) throw this.handleError(error);

      // Flatten the response
      const history: BroadcastHistoryRow[] = (data || []).map((b) => ({
        ...b,
        list_name: b.distribution_lists?.name || undefined,
      }));

      return { data: history, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get detailed broadcast info with recipients
   */
  async getDetails(broadcastId: string): Promise<ServiceResponse<BroadcastDetails>> {
    try {
      // Get broadcast with list name
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .select(`
          *,
          distribution_lists (
            name
          )
        `)
        .eq('id', broadcastId)
        .single();

      if (broadcastError) throw this.handleError(broadcastError);

      // Get recipients
      const { data: recipients, error: recipientsError } = await supabase
        .from('broadcast_recipients')
        .select('*')
        .eq('broadcast_id', broadcastId)
        .order('recipient_name', { ascending: true });

      if (recipientsError) throw this.handleError(recipientsError);

      const recipientsList = recipients || [];

      // Calculate stats
      const stats = {
        pending: recipientsList.filter((r) => r.status === 'pending').length,
        sent: recipientsList.filter((r) => r.status === 'sent').length,
        failed: recipientsList.filter((r) => r.status === 'failed').length,
        skipped: recipientsList.filter((r) => r.status === 'skipped').length,
        opened: recipientsList.filter((r) => r.opened_at).length,
        open_rate: 0,
      };
      stats.open_rate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;

      const details: BroadcastDetails = {
        ...broadcast,
        list_name: broadcast.distribution_lists?.name || undefined,
        recipients: recipientsList,
        stats,
      };

      return { data: details, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Cancel an in-progress broadcast
   */
  async cancelBroadcast(broadcastId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('broadcasts')
        .update({ status: 'cancelled' })
        .eq('id', broadcastId)
        .eq('status', 'sending'); // Only cancel if currently sending

      if (error) throw this.handleError(error);

      await this.logAction('cancel_broadcast', broadcastId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a draft broadcast
   */
  async deleteBroadcast(broadcastId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('broadcasts')
        .delete()
        .eq('id', broadcastId)
        .eq('status', 'draft'); // Only delete drafts

      if (error) throw this.handleError(error);

      await this.logAction('delete_broadcast', broadcastId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

export const broadcastService = new BroadcastService();
