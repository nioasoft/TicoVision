# Cardcom Payment Integration Guide

## Overview
Complete integration guide for Cardcom payment gateway in the CRM system. Cardcom is the chosen payment processor for the Israeli market, providing credit card processing, invoicing, and payment tracking.

## Table of Contents
1. [Required Credentials](#required-credentials)
2. [API Integration](#api-integration)
3. [Service Implementation](#service-implementation)
4. [Webhook Configuration](#webhook-configuration)
5. [Security Requirements](#security-requirements)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

## Required Credentials

### From Tiko/Business Owner
```env
# Production Credentials (GET FROM TIKO)
CARDCOM_TERMINAL_NUMBER=     # מספר מסוף ייחודי
CARDCOM_API_USERNAME=         # שם משתמש API (נשלח במייל)
CARDCOM_API_PASSWORD=         # סיסמת API
CARDCOM_API_KEY=             # מפתח API מהמסוף

# Test Environment (for development)
CARDCOM_TEST_TERMINAL=1000
CARDCOM_TEST_USERNAME=test9611
CARDCOM_TEST_API_KEY=test_key
```

### Required Modules in Cardcom Console
- [ ] **Low Profile Module** - Required for payment pages
- [ ] **Documents Module** - For automatic invoicing
- [ ] **Google Pay** - Optional but recommended
- [ ] **Tokenization** - For recurring payments

## API Integration

### ⚠️ IMPORTANT: Use API v11 (JSON Format)

We are using **Cardcom API v11** which uses JSON request/response format instead of the older URL-encoded format.

### Base URLs
```typescript
const CARDCOM_URLS = {
  production: 'https://secure.cardcom.solutions/api/v11',
  test: 'https://secure.cardcom.solutions/api/v11',

  // API v11 Endpoints
  lowProfileCreate: '/LowProfile/Create',
  lowProfileGet: '/LowProfile/Get',
  transaction: '/Transactions/Transaction',
  refund: '/Transactions/Refund'
};
```

### API v11 vs Old API
| Feature | Old API (Interface) | API v11 (Recommended) |
|---------|-------------------|----------------------|
| **Format** | URLSearchParams | JSON |
| **Endpoint** | `/Interface/LowProfile.aspx` | `/api/v11/LowProfile/Create` |
| **Content-Type** | `application/x-www-form-urlencoded` | `application/json` |
| **Response** | URLSearchParams | JSON |
| **Parameters** | `ErrorRedirectUrl` | `FailedRedirectUrl` |
| **Auth Field** | `UserName` | `ApiName` |

### Low Profile Integration with API v11
```typescript
// services/cardcom.service.ts
import { supabase } from '@/lib/supabase';

interface CardcomConfig {
  terminalNumber: string;
  username: string; // Note: This is ApiName in API v11
  apiKey: string;
  language: 'he' | 'en';
}

export class CardcomService {
  private config: CardcomConfig;
  private baseUrl = 'https://secure.cardcom.solutions/api/v11';

  constructor() {
    this.config = {
      terminalNumber: import.meta.env.VITE_CARDCOM_TERMINAL || '1000',
      username: import.meta.env.VITE_CARDCOM_USERNAME || '',
      apiKey: import.meta.env.VITE_CARDCOM_API_KEY || '',
      language: 'he'
    };
  }
  
  /**
   * Create payment page using API v11 (JSON format)
   */
  async createPaymentPage(request: {
    amount: number;
    description: string;
    maxPayments?: number;
    currency?: 'ILS' | 'USD';
    successUrl?: string;
    errorUrl?: string;
    notifyUrl?: string;
  }): Promise<{
    success: boolean;
    paymentUrl?: string;
    lowProfileId?: string;
    error?: string;
  }> {
    // Build JSON request body for API v11
    const body = {
      TerminalNumber: this.config.terminalNumber,
      ApiName: this.config.username, // Note: ApiName not UserName!
      Amount: request.amount,
      Operation: 'ChargeOnly', // ChargeOnly, Token, etc.
      Language: 'he',
      ISOCoinId: request.currency === 'USD' ? 2 : 1, // 1=ILS, 2=USD
      ProductName: request.description,

      // Required URLs (note: FailedRedirectUrl not ErrorRedirectUrl!)
      SuccessRedirectUrl: request.successUrl || `${window.location.origin}/payment/success`,
      FailedRedirectUrl: request.errorUrl || `${window.location.origin}/payment/error`,
      WebHookUrl: request.notifyUrl || `${window.location.origin}/api/webhooks/cardcom`,

      // Optional: Payment installments
      ...(request.maxPayments && request.maxPayments > 1 && {
        UIDefinition: {
          MinNumOfPayments: 1,
          MaxNumOfPayments: request.maxPayments,
        }
      }),
    };

    try {
      // API v11 uses JSON format
      const response = await fetch(`${this.baseUrl}/LowProfile/Create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' // JSON not URL-encoded!
        },
        body: JSON.stringify(body)
      });

      const responseText = await response.text();

      // Parse JSON response
      const jsonResponse = JSON.parse(responseText);
      const returnCode = jsonResponse.ResponseCode?.toString() || '';
      const lowProfileId = jsonResponse.LowProfileId || '';
      const description = jsonResponse.Description || '';
      const paymentUrl = jsonResponse.Url || '';

      if (returnCode !== '0') {
        return {
          success: false,
          error: `Cardcom error: ${description} (code: ${returnCode})`
        };
      }

      if (!lowProfileId || !paymentUrl) {
        return {
          success: false,
          error: 'No payment URL received from Cardcom'
        };
      }

      return {
        success: true,
        paymentUrl,
        lowProfileId
      };

    } catch (error) {
      console.error('Cardcom API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment link'
      };
    }
  }
}
```

### Usage Example - Creating Payment Link
```typescript
// Example: Generate payment link for annual fee letter
const cardcomService = new CardcomService();

