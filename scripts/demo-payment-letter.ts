/**
 * Demo: Send letter with REAL Cardcom payment links
 * This will create actual payment pages on Cardcom Sandbox
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'Benatia.Asaf@gmail.com';
const CARDCOM_TERMINAL = process.env.VITE_CARDCOM_TERMINAL || '1000';
const CARDCOM_USERNAME = process.env.VITE_CARDCOM_USERNAME || 'test9611';

if (!SENDGRID_API_KEY) {
  console.error('❌ Error: SENDGRID_API_KEY not found');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Create payment page on Cardcom Sandbox
 */
async function createCardcomPaymentLink(
  amount: number,
  maxPayments: number,
  description: string
): Promise<string> {
  const params = new URLSearchParams({
    TerminalNumber: CARDCOM_TERMINAL,
    UserName: CARDCOM_USERNAME,
    APILevel: '10',
    codepage: '65001', // UTF-8
    Operation: '1', // 1=Charge
    Language: 'he',
    CoinID: '1', // ILS
    SumToBill: amount.toFixed(2),
    ProductName: description,
    MaxNumOfPayments: maxPayments.toString(),

    // Success/Error URLs (will redirect to our app)
    SuccessRedirectUrl: 'http://localhost:5173/payment/success',
    ErrorRedirectUrl: 'http://localhost:5173/payment/error',

    // Customer details (demo)
    CustomerName: 'שרה לוי',
    CustomerEmail: TEST_EMAIL,
    CustomerPhone: '052-6633663',

    // NO CreateInvoice for test environment - it requires real terminal
  });

  console.log(`\n📡 Creating Cardcom payment page (${maxPayments} payments)...`);
  console.log(`   Amount: ₪${amount.toLocaleString('he-IL')}`);

  const response = await fetch('https://secure.cardcom.solutions/Interface/LowProfile.aspx', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  const responseText = await response.text();
  console.log(`   Raw response: ${responseText.substring(0, 200)}...`);

  // Parse response
  const responseParams = new URLSearchParams(responseText);
  const returnCode = responseParams.get('ReturnCode');
  const lowProfileCode = responseParams.get('LowProfileCode');
  const description_response = responseParams.get('Description');

  if (returnCode !== '0') {
    throw new Error(`Cardcom error: ${description_response} (code: ${returnCode})`);
  }

  if (!lowProfileCode) {
    throw new Error('No LowProfileCode received from Cardcom');
  }

  const paymentUrl = `https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=${lowProfileCode}`;

  console.log(`✅ Payment page created!`);
  console.log(`   URL: ${paymentUrl}`);
  console.log(`   LowProfileCode: ${lowProfileCode}`);

  return paymentUrl;
}

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
 * Build complete letter HTML with REAL payment links
 */
async function buildLetterWithRealPaymentLinks(): Promise<string> {
  console.log('\n🎨 Building letter HTML...');

  // Read the 4 components
  const header = readTemplate('components/header.html');
  const body = readTemplate('bodies/annual-fee.html');
  const paymentSection = readTemplate('components/payment-section.html');
  const footer = readTemplate('components/footer.html');

  // Calculate amounts (demo: ₪52,000 base)
  const baseAmount = 52000;
  const amountSingle = Math.round(baseAmount * 0.92); // 8% discount: ₪47,840
  const amount4Payments = Math.round(baseAmount * 0.96); // 4% discount: ₪49,920
  const discountSingle = baseAmount - amountSingle; // ₪4,160
  const discount4Payments = baseAmount - amount4Payments; // ₪2,080

  console.log('\n💳 Creating REAL payment links on Cardcom Sandbox...');
  console.log('   This may take a few seconds...');

  // Create REAL payment links via Cardcom API
  const paymentLinkSingle = await createCardcomPaymentLink(
    amountSingle,
    1,
    'שכר טרחה לשנת 2026 - תשלום אחד'
  );

  const paymentLink4Payments = await createCardcomPaymentLink(
    amount4Payments,
    4,
    'שכר טרחה לשנת 2026 - 4 תשלומים'
  );

  console.log('\n✅ Both payment links created successfully!');

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

    // Payment Section - WITH REAL CARDCOM LINKS! 🎉
    payment_link_single: paymentLinkSingle,
    payment_link_4_payments: paymentLink4Payments,

    amount_original: formatCurrency(baseAmount),
    amount_single: formatCurrency(amountSingle),
    amount_4_payments: formatCurrency(amount4Payments),
    amount_per_installment: formatCurrency(Math.round(amount4Payments / 4)),
    amount_bank: formatCurrency(amountSingle),
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
 * Send test email with REAL payment links
 */
async function sendDemoPaymentLetter() {
  console.log('🚀 TicoVision - Demo Payment Letter with REAL Cardcom Links\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Build letter with real payment links
    const letterHtml = await buildLetterWithRealPaymentLinks();

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
      subject: `[DEMO - Cardcom Sandbox] שכר טרחתנו לשנת המס ${nextYear}`,
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
    console.log(`   💳 Payment Links: REAL Cardcom Sandbox URLs!`);

    console.log('\n🎉 SUCCESS! Check your inbox at:', TEST_EMAIL);
    console.log('\n📝 Testing Instructions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open the email and click on any payment link');
    console.log('2. You will be redirected to Cardcom payment page');
    console.log('3. Use these TEST credit card details:');
    console.log('   💳 Card: 4580000000000000 (Visa)');
    console.log('   📅 Expiry: 12/26');
    console.log('   🔒 CVV: 123');
    console.log('   🆔 ID: 123456789');
    console.log('4. Click "שלם עכשיו" (Pay Now)');
    console.log('5. You should see success page!');
    console.log('\n⚠️  IMPORTANT: These are SANDBOX links - no real money!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Failed to send email:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      if ('response' in error) {
        console.error('   Response:', (error as any).response?.body);
      }
    }
    process.exit(1);
  }
}

// Run the script
sendDemoPaymentLetter();
