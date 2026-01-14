/**
 * Supabase Edge Function: Capital Declaration Weekly Report
 * Runs every Sunday via pg_cron to send summary report to manager
 *
 * Endpoint: POST /functions/v1/capital-declaration-weekly-report
 * Authentication: Service role key (cron job)
 * Schedule: Sundays at 7:00 AM UTC (9:00 AM Israel)
 *
 * Process:
 * 1. Fetch all active tenants
 * 2. For each tenant:
 *    - Get reminder settings (weekly_report_email)
 *    - Get status counts
 *    - Send summary email
 *    - Trigger banner flag
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

// Hebrew status labels
const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  sent: 'נשלח',
  in_progress: 'הלקוח התחיל',
  waiting_documents: 'ממתין למסמכים',
  documents_received: 'מסמכים התקבלו',
  reviewing: 'בבדיקה',
  in_preparation: 'בהכנה',
  pending_approval: 'ממתין לאישור',
  waiting: 'ממתין',
};

interface StatusCount {
  status: string;
  count: number;
}

interface ReminderSettings {
  enable_weekly_report: boolean;
  weekly_report_email: string | null;
}

interface ProcessingStats {
  tenants_processed: number;
  reports_sent: number;
  banners_triggered: number;
  errors: string[];
}

/**
 * Get today's date formatted as DD/MM/YYYY
 */
