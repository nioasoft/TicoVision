/**
 * Supabase Edge Function: Alert Monitor
 * Checks for real-time alerts and returns summary
 *
 * Endpoint: POST /functions/v1/alert-monitor
 * Authentication: JWT token (user) or Service role key (cron)
 * Schedule: Hourly OR triggered manually from dashboard
 *
 * Checks:
 * - Unopened letters (7+ days)
 * - No payment selection (14+ days)
 * - Abandoned Cardcom (3+ days)
 * - Checks overdue (30+ days)
 * - Pending disputes
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface AlertSummary {
  tenant_id: string;
  alerts: {
    unopened_letters: {
      count: number;
      fee_ids: string[];
      threshold_days: number;
    };
    no_selection: {
      count: number;
      fee_ids: string[];
      threshold_days: number;
    };
    abandoned_cardcom: {
      count: number;
      fee_ids: string[];
      threshold_days: number;
    };
    checks_overdue: {
      count: number;
      fee_ids: string[];
      threshold_days: number;
    };
    pending_disputes: {
      count: number;
      dispute_ids: string[];
    };
  };
  total_alerts: number;
  checked_at: string;
}

/**
 * Get alert thresholds from notification settings
 */
async function getAlertThresholds(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<{
  unopened_days: number;
  no_selection_days: number;
  abandoned_cart_days: number;
  checks_overdue_days: number;
}> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('notify_letter_not_opened_days, notify_no_selection_days, notify_abandoned_cart_days, notify_checks_overdue_days')
    .eq('tenant_id', tenantId)
    .limit(1)
    .single();

  if (error || !data) {
    // Return defaults if no settings found
    return {
      unopened_days: 7,
      no_selection_days: 14,
      abandoned_cart_days: 3,
      checks_overdue_days: 30,
    };
  }

  return {
    unopened_days: data.notify_letter_not_opened_days || 7,
    no_selection_days: data.notify_no_selection_days || 14,
    abandoned_cart_days: data.notify_abandoned_cart_days || 3,
    checks_overdue_days: data.notify_checks_overdue_days || 30,
  };
}

/**
 * Check for unopened letters
 */
async function checkUnopenedLetters(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  thresholdDays: number
): Promise<{ count: number; fee_ids: string[] }> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  const { data, error } = await supabase
    .from('generated_letters')
    .select('fee_calculation_id')
    .eq('tenant_id', tenantId)
    .not('sent_at', 'is', null)
    .is('opened_at', null)
    .lt('sent_at', thresholdDate.toISOString());

  if (error) {
    console.error('❌ Error checking unopened letters:', error);
    return { count: 0, fee_ids: [] };
  }

  const feeIds = (data || []).map(row => row.fee_calculation_id).filter(Boolean) as string[];

  return {
    count: feeIds.length,
    fee_ids: feeIds,
  };
}

/**
 * Check for no payment selection
 */
async function checkNoSelection(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  thresholdDays: number
): Promise<{ count: number; fee_ids: string[] }> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  const { data, error } = await supabase
    .from('fee_calculations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'sent')
    .is('payment_method_selected', null)
    .lt('created_at', thresholdDate.toISOString());

  if (error) {
    console.error('❌ Error checking no selection:', error);
    return { count: 0, fee_ids: [] };
  }

  const feeIds = (data || []).map(row => row.id);

  return {
    count: feeIds.length,
    fee_ids: feeIds,
  };
}

/**
 * Check for abandoned Cardcom payments
 */
async function checkAbandonedCardcom(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  thresholdDays: number
): Promise<{ count: number; fee_ids: string[] }> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  const { data, error } = await supabase
    .from('payment_method_selections')
    .select('fee_calculation_id')
    .eq('tenant_id', tenantId)
    .in('selected_method', ['cc_single', 'cc_installments'])
    .eq('completed_payment', false)
    .lt('selected_at', thresholdDate.toISOString());

  if (error) {
    console.error('❌ Error checking abandoned Cardcom:', error);
    return { count: 0, fee_ids: [] };
  }

  const feeIds = (data || []).map(row => row.fee_calculation_id).filter(Boolean) as string[];

  return {
    count: feeIds.length,
    fee_ids: feeIds,
  };
}

