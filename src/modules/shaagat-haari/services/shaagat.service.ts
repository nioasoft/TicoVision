/**
 * Shaagat HaAri Grants — Service
 *
 * Handles all DB operations for the grants module.
 * Extends BaseService for tenant isolation via getTenantId().
 *
 * Tables:
 *   shaagat_feasibility_checks       — stage 0 external form
 *   shaagat_eligibility_checks       — full eligibility check
 *   shaagat_detailed_calculations    — 4-step wizard data + results
 *   shaagat_tax_submissions          — tax authority submission tracking
 *   shaagat_tax_letters              — incoming/outgoing letters
 *   shaagat_accounting_submissions   — salary data from accountant
 *   shaagat_bank_details             — client bank details (external form)
 *   shaagat_email_logs               — email audit log
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type {
  TrackType,
  BusinessType,
  ReportingType,
  EligibilityStatus,
} from '../types/shaagat.types';
import type { GrantBreakdown } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Domain types that mirror DB tables
// ─────────────────────────────────────────────────────────────────────────────

export type FeasibilityPaymentStatus = 'none' | 'pending' | 'paid';
export type EligibilityPaymentStatus = 'UNPAID' | 'PAID' | 'EXEMPT';
export type SubmissionStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'OBJECTIONS'
  | 'PARTIAL_PAYMENT'
  | 'FULL_PAYMENT'
  | 'CLOSED';
export type TaxLetterType =
  | 'OBJECTION'
  | 'REJECTION'
  | 'PARTIAL_APPROVAL'
  | 'FULL_APPROVAL'
  | 'INFO_REQUEST'
  | 'INFO_RESPONSE'
  | 'APPEAL_SUBMITTED'
  | 'ADVANCE_RECEIVED'
  | 'DETERMINATION'
  | 'OTHER';
export type TaxLetterStatus = 'PENDING' | 'HANDLED' | 'EXPIRED' | 'INFO_ONLY';
export type EmailLogType =
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'GRAY_AREA'
  | 'DETAILED_CALCULATION'
  | 'SUBMISSION_CONFIRMATION'
  | 'ACCOUNTING_FORM_REQUEST'
  | 'SALARY_DATA_REQUEST';

// ─── Feasibility ───

export interface FeasibilityCheck {
  id: string;
  tenant_id: string;
  client_id: string;
  public_token: string;
  token_expires_at: string | null;
  revenue_base: number | null;
  revenue_comparison: number | null;
  decline_percentage: number | null;
  has_feasibility: boolean;
  client_interested: boolean | null;
  interested_at: string | null;
  payment_status: FeasibilityPaymentStatus;
  payment_received_at: string | null;
  accessed_at: string | null;
  submitted_at: string | null;
  submitted_from_ip: string | null;
  is_relevant: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeasibilityCheckWithClient extends FeasibilityCheck {
  client: {
    id: string;
    company_name: string;
    tax_id: string;
  };
}

// ─── Eligibility ───

export interface EligibilityCheck {
  id: string;
  tenant_id: string;
  client_id: string;
  track_type: TrackType;
  business_type: BusinessType;
  reporting_type: ReportingType;
  annual_revenue: number;
  annual_revenue_2022: number | null;
  revenue_base_period: number;
  revenue_comparison_period: number;
  revenue_base_period_label: string | null;
  revenue_comparison_period_label: string | null;
  capital_revenues_base: number;
  capital_revenues_comparison: number;
  self_accounting_revenues_base: number;
  self_accounting_revenues_comparison: number;
  net_revenue_base: number;
  net_revenue_comparison: number;
  decline_percentage: number;
  eligibility_status: EligibilityStatus;
  compensation_rate: number;
  payment_status: EligibilityPaymentStatus;
  payment_link: string | null;
  payment_received_at: string | null;
  email_sent: boolean;
  is_active: boolean;
  is_relevant: boolean;
  version: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface EligibilityCheckWithClient extends EligibilityCheck {
  client: {
    id: string;
    company_name: string;
    tax_id: string;
  };
}

// ─── Detailed calculation ───

export interface DetailedCalculation {
  id: string;
  tenant_id: string;
  client_id: string;
  eligibility_check_id: string;
  track_type: TrackType;
  business_type: BusinessType;
  reporting_type: ReportingType;
  compensation_rate: number;
  decline_percentage: number;
  annual_revenue: number;
  revenue_base_period: number;
  revenue_comparison_period: number;
  vat_inputs: number;
  zero_vat_inputs: number;
  inputs_months: number;
  use_enhanced_rate: boolean;
  expense_rent: number;
  expense_electricity: number;
  expense_water: number;
  expense_phone_internet: number;
  expense_insurance: number;
  expense_maintenance: number;
  expense_other_fixed: number;
  expense_other_description: string | null;
  total_actual_fixed_expenses: number;
  monthly_avg_inputs: number;
  effective_compensation_rate: number;
  salary_gross: number;
  num_employees: number;
  miluim_deductions: number;
  tips_deductions: number;
  chalat_deductions: number;
  vacation_deductions: number;
  miluim_count: number;
  tips_count: number;
  chalat_count: number;
  vacation_count: number;
  total_deductions: number;
  salary_after_deductions: number;
  employer_cost_multiplier: number;
  adjusted_salary: number;
  effective_decline: number;
  employees_after_deductions: number;
  fixed_expenses_grant: number;
  salary_grant_before_cap: number;
  salary_grant_cap: number;
  salary_grant: number;
  total_calculated_grant: number;
  grant_cap: number;
  final_grant_amount: number;
  contractor_multiplier_applied: boolean;
  grant_before_contractor_multiplier: number;
  small_track_amount: number;
  used_small_track: boolean;
  constants_version: string;
  calculation_step: number;
  is_completed: boolean;
  is_sent_to_client: boolean;
  sent_at: string | null;
  client_approved: boolean | null;
  client_approved_at: string | null;
  client_rejection_reason: string | null;
  approval_token: string | null;
  approval_token_expires_at: string | null;
  manual_approval: boolean;
  manual_approval_note: string | null;
  manual_approved_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ─── Tax submission ───

export interface TaxSubmission {
  id: string;
  tenant_id: string;
  client_id: string;
  calculation_id: string;
  submission_number: string;
  submission_screenshot_url: string;
  submission_date: string | null;
  status: SubmissionStatus;
  expected_amount: number | null;
  received_amount: number;
  documents_due_date: string | null;
  advance_due_date: string | null;
  determination_due_date: string | null;
  full_payment_due_date: string | null;
  objection_due_date: string | null;
  objection_determination_date: string | null;
  appeal_due_date: string | null;
  advance_received: boolean;
  advance_amount: number;
  advance_received_at: string | null;
  responses: unknown[];
  corrections: unknown[];
  payment_info: Record<string, unknown>;
  is_closed: boolean;
  closed_at: string | null;
  closure_reason: string | null;
  closure_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ─── Dashboard view row ───

export interface DashboardViewRow {
  eligibility_check_id: string;
  tenant_id: string;
  client_id: string;
  company_name: string;
  tax_id: string;
  track_type: TrackType;
  business_type: BusinessType;
  reporting_type: ReportingType;
  eligibility_status: EligibilityStatus;
  decline_percentage: number;
  compensation_rate: number;
  payment_status: EligibilityPaymentStatus;
  email_sent: boolean;
  is_relevant: boolean;
  check_date: string;
  calculation_id: string | null;
  calculation_completed: boolean | null;
  final_grant_amount: number | null;
  client_approved: boolean | null;
  calculation_step: number | null;
  submission_id: string | null;
  submission_status: SubmissionStatus | null;
  submission_number: string | null;
  expected_amount: number | null;
  received_amount: number | null;
  advance_due_date: string | null;
  determination_due_date: string | null;
  full_payment_due_date: string | null;
  pending_letters_count: number;
}

// ─── Dashboard stats (from RPC) ───

export interface DashboardStats {
  total_clients: number;
  eligible: number;
  not_eligible: number;
  gray_area: number;
  paid: number;
  calculations_completed: number;
  submitted_to_tax: number;
  pending_deadlines: number;
  total_expected_amount: number;
  total_received_amount: number;
}

// ─── Filters ───

export interface EligibilityFilters {
  search?: string;
  eligibility_status?: EligibilityStatus;
  track_type?: TrackType;
  payment_status?: EligibilityPaymentStatus;
  is_relevant?: boolean;
}

// ─── Initial filter screen ───

/**
 * Row from `shaagat_initial_filter_view` — every active client plus their
 * latest Shaagat HaAri lifecycle data (eligibility / salary form / calculation
 * / submission). All stage-related fields are NULL when the client has not
 * reached that stage yet.
 *
 * The unified dashboard derives a per-row Stage from these fields via
 * `lib/stage-derivation.ts`.
 */
