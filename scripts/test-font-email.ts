import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found in environment variables');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

// Email configuration
const FROM_EMAIL = 'shani@franco.co.il';
const TO_EMAILS = [
  'Benatia.Asaf@gmail.com',
  'tico@franco.co.il',
  'yifat@anz.co.il'
];
const SUBJECT = 'בדיקת פונטים עבריים';

// The text content to test with different fonts
const TEXT_CONTENT = `
בפתח הדברים, ברצוננו:
•	<strong>להודות לכם</strong> על הבעת האמון המקצועי אותו הנכם רוחשים למשרדנו – בכך שבחרתם בנו לשמש כרואי החשבון שלכם.
•	כמו כן, משרדנו <strong>נאמן לעיקרון המקודש</strong> שלו מזה עשרות שנים, לא לחייב אתכם בחיוב חריג בשום אופן וצורה, למעט שכר הטרחה השנתי המבוקש, כמדי תחילת שנה.
`.trim();

// Fonts to test
const FONTS = [
  { name: 'Open Sans', nameHebrew: 'אופן סאנס', googleFont: 'Open+Sans:400,700' },
  { name: 'Heebo', nameHebrew: 'היבו', googleFont: 'Heebo:400,700' },
  { name: 'Assistant', nameHebrew: 'אסיסטנט', googleFont: 'Assistant:400,700' },
  { name: 'Frank Ruhl Libre', nameHebrew: 'פרנק רוהל ליברה', googleFont: 'Frank+Ruhl+Libre:400,700' },
  { name: 'Noto Sans Hebrew', nameHebrew: 'נוטו סאנס עברית', googleFont: 'Noto+Sans+Hebrew:400,700' },
  { name: 'Alef', nameHebrew: 'אלף', googleFont: 'Alef:400,700' },
  { name: 'David Libre', nameHebrew: 'דוד ליברה', googleFont: 'David+Libre:400,700' }
];

// Generate HTML content with all fonts
function generateHTML(): string {
  // Google Fonts import
  const fontImports = FONTS.map(f => f.googleFont).join('&family=');

  // Generate sections for each font
  const fontSections = FONTS.map((font, index) => `
    <div style="margin-bottom: 40px;">
      <h2 style="font-family: Arial, sans-serif; color: #333; font-size: 18px; margin-bottom: 10px; text-align: right;">
        ${font.nameHebrew} (${font.name})
      </h2>
      <div style="font-family: '${font.name}', Arial, sans-serif; font-size: 16px; line-height: 1.8; direction: rtl; text-align: right; color: #000;">
        ${TEXT_CONTENT}
      </div>
      ${index < FONTS.length - 1 ? '<hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">' : ''}
    </div>
  `).join('\n');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=${fontImports}&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .container {
      background-color: #ffffff;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 40px;
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>בדיקת פונטים עבריים - Font Testing</h1>
    ${fontSections}
  </div>
</body>
</html>
  `.trim();
}

// Send email function
async function sendTestEmail() {
  try {
    console.log('📧 Preparing to send font testing email...\n');
    console.log(`From: ${FROM_EMAIL}`);
    console.log(`To: ${TO_EMAILS.join(', ')}`);
    console.log(`Subject: ${SUBJECT}\n`);

    const htmlContent = generateHTML();

    const msg = {
      to: TO_EMAILS,
      from: FROM_EMAIL,
      subject: SUBJECT,
      html: htmlContent,
    };

    const response = await sgMail.send(msg);

    console.log('✅ Email sent successfully!\n');
    console.log(`Message ID: ${response[0].headers['x-message-id']}`);
    console.log(`Status Code: ${response[0].statusCode}\n`);
    console.log('📬 Check the following inboxes:');
    TO_EMAILS.forEach(email => console.log(`   - ${email}`));

  } catch (error: any) {
    console.error('❌ Error sending email:');
    if (error.response) {
      console.error(`Status: ${error.response.statusCode}`);
      console.error(`Body: ${JSON.stringify(error.response.body, null, 2)}`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Run the script
sendTestEmail();
