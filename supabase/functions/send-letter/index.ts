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
  // Template mode (original)
  templateType?: string;
  variables?: Record<string, any>;
  // Custom text mode (new)
  customText?: string;
  includesPayment?: boolean;
  saveAsTemplate?: { name: string; description?: string; subject?: string; };
  // Common fields
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
 * Parse inline text formatting
 * Processes: **bold**, ##red bold##, ###blue bold###, __underline__
 */
function parseInlineStyles(text: string): string {
  let result = text;

  // Process ### (blue bold) FIRST - before ## to avoid conflicts
  result = result.replace(/###(.*?)###/g, '<span style="color: #395BF7; font-weight: bold;">$1</span>');

  // Process ## (red bold) SECOND
  result = result.replace(/##(.*?)##/g, '<span style="color: #FF0000; font-weight: bold;">$1</span>');

  // Process ** (bold) THIRD
  result = result.replace(/\*\*(.*?)\*\*/g, '<span style="font-weight: bold;">$1</span>');

  // Process __ (underline) FOURTH
  result = result.replace(/__(.*?)__/g, '<span style="text-decoration: underline;">$1</span>');

  return result;
}

/**
 * Close bullet section with border
 */
function closeBulletSection(): string {
  return '</div><div style="border-top: 1px solid #000000; margin-top: 20px;"></div>';
}

/**
 * Parse plain text to HTML (Markdown-like syntax)
 * Ported from text-to-html-parser.ts
 */
function parseTextToHTML(plainText: string): string {
  const lines = plainText.split('\n');
  let html = '';
  let inBulletSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.length === 0) {
      // Close bullet section on empty line
      if (inBulletSection) {
        html += '</div>';
        inBulletSection = false;
      }
      html += '<div style="height: 20px;"></div>';
      continue;
    }

    // Subject line: "הנדון:"
    if (line.startsWith('הנדון:')) {
      if (inBulletSection) {
        html += closeBulletSection();
        inBulletSection = false;
      }
      const subject = line.substring(6).trim();
      const styledSubject = parseInlineStyles(subject);
      // קו מעל הנדון
      html += '<div style="border-top: 1px solid #000000; margin-bottom: 20px;"></div>';
      // הנדון עם קו מתחת
      html += `<p style="margin: 0; padding: 20px 0; text-align: right; font-family: 'David Libre', serif; font-size: 26px; font-weight: 700; line-height: 1.2; color: #395BF7; direction: rtl; border-bottom: 1px solid #000000;">הנדון: ${styledSubject}</p>`;
      continue;
    }

    // Section heading: ends with ":"
    if (line.endsWith(':') && !line.startsWith('*') && !line.startsWith('-')) {
      if (inBulletSection) {
        html += closeBulletSection();
        inBulletSection = false;
      }
      const styledLine = parseInlineStyles(line);
      html += `<p style="margin: 20px 0 0 0; padding: 0; text-align: right; font-family: 'David Libre', serif; font-size: 20px; font-weight: 700; line-height: 1.2; color: #000000; direction: rtl;">${styledLine}</p>`;
      continue;
    }

    // Bullet point (star or dash)
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inBulletSection) {
        html += '<div style="margin: 13px 0; padding: 0;">';
        inBulletSection = true;
      }
      const bulletText = line.substring(2).trim();
      const styledBulletText = parseInlineStyles(bulletText);
      const bulletIcon = line.startsWith('* ')
        ? '<img src="cid:bullet_star_blue" alt="★" style="width: 19px; height: 18px; margin-left: 10px; margin-top: 3px; display: inline-block;">'
        : '<span style="color: #395BF7; font-size: 20px; margin-left: 10px;">•</span>';

      html += `<div style="display: flex; align-items: start; margin: 10px 0; direction: rtl;">
        ${bulletIcon}
        <span style="flex: 1; text-align: right; font-family: 'David Libre', serif; font-size: 16px; font-weight: 400; line-height: 1.4; color: #000000;">${styledBulletText}</span>
      </div>`;
      continue;
    }

    // Regular paragraph
    if (inBulletSection) {
      html += closeBulletSection();
      inBulletSection = false;
    }
    const styledLine = parseInlineStyles(line);
    html += `<p style="margin: 13px 0; padding: 0; text-align: right; font-family: 'David Libre', serif; font-size: 16px; font-weight: 400; line-height: 1.4; color: #000000; direction: rtl;">${styledLine}</p>`;
  }

  // Close any open bullet section
  if (inBulletSection) {
    html += closeBulletSection();
  }

  return html;
}

/**
 * Build custom letter HTML from parsed text
 */
