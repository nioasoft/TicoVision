/**
 * Generate PDF Edge Function
 * Converts Hebrew HTML letters to PDF using Browserless.io REST API
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { embedImagesAsBase64, removeLinks } from './image-utils.ts';

const BROWSERLESS_TOKEN = Deno.env.get('BROWSERLESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📥 Request received');

    // Parse request body
    const body = await req.json();
    const { html, filename = 'letter.pdf' } = body;

    console.log('📦 Body parsed:', {
      hasHtml: !!html,
      htmlLength: html?.length || 0,
      filename
    });

    if (!html) {
      console.error('❌ No HTML provided');
      return new Response(
        JSON.stringify({ error: 'HTML content is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!BROWSERLESS_TOKEN) {
      console.error('❌ BROWSERLESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'BROWSERLESS_TOKEN not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📄 Generating PDF:', filename);

    // Process HTML: embed images as base64 and remove links
    console.log('🖼️ Embedding images as base64...');
    let processedHtml = await embedImagesAsBase64(html);

    console.log('🔗 Removing links from HTML...');
    processedHtml = removeLinks(processedHtml);

    console.log('✅ HTML processed successfully');
    console.log('🌐 Calling Browserless REST API...');

    // Browserless REST API endpoint
    const browserlessUrl = `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`;

    // Prepare request body for Browserless
    const browserlessRequest = {
      html: processedHtml,  // Use processed HTML with embedded images and no links
      options: {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      },
    };

    console.log('📤 Sending to Browserless...');

    // Call Browserless API
    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(browserlessRequest),
    });

    console.log('📬 Browserless response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Browserless API error:', response.status, errorText);
      throw new Error(`Browserless API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ PDF generated successfully');

    // Get the PDF as ArrayBuffer
    const pdfBuffer = await response.arrayBuffer();

    console.log('📦 PDF size:', pdfBuffer.byteLength, 'bytes');

    // Return PDF as downloadable file
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({
        error: error.message || 'PDF generation failed',
        details: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
