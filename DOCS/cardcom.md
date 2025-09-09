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

### Base URLs
```typescript
const CARDCOM_URLS = {
  production: 'https://secure.cardcom.solutions/Interface',
  test: 'https://secure.cardcom.solutions/Interface',
  
  // API Endpoints
  lowProfile: '/LowProfile.aspx',
  createInvoice: '/CreateInvoice.aspx',
  chargeToken: '/ChargeToken.aspx',
  getTransaction: '/GetTransaction.aspx'
};
```

### Low Profile Integration (Recommended)
```typescript
// services/cardcom.service.ts
import { supabase } from '@/lib/supabase';

interface CardcomConfig {
  terminalNumber: string;
  apiUsername: string;
  apiLevel: 10 | 11; // 10=Name/Value, 11=JSON
  language: 'he' | 'en';
}

export class CardcomService {
  private config: CardcomConfig;
  private baseUrl = import.meta.env.VITE_CARDCOM_ENV === 'production' 
    ? 'https://secure.cardcom.solutions/Interface'
    : 'https://secure.cardcom.solutions/Interface';
  
  constructor() {
    this.config = {
      terminalNumber: import.meta.env.VITE_CARDCOM_TERMINAL || '1000',
      apiUsername: import.meta.env.VITE_CARDCOM_USERNAME || 'test9611',
      apiLevel: 10,
      language: 'he'
    };
  }
  
  /**
   * Create payment link for fee collection letter
   */
  async createPaymentLink(params: {
    clientId: string;
    amount: number;
    description: string;
    clientData: {
      name: string;
      taxId: string;
      email: string;
      phone: string;
      address?: string;
      city?: string;
    };
    invoiceLines?: Array<{
      description: string;
      price: number;
      quantity: number;
    }>;
  }): Promise<{ 
    paymentUrl: string; 
    dealId: string;
    lowProfileCode: string;
  }> {
    
    // Build form data
    const formData = new URLSearchParams({
      // Basic configuration
      Operation: '1', // 1=Charge, 2=Credit, 3=Token
      TerminalNumber: this.config.terminalNumber,
      UserName: this.config.apiUsername,
      APILevel: '10',
      codepage: '65001', // UTF-8
      
      // Payment details
      SumToBill: params.amount.toFixed(2),
      CoinID: '1', // 1=ILS, 2=USD, 3=EUR
      Language: this.config.language,
      ProductName: params.description,
      
      // Response URLs
      SuccessRedirectUrl: `${window.location.origin}/payment/success`,
      ErrorRedirectUrl: `${window.location.origin}/payment/error`,
      IndicatorUrl: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cardcom-webhook`,
      
      // Invoice generation
      CreateInvoice: 'true',
      'InvoiceHead.CustName': params.clientData.name,
      'InvoiceHead.CompID': params.clientData.taxId,
      'InvoiceHead.Email': params.clientData.email,
      'InvoiceHead.CustMobilePH': params.clientData.phone,
      'InvoiceHead.CustAddresLine1': params.clientData.address || '',
      'InvoiceHead.CustCity': params.clientData.city || '',
      
      // Custom identifier
      ReturnValue: params.clientId,
      
      // Optional: Allow saving card for future use
      CreateToken: 'true'
    });
    
    // Add invoice lines
    if (params.invoiceLines) {
      params.invoiceLines.forEach((line, index) => {
        formData.append(`InvoiceLines${index}.Description`, line.description);
        formData.append(`InvoiceLines${index}.Price`, line.price.toFixed(2));
        formData.append(`InvoiceLines${index}.Quantity`, line.quantity.toString());
      });
    } else {
      // Default single line
      formData.append('InvoiceLines1.Description', params.description);
      formData.append('InvoiceLines1.Price', params.amount.toFixed(2));
      formData.append('InvoiceLines1.Quantity', '1');
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/LowProfile.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
      
      const responseText = await response.text();
      
      // Parse response
      const lowProfileCode = responseText.match(/LowProfileCode=([^&]+)/)?.[1];
      const responseCode = responseText.match(/ResponseCode=(\d+)/)?.[1];
      const description = responseText.match(/Description=([^&]+)/)?.[1];
      
      if (responseCode !== '0' || !lowProfileCode) {
        throw new Error(decodeURIComponent(description || 'Failed to create payment link'));
      }
      
      // Build payment URL
      const paymentUrl = `https://secure.cardcom.solutions/External/LowProfile/Buy.aspx?LowProfileCode=${lowProfileCode}`;
      
      // Save transaction to database
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .insert({
          tenant_id: (await supabase.auth.getUser()).data.user?.user_metadata.tenant_id,
          client_id: params.clientId,
          cardcom_deal_id: lowProfileCode,
          amount: params.amount,
          currency: 'ILS',
          status: 'pending',
          payment_link: paymentUrl,
          payment_method: 'credit_card',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      return {
        paymentUrl,
        dealId: transaction.id,
        lowProfileCode
      };
      
    } catch (error) {
      console.error('Cardcom API Error:', error);
      throw new Error('Failed to create payment link');
    }
  }
  
  /**
   * Create invoice without charging (for bank transfers, etc.)
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

### Test Credentials
```typescript
const TEST_CONFIG = {
  terminal: '1000',
  username: 'test9611',
  // Test credit cards
  cards: {
    visa: '4111111111111111',
    mastercard: '5555555555554444',
    israelcard: '3700000000000002'
  },
  cvv: '123',
  expiryDate: '12/25'
};
```

### Integration Tests
```typescript
// tests/cardcom.test.ts
import { describe, it, expect } from 'vitest';