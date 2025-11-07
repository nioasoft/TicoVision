/**
 * Actual Payment Service
 *
 * Handles recording actual payments from clients, calculating deviations from expected amounts,
 * managing installments, and integrating with the collection system.
 *
 * @module actual-payment.service
 */

import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  ActualPayment,
  PaymentDeviation,
  PaymentInstallment,
  PaymentMethod,
  AlertLevel,
  VAT_RATE,
} from '@/types/payment.types';
import type { ClientAttachment } from '@/types/file-attachment.types';

/**
 * Data for recording a new payment
 */
export interface RecordPaymentData {
  clientId: string;
  feeCalculationId: string;

  // Payment details
  amountPaid: number;                    // Total amount paid
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  paymentReference?: string;

  // Installments (optional)
  numInstallments?: number;

  // Files (optional)
  attachmentIds?: string[];

  // Notes
  notes?: string;
}

/**
 * Data for creating installments
 */
export interface CreateInstallmentData {
  installmentNumber: number;
  installmentDate: Date;
  installmentAmount: number;
  notes?: string;
}

/**
 * Data for updating an existing payment
 */
export interface UpdatePaymentData {
  amountPaid?: number;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  attachmentIds?: string[];
  notes?: string;
}

/**
 * Complete payment details with all related data
 */
export interface ActualPaymentDetails {
  payment: ActualPayment;
  deviation: PaymentDeviation | null;
  installments: PaymentInstallment[];
  attachments: ClientAttachment[];
  feeCalculation: {
    id: string;
    clientName: string;
    originalAmount: number;
    expectedAmount: number;
    paymentMethodSelected: PaymentMethod | null;
  };
}

/**
 * VAT breakdown calculation result
 */
export interface VATBreakdown {
  beforeVat: number;
  vat: number;
  withVat: number;
}

/**
 * Payment with installments (transaction result)
 */
export interface ActualPaymentWithInstallments {
  payment: ActualPayment;
  deviation: PaymentDeviation;
  installments: PaymentInstallment[];
}

class ActualPaymentService extends BaseService {
  private readonly VAT_RATE = 0.18; // 18% VAT for Israel

  constructor() {
    super('actual_payments');
  }

