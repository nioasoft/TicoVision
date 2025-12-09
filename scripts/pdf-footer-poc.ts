/**
 * POC: Test CSS features for PDF footer pagination
 * Tests: counter(page), counter(pages), @page :last
 */

import * as fs from 'fs';

const BROWSERLESS_TOKEN = '99a339aacb31a2b2749e611586db2874137c38aa9ff9212c8cbdd3d6e27a4a8c';

// HTML that creates 3+ pages with different footer styles
const testHtml = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin-top: 20mm;
      margin-bottom: 25mm;
      margin-left: 15mm;
      margin-right: 15mm;
    }

    /* Test: Different margin for last page */
    @page :last {
      margin-bottom: 60mm;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
    }

    .content {
      padding-bottom: 15mm; /* Space for footer */
    }

    /* Simple footer - appears on all pages */
    .simple-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 15mm;
      text-align: center;
      font-size: 10px;
      border-top: 1px solid #333;
      padding-top: 3mm;
      background: white;
    }

    /* Full footer - should only appear on last page */
    .full-footer {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50mm;
      background: #f0f0f0;
      border-top: 3px solid #333;
      padding: 10px;
      text-align: center;
    }

    /* Try to show full footer only on last page - various CSS tricks */

    /* Page counter display */
    .page-number::after {
      content: "\\05E2\\05DE\\05D5\\05D3 " counter(page) " \\05DE\\05EA\\05D5\\05DA " counter(pages);
    }

    .office-name {
      margin-top: 5px;
      font-weight: bold;
    }

    /* Force page breaks for testing */
    .page-break {
      page-break-after: always;
    }

    h1 {
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }

    p {
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="content">
    <!-- Page 1 -->
    <h1>עמוד ראשון - בדיקת Footer</h1>
    <p>זוהי בדיקה של מערכת ה-Footer החדשה.</p>
    <p>אנחנו בודקים את התכונות הבאות:</p>
    <ul>
      <li>counter(page) - מספר עמוד נוכחי</li>
      <li>counter(pages) - סה"כ עמודים</li>
      <li>@page :last - selector לדף אחרון</li>
      <li>position: fixed - footer קבוע</li>
    </ul>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>

    <div class="page-break"></div>

    <!-- Page 2 -->
    <h1>עמוד שני</h1>
    <p>זהו העמוד השני במסמך הבדיקה.</p>
    <p>בעמוד זה אמור להופיע footer פשוט עם מספר עמוד ושם המשרד.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>

    <div class="page-break"></div>

    <!-- Page 3 (Last) -->
    <h1>עמוד שלישי (אחרון)</h1>
    <p>זהו העמוד האחרון במסמך.</p>
    <p>בעמוד זה אמור להופיע:</p>
    <ul>
      <li>Footer מלא עם לוגו ופרטי קשר</li>
      <li>Margin גדול יותר בתחתית</li>
    </ul>
    <p>אם ה-CSS עובד כמצופה, העמוד הזה יראה שונה משני העמודים הקודמים.</p>
  </div>

  <!-- Simple footer for all pages -->
  <div class="simple-footer">
    <span class="page-number"></span>
    <div class="office-name">משרד רואי חשבון פרנקו ושות' בע"מ</div>
  </div>
</body>
</html>
`;

async function runPoc() {
  console.log('🧪 Starting PDF Footer POC...');
  console.log('Testing CSS features: counter(page), counter(pages), @page :last\n');

  try {
    console.log('📤 Sending request to Browserless API...');

    const response = await fetch(
      `https://production-sfo.browserless.io/pdf?token=${BROWSERLESS_TOKEN}`,
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
            displayHeaderFooter: false, // We're handling footer in HTML
            margin: {
              top: '20mm',
              right: '15mm',
              bottom: '25mm', // Base margin, @page :last should override for last page
              left: '15mm'
            }
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Browserless API error: ${response.status} - ${errorText}`);
    }

    const pdfBuffer = await response.arrayBuffer();
    const outputPath = '/tmp/pdf-footer-poc.pdf';

    fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));

    console.log(`✅ PDF generated successfully!`);
    console.log(`📄 Output: ${outputPath}`);
    console.log(`📊 Size: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
    console.log('\n🔍 Please open the PDF and verify:');
    console.log('   1. Page numbers appear correctly (עמוד X מתוך Y)');
    console.log('   2. Office name appears in footer');
    console.log('   3. Last page has different margin (if @page :last works)');
    console.log('\n📂 Open with: open /tmp/pdf-footer-poc.pdf');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

runPoc();
