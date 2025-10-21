/**
 * Test Cardcom Credentials
 * בודק אם ה-credentials של Cardcom שהוגדרו ב-.env.local עובדים
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// טען את .env.local
const envPath = resolve(process.cwd(), '.env.local');
console.log(`📁 מנסה לטעון: ${envPath}`);
console.log(`✅ הקובץ קיים: ${existsSync(envPath)}`);

const result = config({ path: envPath, override: true });
if (result.error) {
  console.error('❌ שגיאה בטעינת .env.local:', result.error);
  process.exit(1);
}

const CARDCOM_BASE_URL_OLD = 'https://secure.cardcom.solutions/Interface';
const CARDCOM_BASE_URL_NEW = 'https://secure.cardcom.solutions/api/v11';

interface CardcomTestResponse {
  success: boolean;
  returnCode: string;
  description: string;
  lowProfileCode?: string;
}

async function testCardcomCredentials(): Promise<CardcomTestResponse> {
  const terminal = process.env.VITE_CARDCOM_TERMINAL;
  const username = process.env.VITE_CARDCOM_USERNAME;
  const apiKey = process.env.VITE_CARDCOM_API_KEY;
  const env = process.env.VITE_CARDCOM_ENV;

  console.log('\n🔍 בודק Credentials של Cardcom...\n');
  console.log(`📍 סביבה: ${env}`);
  console.log(`🔢 Terminal: ${terminal}`);
  console.log(`👤 Username: ${username}`);
  console.log(`🔑 API Key: ${apiKey || 'לא מוגדר'}\n`);

  if (!terminal || !username) {
    return {
      success: false,
      returnCode: 'ERROR',
      description: 'חסרים credentials ב-.env.local',
    };
  }

  try {
    // נסה את API v11 (JSON format)
    const bodyJson = {
      TerminalNumber: terminal,
      ApiName: username,
      Amount: 100.5,
      Operation: 'ChargeOnly',
      Language: 'he',
      ISOCoinId: 1,
      ProductName: 'בדיקת credentials',
      SuccessRedirectUrl: 'https://www.google.com',
      FailedRedirectUrl: 'https://www.google.com', // Maybe it's "Failed" not "Error"
      WebHookUrl: 'https://webhook.site/unique-id',
    };

    console.log('🌐 שולח בקשה ל-Cardcom API v11...\n');
    console.log('📦 Body:', JSON.stringify(bodyJson, null, 2), '\n');

    const response = await fetch(`${CARDCOM_BASE_URL_NEW}/LowProfile/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyJson),
    });

    const responseText = await response.text();
    console.log('📨 תשובה מ-Cardcom:\n', responseText, '\n');

    // Try to parse as JSON first
    let returnCode = '';
    let description = '';
    let lowProfileCode: string | undefined = undefined;

    try {
      const jsonResponse = JSON.parse(responseText);
      returnCode = jsonResponse.ResponseCode?.toString() || '';
      description = jsonResponse.Description || '';
      lowProfileCode = jsonResponse.LowProfileId || undefined;
    } catch {
      // Fallback to URL params if not JSON
      const responseParams = new URLSearchParams(responseText);
      returnCode = responseParams.get('ReturnCode') || responseParams.get('ResponseCode') || '';
      description = responseParams.get('Description') || '';
      lowProfileCode = responseParams.get('LowProfileCode') || responseParams.get('LowProfileId') || undefined;
    }

    return {
      success: returnCode === '0',
      returnCode,
      description,
      lowProfileCode,
    };
  } catch (error) {
    return {
      success: false,
      returnCode: 'EXCEPTION',
      description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
    };
  }
}

// הרץ את הבדיקה
testCardcomCredentials().then((result) => {
  console.log('\n' + '='.repeat(60));

  if (result.success) {
    console.log('✅ הצלחה! Credentials עובדים!');
    console.log(`🔗 Low Profile Code: ${result.lowProfileCode}`);
    console.log(`📄 תיאור: ${result.description}`);
    console.log('\n🎉 אפשר להשתמש ב-credentials האלה לתשלומים!');
  } else {
    console.log('❌ שגיאה! Credentials לא עובדים');
    console.log(`🔴 קוד שגיאה: ${result.returnCode}`);
    console.log(`📄 תיאור: ${result.description}`);
    console.log('\n💡 פתרונות אפשריים:');
    console.log('1. בדוק את ה-credentials ב-.env.local');
    console.log('2. ודא שהמסוף מופעל במערכת Cardcom');
    console.log('3. בדוק שהמודול Low Profile מופעל');
    console.log('4. פנה לתמיכת Cardcom: support@cardcom.co.il');
  }

  console.log('='.repeat(60) + '\n');

  process.exit(result.success ? 0 : 1);
});