  /**
   * Record a new actual payment
   * - Creates actual_payment record
   * - Calculates and creates payment_deviation
   * - Updates fee_calculation with actual_payment_id
   * - Optionally creates installments
   *
   * @param data - Payment data to record
   * @returns Created payment record
   */
  async recordPayment(data: RecordPaymentData): Promise<ServiceResponse<ActualPayment>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Calculate VAT breakdown
      const vatBreakdown = this.calculateVATAmounts(data.amountPaid);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // 2. Insert actual payment
      const { data: payment, error: paymentError } = await supabase
        .from('actual_payments')
        .insert({
          tenant_id: tenantId,
          client_id: data.clientId,
          fee_calculation_id: data.feeCalculationId,
          amount_paid: data.amountPaid,
          amount_before_vat: vatBreakdown.beforeVat,
          amount_vat: vatBreakdown.vat,
          amount_with_vat: vatBreakdown.withVat,
          payment_date: data.paymentDate.toISOString(),
          payment_method: data.paymentMethod,
          payment_reference: data.paymentReference,
          num_installments: data.numInstallments,
          attachment_ids: data.attachmentIds || [],
          notes: data.notes,
          created_by: user?.id,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // 3. Calculate and create deviation
      const { data: deviationCalc, error: deviationCalcError } = await supabase
        .rpc('calculate_payment_deviation', {
          p_fee_calculation_id: data.feeCalculationId,
          p_actual_amount: data.amountPaid,
        })
        .single();

      if (deviationCalcError) {
        // Deviation calculation is not critical - log but continue
        console.error('Failed to calculate deviation:', deviationCalcError);
      }

      if (deviationCalc?.success) {
        await supabase
          .from('payment_deviations')
          .insert({
            tenant_id: tenantId,
            client_id: data.clientId,
            fee_calculation_id: data.feeCalculationId,
            actual_payment_id: payment.id,
            expected_discount_percent: deviationCalc.expected_discount_percent,
            expected_amount: deviationCalc.expected_amount,
            actual_amount: deviationCalc.actual_amount,
            deviation_amount: deviationCalc.deviation_amount,
            deviation_percent: deviationCalc.deviation_percent,
            alert_level: deviationCalc.alert_level,
            alert_message: deviationCalc.alert_message,
          });
      }

      // 4. Update fee_calculation
      await supabase
        .from('fee_calculations')
        .update({
          actual_payment_id: payment.id,
          has_deviation: deviationCalc?.alert_level !== 'info',
          deviation_alert_level: deviationCalc?.alert_level,
          status: 'paid',
          payment_date: data.paymentDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.feeCalculationId)
        .eq('tenant_id', tenantId);

      // 5. Log action
      await this.logAction('record_payment', payment.id, {
        client_id: data.clientId,
        amount: data.amountPaid,
        method: data.paymentMethod,
        has_deviation: deviationCalc?.alert_level !== 'info',
      });

      return { data: payment, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Record payment with installment schedule
   * - Creates payment + deviation
   * - Creates installment records
   * - All in a single transaction
   *
   * @param paymentData - Payment data
   * @param installmentsData - Installment schedule
   * @returns Payment with installments
   */
  async recordPaymentWithInstallments(
    paymentData: RecordPaymentData,
    installmentsData: CreateInstallmentData[]
  ): Promise<ServiceResponse<ActualPaymentWithInstallments>> {
    try {
      const tenantId = await this.getTenantId();

      // First create the payment
      const paymentResult = await this.recordPayment(paymentData);
      if (paymentResult.error || !paymentResult.data) {
        return { data: null, error: paymentResult.error };
      }

      // Create installments
      const installments: PaymentInstallment[] = [];
      for (const installmentData of installmentsData) {
        const { data: installment, error: installmentError } = await supabase
          .from('payment_installments')
          .insert({
            tenant_id: tenantId,
            actual_payment_id: paymentResult.data.id,
            installment_number: installmentData.installmentNumber,
            installment_date: installmentData.installmentDate.toISOString(),
            installment_amount: installmentData.installmentAmount,
            status: 'pending',
            notes: installmentData.notes,
          })
          .select()
          .single();

        if (installmentError) throw installmentError;
        installments.push(installment);
      }

      // Get deviation record
      const { data: deviation, error: deviationError } = await supabase
        .from('payment_deviations')
        .select('*')
        .eq('actual_payment_id', paymentResult.data.id)
        .eq('tenant_id', tenantId)
        .single();

      if (deviationError) {
        // Deviation might not exist if calculation failed - that's OK
        console.warn('No deviation record found:', deviationError);
      }

      // Log action
      await this.logAction('record_payment_with_installments', paymentResult.data.id, {
        installment_count: installments.length,
      });

      return {
        data: {
          payment: paymentResult.data,
          deviation: deviation || null,
          installments,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update existing payment
   * - Recalculates deviation if amount changed
   * - Updates fee_calculation flags
   *
   * @param paymentId - Payment ID to update
   * @param data - Updated payment data
   * @returns Updated payment record
   */
  async updatePayment(
    paymentId: string,
    data: UpdatePaymentData
  ): Promise<ServiceResponse<ActualPayment>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get current payment to check if amount changed
      const { data: currentPayment, error: fetchError } = await supabase
        .from('actual_payments')
        .select('amount_paid, fee_calculation_id')
        .eq('id', paymentId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      // Prepare update data
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      };

      let vatBreakdown: VATBreakdown | null = null;

      // If amount changed, recalculate VAT
      if (data.amountPaid !== undefined && data.amountPaid !== currentPayment.amount_paid) {
        vatBreakdown = this.calculateVATAmounts(data.amountPaid);
        updateData.amount_paid = data.amountPaid;
        updateData.amount_before_vat = vatBreakdown.beforeVat;
        updateData.amount_vat = vatBreakdown.vat;
        updateData.amount_with_vat = vatBreakdown.withVat;
      }

      if (data.paymentDate) {
        updateData.payment_date = data.paymentDate.toISOString();
      }
      if (data.paymentMethod) {
        updateData.payment_method = data.paymentMethod;
      }
      if (data.paymentReference !== undefined) {
        updateData.payment_reference = data.paymentReference;
      }
      if (data.attachmentIds !== undefined) {
        updateData.attachment_ids = data.attachmentIds;
      }
      if (data.notes !== undefined) {
        updateData.notes = data.notes;
      }

      // Update payment record
      const { data: updatedPayment, error: updateError } = await supabase
        .from('actual_payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If amount changed, recalculate deviation
      if (vatBreakdown && data.amountPaid !== undefined) {
        // Delete old deviation
        await supabase
          .from('payment_deviations')
          .delete()
          .eq('actual_payment_id', paymentId)
          .eq('tenant_id', tenantId);

        // Calculate new deviation
        const { data: deviationCalc } = await supabase
          .rpc('calculate_payment_deviation', {
            p_fee_calculation_id: currentPayment.fee_calculation_id,
            p_actual_amount: data.amountPaid,
          })
          .single();

        if (deviationCalc?.success) {
          await supabase
            .from('payment_deviations')
            .insert({
              tenant_id: tenantId,
              client_id: updatedPayment.client_id,
              fee_calculation_id: currentPayment.fee_calculation_id,
              actual_payment_id: paymentId,
              expected_discount_percent: deviationCalc.expected_discount_percent,
              expected_amount: deviationCalc.expected_amount,
              actual_amount: deviationCalc.actual_amount,
              deviation_amount: deviationCalc.deviation_amount,
              deviation_percent: deviationCalc.deviation_percent,
              alert_level: deviationCalc.alert_level,
              alert_message: deviationCalc.alert_message,
            });

          // Update fee_calculation with new deviation info
          await supabase
            .from('fee_calculations')
            .update({
              has_deviation: deviationCalc.alert_level !== 'info',
              deviation_alert_level: deviationCalc.alert_level,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentPayment.fee_calculation_id)
            .eq('tenant_id', tenantId);
        }
      }

      // Log action
      await this.logAction('update_payment', paymentId, {
        updated_fields: Object.keys(data),
        amount_changed: data.amountPaid !== undefined,
      });

      return { data: updatedPayment, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get payment details with all related data
   * - Payment record
   * - Deviation info
   * - Installments (if any)
   * - File attachments
   *
   * @param feeCalculationId - Fee calculation ID
   * @returns Complete payment details
   */
  async getPaymentDetails(
    feeCalculationId: string
  ): Promise<ServiceResponse<ActualPaymentDetails | null>> {
    try {
      const tenantId = await this.getTenantId();

      // Get payment record
      const { data: payment, error: paymentError } = await supabase
        .from('actual_payments')
        .select('*')
        .eq('fee_calculation_id', feeCalculationId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (paymentError) throw paymentError;
      if (!payment) {
        return { data: null, error: null };
      }

      // Get deviation
      const { data: deviation } = await supabase
        .from('payment_deviations')
        .select('*')
        .eq('actual_payment_id', payment.id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      // Get installments
      const { data: installments } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('actual_payment_id', payment.id)
        .eq('tenant_id', tenantId)
        .order('installment_number', { ascending: true });

      // Get fee calculation info
      const { data: feeCalc, error: feeError } = await supabase
        .from('fee_calculations')
        .select(`
          id,
          final_amount,
          amount_after_selected_discount,
          payment_method_selected,
          clients (company_name)
        `)
        .eq('id', feeCalculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (feeError) throw feeError;

      // Get attachments if any
      const attachments: ClientAttachment[] = [];
      if (payment.attachment_ids && payment.attachment_ids.length > 0) {
        const { data: attachmentData } = await supabase
          .from('client_attachments')
          .select('*')
          .in('id', payment.attachment_ids)
          .eq('tenant_id', tenantId);

        if (attachmentData) {
          attachments.push(...attachmentData);
        }
      }

      const details: ActualPaymentDetails = {
        payment,
        deviation: deviation || null,
        installments: installments || [],
        attachments,
        feeCalculation: {
          id: feeCalc.id,
          clientName: (feeCalc.clients as { company_name: string })?.company_name || 'Unknown',
          originalAmount: feeCalc.final_amount || 0,
          expectedAmount: feeCalc.amount_after_selected_discount || feeCalc.final_amount || 0,
          paymentMethodSelected: feeCalc.payment_method_selected as PaymentMethod | null,
        },
      };

      return { data: details, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete payment and cleanup
   * - Removes payment record (cascade deletes installments)
   * - Removes deviation record
   * - Updates fee_calculation
   *
   * @param paymentId - Payment ID to delete
   * @returns Success status
   */
  async deletePayment(paymentId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Get payment info before deleting
      const { data: payment, error: fetchError } = await supabase
        .from('actual_payments')
        .select('fee_calculation_id, client_id')
        .eq('id', paymentId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      // Delete deviation (will be cascaded but let's be explicit)
      await supabase
        .from('payment_deviations')
        .delete()
        .eq('actual_payment_id', paymentId)
        .eq('tenant_id', tenantId);

      // Delete payment (will cascade to installments)
      const { error: deleteError } = await supabase
        .from('actual_payments')
        .delete()
        .eq('id', paymentId)
        .eq('tenant_id', tenantId);

      if (deleteError) throw deleteError;

      // Update fee_calculation
      await supabase
        .from('fee_calculations')
        .update({
          actual_payment_id: null,
          has_deviation: false,
          deviation_alert_level: null,
          status: 'sent', // Reset to sent
          payment_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.fee_calculation_id)
        .eq('tenant_id', tenantId);

      // Log action
      await this.logAction('delete_payment', paymentId, {
        client_id: payment.client_id,
        fee_calculation_id: payment.fee_calculation_id,
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: undefined, error: this.handleError(error as Error) };
    }
  }

  /**
   * Calculate VAT amounts from total
   * - Returns before VAT, VAT amount, with VAT
   *
   * Formula:
   * - Before VAT = Total / 1.18
   * - VAT = Before VAT * 0.18
   * - With VAT = Before VAT + VAT (should equal Total)
   *
   * @param totalAmount - Total amount including VAT
   * @returns VAT breakdown
   */
  calculateVATAmounts(totalAmount: number): VATBreakdown {
    const beforeVat = Math.round((totalAmount / (1 + this.VAT_RATE)) * 100) / 100;
    const vat = Math.round((beforeVat * this.VAT_RATE) * 100) / 100;
    const withVat = beforeVat + vat;

    return {
      beforeVat,
      vat,
      withVat,
    };
  }

  /**
   * Get expected amount for fee calculation
   * - Fetches from fee_calculations.amount_after_selected_discount
   *
   * @param feeCalculationId - Fee calculation ID
   * @returns Expected amount
   */
  async getExpectedAmount(feeCalculationId: string): Promise<ServiceResponse<number>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('fee_calculations')
        .select('amount_after_selected_discount, final_amount')
        .eq('id', feeCalculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      // Use discounted amount if available, otherwise use final amount
      const expectedAmount = data.amount_after_selected_discount || data.final_amount || 0;

      return { data: expectedAmount, error: null };
    } catch (error) {
      return { data: 0, error: this.handleError(error as Error) };
    }
  }
}

// Export singleton instance
export const actualPaymentService = new ActualPaymentService();
