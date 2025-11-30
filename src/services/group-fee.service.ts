/**
 * Group Fee Service
 *
 * Service for managing group fee calculations - fee letters sent to entire client groups
 * instead of individual clients. When a group pays, all member companies are marked as paid.
 */

import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams } from './base.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

// Types from database
type GroupFeeCalculationRow = Database['public']['Tables']['group_fee_calculations']['Row'];
type GroupFeeCalculationInsert = Database['public']['Tables']['group_fee_calculations']['Insert'];
type GroupFeeCalculationUpdate = Database['public']['Tables']['group_fee_calculations']['Update'];
type GroupFeeStatus = Database['public']['Enums']['group_fee_status'];

// Extended types with relations
export interface GroupFeeCalculation extends GroupFeeCalculationRow {
  client_group?: {
    id: string;
    group_name_hebrew: string;
    primary_owner: string;
    combined_billing: boolean;
    combined_letters: boolean;
  };
  clients?: GroupMemberClient[];
}

export interface GroupMemberClient {
  id: string;
  company_name: string;
  company_name_hebrew?: string;
  tax_id: string;
  internal_external: 'internal' | 'external';
  status: string;
}

export interface ClientGroup {
  id: string;
  tenant_id: string;
  group_name_hebrew: string;
  primary_owner: string;
  secondary_owners?: string[];
  combined_billing: boolean;
  combined_letters: boolean;
  notes?: string;
  company_structure_link?: string;
  canva_link?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  clients?: GroupMemberClient[];
}

// Input types
export interface GroupFeeCalculationInput {
  group_id: string;
  year: number;
  // Audit fee
  audit_base_amount: number;
  audit_inflation_rate?: number;
  audit_apply_inflation_index?: boolean;
  audit_index_manual_adjustment?: number;
  audit_real_adjustment?: number;
  audit_real_adjustment_reason?: string;
  audit_discount_percentage?: number;
  // Bookkeeping fee (for internal groups)
  bookkeeping_base_amount?: number;
  bookkeeping_inflation_rate?: number;
  bookkeeping_apply_inflation_index?: boolean;
  bookkeeping_index_manual_adjustment?: number;
  bookkeeping_real_adjustment?: number;
  bookkeeping_real_adjustment_reason?: string;
  bookkeeping_discount_percentage?: number;
  // Bank transfer only option
  bank_transfer_only?: boolean;
  bank_transfer_discount_percentage?: number;
  // Client requested adjustment
  client_requested_adjustment?: number;
  client_requested_adjustment_note?: string;
  // Notes
  notes?: string;
}

// Calculated amounts
export interface GroupCalculatedAmounts {
  audit: {
    base_amount: number;
    inflation_adjustment: number;
    real_adjustment: number;
    final_amount: number;
    vat_amount: number;
    final_amount_with_vat: number;
  };
  bookkeeping: {
    base_amount: number;
    inflation_adjustment: number;
    real_adjustment: number;
    final_amount: number;
    vat_amount: number;
    final_amount_with_vat: number;
  };
  total: {
    final_amount: number;
    final_amount_with_vat: number;
  };
  bank_transfer?: {
    discount_percentage: number;
    amount_before_vat: number;
    amount_with_vat: number;
  };
}

// Payment input for marking as paid
export interface GroupPaymentInput {
  payment_method: 'bank_transfer' | 'cc_single' | 'cc_installments' | 'checks';
  payment_date: string;
  payment_reference?: string;
  amount_paid: number;
  notes?: string;
}

const VAT_RATE = 0.18;

class GroupFeeService extends BaseService {
  constructor() {
    super('group_fee_calculations');
  }