export interface InitialFilterRow {
  client_id: string;
  tenant_id: string;
  company_name: string | null;
  company_name_hebrew: string | null;
  tax_id: string;
  client_status: string;

  // Latest eligibility check (NULL when never checked)
  eligibility_check_id: string | null;
  eligibility_status: EligibilityStatus | null;
  decline_percentage: number | null;
  compensation_rate: number | null;
  shaagat_fee_payment_status: EligibilityPaymentStatus | null;
  email_sent: boolean | null;
  is_relevant: boolean | null;
  check_created_at: string | null;
  track_type: TrackType | null;
  reporting_type: ReportingType | null;
  business_type: BusinessType | null;

  // Annual retainer (current calendar year)
  has_unpaid_annual_retainer: boolean;
  has_any_current_year_fee: boolean;

  // Accounting submission (the salary form filled out by the client)
  accounting_submission_id: string | null;
  accounting_submitted_at: string | null;

  // Detailed calculation (4-step wizard)
  calculation_id: string | null;
  calculation_step: number | null;
  calculation_completed: boolean | null;
  client_approved: boolean | null;
  client_approved_at: string | null;
  final_grant_amount: number | null;

  // Tax submission
  submission_id: string | null;
  submission_status: SubmissionStatus | null;
  submission_number: string | null;
  submission_date: string | null;
  expected_amount: number | null;
  received_amount: number | null;
  advance_received: boolean | null;
  advance_due_date: string | null;
  determination_due_date: string | null;
  full_payment_due_date: string | null;
  submission_is_closed: boolean | null;
}

