import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams, FilterParams } from './base.service';
import { supabase } from '@/lib/supabase';

export type FeeStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type FeeFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';

// FeeType interface will be added when fee_types table is implemented
// export interface FeeType {
//   id: string;
//   tenant_id: string;
//   name: string;
//   description?: string;
//   base_amount: number;
//   frequency: FeeFrequency;
//   is_active: boolean;
//   created_at: string;
//   updated_at: string;
// }

// JSONB field types (replacing 'any')
export interface PreviousYearData {
  base_amount?: number;
  discount?: number;
  amount_before_discount?: number;
  amount_after_discount?: number;
  amount_with_vat?: number;
  notes?: string;
  [key: string]: unknown;
}

export interface RealAdjustment {
  amount: number;
  reason: string;
  applied_date?: string;
  approved_by?: string;
  [key: string]: unknown;
}

export interface CalculationMetadata {
  calculation_method?: string;
  formula_version?: string;
  system_notes?: string;
  user_notes?: string;
  [key: string]: unknown;
}

export interface FeeCalculation {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_type_id?: string;
  year: number;
  month?: number;
  // Period dates
  period_start?: string;
  period_end?: string;
  // Previous year data - Enhanced fields
  previous_year_amount?: number;
  previous_year_discount?: number;
  previous_year_base?: number;
  previous_year_amount_before_discount?: number; // New: Amount before any discounts
  previous_year_amount_after_discount?: number; // New: After discount, before VAT
  previous_year_amount_with_vat?: number; // New: Total with VAT
  previous_year_data?: PreviousYearData; // JSONB field with structured data
  // Current year calculations
  base_amount: number;
  apply_inflation_index?: boolean; // New: Control whether to apply inflation
  inflation_adjustment?: number;
  inflation_rate: number; // Default 3.0%
  calculated_inflation_amount?: number; // New: Calculated inflation amount
  real_adjustment?: number;
  real_adjustments?: RealAdjustment[]; // JSONB field: array of adjustment records
  real_adjustment_reason?: string;
  discount_percentage?: number;
  discount_amount?: number;
  final_amount?: number;
  calculated_before_vat?: number; // New: Current year before VAT
  calculated_with_vat?: number; // New: Current year with VAT
  vat_amount: number;
  total_amount: number; // This is total_with_vat
  // Comparison fields
  year_over_year_change_percent?: number; // New: YoY change %
  year_over_year_change_amount?: number; // New: YoY change amount
  // Status tracking
  status: FeeStatus;
  due_date?: string;
  payment_date?: string;
  payment_reference?: string;
  payment_terms?: string;
  // Approval
  approved_by?: string;
  approved_at?: string;
  // Metadata
  notes?: string;
  calculation_metadata?: CalculationMetadata; // JSONB field with calculation context
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  client?: {
    id: string;
    company_name: string;
    company_name_hebrew?: string;
    tax_id: string;
    contact_name?: string;
    contact_email?: string;
    email?: string;
  };
}

export interface CreateFeeCalculationDto {
  client_id: string;
  year: number;
  month?: number;
  // Previous year data (optional for initial entry)
  previous_year_amount?: number;
  previous_year_discount?: number;
  previous_year_base?: number;
  previous_year_amount_before_discount?: number;
  previous_year_amount_after_discount?: number;
  previous_year_amount_with_vat?: number;
  // Current year calculations
  base_amount: number;
  apply_inflation_index?: boolean; // Default true
  inflation_rate?: number; // Default 3.0%
  real_adjustment?: number; // Default 0
  real_adjustment_reason?: string;
  discount_percentage?: number; // Default 0
  due_date?: string;
  notes?: string;
}

export interface UpdateFeeCalculationDto extends Partial<CreateFeeCalculationDto> {
  status?: FeeStatus;
  paid_date?: string;
  payment_reference?: string;
}

export interface FeeSummary {
  total_pending: number;
  total_paid: number;
  total_overdue: number;
  count_pending: number;
  count_paid: number;
  count_overdue: number;
}

