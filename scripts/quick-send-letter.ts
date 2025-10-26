/**
 * Quick test: Send letter B (real change) to Benatia.Asaf@gmail.com
 * Usage: TEST_EMAIL=your@email.com npx tsx scripts/quick-send-letter.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import sgMail from '@sendgrid/mail';
import 'dotenv/config';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'Benatia.Asaf@gmail.com';

if (!SENDGRID_API_KEY) {
  console.error('❌ Error: SENDGRID_API_KEY not found');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

function readTemplate(fileName: string): string {
  const filePath = resolve(process.cwd(), 'templates', fileName);
  return readFileSync(filePath, 'utf-8');
}

function replaceVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

function calculateDiscounts(originalAmount: number) {
  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString('he-IL');
  };

  return {
    amount_original: formatNumber(originalAmount),
    amount_after_bank: formatNumber(originalAmount * 0.91),
    amount_after_single: formatNumber(originalAmount * 0.92),
    amount_after_payments: formatNumber(originalAmount * 0.96),
  };
}

function imageToBase64(filePath: string): string {
  const fullPath = resolve(process.cwd(), 'public', filePath);
  return readFileSync(fullPath).toString('base64');
}

async function sendLetter() {
  try {
    console.log('📧 Building letter B (real change)...');

    // Read components
    const header = readTemplate('components/header.html');
    const body = readTemplate('bodies/annual-fee-real-change.html'); // Body B
    const paymentSection = readTemplate('components/payment-section.html');
    const footer = readTemplate('components/footer.html');

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const previousYear = currentYear;
    const originalAmount = 52000;

    const discounts = calculateDiscounts(originalAmount);

    const variables = {
      letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),
      company_name: 'מסעדת האחים',
      group_name: 'קבוצת מסעדות ישראליות',
      year: nextYear.toString(),
      previous_year: previousYear.toString(),
      inflation_rate: '4',
      ...discounts,
      tax_year: nextYear.toString(),
      client_id: 'demo-client-123',
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

    const letterHtml = replaceVariables(fullHtml, variables);

    console.log('📤 Preparing images...');
    const ticoLogo = imageToBase64('brand/tico_logo_240.png');
    const francoLogo = imageToBase64('brand/franco-logo.png');
    const bulletStar = imageToBase64('brand/bullet-star.png');

    console.log('📤 Sending to:', TEST_EMAIL);

    const msg = {
      to: TEST_EMAIL,
      from: 'shani@franco.co.il',
      replyTo: 'sigal@franco.co.il',
      subject: `[בדיקה] שכר טרחתנו לשנת המס ${nextYear} - מכתב B`,
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
    console.log('   Sent to:', TEST_EMAIL);
    console.log('   Template: B - חיצוניים - שינוי ריאלי');
    console.log('\n🎉 Check your inbox!');

  } catch (error) {
    console.error('❌ Failed to send:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

console.log('🚀 Quick Letter Send - Body B\n');
sendLetter();
