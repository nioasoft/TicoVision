/**
 * Test script to send a demo letter via SendGrid
 * Usage: tsx scripts/test-send-letter.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import sgMail from '@sendgrid/mail';

// Load environment variables
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'asaf@example.com'; // Replace with your email

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
 * Build complete letter HTML
 */
function buildLetterHtml(): string {
  // Read complete email template
  const letterHtml = readTemplate('letter-email-complete.html');

  // Calculate next year (always one year ahead)
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Original amount (from fee calculation system)
  const originalAmount = 10000; // Demo amount: ₪10,000

  // Calculate all discounted amounts
  const discounts = calculateDiscounts(originalAmount);

  // Demo variables
  const variables = {
    // Header
    letter_date: '20.10.2025',
    company_name: 'חברת דמו בע"מ',
    group_name: 'קבוצת דמו',

    // Body
    year: nextYear.toString(), // Always next year (2026 for 2025)
    inflation_rate: '4.2',

    // Footer - Payment (NEW)
    ...discounts,
    tax_year: nextYear.toString(),
    client_id: 'demo-client-123',
  };

  return replaceVariables(letterHtml, variables);
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
    console.log('📧 Building letter HTML...');
    const letterHtml = buildLetterHtml();

    console.log('📤 Preparing image attachments...');

    // Load images as base64
    const ticoLogo = imageToBase64('/tmp/tico_logo.png');
    const francoLogo = imageToBase64('/tmp/franco_logo.png');
    const bulletStar = imageToBase64('/tmp/bullet_star.png');

    // Calculate next year for subject
    const nextYear = new Date().getFullYear() + 1;

    console.log('📤 Sending test email to:', TEST_EMAIL);

    const msg = {
      to: TEST_EMAIL,
      from: 'shani@franco.co.il',
      replyTo: 'sigal@franco.co.il',
      subject: `[בדיקה] שכר טרחתנו לשנת המס ${nextYear}`,
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
    console.log('   Status:', response.statusCode);
    console.log('   Message ID:', response.headers['x-message-id']);
    console.log('   Sent to:', TEST_EMAIL);
    console.log('   Images: Embedded as CID attachments');
    console.log('\n🎉 Check your inbox!');
  } catch (error) {
    console.error('❌ Failed to send email:', error);

    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }

    process.exit(1);
  }
}

// Run the script
console.log('🚀 TicoVision - Letter Email Test\n');
sendTestEmail();