  /**
   * Get all groups available for fee calculation (with member counts)
   */
  async getAvailableGroups(year: number): Promise<ServiceResponse<ClientGroup[]>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all groups with their clients
      const { data: groups, error } = await supabase
        .from('client_groups')
        .select(`
          id,
          tenant_id,
          group_name_hebrew,
          primary_owner,
          secondary_owners,
          combined_billing,
          combined_letters,
          notes,
          company_structure_link,
          canva_link,
          created_at,
          updated_at,
          clients:clients(id, company_name, company_name_hebrew, tax_id, internal_external, status)
        `)
        .eq('tenant_id', tenantId)
        .order('group_name_hebrew');

      if (error) throw error;

      // Add member count to each group
      const groupsWithCount = (groups || []).map(group => ({
        ...group,
        member_count: group.clients?.length || 0,
        clients: group.clients as GroupMemberClient[] | undefined
      }));

      return { data: groupsWithCount, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get groups that don't have a calculation for the given year
   */
  async getGroupsWithoutCalculation(year: number): Promise<ServiceResponse<ClientGroup[]>> {
    try {
      const tenantId = await this.getTenantId();

      // Get groups that don't have a calculation for this year
      const { data: groups, error } = await supabase
        .from('client_groups')
        .select(`
          id,
          tenant_id,
          group_name_hebrew,
          primary_owner,
          secondary_owners,
          combined_billing,
          combined_letters,
          notes,
          company_structure_link,
          canva_link,
          created_at,
          updated_at,
          clients:clients(id, company_name, company_name_hebrew, tax_id, internal_external, status)
        `)
        .eq('tenant_id', tenantId)
        .order('group_name_hebrew');

      if (error) throw error;

      // Get existing calculations for this year
      const { data: existingCalcs, error: calcError } = await supabase
        .from('group_fee_calculations')
        .select('group_id')
        .eq('tenant_id', tenantId)
        .eq('year', year);

      if (calcError) throw calcError;

      const calculatedGroupIds = new Set((existingCalcs || []).map(c => c.group_id));

      // Filter out groups that already have calculations
      const availableGroups = (groups || [])
        .filter(group => !calculatedGroupIds.has(group.id))
        .map(group => ({
          ...group,
          member_count: group.clients?.length || 0,
          clients: group.clients as GroupMemberClient[] | undefined
        }));

      return { data: availableGroups, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get group with its members
   */
  async getGroupWithMembers(groupId: string): Promise<ServiceResponse<ClientGroup>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('client_groups')
        .select(`
          id,
          tenant_id,
          group_name_hebrew,
          primary_owner,
          secondary_owners,
          combined_billing,
          combined_letters,
          notes,
          company_structure_link,
          canva_link,
          created_at,
          updated_at,
          clients:clients(id, company_name, company_name_hebrew, tax_id, internal_external, status)
        `)
        .eq('id', groupId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return {
        data: {
          ...data,
          member_count: data.clients?.length || 0,
          clients: data.clients as GroupMemberClient[] | undefined
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get group calculation for a specific year
   */
  async getGroupCalculation(groupId: string, year: number): Promise<ServiceResponse<GroupFeeCalculation | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('group_fee_calculations')
        .select(`
          *,
          client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
        `)
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;

      return { data: data as GroupFeeCalculation | null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all group calculations for a year
   */
  async getGroupCalculationsForYear(year: number, params?: PaginationParams): Promise<ServiceResponse<GroupFeeCalculation[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('group_fee_calculations')
        .select(`
          *,
          client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
        `)
        .eq('tenant_id', tenantId)
        .eq('year', year);

      if (params) {
        query = this.buildPaginationQuery(query, params);
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: (data || []) as GroupFeeCalculation[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Calculate amounts based on input
   */
  calculateGroupAmounts(input: GroupFeeCalculationInput): GroupCalculatedAmounts {
    // Audit fee calculation
    const auditBase = input.audit_base_amount || 0;
    const auditInflationRate = input.audit_inflation_rate ?? 3.0;
    const auditApplyIndex = input.audit_apply_inflation_index ?? true;
    const auditIndexAdjustment = input.audit_index_manual_adjustment || 0;
    const auditRealAdjustment = input.audit_real_adjustment || 0;
    const auditDiscountPercent = input.audit_discount_percentage || 0;

    let auditInflationAmount = 0;
    if (auditApplyIndex && auditBase > 0) {
      auditInflationAmount = auditBase * (auditInflationRate / 100) + auditIndexAdjustment;
    }

    const auditAfterIndex = auditBase + auditInflationAmount + auditRealAdjustment;
    const auditAfterDiscount = auditAfterIndex * (1 - auditDiscountPercent / 100);
    const auditVat = auditAfterDiscount * VAT_RATE;
    const auditWithVat = auditAfterDiscount + auditVat;

    // Bookkeeping fee calculation
    const bookkeepingBase = input.bookkeeping_base_amount || 0;
    const bookkeepingInflationRate = input.bookkeeping_inflation_rate ?? 3.0;
    const bookkeepingApplyIndex = input.bookkeeping_apply_inflation_index ?? true;
    const bookkeepingIndexAdjustment = input.bookkeeping_index_manual_adjustment || 0;
    const bookkeepingRealAdjustment = input.bookkeeping_real_adjustment || 0;
    const bookkeepingDiscountPercent = input.bookkeeping_discount_percentage || 0;

    let bookkeepingInflationAmount = 0;
    if (bookkeepingApplyIndex && bookkeepingBase > 0) {
      bookkeepingInflationAmount = bookkeepingBase * (bookkeepingInflationRate / 100) + bookkeepingIndexAdjustment;
    }

    const bookkeepingAfterIndex = bookkeepingBase + bookkeepingInflationAmount + bookkeepingRealAdjustment;
    const bookkeepingAfterDiscount = bookkeepingAfterIndex * (1 - bookkeepingDiscountPercent / 100);
    const bookkeepingVat = bookkeepingAfterDiscount * VAT_RATE;
    const bookkeepingWithVat = bookkeepingAfterDiscount + bookkeepingVat;

    // Client requested adjustment (applies to total)
    const clientAdjustment = input.client_requested_adjustment || 0;

    // Total calculation
    const totalBeforeVat = auditAfterDiscount + bookkeepingAfterDiscount + clientAdjustment;
    const totalVat = totalBeforeVat * VAT_RATE;
    const totalWithVat = totalBeforeVat + totalVat;

    // Bank transfer discount (if applicable)
    let bankTransfer: GroupCalculatedAmounts['bank_transfer'] | undefined;
    if (input.bank_transfer_only && input.bank_transfer_discount_percentage) {
      const discountPercent = input.bank_transfer_discount_percentage;
      const bankBeforeVat = totalBeforeVat * (1 - discountPercent / 100);
      const bankVat = bankBeforeVat * VAT_RATE;
      const bankWithVat = bankBeforeVat + bankVat;
      bankTransfer = {
        discount_percentage: discountPercent,
        amount_before_vat: bankBeforeVat,
        amount_with_vat: bankWithVat
      };
    }

    return {
      audit: {
        base_amount: auditBase,
        inflation_adjustment: auditInflationAmount,
        real_adjustment: auditRealAdjustment,
        final_amount: auditAfterDiscount,
        vat_amount: auditVat,
        final_amount_with_vat: auditWithVat
      },
      bookkeeping: {
        base_amount: bookkeepingBase,
        inflation_adjustment: bookkeepingInflationAmount,
        real_adjustment: bookkeepingRealAdjustment,
        final_amount: bookkeepingAfterDiscount,
        vat_amount: bookkeepingVat,
        final_amount_with_vat: bookkeepingWithVat
      },
      total: {
        final_amount: totalBeforeVat,
        final_amount_with_vat: totalWithVat
      },
      bank_transfer: bankTransfer
    };
  }

  /**
   * Get aggregated data for a group from individual client calculations (fallback for previous year)
   */
  async getAggregatedGroupData(groupId: string, year: number): Promise<ServiceResponse<{
    base_amount: number;
    total_with_vat: number;
    discount_amount: number;
  } | null>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Get all clients in the group
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId);

      if (clientsError) throw clientsError;
      if (!clients || clients.length === 0) return { data: null, error: null };

      const clientIds = clients.map(c => c.id);

      // 2. Get all fee calculations for these clients for the year
      const { data: fees, error: feesError } = await supabase
        .from('fee_calculations')
        .select('base_amount, total_amount, discount_amount, final_amount, vat_amount, discount_percentage, previous_year_discount')
        .eq('tenant_id', tenantId)
        .eq('year', year)
        .in('client_id', clientIds);

      if (feesError) throw feesError;

      if (!fees || fees.length === 0) return { data: null, error: null };

      // 3. Aggregate totals
      const totals = fees.reduce((acc, fee) => {
        // Use either total_amount or calculate from final + vat
        const totalWithVat = fee.total_amount || ((fee.final_amount || 0) + (fee.vat_amount || 0));
        
        let feeDiscountAmount = fee.discount_amount || 0;
        
        // If discount_amount is 0 but percentage exists, calculate it
        if (feeDiscountAmount === 0 && fee.discount_percentage && fee.discount_percentage > 0 && fee.base_amount) {
             feeDiscountAmount = fee.base_amount * (fee.discount_percentage / 100);
        }

        // If still 0, try to calculate from previous_year_discount (which is itself a percentage from year-2)
        if (feeDiscountAmount === 0 && fee.previous_year_discount && fee.previous_year_discount > 0 && fee.base_amount) {
            feeDiscountAmount = fee.base_amount * (fee.previous_year_discount / 100);
        }

        return {
          base_amount: acc.base_amount + (fee.base_amount || 0),
          total_with_vat: acc.total_with_vat + totalWithVat,
          discount_amount: acc.discount_amount + feeDiscountAmount
        };
      }, { base_amount: 0, total_with_vat: 0, discount_amount: 0 });

      return { data: totals, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Save (create or update) group calculation
   */
  async saveGroupCalculation(input: GroupFeeCalculationInput): Promise<ServiceResponse<GroupFeeCalculation>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Calculate amounts
      const amounts = this.calculateGroupAmounts(input);

      // Check if calculation already exists
      const { data: existing } = await supabase
        .from('group_fee_calculations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('group_id', input.group_id)
        .eq('year', input.year)
        .maybeSingle();

      const calculationData: GroupFeeCalculationInsert | GroupFeeCalculationUpdate = {
        tenant_id: tenantId,
        group_id: input.group_id,
        year: input.year,
        // Audit
        audit_base_amount: input.audit_base_amount,
        audit_inflation_rate: input.audit_inflation_rate ?? 3.0,
        audit_apply_inflation_index: input.audit_apply_inflation_index ?? true,
        audit_index_manual_adjustment: input.audit_index_manual_adjustment || 0,
        audit_real_adjustment: input.audit_real_adjustment || 0,
        audit_real_adjustment_reason: input.audit_real_adjustment_reason || null,
        audit_discount_percentage: input.audit_discount_percentage || 0,
        audit_final_amount: amounts.audit.final_amount,
        audit_final_amount_with_vat: amounts.audit.final_amount_with_vat,
        // Bookkeeping
        bookkeeping_base_amount: input.bookkeeping_base_amount || 0,
        bookkeeping_inflation_rate: input.bookkeeping_inflation_rate ?? 3.0,
        bookkeeping_apply_inflation_index: input.bookkeeping_apply_inflation_index ?? true,
        bookkeeping_index_manual_adjustment: input.bookkeeping_index_manual_adjustment || 0,
        bookkeeping_real_adjustment: input.bookkeeping_real_adjustment || 0,
        bookkeeping_real_adjustment_reason: input.bookkeeping_real_adjustment_reason || null,
        bookkeeping_discount_percentage: input.bookkeeping_discount_percentage || 0,
        bookkeeping_final_amount: amounts.bookkeeping.final_amount,
        bookkeeping_final_amount_with_vat: amounts.bookkeeping.final_amount_with_vat,
        // Totals
        total_final_amount: amounts.total.final_amount,
        total_final_amount_with_vat: amounts.total.final_amount_with_vat,
        // Bank transfer
        bank_transfer_only: input.bank_transfer_only || false,
        bank_transfer_discount_percentage: amounts.bank_transfer?.discount_percentage || null,
        bank_transfer_amount_before_vat: amounts.bank_transfer?.amount_before_vat || null,
        bank_transfer_amount_with_vat: amounts.bank_transfer?.amount_with_vat || null,
        // Client adjustment
        client_requested_adjustment: input.client_requested_adjustment || 0,
        client_requested_adjustment_note: input.client_requested_adjustment_note || null,
        // Notes
        notes: input.notes || null,
        // Status
        status: 'draft' as GroupFeeStatus
      };

      let result;
      if (existing?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('group_fee_calculations')
          .update(calculationData)
          .eq('id', existing.id)
          .select(`
            *,
            client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
          `)
          .single();

        if (error) throw error;
        result = data;

        await this.logAction('update', existing.id, { input, amounts });
      } else {
        // Create new
        const insertData = {
          ...calculationData,
          created_by: user?.id
        };

        const { data, error } = await supabase
          .from('group_fee_calculations')
          .insert(insertData)
          .select(`
            *,
            client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
          `)
          .single();

        if (error) throw error;
        result = data;

        await this.logAction('create', result.id, { input, amounts });
      }

      return { data: result as GroupFeeCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update group calculation status
   */
  async updateStatus(calculationId: string, status: GroupFeeStatus): Promise<ServiceResponse<GroupFeeCalculation>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('group_fee_calculations')
        .update({ status })
        .eq('id', calculationId)
        .eq('tenant_id', tenantId)
        .select(`
          *,
          client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
        `)
        .single();

      if (error) throw error;

      await this.logAction('update_status', calculationId, { new_status: status });

      return { data: data as GroupFeeCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Mark group as paid (creates actual_payment and cascades to all member fee_calculations)
   */
  async markGroupAsPaid(calculationId: string, payment: GroupPaymentInput): Promise<ServiceResponse<GroupFeeCalculation>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get the group calculation first
      const { data: groupCalc, error: calcError } = await supabase
        .from('group_fee_calculations')
        .select('*, client_group:client_groups(id, group_name_hebrew)')
        .eq('id', calculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (calcError) throw calcError;
      if (!groupCalc) throw new Error('Group calculation not found');

      // Calculate VAT breakdown
      const amountBeforeVat = payment.amount_paid / (1 + VAT_RATE);
      const vatAmount = payment.amount_paid - amountBeforeVat;

      // Create actual_payment record for the group
      const { error: paymentError } = await supabase
        .from('actual_payments')
        .insert({
          tenant_id: tenantId,
          group_calculation_id: calculationId,
          client_id: null, // Group payment doesn't have single client
          fee_calculation_id: null, // Group payment doesn't have single fee_calculation
          amount_paid: payment.amount_paid,
          amount_before_vat: amountBeforeVat,
          amount_vat: vatAmount,
          amount_with_vat: payment.amount_paid,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          payment_reference: payment.payment_reference || null,
          notes: payment.notes || null,
          created_by: user?.id
        });

      if (paymentError) throw paymentError;

      // The trigger will automatically update the group status and cascade to members
      // But we'll fetch the updated record to return it

      const { data: updatedCalc, error: fetchError } = await supabase
        .from('group_fee_calculations')
        .select(`
          *,
          client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
        `)
        .eq('id', calculationId)
        .single();

      if (fetchError) throw fetchError;

      await this.logAction('mark_paid', calculationId, { payment });

      return { data: updatedCalc as GroupFeeCalculation, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create fee_calculations for all group members (links them to the group calculation)
   */
  async createMemberCalculations(groupCalculationId: string): Promise<ServiceResponse<{ created: number }>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Get the group calculation
      const { data: groupCalc, error: calcError } = await supabase
        .from('group_fee_calculations')
        .select('*')
        .eq('id', groupCalculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (calcError) throw calcError;
      if (!groupCalc) throw new Error('Group calculation not found');

      // Get all clients in this group
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupCalc.group_id);

      if (clientsError) throw clientsError;

      // Create a fee_calculation for each member (with 0 amounts - just for tracking)
      const memberCalculations = (clients || []).map(client => ({
        tenant_id: tenantId,
        client_id: client.id,
        year: groupCalc.year,
        base_amount: 0,
        vat_amount: 0,
        total_amount: 0,
        status: groupCalc.status === 'paid' ? 'paid' : 'draft',
        group_calculation_id: groupCalculationId,
        is_group_member: true,
        created_by: user?.id
      }));

      if (memberCalculations.length > 0) {
        // Use upsert to avoid duplicates
        const { error: insertError } = await supabase
          .from('fee_calculations')
          .upsert(memberCalculations, {
            onConflict: 'tenant_id,client_id,year',
            ignoreDuplicates: false
          });

        if (insertError) throw insertError;
      }

      return { data: { created: memberCalculations.length }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Check if a client is part of a group calculation for a given year
   */
  async isClientInGroupCalculation(clientId: string, year: number): Promise<ServiceResponse<{ isGroupMember: boolean; groupCalculation?: GroupFeeCalculation }>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if client has a fee_calculation linked to a group
      const { data: feeCalc, error: calcError } = await supabase
        .from('fee_calculations')
        .select('group_calculation_id')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('is_group_member', true)
        .maybeSingle();

      if (calcError) throw calcError;

      if (!feeCalc?.group_calculation_id) {
        // Also check if client's group has a calculation
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('group_id')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;

        if (client?.group_id) {
          const { data: groupCalc, error: groupError } = await supabase
            .from('group_fee_calculations')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('group_id', client.group_id)
            .eq('year', year)
            .maybeSingle();

          if (groupError) throw groupError;

          if (groupCalc) {
            return {
              data: {
                isGroupMember: true,
                groupCalculation: groupCalc as GroupFeeCalculation
              },
              error: null
            };
          }
        }

        return { data: { isGroupMember: false }, error: null };
      }

      // Get the group calculation details
      const { data: groupCalc, error: groupError } = await supabase
        .from('group_fee_calculations')
        .select(`
          *,
          client_group:client_groups(id, group_name_hebrew, primary_owner, combined_billing, combined_letters)
        `)
        .eq('id', feeCalc.group_calculation_id)
        .single();

      if (groupError) throw groupError;

      return {
        data: {
          isGroupMember: true,
          groupCalculation: groupCalc as GroupFeeCalculation
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete group calculation (only if status is draft)
   */
  async deleteGroupCalculation(calculationId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Check status first
      const { data: calc, error: checkError } = await supabase
        .from('group_fee_calculations')
        .select('status')
        .eq('id', calculationId)
        .eq('tenant_id', tenantId)
        .single();

      if (checkError) throw checkError;
      if (!calc) throw new Error('Calculation not found');
      if (calc.status !== 'draft') {
        throw new Error('Cannot delete calculation that is not in draft status');
      }

      // Remove member fee_calculations links first
      const { error: unlinkError } = await supabase
        .from('fee_calculations')
        .update({ group_calculation_id: null, is_group_member: false })
        .eq('group_calculation_id', calculationId);

      if (unlinkError) throw unlinkError;

      // Delete the group calculation
      const { error: deleteError } = await supabase
        .from('group_fee_calculations')
        .delete()
        .eq('id', calculationId)
        .eq('tenant_id', tenantId);

      if (deleteError) throw deleteError;

      await this.logAction('delete', calculationId, {});

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

// Export singleton instance
export const groupFeeService = new GroupFeeService();