const result = await cardcomService.createPaymentPage({
  amount: 47840,
  description: 'שירותי ראיית חשבון - שנת 2025',
  maxPayments: 4, // Allow up to 4 installments
  currency: 'ILS',
  successUrl: 'https://yourdomain.com/payment/success',
  errorUrl: 'https://yourdomain.com/payment/error',
  notifyUrl: 'https://yourdomain.com/api/webhooks/cardcom'
});

if (result.success) {
  console.log('✅ Payment page created!');
  console.log('Payment URL:', result.paymentUrl);
  console.log('LowProfile ID:', result.lowProfileId);

  // Insert the payment link in your letter template:
  const paymentButton = `
    <a href="${result.paymentUrl}"
       style="background: #0066cc; color: white; padding: 12px 24px;">
      שלם עכשיו
    </a>
  `;
} else {
  console.error('❌ Failed:', result.error);
}
```

### API v11 Response Format
```json
{
  "ResponseCode": 0,
  "Description": "OK",
  "LowProfileId": "4d5e0f27-f078-428b-b65f-de139c1a4bd2",
  "Url": "https://secure.cardcom.solutions/EA/LPC6/172012/4d5e0f27-f078-428b-b65f-de139c1a4bd2?t=24",
  "UrlToPayPalExpress": ""
}
```

**Response Codes:**
- `0` = Success
- `9999` = Unknown error (usually missing required field or module not enabled)
- `5093` = Missing FailedRedirectUrl

---

## Old API - DO NOT USE
```typescript
  /**
   * ⚠️ DEPRECATED - Old API using URL-encoded format
   * Use createPaymentPage() with API v11 instead!
   */
  async createInvoiceOnly(params: {
    clientData: {
      name: string;
      taxId: string;
      email: string;
      phone: string;
      address?: string;
      city?: string;
    };
    items: Array<{
      description: string;
      price: number;
      quantity: number;
    }>;
    paymentMethod: 'BankTransfer' | 'Cash' | 'Cheque' | 'Other';
    paymentDetails?: {
      reference?: string;
      date?: string;
      amount: number;
    };
  }): Promise<{
    invoiceNumber: string;
    invoiceUrl: string;
  }> {
    
    const formData = new URLSearchParams({
      TerminalNumber: this.config.terminalNumber,
      UserName: this.config.apiUsername,
      CreateInvoice: 'true',
      DocType: '3', // 3=Invoice, 4=Invoice-Receipt
      
      // Customer details
      CustomerName: params.clientData.name,
      CompanyNumber: params.clientData.taxId,
      Email: params.clientData.email,
      Phone: params.clientData.phone,
      Address: params.clientData.address || '',
      City: params.clientData.city || '',
      
      // Language
      Language: this.config.language
    });
    
    // Add payment method
    switch (params.paymentMethod) {
      case 'BankTransfer':
        formData.append('CustomPay.TransactionID', params.paymentDetails?.reference || '');
        formData.append('CustomPay.TranDate', params.paymentDetails?.date || new Date().toLocaleDateString('he-IL'));
        formData.append('CustomPay.Sum', params.paymentDetails?.amount.toFixed(2) || '0');
        break;
      case 'Cash':
        formData.append('Cash', params.paymentDetails?.amount.toFixed(2) || '0');
        break;
      case 'Cheque':
        formData.append('Cheque.ChequeNumber', params.paymentDetails?.reference || '');
        formData.append('Cheque.DateCheque', params.paymentDetails?.date || new Date().toLocaleDateString('he-IL'));
        formData.append('Cheque.Sum', params.paymentDetails?.amount.toFixed(2) || '0');
        break;
    }
    
    // Add invoice lines
    params.items.forEach((item, index) => {
      const lineNum = index + 1;
      formData.append(`InvoiceLines${lineNum}.Description`, item.description);
      formData.append(`InvoiceLines${lineNum}.Price`, item.price.toFixed(2));
      formData.append(`InvoiceLines${lineNum}.Quantity`, item.quantity.toString());
    });
    
    const response = await fetch(`${this.baseUrl}/CreateInvoice.aspx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    const responseText = await response.text();
    
    // Parse response
    const invoiceNumber = responseText.match(/InvoiceNumber=([^&]+)/)?.[1];
    const invoiceUrl = responseText.match(/InvoiceLink=([^&]+)/)?.[1];
    const responseCode = responseText.match(/ResponseCode=(\d+)/)?.[1];
    
    if (responseCode !== '0' || !invoiceNumber) {
      throw new Error('Failed to create invoice');
    }
    
    return {
      invoiceNumber: decodeURIComponent(invoiceNumber),
      invoiceUrl: decodeURIComponent(invoiceUrl || '')
    };
  }
  
  /**
   * Check transaction status
   */
  async getTransactionStatus(dealId: string): Promise<{
    status: 'pending' | 'completed' | 'failed';
    invoiceNumber?: string;
    transactionId?: string;
    errorMessage?: string;
  }> {
    const formData = new URLSearchParams({
      TerminalNumber: this.config.terminalNumber,
      UserName: this.config.apiUsername,
      LowProfileCode: dealId
    });
    
    const response = await fetch(`${this.baseUrl}/GetTransaction.aspx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });
    
    const responseText = await response.text();
    const responseCode = responseText.match(/ResponseCode=(\d+)/)?.[1];
    const invoiceNumber = responseText.match(/InvoiceNumber=([^&]+)/)?.[1];
    const transactionId = responseText.match(/TransactionID=([^&]+)/)?.[1];
    
    if (responseCode === '0') {
      return {
        status: 'completed',
        invoiceNumber: decodeURIComponent(invoiceNumber || ''),
        transactionId: decodeURIComponent(transactionId || '')
      };
    } else if (responseCode === '999') {
      return {
        status: 'pending'
      };
    } else {
      return {
        status: 'failed',
        errorMessage: `Error code: ${responseCode}`
      };
    }
  }
}

