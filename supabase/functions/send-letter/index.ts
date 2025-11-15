/**
 * Supabase Edge Function: Send Letter via Email
 * Sends formatted HTML letters with embedded CID images using SendGrid
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import DOMPurify from 'https://esm.sh/isomorphic-dompurify@2.11.0';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

interface CustomHeaderLine {
  id: string;
  type: 'text' | 'line';
  content?: string;
  formatting?: {
    bold: boolean;
    color: 'red' | 'blue' | 'black';
    underline: boolean;
  };
  order: number;
}

interface SendLetterRequest {
  recipientEmails: string[];
  recipientName: string;
  // Template mode (original)
  templateType?: string;
  variables?: Record<string, any>;
  // Custom text mode (new)
  customText?: string;
  includesPayment?: boolean;
  customHeaderLines?: CustomHeaderLine[];
  subjectLines?: any[]; // Subject lines (הנדון)
  saveAsTemplate?: { name: string; description?: string; subject?: string; };
  isHtml?: boolean; // If true, customText is already HTML from Tiptap
  // Common fields
  clientId?: string;
  feeCalculationId?: string;
  letterId?: string; // Existing letter ID (prevents duplicate INSERT)
}

interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Credentials': string;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',  // Vite dev server (default)
  'http://localhost:5174',  // Vite dev server (alternate port)
  'http://localhost:3000',  // Alternative dev port
  Deno.env.get('APP_URL'),  // Custom deployment URL
].filter(Boolean) as string[];

/**
 * Get CORS headers with validated origin
 */
function getCorsHeaders(origin: string | null): CorsHeaders {
  // Check if origin is allowed
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
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(unsafe: string | number): string {
  const str = String(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize HTML with whitelist for custom_header_lines
 * Allows only: <b>, <strong>, <u>, <i>, <em>, <br>, <span> with limited styles
 */
function sanitizeCustomHeaderHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'strong', 'u', 'i', 'em', 'br', 'span'],
    ALLOWED_ATTR: ['style'],
    ALLOWED_STYLES: {
      'span': {
        'color': [/^#[0-9A-F]{6}$/i, /^#[0-9A-F]{3}$/i],  // hex colors only
        'font-weight': [/^(bold|[1-9]00)$/],
        'text-decoration': [/^underline$/]
      }
    }
  });
}

/**
 * Replace variables in HTML with HTML escaping to prevent XSS
 */
