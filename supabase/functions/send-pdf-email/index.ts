/**
 * Supabase Edge Function: Send PDF Email
 * Sends a PDF file as attachment via SendGrid
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

interface SendPdfEmailRequest {
  to: string;
  subject: string;
  pdfUrl: string;
  pdfName: string;
  body?: string;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  Deno.env.get('APP_URL'),
].filter(Boolean) as string[];

/**
 * Get CORS headers with validated origin
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
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
 * Fetch PDF and convert to base64
 */
async function fetchPdfAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Convert to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Get email settings from tenant_settings table
 */
async function getEmailSettings(): Promise<{
  sender_email: string;
  sender_name: string;
  reply_to_email: string;
}> {
  const defaults = {
    sender_email: 'tico@franco.co.il',
    sender_name: 'תיקו פרנקו - משרד רואי חשבון',
    reply_to_email: 'sigal@franco.co.il'
  };

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return defaults;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase
      .from('tenant_settings')
      .select('sender_email, sender_name, reply_to_email')
      .single();

    if (error || !data) {
      return defaults;
    }

    return {
      sender_email: data.sender_email || defaults.sender_email,
      sender_name: data.sender_name || defaults.sender_name,
      reply_to_email: data.reply_to_email || defaults.reply_to_email
    };
  } catch {
    return defaults;
  }
}

/**
 * Send email via SendGrid with PDF attachment
 */
async function sendEmailWithPdf(
  to: string,
  subject: string,
  pdfBase64: string,
  pdfName: string,
  bodyText?: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const emailSettings = await getEmailSettings();

  const htmlContent = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; direction: rtl; text-align: right; }
  </style>
</head>
<body>
  <p>שלום,</p>
  <p>${bodyText || 'מצורף המסמך המבוקש.'}</p>
  <p>בברכה,<br/>משרד רואי חשבון פרנקו</p>
</body>
</html>
`;

  const emailData = {
    personalizations: [
      {
        to: [{ email: to }],
        subject: subject,
      },
    ],
    from: {
      email: emailSettings.sender_email,
      name: emailSettings.sender_name,
    },
    reply_to: {
      email: emailSettings.reply_to_email,
      name: 'סיגל נגר',
    },
    content: [
      {
        type: 'text/html',
        value: htmlContent,
      },
    ],
    attachments: [
      {
        content: pdfBase64,
        filename: pdfName,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
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
    throw new Error(`SendGrid error: ${response.status} - ${errorText}`);
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestData: SendPdfEmailRequest = await req.json();
    const { to, subject, pdfUrl, pdfName, body } = requestData;

    // Validate required fields
    if (!to || !to.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'PDF URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-pdf-email] Sending PDF to ${to}`);
    console.log(`[send-pdf-email] PDF URL: ${pdfUrl}`);

    // Fetch PDF and convert to base64
    const pdfBase64 = await fetchPdfAsBase64(pdfUrl);
    console.log(`[send-pdf-email] PDF fetched, size: ${pdfBase64.length} chars (base64)`);

    // Send email
    await sendEmailWithPdf(
      to,
      subject || 'מסמך מ-TICO',
      pdfBase64,
      pdfName || 'document.pdf',
      body
    );

    console.log(`[send-pdf-email] Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-pdf-email] Error:', error);

    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
