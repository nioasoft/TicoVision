/**
 * Chat Service - Manages channels, messages, and read status
 */

import { BaseService } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type { ServiceResponse } from '@/services/base.service';
import type { ChatChannel, ChatMessage, ChatReadStatus, ChannelType } from '../types/chat.types';

class ChatService extends BaseService {
  constructor() {
    super('chat_channels');
  }

  async getChannels(): Promise<ServiceResponse<ChatChannel[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { data: data as ChatChannel[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async createChannel(name: string, type: ChannelType, clientId?: string): Promise<ServiceResponse<ChatChannel>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('chat_channels')
        .insert({
          tenant_id: tenantId,
          name,
          channel_type: type,
          client_id: clientId || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as ChatChannel, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getMessages(channelId: string, limit = 50): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      // Enrich with sender info from user_tenant_access + auth
      const senderIds = [...new Set((data ?? []).map((m: ChatMessage) => m.sender_id))];
      const senderMap = new Map<string, { email: string; name: string }>();

      if (senderIds.length > 0) {
        const { data: users } = await supabase.rpc('get_user_with_auth', {
          p_tenant_id: tenantId,
        });

        if (users) {
          for (const u of users as Array<{ user_id: string; email: string; full_name: string }>) {
            senderMap.set(u.user_id, { email: u.email, name: u.full_name || u.email });
          }
        }
      }

      const enriched = (data ?? []).map((m: ChatMessage) => ({
        ...m,
        sender_email: senderMap.get(m.sender_id)?.email,
        sender_name: senderMap.get(m.sender_id)?.name,
      }));

      return { data: enriched, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async sendMessage(channelId: string, content: string): Promise<ServiceResponse<ChatMessage>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          tenant_id: tenantId,
          channel_id: channelId,
          sender_id: user?.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getReadStatus(): Promise<ServiceResponse<ChatReadStatus[]>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('chat_read_status')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', user?.id);

      if (error) throw error;
      return { data: data as ChatReadStatus[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async markAsRead(channelId: string): Promise<ServiceResponse<null>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('chat_read_status')
        .upsert(
          {
            tenant_id: tenantId,
            channel_id: channelId,
            user_id: user?.id,
            last_read_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,channel_id,user_id' }
        );

      if (error) throw error;
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Subscribe to new messages via Supabase Realtime
   */
  subscribeToMessages(
    tenantId: string,
    onMessage: (message: ChatMessage) => void
  ) {
    return supabase
      .channel(`chat:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          onMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();
  }
}

export const chatService = new ChatService();
