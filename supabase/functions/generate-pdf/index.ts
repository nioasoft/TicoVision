import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import { HEADER_PDF_BASE64 } from './header-image.ts';
import { FOOTER_PDF_BASE64 } from './footer-image.ts';
import { BULLET_BLUE_BASE64 } from './bullet-image.ts';

// Helper: Convert base64 data URI to Uint8Array
function base64ToUint8Array(base64DataUri: string): Uint8Array {
  const base64 = base64DataUri.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper: Sanitize string for use in filename (keep Hebrew, English, numbers)
function sanitizeFilename(str: string): string {
  return str
    .replace(/[^א-תa-zA-Z0-9\s-]/g, '') // Remove special chars, keep Hebrew
    .trim()
    .replace(/\s+/g, '-')               // Replace spaces with dashes
    .slice(0, 30);                       // Limit length
}

// Helper: Format timestamp for filename (YYYYMMDD-HHMMSS)
function formatTimestamp(isoDate: string): string {
  const d = new Date(isoDate);
  const date = d.toISOString().slice(0, 10).replace(/-/g, '');    // YYYYMMDD
  const time = d.toTimeString().slice(0, 8).replace(/:/g, '');     // HHMMSS
  return `${date}-${time}`;
}

// Post-processing: Add full footer image to the last page only
async function addFullFooterToLastPage(
  pdfBytes: ArrayBuffer,
  footerImageBase64: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];

  console.log(`📊 PDF has ${pages.length} pages, adding full footer to last page`);

  const footerBytes = base64ToUint8Array(footerImageBase64);
  const footerImage = await pdfDoc.embedPng(footerBytes);

  const { width } = lastPage.getSize();
  const footerHeight = 53 * 2.83465; // 53mm in points

  lastPage.drawImage(footerImage, {
    x: 0,
    y: 0,
    width: width,
    height: footerHeight,
  });

  return await pdfDoc.save();
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',  // Vite dev server (default)
  'http://localhost:5174',  // Vite dev server (alternate port)
  'http://localhost:3000',  // Alternative dev port
  Deno.env.get('APP_URL'),  // Custom deployment URL
].filter(Boolean) as string[];