export type InitialFilterEligibilityStatus =
  | 'all'
  | 'not_checked'
  | EligibilityStatus;

export interface InitialFilterFilters {
  search?: string;
  eligibilityStatus?: InitialFilterEligibilityStatus;
  /** undefined = show all, true = only with unpaid retainer, false = only paid/none */
  unpaidRetainerOnly?: boolean;
}

// ─── Create inputs ───

export interface CreateEligibilityCheckInput {
  client_id: string;
  track_type: TrackType;
  business_type: BusinessType;
  reporting_type: ReportingType;
  annual_revenue: number;
  annual_revenue_2022?: number;
  revenue_base_period: number;
  revenue_comparison_period: number;
  revenue_base_period_label?: string;
  revenue_comparison_period_label?: string;
  capital_revenues_base?: number;
  capital_revenues_comparison?: number;
  self_accounting_revenues_base?: number;
  self_accounting_revenues_comparison?: number;
  notes?: string;
}

export interface CreateDetailedCalculationInput {
  eligibility_check_id: string;
  client_id: string;
  track_type: TrackType;
  business_type: BusinessType;
  reporting_type: ReportingType;
  compensation_rate: number;
  decline_percentage: number;
  annual_revenue: number;
  revenue_base_period: number;
  revenue_comparison_period: number;
}

export interface UpdateCalculationStepInput {
  step: 2 | 3 | 4;
  // Step 2 — fixed expenses
  vat_inputs?: number;
  zero_vat_inputs?: number;
  inputs_months?: number;
  use_enhanced_rate?: boolean;
  expense_rent?: number;
  expense_electricity?: number;
  expense_water?: number;
  expense_phone_internet?: number;
  expense_insurance?: number;
  expense_maintenance?: number;
  expense_other_fixed?: number;
  expense_other_description?: string;
  // Step 3 — salary
  salary_gross?: number;
  num_employees?: number;
  miluim_deductions?: number;
  tips_deductions?: number;
  chalat_deductions?: number;
  vacation_deductions?: number;
  miluim_count?: number;
  tips_count?: number;
  chalat_count?: number;
  vacation_count?: number;
  // Step 4 — computed results (written from calculation engine output)
  breakdown?: GrantBreakdown;
}

