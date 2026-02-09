/**
 * Zustand Store for Annual Balance Sheets
 * Manages dashboard state, filters, and pagination
 */

import { create } from 'zustand';
import { annualBalanceService } from '../services/annual-balance.service';
import type {
  AnnualBalanceSheetWithClient,
  BalanceDashboardStats,
  BalanceFilters,
  BalanceStatus,
} from '../types/annual-balance.types';

interface AnnualBalanceState {
  // Data
  cases: AnnualBalanceSheetWithClient[];
  dashboardStats: BalanceDashboardStats | null;
  loading: boolean;
  error: Error | null;

  // Filters & pagination
  filters: BalanceFilters;
  pagination: { page: number; pageSize: number; total: number };

  // Active tab
  activeTab: 'all' | 'by-auditor';

  // Actions
  fetchCases: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  setFilters: (filters: Partial<BalanceFilters>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<{ page: number; pageSize: number }>) => void;
  setActiveTab: (tab: 'all' | 'by-auditor') => void;
  refreshData: () => Promise<void>;
  optimisticUpdateStatus: (caseId: string, newStatus: BalanceStatus) => void;
  confirmAssignment: (id: string) => Promise<boolean>;
  toggleYearActivity: (id: string, isActive: boolean) => Promise<boolean>;
  updateAdvanceRate: (id: string, data: { taxAmount: number; turnover: number; currentAdvanceRate: number }) => Promise<boolean>;
}

const DEFAULT_YEAR = new Date().getFullYear() - 1; // In 2026, default to מאזני 25

const DEFAULT_FILTERS: BalanceFilters = {
  year: DEFAULT_YEAR,
  search: '',
};

export const useAnnualBalanceStore = create<AnnualBalanceState>((set, get) => ({
  // Initial state
  cases: [],
  dashboardStats: null,
  loading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  pagination: { page: 1, pageSize: 20, total: 0 },
  activeTab: 'all',

  // Fetch cases with current filters and pagination
  fetchCases: async () => {
    set({ loading: true, error: null });

    try {
      const { filters, pagination } = get();
      const result = await annualBalanceService.getAll(
        filters,
        pagination.page,
        pagination.pageSize
      );

      if (result.error) {
        set({ error: result.error, loading: false });
        return;
      }

      set({
        cases: result.data?.data ?? [],
        pagination: {
          ...get().pagination,
          total: result.data?.total ?? 0,
        },
        loading: false,
        error: null,
      });
    } catch (error) {
      set({ error: error as Error, loading: false });
    }
  },

  // Fetch dashboard stats for KPI cards
  fetchDashboardStats: async () => {
    try {
      const { filters } = get();
      const result = await annualBalanceService.getDashboardStats(filters.year);

      if (result.error) {
        console.error('Failed to fetch dashboard stats:', result.error);
        return;
      }

      set({ dashboardStats: result.data });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  },

  // Set filters and refresh
  setFilters: (newFilters: Partial<BalanceFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 },
    }));
    get().fetchCases();
    get().fetchDashboardStats();
  },

  // Reset filters to defaults
  resetFilters: () => {
    set({
      filters: DEFAULT_FILTERS,
      pagination: { page: 1, pageSize: 20, total: 0 },
    });
    get().fetchCases();
    get().fetchDashboardStats();
  },

  // Set pagination
  setPagination: (newPagination: Partial<{ page: number; pageSize: number }>) => {
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    }));
    get().fetchCases();
  },

  // Set active tab
  setActiveTab: (tab: 'all' | 'by-auditor') => {
    set({ activeTab: tab });
  },

  // Refresh all data
  refreshData: async () => {
    await Promise.all([get().fetchCases(), get().fetchDashboardStats()]);
  },

  // Optimistic status update - immediately update UI before server confirms
  optimisticUpdateStatus: (caseId: string, newStatus: BalanceStatus) => {
    set((state) => ({
      cases: state.cases.map((c) =>
        c.id === caseId
          ? { ...c, status: newStatus, updated_at: new Date().toISOString() }
          : c
      ),
    }));
  },

  // Confirm auditor assignment
  confirmAssignment: async (id: string) => {
    // Optimistic update
    set((state) => ({
      cases: state.cases.map((c) =>
        c.id === id
          ? { ...c, auditor_confirmed: true, auditor_confirmed_at: new Date().toISOString() }
          : c
      ),
    }));

    const result = await annualBalanceService.confirmAssignment(id);
    if (result.error) {
      // Revert on error
      set((state) => ({
        cases: state.cases.map((c) =>
          c.id === id ? { ...c, auditor_confirmed: false, auditor_confirmed_at: null } : c
        ),
      }));
      return false;
    }

    await get().refreshData();
    return true;
  },

  // Toggle year activity
  toggleYearActivity: async (id: string, isActive: boolean) => {
    const result = await annualBalanceService.toggleYearActivity(id, isActive);
    if (result.error) return false;

    await get().refreshData();
    return true;
  },

  // Update advance rate
  updateAdvanceRate: async (id: string, data: { taxAmount: number; turnover: number; currentAdvanceRate: number }) => {
    const result = await annualBalanceService.updateAdvanceRate(id, data);
    if (result.error) return false;

    await get().refreshData();
    return true;
  },
}));
