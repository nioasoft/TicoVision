/**
 * Collection Management Service
 *
 * Main service for the Collection Management System.
 * Handles dashboard data, payment tracking, KPI calculations, and collection actions.
 *
 * @module collection.service
 */

import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  CollectionDashboardData,
  CollectionKPIs,
  CollectionRow,
  CollectionFilters,
  CollectionSort,
  CollectionPagination,
  MarkAsPaidDto,
  MarkPartialPaymentDto,
  AddClientInteractionDto,
  ResolveDisputeDto,
  DateRange,
  OverdueClient,
  PaymentDispute,
  AlertType,
  PAYMENT_DISCOUNTS,
} from '@/types/collection.types';

class CollectionService extends BaseService {
  constructor() {
    super('fee_calculations');
  }

  /**
   * Get complete dashboard data with KPIs, rows, and pagination
   *
   * This is the main method for loading the Collection Dashboard.
   * Performs complex joins across multiple tables.
   *
   * @param filters - Dashboard filters
   * @param sort - Sort configuration
   * @param pagination - Pagination settings
   * @returns Complete dashboard data
   */
  async getDashboardData(
    filters?: CollectionFilters,
    sort?: CollectionSort,
    pagination: CollectionPagination = { page: 1, page_size: 20 }
  ): Promise<ServiceResponse<CollectionDashboardData>> {
    try {
      const tenantId = await this.getTenantId();

      // Calculate KPIs
      const kpisResult = await this.getKPIs();
      if (kpisResult.error) {
        return { data: null, error: kpisResult.error };
      }

      // Build query for dashboard rows using the view
      // This view handles the 1-to-many generated_letters relationship correctly
      let query = supabase
        .from('collection_dashboard_view')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      query = this.applyFilters(query, filters);

      // Apply sorting (default: most recent letters first)
      const sortColumn = sort?.column || 'letter_sent_date';
      const sortOrder = sort?.order || 'desc';
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const { page, page_size } = pagination;
      const from = (page - 1) * page_size;
      const to = from + page_size - 1;
      query = query.range(from, to);

      const { data: feeData, error: feeError, count } = await query;

      if (feeError) {
        return { data: null, error: this.handleError(feeError) };
      }

      // Transform data to CollectionRow format
      const rows: CollectionRow[] = await this.transformToCollectionRows(feeData || []);

      // Prepare response
      const dashboardData: CollectionDashboardData = {
        kpis: kpisResult.data!,
        rows,
        pagination: {
          total: count || 0,
          page,
          page_size,
          total_pages: Math.ceil((count || 0) / page_size),
        },
      };

      return { data: dashboardData, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Calculate collection KPIs for the dashboard
   *
   * @param dateRange - Optional date range filter
   * @returns Collection KPIs
   */
  async getKPIs(dateRange?: DateRange): Promise<ServiceResponse<CollectionKPIs>> {
    try {
      const tenantId = await this.getTenantId();

      // Build base query
      let query = supabase
        .from('fee_calculations')
        .select('status, total_amount, partial_payment_amount')
        .eq('tenant_id', tenantId)
        .not('status', 'eq', 'draft');

      // Apply date range if provided
      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from)
          .lte('created_at', dateRange.to);
      }

      const { data: fees, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Calculate financial metrics
      const total_expected = fees?.reduce((sum, fee) => sum + Number(fee.total_amount), 0) || 0;
      const total_received = fees
        ?.filter((fee) => fee.status === 'paid')
        .reduce((sum, fee) => sum + Number(fee.total_amount), 0) || 0;
      const total_pending = total_expected - total_received;
      const collection_rate = total_expected > 0 ? (total_received / total_expected) * 100 : 0;

      // Calculate client counts
      const clients_sent = fees?.length || 0;
      const clients_paid = fees?.filter((fee) => fee.status === 'paid').length || 0;
      const clients_pending = clients_sent - clients_paid;

      // Calculate alerts (requires additional queries)
      const alertsResult = await this.calculateAlerts(tenantId);

      const kpis: CollectionKPIs = {
        total_expected,
        total_received,
        total_pending,
        collection_rate: Math.round(collection_rate * 100) / 100,
        clients_sent,
        clients_paid,
        clients_pending,
        alerts_unopened: alertsResult.unopened,
        alerts_no_selection: alertsResult.no_selection,
        alerts_abandoned: alertsResult.abandoned,
        alerts_disputes: alertsResult.disputes,
      };

      return { data: kpis, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark a fee as fully paid
   *
   * @param feeId - Fee calculation ID
   * @param paymentDetails - Payment details
   * @returns Updated fee calculation
   */
  async markAsPaid(
    feeId: string,
    paymentDetails: MarkAsPaidDto
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('fee_calculations')
        .update({
          status: 'paid',
          payment_date: paymentDetails.payment_date || new Date().toISOString(),
          payment_reference: paymentDetails.payment_reference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('mark_fee_paid', feeId, {
        payment_date: paymentDetails.payment_date,
        payment_reference: paymentDetails.payment_reference,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark a partial payment on a fee
   *
   * @param feeId - Fee calculation ID
   * @param amount - Amount paid
   * @param notes - Optional notes
   * @returns Updated fee calculation
   */
  async markPartialPayment(
    feeId: string,
    amount: number,
    notes?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get current fee details
      const { data: fee, error: feeError } = await supabase
        .from('fee_calculations')
        .select('total_amount, partial_payment_amount')
        .eq('id', feeId)
        .eq('tenant_id', tenantId)
        .single();

      if (feeError) {
        return { data: false, error: this.handleError(feeError) };
      }

      const currentPartial = Number(fee.partial_payment_amount) || 0;
      const newPartial = currentPartial + amount;
      const totalAmount = Number(fee.total_amount);

      // Check if partial payment exceeds total
      if (newPartial > totalAmount) {
        return {
          data: false,
          error: new Error('Partial payment amount exceeds total amount'),
        };
      }

      // Determine new status
      const newStatus = newPartial >= totalAmount ? 'paid' : 'partial_paid';

      const { error } = await supabase
        .from('fee_calculations')
        .update({
          status: newStatus,
          partial_payment_amount: newPartial,
          payment_date: newStatus === 'paid' ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('mark_partial_payment', feeId, {
        amount,
        new_partial_total: newPartial,
        notes,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get list of overdue clients
   *
   * @returns List of overdue clients
   */
  async getOverdueClients(): Promise<ServiceResponse<OverdueClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('fee_calculations')
        .select(
          `
          id,
          client_id,
          total_amount,
          partial_payment_amount,
          created_at,
          reminder_count,
          last_reminder_sent_at,
          clients!inner (
            company_name,
            company_name_hebrew
          )
        `
        )
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'partial_paid'])
        .order('created_at', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      const overdueClients: OverdueClient[] = (data || []).map((fee: Record<string, unknown>) => {
        const createdAt = new Date(fee.created_at as string);
        const now = new Date();
        const daysSinceSent = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const client = fee.clients as Record<string, unknown>;
        const amountRemaining =
          Number(fee.total_amount) - Number(fee.partial_payment_amount || 0);

        return {
          client_id: fee.client_id as string,
          client_name: client.company_name as string,
          company_name_hebrew: client.company_name_hebrew as string | undefined,
          fee_calculation_id: fee.id as string,
          amount_remaining: amountRemaining,
          days_since_sent: daysSinceSent,
          last_reminder_sent: fee.last_reminder_sent_at as string | undefined,
          reminder_count: Number(fee.reminder_count || 0),
        };
      });

      return { data: overdueClients, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get list of disputed payments
   *
   * @returns List of payment disputes
   */
  async getDisputedPayments(): Promise<ServiceResponse<PaymentDispute[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('payment_disputes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Resolve a payment dispute
   *
   * @param disputeId - Dispute ID
   * @param resolution - Resolution status
   * @param notes - Resolution notes
   * @returns Success status
   */
  async resolveDispute(
    disputeId: string,
    resolution: 'resolved_paid' | 'resolved_unpaid' | 'invalid',
    notes?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: false, error: new Error('User not authenticated') };
      }

      // Get dispute details
      const { data: dispute, error: disputeError } = await supabase
        .from('payment_disputes')
        .select('fee_calculation_id, claimed_payment_date')
        .eq('id', disputeId)
        .eq('tenant_id', tenantId)
        .single();

      if (disputeError) {
        return { data: false, error: this.handleError(disputeError) };
      }

      // Update dispute
      const { error: updateError } = await supabase
        .from('payment_disputes')
        .update({
          status: resolution,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: notes,
        })
        .eq('id', disputeId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        return { data: false, error: this.handleError(updateError) };
      }

      // If resolved as paid, update fee calculation
      if (resolution === 'resolved_paid') {
        await supabase
          .from('fee_calculations')
          .update({
            status: 'paid',
            payment_date: dispute.claimed_payment_date || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', dispute.fee_calculation_id)
          .eq('tenant_id', tenantId);
      }

      // Log action
      await this.logAction('resolve_dispute', disputeId, { resolution, notes });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  /**
   * Log a manual interaction with a client
   *
   * @param clientId - Client ID
   * @param interactionData - Interaction details
   * @returns Created interaction ID
   */
  async logManualInteraction(
    clientId: string,
    interactionData: AddClientInteractionDto
  ): Promise<ServiceResponse<string>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      const { data, error } = await supabase
        .from('client_interactions')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          fee_calculation_id: interactionData.fee_id,
          interaction_type: interactionData.interaction_type,
          direction: interactionData.direction,
          subject: interactionData.subject,
          content: interactionData.content,
          outcome: interactionData.outcome,
          interacted_at: interactionData.interacted_at || new Date().toISOString(),
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('log_client_interaction', clientId, {
        interaction_type: interactionData.interaction_type,
        subject: interactionData.subject,
      });

      return { data: data.id, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Apply dashboard filters to query
   * Note: Works with collection_dashboard_view column names
   */
  private applyFilters(query: unknown, filters?: CollectionFilters): unknown {
    if (!filters) return query;

    // Type assertion for query builder
    let q = query as ReturnType<typeof supabase.from>;

    // Status filter
    if (filters.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'sent_not_opened':
          q = q.is('letter_opened_at', null);
          break;
        case 'opened_not_selected':
          q = q.not('letter_opened_at', 'is', null).is('payment_method_selected', null);
          break;
        case 'selected_not_paid':
          q = q.not('payment_method_selected', 'is', null).neq('payment_status', 'paid');
          break;
        case 'partial_paid':
          q = q.eq('payment_status', 'partial_paid');
          break;
        case 'paid':
          q = q.eq('payment_status', 'paid');
          break;
        case 'disputed':
          q = q.eq('has_dispute', true);
          break;
      }
    }

    // Payment method filter
    if (filters.payment_method && filters.payment_method !== 'all') {
      if (filters.payment_method === 'not_selected') {
        q = q.is('payment_method_selected', null);
      } else {
        q = q.eq('payment_method_selected', filters.payment_method);
      }
    }

    // Time range filter (based on letter_sent_date)
    if (filters.time_range && filters.time_range !== 'custom') {
      const now = new Date();
      let daysAgo: number;

      switch (filters.time_range) {
        case '0-7':
          daysAgo = 7;
          break;
        case '8-14':
          daysAgo = 14;
          break;
        case '15-30':
          daysAgo = 30;
          break;
        case '31-60':
          daysAgo = 60;
          break;
        case '60+':
          daysAgo = 999999;
          break;
        default:
          daysAgo = 30;
      }

      const dateThreshold = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      q = q.gte('letter_sent_date', dateThreshold.toISOString());
    }

    return q;
  }

  /**
   * Transform view data to collection rows
   * Data comes from collection_dashboard_view which is already flattened and joined
   */
  private async transformToCollectionRows(viewData: Record<string, unknown>[]): Promise<CollectionRow[]> {
    return Promise.all(
      viewData.map(async (row) => {
        const daysSinceSent = Number(row.days_since_sent || 0);

        // Calculate alerts
        const alerts = await this.calculateRowAlerts(row.fee_calculation_id as string, daysSinceSent);

        const amountPaid = Number(row.amount_paid || 0);
        const amountOriginal = Number(row.amount_original || 0);
        const amountRemaining = Number(row.amount_remaining || 0);

        return {
          client_id: row.client_id as string,
          client_name: row.company_name as string,
          company_name_hebrew: row.company_name_hebrew as string | undefined,
          contact_email: row.contact_email as string,
          contact_phone: row.contact_phone as string | undefined,
          fee_calculation_id: row.fee_calculation_id as string,
          letter_sent_date: row.letter_sent_date as string,
          letter_opened: !!row.letter_opened_at,
          letter_opened_at: row.letter_opened_at as string | undefined,
          letter_open_count: Number(row.letter_open_count || 0),
          days_since_sent: daysSinceSent,
          amount_original: amountOriginal,
          payment_method_selected: row.payment_method_selected as string | undefined,
          payment_method_selected_at: undefined, // Not in view, could be added if needed
          discount_percent: row.payment_method_selected
            ? (PAYMENT_DISCOUNTS as Record<string, number>)[row.payment_method_selected as string] || 0
            : 0,
          amount_after_discount: Number(row.amount_after_selected_discount || amountOriginal),
          payment_status: row.payment_status as string,
          amount_paid: amountPaid,
          amount_remaining: amountRemaining,
          reminder_count: Number(row.reminder_count || 0),
          last_reminder_sent: row.last_reminder_sent_at as string | undefined,
          has_alert: alerts.length > 0,
          alert_types: alerts,
          has_dispute: row.has_dispute as boolean,
          dispute_status: row.has_dispute ? 'pending' : undefined,
          last_interaction: row.last_interaction as string | undefined,
          interaction_count: Number(row.interaction_count || 0),
        } as CollectionRow;
      })
    );
  }

  /**
   * Calculate alerts for a specific row
   */
  private async calculateRowAlerts(feeId: string, daysSinceSent: number): Promise<AlertType[]> {
    const alerts: AlertType[] = [];

    // Get fee details
    const { data: fee } = await supabase
      .from('fee_calculations')
      .select('payment_method_selected, status')
      .eq('id', feeId)
      .single();

    if (!fee) return alerts;

    // Check for alerts based on business rules
    if (daysSinceSent >= 7 && !fee.payment_method_selected) {
      alerts.push('not_opened_7d');
    }

    if (daysSinceSent >= 14 && !fee.payment_method_selected) {
      alerts.push('no_selection_14d');
    }

    // Check for disputes
    const { data: disputes } = await supabase
      .from('payment_disputes')
      .select('id')
      .eq('fee_calculation_id', feeId)
      .eq('status', 'pending')
      .limit(1);

    if (disputes && disputes.length > 0) {
      alerts.push('has_dispute');
    }

    return alerts;
  }

  /**
   * Calculate alert counts for KPIs
   */
  private async calculateAlerts(tenantId: string): Promise<{
    unopened: number;
    no_selection: number;
    abandoned: number;
    disputes: number;
  }> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Count unopened (7+ days)
    const { count: unopenedCount } = await supabase
      .from('fee_calculations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .is('payment_method_selected', null)
      .lte('created_at', sevenDaysAgo.toISOString());

    // Count no selection (14+ days)
    const { count: noSelectionCount } = await supabase
      .from('fee_calculations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['sent'])
      .is('payment_method_selected', null)
      .lte('created_at', fourteenDaysAgo.toISOString());

    // Count abandoned (selected but not paid)
    const { count: abandonedCount } = await supabase
      .from('payment_method_selections')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('completed_payment', false)
      .in('selected_method', ['cc_single', 'cc_installments']);

    // Count disputes
    const { count: disputesCount } = await supabase
      .from('payment_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    return {
      unopened: unopenedCount || 0,
      no_selection: noSelectionCount || 0,
      abandoned: abandonedCount || 0,
      disputes: disputesCount || 0,
    };
  }
}

export const collectionService = new CollectionService();
