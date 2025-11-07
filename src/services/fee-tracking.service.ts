/**
 * Fee Tracking Service
 * Manages fee tracking dashboard - shows which clients have calculations, letters, and payments
 */

import { BaseService, type ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import { actualPaymentService } from './actual-payment.service';
import type { ActualPaymentDetails } from './actual-payment.service';
import type {
  FeeTrackingRow,
  FeeTrackingKPIs,
  FeeTrackingData,
  PaymentStatus,
  FeeTrackingFilters,
  FeeTrackingEnhancedRow,
} from '@/types/fee-tracking.types';
import type { PaymentMethod, AlertLevel } from '@/types/payment.types';

class FeeTrackingService extends BaseService {
  constructor() {
    super('fee_calculations'); // Base table for audit logging
  }

  /**
   * Get complete fee tracking data for a tax year
   * Returns KPIs + full client list with statuses
   *
   * @param taxYear - Tax year (שנת מס) to track
   * @returns Complete tracking data with KPIs and client rows
   */
  async getTrackingData(taxYear: number): Promise<ServiceResponse<FeeTrackingData>> {
    try {
      const tenantId = await this.getTenantId();

      // Call the SQL function to get tracking data
      const { data: rawData, error } = await supabase.rpc('get_fee_tracking_data', {
        p_tenant_id: tenantId,
        p_tax_year: taxYear,
      });

      if (error) {
        throw this.handleError(error);
      }

      // Transform raw data to typed format
      const clients: FeeTrackingRow[] = (rawData || []).map((row: any) => ({
        client_id: row.client_id,
        client_name: row.client_name,
        client_name_hebrew: row.client_name_hebrew,
        tax_id: row.tax_id,
        has_calculation: row.has_calculation,
        calculation_id: row.calculation_id,
        calculation_status: row.calculation_status,
        calculation_amount: row.calculation_amount,
        calculation_created_at: row.calculation_created_at
          ? new Date(row.calculation_created_at)
          : undefined,
        has_letter: row.has_letter,
        letter_id: row.letter_id,
        letter_sent_at: row.letter_sent_at ? new Date(row.letter_sent_at) : undefined,
        payment_status: row.payment_status as PaymentStatus,
        payment_amount: row.payment_amount,
        payment_date: row.payment_date ? new Date(row.payment_date) : undefined,
        payment_method_selected: row.payment_method_selected || null,
        amount_after_selected_discount: row.amount_after_selected_discount || null,
        payment_method_selected_at: row.payment_method_selected_at
          ? new Date(row.payment_method_selected_at)
          : null,
      }));

      // Calculate KPIs from client data
      const kpis = this.calculateKPIs(clients);

      await this.logAction('get_fee_tracking_data', undefined, {
        tax_year: taxYear,
        total_clients: clients.length,
      });

      return {
        data: { kpis, clients },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Calculate KPIs from client tracking data
   * @private
   */
  private calculateKPIs(clients: FeeTrackingRow[]): FeeTrackingKPIs {
    const total_clients = clients.length;

    // Count by payment status
    const not_calculated = clients.filter(
      (c) => c.payment_status === 'not_calculated'
    ).length;

    const calculated_not_sent = clients.filter(
      (c) => c.payment_status === 'not_sent'
    ).length;

    const sent_not_paid = clients.filter(
      (c) => c.payment_status === 'pending' || c.payment_status === 'partial_paid'
    ).length;

    const paid = clients.filter((c) => c.payment_status === 'paid').length;

    // Completion percentage (how many completed the full process)
    const completion_percentage =
      total_clients > 0 ? (paid / total_clients) * 100 : 0;

    return {
      total_clients,
      not_calculated,
      calculated_not_sent,
      sent_not_paid,
      paid,
      completion_percentage,
    };
  }

  /**
   * Send letter directly for a calculation that doesn't have one yet
   * Creates generated_letter and sends email
   *
   * @param calculationId - Fee calculation ID
   * @returns Success/error response
   */
  async sendLetterDirect(calculationId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Get the fee calculation
      const { data: feeCalc, error: feeError } = await supabase
        .from('fee_calculations')
        .select('*')
        .eq('id', calculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (feeError) throw feeError;
      if (!feeCalc) throw new Error('Fee calculation not found');

      // TODO: Generate letter using template service
      // This will be integrated with the existing letter generation system

      await this.logAction('send_letter_direct', calculationId, {
        client_id: feeCalc.client_id,
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Send payment reminder letter for an existing letter
   *
   * @param letterId - Generated letter ID
   * @returns Success/error response
   */
  async sendReminderLetter(letterId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Get the generated letter
      const { data: letter, error: letterError } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .eq('tenant_id', tenantId)
        .single();

      if (letterError) throw letterError;
      if (!letter) throw new Error('Letter not found');

      // TODO: Resend the letter via email service
      // This will be integrated with the existing email sending system

      await this.logAction('send_reminder_letter', letterId, {
        client_id: letter.client_id,
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get summary statistics only (without full client list)
   * Useful for quick dashboard widgets
   *
   * @param taxYear - Tax year
   * @returns KPIs only
   */
  async getKPIsOnly(taxYear: number): Promise<ServiceResponse<FeeTrackingKPIs>> {
    try {
      // Get full data and extract just KPIs
      const response = await this.getTrackingData(taxYear);

      if (response.error || !response.data) {
        return { data: null, error: response.error };
      }

      return { data: response.data.kpis, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get enhanced fee tracking data with payment details, deviations, and installments
   * Uses fee_tracking_enhanced_view for comprehensive data
   *
   * @param year - Tax year to track
   * @param filters - Optional filters for data
   * @returns Enhanced tracking data
   */
  async getEnhancedTrackingData(
    year: number,
    filters?: FeeTrackingFilters
  ): Promise<ServiceResponse<FeeTrackingEnhancedRow[]>> {
    try {
      const tenantId = await this.getTenantId();

      // Start with base query on enhanced view
      let query = supabase
        .from('fee_tracking_enhanced_view')
        .select('*')
        .eq('year', year)
        .order('company_name', { ascending: true });

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        query = query.or(
          `company_name.ilike.%${searchTerm}%,tax_id.ilike.%${searchTerm}%`
        );
      }

      if (filters?.deviationLevel) {
        query = query.eq('deviation_alert_level', filters.deviationLevel);
      }

      if (filters?.hasFiles !== undefined) {
        if (filters.hasFiles) {
          query = query.gt('attachment_count', 0);
        } else {
          query = query.eq('attachment_count', 0);
        }
      }

      if (filters?.paymentMethod) {
        query = query.eq('actual_payment_method', filters.paymentMethod);
      }

      if (filters?.minAmount !== undefined) {
        query = query.gte('actual_amount_paid', filters.minAmount);
      }

      if (filters?.maxAmount !== undefined) {
        query = query.lte('actual_amount_paid', filters.maxAmount);
      }

      const { data, error } = await query;

      if (error) throw error;

      await this.logAction('get_enhanced_tracking_data', undefined, {
        year,
        filters,
        row_count: data?.length || 0,
      });

      return {
        data: (data || []) as FeeTrackingEnhancedRow[],
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get payment details for a specific fee calculation
   * Returns complete payment information including installments and files
   *
   * @param feeCalculationId - Fee calculation ID
   * @returns Payment details
   */
  async getPaymentDetails(
    feeCalculationId: string
  ): Promise<ServiceResponse<ActualPaymentDetails | null>> {
    try {
      return await actualPaymentService.getPaymentDetails(feeCalculationId);
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }
}

// Export singleton instance
export const feeTrackingService = new FeeTrackingService();