// Export singleton instance
export const cardcomService = new CardcomService();
```

## Webhook Configuration

### Supabase Edge Function
```typescript
// supabase/functions/cardcom-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cardcom IP ranges for validation
const CARDCOM_IP_RANGES = [
  // Range 1: 82.80.227.17/29
  '82.80.227.17', '82.80.227.18', '82.80.227.19', '82.80.227.20',
  '82.80.227.21', '82.80.227.22', '82.80.227.23', '82.80.227.24',
  // Range 2: 82.80.222.124/29
  '82.80.222.124', '82.80.222.125', '82.80.222.126', '82.80.222.127',
  '82.80.222.128', '82.80.222.129', '82.80.222.130', '82.80.222.131'
];

serve(async (req) => {
  try {
    // Validate IP address
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                    req.headers.get('x-real-ip') ||
                    req.headers.get('cf-connecting-ip'); // Cloudflare
    
    if (!CARDCOM_IP_RANGES.includes(clientIP)) {
      console.error(`Unauthorized webhook attempt from IP: ${clientIP}`);
      return new Response('Unauthorized', { status: 403 });
    }
    
    // Parse form data
    let data: Record<string, string> = {};
    
    if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      // Try JSON for APILevel 11
      data = await req.json();
    }
    
    // Extract webhook data
    const {
      ResponseCode,
      DealID,
      TransactionID,
      InvoiceNumber,
      ReturnValue, // Our client_id
      Sum,
      CardOwnerID,
      CardOwnerEmail,
      CardOwnerPhone
    } = data;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Find the transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('*')
      .or(`cardcom_deal_id.eq.${DealID},client_id.eq.${ReturnValue}`)
      .single();
    
    if (fetchError || !transaction) {
      console.error('Transaction not found:', DealID, ReturnValue);
      return new Response('-1', { status: 200 }); // Still return success to Cardcom
    }
    
    // Update transaction status
    const newStatus = ResponseCode === '0' ? 'completed' : 'failed';
    
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        cardcom_transaction_id: TransactionID,
        invoice_number: InvoiceNumber,
        payment_date: ResponseCode === '0' ? new Date().toISOString() : null,
        failure_reason: ResponseCode !== '0' ? `Error code: ${ResponseCode}` : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);
    
    if (updateError) {
      console.error('Failed to update transaction:', updateError);
    }
    
    // If payment successful, update fee_calculation status
    if (ResponseCode === '0' && transaction.fee_calculation_id) {
      await supabase
        .from('fee_calculations')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.fee_calculation_id);
    }
    
    // Log webhook for audit
    await supabase
      .from('webhook_logs')
      .insert({
        source: 'cardcom',
        event_type: 'payment_update',
        payload: data,
        processed_at: new Date().toISOString(),
        ip_address: clientIP
      });
    
    // CRITICAL: Must return -1 or OK
    return new Response('-1', { 
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    // Still return success to prevent retries
    return new Response('-1', { status: 200 });
  }
});
```

## Security Requirements

### Firewall Configuration
```yaml
# Required IP ranges to whitelist
Cardcom Production IPs:
  Range 1: 82.80.227.17/29 (82.80.227.17 - 82.80.227.24)
  Range 2: 82.80.222.124/29 (82.80.222.124 - 82.80.222.131)

