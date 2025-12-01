/**
 * Supabase Edge Function: Collection Reminder Engine
 * Runs daily via pg_cron to send automated payment reminders
 *
 * Endpoint: POST /functions/v1/collection-reminder-engine
 * Authentication: Service role key (cron job)
 * Schedule: Daily at 7:00 AM UTC (9:00 AM Israel winter, 10:00 AM summer)
 *
 * Process:
 * 1. Fetch all active tenants
 * 2. For each tenant:
 *    - Get active reminder rules (sorted by priority)
 *    - Get fees needing reminders
 *    - Match fees against rules (first match wins)
 *    - Send reminder emails
 *    - Update reminder counts
 *    - Send admin alerts if needed
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

interface ReminderRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  trigger_conditions: {
    days_since_sent?: number;
    days_since_opened?: number;
    days_since_selection?: number;
    payment_method_selected?: string | string[];
    payment_status?: string[];
    opened?: boolean;
    completed_payment?: boolean;
  };
  actions: {
    send_email: boolean;
    send_sms?: boolean;
    notify_admin: boolean;
    email_template?: string;
    include_mistake_button?: boolean;
  };
  priority: number;
  is_active: boolean;
}

interface FeeNeedingReminder {
  fee_calculation_id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  amount: number;
  days_since_sent: number;
  opened: boolean;
  payment_method_selected: string | null;
}

interface ProcessingStats {
  tenants_processed: number;
  rules_processed: number;
  fees_matched: number;
  reminders_sent: number;
  emails_sent: number;
  emails_failed: number;
  admin_alerts_sent: number;
  errors: string[];
}

// Cache for email settings (per function invocation)
let cachedEmailSettings: { sender_email: string; sender_name: string; reply_to_email: string; alert_email: string } | null = null;

/**
 * Get email settings from tenant_settings table
 */
async function getEmailSettings(supabase: ReturnType<typeof createClient>): Promise<{
  sender_email: string;
  sender_name: string;
  reply_to_email: string;
  alert_email: string;
}> {
  if (cachedEmailSettings) {
    return cachedEmailSettings;
  }

  const defaults = {
    sender_email: 'tico@franco.co.il',
    sender_name: 'תיקו פרנקו - משרד רואי חשבון',
    reply_to_email: 'sigal@franco.co.il',
    alert_email: 'sigal@franco.co.il'
  };

  try {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('sender_email, sender_name, reply_to_email, alert_email')
      .single();

    if (error || !data) {
      cachedEmailSettings = defaults;
      return defaults;
    }

    cachedEmailSettings = {
      sender_email: data.sender_email || defaults.sender_email,
      sender_name: data.sender_name || defaults.sender_name,
      reply_to_email: data.reply_to_email || defaults.reply_to_email,
      alert_email: data.alert_email || defaults.alert_email
    };
    return cachedEmailSettings;
  } catch {
    cachedEmailSettings = defaults;
    return defaults;
  }
}

/**
 * Send reminder email via SendGrid
 */
async function sendReminderEmail(
  to: string,
  templateId: string,
  variables: Record<string, unknown>,
  emailSettings: { sender_email: string; sender_name: string }
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.error('❌ SendGrid API key not configured');
      return false;
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          dynamic_template_data: variables,
        }],
        from: {
          email: emailSettings.sender_email,
          name: emailSettings.sender_name,
        },
        template_id: templateId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ SendGrid error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`✅ Email sent to ${to} using template ${templateId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

/**
 * Send admin alert email to Sigal
 */
async function sendAdminAlert(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  alertType: string,
  feeIds: string[],
  emailSettings: { sender_email: string; sender_name: string; alert_email: string }
): Promise<boolean> {
  try {
    // Get notification settings
    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('alert_email_address, enable_email_notifications')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !settings?.enable_email_notifications) {
      console.log(`ℹ️ Admin alerts disabled for tenant ${tenantId}`);
      return false;
    }

    // Use notification_settings alert_email_address, fallback to tenant_settings alert_email
    const alertEmail = settings.alert_email_address || emailSettings.alert_email;

    // Map alert types to Hebrew messages
    const alertMessages: Record<string, string> = {
      unopened_7d: 'מכתבים שלא נפתחו 7+ ימים',
      no_selection_14d: 'לא נבחר אופן תשלום 14+ ימים',
      abandoned_cart_3d: 'נטשו Cardcom 3+ ימים',
      checks_overdue_30d: 'המחאות באיחור 30+ ימים',
    };

    await sendReminderEmail(
      alertEmail,
      'admin_alert_template', // SendGrid template ID
      {
        alert_type: alertMessages[alertType] || alertType,
        fee_count: feeIds.length,
        dashboard_link: `https://ticovision.vercel.app/collections?filter=${alertType}`,
        date: new Date().toLocaleDateString('he-IL'),
      },
      emailSettings
    );

    console.log(`✅ Admin alert sent for ${alertType}: ${feeIds.length} fees`);
    return true;
  } catch (error) {
    console.error('❌ Error sending admin alert:', error);
    return false;
  }
}

