/**
 * Zustand Store for Chat System
 */

import { create } from 'zustand';
import { chatService } from '../services/chat.service';
import type { ChatChannel, ChatMessage, ChatReadStatus } from '../types/chat.types';

interface ChatState {
  channels: ChatChannel[];
  messages: ChatMessage[];
  readStatus: ChatReadStatus[];
  activeChannelId: string | null;
  panelOpen: boolean;
  loading: boolean;

  // Actions
  fetchChannels: () => Promise<void>;
  fetchMessages: (channelId: string) => Promise<void>;
  fetchReadStatus: () => Promise<void>;
  sendMessage: (content: string) => Promise<boolean>;
  markChannelAsRead: (channelId: string) => Promise<void>;
  setActiveChannel: (channelId: string) => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  addRealtimeMessage: (message: ChatMessage) => void;
  getUnreadCount: (channelId: string) => number;
  getTotalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  messages: [],
  readStatus: [],
  activeChannelId: null,
  panelOpen: false,
  loading: false,

  fetchChannels: async () => {
    const result = await chatService.getChannels();
    if (result.data) {
      set({ channels: result.data });
    }
  },

  fetchMessages: async (channelId: string) => {
    set({ loading: true });
    const result = await chatService.getMessages(channelId);
    if (result.data) {
      set({ messages: result.data, loading: false });
    } else {
      set({ loading: false });
    }
  },

  fetchReadStatus: async () => {
    const result = await chatService.getReadStatus();
    if (result.data) {
      set({ readStatus: result.data });
    }
  },

  sendMessage: async (content: string) => {
    const { activeChannelId } = get();
    if (!activeChannelId) return false;

    const result = await chatService.sendMessage(activeChannelId, content);
    if (result.error) return false;

    // Message will arrive via realtime, but add optimistically
    if (result.data) {
      set((state) => ({
        messages: [...state.messages, result.data!],
      }));
    }
    return true;
  },

  markChannelAsRead: async (channelId: string) => {
    await chatService.markAsRead(channelId);
    // Update local read status
    set((state) => ({
      readStatus: state.readStatus.map((rs) =>
        rs.channel_id === channelId
          ? { ...rs, last_read_at: new Date().toISOString() }
          : rs
      ),
    }));
  },

  setActiveChannel: (channelId: string) => {
    set({ activeChannelId: channelId, messages: [] });
    get().fetchMessages(channelId);
    get().markChannelAsRead(channelId);
  },

  togglePanel: () => {
    set((state) => ({ panelOpen: !state.panelOpen }));
  },

  setPanelOpen: (open: boolean) => {
    set({ panelOpen: open });
  },

  addRealtimeMessage: (message: ChatMessage) => {
    const { activeChannelId } = get();
    if (message.channel_id === activeChannelId) {
      // Avoid duplicates from optimistic update
      set((state) => {
        const exists = state.messages.some((m) => m.id === message.id);
        if (exists) return state;
        return { messages: [...state.messages, message] };
      });
    }
  },

  getUnreadCount: (channelId: string) => {
    const { readStatus, messages } = get();
    const rs = readStatus.find((r) => r.channel_id === channelId);
    if (!rs) return 0;
    const lastRead = new Date(rs.last_read_at);
    return messages.filter(
      (m) => m.channel_id === channelId && new Date(m.created_at) > lastRead
    ).length;
  },

  getTotalUnread: () => {
    // Simple approximation - channels without read status have unread
    const { channels, readStatus } = get();
    const readChannelIds = new Set(readStatus.map((r) => r.channel_id));
    return channels.filter((c) => !readChannelIds.has(c.id)).length;
  },
}));
