/**
 * Supabase Edge Function: Capital Declaration Reminder Engine
 * Runs daily via pg_cron to send automated reminders to clients
 *
 * Endpoint: POST /functions/v1/capital-declaration-reminder-engine
 * Authentication: Service role key (cron job)
 * Schedule: Daily at 7:00 AM UTC (9:00 AM Israel winter, 10:00 AM summer)
 *
 * Process:
 * 1. Fetch all active tenants
 * 2. For each tenant:
 *    - Get reminder settings
 *    - Get declarations needing reminders
 *    - Send reminder emails
 *    - Update reminder counts
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

interface DeclarationNeedingReminder {
  declaration_id: string;
  contact_name: string;
  contact_email: string;
  tax_year: number;
  declaration_date: string;
  portal_link: string;
  reminder_count: number;
  last_reminder_sent_at: string | null;
}

interface ReminderSettings {
  enable_client_reminders: boolean;
  client_reminder_frequency_days: number;
}

interface ProcessingStats {
  tenants_processed: number;
  declarations_found: number;
  reminders_sent: number;
  emails_sent: number;
  emails_failed: number;
  errors: string[];
}

/**
 * Format date as DD/MM/YYYY for Hebrew display
 */
function formatDateHebrew(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
 * Build the reminder email HTML
 */
function buildReminderEmailHtml(
  contactName: string,
  taxYear: number,
  declarationDate: string,
  portalLink: string,
  reminderCount: number
): string {
  const formattedDate = formatDateHebrew(declarationDate);
  const letterDate = getTodayFormatted();
  const reminderNumber = reminderCount + 1;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>תזכורת - הצהרת הון ${taxYear}</title>
</head>
<body dir="rtl" style="margin: 0; padding: 0; font-family: 'Heebo', 'Assistant', Arial, sans-serif; background-color: #f9fafb; direction: rtl;">
  <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; direction: rtl;">
    <!-- Header -->
    <tr>
      <td dir="rtl" style="background-color: #1e3a8a; padding: 20px; text-align: center;">
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
          תל אביב | ${letterDate}
        </div>

        <!-- Subject -->
        <div style="font-size: 22px; font-weight: 700; color: #dc2626; text-align: right; border-bottom: 2px solid #dc2626; padding-bottom: 15px; margin-bottom: 20px;">
          תזכורת אוטומטית מספר ${reminderNumber} - הצהרת הון לשנת ${taxYear}
        </div>

        <!-- Greeting -->
        <div style="font-size: 16px; color: #111827; text-align: right; margin-bottom: 15px;">
          ${contactName} היקר/ה,
        </div>

        <!-- Main message -->
        <div style="font-size: 15px; color: #374151; text-align: right; line-height: 1.8; margin-bottom: 20px;">
          זוהי תזכורת אוטומטית בנושא <strong>הצהרת ההון ליום ${formattedDate}</strong>.<br><br>
          לפי רישומינו, טרם התקבלו מלוא המסמכים הנדרשים לצורך הכנת ההצהרה.
        </div>

        <!-- Urgency Box -->
        <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; border-right: 4px solid #dc2626; margin-bottom: 25px; direction: rtl;">
          <tr>
            <td dir="rtl" style="padding: 18px; direction: rtl;">
              <div style="font-size: 15px; font-weight: 700; color: #dc2626; text-align: right; margin-bottom: 8px;">
                חשוב מאוד!
              </div>
              <div style="font-size: 14px; color: #7f1d1d; text-align: right; line-height: 1.6;">
                איחור בהגשת הצהרת הון עלול לגרור קנסות מרשות המיסים.<br>
                נא לדאוג להעלאת המסמכים בהקדם האפשרי.
              </div>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <table dir="rtl" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; margin-bottom: 25px; direction: rtl;">
          <tr>
            <td dir="rtl" style="padding: 25px; text-align: center; direction: rtl;">
              <div style="font-size: 16px; color: #1e40af; text-align: center; margin-bottom: 15px;">
                <strong>הפורטל המאובטח פתוח ומחכה לך</strong>
              </div>
              <a href="${portalLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #395BF7 0%, #2563eb 100%); color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
                לחץ כאן להעלאת המסמכים
              </a>
            </td>
          </tr>
        </table>

        <!-- Help section -->
        <div style="font-size: 14px; color: #374151; text-align: right; line-height: 1.7; margin-bottom: 20px;">
          <strong>צריך עזרה?</strong><br>
          אם יש בעיה בהשגת המסמכים או שאתה לא בטוח מה נדרש - פנה אלינו ונעזור.
        </div>

        <!-- Signature -->
        <div style="font-size: 15px; color: #111827; text-align: right; line-height: 1.5; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          בתודה מראש ובברכה,<br><br>
          <strong>תיקו פרנקו</strong><br>
          רואה חשבון<br>
          תיקו פרנקו ושות' | רואי חשבון
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td dir="rtl" style="background-color: #f3f4f6; padding: 15px; text-align: center; direction: rtl;">
        <div style="font-size: 12px; color: #6b7280;">
          מייל זה נשלח אוטומטית ממערכת תיקו פרנקו
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send reminder email via SendGrid
 */
async function sendReminderEmail(
  to: string,
  contactName: string,
  taxYear: number,
  declarationDate: string,
  portalLink: string,
  reminderCount: number
): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }

    const htmlContent = buildReminderEmailHtml(
      contactName,
      taxYear,
      declarationDate,
      portalLink,
      reminderCount
    );

    const reminderNumber = reminderCount + 1;
    const subject = `תזכורת ${reminderNumber} - הצהרת הון לשנת ${taxYear}`;

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
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

    console.log(`Email sent to ${to} for tax year ${taxYear}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Process reminders for a single tenant
 */
async function processTenantReminders(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  settings: ReminderSettings,
  stats: ProcessingStats
): Promise<void> {
  console.log(`Processing tenant ${tenantId} with frequency ${settings.client_reminder_frequency_days} days`);

  // Get declarations needing reminders
  const { data: declarations, error } = await supabase.rpc(
    'get_declarations_needing_reminders',
    {
      p_tenant_id: tenantId,
      p_frequency_days: settings.client_reminder_frequency_days,
    }
  );

  if (error) {
    stats.errors.push(`Tenant ${tenantId}: ${error.message}`);
    console.error(`Error getting declarations for tenant ${tenantId}:`, error);
    return;
  }

  if (!declarations || declarations.length === 0) {
    console.log(`No declarations needing reminders for tenant ${tenantId}`);
    return;
  }

  stats.declarations_found += declarations.length;
  console.log(`Found ${declarations.length} declarations needing reminders`);

  // Process each declaration (with rate limiting)
  for (const decl of declarations as DeclarationNeedingReminder[]) {
    try {
      // Send email
      const emailSent = await sendReminderEmail(
        decl.contact_email,
        decl.contact_name,
        decl.tax_year,
        decl.declaration_date,
        decl.portal_link,
        decl.reminder_count
      );

      if (emailSent) {
        stats.emails_sent++;

        // Update declaration reminder count
        const newReminderCount = decl.reminder_count + 1;
        const frequencyDays = settings.client_reminder_frequency_days;

        const { error: updateError } = await supabase
          .from('capital_declarations')
          .update({
            reminder_count: newReminderCount,
            last_reminder_sent_at: new Date().toISOString(),
            next_reminder_due_at: new Date(Date.now() + frequencyDays * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', decl.declaration_id);

        if (updateError) {
          stats.errors.push(`Update declaration ${decl.declaration_id}: ${updateError.message}`);
        }

        // Log reminder
        const { error: logError } = await supabase
          .from('capital_declaration_reminders')
          .insert({
            tenant_id: tenantId,
            declaration_id: decl.declaration_id,
            reminder_type: 'client_auto',
            reminder_sequence: newReminderCount,
            sent_via: 'email',
            sent_to_email: decl.contact_email,
          });

        if (logError) {
          stats.errors.push(`Log reminder ${decl.declaration_id}: ${logError.message}`);
        }

        stats.reminders_sent++;
      } else {
        stats.emails_failed++;
      }

      // Rate limiting: 100ms delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      stats.errors.push(`Declaration ${decl.declaration_id}: ${err}`);
    }
  }
}

/**
 * Main handler
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Missing environment variables' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  console.log('=== Capital Declaration Reminder Engine Started ===');

  const stats: ProcessingStats = {
    tenants_processed: 0,
    declarations_found: 0,
    reminders_sent: 0,
    emails_sent: 0,
    emails_failed: 0,
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

        // Check if reminders are enabled
        if (!settings?.enable_client_reminders) {
          console.log(`Client reminders disabled for tenant ${tenant.id}`);
          continue;
        }

        await processTenantReminders(supabase, tenant.id, settings as ReminderSettings, stats);
      } catch (err) {
        stats.errors.push(`Tenant ${tenant.id}: ${err}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log('=== Capital Declaration Reminder Engine Complete ===');
    console.log(`Duration: ${duration}ms`);
    console.log(`Stats: ${JSON.stringify(stats)}`);

    return new Response(JSON.stringify({
      success: true,
      duration_ms: duration,
      stats,
      sent: stats.emails_sent,
      skipped: stats.declarations_found - stats.emails_sent,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fatal error:', error);
    stats.errors.push(`Fatal: ${error}`);

    return new Response(JSON.stringify({
      success: false,
      error: String(error),
      stats,
      sent: stats.emails_sent,
      skipped: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
