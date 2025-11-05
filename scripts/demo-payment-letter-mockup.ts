/**
 * Demo: Send letter with MOCKUP payment links
 * Shows exactly how the letter will look with payment buttons
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'Benatia.Asaf@gmail.com';

if (!SENDGRID_API_KEY) {
  console.error('❌ Error: SENDGRID_API_KEY not found');
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
 * Format currency in Hebrew
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('he-IL');
}

/**
 * Build complete letter HTML with mockup payment links
 */
async function buildLetterWithMockupLinks(): Promise<string> {
  console.log('\n🎨 Building letter HTML...');

  // Read the 4 components
  const header = readTemplate('components/header.html');
  const body = readTemplate('bodies/annual-fee.html');
  const paymentSection = readTemplate('components/payment-section.html');
  const footer = readTemplate('components/footer.html');

  // Calculate amounts (demo: ₪52,000 base) - ALWAYS ROUND UP
  const baseAmount = 52000;
  const amountSingle = Math.ceil(baseAmount * 0.92); // 8% discount - rounded up
  const amount4Payments = Math.ceil(baseAmount * 0.96); // 4% discount - rounded up
  const discountSingle = baseAmount - amountSingle;
  const discount4Payments = baseAmount - amount4Payments;

  // MOCKUP payment links - pointing to our payment pages
  const paymentLinkSingle = 'http://localhost:5173/templates/payment-credit-single.html';
  const paymentLink4Payments = 'http://localhost:5173/templates/payment-credit-installments.html';

  console.log('✅ Using mockup payment links (will show placeholder pages)');

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  const variables = {
    // Header
    letter_date: new Date().toLocaleDateString('he-IL'),
    company_name: 'רשת מסעדות טעים בע"מ',
    group_name: 'קבוצת מסעדות ישראליות',

    // Body
    year: nextYear.toString(),
    inflation_rate: '4',

    // Payment Section - MOCKUP LINKS
    payment_link_single: paymentLinkSingle,
    payment_link_4_payments: paymentLink4Payments,

    amount_original: formatCurrency(baseAmount),
    amount_after_single: formatCurrency(amountSingle), // 8% discount
    amount_after_payments: formatCurrency(amount4Payments), // 4% discount
    amount_per_installment: formatCurrency(Math.ceil(amount4Payments / 4)),
    amount_after_bank: formatCurrency(Math.ceil(baseAmount * 0.91)), // 9% discount
    amount_checks: formatCurrency(baseAmount),

    discount_single: formatCurrency(discountSingle),
    discount_4_payments: formatCurrency(discount4Payments),

    tax_year: nextYear.toString(),
    client_id: 'DEMO-2025-001',
    num_checks: '8',
    check_dates_description: `החל מיום 5.1.${nextYear} ועד ליום 5.8.${nextYear}`,
  };

  // Build full HTML
  const fullHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מכתב - ${variables.company_name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style type="text/css">
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
 * Send demo email
 */
async function sendDemoLetter() {
  console.log('🚀 TicoVision - Demo Payment Letter (Mockup)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const letterHtml = await buildLetterWithMockupLinks();

    console.log('\n📤 Preparing email attachments...');
    const ticoLogo = imageToBase64('/tmp/tico_logo.png');
    const francoLogo = imageToBase64('/tmp/franco_logo.png');
    const bulletStar = imageToBase64('/tmp/bullet_star.png');

    const nextYear = new Date().getFullYear() + 1;

    console.log(`\n📧 Sending email to: ${TEST_EMAIL}`);

    const msg = {
      to: TEST_EMAIL,
      from: 'shani@franco.co.il',
      replyTo: 'sigal@franco.co.il',
      subject: `[DEMO - UI Mockup] שכר טרחתנו לשנת המס ${nextYear}`,
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

    console.log('\n✅ Email sent successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📧 Sent to: ${TEST_EMAIL}`);
    console.log(`   📨 Message ID: ${response.headers['x-message-id']}`);
    console.log(`   🎨 Images: Embedded as CID attachments`);
    console.log(`   💳 Payment Links: Mockup (placeholder pages)`);

    console.log('\n🎉 SUCCESS! Check your inbox at:', TEST_EMAIL);
    console.log('\n📝 What you\'ll see:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Beautiful letter with all sections (header, body, payment, footer)');
    console.log('✅ 4 payment options with amounts and discounts');
    console.log('✅ Payment buttons (currently point to placeholder pages)');
    console.log('✅ Hebrew RTL layout with proper formatting');
    console.log('\n⚠️  To get REAL Cardcom links:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Contact Tiko for Cardcom credentials:');
    console.log('   - Terminal Number (מספר מסוף)');
    console.log('   - API Username');
    console.log('   - API Key/Password');
    console.log('2. Update .env.local with real credentials');
    console.log('3. Run: npx tsx scripts/demo-payment-letter.ts');
    console.log('4. Real Cardcom payment pages will be created!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Failed to send email:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
sendDemoLetter();
