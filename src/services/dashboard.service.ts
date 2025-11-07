import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  BudgetStandard,
  LetterStats,
  PaymentStats,
  DashboardData,
  BudgetByCategory,
} from '@/types/dashboard.types';

/**
 * Client budget breakdown row
 * Used for detailed budget breakdown by client
 */
export interface ClientBudgetRow {
  client_id: string;
  client_name: string;
  amount_before_vat: number;
  amount_with_vat: number;
}

/**
 * Dashboard Service
 * מנהל את כל הנתונים עבור לוח הבקרה הראשי
 */
class DashboardService extends BaseService {
  constructor() {
    super('fee_calculations');
  }

  /**
   * קבלת תקן תקציב לשנה מסוימת
   * מחזיר סכומי שכר טרחה + הנהלת חשבונות לפני ואחרי מע"מ 18%
   *
   * @param taxYear - שנת מס (Tax Year) - השנה עבורה מבוצע החישוב (לדוגמה: 2026)
   *                  NOT the year when calculation was performed
   * @returns תקן תקציב מפורט
   */
  async getBudgetStandard(taxYear: number): Promise<ServiceResponse<BudgetStandard>> {
    try {
      const tenantId = await this.getTenantId();

      // Query to sum all fee calculations for the given year
      const { data, error } = await supabase
        .from('fee_calculations')
        .select(`
          final_amount,
          total_amount,
          vat_amount,
          bookkeeping_calculation
        `)
        .eq('tenant_id', tenantId)
        .eq('year', taxYear);

      if (error) {
        throw this.handleError(error);
      }

      // Calculate totals
      let audit_before_vat = 0;
      let audit_with_vat = 0;
      let bookkeeping_before_vat = 0;
      let bookkeeping_with_vat = 0;

      if (data) {
        for (const row of data) {
          // שכר טרחה (Audit fees)
          // Use final_amount (before VAT) and total_amount (with VAT)
          audit_before_vat += row.final_amount || 0;
          audit_with_vat += row.total_amount || (row.final_amount || 0) + (row.vat_amount || 0);

          // הנהלת חשבונות (Bookkeeping) - from JSONB field
          if (row.bookkeeping_calculation) {
            const bookkeeping = row.bookkeeping_calculation as {
              final_amount?: number;
              total_with_vat?: number;
            };
            bookkeeping_before_vat += bookkeeping.final_amount || 0;
            bookkeeping_with_vat += bookkeeping.total_with_vat || 0;
          }
        }
      }

      const budget: BudgetStandard = {
        audit_before_vat,
        audit_with_vat,
        bookkeeping_before_vat,
        bookkeeping_with_vat,
        total_before_vat: audit_before_vat + bookkeeping_before_vat,
        total_with_vat: audit_with_vat + bookkeeping_with_vat,
      };

      await this.logAction('get_budget_standard', undefined, { tax_year: taxYear });

      return { data: budget, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * קבלת סטטיסטיקת מכתבים לשנה מסוימת
   * מחזיר מספר לקוחות ששולחו להם מכתבים
   *
   * @param taxYear - שנת מס (Tax Year) - השנה עבורה נשלחו המכתבים
   * @returns סטטיסטיקת מכתבים
   */
  async getLetterStats(taxYear: number): Promise<ServiceResponse<LetterStats>> {
    try {
      const tenantId = await this.getTenantId();

      // Count distinct clients who received letters for this year
      // Using a simple approach: get all fee calculations for the year that have sent letters
      const { data, error } = await supabase
        .from('generated_letters')
        .select('fee_calculation_id')
        .not('sent_at', 'is', null);

      if (error) {
        throw this.handleError(error);
      }

      // Get fee_calculation_ids that have sent letters
      const sentFeeIds = data?.map((row) => row.fee_calculation_id) || [];

      if (sentFeeIds.length === 0) {
        const stats: LetterStats = { clients_sent_count: 0 };
        await this.logAction('get_letter_stats', undefined, { tax_year: taxYear });
        return { data: stats, error: null };
      }

      // Now get distinct client_ids from fee_calculations for this year
      const { data: feeData, error: feeError } = await supabase
        .from('fee_calculations')
        .select('client_id')
        .eq('tenant_id', tenantId)
        .eq('year', taxYear)
        .in('id', sentFeeIds);

      if (feeError) {
        throw this.handleError(feeError);
      }

      // Count unique client_ids
      const uniqueClients = new Set(feeData?.map((row) => row.client_id) || []);

      const stats: LetterStats = {
        clients_sent_count: uniqueClients.size,
      };

      await this.logAction('get_letter_stats', undefined, { tax_year: taxYear });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * קבלת סטטיסטיקת תשלומים לשנה מסוימת
   * מחזיר מספר לקוחות ששילמו/ממתינים + סכומים + אחוז גביה
   *
   * @param taxYear - שנת מס (Tax Year) - השנה עבורה התבצעו התשלומים
   * @returns סטטיסטיקת תשלומים
   */
  async getPaymentStats(taxYear: number): Promise<ServiceResponse<PaymentStats>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all fee calculations for the year
      const { data, error } = await supabase
        .from('fee_calculations')
        .select('status, total_amount, final_amount, vat_amount')
        .eq('tenant_id', tenantId)
        .eq('year', taxYear);

      if (error) {
        throw this.handleError(error);
      }

      // Calculate statistics
      let clients_paid_count = 0;
      let clients_pending_count = 0;
      let amount_collected = 0;
      let amount_pending = 0;

      if (data) {
        for (const row of data) {
          // Calculate total amount (use total_amount if available, otherwise calculate)
          const totalAmount = row.total_amount || (row.final_amount || 0) + (row.vat_amount || 0);

          if (row.status === 'paid') {
            clients_paid_count++;
            amount_collected += totalAmount;
          } else if (['sent', 'overdue', 'partial_paid'].includes(row.status)) {
            clients_pending_count++;
            amount_pending += totalAmount;
          }
        }
      }

      // Calculate collection rate
      const total_amount = amount_collected + amount_pending;
      const collection_rate_percent =
        total_amount > 0 ? (amount_collected / total_amount) * 100 : 0;

      const stats: PaymentStats = {
        clients_paid_count,
        clients_pending_count,
        amount_collected,
        amount_pending,
        collection_rate_percent,
      };

      await this.logAction('get_payment_stats', undefined, { tax_year: taxYear });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * קבלת כל נתוני Dashboard בבת אחת (OPTIMIZED)
   * משתמש ב-SQL function אחד במקום 3 queries נפרדות
   *
   * @param taxYear - שנת מס (Tax Year) - השנה עבורה מוצגים הנתונים
   *                  Example: For tax year 2026, shows all fees calculated FOR 2026
   * @returns נתוני Dashboard מלאים
   */
  async getDashboardData(taxYear: number): Promise<ServiceResponse<DashboardData>> {
    try {
      const tenantId = await this.getTenantId();

      // Single RPC call instead of 3 separate queries (OPTIMIZED!)
      const { data, error } = await supabase
        .rpc('get_dashboard_summary', {
          p_tenant_id: tenantId,
          p_tax_year: taxYear,
        })
        .single();

      if (error) throw this.handleError(error);

      // Transform SQL function result to DashboardData format
      const dashboardData: DashboardData = {
        tax_year: taxYear,
        budget_standard: {
          audit_before_vat: data.audit_before_vat || 0,
          audit_with_vat: data.audit_with_vat || 0,
          bookkeeping_before_vat: data.bookkeeping_before_vat || 0,
          bookkeeping_with_vat: data.bookkeeping_with_vat || 0,
          total_before_vat: (data.audit_before_vat || 0) + (data.bookkeeping_before_vat || 0),
          total_with_vat: (data.audit_with_vat || 0) + (data.bookkeeping_with_vat || 0),
        },
        letter_stats: {
          clients_sent_count: data.clients_sent_count || 0,
        },
        payment_stats: {
          clients_paid_count: data.clients_paid_count || 0,
          clients_pending_count: data.clients_pending_count || 0,
          amount_collected: data.amount_collected || 0,
          amount_pending: data.amount_pending || 0,
          collection_rate_percent:
            (data.amount_collected || 0) + (data.amount_pending || 0) > 0
              ? ((data.amount_collected || 0) /
                  ((data.amount_collected || 0) + (data.amount_pending || 0))) *
                100
              : 0,
        },
      };

      await this.logAction('get_dashboard_data', undefined, { tax_year: taxYear });

      return { data: dashboardData, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * קבלת פירוט תקציב לפי קטגוריות
   * מחזיר חלוקה מפורטת של התקציב: חיצוניים, פנימיים, ריטיינר, עצמאים
   *
   * @param taxYear - שנת מס
   * @returns פירוט תקציב מלא לפי קטגוריות
   */
  async getBudgetByCategory(taxYear: number): Promise<ServiceResponse<BudgetByCategory>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .rpc('get_budget_by_category', {
          p_tenant_id: tenantId,
          p_tax_year: taxYear,
        })
        .single();

      if (error) throw this.handleError(error);

      // חשב סכומים מרכזיים
      const auditTotal =
        (data.audit_external_with_vat || 0) +
        (data.audit_internal_with_vat || 0) +
        (data.audit_retainer_with_vat || 0);

      const bookkeepingTotal =
        (data.bookkeeping_internal_with_vat || 0) +
        (data.bookkeeping_retainer_with_vat || 0);

      const freelancersTotal = data.freelancers_with_vat || 0;
      const exceptionsTotal = 0; // בקרוב

      const breakdown: BudgetByCategory = {
        audit_external: {
          before_vat: data.audit_external_before_vat || 0,
          with_vat: data.audit_external_with_vat || 0,
          actual_before_vat: data.audit_external_actual_before_vat || 0,
          actual_with_vat: data.audit_external_actual_with_vat || 0,
          client_count: data.audit_external_count || 0,
        },
        audit_internal: {
          before_vat: data.audit_internal_before_vat || 0,
          with_vat: data.audit_internal_with_vat || 0,
          actual_before_vat: data.audit_internal_actual_before_vat || 0,
          actual_with_vat: data.audit_internal_actual_with_vat || 0,
          client_count: data.audit_internal_count || 0,
        },
        audit_retainer: {
          before_vat: data.audit_retainer_before_vat || 0,
          with_vat: data.audit_retainer_with_vat || 0,
          actual_before_vat: data.audit_retainer_actual_before_vat || 0,
          actual_with_vat: data.audit_retainer_actual_with_vat || 0,
          client_count: data.audit_retainer_count || 0,
        },
        audit_total: auditTotal,

        bookkeeping_internal: {
          before_vat: data.bookkeeping_internal_before_vat || 0,
          with_vat: data.bookkeeping_internal_with_vat || 0,
          actual_before_vat: data.bookkeeping_internal_actual_before_vat || 0,
          actual_with_vat: data.bookkeeping_internal_actual_with_vat || 0,
          client_count: data.bookkeeping_internal_count || 0,
        },
        bookkeeping_retainer: {
          before_vat: data.bookkeeping_retainer_before_vat || 0,
          with_vat: data.bookkeeping_retainer_with_vat || 0,
          actual_before_vat: data.bookkeeping_retainer_actual_before_vat || 0,
          actual_with_vat: data.bookkeeping_retainer_actual_with_vat || 0,
          client_count: data.bookkeeping_retainer_count || 0,
        },
        bookkeeping_total: bookkeepingTotal,

        freelancers: {
          before_vat: data.freelancers_before_vat || 0,
          with_vat: data.freelancers_with_vat || 0,
          actual_before_vat: data.freelancers_actual_before_vat || 0,
          actual_with_vat: data.freelancers_actual_with_vat || 0,
          client_count: data.freelancers_count || 0,
        },
        exceptions: {
          before_vat: 0,
          with_vat: 0,
          actual_before_vat: 0,
          actual_with_vat: 0,
          client_count: 0,
        },

        grand_total: auditTotal + bookkeepingTotal + freelancersTotal + exceptionsTotal,
      };

      await this.logAction('get_budget_by_category', undefined, { tax_year: taxYear });

      return { data: breakdown, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * קבלת פירוט תקציב לפי לקוחות
   * מחזיר רשימת לקוחות עם סכומי שכר טרחה או הנהלת חשבונות
   *
   * @param taxYear - שנת מס
   * @param type - 'audit' לשכר טרחה, 'bookkeeping' להנהלת חשבונות
   * @returns רשימת לקוחות עם סכומים
   */
  async getBudgetBreakdown(
    taxYear: number,
    type: 'audit' | 'bookkeeping'
  ): Promise<ServiceResponse<ClientBudgetRow[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('fee_calculations')
        .select(
          `
          client_id,
          client:clients!inner(company_name),
          final_amount,
          total_amount,
          bookkeeping_calculation
        `
        )
        .eq('tenant_id', tenantId)
        .eq('year', taxYear);

      if (error) throw this.handleError(error);

      // Transform data based on type
      const breakdown: ClientBudgetRow[] = (data || [])
        .map((row) => {
          if (type === 'audit') {
            return {
              client_id: row.client_id,
              client_name: row.client?.company_name || 'Unknown',
              amount_before_vat: row.final_amount || 0,
              amount_with_vat: row.total_amount || 0,
            };
          } else {
            // bookkeeping
            const bk = row.bookkeeping_calculation as { final_amount?: number; total_with_vat?: number } | null;
            return {
              client_id: row.client_id,
              client_name: row.client?.company_name || 'Unknown',
              amount_before_vat: bk?.final_amount || 0,
              amount_with_vat: bk?.total_with_vat || 0,
            };
          }
        })
        .filter((row) => row.amount_with_vat > 0); // Only clients with amounts

      await this.logAction('get_budget_breakdown', undefined, {
        tax_year: taxYear,
        type,
        count: breakdown.length,
      });

      return { data: breakdown, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * קבלת פירוט אמצעי תשלום
   * מחזיר כמה לקוחות בחרו כל אמצעי תשלום וסכומים
   *
   * @param taxYear - שנת מס
   * @returns פירוט אמצעי תשלום
   */
  async getPaymentMethodBreakdown(
    taxYear: number
  ): Promise<ServiceResponse<PaymentMethodBreakdown>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .rpc('get_payment_method_breakdown', {
          p_tenant_id: tenantId,
          p_tax_year: taxYear,
        })
        .single();

      if (error) throw this.handleError(error);

      const breakdown: PaymentMethodBreakdown = {
        bank_transfer: {
          count: data.bank_transfer_count || 0,
          amount: data.bank_transfer_amount || 0,
          discount: 9,
        },
        cc_single: {
          count: data.cc_single_count || 0,
          amount: data.cc_single_amount || 0,
          discount: 8,
        },
        cc_installments: {
          count: data.cc_installments_count || 0,
          amount: data.cc_installments_amount || 0,
          discount: 4,
        },
        checks: {
          count: data.checks_count || 0,
          amount: data.checks_amount || 0,
          discount: 0,
        },
        not_selected: {
          count: data.not_selected_count || 0,
          amount: data.not_selected_amount || 0,
        },
      };

      await this.logAction('get_payment_method_breakdown', undefined, { tax_year: taxYear });

      return { data: breakdown, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get budget with actual payments
   * - Combines budget standard (from fee_calculations)
   * - With actual payments (from actual_payments)
   *
   * @param year - Tax year
   * @returns Budget with actuals comparison
   */
  async getBudgetWithActuals(
    year: number
  ): Promise<ServiceResponse<{
    budgetStandard: { beforeVat: number; withVat: number };
    actualPayments: { beforeVat: number; withVat: number };
    remaining: { beforeVat: number; withVat: number };
    completionRate: number;
  }>> {
    try {
      const tenantId = await this.getTenantId();

      // Get budget standard
      const { data: budgetData, error: budgetError } = await supabase
        .from('fee_calculations')
        .select('final_amount, total_amount')
        .eq('tenant_id', tenantId)
        .eq('year', year);

      if (budgetError) throw budgetError;

      // Get actual payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('actual_payments')
        .select('amount_before_vat, amount_with_vat')
        .eq('tenant_id', tenantId)
        .gte('payment_date', `${year}-01-01`)
        .lte('payment_date', `${year}-12-31`);

      if (paymentsError) throw paymentsError;

      // Calculate budget standard
      const budgetStandard = {
        beforeVat: budgetData?.reduce((sum, f) => sum + (f.final_amount || 0), 0) || 0,
        withVat: budgetData?.reduce((sum, f) => sum + (f.total_amount || 0), 0) || 0,
      };

      // Calculate actual payments
      const actualPayments = {
        beforeVat: paymentsData?.reduce((sum, p) => sum + (p.amount_before_vat || 0), 0) || 0,
        withVat: paymentsData?.reduce((sum, p) => sum + (p.amount_with_vat || 0), 0) || 0,
      };

      // Calculate remaining
      const remaining = {
        beforeVat: budgetStandard.beforeVat - actualPayments.beforeVat,
        withVat: budgetStandard.withVat - actualPayments.withVat,
      };

      // Calculate completion rate
      const completionRate =
        budgetStandard.beforeVat > 0
          ? (actualPayments.beforeVat / budgetStandard.beforeVat) * 100
          : 0;

      await this.logAction('get_budget_with_actuals', undefined, { year });

      return {
        data: {
          budgetStandard,
          actualPayments,
          remaining,
          completionRate,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get payment method breakdown with client details
   *
   * @param year - Tax year
   * @returns Payment method breakdown with client list
   */
  async getPaymentMethodBreakdownWithClients(
    year: number
  ): Promise<ServiceResponse<
    Array<{
      method: string;
      count: number;
      clients: Array<{
        clientId: string;
        clientName: string;
        originalAmount: number;
        expectedAmount: number;
        actualAmount: number;
      }>;
      totalBeforeVat: number;
      totalWithVat: number;
    }>
  >> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('actual_payments')
        .select(`
          *,
          clients (id, company_name),
          fee_calculations (final_amount, amount_after_selected_discount)
        `)
        .eq('tenant_id', tenantId)
        .gte('payment_date', `${year}-01-01`)
        .lte('payment_date', `${year}-12-31`)
        .order('payment_method');

      if (error) throw error;

      // Group by payment method
      const breakdown: Record<string, {
        method: string;
        count: number;
        clients: Array<{
          clientId: string;
          clientName: string;
          originalAmount: number;
          expectedAmount: number;
          actualAmount: number;
        }>;
        totalBeforeVat: number;
        totalWithVat: number;
      }> = {};

      data?.forEach((payment: Record<string, unknown>) => {
        const method = payment.payment_method as string;
        if (!breakdown[method]) {
          breakdown[method] = {
            method,
            count: 0,
            clients: [],
            totalBeforeVat: 0,
            totalWithVat: 0,
          };
        }

        const client = payment.clients as { id: string; company_name: string };
        const feeCalc = payment.fee_calculations as {
          final_amount?: number;
          amount_after_selected_discount?: number;
        };

        breakdown[method].count++;
        breakdown[method].clients.push({
          clientId: client.id,
          clientName: client.company_name,
          originalAmount: feeCalc?.final_amount || 0,
          expectedAmount: feeCalc?.amount_after_selected_discount || 0,
          actualAmount: payment.amount_paid as number,
        });
        breakdown[method].totalBeforeVat += (payment.amount_before_vat as number) || 0;
        breakdown[method].totalWithVat += (payment.amount_with_vat as number) || 0;
      });

      await this.logAction('get_payment_method_breakdown_with_clients', undefined, { year });

      return { data: Object.values(breakdown), error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