function getTodayFormatted(): string {
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Build the weekly report email HTML
 */
function buildWeeklyReportHtml(statusCounts: StatusCount[], dashboardUrl: string): string {
  const today = getTodayFormatted();
  const totalOpen = statusCounts.reduce((sum, s) => sum + Number(s.count), 0);

  // Build status rows - RTL order: count on left, label on right
  let statusRows = '';
  for (const sc of statusCounts) {
    const label = STATUS_LABELS[sc.status] || sc.status;
    statusRows += `
      <tr dir="rtl">
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 15px; font-weight: 600; color: #111827; text-align: center; width: 80px;">${sc.count}</td>
        <td style="padding: 12px 15px; border-bottom: 1px solid #e5e7eb; font-size: 15px; color: #374151; text-align: right;">${label}</td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>דו"ח שבועי - הצהרות הון פתוחות</title>
</head>
<body dir="rtl" style="margin: 0; padding: 0; font-family: 'Heebo', 'Assistant', Arial, sans-serif; background-color: #f9fafb; direction: rtl;">
  <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; direction: rtl;">
    <!-- Header -->
    <tr>
      <td style="background-color: #1e3a8a; padding: 20px; text-align: center;">
        <div style="font-size: 22px; font-weight: 700; color: #ffffff;">
          פרנקו ושות' - רואי חשבון
        </div>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td dir="rtl" style="padding: 30px; direction: rtl; text-align: right;">
        <!-- Date -->
        <div style="font-size: 14px; color: #6b7280; text-align: right; margin-bottom: 20px;">
          ${today}
        </div>

        <!-- Title -->
        <div style="font-size: 22px; font-weight: 700; color: #1e3a8a; text-align: right; margin-bottom: 20px;">
          דו"ח שבועי - הצהרות הון פתוחות
        </div>

        <!-- IMPORTANT Alert Box - Highly Emphasized -->
        <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; border-right: 6px solid #dc2626; margin-bottom: 25px; direction: rtl;">
          <tr>
            <td style="padding: 20px;">
              <div style="font-size: 20px; font-weight: 800; color: #dc2626; text-align: right; margin-bottom: 10px;">
                ⚠️ תזכורת חשובה מאוד!
              </div>
              <div style="font-size: 18px; font-weight: 700; color: #991b1b; text-align: right; line-height: 1.6;">
                נא למשוך ממס הכנסה הצהרות הון פתוחות ולעדכן במערכת
              </div>
              <div style="font-size: 14px; color: #7f1d1d; text-align: right; margin-top: 8px;">
                יש לבדוק במערכת מס הכנסה אם יש הצהרות חדשות שטרם נקלטו
              </div>
            </td>
          </tr>
        </table>

        <!-- Summary -->
        <div style="font-size: 18px; font-weight: 600; color: #111827; text-align: right; margin-bottom: 15px;">
          סה"כ הצהרות פתוחות: ${totalOpen}
        </div>

        <!-- Status Table - RTL: כמות on left, סטטוס on right -->
        <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 25px; direction: rtl;">
          <thead>
            <tr dir="rtl" style="background-color: #f3f4f6;">
              <th style="padding: 12px 15px; font-size: 14px; font-weight: 600; color: #374151; text-align: center; border-bottom: 2px solid #e5e7eb; width: 80px;">כמות</th>
              <th style="padding: 12px 15px; font-size: 14px; font-weight: 600; color: #374151; text-align: right; border-bottom: 2px solid #e5e7eb;">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            ${statusRows}
          </tbody>
        </table>

        <!-- CTA Button -->
        <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="direction: rtl;">
          <tr>
            <td dir="rtl" style="text-align: center; padding: 20px 0;">
              <a href="${dashboardUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #395BF7 0%, #2563eb 100%); color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
                לניהול הצהרות הון
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td dir="rtl" style="background-color: #f3f4f6; padding: 15px; text-align: center; direction: rtl;">
        <div style="font-size: 12px; color: #6b7280;">
          דו"ח זה נשלח אוטומטית כל יום ראשון ממערכת תיקו פרנקו
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send weekly report email via SendGrid
 * Supports multiple recipients (comma-separated)
 */
async function sendWeeklyReportEmail(
  toEmails: string,
  statusCounts: StatusCount[],
  dashboardUrl: string
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }

    // Parse comma-separated emails into array
    const recipients = toEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .map(email => ({ email }));

    if (recipients.length === 0) {
      console.error('No valid email recipients');
      return false;
    }

    const htmlContent = buildWeeklyReportHtml(statusCounts, dashboardUrl);
    const today = getTodayFormatted();
    const totalOpen = statusCounts.reduce((sum, s) => sum + Number(s.count), 0);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: recipients,
          subject: `דו"ח שבועי - ${totalOpen} הצהרות הון פתוחות (${today})`,
        }],
        from: {
          email: 'tico@franco.co.il',
          name: 'תיקו פרנקו - משרד רואי חשבון',
        },
        reply_to: {
          email: 'sigal@franco.co.il',
          name: 'סיגל נגור',
        },
        content: [{
          type: 'text/html',
          value: htmlContent,
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SendGrid error: ${response.status} - ${errorText}`);
      return false;
    }

    console.log(`Weekly report sent to ${recipients.map(r => r.email).join(', ')}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Process weekly report for a single tenant
 */
async function processTenantWeeklyReport(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  settings: ReminderSettings,
  stats: ProcessingStats
): Promise<void> {
  // Check if weekly report is enabled and email is set
  if (!settings.enable_weekly_report || !settings.weekly_report_email) {
    console.log(`Weekly report disabled or no email for tenant ${tenantId}`);
    return;
  }

  console.log(`Processing weekly report for tenant ${tenantId}`);

  // Get status counts
  const { data: statusCounts, error: countsError } = await supabase.rpc(
    'get_cd_status_counts',
    { p_tenant_id: tenantId }
  );

  if (countsError) {
    stats.errors.push(`Status counts for ${tenantId}: ${countsError.message}`);
    console.error(`Error getting status counts for tenant ${tenantId}:`, countsError);
    return;
  }

  // Skip if no open declarations
  if (!statusCounts || statusCounts.length === 0) {
    console.log(`No open declarations for tenant ${tenantId}`);
    // Still trigger banner to remind to check for new ones
  }

  const dashboardUrl = 'https://tico.franco.co.il/capital-declarations';

  // Send email
  const emailSent = await sendWeeklyReportEmail(
    settings.weekly_report_email,
    statusCounts || [],
    dashboardUrl
  );

  if (emailSent) {
    stats.reports_sent++;
  } else {
    stats.errors.push(`Failed to send report for tenant ${tenantId}`);
  }

  // Trigger banner
  const { error: bannerError } = await supabase
    .from('capital_declaration_reminder_settings')
    .update({
      show_weekly_banner: true,
      banner_triggered_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId);

  if (bannerError) {
    stats.errors.push(`Banner trigger for ${tenantId}: ${bannerError.message}`);
  } else {
    stats.banners_triggered++;
    console.log(`Banner triggered for tenant ${tenantId}`);
  }
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  console.log('=== Capital Declaration Weekly Report Started ===');

  const stats: ProcessingStats = {
    tenants_processed: 0,
    reports_sent: 0,
    banners_triggered: 0,
    errors: [],
  };

  try {
    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get all active tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id')
      .eq('status', 'active');

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      console.log('No active tenants found');
      return new Response(JSON.stringify({ message: 'No active tenants', stats }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${tenants.length} active tenants`);

    // Process each tenant
    for (const tenant of tenants) {
      try {
        stats.tenants_processed++;

        // Get or create reminder settings
        const { data: settings, error: settingsError } = await supabase.rpc(
          'get_or_create_cd_reminder_settings',
          { p_tenant_id: tenant.id }
        );

        if (settingsError) {
          stats.errors.push(`Settings for ${tenant.id}: ${settingsError.message}`);
          continue;
        }

        await processTenantWeeklyReport(supabase, tenant.id, settings as ReminderSettings, stats);
      } catch (err) {
        stats.errors.push(`Tenant ${tenant.id}: ${err}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log('=== Capital Declaration Weekly Report Complete ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Stats: ${JSON.stringify(stats)}`);

    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      stats,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fatal error:', error);
    stats.errors.push(`Fatal: ${error}`);

    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      stats,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
