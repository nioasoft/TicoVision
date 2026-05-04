/**
 * Edge Function: Send Batch Reminders
 * Re-sends the original fee letter to pending clients as a reminder.
 *
 * POST /functions/v1/send-batch-reminders
 * Body: { client_ids?: string[], tax_year: number, dry_run?: boolean }
 * Auth: Service role key or JWT
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!;

const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';

interface Stats {
  total_pending: number;
  sent: number;
  failed: number;
  skipped_no_letter: number;
  skipped_no_email: number;
  skipped_already_reminded: number;
  errors: string[];
  details: Array<{ tax_id: string; company_name: string; status: string; emails?: string[] }>;
}

// ── Reminder HTML transformation (mirrors src/lib/letter-reminder.ts) ──

function buildReminderHtml(originalHtml: string, today: Date = new Date()): string {
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const todayStr = `${dd}/${mm}/${yyyy}`;

  let result = originalHtml.replace(
    /(תל אביב\s*\|\s*)\d{1,2}\/\d{1,2}\/\d{4}/g,
    `$1${todayStr}`
  );

  const reminderBannerRow = `<tr><td style="padding-top: 16px;"><div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 22px; font-weight: 700; color: #dc2626; text-align: right; padding: 10px 14px; border: 2px solid #dc2626; background-color: #fef2f2; border-radius: 4px;">תזכורת — הואלו נא לטפל בהקדם</div></td></tr>`;

  const subjectIdx = result.indexOf('הנדון:');
  if (subjectIdx > -1) {
    const trIdx = result.lastIndexOf('<tr', subjectIdx);
    if (trIdx > -1) {
      return result.slice(0, trIdx) + reminderBannerRow + result.slice(trIdx);
    }
  }

  const fallbackBanner = `<div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; color: #dc2626; text-align: right; padding: 10px 14px; margin: 12px; border: 2px solid #dc2626; background-color: #fef2f2;">תזכורת — הואלו נא לטפל בהקדם</div>`;
  const bodyMatch = result.match(/<body[^>]*>/i);
  if (bodyMatch && bodyMatch.index !== undefined) {
    const insertAt = bodyMatch.index + bodyMatch[0].length;
    return result.slice(0, insertAt) + fallbackBanner + result.slice(insertAt);
  }
  return fallbackBanner + result;
}

// ── Image loading (same as send-letter) ──

async function fetchImageBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return '';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return '';
  }
}

async function loadBrandImages(): Promise<Record<string, string>> {
  const baseUrl = Deno.env.get('APP_URL') || 'https://ticovision.vercel.app';
  const imageNames = [
    'tico_logo_240.png', 'Tico_logo_png_new.png', 'franco-logo-hires.png',
    'Tico_franco_co.png', 'tagline.png', 'bullet-star.png',
    'Bullet_star_blue.png', 'Bullet_star_darkred.png', 'tico_signature.png',
    'icon-star.png', 'icon-building.png', 'icon-phone.png', 'icon-email.png',
  ];

  const results = await Promise.all(
    imageNames.map((name) => fetchImageBase64(`${baseUrl}/brand/${name}`))
  );

  return {
    tico_logo: results[0],
    tico_logo_new: results[1],
    franco_logo: results[2],
    franco_logo_new: results[3],
    tagline: results[4],
    bullet_star: results[5],
    bullet_star_blue: results[6],
    bullet_star_darkred: results[7],
    tico_signature: results[8],
    icon_star: results[9],
    icon_building: results[10],
    icon_phone: results[11],
    icon_email: results[12],
  };
}

function buildAttachments(images: Record<string, string>) {
  return [
    { content: images.tico_logo, filename: 'tico_logo.png', type: 'image/png', disposition: 'inline', content_id: 'tico_logo' },
    { content: images.tico_logo_new, filename: 'tico_logo_new.png', type: 'image/png', disposition: 'inline', content_id: 'tico_logo_new' },
    { content: images.franco_logo, filename: 'franco-logo-hires.png', type: 'image/png', disposition: 'inline', content_id: 'franco_logo' },
    { content: images.franco_logo_new, filename: 'franco_logo_new.png', type: 'image/png', disposition: 'inline', content_id: 'franco_logo_new' },
    { content: images.tagline, filename: 'tagline.png', type: 'image/png', disposition: 'inline', content_id: 'tagline' },
    { content: images.bullet_star, filename: 'bullet-star.png', type: 'image/png', disposition: 'inline', content_id: 'bullet_star' },
    { content: images.bullet_star_blue, filename: 'Bullet_star_blue.png', type: 'image/png', disposition: 'inline', content_id: 'bullet_star_blue' },
    { content: images.bullet_star_darkred, filename: 'Bullet_star_darkred.png', type: 'image/png', disposition: 'inline', content_id: 'bullet_star_darkred' },
    { content: images.tico_signature, filename: 'tico_signature.png', type: 'image/png', disposition: 'inline', content_id: 'tico_signature' },
    { content: images.icon_star, filename: 'icon-star.png', type: 'image/png', disposition: 'inline', content_id: 'icon_star' },
    { content: images.icon_building, filename: 'icon-building.png', type: 'image/png', disposition: 'inline', content_id: 'icon_building' },
    { content: images.icon_phone, filename: 'icon-phone.png', type: 'image/png', disposition: 'inline', content_id: 'icon_phone' },
    { content: images.icon_email, filename: 'icon-email.png', type: 'image/png', disposition: 'inline', content_id: 'icon_email' },
  ].filter((a) => a.content); // Skip images that failed to load
}

// ── Email settings ──

async function getEmailSettings(supabase: ReturnType<typeof createClient>) {
  const defaults = {
    sender_email: 'tico@franco.co.il',
    sender_name: 'תיקו פרנקו - משרד רואי חשבון',
    reply_to_email: 'sigal@franco.co.il',
  };

  const { data } = await supabase
    .from('tenant_settings')
    .select('sender_email, sender_name, reply_to_email')
    .single();

  return {
    sender_email: data?.sender_email || defaults.sender_email,
    sender_name: data?.sender_name || defaults.sender_name,
    reply_to_email: data?.reply_to_email || defaults.reply_to_email,
  };
}

// ── Main handler ──

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  try {
    const { client_ids, tax_year, dry_run = false } = await req.json();

    if (!tax_year) {
      return new Response(JSON.stringify({ error: 'tax_year is required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const stats: Stats = {
      total_pending: 0,
      sent: 0,
      failed: 0,
      skipped_no_letter: 0,
      skipped_no_email: 0,
      skipped_already_reminded: 0,
      errors: [],
      details: [],
    };

    console.log(`🚀 Batch reminders: year=${tax_year}, dry_run=${dry_run}, client_ids=${client_ids?.length ?? 'all'}`);

    // 1. Fetch pending fee calculations
    let query = supabase
      .from('fee_calculations')
      .select('id, client_id, total_amount, reminder_count')
      .eq('tenant_id', TIKO_TENANT_ID)
      .eq('year', tax_year)
      .eq('status', 'sent');

    if (client_ids?.length) {
      query = query.in('client_id', client_ids);
    }

    const { data: fees, error: feesError } = await query;
    if (feesError) throw new Error(`Failed to fetch fees: ${feesError.message}`);

    stats.total_pending = fees?.length ?? 0;
    console.log(`📊 Found ${stats.total_pending} pending fees`);

    if (!fees?.length) {
      return new Response(JSON.stringify({ success: true, data: stats }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 2. Fetch generated letters for these fees
    const feeIds = fees.map((f) => f.id);
    const { data: letters } = await supabase
      .from('generated_letters')
      .select('id, fee_calculation_id, client_id, generated_content_html, subject, recipient_emails')
      .in('fee_calculation_id', feeIds)
      .eq('is_latest', true)
      .not('sent_at', 'is', null);

    const letterByFeeId = new Map(
      (letters ?? []).map((l) => [l.fee_calculation_id, l])
    );

    // 3. Fetch client info with contacts
    const clientIds = fees.map((f) => f.client_id);
    const { data: clients } = await supabase
      .from('clients')
      .select('id, tax_id, company_name, contact_email')
      .in('id', clientIds);

    const clientMap = new Map((clients ?? []).map((c) => [c.id, c]));

    // Fetch all contact assignments for these clients
    const { data: contactAssignments } = await supabase
      .from('client_contact_assignments')
      .select('client_id, contact_id, tenant_contacts(email)')
      .in('client_id', clientIds)
      .eq('is_active', true);

    // Build email lists per client
    const clientEmails = new Map<string, string[]>();
    for (const client of clients ?? []) {
      const emails = new Set<string>();
      if (client.contact_email) emails.add(client.contact_email);
      clientEmails.set(client.id, []);
    }

    for (const ca of contactAssignments ?? []) {
      const email = (ca as Record<string, unknown>).tenant_contacts as { email?: string } | null;
      if (email?.email) {
        const existing = clientEmails.get(ca.client_id) ?? [];
        existing.push(email.email);
        clientEmails.set(ca.client_id, existing);
      }
    }

    // Add primary contact_email if not already in list
    for (const client of clients ?? []) {
      if (client.contact_email) {
        const existing = clientEmails.get(client.id) ?? [];
        if (!existing.includes(client.contact_email)) {
          existing.unshift(client.contact_email);
          clientEmails.set(client.id, existing);
        }
      }
    }

    // 4. Check today's reminders (duplicate prevention)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayReminders } = await supabase
      .from('payment_reminders')
      .select('fee_calculation_id')
      .eq('tenant_id', TIKO_TENANT_ID)
      .eq('reminder_type', 'manual')
      .gte('sent_at', today.toISOString());

    const alreadyRemindedToday = new Set(
      (todayReminders ?? []).map((r) => r.fee_calculation_id)
    );

    // 5. Load images + email settings (once)
    let images: Record<string, string> = {};
    let emailSettings = { sender_email: '', sender_name: '', reply_to_email: '' };
    let attachments: ReturnType<typeof buildAttachments> = [];

    if (!dry_run) {
      [images, emailSettings] = await Promise.all([
        loadBrandImages(),
        getEmailSettings(supabase),
      ]);
      attachments = buildAttachments(images);
      console.log(`📧 Loaded ${attachments.length} brand images, from: ${emailSettings.sender_email}`);
    }

    // 6. Process each fee
    for (const fee of fees) {
      const client = clientMap.get(fee.client_id);
      if (!client) continue;

      const taxId = client.tax_id ?? '';
      const companyName = client.company_name ?? '';

      // Check duplicate
      if (alreadyRemindedToday.has(fee.id)) {
        stats.skipped_already_reminded++;
        stats.details.push({ tax_id: taxId, company_name: companyName, status: 'skipped_already_reminded' });
        continue;
      }

      // Get letter
      const letter = letterByFeeId.get(fee.id);
      if (!letter?.generated_content_html) {
        stats.skipped_no_letter++;
        stats.details.push({ tax_id: taxId, company_name: companyName, status: 'skipped_no_letter' });
        continue;
      }

      // Get emails
      const emails = clientEmails.get(fee.client_id) ?? [];
      if (!emails.length) {
        stats.skipped_no_email++;
        stats.details.push({ tax_id: taxId, company_name: companyName, status: 'skipped_no_email' });
        continue;
      }

      if (dry_run) {
        stats.sent++;
        stats.details.push({ tax_id: taxId, company_name: companyName, status: 'would_send', emails });
        continue;
      }

      // Send email
      try {
        const subject = `תזכורת: ${letter.subject || 'מכתב שכר טרחה'}`;

        const emailData = {
          personalizations: emails.map((email) => ({ to: [{ email }], subject })),
          from: { email: emailSettings.sender_email, name: emailSettings.sender_name },
          reply_to: { email: emailSettings.reply_to_email, name: 'סיגל נגר' },
          content: [{ type: 'text/html', value: buildReminderHtml(letter.generated_content_html) }],
          attachments,
          tracking_settings: { click_tracking: { enable: false } },
        };

        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SendGrid ${response.status}: ${errorText}`);
        }

        // Log reminder
        await supabase.from('payment_reminders').insert({
          tenant_id: TIKO_TENANT_ID,
          client_id: fee.client_id,
          fee_calculation_id: fee.id,
          reminder_type: 'manual',
          reminder_sequence: (fee.reminder_count ?? 0) + 1,
          sent_via: 'email',
        });

        // Update fee reminder count
        await supabase
          .from('fee_calculations')
          .update({
            reminder_count: (fee.reminder_count ?? 0) + 1,
            last_reminder_sent_at: new Date().toISOString(),
          })
          .eq('id', fee.id);

        stats.sent++;
        stats.details.push({ tax_id: taxId, company_name: companyName, status: 'sent', emails });

        // Rate limit: 100ms between emails
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        stats.failed++;
        const errMsg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`[${taxId}] ${companyName}: ${errMsg}`);
        stats.details.push({ tax_id: taxId, company_name: companyName, status: 'failed' });
      }
    }

    console.log(`\n✅ Done: ${stats.sent} sent, ${stats.failed} failed, ${stats.skipped_no_letter} no letter, ${stats.skipped_no_email} no email, ${stats.skipped_already_reminded} already reminded`);

    return new Response(JSON.stringify({ success: true, data: stats }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('❌ Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
