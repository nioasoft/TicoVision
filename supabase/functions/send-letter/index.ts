/**
 * Supabase Edge Function: Send Letter via Email
 * Sends formatted HTML letters with embedded CID images using SendGrid
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface SendLetterRequest {
  recipientEmail: string;
  recipientName: string;
  templateType: string;
  variables: Record<string, any>;
  clientId?: string;
  feeCalculationId?: string;
}

interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
}

const corsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Fetch HTML template from deployed app (Vercel)
 * Templates are served from public/templates/ directory
 */
async function fetchTemplate(path: string): Promise<string> {
  const baseUrl = Deno.env.get('APP_URL') || 'https://ticovision.vercel.app';
  const response = await fetch(`${baseUrl}/templates/${path}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${path} from ${baseUrl}/templates/${path}`);
  }
  return await response.text();
}

/**
 * Replace variables in HTML
 */
function replaceVariables(html: string, variables: Record<string, any>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value));
  }
  return result;
}

/**
 * Build full letter HTML from components
 */
async function buildLetterHtml(templateType: string, variables: Record<string, any>): Promise<string> {
  // Fetch components
  const header = await fetchTemplate('components/header.html');
  const footer = await fetchTemplate('components/footer.html');
  const paymentSection = await fetchTemplate('components/payment-section.html');

  // Get body based on template type
  const bodyFileMap: Record<string, string> = {
    'external_index_only': 'annual-fee.html',
    'external_real_change': 'annual-fee-real-change.html',
    'external_as_agreed': 'annual-fee-as-agreed.html',
    'internal_audit_index': 'internal-audit-index.html',
    'internal_audit_real': 'internal-audit-real-change.html',
    'internal_audit_agreed': 'internal-audit-as-agreed.html',
    'retainer_index': 'retainer-index.html',
    'retainer_real': 'retainer-real-change.html',
    'internal_bookkeeping_index': 'bookkeeping-index.html',
    'internal_bookkeeping_real': 'bookkeeping-real-change.html',
    'internal_bookkeeping_agreed': 'bookkeeping-as-agreed.html'
  };

  const bodyFile = bodyFileMap[templateType] || 'annual-fee.html';
  const body = await fetchTemplate(`bodies/${bodyFile}`);

  // Build full HTML
  const fullHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מכתב - ${variables.company_name || ''}</title>
    <link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&family=Assistant:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; direction: rtl; background-color: #ffffff; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="800" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; width: 100%; background-color: #ffffff;">
                    ${header}
                    ${body}
                    ${paymentSection}
                    ${footer}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

  return replaceVariables(fullHtml, variables);
}

/**
 * Fetch image as base64
 */
async function fetchImageBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Send email via SendGrid
 */
async function sendEmail(
  recipientEmail: string,
  subject: string,
  htmlContent: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  // Fetch images as base64 from deployed app
  // These images are served from the Vercel deployment's public folder
  const baseUrl = Deno.env.get('APP_URL') || 'https://ticovision.vercel.app';
  const [ticoLogoOld, ticoLogoNew, francoLogoOld, francoLogoNew, tagline, bulletStar, bulletStarBlue] = await Promise.all([
    fetchImageBase64(`${baseUrl}/brand/tico_logo_240.png`),
    fetchImageBase64(`${baseUrl}/brand/Tico_logo_png_new.png`),
    fetchImageBase64(`${baseUrl}/brand/franco-logo-hires.png`),
    fetchImageBase64(`${baseUrl}/brand/Tico_franco_co.png`),
    fetchImageBase64(`${baseUrl}/brand/tagline.png`),
    fetchImageBase64(`${baseUrl}/brand/bullet-star.png`),
    fetchImageBase64(`${baseUrl}/brand/Bullet_star_blue.png`)
  ]);

  const emailData = {
    personalizations: [
      {
        to: [{ email: recipientEmail }],
        subject: subject
      }
    ],
    from: {
      email: 'shani@franco.co.il',
      name: 'שני פרנקו - משרד רואי חשבון'
    },
    reply_to: {
      email: 'sigal@franco.co.il',
      name: 'סיגל נגר'
    },
    content: [
      {
        type: 'text/html',
        value: htmlContent
      }
    ],
    attachments: [
      {
        content: ticoLogoOld,
        filename: 'tico_logo.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'tico_logo'
      },
      {
        content: ticoLogoNew,
        filename: 'tico_logo_new.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'tico_logo_new'
      },
      {
        content: francoLogoOld,
        filename: 'franco_logo.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'franco_logo'
      },
      {
        content: francoLogoNew,
        filename: 'franco_logo_new.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'franco_logo_new'
      },
      {
        content: tagline,
        filename: 'tagline.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'tagline'
      },
      {
        content: bulletStar,
        filename: 'bullet_star.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'bullet_star'
      },
      {
        content: bulletStarBlue,
        filename: 'bullet_star_blue.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'bullet_star_blue'
      }
    ]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestData: SendLetterRequest = await req.json();
    const {
      recipientEmail,
      recipientName,
      templateType,
      variables,
      clientId,
      feeCalculationId
    } = requestData;

    // Validate
    if (!recipientEmail || !templateType || !variables) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Sending letter to:', recipientEmail);
    console.log('   Template:', templateType);

    // Build letter HTML
    const letterHtml = await buildLetterHtml(templateType, variables);

    // Generate subject
    const year = variables.year || new Date().getFullYear() + 1;
    const subject = `שכר טרחתנו לשנת המס ${year}`;

    // Send email
    await sendEmail(recipientEmail, subject, letterHtml);

    // Log to database if client ID provided
    if (clientId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      await supabase.from('generated_letters').insert({
        client_id: clientId,
        fee_calculation_id: feeCalculationId,
        template_type: templateType,
        variables_used: variables,
        generated_content_html: letterHtml,
        recipient_email: recipientEmail,
        sent_at: new Date().toISOString(),
        status: 'sent'
      });
    }

    console.log('✅ Email sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Letter sent successfully',
        recipient: recipientEmail
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