function getCorsHeaders(origin: string | null) {
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

interface GeneratePDFRequest {
  letterId: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Parse request
    const { letterId }: GeneratePDFRequest = await req.json();

    if (!letterId) {
      throw new Error('letterId is required');
    }

    // 2. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Fetch letter from database
    const { data: letter, error: fetchError } = await supabase
      .from('generated_letters')
      .select('*')
      .eq('id', letterId)
      .single();

    if (fetchError || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    // 3b. Fetch client/group name for descriptive filename
    let entityName = 'unknown';
    if (letter.client_id) {
      // Single client letter
      const { data: client } = await supabase
        .from('clients')
        .select('company_name')
        .eq('id', letter.client_id)
        .single();
      if (client?.company_name) {
        entityName = sanitizeFilename(client.company_name);
      }
    } else if (letter.group_id) {
      // Group letter
      const { data: group } = await supabase
        .from('client_groups')
        .select('group_name_hebrew')
        .eq('id', letter.group_id)
        .single();
      if (group?.group_name_hebrew) {
        entityName = sanitizeFilename(group.group_name_hebrew);
      } else {
        entityName = 'group';
      }
    }

    // 3c. Build descriptive filename: {name}-{type}-{timestamp}.pdf
    const docType = sanitizeFilename(letter.template_type || letter.subject || 'document');
    const timestamp = formatTimestamp(letter.created_at || new Date().toISOString());
    const descriptiveFileName = `${entityName}-${docType}-${timestamp}.pdf`;
    console.log(`Building filename: ${descriptiveFileName}`);

    // 4. Get HTML with public URLs (not CID)
    let html = letter.generated_content_html;

    // Convert CID references to public URLs
    const baseUrl = supabaseUrl.replace('/rest/v1', '');
    const bucket = 'letter-assets-v2';

    const cidToUrlMap: Record<string, string> = {
      'cid:tico_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_logo_png_new.png`,
      'cid:franco_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_franco_co.png`,
      'cid:tagline': `${baseUrl}/storage/v1/object/public/${bucket}/tagline.png`,
      'cid:bullet_star_blue': BULLET_BLUE_BASE64, // Use base64 data URI instead of external URL
      'cid:tico_logo': `${baseUrl}/storage/v1/object/public/${bucket}/tico_logo_240.png`,
      'cid:franco_logo': `${baseUrl}/storage/v1/object/public/${bucket}/franco-logo-hires.png`,
      'cid:bullet_star': `${baseUrl}/storage/v1/object/public/${bucket}/bullet-star.png`,
      'cid:tico_signature': `${baseUrl}/storage/v1/object/public/${bucket}/tico_signature.png`,
      // Also map relative paths used by TiptapEditor toolbar
      '/brand/tico_signature.png': `${baseUrl}/storage/v1/object/public/${bucket}/tico_signature.png`,
    };

    // Remove STATIC header/footer from HTML for PDF (they'll be added via displayHeaderFooter)
    // Keep DYNAMIC header (recipient + date) in body
    // This prevents duplication - email/WhatsApp keep the full HTML header/footer

    // Remove STATIC header (Logo + Black bar) using comment markers
    // Same approach as generate-pdf-universal function
    // Make regex more flexible to handle variations in comment formatting
    console.log('🔍 [PDF] Before removal - Has HEADER STATIC START?', html.includes('HEADER STATIC START'));
    console.log('🔍 [PDF] Before removal - Has HEADER STATIC END?', html.includes('HEADER STATIC END'));
    html = html.replace(/<!--\s*HEADER\s+STATIC\s+START[\s\S]*?-->([\s\S]*?)<!--\s*HEADER\s+STATIC\s+END[\s\S]*?-->/gi, '');
    console.log('🔍 [PDF] After removal - Has HEADER STATIC START?', html.includes('HEADER STATIC START'));
    console.log('🔍 [PDF] If still there, regex did not match!');

    // NOW replace CID references with URLs/base64
    for (const [cid, url] of Object.entries(cidToUrlMap)) {
      html = html.replace(new RegExp(cid, 'g'), url);
    }

    // Remove footer (entire footer section)
    html = html.replace(/<!--\s*FOOTER START\s*-->[\s\S]*?<!--\s*FOOTER END\s*-->/g, '');

    // 5. Wrap HTML in full document with proper layout for header/footer
    const fullHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&family=Heebo:wght@400;500;600;700&family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif;
            direction: rtl;
            background: white;
            padding: 0;
            margin: 0;
          }
          @page {
            size: A4;
            /* Top: Header (34mm) + padding (10mm) = 44mm */
            margin-top: 44mm;
            /* Bottom: Small margin for page numbers - spacer reserves rest for full footer */
            margin-bottom: 15mm;
            /* Side margins */
            margin-left: 9mm;
            margin-right: 9mm;
          }
          /* Image styling to prevent layout issues */
          img {
            display: inline;
            vertical-align: middle;
            max-width: 100%;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .inline-block {
            display: inline !important;
          }

          /* =================================
             PAGE BREAK CONTROL
             ================================= */

          /* Allow the outer table wrapper to break between rows */
          table {
            break-inside: auto;
          }

          /* Allow table rows to break across pages for proper content flow */
          tr {
            break-inside: auto;
            page-break-inside: auto;
          }

          /* Paragraphs stay together */
          p {
            break-inside: avoid;
            page-break-inside: avoid;
            orphans: 3;
            widows: 3;
          }

          /* List items stay together */
          li {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* =================================
             USER-CREATED TABLES (from Tiptap editor)
             ================================= */
          .letter-body-content table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-bottom: 1em !important;
          }
          .letter-body-content table td,
          .letter-body-content table th {
            border: 1px solid black !important;
            padding: 5px !important;
            vertical-align: top !important;
          }
          .letter-body-content table th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }

          /* =================================
             COLORED BULLET TABLES - NO BORDERS
             Tables containing bullet icons should not have visible borders
             ================================= */
          .letter-body-content table:has(img[alt="•"]) {
            border: none !important;
            border-collapse: collapse !important;
            margin: 0 !important;
            margin-bottom: 8px !important;
          }
          .letter-body-content table:has(img[alt="•"]) td {
            border: none !important;
            padding: 2px 8px 2px 0 !important;
            vertical-align: top !important;
          }
          .letter-body-content table:has(img[alt="•"]) td:first-child {
            width: 20px !important;
            padding-top: 4px !important;
            padding-right: 0 !important;
          }
          /* Show bullet icon */
          .letter-body-content table:has(img[alt="•"]) img[alt="•"] {
            display: block !important;
            width: 11px !important;
            height: 11px !important;
          }
        </style>
      </head>
      <body>
        ${html}
        <!-- Footer spacer - reserves space for full footer on last page (28mm + 15mm margin = 43mm) -->
        <div style="height: 28mm; width: 100%;"></div>
      </body>
      </html>
    `;

    // 6. Generate PDF using Browserless API
    const browserlessToken = Deno.env.get('BROWSERLESS_TOKEN');
    if (!browserlessToken) {
      throw new Error('BROWSERLESS_TOKEN environment variable is not set');
    }

    console.log('Calling Browserless API...');
    const browserlessResponse = await fetch(
      `https://production-sfo.browserless.io/pdf?token=${browserlessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: fullHtml,
          options: {
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
              <div style="width: 100%; margin: 0; padding: 0; font-size: 10px;">
                <img src="${HEADER_PDF_BASE64}" style="width: 100%; display: block;" />
              </div>
            `,
            footerTemplate: `
              <style>
                @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap');
              </style>
              <div style="width: 100%; font-size: 10px; text-align: center; padding-top: 5px; direction: rtl; background: white; font-family: 'Heebo', Arial, sans-serif;">
                <span>עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span></span>
                <span style="margin: 0 10px;">|</span>
                <span style="font-weight: bold;">משרד רואי חשבון פרנקו ושות' בע"מ</span>
              </div>
            `,
            margin: {
              top: '44mm',    // Header (34mm) + padding (10mm)
              right: '0mm',   // No side margins (handled in @page)
              bottom: '15mm', // Small margin for page numbers - spacer reserves rest for full footer
              left: '0mm'     // No side margins (handled in @page)
            }
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      throw new Error(`Browserless API error: ${browserlessResponse.status} - ${errorText}`);
    }

    const initialPdfBuffer = await browserlessResponse.arrayBuffer();
    console.log('Initial PDF generated successfully');

    // 6b. Post-process: Add full footer to last page only
    console.log('Adding full footer to last page...');
    const finalPdfBytes = await addFullFooterToLastPage(initialPdfBuffer, FOOTER_PDF_BASE64);
    console.log('PDF post-processing complete');

    // 7. Upload PDF to Supabase Storage with descriptive filename
    // Use UUID as storage key (avoid conflicts), save descriptive name for downloads
    const storageFileName = `${letterId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('letter-pdfs') // Correct bucket name (created in migration 091)
      .upload(storageFileName, finalPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // 8. Get public URL
    const { data: urlData } = supabase.storage
      .from('letter-pdfs') // Correct bucket name (created in migration 091)
      .getPublicUrl(storageFileName);

    const pdfUrl = urlData.publicUrl;

    // 9. Update database with PDF URL and descriptive filename
    const { error: updateError } = await supabase
      .from('generated_letters')
      .update({
        pdf_url: pdfUrl,
        pdf_file_name: descriptiveFileName  // Save descriptive name for downloads
      })
      .eq('id', letterId);

    if (updateError) {
      console.error('Failed to update database:', updateError);
    }

    console.log(`PDF generated: ${descriptiveFileName}`);

    // 10. Return success
    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        letterId,
        fileName: descriptiveFileName  // Return descriptive filename
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error generating PDF:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
