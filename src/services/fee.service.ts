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

export interface BookkeepingCalculation {
  base_amount: number;
  apply_inflation_index: boolean;
  inflation_rate: number;
  inflation_adjustment: number;
  real_adjustment: number;
  real_adjustment_reason?: string;
  discount_percentage: number;
  discount_amount: number;
  final_amount: number;
  vat_amount: number;
  total_with_vat: number;
  [key: string]: unknown;
}

export interface RetainerCalculation {
  monthly_amount: number; // Monthly base amount (will be multiplied by 12 for annual)
  apply_inflation_index: boolean;
  inflation_rate: number;
  inflation_adjustment: number;
  real_adjustment: number;
  real_adjustment_reason?: string;
  discount_percentage: number; // Deprecated - always 0
  discount_amount: number; // Deprecated - always 0
  final_amount: number; // Annual total before VAT
  vat_amount: number;
  total_with_vat: number; // Annual total with VAT
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
  client_requested_adjustment?: number; // NEW: Client requested adjustment (negative values only)
  client_requested_adjustment_note?: string; // NEW: Optional note for adjustment (max 50 chars)
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
  // Bank Transfer Only Option
  bank_transfer_only?: boolean;
  bank_transfer_discount_percentage?: number;
  bank_transfer_amount_before_vat?: number;
  bank_transfer_amount_with_vat?: number;
  // Custom payment text (HTML) - appears above payment section in letter
  custom_payment_text?: string;
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
  bookkeeping_calculation?: BookkeepingCalculation; // JSONB field: separate calculation for internal bookkeeping (letter F)
  retainer_calculation?: RetainerCalculation; // JSONB field: dedicated calculation for retainer clients (letter E)
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
  previous_year_amount_with_vat_before_discount?: number; // NEW: Base with VAT before discount
  // Current year calculations
  base_amount: number;
  apply_inflation_index?: boolean; // Default true
  inflation_rate?: number; // Default 3.0%
  index_manual_adjustment?: number; // Default 0 - Manual inflation adjustment in ILS (can be negative)
  real_adjustment?: number; // Default 0
  real_adjustment_reason?: string;
  client_requested_adjustment?: number; // NEW: Client requested adjustment (negative values only)
  client_requested_adjustment_note?: string; // NEW: Optional note (max 50 chars)
  discount_percentage?: number; // Default 0 - DEPRECATED: Kept for backwards compatibility
  due_date?: string;
  notes?: string;
  // Bookkeeping calculation (for internal clients only)
  bookkeeping_base_amount?: number;
  bookkeeping_inflation_rate?: number;
  bookkeeping_real_adjustment?: number;
  bookkeeping_real_adjustment_reason?: string;
  bookkeeping_discount_percentage?: number; // DEPRECATED: Kept for backwards compatibility
  bookkeeping_apply_inflation_index?: boolean;
  // Retainer calculation (for retainer clients - both internal and external)
  retainer_monthly_amount?: number;
  retainer_inflation_rate?: number;
  retainer_index_manual_adjustment?: number;
  retainer_index_manual_is_negative?: boolean;
  retainer_real_adjustment?: number;
  retainer_real_adjustment_reason?: string;
  retainer_apply_inflation_index?: boolean;
  // Bank Transfer Only Option
  bank_transfer_only?: boolean;
  bank_transfer_discount_percentage?: number;
  bank_transfer_amount_before_vat?: number;
  bank_transfer_amount_with_vat?: number;
  // Custom payment text (HTML) - appears above payment section in letter
  custom_payment_text?: string;
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

/**
 * Fee Service
 * Manages fee calculations with inflation adjustments and real changes
 *
 * IMPORTANT: The 'year' field in fee_calculations represents TAX YEAR (שנת מס)
 * - This is the fiscal year FOR WHICH the fee is calculated
 * - Example: Calculating in 2025 FOR tax year 2026 → year = 2026
 * - NOT the year when the calculation was performed
 */
class FeeService extends BaseService {
  constructor() {
    super('fee_calculations');
  }

