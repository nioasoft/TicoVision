#!/usr/bin/env tsx
/**
 * Production Test: Send payment letter with ₪1 payment
 * This sends a real email to company email with a real Cardcom payment link
 */

import 'dotenv/config';
import sgMail from '@sendgrid/mail';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Configuration
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || 'office@ticovision.com';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ticovision.com';

const CARDCOM_TERMINAL = process.env.VITE_CARDCOM_TERMINAL;
const CARDCOM_USERNAME = process.env.VITE_CARDCOM_USERNAME;

if (!SENDGRID_API_KEY) {
  console.error('❌ Missing SENDGRID_API_KEY in .env.local');
  process.exit(1);
}

if (!CARDCOM_TERMINAL || !CARDCOM_USERNAME) {
  console.error('❌ Missing Cardcom credentials in .env.local');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Create Cardcom payment link with API v11
 */
async function createCardcomPaymentLink(
  amount: number,
  maxPayments: number,
  description: string
): Promise<string> {
  // API v11 uses JSON format
  const body = {
    TerminalNumber: CARDCOM_TERMINAL,
    ApiName: CARDCOM_USERNAME,
    Amount: amount,
    Operation: 'ChargeOnly',
    Language: 'he',
    ISOCoinId: 1, // ILS
    ProductName: description,
    SuccessRedirectUrl: 'https://www.google.com/search?q=payment+success',
    FailedRedirectUrl: 'https://www.google.com/search?q=payment+error',
    WebHookUrl: 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/cardcom-webhook',
    ...(maxPayments > 1 && {
      UIDefinition: {
        MinNumOfPayments: 1,
        MaxNumOfPayments: maxPayments,
      }
    }),
  };

  console.log(`\n📡 Creating Cardcom payment page (${maxPayments} payments)...`);
  console.log(`   Amount: ₪${amount.toLocaleString('he-IL')}`);

  const response = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/Create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const responseText = await response.text();

  // Parse JSON response
  const jsonResponse = JSON.parse(responseText);
  const returnCode = jsonResponse.ResponseCode?.toString() || '';
  const lowProfileId = jsonResponse.LowProfileId || '';
  const description_response = jsonResponse.Description || '';
  const paymentUrl = jsonResponse.Url || '';

  if (returnCode !== '0') {
    throw new Error(`Cardcom error: ${description_response} (code: ${returnCode})`);
  }

  if (!lowProfileId || !paymentUrl) {
    throw new Error('No payment URL received from Cardcom');
  }

  console.log(`✅ Payment page created!`);
  console.log(`   URL: ${paymentUrl}`);
  console.log(`   LowProfileId: ${lowProfileId}`);

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
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

/**
 * Build letter with real payment links
 */
async function buildLetterWithRealPaymentLinks(): Promise<string> {
  console.log('\n🎨 Building letter HTML...\n');

  console.log('💳 Creating REAL payment link for ₪1...');
  console.log('   This may take a few seconds...\n');

  // Create single payment link for ₪1
  const paymentLink = await createCardcomPaymentLink(
    1.0, // ₪1
    1,
    'בדיקת מערכת - תשלום של שקל אחד'
  );

  console.log('\n✅ Payment link created successfully!\n');

  // Read templates
  const header = readTemplate('letter-header.html');
  const body = readTemplate('letter-body-annual-fee.html');
  const footer = readTemplate('letter-footer.html');

  // Prepare variables
  const currentDate = new Date();
  const israeliDate = currentDate.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const variables = {
    // Header
    letter_date: israeliDate,
    company_name: 'חברת הדגמה בע"מ',
    group_name: 'קבוצת הדגמה',

    // Footer - Payment Section (all same ₪1 link for testing)
    amount_single: '1',
    amount_4_payments: '1',
    amount_bank: '1',
    amount_checks: '1',
    discount_single: '0',
    discount_4_payments: '0',
    payment_link_single: paymentLink,
    payment_link_4_payments: paymentLink,
    client_id: 'DEMO-123',

    // Body - Annual fee letter
    year: currentDate.getFullYear().toString(),
    inflation_rate: '0%'
  };

  // Build complete letter
  const headerHtml = replaceVariables(header, variables);
  const bodyHtml = replaceVariables(body, variables);
  const footerHtml = replaceVariables(footer, variables);

  return headerHtml + bodyHtml + footerHtml;
}

/**
 * Convert image to base64
 */
function imageToBase64(filePath: string): string {
  return readFileSync(filePath).toString('base64');
}

/**
 * Send production test email
 */
async function sendProductionTest() {
  console.log('🚀 TicoVision - Production Test (₪1 Payment)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Build letter with real payment link
    const letterHtml = await buildLetterWithRealPaymentLinks();

    console.log('📤 Preparing email attachments...');
    const ticoLogo = imageToBase64(resolve(process.cwd(), 'public/brand/tico_logo_240.png'));
    const francoLogo = imageToBase64(resolve(process.cwd(), 'public/brand/franco-logo.png'));

    console.log(`\n📧 Sending email to: ${COMPANY_EMAIL}`);

    const msg = {
      to: COMPANY_EMAIL,
      from: {
        email: FROM_EMAIL,
        name: 'TICO - מערכת CRM'
      },
      subject: '🧪 בדיקת מערכת - תשלום ₪1',
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
        }
      ]
    };

    const result = await sgMail.send(msg);

    console.log('\n✅ Email sent successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   📧 Sent to: ${COMPANY_EMAIL}`);
    console.log(`   📨 Message ID: ${result[0].headers['x-message-id']}`);
    console.log(`   🎨 Images: Embedded as CID attachments`);
    console.log(`   💳 Payment Amount: ₪1.00`);

    console.log('\n🎉 SUCCESS! Check your inbox at:', COMPANY_EMAIL);

    console.log('\n📝 Testing Instructions:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open the email in your inbox');
    console.log('2. Click on "שלם עכשיו" button');
    console.log('3. You will see Cardcom payment page');
    console.log('4. Use test card: 4580-0000-0000-0000');
    console.log('5. CVV: 123, Expiry: 12/26, ID: 123456789');
    console.log('6. Complete the ₪1 payment');
    console.log('7. Verify you receive success confirmation');
    console.log('\n⚠️  NOTE: This is a REAL payment in DEMO mode');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ Failed to send email:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
sendProductionTest();