/**
 * Check if reminder already sent today (prevent duplicates)
 */
async function wasReminderSentToday(
  supabase: ReturnType<typeof createClient>,
  feeId: string,
  reminderType: string
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('payment_reminders')
    .select('id')
    .eq('fee_calculation_id', feeId)
    .eq('reminder_type', reminderType)
    .gte('sent_at', today.toISOString())
    .limit(1);

  if (error) {
    console.error('❌ Error checking reminder history:', error);
    return false;
  }

  return (data && data.length > 0) || false;
}

/**
 * Process reminders for a single tenant
 */
async function processTenantReminders(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  stats: ProcessingStats
): Promise<void> {
  console.log(`\n📊 Processing tenant: ${tenantId}`);

  // Get email settings for this invocation
  const emailSettings = await getEmailSettings(supabase);
  console.log(`📧 Email settings: from=${emailSettings.sender_email}, alert=${emailSettings.alert_email}`);

  // Get active reminder rules for this tenant
  const { data: rules, error: rulesError } = await supabase
    .from('reminder_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (rulesError) {
    console.error(`❌ Error fetching rules for tenant ${tenantId}:`, rulesError);
    stats.errors.push(`Failed to fetch rules for tenant ${tenantId}`);
    return;
  }

  if (!rules || rules.length === 0) {
    console.log(`ℹ️ No active reminder rules for tenant ${tenantId}`);
    return;
  }

  console.log(`✅ Found ${rules.length} active reminder rules`);
  stats.rules_processed += rules.length;

  // Process each rule
  for (const rule of rules as ReminderRule[]) {
    console.log(`\n📋 Processing rule: ${rule.name} (priority: ${rule.priority})`);

    // Get fees matching this rule using database function
    const { data: fees, error: feesError } = await supabase
      .rpc('get_fees_needing_reminders', {
        p_tenant_id: tenantId,
        p_rule_id: rule.id,
      });

    if (feesError) {
      console.error(`❌ Error fetching fees for rule ${rule.id}:`, feesError);
      stats.errors.push(`Failed to fetch fees for rule ${rule.name}`);
      continue;
    }

    if (!fees || fees.length === 0) {
      console.log(`ℹ️ No fees match rule: ${rule.name}`);
      continue;
    }

    console.log(`✅ Found ${fees.length} fees matching rule`);
    stats.fees_matched += fees.length;

    // Process each fee (batch of 100 to avoid overload)
    const batchSize = 100;
    for (let i = 0; i < fees.length; i += batchSize) {
      const batch = fees.slice(i, i + batchSize);

      for (const fee of batch as FeeNeedingReminder[]) {
        try {
          // Check if reminder already sent today
          const alreadySent = await wasReminderSentToday(
            supabase,
            fee.fee_calculation_id,
            rule.trigger_conditions.days_since_sent ? 'no_open' : 'no_selection'
          );

          if (alreadySent) {
            console.log(`⏭️ Reminder already sent today for fee ${fee.fee_calculation_id}`);
            continue;
          }

          // Rate limit: max 3 reminders per fee per day
          const { data: todayReminders } = await supabase
            .from('payment_reminders')
            .select('id')
            .eq('fee_calculation_id', fee.fee_calculation_id)
            .gte('sent_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

          if (todayReminders && todayReminders.length >= 3) {
            console.log(`⚠️ Max 3 reminders per day reached for fee ${fee.fee_calculation_id}`);
            continue;
          }

          // Send reminder email if configured
          if (rule.actions.send_email && rule.actions.email_template) {
            const emailSent = await sendReminderEmail(
              fee.client_email,
              rule.actions.email_template,
              {
                company_name: fee.client_name,
                amount: fee.amount,
                days_since_sent: fee.days_since_sent,
                letter_link: `https://ticovision.vercel.app/letter/${fee.fee_calculation_id}`,
                payment_link_bank: `https://ticovision.vercel.app/payment/bank/${fee.fee_calculation_id}`,
                payment_link_cc_single: `https://ticovision.vercel.app/payment/cc-single/${fee.fee_calculation_id}`,
                payment_link_cc_installments: `https://ticovision.vercel.app/payment/cc-installments/${fee.fee_calculation_id}`,
                payment_link_checks: `https://ticovision.vercel.app/payment/checks/${fee.fee_calculation_id}`,
                include_mistake_button: rule.actions.include_mistake_button || false,
              },
              emailSettings
            );

            if (emailSent) {
              stats.emails_sent++;
              stats.reminders_sent++;

              // Log reminder in payment_reminders table
              const { error: insertError } = await supabase
                .from('payment_reminders')
                .insert({
                  tenant_id: tenantId,
                  client_id: fee.client_id,
                  fee_calculation_id: fee.fee_calculation_id,
                  reminder_type: rule.trigger_conditions.days_since_sent ? 'no_open' : 'no_selection',
                  sent_via: 'email',
                  template_used: rule.actions.email_template,
                  email_opened: false,
                });

              if (insertError) {
                console.error('❌ Error logging reminder:', insertError);
              }

              // Update fee_calculations
              const { error: updateError } = await supabase
                .from('fee_calculations')
                .update({
                  last_reminder_sent_at: new Date().toISOString(),
                  reminder_count: supabase.raw('COALESCE(reminder_count, 0) + 1'),
                })
                .eq('id', fee.fee_calculation_id);

              if (updateError) {
                console.error('❌ Error updating fee reminder count:', updateError);
              }
            } else {
              stats.emails_failed++;
              stats.errors.push(`Failed to send email for fee ${fee.fee_calculation_id}`);
            }
          }

          // Notify admin if configured
          if (rule.actions.notify_admin) {
            const alertSent = await sendAdminAlert(
              supabase,
              tenantId,
              rule.trigger_conditions.days_since_sent ? 'unopened_7d' : 'no_selection_14d',
              [fee.fee_calculation_id],
              emailSettings
            );

            if (alertSent) {
              stats.admin_alerts_sent++;
            }
          }

          // Small delay between emails to respect rate limits (10 emails/second)
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`❌ Error processing fee ${fee.fee_calculation_id}:`, error);
          stats.errors.push(`Error processing fee ${fee.fee_calculation_id}: ${error}`);
        }
      }
    }
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  const startTime = Date.now();

  console.log('🚀 Collection Reminder Engine started');

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

    if (!SENDGRID_API_KEY) {
      console.error('❌ SendGrid API key missing');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SendGrid API key missing',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Initialize stats
    const stats: ProcessingStats = {
      tenants_processed: 0,
      rules_processed: 0,
      fees_matched: 0,
      reminders_sent: 0,
      emails_sent: 0,
      emails_failed: 0,
      admin_alerts_sent: 0,
      errors: [],
    };

    // Fetch all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true);

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch tenants',
          details: tenantsError,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!tenants || tenants.length === 0) {
      console.log('ℹ️ No active tenants found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active tenants to process',
          data: stats,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`✅ Found ${tenants.length} active tenants`);

    // Process each tenant
    for (const tenant of tenants) {
      try {
        await processTenantReminders(supabase, tenant.id, stats);
        stats.tenants_processed++;
      } catch (error) {
        console.error(`❌ Error processing tenant ${tenant.id}:`, error);
        stats.errors.push(`Failed to process tenant ${tenant.name}: ${error}`);
      }
    }

    const executionTime = Date.now() - startTime;

    // Calculate failure rate
    const totalAttempted = stats.emails_sent + stats.emails_failed;
    const failureRate = totalAttempted > 0
      ? (stats.emails_failed / totalAttempted) * 100
      : 0;

    // Send error summary to admin if failure rate > 10%
    if (failureRate > 10 && stats.errors.length > 0) {
      console.warn(`⚠️ High failure rate: ${failureRate.toFixed(2)}%`);
      // Send error summary email - get email settings once
      const emailSettings = await getEmailSettings(supabase);
      for (const tenant of tenants) {
        await sendAdminAlert(
          supabase,
          tenant.id,
          'high_failure_rate',
          [],
          emailSettings
        );
      }
    }

    console.log('\n✅ Collection Reminder Engine completed');
    console.log('📊 Final Stats:', {
      ...stats,
      execution_time_ms: executionTime,
      failure_rate: `${failureRate.toFixed(2)}%`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...stats,
          execution_time_ms: executionTime,
          failure_rate: failureRate,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Fatal error in reminder engine:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Fatal error in reminder engine',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