export interface CreateTaxSubmissionInput {
  calculation_id: string;
  client_id: string;
  submission_number: string;
  submission_screenshot_url: string;
  submission_date?: string;
  expected_amount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class ShaagatService extends BaseService {
  constructor() {
    super('shaagat_eligibility_checks');
  }

  // ──────────────────────────── Dashboard ────────────────────────────

  /**
   * Fetch dashboard stats via RPC function (aggregated counts + amounts).
   */
  async getDashboardStats(): Promise<ServiceResponse<DashboardStats>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase.rpc('get_shaagat_dashboard_stats', {
        p_tenant_id: tenantId,
      });

      if (error) throw error;

      return { data: data as DashboardStats, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Fetch dashboard view rows (eligibility + calculation + submission joined).
   * Used as the main table on the process hub.
   */
  async getDashboardRows(
    filters: EligibilityFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<{ data: DashboardViewRow[]; total: number }>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('shaagat_dashboard_view')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      if (filters.eligibility_status) {
        query = query.eq('eligibility_status', filters.eligibility_status);
      }
      if (filters.track_type) {
        query = query.eq('track_type', filters.track_type);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.is_relevant !== undefined) {
        query = query.eq('is_relevant', filters.is_relevant);
      }
      if (filters.search) {
        query = query.or(
          `company_name.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('check_date', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: {
          data: (data ?? []) as DashboardViewRow[],
          total: count ?? 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Initial Filter ────────────────────────────

  /**
   * Fetch the initial filter rows: every active client for the tenant plus
   * their latest Shaagat HaAri eligibility check (if any) plus a flag
   * indicating unpaid annual retainer for the current calendar year.
   *
   * Backed by `shaagat_initial_filter_view`.
   *
   * Filtering is done client-side in the UI for now (small dataset). Search
   * is applied here for performance over Hebrew/English/tax_id columns.
   */
  async getInitialFilterRows(
    filters: InitialFilterFilters = {}
  ): Promise<ServiceResponse<InitialFilterRow[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('shaagat_initial_filter_view')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters.search) {
        const term = filters.search.trim();
        if (term.length > 0) {
          query = query.or(
            `company_name.ilike.%${term}%,company_name_hebrew.ilike.%${term}%,tax_id.ilike.%${term}%`
          );
        }
      }

      if (filters.unpaidRetainerOnly === true) {
        query = query.eq('has_unpaid_annual_retainer', true);
      }

      // eligibilityStatus is filtered client-side because 'not_checked' maps to
      // NULL eligibility_check_id which is awkward in PostgREST `or` clauses.

      query = query.order('company_name_hebrew', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data ?? []) as InitialFilterRow[];

      if (filters.eligibilityStatus && filters.eligibilityStatus !== 'all') {
        rows = rows.filter((r) =>
          filters.eligibilityStatus === 'not_checked'
            ? r.eligibility_check_id === null
            : r.eligibility_status === filters.eligibilityStatus
        );
      }

      return { data: rows, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Feasibility ────────────────────────────

  /**
   * Get all feasibility checks for the tenant.
   */
  async getFeasibilityChecks(
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<{ data: FeasibilityCheckWithClient[]; total: number }>> {
    try {
      const tenantId = await this.getTenantId();

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('shaagat_feasibility_checks')
        .select('*, client:clients(id, company_name, tax_id)', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: {
          data: (data ?? []) as unknown as FeasibilityCheckWithClient[],
          total: count ?? 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a feasibility check for a client (generates public_token server-side).
   */
  async createFeasibilityCheck(
    clientId: string
  ): Promise<ServiceResponse<FeasibilityCheck>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Generate a URL-safe token (48 random chars)
      const token = Array.from(crypto.getRandomValues(new Uint8Array(36)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('shaagat_feasibility_checks')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          public_token: token,
          token_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_feasibility_check', data.id, {
        client_id: clientId,
        user_id: user?.id,
      });

      return { data: data as FeasibilityCheck, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Toggle is_relevant for a feasibility check.
   */
  async setFeasibilityRelevance(
    id: string,
    isRelevant: boolean
  ): Promise<ServiceResponse<FeasibilityCheck>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_feasibility_checks')
        .update({ is_relevant: isRelevant })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as FeasibilityCheck, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Eligibility ────────────────────────────

  /**
   * Get all eligibility checks for the tenant with client join.
   */
  async getEligibilityChecks(
    filters: EligibilityFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<{ data: EligibilityCheckWithClient[]; total: number }>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('shaagat_eligibility_checks')
        .select('*, client:clients(id, company_name, tax_id)', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (filters.eligibility_status) {
        query = query.eq('eligibility_status', filters.eligibility_status);
      }
      if (filters.track_type) {
        query = query.eq('track_type', filters.track_type);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.is_relevant !== undefined) {
        query = query.eq('is_relevant', filters.is_relevant);
      }
      if (filters.search) {
        // Two-step search: client name/tax_id first, then filter by client_id
        const { data: matchingClients } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', tenantId)
          .or(
            `company_name.ilike.%${filters.search}%,tax_id.ilike.%${filters.search}%`
          );

        const ids = matchingClients?.map((c) => c.id) ?? [];
        if (ids.length === 0) {
          return { data: { data: [], total: 0 }, error: null };
        }
        query = query.in('client_id', ids);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('updated_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: {
          data: (data ?? []) as unknown as EligibilityCheckWithClient[],
          total: count ?? 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get a single eligibility check by ID.
   */
  async getEligibilityCheckById(
    id: string
  ): Promise<ServiceResponse<EligibilityCheckWithClient>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_eligibility_checks')
        .select('*, client:clients(id, company_name, tax_id)')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data: data as unknown as EligibilityCheckWithClient, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all eligibility checks for a specific client.
   */
  async getEligibilityChecksByClient(
    clientId: string
  ): Promise<ServiceResponse<EligibilityCheck[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_eligibility_checks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('version', { ascending: false });

      if (error) throw error;

      return { data: (data ?? []) as EligibilityCheck[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a new eligibility check.
   * Stores input fields; the caller is responsible for running calculateEligibility()
   * and providing the computed fields (net_revenue_base etc.) via the input.
   */
  async createEligibilityCheck(
    input: CreateEligibilityCheckInput & {
      net_revenue_base: number;
      net_revenue_comparison: number;
      decline_percentage: number;
      eligibility_status: EligibilityStatus;
      compensation_rate: number;
    }
  ): Promise<ServiceResponse<EligibilityCheck>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('shaagat_eligibility_checks')
        .insert({
          tenant_id: tenantId,
          client_id: input.client_id,
          track_type: input.track_type,
          business_type: input.business_type,
          reporting_type: input.reporting_type,
          annual_revenue: input.annual_revenue,
          annual_revenue_2022: input.annual_revenue_2022 ?? null,
          revenue_base_period: input.revenue_base_period,
          revenue_comparison_period: input.revenue_comparison_period,
          revenue_base_period_label: input.revenue_base_period_label ?? null,
          revenue_comparison_period_label: input.revenue_comparison_period_label ?? null,
          capital_revenues_base: input.capital_revenues_base ?? 0,
          capital_revenues_comparison: input.capital_revenues_comparison ?? 0,
          self_accounting_revenues_base: input.self_accounting_revenues_base ?? 0,
          self_accounting_revenues_comparison: input.self_accounting_revenues_comparison ?? 0,
          net_revenue_base: input.net_revenue_base,
          net_revenue_comparison: input.net_revenue_comparison,
          decline_percentage: input.decline_percentage,
          eligibility_status: input.eligibility_status,
          compensation_rate: input.compensation_rate,
          notes: input.notes ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_eligibility_check', data.id, {
        client_id: input.client_id,
        eligibility_status: input.eligibility_status,
        compensation_rate: input.compensation_rate,
      });

      return { data: data as EligibilityCheck, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update payment status for an eligibility check.
   */
  async updateEligibilityPayment(
    id: string,
    paymentStatus: EligibilityPaymentStatus,
    paymentLink?: string
  ): Promise<ServiceResponse<EligibilityCheck>> {
    try {
      const tenantId = await this.getTenantId();

      const updateData: Record<string, unknown> = { payment_status: paymentStatus };
      if (paymentStatus === 'PAID') {
        updateData.payment_received_at = new Date().toISOString();
      }
      if (paymentLink !== undefined) {
        updateData.payment_link = paymentLink;
      }

      const { data, error } = await supabase
        .from('shaagat_eligibility_checks')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as EligibilityCheck, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark email as sent for an eligibility check.
   */
  async markEligibilityEmailSent(id: string): Promise<ServiceResponse<EligibilityCheck>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_eligibility_checks')
        .update({ email_sent: true })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as EligibilityCheck, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Toggle is_relevant for an eligibility check.
   */
  async setEligibilityRelevance(
    id: string,
    isRelevant: boolean
  ): Promise<ServiceResponse<EligibilityCheck>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_eligibility_checks')
        .update({ is_relevant: isRelevant })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as EligibilityCheck, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Detailed Calculation ────────────────────────────

  /**
   * Get a detailed calculation by eligibility_check_id (most recent active).
   */
  async getCalculationByEligibilityId(
    eligibilityCheckId: string
  ): Promise<ServiceResponse<DetailedCalculation | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_detailed_calculations')
        .select('*')
        .eq('eligibility_check_id', eligibilityCheckId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { data: data as DetailedCalculation | null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a new detailed calculation (Step 1 — from eligibility data).
   */
  async createDetailedCalculation(
    input: CreateDetailedCalculationInput
  ): Promise<ServiceResponse<DetailedCalculation>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('shaagat_detailed_calculations')
        .insert({
          tenant_id: tenantId,
          client_id: input.client_id,
          eligibility_check_id: input.eligibility_check_id,
          track_type: input.track_type,
          business_type: input.business_type,
          reporting_type: input.reporting_type,
          compensation_rate: input.compensation_rate,
          decline_percentage: input.decline_percentage,
          annual_revenue: input.annual_revenue,
          revenue_base_period: input.revenue_base_period,
          revenue_comparison_period: input.revenue_comparison_period,
          calculation_step: 1,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_detailed_calculation', data.id, {
        eligibility_check_id: input.eligibility_check_id,
      });

      return { data: data as DetailedCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update calculation step data.
   * For step 4: pass breakdown to persist all computed results.
   */
  async updateCalculationStep(
    id: string,
    input: UpdateCalculationStepInput
  ): Promise<ServiceResponse<DetailedCalculation>> {
    try {
      const tenantId = await this.getTenantId();

      const updateData: Record<string, unknown> = {
        calculation_step: input.step,
      };

      if (input.step === 2) {
        Object.assign(updateData, {
          vat_inputs: input.vat_inputs ?? 0,
          zero_vat_inputs: input.zero_vat_inputs ?? 0,
          inputs_months: input.inputs_months ?? 12,
          use_enhanced_rate: input.use_enhanced_rate ?? false,
          expense_rent: input.expense_rent ?? 0,
          expense_electricity: input.expense_electricity ?? 0,
          expense_water: input.expense_water ?? 0,
          expense_phone_internet: input.expense_phone_internet ?? 0,
          expense_insurance: input.expense_insurance ?? 0,
          expense_maintenance: input.expense_maintenance ?? 0,
          expense_other_fixed: input.expense_other_fixed ?? 0,
          expense_other_description: input.expense_other_description ?? null,
          total_actual_fixed_expenses:
            (input.expense_rent ?? 0) +
            (input.expense_electricity ?? 0) +
            (input.expense_water ?? 0) +
            (input.expense_phone_internet ?? 0) +
            (input.expense_insurance ?? 0) +
            (input.expense_maintenance ?? 0) +
            (input.expense_other_fixed ?? 0),
        });
      }

      if (input.step === 3) {
        Object.assign(updateData, {
          salary_gross: input.salary_gross ?? 0,
          num_employees: input.num_employees ?? 0,
          miluim_deductions: input.miluim_deductions ?? 0,
          tips_deductions: input.tips_deductions ?? 0,
          chalat_deductions: input.chalat_deductions ?? 0,
          vacation_deductions: input.vacation_deductions ?? 0,
          miluim_count: input.miluim_count ?? 0,
          tips_count: input.tips_count ?? 0,
          chalat_count: input.chalat_count ?? 0,
          vacation_count: input.vacation_count ?? 0,
        });
      }

      if (input.step === 4 && input.breakdown) {
        const b = input.breakdown;
        Object.assign(updateData, {
          monthly_avg_inputs: b.fixedExpenses.monthlyAvgInputs,
          effective_compensation_rate: b.fixedExpenses.effectiveRate,
          total_deductions: b.salary.totalDeductions,
          salary_after_deductions: b.salary.salaryAfterDeductions,
          employer_cost_multiplier:
            b.eligibility.compensationRate, // multiplier is derived from businessType — stored at calculation level
          adjusted_salary: b.salary.adjustedSalary,
          effective_decline: b.salary.effectiveDecline,
          employees_after_deductions: b.salary.employeesAfterDeductions,
          fixed_expenses_grant: b.fixedExpenses.fixedExpensesGrant,
          salary_grant_before_cap: b.salary.salaryGrantBeforeCap,
          salary_grant_cap: b.salary.salaryCap,
          salary_grant: b.salary.salaryGrant,
          total_calculated_grant: b.totalGrant,
          grant_cap: b.grantCap,
          final_grant_amount: b.finalGrantAmount,
          contractor_multiplier_applied: b.contractorAdjustedGrant !== undefined,
          grant_before_contractor_multiplier: b.contractorAdjustedGrant !== undefined
            ? b.finalGrantAmount
            : 0,
          small_track_amount: b.smallBusinessGrant ?? 0,
          used_small_track:
            b.smallBusinessGrant !== undefined &&
            b.recommendedAmount === b.smallBusinessGrant,
          is_completed: true,
        });
      }

      const { data, error } = await supabase
        .from('shaagat_detailed_calculations')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as DetailedCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send calculation result to client — generates approval token, sets is_sent_to_client.
   */
  async sendCalculationToClient(id: string): Promise<ServiceResponse<DetailedCalculation>> {
    try {
      const tenantId = await this.getTenantId();

      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from('shaagat_detailed_calculations')
        .update({
          is_sent_to_client: true,
          sent_at: new Date().toISOString(),
          approval_token: token,
          approval_token_expires_at: expiresAt.toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('send_calculation_to_client', id);

      return { data: data as DetailedCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Manual approval by accountant (bypass client approval).
   */
  async manualApproveCalculation(
    id: string,
    note: string
  ): Promise<ServiceResponse<DetailedCalculation>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('shaagat_detailed_calculations')
        .update({
          manual_approval: true,
          manual_approval_note: note,
          manual_approved_by: user?.id ?? null,
          client_approved: true,
          client_approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('manual_approve_calculation', id, { note });

      return { data: data as DetailedCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Tax Submissions ────────────────────────────

  /**
   * Get all active (non-closed) submissions for the tenant.
   */
  async getTaxSubmissions(
    page: number = 1,
    pageSize: number = 20
  ): Promise<ServiceResponse<{ data: TaxSubmission[]; total: number }>> {
    try {
      const tenantId = await this.getTenantId();

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('shaagat_tax_submissions')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .eq('is_closed', false)
        .range(from, to)
        .order('submission_date', { ascending: false });

      if (error) throw error;

      return {
        data: {
          data: (data ?? []) as TaxSubmission[],
          total: count ?? 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get a single submission by ID.
   */
  async getTaxSubmissionById(id: string): Promise<ServiceResponse<TaxSubmission>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_tax_submissions')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data: data as TaxSubmission, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a new tax submission.
   * submission_number and submission_screenshot_url are mandatory per the migration.
   */
  async createTaxSubmission(
    input: CreateTaxSubmissionInput
  ): Promise<ServiceResponse<TaxSubmission>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('shaagat_tax_submissions')
        .insert({
          tenant_id: tenantId,
          client_id: input.client_id,
          calculation_id: input.calculation_id,
          submission_number: input.submission_number,
          submission_screenshot_url: input.submission_screenshot_url,
          submission_date: input.submission_date ?? new Date().toISOString(),
          expected_amount: input.expected_amount ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_tax_submission', data.id, {
        calculation_id: input.calculation_id,
        submission_number: input.submission_number,
      });

      return { data: data as TaxSubmission, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update submission status.
   */
  async updateSubmissionStatus(
    id: string,
    status: SubmissionStatus
  ): Promise<ServiceResponse<TaxSubmission>> {
    try {
      const tenantId = await this.getTenantId();

      const updateData: Record<string, unknown> = { status };
      if (status === 'CLOSED') {
        updateData.is_closed = true;
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('shaagat_tax_submissions')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_submission_status', id, { status });

      return { data: data as TaxSubmission, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Record advance payment received.
   */
  async recordAdvancePayment(
    id: string,
    amount: number
  ): Promise<ServiceResponse<TaxSubmission>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_tax_submissions')
        .update({
          advance_received: true,
          advance_amount: amount,
          advance_received_at: new Date().toISOString(),
          status: 'PARTIAL_PAYMENT',
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data: data as TaxSubmission, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Accounting submissions ────────────────────────────

  /**
   * Create an empty accounting submission row with a unique public token so the
   * client can fill it out via the public salary-data form. Returns the token
   * (NOT the full row — the row only gets populated when the client submits).
   *
   * Used by the unified dashboard when the accountant clicks "send salary form".
   */
  async createAccountingSubmissionToken(
    clientId: string
  ): Promise<ServiceResponse<{ token: string; expiresAt: string }>> {
    try {
      const tenantId = await this.getTenantId();

      // Generate a 36-char hex token (matches the feasibility token style).
      const arr = new Uint8Array(18);
      crypto.getRandomValues(arr);
      const token = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');

      // 7-day expiry
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase.from('shaagat_accounting_submissions').insert({
        tenant_id: tenantId,
        client_id: clientId,
        submission_token: token,
        token_expires_at: expiresAt,
        // Two-month submission: primary = 03/2026, secondary = 04/2026.
        // Public form will collect both before redirecting to payment.
        salary_period: '03/2026',
        secondary_period: '04/2026',
      });

      if (error) throw error;

      return { data: { token, expiresAt }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get the most recent accounting submission for a client (salary data from external form).
   * Used to auto-load salary data into the calculation wizard step 3.
   *
   * Per the law (חוק התוכנית לסיוע כלכלי, פרק 6.ב), the salary period is
   * 3-4/2026 (March + April). The public form collects the two months
   * separately — the primary month sits on the row's top-level columns and
   * the secondary month on the `secondary_month` JSONB column.
   */
  async getAccountingSubmissionByClient(
    clientId: string
  ): Promise<ServiceResponse<{
    salary_gross: number | null;
    num_employees: number | null;
    miluim_deductions: number | null;
    miluim_count: number;
    tips_deductions: number | null;
    tips_count: number;
    chalat_deductions: number | null;
    chalat_count: number;
    vacation_deductions: number | null;
    vacation_count: number;
    fruit_vegetable_purchases_annual: number;
    monthly_fixed_expenses: number;
    salary_period: string | null;
    secondary_period: string | null;
    secondary_month: {
      salary_gross?: number | null;
      num_employees?: number | null;
      miluim_deductions?: number | null;
      miluim_count?: number | null;
      tips_deductions?: number | null;
      tips_count?: number | null;
      chalat_deductions?: number | null;
      chalat_count?: number | null;
      vacation_deductions?: number | null;
      vacation_count?: number | null;
    } | null;
    notes: string | null;
  } | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('shaagat_accounting_submissions')
        .select(
          'salary_gross, num_employees, miluim_deductions, miluim_count, tips_deductions, tips_count, chalat_deductions, chalat_count, vacation_deductions, vacation_count, fruit_vegetable_purchases_annual, monthly_fixed_expenses, salary_period, secondary_period, secondary_month, notes'
        )
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .not('submitted_by_email', 'is', null) // only submitted forms
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { data: data ?? null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ──────────────────────────── Email logging ────────────────────────────

  /**
   * Log an email send event.
   */
  async logEmailSent(params: {
    clientId: string;
    eligibilityCheckId?: string;
    emailType: EmailLogType;
    recipientEmail: string;
    subject?: string;
    htmlContent?: string;
    status?: 'SENT' | 'FAILED';
    errorMessage?: string;
  }): Promise<void> {
    try {
      const tenantId = await this.getTenantId();

      await supabase.from('shaagat_email_logs').insert({
        tenant_id: tenantId,
        client_id: params.clientId,
        eligibility_check_id: params.eligibilityCheckId ?? null,
        email_type: params.emailType,
        recipient_email: params.recipientEmail,
        subject: params.subject ?? null,
        html_content: params.htmlContent ?? null,
        status: params.status ?? 'SENT',
        error_message: params.errorMessage ?? null,
      });
    } catch {
      // Non-critical — silently ignore log failures
    }
  }
}

// Export singleton instance
export const shaagatService = new ShaagatService();