Required Ports:
  - 80 (HTTP)
  - 443 (HTTPS)
  - 8080 (Optional)

# Cloudflare Configuration
Page Rules:
  - /api/webhooks/cardcom - Security Level: Off
  - /api/webhooks/cardcom - SSL: Flexible
```

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "api/webhooks/cardcom.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/webhooks/cardcom",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://secure.cardcom.solutions"
        }
      ]
    }
  ]
}
```

## Testing Guide

### ✅ Verified Test Setup (Working as of Jan 2025)

#### Production Terminal in Demo Mode
The system is configured with a **real production terminal** that Cardcom automatically puts in demo mode:

```env
VITE_CARDCOM_TERMINAL=172012
VITE_CARDCOM_USERNAME=5LJTPpLcw1baDQzZCGwc
VITE_CARDCOM_API_KEY=eg3u9WciBxIF3CvGkyif
```

**Important:** When using this terminal, Cardcom displays:
> 🧪 מצב הדגמה: זהו עמוד דמו - לא יבוצע חיוב אמיתי. השתמש בכרטיס 4580-0000-0000-0000 לבדיקה.

#### Test Credit Cards (Cardcom Sandbox)
```typescript
const TEST_CARDS = {
  visa: {
    number: '4580-0000-0000-0000',
    cvv: '123',
    expiry: '12/26',
    id: '123456789'
  },
  // These also work:
  mastercard: '5555555555554444',
  israelcard: '3700000000000002'
};
```

#### Quick Test Script
```bash
# Test Cardcom API credentials
npx tsx scripts/test-cardcom-credentials.ts

# Expected output:
# ✅ Cardcom credentials are valid!
# Payment URL: https://secure.cardcom.solutions/EA/LPC6/172012/...
```

### Integration Tests
```typescript
// tests/cardcom.test.ts
import { describe, it, expect } from 'vitest';