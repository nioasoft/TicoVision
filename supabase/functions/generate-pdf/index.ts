import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // 4. Get HTML with public URLs (not CID)
    let html = letter.generated_content_html;

    // Convert CID references to public URLs
    const baseUrl = supabaseUrl.replace('/rest/v1', '');
    const bucket = 'letter-assets-v2';

    const cidToUrlMap: Record<string, string> = {
      'cid:tico_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_logo_png_new.png`,
      'cid:franco_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_franco_co.png`,
      'cid:tagline': `${baseUrl}/storage/v1/object/public/${bucket}/tagline.png`,
      'cid:bullet_star_blue': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_blue.png`,
      'cid:tico_logo': `${baseUrl}/storage/v1/object/public/${bucket}/tico_logo_240.png`,
      'cid:franco_logo': `${baseUrl}/storage/v1/object/public/${bucket}/franco-logo-hires.png`,
      'cid:bullet_star': `${baseUrl}/storage/v1/object/public/${bucket}/bullet-star.png`,
    };

    // PDF footer image URL (for Puppeteer footer template)
    const pdfFooterUrl = `${baseUrl}/storage/v1/object/public/${bucket}/pdf_footer.png`;

    for (const [cid, url] of Object.entries(cidToUrlMap)) {
      html = html.replace(new RegExp(cid, 'g'), url);
    }

    // Remove footer from HTML body (will be rendered by Puppeteer footer template)
    // This ensures footer appears on every page consistently
    html = html.replace(/<!-- FOOTER START -->[\s\S]*?<!-- FOOTER END -->/g, '');

    // 5. Wrap HTML in full document (simple approach - same as preview!)
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
          }
          @page {
            size: A4;
            margin: 10mm 10mm 40mm 10mm; /* top, right, bottom, left - optimized for A4 */
          }
        </style>
      </head>
      <body>
        ${html}
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
            headerTemplate: '<div></div>', // Empty header (keeping HTML header in body)
            footerTemplate: `
              <div style="width: 100%; margin: 0; padding: 0; font-size: 10px;">
                <img src="${pdfFooterUrl}" style="width: 100%; display: block;" />
              </div>
            `,
            margin: {
              top: '10mm',    // Reduced from 20mm - raises header
              right: '10mm',  // Reduced from 15mm - smaller side margins
              bottom: '40mm', // Reduced from 50mm - adjusted for footer
              left: '10mm'    // Reduced from 15mm - smaller side margins
            }
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      throw new Error(`Browserless API error: ${browserlessResponse.status} - ${errorText}`);
    }

    const pdfBuffer = await browserlessResponse.arrayBuffer();
    console.log('PDF generated successfully');

    // 7. Upload PDF to Supabase Storage
    const fileName = `${letterId}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('letter-pdfs') // Correct bucket name (created in migration 091)
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    // 8. Get public URL
    const { data: urlData } = supabase.storage
      .from('letter-pdfs') // Correct bucket name (created in migration 091)
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // 9. Update database with PDF URL
    const { error: updateError } = await supabase
      .from('generated_letters')
      .update({
        pdf_url: pdfUrl
      })
      .eq('id', letterId);

    if (updateError) {
      console.error('Failed to update database:', updateError);
    }

    // 10. Return success
    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        letterId
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
