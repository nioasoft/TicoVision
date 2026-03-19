/**
 * Shaagat HaAri — Public Service (token-based, no authentication)
 *
 * Handles all external form interactions:
 * - Feasibility check (step 0)
 * - Accounting/salary data submission
 * - Grant approval + bank details
 *
 * Uses SECURITY DEFINER RPC functions for safe anon access.
 */

import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Response types
// ─────────────────────────────────────────────────────────────────────────────

interface FeasibilityFormData {
  id: string;
  client_name: string;
  client_tax_id: string;
  is_submitted: boolean;
}

interface AccountingFormData {
  id: string;
  client_name: string;
  salary_period: string;
  is_submitted: boolean;
}

interface ApprovalFormData {
  id: string;
  client_name: string;
  fixed_expenses_grant: number;
  salary_grant: number;
  final_grant_amount: number;
  is_approved: boolean;
  track_type: string;
}

interface BankFormData {
  id: string;
  client_name: string;
  client_tax_id: string;
  is_submitted: boolean;
}

interface RpcResult {
  error?: string;
  success?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class ShaagatPublicService {

  // ═══════════════════════════════════════════════════════════════════════════
  // Feasibility form (step 0)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Load feasibility check data by public token.
   * Reads directly from the table with client join (anon RLS allows SELECT via token).
   * Company name and tax ID are shown readonly at the top of the form.
   */
  async getFeasibilityByToken(token: string): Promise<FeasibilityFormData | null> {
    const { data, error } = await supabase
      .from('shaagat_feasibility_checks')
      .select(`
        id, revenue_base, revenue_comparison, decline_percentage,
        has_feasibility, client_interested, submitted_at, payment_status,
        clients!inner ( company_name, tax_id )
      `)
      .eq('public_token', token)
      .single();

    if (error || !data) return null;

    // Extract client info from the join
    const client = data.clients as unknown as { company_name: string; tax_id: string } | null;

    return {
      id: data.id,
      client_name: client?.company_name ?? '',
      client_tax_id: client?.tax_id ?? '',
      is_submitted: data.submitted_at !== null,
    };
  }

  /**
   * Submit feasibility check data (revenue values).
   * The decline calculation is done client-side via calculateEligibility()
   * and then persisted to the DB.
   * Uses anon UPDATE RLS policy on the feasibility_checks table.
   */
  async submitFeasibility(
    token: string,
    revenueBase: number,
    revenueComparison: number,
    declinePercentage: number,
    hasFeasibility: boolean
  ): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('shaagat_feasibility_checks')
      .update({
        revenue_base: revenueBase,
        revenue_comparison: revenueComparison,
        decline_percentage: Math.round(declinePercentage * 10000) / 10000,
        has_feasibility: hasFeasibility,
        submitted_at: new Date().toISOString(),
      })
      .eq('public_token', token);

    if (error) {
      console.error('Error submitting feasibility:', error);
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Mark client as interested in proceeding.
   */
  async markInterested(token: string): Promise<boolean> {
    const { error } = await supabase
      .from('shaagat_feasibility_checks')
      .update({
        client_interested: true,
        interested_at: new Date().toISOString(),
      })
      .eq('public_token', token);

    return !error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bank details form
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get bank form data via SECURITY DEFINER RPC.
   */
  async getBankFormByToken(token: string): Promise<BankFormData | null> {
    const { data, error } = await supabase.rpc('get_shaagat_bank_form_by_token', {
      p_token: token,
    });

    if (error || !data || (data as RpcResult).error) return null;
    return data as unknown as BankFormData;
  }

  /**
   * Submit bank details via SECURITY DEFINER RPC.
   */
  async submitBankDetails(
    token: string,
    accountHolder: string,
    bankNumber: string,
    branchNumber: string,
    accountNumber: string,
    verificationTaxId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('submit_shaagat_bank_details', {
      p_token: token,
      p_account_holder: accountHolder,
      p_bank_number: bankNumber,
      p_branch_number: branchNumber,
      p_account_number: accountNumber,
      p_verification_tax_id: verificationTaxId,
    });

    if (error) {
      console.error('Error submitting bank details:', error);
      return { success: false, error: 'שגיאה בשמירת פרטי הבנק' };
    }

    const result = data as unknown as RpcResult;
    if (result.error) {
      if (result.error === 'tax_id_mismatch') {
        return { success: false, error: 'מספר ח.פ./ע.מ. אינו תואם' };
      }
      if (result.error === 'invalid_or_expired_token') {
        return { success: false, error: 'הקישור פג תוקף או אינו תקין' };
      }
      return { success: false, error: result.error };
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Accounting/salary data form
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get accounting form data via SECURITY DEFINER RPC.
   */
  async getAccountingFormByToken(token: string): Promise<AccountingFormData | null> {
    const { data, error } = await supabase.rpc('get_shaagat_accounting_form_by_token', {
      p_token: token,
    });

    if (error || !data || (data as RpcResult).error) return null;
    return data as unknown as AccountingFormData;
  }

  /**
   * Submit accounting/salary data.
   * Uses direct table update via anon (or service_role in edge function).
   * For now, updates the shaagat_accounting_submissions row via its token.
   */
  async submitAccountingData(
    token: string,
    formData: {
      salary_gross: number;
      num_employees: number;
      miluim_deductions?: number;
      miluim_count?: number;
      tips_deductions?: number;
      tips_count?: number;
      chalat_deductions?: number;
      chalat_count?: number;
      vacation_deductions?: number;
      vacation_count?: number;
      fruit_vegetable_purchases_annual?: number;
      monthly_fixed_expenses?: number;
      submitted_by_email: string;
      submitted_by_business_id?: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('shaagat_accounting_submissions')
      .update({
        salary_gross: formData.salary_gross,
        num_employees: formData.num_employees,
        miluim_deductions: formData.miluim_deductions ?? 0,
        miluim_count: formData.miluim_count ?? 0,
        tips_deductions: formData.tips_deductions ?? 0,
        tips_count: formData.tips_count ?? 0,
        chalat_deductions: formData.chalat_deductions ?? 0,
        chalat_count: formData.chalat_count ?? 0,
        vacation_deductions: formData.vacation_deductions ?? 0,
        vacation_count: formData.vacation_count ?? 0,
        fruit_vegetable_purchases_annual: formData.fruit_vegetable_purchases_annual ?? 0,
        monthly_fixed_expenses: formData.monthly_fixed_expenses ?? 0,
        submitted_by_email: formData.submitted_by_email,
        submitted_by_business_id: formData.submitted_by_business_id ?? null,
        notes: formData.notes ?? null,
      })
      .eq('submission_token', token);

    if (error) {
      console.error('Error submitting accounting data:', error);
      return { success: false, error: 'שגיאה בשמירת הנתונים' };
    }

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Grant approval form
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get grant approval data via SECURITY DEFINER RPC.
   */
  async getApprovalByToken(token: string): Promise<ApprovalFormData | null> {
    const { data, error } = await supabase.rpc('get_shaagat_approval_by_token', {
      p_token: token,
    });

    if (error || !data || (data as RpcResult).error) return null;
    return data as unknown as ApprovalFormData;
  }

  /**
   * Submit grant approval or rejection.
   * Updates the detailed_calculation row via its approval_token.
   */
  async submitApproval(
    token: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('shaagat_detailed_calculations')
      .update({
        client_approved: approved,
        client_approved_at: new Date().toISOString(),
        client_rejection_reason: approved ? null : (rejectionReason ?? null),
      })
      .eq('approval_token', token);

    if (error) {
      console.error('Error submitting approval:', error);
      return { success: false, error: 'שגיאה בשמירת האישור' };
    }

    return { success: true };
  }
}

export const shaagatPublicService = new ShaagatPublicService();