class FeeService extends BaseService {
  constructor() {
    super('fee_calculations');
  }

  /**
   * Calculate fee with Israeli accounting standards:
   * 1. Apply inflation adjustment (default 3% if enabled)
   * 2. Apply real adjustments 
   * 3. Apply discount percentage
   * 4. Calculate VAT (18%)
   * 5. Calculate year-over-year changes
   */
  calculateFeeAmounts(data: CreateFeeCalculationDto): {
    inflation_adjustment: number;
    real_adjustment: number;
    discount_amount: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
    year_over_year_change_percent: number;
    year_over_year_change_amount: number;
  } {
    const inflationRate = data.inflation_rate || 3.0; // Default 3%
    const applyInflation = data.apply_inflation_index !== false; // Default true
    const realAdjustment = data.real_adjustment || 0;
    const discountPercentage = data.discount_percentage || 0;

    // Step 1: Apply inflation adjustment (only if enabled)
    const inflationAdjustment = applyInflation 
      ? data.base_amount * (inflationRate / 100)
      : 0;
    
    // Step 2: Add real adjustment
    const adjustedAmount = data.base_amount + inflationAdjustment + realAdjustment;
    
    // Step 3: Apply discount
    const discountAmount = adjustedAmount * (discountPercentage / 100);
    const finalAmount = adjustedAmount - discountAmount;
    
    // Step 4: Calculate VAT (18% in Israel - Updated December 2024)
    const vatAmount = finalAmount * 0.18;
    const totalWithVat = finalAmount + vatAmount;

    // Step 5: Calculate year-over-year changes (if previous year data exists)
    let yearOverYearChangePercent = 0;
    let yearOverYearChangeAmount = 0;
    
    if (data.previous_year_amount_with_vat) {
      yearOverYearChangeAmount = totalWithVat - data.previous_year_amount_with_vat;
      yearOverYearChangePercent = (yearOverYearChangeAmount / data.previous_year_amount_with_vat) * 100;
    }

    return {
      inflation_adjustment: inflationAdjustment,
      real_adjustment: realAdjustment,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      year_over_year_change_percent: yearOverYearChangePercent,
      year_over_year_change_amount: yearOverYearChangeAmount
    };
  }

  async createFeeCalculation(data: CreateFeeCalculationDto): Promise<ServiceResponse<FeeCalculation>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;

      // Calculate all fee amounts
      const calculations = this.calculateFeeAmounts(data);

      const feeData = {
        tenant_id: tenantId,
        client_id: data.client_id,
        year: data.year,
        month: data.month,
        // Store previous year data - enhanced fields
        previous_year_data: {
          amount: data.previous_year_amount,
          discount: data.previous_year_discount,
          base: data.previous_year_base,
          amount_before_discount: data.previous_year_amount_before_discount,
          amount_after_discount: data.previous_year_amount_after_discount,
          amount_with_vat: data.previous_year_amount_with_vat
        },
        previous_year_amount: data.previous_year_amount,
        previous_year_discount: data.previous_year_discount,
        previous_year_base: data.previous_year_base,
        previous_year_amount_before_discount: data.previous_year_amount_before_discount,
        previous_year_amount_after_discount: data.previous_year_amount_after_discount,
        previous_year_amount_with_vat: data.previous_year_amount_with_vat,
        // Current year calculations
        base_amount: data.base_amount,
        calculated_base_amount: data.base_amount, // NOT NULL field - same as base_amount
        apply_inflation_index: data.apply_inflation_index !== false, // Default true
        inflation_adjustment: calculations.inflation_adjustment,
        inflation_rate: data.inflation_rate || 3.0,
        calculated_inflation_amount: calculations.inflation_adjustment,
        // Store real adjustments as JSONB
        real_adjustments: {
          amount: calculations.real_adjustment,
          reason: data.real_adjustment_reason
        },
        real_adjustment_reason: data.real_adjustment_reason,
        discount_percentage: data.discount_percentage || 0,
        discount_amount: calculations.discount_amount,
        final_amount: calculations.final_amount,
        calculated_before_vat: calculations.final_amount,
        calculated_with_vat: calculations.total_with_vat,
        vat_amount: calculations.vat_amount,
        total_amount: calculations.total_with_vat, // Match DB column name
        // Year-over-year changes
        year_over_year_change_percent: calculations.year_over_year_change_percent,
        year_over_year_change_amount: calculations.year_over_year_change_amount,
        // Status and metadata
        status: 'draft' as FeeStatus,
        due_date: data.due_date,
        payment_terms: '30 days', // Default payment terms
        notes: data.notes,
        calculation_metadata: {
          calculated_at: new Date().toISOString(),
          calculation_method: 'standard',
          inflation_applied: data.apply_inflation_index !== false
        },
        created_by: currentUserId
      };