async function buildCustomLetterHtml(
  parsedBodyHtml: string,
  variables: Record<string, any>,
  includesPayment: boolean
): Promise<string> {
  // Fetch components
  const header = await fetchTemplate('components/header.html');
  const footer = await fetchTemplate('components/footer.html');
  const paymentSection = includesPayment ? await fetchTemplate('components/payment-section.html') : '';

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
                    <tr>
                        <td style="padding: 20px 0; text-align: right;">
                            ${parsedBodyHtml}
                        </td>
                    </tr>
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
      customText,
      includesPayment,
      saveAsTemplate,
      clientId,
      feeCalculationId
    } = requestData;

    // Validate - must have either templateType OR customText
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing recipientEmail' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const isTemplateMode = !!templateType;
    const isCustomMode = !!customText;

    if (!isTemplateMode && !isCustomMode) {
      return new Response(
        JSON.stringify({ error: 'Must provide either templateType or customText' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (isTemplateMode && !variables) {
      return new Response(
        JSON.stringify({ error: 'Template mode requires variables' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('📧 Sending letter to:', recipientEmail);

    let letterHtml: string;
    let subject: string;
    let parsedBodyHtml: string | undefined;

    if (isCustomMode) {
      // Custom mode: parse plain text to HTML
      console.log('   Mode: Custom text');
      console.log('   Includes payment:', includesPayment);

      // Parse the custom text
      parsedBodyHtml = parseTextToHTML(customText!);

      // Add auto-generated variables (like template mode does)
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const finalVariables = {
        letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),
        year: nextYear,
        previous_year: currentYear,
        tax_year: nextYear,
        ...(variables || {})  // User variables override defaults
      };

      // Replace variables in the parsed HTML
      const bodyWithVariables = replaceVariables(parsedBodyHtml, finalVariables);

      // Build full letter with header + body + optional payment + footer
      letterHtml = await buildCustomLetterHtml(bodyWithVariables, finalVariables, includesPayment || false);

      // Generate subject from variables or default
      subject = finalVariables.subject || `שכר טרחתנו לשנת המס ${finalVariables.year}`;

      // Save as template if requested
      if (saveAsTemplate && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get tenant_id from JWT or client
        const authHeader = req.headers.get('Authorization');
        let tenantId = null;

        if (authHeader) {
          const token = authHeader.replace('Bearer ', '');
          // Decode JWT to get tenant_id (simplified - in production use proper JWT library)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const payload = JSON.parse(jsonPayload);
          tenantId = payload.user_metadata?.tenant_id;
        }

        if (tenantId) {
          await supabase.from('custom_letter_bodies').insert({
            tenant_id: tenantId,
            name: saveAsTemplate.name,
            description: saveAsTemplate.description || null,
            plain_text: customText,
            parsed_html: parsedBodyHtml,
            includes_payment: includesPayment || false,
            subject: saveAsTemplate.subject || null,
            created_by: payload?.sub || null
          });
        }
      }
    } else {
      // Template mode: use existing template system
      console.log('   Mode: Template');
      console.log('   Template:', templateType);

      letterHtml = await buildLetterHtml(templateType!, variables!);

      // Generate subject - different for bookkeeping templates
      const year = variables!.year || new Date().getFullYear() + 1;
      const isBookkeeping = templateType!.startsWith('internal_bookkeeping');
      subject = isBookkeeping
        ? `שכר טרחתנו לשנת המס ${year} - הנהלת חשבונות`
        : `שכר טרחתנו לשנת המס ${year}`;
    }

    // Send email
    await sendEmail(recipientEmail, subject, letterHtml);

    // Log to database if client ID provided
    if (clientId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      if (isCustomMode) {
        // For custom letters, we need a template_id
        // First, get or create a "Custom Letter" template
        const { data: customTemplate } = await supabase
          .from('letter_templates')
          .select('id')
          .eq('name', 'Custom Letter')
          .single();

        let templateId = customTemplate?.id;

        if (!templateId) {
          // Create the custom template entry
          const { data: newTemplate } = await supabase
            .from('letter_templates')
            .insert({
              name: 'Custom Letter',
              description: 'User-generated custom letter',
              body_template: ''
            })
            .select('id')
            .single();

          templateId = newTemplate?.id;
        }

        await supabase.from('generated_letters').insert({
          client_id: clientId,
          template_id: templateId,
          fee_calculation_id: feeCalculationId,
          variables_used: variables || {},
          generated_content_html: letterHtml,
          recipient_email: recipientEmail,
          sent_at: new Date().toISOString(),
          status: 'sent'
        });
      } else {
        // Template mode - existing logic
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
