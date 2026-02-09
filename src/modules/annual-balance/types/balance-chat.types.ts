/**
 * Balance Chat Message Types
 *
 * Type definitions for the balance-specific chat system.
 * These types support the BalanceChatService CRUD operations
 * (getMessages, sendMessage, softDeleteMessage, getMessageCount).
 *
 * NOTE: This is separate from the channel-based chat system
 * in src/modules/chat/. Balance chat messages are linked to
 * annual_balance_sheets via balance_id.
 */

import type { Database } from '@/types/database.types';

/**
 * Raw database row type for balance_chat_messages table.
 * Used internally by BalanceChatService for query results before enrichment.
 */
export type BalanceChatMessageRow =
  Database['public']['Tables']['balance_chat_messages']['Row'];

/**
 * Insert type for creating new balance chat messages.
 * Used by BalanceChatService.sendMessage() to construct insert payloads.
 */
export type BalanceChatMessageInsert =
  Database['public']['Tables']['balance_chat_messages']['Insert'];

/**
 * Update type for modifying balance chat messages.
 * Used by BalanceChatService.softDeleteMessage() for partial updates
 * (is_deleted, deleted_at, deleted_by).
 */
export type BalanceChatMessageUpdate =
  Database['public']['Tables']['balance_chat_messages']['Update'];

/**
 * Literal union for the message_type column.
 * Matches the CHECK constraint on balance_chat_messages.message_type.
 * - 'user': Regular message sent by a team member
 * - 'system': Auto-generated message (e.g., status change notification)
 */
export type MessageType = 'user' | 'system';

/**
 * Enriched message type with sender display information.
 * Returned by BalanceChatService.getMessages() and sendMessage()
 * after joining sender data from the get_users_for_tenant RPC.
 */
export interface BalanceChatMessageWithSender extends BalanceChatMessageRow {
  /** Email address of the message author */
  sender_email: string;
  /** Display name of the message author (full_name or email fallback) */
  sender_name: string;
}
