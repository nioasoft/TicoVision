/**
 * Zustand Store for Collection Dashboard
 * Manages dashboard state, filters, sorting, and pagination
 */

import { create } from 'zustand';
import { collectionService } from '@/services/collection.service';
import type {
  CollectionDashboardData,
  CollectionFilters,
  CollectionSort,
  CollectionPagination,
} from '@/types/collection.types';

interface CollectionState {
  // Data
  dashboardData: CollectionDashboardData | null;
  loading: boolean;
  error: Error | null;

  // Filters
  filters: CollectionFilters;
  sort: CollectionSort;
  pagination: CollectionPagination;

  // Selection
  selectedRows: string[];

  // Actions
  fetchDashboardData: () => Promise<void>;
  setFilters: (filters: Partial<CollectionFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: CollectionSort) => void;
  setPagination: (pagination: Partial<CollectionPagination>) => void;
  toggleRowSelection: (rowId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  refreshData: () => Promise<void>;
}

const DEFAULT_FILTERS: CollectionFilters = {
  status: 'all',
  payment_method: 'all',
  time_range: '15-30',
  amount_range: 'all',
  alert_type: 'all',
};

const DEFAULT_SORT: CollectionSort = {
  column: 'letter_sent_date',
  order: 'desc',
};

const DEFAULT_PAGINATION: CollectionPagination = {
  page: 1,
  page_size: 20,
};

export const useCollectionStore = create<CollectionState>((set, get) => ({
  // Initial state
  dashboardData: null,
  loading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  sort: DEFAULT_SORT,
  pagination: DEFAULT_PAGINATION,
  selectedRows: [],

  // Fetch dashboard data
  fetchDashboardData: async () => {
    set({ loading: true, error: null });

    try {
      const { filters, sort, pagination } = get();
      const result = await collectionService.getDashboardData(filters, sort, pagination);

      if (result.error) {
        set({ error: result.error, loading: false });
        return;
      }

      set({ dashboardData: result.data, loading: false, error: null });
    } catch (error) {
      set({ error: error as Error, loading: false });
    }
  },

  // Set filters and refresh data
  setFilters: (newFilters: Partial<CollectionFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to page 1 when filtering
    }));

    // Fetch data with new filters
    get().fetchDashboardData();
  },

  // Reset filters to defaults
  resetFilters: () => {
    set({
      filters: DEFAULT_FILTERS,
      pagination: DEFAULT_PAGINATION,
    });
    get().fetchDashboardData();
  },

  // Set sort and refresh data
  setSort: (newSort: CollectionSort) => {
    set({ sort: newSort });
    get().fetchDashboardData();
  },

  // Set pagination
  setPagination: (newPagination: Partial<CollectionPagination>) => {
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    }));
    get().fetchDashboardData();
  },

  // Toggle row selection
  toggleRowSelection: (rowId: string) => {
    set((state) => {
      const isSelected = state.selectedRows.includes(rowId);
      return {
        selectedRows: isSelected
          ? state.selectedRows.filter((id) => id !== rowId)
          : [...state.selectedRows, rowId],
      };
    });
  },

  // Clear all selections
  clearSelection: () => {
    set({ selectedRows: [] });
  },

  // Select all rows
  selectAll: () => {
    const rows = get().dashboardData?.rows || [];
    const allIds = rows.map((row) => row.fee_calculation_id);
    set({ selectedRows: allIds });
  },

  // Refresh data (re-fetch with current filters)
  refreshData: async () => {
    await get().fetchDashboardData();
  },
}));
