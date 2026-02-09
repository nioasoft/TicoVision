/**
 * Types for the Internal Chat System
 */

export type ChannelType = 'general' | 'client' | 'direct';

export interface ChatChannel {
  id: string;
  tenant_id: string;
  name: string;
  channel_type: ChannelType;
  client_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ChatMessage {
  id: string;
  tenant_id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  /** Joined from auth - populated by service */
  sender_email?: string;
  sender_name?: string;
}

export interface ChatReadStatus {
  id: string;
  tenant_id: string;
  channel_id: string;
  user_id: string;
  last_read_at: string;
}

export interface ChannelWithUnread extends ChatChannel {
  unread_count: number;
  last_message?: ChatMessage;
}
