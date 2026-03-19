/**
 * Zustand Store — Shaagat HaAri Grants
 *
 * Manages dashboard data, filters, pagination, and optimistic updates.
 * All async actions delegate to shaagatService for DB operations.
 */

import { create } from 'zustand';
import { shaagatService } from '../services/shaagat.service';
import type {
  DashboardViewRow,
  DashboardStats,
  EligibilityFilters,
  EligibilityCheckWithClient,
  EligibilityPaymentStatus,
  SubmissionStatus,
  FeasibilityCheckWithClient,
  CreateEligibilityCheckInput,
  CreateDetailedCalculationInput,
  UpdateCalculationStepInput,
  CreateTaxSubmissionInput,
  DetailedCalculation,
  TaxSubmission,
} from '../services/shaagat.service';
import type { EligibilityStatus } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface ShaagatState {
  // ── Dashboard data ──
  dashboardRows: DashboardViewRow[];
  dashboardStats: DashboardStats | null;
  dashboardLoading: boolean;
  dashboardError: Error | null;

  // ── Eligibility checks list ──
  eligibilityChecks: EligibilityCheckWithClient[];
  eligibilityLoading: boolean;
  eligibilityError: Error | null;

  // ── Feasibility checks list ──
  feasibilityChecks: FeasibilityCheckWithClient[];
  feasibilityLoading: boolean;

  // ── Active calculation (for wizard) ──
  activeCalculation: DetailedCalculation | null;
  calculationLoading: boolean;
  calculationError: Error | null;

  // ── Tax submissions ──
  taxSubmissions: TaxSubmission[];
  submissionsLoading: boolean;

  // ── Filters & pagination ──
  filters: EligibilityFilters;
  pagination: { page: number; pageSize: number; total: number };

  // ── Active view tab ──
  activeTab: 'process_hub' | 'eligibility' | 'submissions' | 'feasibility';

  // ─────────── Actions ───────────

  // Data fetching
  fetchDashboard: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  fetchEligibilityChecks: () => Promise<void>;
  fetchFeasibilityChecks: () => Promise<void>;
  fetchTaxSubmissions: () => Promise<void>;
  fetchCalculationForEligibility: (eligibilityCheckId: string) => Promise<void>;
  refreshAll: () => Promise<void>;

  // Filters & pagination
  setFilters: (filters: Partial<EligibilityFilters>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<{ page: number; pageSize: number }>) => void;
  setActiveTab: (tab: ShaagatState['activeTab']) => void;

  // Eligibility actions
  createEligibilityCheck: (
    input: CreateEligibilityCheckInput & {
      net_revenue_base: number;
      net_revenue_comparison: number;
      decline_percentage: number;
      eligibility_status: EligibilityStatus;
      compensation_rate: number;
    }
  ) => Promise<EligibilityCheckWithClient | null>;
  updateEligibilityPayment: (
    id: string,
    status: EligibilityPaymentStatus,
    paymentLink?: string
  ) => Promise<boolean>;
  markEligibilityEmailSent: (id: string) => Promise<boolean>;
  setEligibilityRelevance: (id: string, isRelevant: boolean) => Promise<boolean>;

  // Feasibility actions
  createFeasibilityCheck: (clientId: string) => Promise<FeasibilityCheckWithClient | null>;
  setFeasibilityRelevance: (id: string, isRelevant: boolean) => Promise<boolean>;

  // Calculation actions (wizard)
  createDetailedCalculation: (
    input: CreateDetailedCalculationInput
  ) => Promise<DetailedCalculation | null>;
  updateCalculationStep: (
    id: string,
    input: UpdateCalculationStepInput
  ) => Promise<DetailedCalculation | null>;
  sendCalculationToClient: (id: string) => Promise<boolean>;
  manualApproveCalculation: (id: string, note: string) => Promise<boolean>;

  // Tax submission actions
  createTaxSubmission: (
    input: CreateTaxSubmissionInput
  ) => Promise<TaxSubmission | null>;
  updateSubmissionStatus: (id: string, status: SubmissionStatus) => Promise<boolean>;
  recordAdvancePayment: (id: string, amount: number) => Promise<boolean>;

  // Optimistic updates
  optimisticUpdateEligibilityPayment: (id: string, status: EligibilityPaymentStatus) => void;
  optimisticUpdateEmailSent: (id: string) => void;
  optimisticUpdateRelevance: (id: string, isRelevant: boolean) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: EligibilityFilters = {};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useShaagatStore = create<ShaagatState>((set, get) => ({
  // Initial state
  dashboardRows: [],
  dashboardStats: null,
  dashboardLoading: false,
  dashboardError: null,
  eligibilityChecks: [],
  eligibilityLoading: false,
  eligibilityError: null,
  feasibilityChecks: [],
  feasibilityLoading: false,
  activeCalculation: null,
  calculationLoading: false,
  calculationError: null,
  taxSubmissions: [],
  submissionsLoading: false,
  filters: DEFAULT_FILTERS,
  pagination: { page: 1, pageSize: 20, total: 0 },
  activeTab: 'process_hub',

  // ──────────────────────────── Data fetching ────────────────────────────

  fetchDashboard: async () => {
    set({ dashboardLoading: true, dashboardError: null });

    try {
      const { filters, pagination } = get();
      const result = await shaagatService.getDashboardRows(
        filters,
        pagination.page,
        pagination.pageSize
      );

      if (result.error) {
        set({ dashboardError: result.error, dashboardLoading: false });
        return;
      }

      set({
        dashboardRows: result.data?.data ?? [],
        pagination: {
          ...get().pagination,
          total: result.data?.total ?? 0,
        },
        dashboardLoading: false,
      });
    } catch (error) {
      set({ dashboardError: error as Error, dashboardLoading: false });
    }
  },

  fetchDashboardStats: async () => {
    try {
      const result = await shaagatService.getDashboardStats();

      if (result.error) {
        console.error('[shaagatStore] Failed to fetch stats:', result.error);
        return;
      }

      set({ dashboardStats: result.data });
    } catch (error) {
      console.error('[shaagatStore] Failed to fetch stats:', error);
    }
  },

  fetchEligibilityChecks: async () => {
    set({ eligibilityLoading: true, eligibilityError: null });

    try {
      const { filters, pagination } = get();
      const result = await shaagatService.getEligibilityChecks(
        filters,
        pagination.page,
        pagination.pageSize
      );

      if (result.error) {
        set({ eligibilityError: result.error, eligibilityLoading: false });
        return;
      }

      set({
        eligibilityChecks: result.data?.data ?? [],
        pagination: {
          ...get().pagination,
          total: result.data?.total ?? 0,
        },
        eligibilityLoading: false,
      });
    } catch (error) {
      set({ eligibilityError: error as Error, eligibilityLoading: false });
    }
  },

  fetchFeasibilityChecks: async () => {
    set({ feasibilityLoading: true });

    try {
      const result = await shaagatService.getFeasibilityChecks(
        get().pagination.page,
        get().pagination.pageSize
      );

      if (result.error) {
        set({ feasibilityLoading: false });
        return;
      }

      set({
        feasibilityChecks: result.data?.data ?? [],
        feasibilityLoading: false,
      });
    } catch {
      set({ feasibilityLoading: false });
    }
  },

  fetchTaxSubmissions: async () => {
    set({ submissionsLoading: true });

    try {
      const result = await shaagatService.getTaxSubmissions(
        get().pagination.page,
        get().pagination.pageSize
      );

      if (result.error) {
        set({ submissionsLoading: false });
        return;
      }

      set({
        taxSubmissions: result.data?.data ?? [],
        submissionsLoading: false,
      });
    } catch {
      set({ submissionsLoading: false });
    }
  },

  fetchCalculationForEligibility: async (eligibilityCheckId: string) => {
    set({ calculationLoading: true, calculationError: null });

    try {
      const result = await shaagatService.getCalculationByEligibilityId(eligibilityCheckId);

      if (result.error) {
        set({ calculationError: result.error, calculationLoading: false });
        return;
      }

      set({ activeCalculation: result.data, calculationLoading: false });
    } catch (error) {
      set({ calculationError: error as Error, calculationLoading: false });
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchDashboard(),
      get().fetchDashboardStats(),
    ]);
  },

  // ──────────────────────────── Filters & pagination ────────────────────────────

  setFilters: (newFilters: Partial<EligibilityFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 },
    }));

    const { activeTab } = get();
    if (activeTab === 'process_hub') {
      get().fetchDashboard();
    } else if (activeTab === 'eligibility') {
      get().fetchEligibilityChecks();
    }
    get().fetchDashboardStats();
  },

  resetFilters: () => {
    set({
      filters: DEFAULT_FILTERS,
      pagination: { page: 1, pageSize: 20, total: 0 },
    });
    get().fetchDashboard();
    get().fetchDashboardStats();
  },

  setPagination: (newPagination: Partial<{ page: number; pageSize: number }>) => {
    set((state) => ({
      pagination: { ...state.pagination, ...newPagination },
    }));
    get().fetchDashboard();
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  // ──────────────────────────── Eligibility actions ────────────────────────────

  createEligibilityCheck: async (input) => {
    const result = await shaagatService.createEligibilityCheck(input);

    if (result.error || !result.data) return null;

    // Refresh dashboard to include new check
    void get().refreshAll();

    // Return with a stub client shape — the full client join is from the DB read
    return result.data as unknown as EligibilityCheckWithClient;
  },

  updateEligibilityPayment: async (id, status, paymentLink) => {
    // Optimistic update on dashboard rows
    get().optimisticUpdateEligibilityPayment(id, status);

    const result = await shaagatService.updateEligibilityPayment(id, status, paymentLink);

    if (result.error) {
      // Revert — refetch to get accurate state
      void get().fetchDashboard();
      return false;
    }

    // Update eligibilityChecks list if loaded
    set((state) => ({
      eligibilityChecks: state.eligibilityChecks.map((ec) =>
        ec.id === id ? { ...ec, payment_status: status } : ec
      ),
    }));

    return true;
  },

  markEligibilityEmailSent: async (id) => {
    get().optimisticUpdateEmailSent(id);

    const result = await shaagatService.markEligibilityEmailSent(id);

    if (result.error) {
      void get().fetchDashboard();
      return false;
    }

    set((state) => ({
      eligibilityChecks: state.eligibilityChecks.map((ec) =>
        ec.id === id ? { ...ec, email_sent: true } : ec
      ),
    }));

    return true;
  },

  setEligibilityRelevance: async (id, isRelevant) => {
    get().optimisticUpdateRelevance(id, isRelevant);

    const result = await shaagatService.setEligibilityRelevance(id, isRelevant);

    if (result.error) {
      void get().fetchDashboard();
      return false;
    }

    return true;
  },

  // ──────────────────────────── Feasibility actions ────────────────────────────

  createFeasibilityCheck: async (clientId) => {
    const result = await shaagatService.createFeasibilityCheck(clientId);

    if (result.error || !result.data) return null;

    void get().fetchFeasibilityChecks();

    // Return with stub client — caller can fetch the full record if needed
    return result.data as unknown as FeasibilityCheckWithClient;
  },

  setFeasibilityRelevance: async (id, isRelevant) => {
    set((state) => ({
      feasibilityChecks: state.feasibilityChecks.map((fc) =>
        fc.id === id ? { ...fc, is_relevant: isRelevant } : fc
      ),
    }));

    const result = await shaagatService.setFeasibilityRelevance(id, isRelevant);

    if (result.error) {
      void get().fetchFeasibilityChecks();
      return false;
    }

    return true;
  },

  // ──────────────────────────── Calculation actions ────────────────────────────

  createDetailedCalculation: async (input) => {
    set({ calculationLoading: true });

    const result = await shaagatService.createDetailedCalculation(input);

    if (result.error || !result.data) {
      set({ calculationLoading: false });
      return null;
    }

    set({ activeCalculation: result.data, calculationLoading: false });

    return result.data;
  },

  updateCalculationStep: async (id, input) => {
    const result = await shaagatService.updateCalculationStep(id, input);

    if (result.error || !result.data) return null;

    set({ activeCalculation: result.data });

    // If step 4 completed, refresh dashboard to show updated grant amount
    if (input.step === 4) {
      void get().refreshAll();
    }

    return result.data;
  },

  sendCalculationToClient: async (id) => {
    const result = await shaagatService.sendCalculationToClient(id);

    if (result.error) return false;

    set({ activeCalculation: result.data });
    void get().fetchDashboard();

    return true;
  },

  manualApproveCalculation: async (id, note) => {
    const result = await shaagatService.manualApproveCalculation(id, note);

    if (result.error) return false;

    set({ activeCalculation: result.data });
    void get().fetchDashboard();

    return true;
  },

  // ──────────────────────────── Tax submission actions ────────────────────────────

  createTaxSubmission: async (input) => {
    const result = await shaagatService.createTaxSubmission(input);

    if (result.error || !result.data) return null;

    set((state) => ({
      taxSubmissions: [result.data!, ...state.taxSubmissions],
    }));

    void get().refreshAll();

    return result.data;
  },

  updateSubmissionStatus: async (id, status) => {
    // Optimistic update
    set((state) => ({
      taxSubmissions: state.taxSubmissions.map((ts) =>
        ts.id === id ? { ...ts, status } : ts
      ),
    }));

    const result = await shaagatService.updateSubmissionStatus(id, status);

    if (result.error) {
      void get().fetchTaxSubmissions();
      return false;
    }

    void get().fetchDashboardStats();

    return true;
  },

  recordAdvancePayment: async (id, amount) => {
    const result = await shaagatService.recordAdvancePayment(id, amount);

    if (result.error) return false;

    set((state) => ({
      taxSubmissions: state.taxSubmissions.map((ts) =>
        ts.id === id && result.data ? result.data : ts
      ),
    }));

    void get().fetchDashboardStats();

    return true;
  },

  // ──────────────────────────── Optimistic updates ────────────────────────────

  optimisticUpdateEligibilityPayment: (id, status) => {
    set((state) => ({
      dashboardRows: state.dashboardRows.map((row) =>
        row.eligibility_check_id === id ? { ...row, payment_status: status } : row
      ),
    }));
  },

  optimisticUpdateEmailSent: (id) => {
    set((state) => ({
      dashboardRows: state.dashboardRows.map((row) =>
        row.eligibility_check_id === id ? { ...row, email_sent: true } : row
      ),
    }));
  },

  optimisticUpdateRelevance: (id, isRelevant) => {
    set((state) => ({
      dashboardRows: state.dashboardRows.map((row) =>
        row.eligibility_check_id === id ? { ...row, is_relevant: isRelevant } : row
      ),
      eligibilityChecks: state.eligibilityChecks.map((ec) =>
        ec.id === id ? { ...ec, is_relevant: isRelevant } : ec
      ),
    }));
  },
}));