      const { data: fee, error } = await supabase
        .from('fee_calculations')
        .insert(feeData)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('create_fee_calculation', fee.id, { 
        client_id: data.client_id,
        final_amount: calculations.final_amount,
        year: data.year
      });

      return { data: fee, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateFeeCalculation(
    id: string,
    data: UpdateFeeCalculationDto
  ): Promise<ServiceResponse<FeeCalculation>> {
    try {
      const tenantId = await this.getTenantId();

      // Recalculate total if amounts changed
      // Type: Partial includes all calculation fields that might be added during recalculation
      let updateData: Partial<FeeCalculation> = { ...data };
      if (data.base_amount !== undefined || data.inflation_rate !== undefined || 
          data.real_adjustment !== undefined || data.discount_percentage !== undefined) {
        const { data: existing } = await this.getById(id);
        if (existing) {
          // Recalculate all amounts
          const recalcData: CreateFeeCalculationDto = {
            client_id: existing.client_id,
            year: existing.year,
            base_amount: data.base_amount ?? existing.base_amount,
            inflation_rate: data.inflation_rate ?? existing.inflation_rate,
            real_adjustment: data.real_adjustment ?? existing.real_adjustment,
            discount_percentage: data.discount_percentage ?? existing.discount_percentage
          };
          const calculations = this.calculateFeeAmounts(recalcData);
          
          updateData = {
            ...updateData,
            inflation_adjustment: calculations.inflation_adjustment,
            discount_amount: calculations.discount_amount,
            final_amount: calculations.final_amount,
            vat_amount: calculations.vat_amount,
            total_amount: calculations.total_with_vat
          };
        }
      }

      // Update the fee calculation
      const { data: fee, error } = await supabase
        .from('fee_calculations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('*')
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Fetch client data separately if client_id exists
      if (fee?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', fee.client_id)
          .single();

        // Attach client to fee object
        if (client) {
          (fee as any).client = client;
        }
      }

      await this.logAction('update_fee_calculation', id, { changes: data });

      return { data: fee, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateStatus(
    id: string,
    status: FeeStatus,
    paymentDetails?: { paid_date?: string; payment_reference?: string }
  ): Promise<ServiceResponse<FeeCalculation>> {
    const updateData: UpdateFeeCalculationDto = { status };
    
    if (status === 'paid' && paymentDetails) {
      updateData.paid_date = paymentDetails.paid_date || new Date().toISOString();
      updateData.payment_reference = paymentDetails.payment_reference;
    }

    return this.updateFeeCalculation(id, updateData);
  }

  async getById(id: string): Promise<ServiceResponse<FeeCalculation>> {
    try {
      const tenantId = await this.getTenantId();

      // First query: Get the fee calculation
      const { data: fee, error } = await supabase
        .from('fee_calculations')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Second query: Get client data if client_id exists
      if (fee?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', fee.client_id)
          .single();

        // Attach client to fee object
        if (client) {
          (fee as any).client = client;
        }
      }

      return { data: fee, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async list(
    pagination?: PaginationParams,
    filters?: FilterParams
  ): Promise<ServiceResponse<{
    fees: FeeCalculation[];
    total: number;
    page: number;
    pageSize: number;
  }>> {
    try {
      const tenantId = await this.getTenantId();
      const { page = 1, pageSize = 20 } = pagination || {};

      let query = supabase
        .from('fee_calculations')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew, tax_id, contact_name, contact_email)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      if (filters) {
        query = this.buildFilterQuery(query, filters);
      }

      if (pagination) {
        query = this.buildPaginationQuery(query, pagination);
      }

      const { data: fees, error, count } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return {
        data: {
          fees: fees || [],
          total: count || 0,
          page,
          pageSize,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getByClient(
    clientId: string,
    status?: FeeStatus
  ): Promise<ServiceResponse<FeeCalculation[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('fee_calculations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('due_date', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: fees, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: fees || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getLatestFeeByClient(
    clientId: string,
    year?: number
  ): Promise<ServiceResponse<FeeCalculation | null>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('fee_calculations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId);

      // If year is specified, get the calculation for previous year
      if (year) {
        query = query.eq('year', year - 1);
      }

      // Order by year descending to get the most recent
      query = query.order('year', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      const { data: fees, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // If no data found, return null
      if (!fees || fees.length === 0) {
        return { data: null, error: null };
      }

      // Return the first (and only) record
      return { data: fees[0], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get most recent draft calculation for client and year
   * Used to load draft when returning to client
   */
  async getDraftCalculation(
    clientId: string,
    year: number
  ): Promise<ServiceResponse<FeeCalculation | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('fee_calculations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data?.[0] || null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getOverdueFees(): Promise<ServiceResponse<FeeCalculation[]>> {
    try {
      const tenantId = await this.getTenantId();
      const today = new Date().toISOString().split('T')[0];

      const { data: fees, error } = await supabase
        .from('fee_calculations')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew, contact_name, contact_email, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Update status to overdue
      const overdueIds = fees?.map(f => f.id) || [];
      if (overdueIds.length > 0) {
        await supabase
          .from('fee_calculations')
          .update({ status: 'overdue' })
          .in('id', overdueIds)
          .eq('tenant_id', tenantId);
      }

      return { data: fees || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getSummary(period?: { start: string; end: string }): Promise<ServiceResponse<FeeSummary>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('fee_calculations')
        .select('status, total_amount, final_amount, vat_amount')
        .eq('tenant_id', tenantId);

      if (period) {
        query = query
          .gte('period_start', period.start)
          .lte('period_end', period.end);
      }

      const { data: fees, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      const summary: FeeSummary = {
        total_pending: 0,
        total_paid: 0,
        total_overdue: 0,
        count_pending: 0,
        count_paid: 0,
        count_overdue: 0,
      };

      fees?.forEach(fee => {
        // Use total_amount if available, otherwise use final_amount + vat_amount
        const amount = fee.total_amount || (fee.final_amount + fee.vat_amount) || 0;
        
        switch (fee.status) {
          case 'draft':
          case 'sent':
            summary.total_pending += amount;
            summary.count_pending++;
            break;
          case 'paid':
            summary.total_paid += amount;
            summary.count_paid++;
            break;
          case 'overdue':
            summary.total_overdue += amount;
            summary.count_overdue++;
            break;
        }
      });

      return { data: summary, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // Bulk create method removed - fee_types table not yet implemented
  // This will be added back when fee_types table is created in Phase 2

  async markAsOverdue(): Promise<ServiceResponse<number>> {
    try {
      const tenantId = await this.getTenantId();
      const today = new Date().toISOString().split('T')[0];

      const { data: updated, error } = await supabase
        .from('fee_calculations')
        .update({ status: 'overdue' })
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .lt('due_date', today)
        .select();

      if (error) {
        return { data: 0, error: this.handleError(error) };
      }

      const count = updated?.length || 0;
      if (count > 0) {
        await this.logAction('mark_fees_overdue', undefined, { count });
      }

      return { data: count, error: null };
    } catch (error) {
      return { data: 0, error: this.handleError(error as Error) };
    }
  }
}

export const feeService = new FeeService();