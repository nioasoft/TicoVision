#!/usr/bin/env tsx
/**
 * Test UIDefinition parameters with Cardcom API v11
 */

import 'dotenv/config';

const CARDCOM_TERMINAL = process.env.VITE_CARDCOM_TERMINAL;
const CARDCOM_USERNAME = process.env.VITE_CARDCOM_USERNAME;

const body = {
  TerminalNumber: CARDCOM_TERMINAL,
  ApiName: CARDCOM_USERNAME,
  Amount: 1.0,
  Operation: 'ChargeOnly',
  Language: 'he',
  ISOCoinId: 1,
  ProductName: 'בדיקת UIDefinition',
  SuccessRedirectUrl: 'https://www.google.com/search?q=success',
  FailedRedirectUrl: 'https://www.google.com/search?q=failed',
  WebHookUrl: 'https://webhook.site/test',

  // Test all possible UIDefinition parameters
  UIDefinition: {
    Language: 'he',
    TopColor: '#667eea',
    BottomColor: '#764ba2',
    ButtonColor: '#667eea',
    LogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/272px-Google_2015_logo.svg.png',
    ShowCompanyNameOnPage: true,
    CompanyName: 'TICO - בדיקת עיצוב',
    PageTitle: 'תשלום מאובטח',
  },
};

console.log('📤 Sending request to Cardcom API v11...\n');
console.log('Request body:', JSON.stringify(body, null, 2));

fetch('https://secure.cardcom.solutions/api/v11/LowProfile/Create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})
  .then(res => res.text())
  .then(text => {
    console.log('\n📥 Response from Cardcom:\n');
    console.log(text);

    const json = JSON.parse(text);

    if (json.ResponseCode === 0) {
      console.log('\n✅ Success!');
      console.log('Payment URL:', json.Url);
      console.log('\n🔗 Open this URL to see if customization worked:');
      console.log(json.Url);
    } else {
      console.log('\n❌ Error:', json.Description);
    }
  })
  .catch(err => {
    console.error('❌ Request failed:', err.message);
  });
