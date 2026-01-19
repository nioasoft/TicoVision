import { create } from 'zustand';
import type {
  DistributionList,
  DistributionListWithMembers,
  BroadcastHistoryRow,
  EligibleClient,
  RecipientSummary,
  SendProgress,
} from '../types/broadcast.types';
import { distributionListService } from '../services/distribution-list.service';
import { broadcastService } from '../services/broadcast.service';

interface BroadcastStore {
  // Distribution Lists
  lists: (DistributionList & { member_count: number; email_count: number })[];
  listsLoading: boolean;
  selectedList: DistributionListWithMembers | null;

  // Eligible Clients (for "All" option - only receives_letters=true)
  eligibleClients: EligibleClient[];
  eligibleClientsLoading: boolean;

  // All Active Clients (for custom list selection - ALL active clients)
  allActiveClients: EligibleClient[];
  allActiveClientsLoading: boolean;

  // Recipients Preview
  recipientSummary: RecipientSummary | null;
  recipientSummaryLoading: boolean;

  // Broadcast History
  broadcasts: BroadcastHistoryRow[];
  broadcastsLoading: boolean;

  // Send Progress
  sendProgress: SendProgress | null;

  // Actions - Lists
  fetchLists: () => Promise<void>;
  fetchListWithMembers: (id: string) => Promise<void>;
  createList: (name: string, description?: string, clientIds?: string[]) => Promise<DistributionList | null>;
  updateList: (id: string, name?: string, description?: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  setListMembers: (listId: string, clientIds: string[]) => Promise<void>;

  // Actions - Clients
  fetchEligibleClients: () => Promise<void>;
  fetchAllActiveClients: () => Promise<void>;

  // Actions - Recipients
  resolveRecipients: (listType: 'all' | 'custom', listId?: string) => Promise<void>;
  clearRecipientSummary: () => void;

  // Actions - Broadcasts
  fetchBroadcasts: () => Promise<void>;
  sendBroadcast: (broadcastId: string) => Promise<void>;
  pollProgress: (broadcastId: string) => Promise<SendProgress | null>;
  clearSendProgress: () => void;

  // Actions - Testing & Retry
  sendTestEmail: (params: { subject: string; content: string; testEmails: string[] }) => Promise<{ sent: number; failed: number } | null>;
  retryFailedRecipients: (broadcastId: string) => Promise<void>;
}

export const useBroadcastStore = create<BroadcastStore>((set, get) => ({
  // Initial state
  lists: [],
  listsLoading: false,
  selectedList: null,
  eligibleClients: [],
  eligibleClientsLoading: false,
  allActiveClients: [],
  allActiveClientsLoading: false,
  recipientSummary: null,
  recipientSummaryLoading: false,
  broadcasts: [],
  broadcastsLoading: false,
  sendProgress: null,

  // Actions - Lists
  fetchLists: async () => {
    set({ listsLoading: true });
    const { data, error } = await distributionListService.getListsWithCounts();
    if (!error && data) {
      set({ lists: data });
    }
    set({ listsLoading: false });
  },

  fetchListWithMembers: async (id: string) => {
    const { data, error } = await distributionListService.getListWithMembers(id);
    if (!error && data) {
      set({ selectedList: data });
    }
  },

  createList: async (name: string, description?: string, clientIds?: string[]) => {
    const { data, error } = await distributionListService.createList({
      name,
      description,
      client_ids: clientIds,
    });
    if (!error && data) {
      await get().fetchLists();
      return data;
    }
    return null;
  },

  updateList: async (id: string, name?: string, description?: string) => {
    const { error } = await distributionListService.updateList(id, { name, description });
    if (!error) {
      await get().fetchLists();
    }
  },

  deleteList: async (id: string) => {
    const { error } = await distributionListService.deleteList(id);
    if (!error) {
      await get().fetchLists();
    }
  },

  setListMembers: async (listId: string, clientIds: string[]) => {
    const { error } = await distributionListService.setMembers(listId, clientIds);
    if (!error) {
      await get().fetchLists();
      await get().fetchListWithMembers(listId);
    }
  },

  // Actions - Clients
  fetchEligibleClients: async () => {
    set({ eligibleClientsLoading: true });
    const { data, error } = await broadcastService.getEligibleClients();
    if (!error && data) {
      set({ eligibleClients: data });
    }
    set({ eligibleClientsLoading: false });
  },

  fetchAllActiveClients: async () => {
    set({ allActiveClientsLoading: true });
    const { data, error } = await broadcastService.getAllActiveClients();
    if (!error && data) {
      set({ allActiveClients: data });
    }
    set({ allActiveClientsLoading: false });
  },

  // Actions - Recipients
  resolveRecipients: async (listType: 'all' | 'custom', listId?: string) => {
    set({ recipientSummaryLoading: true });
    const { data, error } = await broadcastService.resolveRecipients(listType, listId);
    if (!error && data) {
      set({ recipientSummary: data });
    }
    set({ recipientSummaryLoading: false });
  },

  clearRecipientSummary: () => {
    set({ recipientSummary: null });
  },

  // Actions - Broadcasts
  fetchBroadcasts: async () => {
    set({ broadcastsLoading: true });
    const { data, error } = await broadcastService.getHistory();
    if (!error && data) {
      set({ broadcasts: data });
    }
    set({ broadcastsLoading: false });
  },

  sendBroadcast: async (broadcastId: string) => {
    await broadcastService.sendBroadcast(broadcastId);
  },

  pollProgress: async (broadcastId: string) => {
    const { data } = await broadcastService.getBroadcastProgress(broadcastId);
    if (data) {
      set({ sendProgress: data });
    }
    return data;
  },

  clearSendProgress: () => {
    set({ sendProgress: null });
  },

  // Actions - Testing & Retry
  sendTestEmail: async (params) => {
    const { data, error } = await broadcastService.sendTestEmail(params);
    if (error || !data) {
      return null;
    }
    return data;
  },

  retryFailedRecipients: async (broadcastId: string) => {
    await broadcastService.retryFailedRecipients(broadcastId);
    // Refresh broadcasts list after retry
    await get().fetchBroadcasts();
  },
}));
