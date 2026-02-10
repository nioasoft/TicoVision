/**
 * Balance Chat Service
 *
 * Provides CRUD operations for balance-specific chat messages.
 * Extends BaseService with tenant isolation, sender enrichment,
 * soft-delete, and audit logging.
 *
 * Used by the Balance Chat UI (Phase 3) to display and send messages
 * within the context of an annual balance sheet.
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type {
  BalanceChatMessageRow,
  BalanceChatMessageWithSender,
} from '../types/balance-chat.types';

class BalanceChatService extends BaseService {
  constructor() {
    super('balance_chat_messages');
  }

  /**
   * Retrieve messages for a balance sheet, enriched with sender info.
   * Messages are ordered oldest-first for natural chat flow (top-to-bottom).
   * Only returns non-deleted messages.
   *
   * @param balanceId - The annual balance sheet ID to fetch messages for
   * @param limit - Maximum number of messages to return (default: 50)
   * @returns Enriched messages with sender_name and sender_email
   */
  async getMessages(
    balanceId: string,
    limit: number = 50
  ): Promise<ServiceResponse<BalanceChatMessageWithSender[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('balance_chat_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('balance_id', balanceId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const messages = (data ?? []) as BalanceChatMessageRow[];

      // Skip sender enrichment if no messages
      if (messages.length === 0) {
        return { data: [], error: null };
      }

      // Batch-fetch all tenant users for sender enrichment
      const { data: allTenantUsers } = await supabase.rpc('get_users_for_tenant');

      const userMap = new Map<string, { email: string; name: string }>();
      if (allTenantUsers) {
        for (const u of allTenantUsers) {
          userMap.set(u.user_id, {
            email: u.email,
            name: u.full_name || u.email,
          });
        }
      }

      // Enrich each message with sender display info
      const enrichedMessages: BalanceChatMessageWithSender[] = messages.map(
        (msg) => {
          const sender = userMap.get(msg.user_id);
          return {
            ...msg,
            sender_email: sender?.email ?? '',
            sender_name: sender?.name ?? '',
          };
        }
      );

      return { data: enrichedMessages, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send a new chat message in a balance sheet conversation.
   * Validates content length (1-5000 characters), inserts the message,
   * and returns the enriched result with current user info.
   *
   * @param balanceId - The annual balance sheet ID to send the message in
   * @param content - The message text content (will be trimmed)
   * @returns The created message enriched with sender info
   */
  async sendMessage(
    balanceId: string,
    content: string
  ): Promise<ServiceResponse<BalanceChatMessageWithSender>> {
    try {
      const tenantId = await this.getTenantId();

      // Authenticate current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Validate content
      const trimmedContent = content.trim();
      if (trimmedContent.length === 0 || trimmedContent.length > 5000) {
        return {
          data: null,
          error: new Error(
            'Message content must be between 1 and 5000 characters'
          ),
        };
      }

      // Insert message and retrieve the created row
      const { data, error } = await supabase
        .from('balance_chat_messages')
        .insert({
          tenant_id: tenantId,
          balance_id: balanceId,
          user_id: user.id,
          content: trimmedContent,
          message_type: 'user',
        })
        .select()
        .single();

      if (error) throw error;

      // Enrich with current user's info (no need for RPC call)
      const enrichedMessage: BalanceChatMessageWithSender = {
        ...(data as BalanceChatMessageRow),
        sender_email: user.email ?? '',
        sender_name:
          (user.user_metadata?.full_name as string) || (user.email ?? ''),
      };

      await this.logAction('send_balance_chat_message', balanceId, {
        message_id: data.id,
      });

      return { data: enrichedMessage, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Soft-delete a chat message by setting is_deleted=true.
   * Records the deletion timestamp and the user who performed it.
   * Does not hard-delete -- message remains in the database for audit.
   *
   * @param messageId - The message ID to soft-delete
   * @returns null data on success
   */
  async softDeleteMessage(
    messageId: string
  ): Promise<ServiceResponse<null>> {
    try {
      const tenantId = await this.getTenantId();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('balance_chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id ?? null,
        })
        .eq('id', messageId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('soft_delete_balance_chat_message', messageId);

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get the count of active (non-deleted) messages for a balance sheet.
   * Uses head:true for an efficient count-only query (no row data transferred).
   *
   * @param balanceId - The annual balance sheet ID to count messages for
   * @returns Integer count of active messages
   */
  async getMessageCount(
    balanceId: string
  ): Promise<ServiceResponse<number>> {
    try {
      const tenantId = await this.getTenantId();

      const { count, error } = await supabase
        .from('balance_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('balance_id', balanceId)
        .eq('is_deleted', false);

      if (error) throw error;

      return { data: count ?? 0, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Subscribe to new chat messages in real-time via Supabase Realtime.
   *
   * Creates a postgres_changes subscription on the balance_chat_messages table
   * filtered by tenant_id server-side. The balance_id filter is applied
   * client-side because Supabase Realtime only supports single-column
   * server-side filters.
   *
   * @param tenantId - The tenant ID for server-side channel filtering
   * @param balanceId - The balance sheet ID for client-side message filtering
   * @param onMessage - Callback invoked with each new non-deleted message
   * @returns The RealtimeChannel object — clean up via `supabase.removeChannel(channel)`
   */
  subscribeToBalanceChat(
    tenantId: string,
    balanceId: string,
    onMessage: (message: BalanceChatMessageRow) => void
  ) {
    return supabase
      .channel(`balance-chat:${tenantId}:${balanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'balance_chat_messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newMsg = payload.new as BalanceChatMessageRow;
          if (newMsg.balance_id === balanceId && !newMsg.is_deleted) {
            onMessage(newMsg);
          }
        }
      )
      .subscribe();
  }

  /**
   * Mark all messages as read for the current user in a specific balance chat.
   * Uses upsert (ON CONFLICT UPDATE) to either create a tracking row (first visit)
   * or reset unread_count to 0 (subsequent visits).
   *
   * Called when BalanceChatSheet opens for a balance.
   *
   * @param balanceId - The balance sheet ID to mark as read
   * @returns null on success, error on failure
   */
  async markAsRead(balanceId: string): Promise<ServiceResponse<null>> {
    try {
      const tenantId = await this.getTenantId();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { error } = await supabase
        .from('balance_chat_read_tracking')
        .upsert(
          {
            tenant_id: tenantId,
            balance_id: balanceId,
            user_id: user.id,
            unread_count: 0,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,balance_id,user_id' }
        );

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get unread message counts for all balances the current user is tracking.
   * Returns a map of balance_id -> unread_count for balances with count > 0.
   *
   * Designed for Phase 7 badge display in the balance table.
   * Single query, O(1) per badge lookup via the returned map.
   *
   * @returns Record mapping balance_id to unread count (only non-zero entries)
   */
  async getUnreadCounts(): Promise<ServiceResponse<Record<string, number>>> {
    try {
      const tenantId = await this.getTenantId();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { data: {}, error: null };

      const { data, error } = await supabase
        .from('balance_chat_read_tracking')
        .select('balance_id, unread_count')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .gt('unread_count', 0);

      if (error) throw error;

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.balance_id] = row.unread_count;
      }
      return { data: counts, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

/** Singleton instance for balance chat operations */
export const balanceChatService = new BalanceChatService();
