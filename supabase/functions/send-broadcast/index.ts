/**
 * Supabase Edge Function: Send Broadcast
 * Sends mass emails to all recipients in a broadcast campaign
 * Processes in batches with rate limiting for SendGrid
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Rate limiting configuration
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1000;

interface SendBroadcastRequest {
  broadcastId: string;
  tenantId: string;
}

interface BroadcastRecipient {
  id: string;
  email: string;
  recipient_name: string | null;
  client_id: string;
  contact_id: string | null;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  Deno.env.get('APP_URL'),
].filter(Boolean) as string[];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send email via SendGrid
 */
async function sendEmail(
  to: string,
  toName: string | null,
  subject: string,
  htmlContent: string,
  fromEmail: string,
  fromName: string,
  replyTo?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to, name: toName || to }],
        }],
        from: { email: fromEmail, name: fromName },
        reply_to: replyTo ? { email: replyTo } : undefined,
        subject: subject,
        content: [{ type: 'text/html', value: htmlContent }],
        tracking_settings: {
          click_tracking: { enable: false },
          open_tracking: { enable: true },
        },
      }),
    });

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('X-Message-Id');
      return { success: true, messageId: messageId || undefined };
    }

    const errorText = await response.text();
    console.error('SendGrid error:', response.status, errorText);
    return { success: false, error: `SendGrid error: ${response.status}` };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Build simple HTML email for broadcast
 */
function buildBroadcastEmailHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; direction: rtl; background-color: #ffffff; font-family: Arial, 'Heebo', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; text-align: right; line-height: 1.6; font-size: 16px; color: #333;">
    ${content.replace(/\n/g, '<br>')}
  </div>
</body>
</html>`;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { broadcastId, tenantId }: SendBroadcastRequest = await req.json();

    if (!broadcastId || !tenantId) {
      return new Response(JSON.stringify({ error: 'Missing broadcastId or tenantId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key for full access
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    // Get broadcast details
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .eq('tenant_id', tenantId)
      .single();

    if (broadcastError || !broadcast) {
      console.error('Broadcast not found:', broadcastError);
      return new Response(JSON.stringify({ error: 'Broadcast not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if broadcast can be sent
    if (broadcast.status !== 'sending') {
      return new Response(JSON.stringify({ error: 'Broadcast is not in sending status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tenant email settings
    const { data: tenantSettings } = await supabase
      .from('tenant_settings')
      .select('sender_email, sender_name, reply_to_email')
      .eq('tenant_id', tenantId)
      .single();

    const fromEmail = tenantSettings?.sender_email || 'sigal@franco.co.il';
    const fromName = tenantSettings?.sender_name || 'פרנקו ושות';
    const replyTo = tenantSettings?.reply_to_email || fromEmail;

    // Get pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('broadcast_recipients')
      .select('id, email, recipient_name, client_id, contact_id')
      .eq('broadcast_id', broadcastId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      // No recipients to process, mark as completed
      await supabase
        .from('broadcasts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', broadcastId);

      return new Response(JSON.stringify({ success: true, message: 'No recipients to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build email content
    const htmlContent = buildBroadcastEmailHtml(broadcast.custom_content_html || '');

    // Process in batches
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Check if broadcast was cancelled
      const { data: currentStatus } = await supabase
        .from('broadcasts')
        .select('status')
        .eq('id', broadcastId)
        .single();

      if (currentStatus?.status === 'cancelled') {
        console.log('Broadcast cancelled, stopping processing');
        break;
      }

      // Process batch
      const results = await Promise.all(
        batch.map(async (recipient) => {
          const result = await sendEmail(
            recipient.email,
            recipient.recipient_name,
            broadcast.subject,
            htmlContent,
            fromEmail,
            fromName,
            replyTo
          );

          // Update recipient status
          const updateData: Record<string, unknown> = {
            status: result.success ? 'sent' : 'failed',
            sent_at: result.success ? new Date().toISOString() : null,
            error_message: result.error || null,
          };

          await supabase
            .from('broadcast_recipients')
            .update(updateData)
            .eq('id', recipient.id);

          return result;
        })
      );

      // Count results
      const batchSent = results.filter(r => r.success).length;
      const batchFailed = results.filter(r => !r.success).length;
      totalSent += batchSent;
      totalFailed += batchFailed;

      // Update broadcast stats
      await supabase
        .from('broadcasts')
        .update({
          total_emails_sent: broadcast.total_emails_sent + totalSent,
          total_emails_failed: broadcast.total_emails_failed + totalFailed,
        })
        .eq('id', broadcastId);

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: sent ${batchSent}, failed ${batchFailed}`);

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    // Mark broadcast as completed
    const finalStatus = totalFailed === recipients.length ? 'failed' : 'completed';
    await supabase
      .from('broadcasts')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        total_emails_sent: totalSent,
        total_emails_failed: totalFailed,
      })
      .eq('id', broadcastId);

    console.log(`Broadcast ${broadcastId} completed: sent ${totalSent}, failed ${totalFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalSent,
        totalFailed,
        status: finalStatus,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Broadcast error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