  /**
   * Calculate fee with Israeli accounting standards:
   * 1. Apply inflation adjustment (default 3% if enabled)
   * 2. Apply real adjustments
   * 3. Apply client requested adjustment (negative values only)
   * 4. Calculate VAT (18%)
   * 5. Calculate year-over-year changes
   *
   * Note: Discounts are no longer applied in fee calculations
   */
  calculateFeeAmounts(data: CreateFeeCalculationDto): {
    inflation_adjustment: number;
    inflation_adjustment_auto: number;
    index_manual_adjustment: number;
    real_adjustment: number;
    client_requested_adjustment: number;
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
    const indexManualAdjustment = data.index_manual_adjustment || 0;
    const clientAdjustment = data.client_requested_adjustment || 0;

    // Validate client adjustment (must be negative or 0)
    if (clientAdjustment > 0) {
      throw new Error('תיקון לבקשת לקוח חייב להיות שלילי או 0');
    }

    // Discounts are no longer applied - always 0
    const discountPercentage = 0;

    // Step 1a: Apply automatic inflation adjustment (only if enabled) - ROUND UP
    const inflationAdjustmentAuto = applyInflation
      ? Math.ceil(data.base_amount * (inflationRate / 100))
      : 0;

    // Step 1b: Add manual index adjustment (only if inflation is enabled)
    const indexManualAdj = applyInflation ? indexManualAdjustment : 0;

    // Step 1c: Total inflation adjustment (auto + manual)
    const inflationAdjustment = inflationAdjustmentAuto + indexManualAdj;

    // Step 2: Add real adjustment + client requested adjustment - ROUND UP
    const adjustedAmount = Math.ceil(
      data.base_amount + inflationAdjustment + realAdjustment + clientAdjustment
    );

    // Step 3: No discount applied
    const discountAmount = 0;
    const finalAmount = adjustedAmount;

    // Step 4: Calculate VAT (18% in Israel - Updated December 2024) - ROUND UP
    const vatAmount = Math.ceil(finalAmount * 0.18);
    const totalWithVat = Math.ceil(finalAmount + vatAmount);

    // Step 5: Calculate year-over-year changes (if previous year data exists)
    let yearOverYearChangePercent = 0;
    let yearOverYearChangeAmount = 0;

    if (data.previous_year_amount_with_vat) {
      yearOverYearChangeAmount = totalWithVat - data.previous_year_amount_with_vat;
      yearOverYearChangePercent = (yearOverYearChangeAmount / data.previous_year_amount_with_vat) * 100;
    }

    return {
      inflation_adjustment: inflationAdjustment,
      inflation_adjustment_auto: inflationAdjustmentAuto,
      index_manual_adjustment: indexManualAdj,
      real_adjustment: realAdjustment,
      client_requested_adjustment: clientAdjustment,
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

      // Calculate bookkeeping amounts (for internal clients only)
      let bookkeepingCalc: BookkeepingCalculation | null = null;
      if (data.bookkeeping_base_amount && data.bookkeeping_base_amount > 0) {
        // Bookkeeping is entered as MONTHLY amount, multiply by 12 for annual calculation
        const annualBookkeepingAmount = data.bookkeeping_base_amount * 12;

        const bookkeepingCalculations = this.calculateFeeAmounts({
          base_amount: annualBookkeepingAmount,
          inflation_rate: data.bookkeeping_inflation_rate || 0,
          real_adjustment: data.bookkeeping_real_adjustment || 0,
          discount_percentage: data.bookkeeping_discount_percentage || 0,
          apply_inflation_index: data.bookkeeping_apply_inflation_index ?? false,
        });

        bookkeepingCalc = {
          base_amount: data.bookkeeping_base_amount, // Store MONTHLY amount (user input)
          apply_inflation_index: data.bookkeeping_apply_inflation_index ?? false,
          inflation_rate: data.bookkeeping_inflation_rate || 0,
          inflation_adjustment: bookkeepingCalculations.inflation_adjustment,
          real_adjustment: data.bookkeeping_real_adjustment || 0,
          real_adjustment_reason: data.bookkeeping_real_adjustment_reason,
          discount_percentage: data.bookkeeping_discount_percentage || 0,
          discount_amount: bookkeepingCalculations.discount_amount,
          final_amount: bookkeepingCalculations.final_amount, // Calculated from annual amount
          vat_amount: bookkeepingCalculations.vat_amount,
          total_with_vat: bookkeepingCalculations.total_with_vat,
        };
      }

      // Calculate retainer amounts (for retainer clients - both internal and external)
      let retainerCalc: RetainerCalculation | null = null;
      if (data.retainer_monthly_amount && data.retainer_monthly_amount > 0) {
        // Retainer is entered as MONTHLY amount, multiply by 12 for annual calculation
        const annualRetainerAmount = data.retainer_monthly_amount * 12;

        // Calculate manual index adjustment (with negative support)
        const manualAdjustment = data.retainer_index_manual_is_negative
          ? -(data.retainer_index_manual_adjustment || 0)
          : (data.retainer_index_manual_adjustment || 0);

        const retainerCalculations = this.calculateFeeAmounts({
          base_amount: annualRetainerAmount,
          inflation_rate: data.retainer_inflation_rate || 3.0,
          index_manual_adjustment: manualAdjustment,
          real_adjustment: data.retainer_real_adjustment || 0,
          apply_inflation_index: data.retainer_apply_inflation_index ?? true,
        });

        retainerCalc = {
          monthly_amount: data.retainer_monthly_amount, // Store MONTHLY amount (user input)
          apply_inflation_index: data.retainer_apply_inflation_index ?? true,
          inflation_rate: data.retainer_inflation_rate || 3.0,
          inflation_adjustment: retainerCalculations.inflation_adjustment,
          real_adjustment: data.retainer_real_adjustment || 0,
          real_adjustment_reason: data.retainer_real_adjustment_reason,
          discount_percentage: 0, // Discounts no longer applied
          discount_amount: 0, // Discounts no longer applied
          final_amount: retainerCalculations.final_amount, // Calculated from annual amount (monthly × 12)
          vat_amount: retainerCalculations.vat_amount,
          total_with_vat: retainerCalculations.total_with_vat,
        };
      }

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
        index_manual_adjustment: data.index_manual_adjustment || 0,
        calculated_inflation_amount: calculations.inflation_adjustment,
        // Store real adjustments as JSONB
        real_adjustments: {
          amount: calculations.real_adjustment,
          reason: data.real_adjustment_reason
        },
        real_adjustment_reason: data.real_adjustment_reason,
        // Client requested adjustment (negative values only)
        client_requested_adjustment: data.client_requested_adjustment || 0,
        client_requested_adjustment_note: data.client_requested_adjustment_note,
        discount_percentage: 0, // Discounts no longer applied
        discount_amount: 0, // Discounts no longer applied
        final_amount: calculations.final_amount,
        calculated_before_vat: calculations.final_amount,
        calculated_with_vat: calculations.total_with_vat,
        vat_amount: calculations.vat_amount,
        total_amount: calculations.total_with_vat, // Match DB column name
        // Year-over-year changes
        year_over_year_change_percent: calculations.year_over_year_change_percent,
        year_over_year_change_amount: calculations.year_over_year_change_amount,
        // Bank Transfer Only Option
        bank_transfer_only: data.bank_transfer_only,
        bank_transfer_discount_percentage: data.bank_transfer_discount_percentage,
        bank_transfer_amount_before_vat: data.bank_transfer_amount_before_vat,
        bank_transfer_amount_with_vat: data.bank_transfer_amount_with_vat,
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
        bookkeeping_calculation: bookkeepingCalc,
        retainer_calculation: retainerCalc,
        created_by: currentUserId,
        // Custom payment text (HTML) - appears above payment section in letter
        custom_payment_text: data.custom_payment_text || null
      };

      // Use upsert to update existing fee_calculation if one exists for this client+year
      // The unique constraint (tenant_id, client_id, year) ensures only one per client per year
      const { data: fee, error } = await supabase
        .from('fee_calculations')
        .upsert(feeData, {
          onConflict: 'tenant_id,client_id,year',
          ignoreDuplicates: false // Update existing record
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Check if this was an update or insert by looking at created_at vs updated_at
      const isUpdate = fee.created_at !== fee.updated_at;

      await this.logAction(isUpdate ? 'update_fee_calculation' : 'create_fee_calculation', fee.id, {
        client_id: data.client_id,
        final_amount: calculations.final_amount,
        year: data.year,
        was_upsert: isUpdate
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

      // Save bookkeeping fields BEFORE destructuring (we need them later for bookkeeping_calculation)
      const bookkeepingFields = {
        bookkeeping_base_amount: data.bookkeeping_base_amount,
        bookkeeping_inflation_rate: data.bookkeeping_inflation_rate,
        bookkeeping_real_adjustment: data.bookkeeping_real_adjustment,
        bookkeeping_real_adjustment_reason: data.bookkeeping_real_adjustment_reason,
        bookkeeping_discount_percentage: data.bookkeeping_discount_percentage,
        bookkeeping_apply_inflation_index: data.bookkeeping_apply_inflation_index,
      };

      // Save retainer fields BEFORE destructuring (we need them later for retainer_calculation)
      const retainerFields = {
        retainer_monthly_amount: data.retainer_monthly_amount,
        retainer_inflation_rate: data.retainer_inflation_rate,
        retainer_index_manual_adjustment: data.retainer_index_manual_adjustment,
        retainer_index_manual_is_negative: data.retainer_index_manual_is_negative,
        retainer_real_adjustment: data.retainer_real_adjustment,
        retainer_real_adjustment_reason: data.retainer_real_adjustment_reason,
        retainer_apply_inflation_index: data.retainer_apply_inflation_index,
      };

      // Remove bookkeeping_* and retainer_* fields - they don't exist as columns (only in JSONB)
      const {
        bookkeeping_base_amount,
        bookkeeping_inflation_rate,
        bookkeeping_real_adjustment,
        bookkeeping_real_adjustment_reason,
        bookkeeping_discount_percentage,
        bookkeeping_apply_inflation_index,
        retainer_monthly_amount,
        retainer_inflation_rate,
        retainer_index_manual_adjustment,
        retainer_index_manual_is_negative,
        retainer_real_adjustment,
        retainer_real_adjustment_reason,
        retainer_apply_inflation_index,
        ...cleanData
      } = data;

      // Recalculate total if amounts changed
      // Type: Partial includes all calculation fields that might be added during recalculation
      let updateData: Partial<FeeCalculation> = cleanData;
      if (data.base_amount !== undefined || data.inflation_rate !== undefined ||
          data.index_manual_adjustment !== undefined || data.real_adjustment !== undefined ||
          data.apply_inflation_index !== undefined || data.client_requested_adjustment !== undefined) {
        const { data: existing } = await this.getById(id);
        if (existing) {
          // Recalculate all amounts
          const recalcData: CreateFeeCalculationDto = {
            client_id: existing.client_id,
            year: existing.year,
            base_amount: data.base_amount ?? existing.base_amount,
            inflation_rate: data.inflation_rate ?? existing.inflation_rate,
            index_manual_adjustment: data.index_manual_adjustment ?? (existing as any).index_manual_adjustment ?? 0,
            real_adjustment: data.real_adjustment ?? existing.real_adjustment,
            client_requested_adjustment: data.client_requested_adjustment ?? existing.client_requested_adjustment,
            apply_inflation_index: data.apply_inflation_index ?? existing.apply_inflation_index
          };
          const calculations = this.calculateFeeAmounts(recalcData);

          updateData = {
            ...updateData,
            inflation_adjustment: calculations.inflation_adjustment,
            discount_amount: 0, // Discounts no longer applied
            discount_percentage: 0, // Discounts no longer applied
            final_amount: calculations.final_amount,
            vat_amount: calculations.vat_amount,
            total_amount: calculations.total_with_vat
          };
        }
      }

      // Calculate bookkeeping if bookkeeping fields changed (for internal clients)
      // Use bookkeepingFields (saved before destructuring) instead of data
      if (bookkeepingFields.bookkeeping_base_amount !== undefined ||
          bookkeepingFields.bookkeeping_inflation_rate !== undefined ||
          bookkeepingFields.bookkeeping_real_adjustment !== undefined ||
          bookkeepingFields.bookkeeping_apply_inflation_index !== undefined) {

        const { data: existing } = await this.getById(id);
        if (existing && bookkeepingFields.bookkeeping_base_amount && bookkeepingFields.bookkeeping_base_amount > 0) {
          // Bookkeeping is entered as MONTHLY amount, multiply by 12 for annual calculation
          const annualBookkeepingAmount = bookkeepingFields.bookkeeping_base_amount * 12;

          const bookkeepingCalc = this.calculateFeeAmounts({
            base_amount: annualBookkeepingAmount,
            inflation_rate: bookkeepingFields.bookkeeping_inflation_rate ?? existing.bookkeeping_calculation?.inflation_rate ?? 0,
            real_adjustment: bookkeepingFields.bookkeeping_real_adjustment ?? existing.bookkeeping_calculation?.real_adjustment ?? 0,
            apply_inflation_index: bookkeepingFields.bookkeeping_apply_inflation_index ?? existing.bookkeeping_calculation?.apply_inflation_index ?? false,
          });

          updateData.bookkeeping_calculation = {
            base_amount: bookkeepingFields.bookkeeping_base_amount, // Store MONTHLY amount (user input)
            apply_inflation_index: bookkeepingFields.bookkeeping_apply_inflation_index ?? existing.bookkeeping_calculation?.apply_inflation_index ?? false,
            inflation_rate: bookkeepingFields.bookkeeping_inflation_rate ?? existing.bookkeeping_calculation?.inflation_rate ?? 0,
            inflation_adjustment: bookkeepingCalc.inflation_adjustment,
            real_adjustment: bookkeepingFields.bookkeeping_real_adjustment ?? existing.bookkeeping_calculation?.real_adjustment ?? 0,
            real_adjustment_reason: bookkeepingFields.bookkeeping_real_adjustment_reason ?? existing.bookkeeping_calculation?.real_adjustment_reason,
            discount_percentage: 0, // Discounts no longer applied
            discount_amount: 0, // Discounts no longer applied
            final_amount: bookkeepingCalc.final_amount, // Calculated from annual amount (monthly × 12)
            vat_amount: bookkeepingCalc.vat_amount,
            total_with_vat: bookkeepingCalc.total_with_vat,
          };
        }
      }

      // Calculate retainer if retainer fields changed (for retainer clients)
      // Use retainerFields (saved before destructuring) instead of data
      if (retainerFields.retainer_monthly_amount !== undefined ||
          retainerFields.retainer_inflation_rate !== undefined ||
          retainerFields.retainer_index_manual_adjustment !== undefined ||
          retainerFields.retainer_index_manual_is_negative !== undefined ||
          retainerFields.retainer_real_adjustment !== undefined ||
          retainerFields.retainer_apply_inflation_index !== undefined) {

        const { data: existing } = await this.getById(id);
        if (existing && retainerFields.retainer_monthly_amount && retainerFields.retainer_monthly_amount > 0) {
          // Retainer is entered as MONTHLY amount, multiply by 12 for annual calculation
          const annualRetainerAmount = retainerFields.retainer_monthly_amount * 12;

          // Calculate manual index adjustment (with negative support)
          const manualAdjustment = (retainerFields.retainer_index_manual_is_negative ?? false)
            ? -(retainerFields.retainer_index_manual_adjustment ?? 0)
            : (retainerFields.retainer_index_manual_adjustment ?? 0);

          const retainerCalc = this.calculateFeeAmounts({
            base_amount: annualRetainerAmount,
            inflation_rate: retainerFields.retainer_inflation_rate ?? existing.retainer_calculation?.inflation_rate ?? 3.0,
            index_manual_adjustment: manualAdjustment,
            real_adjustment: retainerFields.retainer_real_adjustment ?? existing.retainer_calculation?.real_adjustment ?? 0,
            apply_inflation_index: retainerFields.retainer_apply_inflation_index ?? existing.retainer_calculation?.apply_inflation_index ?? true,
          });

          updateData.retainer_calculation = {
            monthly_amount: retainerFields.retainer_monthly_amount, // Store MONTHLY amount (user input)
            apply_inflation_index: retainerFields.retainer_apply_inflation_index ?? existing.retainer_calculation?.apply_inflation_index ?? true,
            inflation_rate: retainerFields.retainer_inflation_rate ?? existing.retainer_calculation?.inflation_rate ?? 3.0,
            inflation_adjustment: retainerCalc.inflation_adjustment,
            real_adjustment: retainerFields.retainer_real_adjustment ?? existing.retainer_calculation?.real_adjustment ?? 0,
            real_adjustment_reason: retainerFields.retainer_real_adjustment_reason ?? existing.retainer_calculation?.real_adjustment_reason,
            discount_percentage: 0, // Discounts no longer applied
            discount_amount: 0, // Discounts no longer applied
            final_amount: retainerCalc.final_amount, // Calculated from annual amount (monthly × 12)
            vat_amount: retainerCalc.vat_amount,
            total_with_vat: retainerCalc.total_with_vat,
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

  /**
   * Update fee calculation status
   *
   * UPDATED 2025-12-21: For 'paid' status, now uses ActualPaymentService
   * to ensure proper payment tracking with VAT breakdown and deviation calculation.
   */
  async updateStatus(
    id: string,
    status: FeeStatus,
    paymentDetails?: { paid_date?: string; payment_reference?: string; payment_method?: string }
  ): Promise<ServiceResponse<FeeCalculation>> {
    // For 'paid' status, use ActualPaymentService to ensure proper tracking
    if (status === 'paid') {
      console.warn('[fee.service] updateStatus called with status=paid. Using ActualPaymentService for proper tracking.');

      try {
        const tenantId = await this.getTenantId();

        // Get fee calculation details
        const { data: feeCalc, error: feeCalcError } = await supabase
          .from('fee_calculations')
          .select('client_id, total_amount, amount_after_selected_discount')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (feeCalcError) {
          return { data: null, error: this.handleError(feeCalcError) };
        }

        // Use ActualPaymentService
        const { actualPaymentService } = await import('./actual-payment.service');

        const amountPaid = feeCalc.amount_after_selected_discount || feeCalc.total_amount;

        const result = await actualPaymentService.recordPayment({
          clientId: feeCalc.client_id,
          feeCalculationId: id,
          amountPaid: amountPaid,
          paymentDate: paymentDetails?.paid_date ? new Date(paymentDetails.paid_date) : new Date(),
          paymentMethod: (paymentDetails?.payment_method as 'bank_transfer' | 'checks' | 'credit_card' | 'cash') || 'bank_transfer',
          paymentReference: paymentDetails?.payment_reference,
        });

        if (result.error) {
          return { data: null, error: result.error };
        }

        // Return updated fee calculation
        return this.getById(id);
      } catch (error) {
        return { data: null, error: this.handleError(error as Error) };
      }
    }

    // For non-paid statuses, update directly
    const updateData: UpdateFeeCalculationDto = { status };

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

      // If year is specified, get the calculation for that TAX YEAR
      // year = Tax year (שנת מס) - the fiscal year FOR WHICH fees were calculated
      // Example: year=2025 returns calculations calculated FOR tax year 2025
      if (year) {
        query = query.eq('year', year);
      }

      // Order by created_at descending to get the most recent
      query = query.order('created_at', { ascending: false })
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
   *
   * @param clientId - Client ID
   * @param year - Tax year (שנת מס) - the fiscal year FOR WHICH the calculation is made
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

  /**
   * Get latest calculation for client and year (any status)
   * Used when no draft exists but calculation was already sent
   *
   * @param clientId - Client ID
   * @param year - Tax year (שנת מס) - the fiscal year FOR WHICH the calculation was made
   */
  async getLatestCalculationForYear(
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
        .in('status', ['draft', 'calculated', 'sent'])
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

  /**
   * Check if a client is part of a group calculation for a given year
   * Used to determine if individual fee calculation should be blocked
   *
   * @param clientId - Client ID to check
   * @param year - Tax year
   * @returns Object with isGroupMember flag and optional groupName
   */
  async isClientInGroupCalculation(
    clientId: string,
    year: number
  ): Promise<ServiceResponse<{ isGroupMember: boolean; groupName?: string; groupCalculationId?: string }>> {
    try {
      const tenantId = await this.getTenantId();

      // First check if client has a fee_calculation linked to a group
      const { data: feeCalc, error: calcError } = await supabase
        .from('fee_calculations')
        .select('group_calculation_id')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('year', year)
        .eq('is_group_member', true)
        .maybeSingle();

      if (calcError) throw calcError;

      if (feeCalc?.group_calculation_id) {
        // Get group name
        const { data: groupCalc, error: groupError } = await supabase
          .from('group_fee_calculations')
          .select('id, client_group:client_groups(group_name_hebrew)')
          .eq('id', feeCalc.group_calculation_id)
          .single();

        if (groupError) throw groupError;

        const groupInfo = groupCalc?.client_group as { group_name_hebrew: string } | null;

        return {
          data: {
            isGroupMember: true,
            groupName: groupInfo?.group_name_hebrew,
            groupCalculationId: feeCalc.group_calculation_id
          },
          error: null
        };
      }

      // Also check if client's group has a calculation (even if not yet linked)
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('group_id')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      if (client?.group_id) {
        const { data: groupCalc, error: groupError } = await supabase
          .from('group_fee_calculations')
          .select('id, client_group:client_groups(group_name_hebrew)')
          .eq('tenant_id', tenantId)
          .eq('group_id', client.group_id)
          .eq('year', year)
          .maybeSingle();

        if (groupError) throw groupError;

        if (groupCalc) {
          const groupInfo = groupCalc?.client_group as { group_name_hebrew: string } | null;

          return {
            data: {
              isGroupMember: true,
              groupName: groupInfo?.group_name_hebrew,
              groupCalculationId: groupCalc.id
            },
            error: null
          };
        }
      }

      return { data: { isGroupMember: false }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const feeService = new FeeService();