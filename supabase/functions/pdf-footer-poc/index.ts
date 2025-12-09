/**
 * POC #3 Edge Function: pdf-lib post-processing
 *
 * Strategy:
 * 1. Browserless generates PDF with simple footer (page numbers) on ALL pages
 * 2. pdf-lib loads the PDF and adds full footer image to LAST page only
 * 3. The full footer covers/replaces the simple footer on last page
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1';
import { HEADER_PDF_BASE64 } from '../generate-pdf/header-image.ts';
import { FOOTER_PDF_BASE64 } from '../generate-pdf/footer-image.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// HTML that creates 3+ pages to test footer behavior
const testHtml = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin-top: 40mm;
      margin-bottom: 25mm;
      margin-left: 15mm;
      margin-right: 15mm;
    }

    body {
      font-family: 'David Libre', 'Heebo', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      direction: rtl;
      margin: 0;
      padding: 0;
    }

    .page-break {
      page-break-after: always;
    }

    h1 {
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
      margin-top: 0;
    }

    p {
      margin-bottom: 15px;
    }

    ul {
      margin-right: 20px;
    }

    li {
      margin-bottom: 8px;
    }

    .highlight {
      background: #e8f4e8;
      padding: 10px;
      border-radius: 5px;
      border-right: 4px solid #4caf50;
    }
  </style>
</head>
<body>
  <!-- Page 1 -->
  <h1>עמוד ראשון - בדיקת POC #3</h1>
  <p>זוהי בדיקה של גישת pdf-lib post-processing.</p>
  <p><strong>מה קורה כאן:</strong></p>
  <ul>
    <li>Browserless מייצר PDF עם footer פשוט בכל העמודים</li>
    <li>pdf-lib מוסיף את ה-footer המלא רק לדף האחרון</li>
    <li>התמונה "מכסה" את ה-footer הפשוט בדף האחרון</li>
  </ul>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>

  <div class="page-break"></div>

  <!-- Page 2 -->
  <h1>עמוד שני</h1>
  <p>בעמוד זה אמור להופיע:</p>
  <ul>
    <li>✅ Header עם לוגו</li>
    <li>✅ Footer פשוט: "עמוד 2 מתוך 3 | משרד רואי חשבון..."</li>
    <li>❌ לא אמור להופיע footer מלא</li>
  </ul>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.</p>

  <div class="page-break"></div>

  <!-- Page 3 (Last) -->
  <h1>עמוד שלישי (אחרון)</h1>
  <div class="highlight">
    <p><strong>🎯 זה העמוד האחרון!</strong></p>
    <p>כאן אמור להופיע ה-footer המלא עם הלוגו ופרטי הקשר.</p>
    <p>ה-footer הפשוט (מספרי עמודים) "מוחלף" על ידי תמונת ה-footer המלא.</p>
  </div>
  <p>אם אתה רואה את ה-footer המלא רק בעמוד הזה - ה-POC הצליח! 🎉</p>
</body>
</html>
`;

// Convert base64 data URI to Uint8Array
function base64ToUint8Array(base64DataUri: string): Uint8Array {
  // Remove data URI prefix (e.g., "data:image/png;base64,")
  const base64 = base64DataUri.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const browserlessToken = Deno.env.get('BROWSERLESS_TOKEN');
    if (!browserlessToken) {
      throw new Error('BROWSERLESS_TOKEN environment variable is not set');
    }

    console.log('📤 POC #3: pdf-lib post-processing approach...');

    // STEP 1: Generate PDF with Browserless (simple footer on all pages)
    console.log('Step 1: Generating PDF with Browserless...');
    const browserlessResponse = await fetch(
      `https://production-sfo.browserless.io/pdf?token=${browserlessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html: testHtml,
          options: {
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            // Real header image (all pages)
            headerTemplate: `
              <div style="width: 100%; margin: 0; padding: 0; font-size: 10px;">
                <img src="${HEADER_PDF_BASE64}" style="width: 100%; display: block;" />
              </div>
            `,
            // Simple footer with page numbers (all pages)
            footerTemplate: `
              <div style="width: 100%; font-size: 10px; text-align: center; border-top: 1px solid #333; padding-top: 5px; direction: rtl; background: white;">
                <span>עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span></span>
                <span style="margin: 0 10px;">|</span>
                <span style="font-weight: bold;">משרד רואי חשבון פרנקו ושות' בע"מ</span>
              </div>
            `,
            margin: {
              top: '37mm',    // Header height
              right: '15mm',
              bottom: '20mm', // Simple footer height
              left: '15mm'
            }
          },
        }),
      }
    );

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      throw new Error(`Browserless API error: ${browserlessResponse.status} - ${errorText}`);
    }

    const initialPdfBytes = await browserlessResponse.arrayBuffer();
    console.log(`✅ Initial PDF: ${(initialPdfBytes.byteLength / 1024).toFixed(2)} KB`);

    // STEP 2: Load PDF with pdf-lib
    console.log('Step 2: Loading PDF with pdf-lib...');
    const pdfDoc = await PDFDocument.load(initialPdfBytes);
    const pages = pdfDoc.getPages();
    const pageCount = pages.length;
    console.log(`📊 PDF has ${pageCount} pages`);

    // STEP 3: Add full footer to last page only
    console.log('Step 3: Adding full footer to last page...');
    const lastPage = pages[pageCount - 1];
    const { width, height } = lastPage.getSize();
    console.log(`📐 Page size: ${width.toFixed(0)} x ${height.toFixed(0)} points`);

    // Embed the footer image
    const footerImageBytes = base64ToUint8Array(FOOTER_PDF_BASE64);
    const footerImage = await pdfDoc.embedPng(footerImageBytes);

    // Calculate footer dimensions
    // Footer PNG is 958x231 pixels, we want it full width at bottom
    const footerHeight = 51 * 2.83465; // 51mm in points (1mm = 2.83465 points)
    const footerWidth = width; // Full page width

    // Draw footer image at the bottom of the last page
    // This will cover the simple footer
    lastPage.drawImage(footerImage, {
      x: 0,
      y: 0, // Bottom of page
      width: footerWidth,
      height: footerHeight,
    });

    console.log(`✅ Footer added: ${footerWidth.toFixed(0)} x ${footerHeight.toFixed(0)} points`);

    // STEP 4: Save modified PDF
    console.log('Step 4: Saving modified PDF...');
    const finalPdfBytes = await pdfDoc.save();

    console.log('✅ POC #3 PDF generated successfully!');
    console.log(`📊 Final size: ${(finalPdfBytes.byteLength / 1024).toFixed(2)} KB`);

    // Return PDF directly
    return new Response(finalPdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="pdf-footer-poc-v3.pdf"',
      },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
