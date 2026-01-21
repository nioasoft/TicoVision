/**
 * Billing Letter Service
 *
 * Handles creation and management of general billing letters (not fee-based).
 * Supports bank transfer only payment with flexible discounts.
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type {
  BillingLetter,
  BillingLetterWithClient,
  CreateBillingLetterInput,
  UpdateBillingLetterInput,
  MarkAsSentManuallyInput,
  SentMethod,
  BillingLetterStatus,
} from '../types/billing.types';
import { calculateBillingAmounts, VAT_RATE } from '../types/billing.types';

class BillingLetterService extends BaseService {
  constructor() {
    super('billing_letters');
  }

  /**
   * Create a new billing letter
   */
  async create(input: CreateBillingLetterInput): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate amounts
      const amounts = calculateBillingAmounts(
        input.amount_before_vat,
        input.bank_discount_percentage || 0
      );

      const { data, error } = await supabase
        .from('billing_letters')
        .insert({
          tenant_id: tenantId,
          client_id: input.client_id,
          service_description: input.service_description,
          amount_before_vat: amounts.amountBeforeVat,
          vat_rate: VAT_RATE * 100, // Store as percentage (18)
          vat_amount: amounts.vatAmount,
          total_amount: amounts.totalAmount,
          bank_discount_percentage: input.bank_discount_percentage || 0,
          amount_after_discount: amounts.amountAfterDiscountWithVat,
          due_date: input.due_date || null,
          notes: input.notes || null,
          status: 'draft',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_billing_letter', data.id, {
        client_id: input.client_id,
        amount: amounts.totalAmount,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all billing letters for the tenant
   */
  async getAll(): Promise<ServiceResponse<BillingLetterWithClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew, tax_id)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data as BillingLetterWithClient[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get billing letters by status
   */
  async getByStatus(status: BillingLetterStatus): Promise<ServiceResponse<BillingLetterWithClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew, tax_id)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data as BillingLetterWithClient[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get a single billing letter by ID
   */
  async getById(id: string): Promise<ServiceResponse<BillingLetterWithClient>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew, tax_id)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data: data as BillingLetterWithClient, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get billing letters for a specific client
   */
  async getByClient(clientId: string): Promise<ServiceResponse<BillingLetter[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update a billing letter
   */
  async update(id: string, input: UpdateBillingLetterInput): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // If amount or discount changed, recalculate
      let updateData: Record<string, unknown> = { ...input };

      if (input.amount_before_vat !== undefined || input.bank_discount_percentage !== undefined) {
        // Get current values if not provided
        const { data: current } = await supabase
          .from('billing_letters')
          .select('amount_before_vat, bank_discount_percentage')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (current) {
          const amountBeforeVat = input.amount_before_vat ?? current.amount_before_vat;
          const discountPercent = input.bank_discount_percentage ?? current.bank_discount_percentage;
          const amounts = calculateBillingAmounts(amountBeforeVat, discountPercent);

          updateData = {
            ...updateData,
            amount_before_vat: amounts.amountBeforeVat,
            vat_amount: amounts.vatAmount,
            total_amount: amounts.totalAmount,
            amount_after_discount: amounts.amountAfterDiscountWithVat,
          };
        }
      }

      const { data, error } = await supabase
        .from('billing_letters')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_billing_letter', id, {
        updated_fields: Object.keys(input),
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update billing letter status
   */
  async updateStatus(id: string, status: BillingLetterStatus): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .update({ status })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('update_billing_letter_status', id, { status });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark billing letter as sent manually (not via email system)
   */
  async markAsSentManually(
    id: string,
    input: MarkAsSentManuallyInput
  ): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .update({
          status: 'sent',
          sent_manually: true,
          sent_at: new Date().toISOString(),
          sent_method: input.sent_method,
          notes: input.notes || null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('mark_billing_letter_sent_manually', id, {
        sent_method: input.sent_method,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark billing letter as sent via email
   * Called after the email is successfully sent
   */
  async markAsSentViaEmail(
    id: string,
    generatedLetterId: string
  ): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .update({
          status: 'sent',
          sent_manually: false,
          sent_at: new Date().toISOString(),
          sent_method: 'email' as SentMethod,
          generated_letter_id: generatedLetterId,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('mark_billing_letter_sent_email', id, {
        generated_letter_id: generatedLetterId,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark billing letter as paid
   */
  async markAsPaid(
    id: string,
    paymentReference?: string,
    actualPaymentId?: string
  ): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0], // Date only
          payment_reference: paymentReference || null,
          actual_payment_id: actualPaymentId || null,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('mark_billing_letter_paid', id, {
        payment_reference: paymentReference,
        actual_payment_id: actualPaymentId,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Cancel a billing letter
   */
  async cancel(id: string): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      await this.logAction('cancel_billing_letter', id);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a billing letter (only if draft)
   */
  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if it's a draft
      const { data: current, error: fetchError } = await supabase
        .from('billing_letters')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;

      if (current.status !== 'draft') {
        throw new Error('רק מכתבי חיוב בסטטוס טיוטה ניתנים למחיקה');
      }

      const { error } = await supabase
        .from('billing_letters')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('delete_billing_letter', id);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: undefined, error: this.handleError(error as Error) };
    }
  }

  /**
   * Link billing letter to generated letter
   */
  async linkToGeneratedLetter(
    billingLetterId: string,
    generatedLetterId: string
  ): Promise<ServiceResponse<BillingLetter>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .update({ generated_letter_id: generatedLetterId })
        .eq('id', billingLetterId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get billing letters for collection dashboard (sent or paid only)
   */
  async getForCollection(): Promise<ServiceResponse<BillingLetterWithClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('billing_letters')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew, tax_id)
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'paid'])
        .order('sent_at', { ascending: false });

      if (error) throw error;

      return { data: data as BillingLetterWithClient[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

// Export singleton instance
export const billingLetterService = new BillingLetterService();