function replaceVariables(html: string, variables: Record<string, any>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    // Escape HTML for all variables except those that explicitly need HTML
    // (custom_header_lines content is pre-sanitized in generateCustomHeaderLinesHtml)
    result = result.replace(regex, escapeHtml(value));
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
 *
 * @param plainText - The content to process
 * @param isHtml - If true, assumes text is already HTML from Tiptap (bypasses parsing)
 */
function parseTextToHTML(plainText: string, isHtml: boolean = false): string {
  // If already HTML from Tiptap, return as-is
  if (isHtml) {
    return plainText;
  }

  // Otherwise parse Markdown to HTML (legacy support)
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
 * Generate HTML for custom header lines
 * Converts CustomHeaderLine[] to HTML to be inserted after company name in header table
 */
function generateCustomHeaderLinesHtml(lines: CustomHeaderLine[]): string {
  if (!lines || lines.length === 0) {
    return '';
  }

  // Sort by order
  const sortedLines = [...lines].sort((a, b) => a.order - b.order);

  const html = sortedLines.map(line => {
    if (line.type === 'line') {
      // Separator line - thin black line (1px solid) in table row
      return `
<tr>
    <td style="padding: 0;">
        <div style="border-top: 1px solid #000000; margin: 3px 0;"></div>
    </td>
</tr>`;
    } else {
      // Text line with formatting in table row
      // Default to bold unless explicitly set to false
      const isBold = line.formatting?.bold !== false;
      const color = line.formatting?.color || 'black';
      const isUnderline = line.formatting?.underline || false;

      const colorMap: Record<string, string> = {
        'red': '#FF0000',
        'blue': '#395BF7',
        'black': '#000000'
      };

      const styles: string[] = [
        'font-family: "David Libre", "Heebo", "Assistant", sans-serif',
        'font-size: 18px',
        'text-align: right',
        'direction: rtl',
        'margin: 0',
        'padding: 0',
        `color: ${colorMap[color] || '#000000'}`
      ];

      // Bold by default
      styles.push(isBold ? 'font-weight: 700' : 'font-weight: 400');

      if (isUnderline) {
        styles.push('text-decoration: underline');
      }

      // Sanitize content with HTML whitelist (allows bold, underline, colors)
      const sanitizedContent = sanitizeCustomHeaderHtml(line.content || '');

      return `
<tr>
    <td style="padding: 2px 0; text-align: right;">
        <div style="${styles.join('; ')};">${sanitizedContent}</div>
    </td>
</tr>`;
    }
  }).join('');

  return html;
}

/**
 * Build subject lines HTML ("הנדון" section)
 */
function buildSubjectLinesHTML(subjectLines: any[]): string {
  if (!subjectLines || subjectLines.length === 0) {
    return '';
  }

  console.log('🔍 [Edge Function] Building subject lines HTML:', subjectLines);

  const subjectLinesHtml = subjectLines.map((line, index) => {
    // Build style string
    let style = 'font-size: 19px; color: #395BF7; direction: rtl; text-align: right;';
    style += line.formatting?.bold ? ' font-weight: 700;' : '';
    style += line.formatting?.underline ? ' text-decoration: underline;' : '';

    return `<tr>
  <td style="padding: ${index === 0 ? '20px' : '4px'} 0 0 0;">
    <p style="${style} margin: 0; padding: 0;">
      ${line.content}
    </p>
  </td>
</tr>`;
  }).join('');

  console.log('🔍 [Edge Function] Subject lines HTML generated:', subjectLinesHtml.length, 'chars');

  return subjectLinesHtml;
}

/**
 * Build custom letter HTML from parsed text
 */
async function buildCustomLetterHtml(
  parsedBodyHtml: string,
  variables: Record<string, any>,
  includesPayment: boolean,
  customHeaderLines?: CustomHeaderLine[],
  subjectLinesHtml?: string
): Promise<string> {
  // Fetch components
  let header = await fetchTemplate('components/header.html');
  const footer = await fetchTemplate('components/footer.html');
  const paymentSection = includesPayment ? await fetchTemplate('components/payment-section.html') : '';

  // Generate custom header lines HTML if provided
  const customHeaderLinesHtml = customHeaderLines ? generateCustomHeaderLinesHtml(customHeaderLines) : '';

  // Replace {{custom_header_lines}} placeholder in header
  header = header.replace('{{custom_header_lines}}', customHeaderLinesHtml);

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
                    ${subjectLinesHtml || ''}
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
  let header = await fetchTemplate('components/header.html');
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

  // Replace {{custom_header_lines}} with empty string for fee calculation letters
  // (custom_header_lines is only used in Universal Letter Builder)
  header = header.replace('{{custom_header_lines}}', '');

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
  recipientEmails: string[],
  subject: string,
  htmlContent: string
): Promise<void> {
  if (!htmlContent || htmlContent.trim() === '') {
    throw new Error('HTML content is empty. Cannot send email.');
  }

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
        to: recipientEmails.map(email => ({ email })),
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
  // Get CORS headers based on request origin
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const requestData: SendLetterRequest = await req.json();
    const {
      recipientEmails,
      recipientName,
      templateType,
      variables,
      customText,
      includesPayment,
      customHeaderLines,
      subjectLines,
      saveAsTemplate,
      isHtml,
      clientId,
      feeCalculationId,
      letterId // Existing letter ID (if provided, skip INSERT)
    } = requestData;

    // Validate - must have either templateType OR customText
    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid recipientEmails array' }),
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

    console.log('📧 Sending letter to:', recipientEmails.join(', '));

    let letterHtml: string;
    let subject: string;
    let parsedBodyHtml: string | undefined;

    if (isCustomMode) {
      // Custom mode: parse plain text to HTML
      console.log('   Mode: Custom text');
      console.log('   Includes payment:', includesPayment);

      // Parse the custom text (or use as-is if already HTML from Tiptap)
      parsedBodyHtml = parseTextToHTML(customText!, isHtml);

      // Add auto-generated variables (like template mode does)
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const finalVariables = {
        letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),
        year: nextYear,
        previous_year: currentYear,
        tax_year: nextYear,
        ...(variables || {}),  // User variables override defaults
        // Add fee_id and client_id for payment tracking links
        fee_id: feeCalculationId || (variables && variables.fee_id),
        client_id: clientId || (variables && variables.client_id)
      };

      // Replace variables in the parsed HTML
      const bodyWithVariables = replaceVariables(parsedBodyHtml, finalVariables);

      // Generate subject lines HTML if provided
      const subjectLinesHtml = subjectLines ? buildSubjectLinesHTML(subjectLines) : '';
      console.log('🔍 [Edge Function] Subject lines HTML:', subjectLinesHtml ? 'generated' : 'empty');

      // Build full letter with header + body + optional payment + footer
      letterHtml = await buildCustomLetterHtml(bodyWithVariables, finalVariables, includesPayment || false, customHeaderLines, subjectLinesHtml);

      // Generate subject from variables or default
      subject = finalVariables.subject || `שכר טרחתנו לשנת המס ${finalVariables.year}`;

      // Save as template if requested
      if (saveAsTemplate && SUPABASE_URL && SUPABASE_ANON_KEY) {
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
          throw new Error('Missing authorization header');
        }

        // Create Supabase client with user's JWT - this will verify the JWT signature
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } }
        });

        // Verify JWT and get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error('Unauthorized: Invalid or expired token');
        }

        const tenantId = user.user_metadata?.tenant_id;

        if (!tenantId) {
          throw new Error('Missing tenant_id in user metadata');
        }

        // RLS policies will automatically enforce tenant isolation
        const { error: insertError } = await supabase.from('custom_letter_bodies').insert({
          tenant_id: tenantId,
          name: saveAsTemplate.name,
          description: saveAsTemplate.description || null,
          plain_text: customText,
          parsed_html: parsedBodyHtml,
          includes_payment: includesPayment || false,
          subject: saveAsTemplate.subject || null,
          created_by: user.id
        });

        if (insertError) {
          throw new Error(`Failed to save template: ${insertError.message}`);
        }
      }
    } else {
      // Template mode: use existing template system
      console.log('   Mode: Template');
      console.log('   Template:', templateType);

      // Add fee_id and client_id to variables for payment tracking links
      const enrichedVariables = {
        ...variables!,
        fee_id: feeCalculationId || variables!.fee_id,
        client_id: clientId || variables!.client_id
      };

      letterHtml = await buildLetterHtml(templateType!, enrichedVariables);

      // Generate subject - different for bookkeeping templates
      const year = variables!.year || new Date().getFullYear() + 1;
      const companyName = variables!.company_name || 'לקוח יקר';
      const isBookkeeping = templateType!.includes('bookkeeping');
      subject = isBookkeeping
        ? `שלום רב ${companyName} - הודעת חיוב הנהלת חשבונות לשנת המס ${year} כמדי שנה 😊`
        : `שלום רב ${companyName} - הודעת חיוב לשנת המס ${year} כמדי שנה 😊`;
    }

    // Send email
    await sendEmail(recipientEmails, subject, letterHtml);

    // Log to database if client ID provided
    if (clientId && SUPABASE_URL && SUPABASE_ANON_KEY) {
      const authHeader = req.headers.get('Authorization');

      if (!authHeader) {
        throw new Error('Missing authorization header for letter logging');
      }

      // Create Supabase client with user's JWT - this will verify the JWT signature
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });

      // Verify JWT and get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unauthorized: Invalid or expired token');
      }

      const tenantId = user.user_metadata?.tenant_id;

      if (!tenantId) {
        throw new Error('Missing tenant_id in user metadata');
      }

      // IMPORTANT: If letterId provided, letter already saved as draft
      // LetterPreviewDialog saves draft → sends email → updates draft to 'sent'
      // We only INSERT if no letterId (e.g., Universal Builder direct send)
      let finalLetterId = letterId;

      if (!letterId) {
        // Save to generated_letters table
        // Migration 096: template_id is now nullable
        // Custom letters use template_id=null, template_type='custom'
        // Template letters use template_id=null, template_type=<type>
        const { data: insertedLetter, error: insertError } = await supabase.from('generated_letters').insert({
          tenant_id: tenantId,
          client_id: clientId,
          template_id: null,  // NULL for both custom and template mode letters
          fee_calculation_id: feeCalculationId,
          template_type: isCustomMode ? 'custom' : templateType,
          subject: subject,
          variables_used: variables || {},
          generated_content_html: letterHtml,
          recipient_emails: recipientEmails,
          sent_at: new Date().toISOString(),
          status: 'sent_email', // ⭐ Changed from 'sent' to 'sent_email'
          sent_via: 'email'
        }).select().single();

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw new Error(`Failed to log letter: ${insertError.message}`);
        }

        finalLetterId = insertedLetter?.id || null;
      } else {
        // Letter already exists (saved as draft/saved), update status to sent_email
        console.log('✅ Letter already saved, updating status to sent_email');
        const { error: updateError } = await supabase
          .from('generated_letters')
          .update({
            status: 'sent_email',
            sent_at: new Date().toISOString(),
            sent_via: 'email',
            recipient_emails: recipientEmails
          })
          .eq('id', letterId);

        if (updateError) {
          console.error('Failed to update letter status:', updateError);
          throw new Error(`Failed to update letter: ${updateError.message}`);
        }
      }

      console.log('✅ Email sent successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Letter sent successfully',
          recipients: recipientEmails,
          letterId: finalLetterId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Email sent successfully (no client logging)');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Letter sent successfully',
        recipients: recipientEmails,
        letterId: null
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
