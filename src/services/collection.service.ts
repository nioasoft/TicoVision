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
} from '@/types/collection.types';
import { PAYMENT_DISCOUNTS } from '@/types/collection.types';

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

      // Apply sorting (default: alphabetical by client name)
      let sortColumn = sort?.column || 'client_name';
      const sortOrder = sort?.order || 'asc';

      // Map UI column names to view column names
      if (sortColumn === 'client_name') {
        sortColumn = 'company_name'; // Sort by company name
      }

      query = query.order(sortColumn, { ascending: sortOrder === 'asc', nullsFirst: false });

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

      // Query from the view which already has unique clients (one row per client)
      let query = supabase
        .from('collection_dashboard_view')
        .select('payment_status, amount_original, amount_paid, payment_method_selected')
        .eq('tenant_id', tenantId);

      // Apply date range if provided (on letter_sent_date)
      if (dateRange) {
        query = query
          .gte('letter_sent_date', dateRange.from)
          .lte('letter_sent_date', dateRange.to);
      }

      const { data: rows, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Calculate financial metrics (from unique clients only)
      const total_expected = rows?.reduce((sum, row) => sum + Number(row.amount_original || 0), 0) || 0;
      const total_received = rows
        ?.filter((row) => row.payment_status === 'paid')
        .reduce((sum, row) => sum + Number(row.amount_original || 0), 0) || 0;
      const total_pending = total_expected - total_received;
      const collection_rate = total_expected > 0 ? (total_received / total_expected) * 100 : 0;

      // Calculate client counts (now correctly counting unique clients)
      const clients_sent = rows?.length || 0;
      const clients_paid = rows?.filter((row) => row.payment_status === 'paid').length || 0;
      const clients_partial_paid = rows?.filter((row) => row.payment_status === 'partial_paid').length || 0;
      const clients_pending = clients_sent - clients_paid - clients_partial_paid;
      const clients_not_selected = rows?.filter((row) => row.payment_method_selected === null).length || 0;

      // Calculate alerts (requires additional queries)
      const alertsResult = await this.calculateAlerts(tenantId);

      const kpis: CollectionKPIs = {
        total_expected,
        total_received,
        total_pending,
        collection_rate: Math.round(collection_rate * 100) / 100,
        clients_sent,
        clients_paid,
        clients_partial_paid,
        clients_pending,
        clients_not_selected,
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
   * UPDATED 2025-12-21: Now uses ActualPaymentService to create proper payment records
   * with VAT breakdown and deviation tracking.
   *
   * @param feeId - Fee calculation ID
   * @param paymentDetails - Payment details (includes optional payment_method)
   * @returns Updated fee calculation
   */
  async markAsPaid(
    feeId: string,
    paymentDetails: MarkAsPaidDto
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get fee calculation details for ActualPaymentService
      const { data: feeCalc, error: feeCalcError } = await supabase
        .from('fee_calculations')
        .select('client_id, total_amount, amount_after_selected_discount')
        .eq('id', feeId)
        .eq('tenant_id', tenantId)
        .single();

      if (feeCalcError) {
        return { data: false, error: this.handleError(feeCalcError) };
      }

      // Use ActualPaymentService for proper payment tracking
      const { actualPaymentService } = await import('./actual-payment.service');

      const amountPaid = feeCalc.amount_after_selected_discount || feeCalc.total_amount;

      const result = await actualPaymentService.recordPayment({
        clientId: feeCalc.client_id,
        feeCalculationId: feeId,
        amountPaid: amountPaid,
        paymentDate: paymentDetails.payment_date ? new Date(paymentDetails.payment_date) : new Date(),
        paymentMethod: paymentDetails.payment_method || 'bank_transfer',
        paymentReference: paymentDetails.payment_reference,
      });

      if (result.error) {
        return { data: false, error: result.error };
      }

      // Log action
      await this.logAction('mark_fee_paid', feeId, {
        payment_date: paymentDetails.payment_date,
        payment_reference: paymentDetails.payment_reference,
        used_actual_payment_service: true,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark a partial payment on a fee
   *
   * UPDATED 2025-12-21: Now also creates actual_payments record for proper tracking
   * and deviation calculation when payment is complete.
   *
   * @param feeId - Fee calculation ID
   * @param amount - Amount paid
   * @param notes - Optional notes
   * @param paymentMethod - Optional payment method (default: bank_transfer)
   * @param paymentReference - Optional payment reference
   * @returns Updated fee calculation
   */
  async markPartialPayment(
    feeId: string,
    amount: number,
    notes?: string,
    paymentMethod: string = 'bank_transfer',
    paymentReference?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get current fee details including client_id
      const { data: fee, error: feeError } = await supabase
        .from('fee_calculations')
        .select('total_amount, partial_payment_amount, client_id, amount_after_selected_discount')
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

      // If this completes the payment, create actual_payments record via ActualPaymentService
      if (newStatus === 'paid') {
        const { actualPaymentService } = await import('./actual-payment.service');

        const result = await actualPaymentService.recordPayment({
          clientId: fee.client_id,
          feeCalculationId: feeId,
          amountPaid: newPartial, // Total of all partial payments
          paymentDate: new Date(),
          paymentMethod: paymentMethod as 'bank_transfer' | 'checks' | 'credit_card' | 'cash',
          paymentReference: paymentReference,
          notes: notes ? `תשלום חלקי (סה"כ ${newPartial}): ${notes}` : `תשלום חלקי שהושלם (סה"כ ${newPartial})`,
        });

        if (result.error) {
          return { data: false, error: result.error };
        }

        // Log action
        await this.logAction('mark_partial_payment_complete', feeId, {
          amount,
          new_partial_total: newPartial,
          notes,
          payment_method: paymentMethod,
        });

        return { data: true, error: null };
      }

      // For non-completing partial payments, just update fee_calculations
      const { error } = await supabase
        .from('fee_calculations')
        .update({
          status: newStatus,
          partial_payment_amount: newPartial,
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

      // If resolved as paid, create actual_payments record via ActualPaymentService
      if (resolution === 'resolved_paid') {
        // Get fee calculation details
        const { data: feeCalc, error: feeCalcError } = await supabase
          .from('fee_calculations')
          .select('client_id, total_amount, amount_after_selected_discount')
          .eq('id', dispute.fee_calculation_id)
          .eq('tenant_id', tenantId)
          .single();

        if (feeCalcError) {
          console.error('Error fetching fee calculation for dispute resolution:', feeCalcError);
        } else {
          const { actualPaymentService } = await import('./actual-payment.service');

          const amountPaid = feeCalc.amount_after_selected_discount || feeCalc.total_amount;

          const result = await actualPaymentService.recordPayment({
            clientId: feeCalc.client_id,
            feeCalculationId: dispute.fee_calculation_id,
            amountPaid: amountPaid,
            paymentDate: dispute.claimed_payment_date ? new Date(dispute.claimed_payment_date) : new Date(),
            paymentMethod: 'bank_transfer', // Default, can be updated later
            notes: notes ? `נפתר מסכסוך: ${notes}` : 'נפתר מסכסוך תשלום',
          });

          if (result.error) {
            console.error('Error creating actual payment from dispute resolution:', result.error);
            // Fall back to direct status update if actual_payments fails
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
        }
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

  /**
   * Record actual payment from collection page
   * - Wrapper around ActualPaymentService
   * - Updates collection dashboard
   *
   * @param data - Payment data
   * @returns Success status
   */
  async recordActualPayment(
    data: {
      clientId: string;
      feeCalculationId: string;
      amountPaid: number;
      paymentDate: Date;
      paymentMethod: string;
      paymentReference?: string;
      numInstallments?: number;
      attachmentIds?: string[];
      notes?: string;
    }
  ): Promise<ServiceResponse<boolean>> {
    try {
      const { actualPaymentService } = await import('./actual-payment.service');

      const result = await actualPaymentService.recordPayment(data);

      if (result.error) {
        return { data: false, error: result.error };
      }

      // Log action
      await this.logAction('record_actual_payment_from_collection', data.feeCalculationId, {
        client_id: data.clientId,
        amount: data.amountPaid,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get payment with deviations for collection dashboard
   *
   * @param feeCalculationId - Fee calculation ID
   * @returns Payment with deviation info
   */
  async getPaymentWithDeviations(
    feeCalculationId: string
  ): Promise<ServiceResponse<Record<string, unknown>>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('fee_tracking_enhanced_view')
        .select('*')
        .eq('fee_calculation_id', feeCalculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data: data || {}, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ==================== Bulk Operations ====================

  /**
   * Send reminders to multiple clients at once
   *
   * @param feeIds - Array of fee calculation IDs
   * @param reminderType - Type of reminder to send
   * @returns Results for each fee
   */
  async bulkSendReminders(
    feeIds: string[],
    reminderType: 'gentle' | 'payment_selection' | 'payment_request' | 'urgent'
  ): Promise<ServiceResponse<{ success: string[]; failed: string[] }>> {
    try {
      const tenantId = await this.getTenantId();
      const success: string[] = [];
      const failed: string[] = [];

      for (const feeId of feeIds) {
        try {
          // Get fee details for sending
          const { data: fee, error: feeError } = await supabase
            .from('fee_calculations')
            .select(`
              id,
              client_id,
              total_amount,
              clients!inner (
                company_name,
                contact_email
              )
            `)
            .eq('id', feeId)
            .eq('tenant_id', tenantId)
            .single();

          if (feeError || !fee) {
            failed.push(feeId);
            continue;
          }

          // Log the reminder in payment_reminders table
          await supabase.from('payment_reminders').insert({
            tenant_id: tenantId,
            fee_calculation_id: feeId,
            client_id: fee.client_id,
            reminder_type: 'manual',
            sent_via: 'email',
          });

          // Update reminder count
          await supabase
            .from('fee_calculations')
            .update({
              reminder_count: supabase.rpc('increment_reminder_count', { fee_id: feeId }),
              last_reminder_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', feeId)
            .eq('tenant_id', tenantId);

          success.push(feeId);
        } catch {
          failed.push(feeId);
        }
      }

      return { data: { success, failed }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark multiple fees as paid at once
   *
   * @param feeIds - Array of fee calculation IDs
   * @returns Results for each fee
   */
  async bulkMarkAsPaid(
    feeIds: string[]
  ): Promise<ServiceResponse<{ success: string[]; failed: string[] }>> {
    try {
      const tenantId = await this.getTenantId();
      const success: string[] = [];
      const failed: string[] = [];

      for (const feeId of feeIds) {
        const result = await this.markAsPaid(feeId, {
          payment_date: new Date().toISOString(),
        });

        if (result.error) {
          failed.push(feeId);
        } else {
          success.push(feeId);
        }
      }

      return { data: { success, failed }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Add a note to multiple clients at once
   *
   * @param feeIds - Array of fee calculation IDs
   * @param note - Note content
   * @returns Results for each fee
   */
  async bulkAddNote(
    feeIds: string[],
    note: string
  ): Promise<ServiceResponse<{ success: string[]; failed: string[] }>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();
      const success: string[] = [];
      const failed: string[] = [];

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      for (const feeId of feeIds) {
        try {
          // Get fee details to get client_id
          const { data: fee, error: feeError } = await supabase
            .from('fee_calculations')
            .select('client_id')
            .eq('id', feeId)
            .eq('tenant_id', tenantId)
            .single();

          if (feeError || !fee) {
            failed.push(feeId);
            continue;
          }

          // Add the note as an interaction
          await supabase.from('client_interactions').insert({
            tenant_id: tenantId,
            client_id: fee.client_id,
            fee_calculation_id: feeId,
            interaction_type: 'note',
            direction: 'outbound',
            subject: 'הערה (פעולה מרובה)',
            content: note,
            interacted_at: new Date().toISOString(),
            created_by: user.id,
          });

          success.push(feeId);
        } catch {
          failed.push(feeId);
        }
      }

      return { data: { success, failed }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Record a payment promise for a fee
   *
   * @param feeId - Fee calculation ID
   * @param promiseDate - Promised payment date
   * @param note - Optional note
   * @returns Success status
   */
  async recordPaymentPromise(
    feeId: string,
    promiseDate: Date,
    note?: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: false, error: new Error('User not authenticated') };
      }

      const { error } = await supabase
        .from('fee_calculations')
        .update({
          promised_payment_date: promiseDate.toISOString().split('T')[0],
          promise_note: note,
          promise_created_at: new Date().toISOString(),
          promise_created_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feeId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('record_payment_promise', feeId, {
        promised_date: promiseDate.toISOString(),
        note,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get fees with overdue payment promises
   *
   * @returns List of fees with overdue promises
   */
  async getOverduePromises(): Promise<ServiceResponse<Record<string, unknown>[]>> {
    try {
      const tenantId = await this.getTenantId();
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('fee_calculations')
        .select(`
          id,
          client_id,
          total_amount,
          promised_payment_date,
          promise_note,
          clients!inner (
            company_name,
            company_name_hebrew,
            contact_email
          )
        `)
        .eq('tenant_id', tenantId)
        .not('promised_payment_date', 'is', null)
        .lt('promised_payment_date', today)
        .not('status', 'in', '("paid","cancelled")')
        .order('promised_payment_date', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get deviation alerts for collection page
   *
   * @param filters - Optional filters
   * @returns List of deviation alerts
   */
  async getDeviationAlerts(
    filters?: {
      alertLevel?: string;
      reviewed?: boolean;
    }
  ): Promise<ServiceResponse<Record<string, unknown>[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('payment_deviations')
        .select(`
          *,
          clients (company_name),
          fee_calculations (year, final_amount)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters?.alertLevel) {
        query = query.eq('alert_level', filters.alertLevel);
      }

      if (filters?.reviewed !== undefined) {
        query = query.eq('reviewed', filters.reviewed);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [], error: null };
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
        case 'pending':
          // All non-paid statuses
          q = q.neq('payment_status', 'paid');
          break;
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

    // Alert type filter
    if (filters.alert_type && filters.alert_type !== 'all') {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      switch (filters.alert_type) {
        case 'not_opened_7d':
          // Letters not opened after 7+ days
          q = q
            .is('letter_opened_at', null)
            .lte('letter_sent_date', sevenDaysAgo.toISOString())
            .neq('payment_status', 'paid');
          break;
        case 'no_selection_14d':
          // No payment method selected after 14+ days
          q = q
            .is('payment_method_selected', null)
            .lte('letter_sent_date', fourteenDaysAgo.toISOString())
            .neq('payment_status', 'paid');
          break;
        case 'abandoned_cart':
          // Selected CC payment method but didn't complete
          q = q
            .not('payment_method_selected', 'is', null)
            .neq('payment_status', 'paid')
            .in('payment_method_selected', ['cc_single', 'cc_installments']);
          break;
        case 'has_dispute':
          // Has an active dispute
          q = q.eq('has_dispute', true);
          break;
      }
    }

    // Time range filter (based on letter_sent_date)
    // Skip filter when 'all' or 'custom' is selected
    if (filters.time_range && filters.time_range !== 'custom' && filters.time_range !== 'all') {
      const now = new Date();

      // Define time ranges with start and end days
      // Example: '15-30' means 15-30 days ago (letter_sent_date between 15 and 30 days ago)
      let minDaysAgo: number | null = null;
      let maxDaysAgo: number | null = null;

      switch (filters.time_range) {
        case '0-7':
          minDaysAgo = 0;
          maxDaysAgo = 7;
          break;
        case '8-14':
          minDaysAgo = 8;
          maxDaysAgo = 14;
          break;
        case '15-30':
          minDaysAgo = 15;
          maxDaysAgo = 30;
          break;
        case '31-60':
          minDaysAgo = 31;
          maxDaysAgo = 60;
          break;
        case '60+':
          minDaysAgo = 60;
          maxDaysAgo = null; // No upper limit
          break;
        default:
          minDaysAgo = 15;
          maxDaysAgo = 30;
      }

      // Apply date range filter
      // For "15-30 days ago": letter_sent_date is between (now-30days) and (now-15days)
      if (minDaysAgo !== null) {
        // maxDate = now - minDaysAgo (the more recent end of the range)
        const recentBoundary = new Date(now.getTime() - minDaysAgo * 24 * 60 * 60 * 1000);

        if (maxDaysAgo !== null) {
          // oldBoundary = now - maxDaysAgo (the older end of the range)
          const oldBoundary = new Date(now.getTime() - maxDaysAgo * 24 * 60 * 60 * 1000);
          // Range filter: letter_sent_date >= oldBoundary AND <= recentBoundary
          q = q.gte('letter_sent_date', oldBoundary.toISOString())
               .lte('letter_sent_date', recentBoundary.toISOString());
        } else {
          // '60+' case: letter_sent_date <= 60 days ago (anything older than 60 days)
          q = q.lte('letter_sent_date', recentBoundary.toISOString());
        }
      }
    }

    // Search filter (searches company_name and company_name_hebrew)
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.trim();
      // Use ilike for case-insensitive search on both Hebrew and English names
      q = q.or(`company_name.ilike.%${searchTerm}%,company_name_hebrew.ilike.%${searchTerm}%`);
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
        const sourceType = (row.source_type as string) || 'fee';
        const feeCalculationId = row.fee_calculation_id as string | null;
        const billingLetterId = row.billing_letter_id as string | null;

        // Calculate alerts (only for fee calculations, billing letters don't have alerts yet)
        const alerts = feeCalculationId
          ? await this.calculateRowAlerts(feeCalculationId, daysSinceSent)
          : [];

        const amountPaid = Number(row.amount_paid || 0);
        const amountOriginal = Number(row.amount_original || 0);
        const amountRemaining = Number(row.amount_remaining || 0);

        return {
          // Source type for distinguishing fee vs billing
          source_type: sourceType as 'fee' | 'billing',
          client_id: row.client_id as string,
          client_name: row.company_name as string,
          company_name_hebrew: row.company_name_hebrew as string | undefined,
          contact_email: row.contact_email as string,
          contact_phone: row.contact_phone as string | undefined,
          fee_calculation_id: feeCalculationId,
          billing_letter_id: billingLetterId,
          service_description: row.service_description as string | undefined,
          letter_sent_date: row.letter_sent_date as string,
          letter_opened: !!row.letter_opened_at,
          letter_opened_at: row.letter_opened_at as string | undefined,
          letter_open_count: Number(row.letter_open_count || 0),
          days_since_sent: daysSinceSent,
          amount_original: amountOriginal,
          amount_before_vat: row.amount_before_vat ? Number(row.amount_before_vat) : undefined,
          // Bookkeeping: use total annual amounts from view (only for fees)
          bookkeeping_before_vat: row.bookkeeping_before_vat ? Number(row.bookkeeping_before_vat) : undefined,
          bookkeeping_with_vat: row.bookkeeping_with_vat ? Number(row.bookkeeping_with_vat) : undefined,
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

    // Count unopened (7+ days) - using view for unique clients
    const { count: unopenedCount } = await supabase
      .from('collection_dashboard_view')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'sent')
      .is('payment_method_selected', null)
      .lte('letter_sent_date', sevenDaysAgo.toISOString());

    // Count no selection (14+ days) - using view for unique clients
    const { count: noSelectionCount } = await supabase
      .from('collection_dashboard_view')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'sent')
      .is('payment_method_selected', null)
      .lte('letter_sent_date', fourteenDaysAgo.toISOString());

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
