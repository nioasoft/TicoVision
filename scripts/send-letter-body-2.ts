/**
 * Send Letter Body #2 (B - חיצוניים - שינוי ריאלי)
 * Usage: TEST_EMAIL="Benatia.Asaf@gmail.com" npx tsx scripts/send-letter-body-2.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import sgMail from '@sendgrid/mail';

// Load environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'Benatia.Asaf@gmail.com';

if (!SENDGRID_API_KEY) {
  console.error('❌ Error: SENDGRID_API_KEY not found in environment variables');
  console.log('💡 Add SENDGRID_API_KEY to your .env.local file');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Read template file
 */
function readTemplate(fileName: string): string {
  const filePath = resolve(process.cwd(), 'templates', fileName);
  return readFileSync(filePath, 'utf-8');
}

/**
 * Replace variables in template
 */
function replaceVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Calculate discount amounts
 */
function calculateDiscounts(originalAmount: number) {
  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString('he-IL');
  };

  return {
    amount_original: formatNumber(originalAmount),
    amount_after_bank: formatNumber(originalAmount * 0.91),     // 9% discount
    amount_after_single: formatNumber(originalAmount * 0.92),   // 8% discount
    amount_after_payments: formatNumber(originalAmount * 0.96), // 4% discount
  };
}

/**
 * Build Letter #2: B - חיצוניים - שינוי ריאלי
 * Components: header + annual-fee-real-change + payment + footer
 */
function buildLetterHtml(): string {
  // Read the 4 components
  const header = readTemplate('components/header.html');
  const body = readTemplate('bodies/annual-fee-real-change.html'); // ✨ NEW BODY
  const paymentSection = readTemplate('components/payment-section.html');
  const footer = readTemplate('components/footer.html');

  // Calculate years
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const previousYear = currentYear;

  // Original amount (demo)
  const originalAmount = 52000; // ₪52,000

  // Calculate all discounted amounts
  const discounts = calculateDiscounts(originalAmount);

  // Demo variables
  const companyName = 'מסעדת האחים';
  const groupName = 'קבוצת מסעדות ישראליות';

  const variables = {
    // Header
    letter_date: new Date().toLocaleDateString('he-IL'),
    company_name: companyName,
    group_name: groupName,

    // Body (annual-fee-real-change specific)
    year: nextYear.toString(),
    previous_year: previousYear.toString(),
    inflation_rate: '4',

    // Payment Section
    ...discounts,
    tax_year: nextYear.toString(),
    client_id: 'demo-client-123',
    num_checks: '8',
    check_dates_description: `החל מיום 5.1.${nextYear} ועד ליום 5.8.${nextYear}`,
  };

  // Build full HTML structure
  const fullHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מכתב גביית שכר טרחה - שינוי ריאלי - ${companyName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!--[if mso]>
    <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style type="text/css">
        /* Mobile tagline - two lines */
        @media only screen and (max-width: 600px) {
            .tagline-desktop { display: none !important; }
            .tagline-mobile { display: inline !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; direction: rtl; background-color: #ffffff; font-family: 'Assistant', 'Heebo', Arial, sans-serif;">
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
 * Convert image to base64
 */
function imageToBase64(filePath: string): string {
  return readFileSync(filePath).toString('base64');
}

/**
 * Send test email
 */
async function sendTestEmail() {
  try {
    console.log('📧 Building Letter #2 (B - חיצוניים - שינוי ריאלי) HTML...');
    const letterHtml = buildLetterHtml();

    console.log('📤 Preparing image attachments...');

    // Load images as base64
    const ticoLogo = imageToBase64('/tmp/tico_logo.png');
    const francoLogo = imageToBase64('/tmp/franco_logo.png');
    const bulletStar = imageToBase64('/tmp/bullet_star.png');

    // Calculate next year for subject
    const nextYear = new Date().getFullYear() + 1;

    console.log(`📤 Sending Letter #2 to: ${TEST_EMAIL}`);

    const msg = {
      to: TEST_EMAIL,
      from: 'shani@franco.co.il',
      replyTo: 'sigal@franco.co.il',
      subject: `[מכתב #2 - בדיקה] שכר טרחתנו לשנת המס ${nextYear} - שינוי ריאלי`,
      html: letterHtml,
      attachments: [
        {
          content: ticoLogo,
          filename: 'tico_logo.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'tico_logo'
        },
        {
          content: francoLogo,
          filename: 'franco_logo.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'franco_logo'
        },
        {
          content: bulletStar,
          filename: 'bullet_star.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'bullet_star'
        }
      ]
    };

    const [response] = await sgMail.send(msg);

    console.log('✅ Email sent successfully!');
    console.log('   Letter Type: B - חיצוניים - שינוי ריאלי');
    console.log('   Body File: annual-fee-real-change.html');
    console.log('   Status:', response.statusCode);
    console.log('   Message ID:', response.headers['x-message-id']);
    console.log('   Sent to:', TEST_EMAIL);
    console.log('   Images: Embedded as CID attachments');
    console.log('\n🎉 Check your inbox at', TEST_EMAIL);
  } catch (error) {
    console.error('❌ Failed to send email:', error);

    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }

    process.exit(1);
  }
}

// Run the script
console.log('🚀 TicoVision - Send Letter Body #2\n');
console.log('📝 Letter Type: B - חיצוניים - שינוי ריאלי');
console.log('📧 Target Email:', TEST_EMAIL);
console.log('');
sendTestEmail();