/**
 * Check for overdue checks
 */
async function checkChecksOverdue(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  thresholdDays: number
): Promise<{ count: number; fee_ids: string[] }> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

  const { data, error } = await supabase
    .from('fee_calculations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('payment_method_selected', 'checks')
    .neq('status', 'paid')
    .lt('payment_method_selected_at', thresholdDate.toISOString());

  if (error) {
    console.error('❌ Error checking checks overdue:', error);
    return { count: 0, fee_ids: [] };
  }

  const feeIds = (data || []).map(row => row.id);

  return {
    count: feeIds.length,
    fee_ids: feeIds,
  };
}

/**
 * Check for pending disputes
 */
async function checkPendingDisputes(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<{ count: number; dispute_ids: string[] }> {
  const { data, error } = await supabase
    .from('payment_disputes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending');

  if (error) {
    console.error('❌ Error checking pending disputes:', error);
    return { count: 0, dispute_ids: [] };
  }

  const disputeIds = (data || []).map(row => row.id);

  return {
    count: disputeIds.length,
    dispute_ids: disputeIds,
  };
}

/**
 * Generate alert summary for a tenant
 */
async function generateAlertSummary(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<AlertSummary> {
  // Get alert thresholds
  const thresholds = await getAlertThresholds(supabase, tenantId);

  console.log(`📊 Checking alerts for tenant ${tenantId}`);
  console.log(`⚙️ Thresholds:`, thresholds);

  // Run all checks in parallel
  const [
    unopenedLetters,
    noSelection,
    abandonedCardcom,
    checksOverdue,
    pendingDisputes,
  ] = await Promise.all([
    checkUnopenedLetters(supabase, tenantId, thresholds.unopened_days),
    checkNoSelection(supabase, tenantId, thresholds.no_selection_days),
    checkAbandonedCardcom(supabase, tenantId, thresholds.abandoned_cart_days),
    checkChecksOverdue(supabase, tenantId, thresholds.checks_overdue_days),
    checkPendingDisputes(supabase, tenantId),
  ]);

  const totalAlerts =
    unopenedLetters.count +
    noSelection.count +
    abandonedCardcom.count +
    checksOverdue.count +
    pendingDisputes.count;

  return {
    tenant_id: tenantId,
    alerts: {
      unopened_letters: {
        ...unopenedLetters,
        threshold_days: thresholds.unopened_days,
      },
      no_selection: {
        ...noSelection,
        threshold_days: thresholds.no_selection_days,
      },
      abandoned_cardcom: {
        ...abandonedCardcom,
        threshold_days: thresholds.abandoned_cart_days,
      },
      checks_overdue: {
        ...checksOverdue,
        threshold_days: thresholds.checks_overdue_days,
      },
      pending_disputes: pendingDisputes,
    },
    total_alerts: totalAlerts,
    checked_at: new Date().toISOString(),
  };
}

/**
 * Main handler
 */
serve(async (req) => {
  console.log('🔔 Alert Monitor started');

  try {
    // Validate environment
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase configuration missing');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supabase configuration missing',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tenant_id from request body or query params
    const url = new URL(req.url);
    const tenantIdFromQuery = url.searchParams.get('tenant_id');

    let tenantId: string | null = tenantIdFromQuery;

    // If no tenant_id provided, get all active tenants
    if (!tenantId) {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id')
        .eq('is_active', true);

      if (tenantsError || !tenants || tenants.length === 0) {
        console.error('❌ No active tenants found');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No active tenants found',
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // For multiple tenants, return summary for all
      const summaries = await Promise.all(
        tenants.map(tenant => generateAlertSummary(supabase, tenant.id))
      );

      console.log('✅ Alert Monitor completed for all tenants');

      return new Response(
        JSON.stringify({
          success: true,
          data: summaries,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Single tenant check
    const summary = await generateAlertSummary(supabase, tenantId);

    console.log('✅ Alert Monitor completed');
    console.log('📊 Summary:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        data: summary,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Fatal error in alert monitor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Fatal error in alert monitor',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
