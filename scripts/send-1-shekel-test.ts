#!/usr/bin/env tsx
/**
 * Production Test: Send simple email with ₪1 payment link
 */

import 'dotenv/config';
import sgMail from '@sendgrid/mail';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Configuration
const COMPANY_EMAIL = process.env.COMPANY_EMAIL || 'Benatia.Asaf@gmail.com';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = 'shani@franco.co.il'; // Verified sender in SendGrid

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
async function createCardcomPaymentLink(amount: number, description: string): Promise<string> {
  const body = {
    TerminalNumber: CARDCOM_TERMINAL,
    ApiName: CARDCOM_USERNAME,
    Amount: amount,
    Operation: 'ChargeOnly',
    Language: 'he',
    ISOCoinId: 1,
    ProductName: description,
    SuccessRedirectUrl: 'https://www.google.com/search?q=payment+success',
    FailedRedirectUrl: 'https://www.google.com/search?q=payment+error',
    WebHookUrl: 'https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/cardcom-webhook',

    // TICO Brand Customization
    UIDefinition: {
      LogoUrl: 'https://i.imgur.com/placeholder.png', // TODO: Upload TICO logo to public URL
      TopColor: '#667eea',
      BottomColor: '#764ba2',
      ButtonColor: '#667eea',
      ButtonHoverColor: '#5a67d8',
      Language: 'he',
      ShowCompanyNameOnPage: true,
      CompanyName: 'TICO - מערכת CRM לרואי חשבון',
      PageTitle: 'תשלום מאובטח - בדיקת מערכת',
      IsShowCardOwnerID: true,
      IsHideCardOwnerID: false,
      CreditCardHolderIDtext: 'תעודת זהות',
      SuccessMessage: 'התשלום בוצע בהצלחה! תודה רבה. 🎉',
      FailedMessage: 'התשלום נכשל. אנא נסה שנית או צור קשר.',
    },
  };

  console.log(`\n📡 Creating Cardcom payment link...`);
  console.log(`   Amount: ₪${amount.toLocaleString('he-IL')}`);

  const response = await fetch('https://secure.cardcom.solutions/api/v11/LowProfile/Create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const jsonResponse = JSON.parse(await response.text());

  if (jsonResponse.ResponseCode !== 0) {
    throw new Error(`Cardcom error: ${jsonResponse.Description}`);
  }

  console.log(`✅ Payment link created!`);
  console.log(`   URL: ${jsonResponse.Url}`);

  return jsonResponse.Url;
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
async function sendTest() {
  console.log('🚀 TicoVision - Production Test (₪1 Payment)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Create payment link
    const paymentUrl = await createCardcomPaymentLink(1.0, 'בדיקת מערכת - ₪1');

    console.log('\n📤 Preparing email...');

    // Load logos
    const ticoLogoNew = imageToBase64(resolve(process.cwd(), 'public/brand/Tico_logo_png_new.png'));
    const ticoLogoOld = imageToBase64(resolve(process.cwd(), 'public/brand/tico_logo_240.png'));
    const francoLogo = imageToBase64(resolve(process.cwd(), 'public/brand/franco-logo.png'));

    // Build simple Hebrew email
    const currentDate = new Date().toLocaleDateString('he-IL');

    const emailHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>בדיקת מערכת תשלומים</title>
</head>
<body style="font-family: 'Assistant', 'Heebo', Arial, sans-serif; background-color: #f5f5f5; padding: 20px; direction: rtl;">
  <div style="max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <img src="cid:tico_logo" alt="TICO Logo" style="height: 60px; margin-bottom: 20px;">
      <p style="color: #666; font-size: 14px; margin: 0;">${currentDate}</p>
    </div>

    <!-- Content -->
    <div style="text-align: right;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
        🧪 בדיקת מערכת תשלומים
      </h1>

      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        שלום,
      </p>

      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        זהו מייל בדיקה של מערכת התשלומים של TicoVision CRM.
      </p>

      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
        הלינק למטה מוביל לדף תשלום אמיתי של Cardcom עם סכום של <strong>₪1.00</strong> בלבד.
      </p>

      <!-- Payment Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="http://localhost:5173/payment?lpid=${paymentUrl.split('/').pop()?.split('?')[0]}&amount=1&description=בדיקת%20מערכת"
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; padding: 16px 48px; text-decoration: none; border-radius: 8px;
                  font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          💳 שלם ₪1 עכשיו - עמוד מעוצב
        </a>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${paymentUrl}"
           style="display: inline-block; background: #e5e7eb;
                  color: #6b7280; padding: 12px 32px; text-decoration: none; border-radius: 8px;
                  font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          או לחץ כאן לעמוד הגנרי של Cardcom
        </a>
      </div>

      <!-- Test Info -->
      <div style="background: #f8f9fa; border-right: 4px solid #667eea; padding: 20px; margin: 30px 0; border-radius: 4px;">
        <h3 style="color: #667eea; font-size: 16px; margin: 0 0 10px 0;">
          💡 פרטי כרטיס לבדיקה:
        </h3>
        <ul style="color: #666; font-size: 14px; line-height: 1.8; margin: 0; padding-right: 20px;">
          <li>מספר כרטיס: <strong>4580-0000-0000-0000</strong></li>
          <li>CVV: <strong>123</strong></li>
          <li>תוקף: <strong>12/26</strong></li>
          <li>ת.ז: <strong>123456789</strong></li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
        ⚠️ שים לב: זהו תשלום אמיתי במצב דמו של Cardcom.
      </p>

      <p style="color: #666; font-size: 14px; line-height: 1.6;">
        הסכום הוא ₪1 בלבד לצורך בדיקת התהליך.
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 60px; padding-top: 30px; border-top: 2px solid #eee; text-align: center;">
      <img src="cid:franco_logo" alt="Franco Logo" style="height: 40px; opacity: 0.6; margin-bottom: 15px;">
      <p style="color: #999; font-size: 12px; margin: 5px 0;">
        TICO - מערכת CRM לרואי חשבון
      </p>
      <p style="color: #999; font-size: 11px; margin: 5px 0; font-style: italic;">
        DARE TO THINK · COMMIT TO DELIVER
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    console.log(`\n📧 Sending email to: ${COMPANY_EMAIL}`);

    const msg = {
      to: COMPANY_EMAIL,
      from: {
        email: FROM_EMAIL,
        name: 'TICO - מערכת CRM'
      },
      subject: '🧪 בדיקת מערכת תשלומים - ₪1',
      html: emailHtml,
      attachments: [
        {
          content: ticoLogoNew,
          filename: 'tico_logo_new.png',
          type: 'image/png',
          disposition: 'inline',
          content_id: 'tico_logo_new'
        },
        {
          content: ticoLogoOld,
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
    console.log(`   💳 Payment Amount: ₪1.00`);
    console.log(`   🔗 Payment URL: ${paymentUrl}`);

    console.log('\n🎉 SUCCESS! Check your inbox at:', COMPANY_EMAIL);
    console.log('\n📝 Click the payment button and use test card: 4580-0000-0000-0000');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

sendTest();
