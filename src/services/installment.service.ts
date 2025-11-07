/**
 * Installment Service
 * Manages payment installment tracking, status updates, and overdue detection
 */

import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type { PaymentInstallment, InstallmentStatus } from '@/types/payment.types';

export interface InstallmentSummary {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

class InstallmentService extends BaseService {
  constructor() {
    super('payment_installments');
  }

  /**
   * Get all installments for a payment
   */
  async getInstallments(actualPaymentId: string): Promise<ServiceResponse<PaymentInstallment[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('payment_installments')
        .select('*')
        .eq('actual_payment_id', actualPaymentId)
        .eq('tenant_id', tenantId)
        .order('installment_number', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get installment summary statistics
   */
  async getInstallmentSummary(
    actualPaymentId: string
  ): Promise<ServiceResponse<InstallmentSummary>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('payment_installments')
        .select('status, installment_amount')
        .eq('actual_payment_id', actualPaymentId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      const installments = data || [];

      const summary: InstallmentSummary = {
        total: installments.length,
        paid: installments.filter((i) => i.status === 'paid').length,
        pending: installments.filter((i) => i.status === 'pending').length,
        overdue: installments.filter((i) => i.status === 'overdue').length,
        totalAmount: installments.reduce((sum, i) => sum + Number(i.installment_amount), 0),
        paidAmount: installments
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + Number(i.installment_amount), 0),
        remainingAmount: 0,
      };

      summary.remainingAmount = summary.totalAmount - summary.paidAmount;

      return { data: summary, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark installment as paid
   */
  async markInstallmentPaid(
    installmentId: string,
    paidDate: Date
  ): Promise<ServiceResponse<PaymentInstallment>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('payment_installments')
        .update({
          status: 'paid',
          paid_date: paidDate.toISOString().split('T')[0],
        })
        .eq('id', installmentId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('mark_installment_paid', installmentId, {
        paid_date: paidDate.toISOString(),
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Generate installment schedule helper
   */
  generateInstallmentSchedule(
    numInstallments: number,
    totalAmount: number,
    startDate: Date,
    intervalMonths: number = 1
  ): Array<{ installmentNumber: number; installmentDate: Date; installmentAmount: number }> {
    const amountPerInstallment = Math.ceil(totalAmount / numInstallments);
    const schedule = [];

    for (let i = 0; i < numInstallments; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(installmentDate.getMonth() + i * intervalMonths);

      const isLast = i === numInstallments - 1;
      const amount = isLast
        ? totalAmount - amountPerInstallment * (numInstallments - 1)
        : amountPerInstallment;

      schedule.push({
        installmentNumber: i + 1,
        installmentDate,
        installmentAmount: amount,
      });
    }

    return schedule;
  }
}

export const installmentService = new InstallmentService();
