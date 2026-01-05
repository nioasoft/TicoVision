/**
 * Supabase Edge Function: Track Payment Selection
 * Records when a client selects a payment method and redirects them
 *
 * Endpoint: GET /api/track-payment-selection?fee_id={uuid}&method={string}&client_id={uuid}
 * Response: Redirect (302) to appropriate payment page
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://ticovision.vercel.app';
const CARDCOM_ENV = Deno.env.get('CARDCOM_ENV') || 'test';
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL') || '';
const CARDCOM_USERNAME = Deno.env.get('CARDCOM_USERNAME') || '';

type PaymentMethod = 'bank_transfer' | 'cc_single' | 'cc_installments' | 'checks';

interface DiscountConfig {
  bank_transfer: number;
  cc_single: number;
  cc_installments: number;
  checks: number;
}

const DISCOUNT_RATES: DiscountConfig = {
  bank_transfer: 9,    // 9% discount
  cc_single: 8,        // 8% discount
  cc_installments: 4,  // 4% discount
  checks: 0,           // No discount
};

/**
 * Create Cardcom payment page
 */
async function createCardcomPaymentPage(
  amount: number,
  maxPayments: number,
  feeId: string,
  clientName: string,
  clientEmail?: string
): Promise<string | null> {
  try {
    console.log('💳 [Cardcom] Creating payment page:');
    console.log('  - Amount:', amount);
    console.log('  - Max payments:', maxPayments);
    console.log('  - Fee ID:', feeId);
    console.log('  - Client Name:', clientName);
    console.log('  - Client Email:', clientEmail || 'NO EMAIL');
    console.log('  - Terminal:', CARDCOM_TERMINAL ? `SET (${CARDCOM_TERMINAL})` : 'MISSING');
    console.log('  - Username:', CARDCOM_USERNAME ? `SET (${CARDCOM_USERNAME})` : 'MISSING');
    console.log('  - APP_URL:', APP_URL);
    console.log('  - SUPABASE_URL:', SUPABASE_URL);

    if (!CARDCOM_TERMINAL || !CARDCOM_USERNAME) {
      console.error('❌ [Cardcom] Missing required env variables!');
      console.error('  - CARDCOM_TERMINAL:', CARDCOM_TERMINAL || 'NOT SET');
      console.error('  - CARDCOM_USERNAME:', CARDCOM_USERNAME || 'NOT SET');
      return null;
    }

    const baseUrl = 'https://secure.cardcom.solutions/api/v11';

    const productName = `שכר טרחה רואה חשבון #${feeId.substring(0, 8)}`;

    // Use AdvancedDefinition to control payment installments (NOT UIDefinition!)
    // - For single payment: MinNumOfPayments=1, MaxNumOfPayments=1
    // - For installments: MinNumOfPayments=1, MaxNumOfPayments=10
    const body = {
      TerminalNumber: CARDCOM_TERMINAL,
      ApiName: CARDCOM_USERNAME,
      Amount: amount,
      Operation: 'ChargeOnly',
      Language: 'he',
      ISOCoinId: 1, // ILS
      ProductName: productName,
      SuccessRedirectUrl: `${APP_URL}/payment/success?fee_id=${feeId}`,
      FailedRedirectUrl: `${APP_URL}/payment/error?fee_id=${feeId}`,
      WebHookUrl: `${SUPABASE_URL}/functions/v1/cardcom-webhook`,
      AdvancedDefinition: {
        MinNumOfPayments: 1,           // Always allow minimum 1 payment
        MaxNumOfPayments: maxPayments, // 1 for single, 10 for installments
      },
    };

    console.log('📤 [Cardcom] Sending request to:', `${baseUrl}/LowProfile/Create`);

    const response = await fetch(`${baseUrl}/LowProfile/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 [Cardcom] Response status:', response.status);

    const jsonResponse = await response.json();
    console.log('📥 [Cardcom] Response:', JSON.stringify(jsonResponse, null, 2));

    if (jsonResponse.ResponseCode?.toString() === '0') {
      console.log('✅ [Cardcom] Payment page created successfully!');
      console.log('  - URL:', jsonResponse.Url);
      console.log('  - LowProfileId:', jsonResponse.LowProfileId);
      return {
        url: jsonResponse.Url || null,
        lowProfileId: jsonResponse.LowProfileId || null,
      };
    }

    console.error('❌ [Cardcom] API returned error:');
    console.error('  - ResponseCode:', jsonResponse.ResponseCode);
    console.error('  - ResponseMessage:', jsonResponse.ResponseMessage);
    console.error('  - Full response:', JSON.stringify(jsonResponse, null, 2));
    return null;
  } catch (error) {
    console.error('Error creating Cardcom payment page:', error);
    return null;
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const feeId = url.searchParams.get('fee_id');
    const method = url.searchParams.get('method') as PaymentMethod;
    const clientId = url.searchParams.get('client_id');

    console.log('📥 [Debug] Payment Selection Request:');
    console.log('  - Full URL:', req.url);
    console.log('  - fee_id:', feeId || 'MISSING');
    console.log('  - method:', method || 'MISSING');
    console.log('  - client_id:', clientId || 'MISSING');

    // Validate required parameters
    if (!feeId || !method || !clientId) {
      console.error('❌ Missing required parameters');
      console.error('  - fee_id:', feeId ? '✓' : '✗');
      console.error('  - method:', method ? '✓' : '✗');
      console.error('  - client_id:', clientId ? '✓' : '✗');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: fee_id, method, client_id' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate payment method
    if (!['bank_transfer', 'cc_single', 'cc_installments', 'checks'].includes(method)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🔧 [Debug] Environment Check:');
    console.log('  - SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase configuration');
      throw new Error('Supabase configuration missing');
    }

    console.log('✅ Initializing Supabase client with service role key');
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('✅ Supabase client initialized successfully');

    // Get fee calculation details
    const { data: feeData, error: feeError } = await supabase
      .from('fee_calculations')
      .select('total_amount, tenant_id, client_id')
      .eq('id', feeId)
      .single();

    if (feeError || !feeData) {
      return new Response(
        JSON.stringify({ error: 'Fee calculation not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get client details for Cardcom and redirect pages
    const { data: clientData } = await supabase
      .from('clients')
      .select(`
        company_name,
        commercial_name,
        contact_email,
        client_groups!left (
          group_name_hebrew
        )
      `)
      .eq('id', clientId)
      .single();

    // Prepare display names for redirect pages
    const displayName = clientData?.company_name || clientData?.commercial_name || 'לקוח';
    const groupName = clientData?.client_groups?.group_name_hebrew || '';

    // Calculate discount
    const discountPercent = DISCOUNT_RATES[method];
    const originalAmount = feeData.total_amount;
    const discountAmount = originalAmount * (discountPercent / 100);
    const amountAfterDiscount = originalAmount - discountAmount;

    console.log(`📊 Payment selection: ${method}, Original: ₪${originalAmount}, Discount: ${discountPercent}%, Final: ₪${amountAfterDiscount}`);

    // Insert into payment_method_selections
    const { error: selectionError } = await supabase
      .from('payment_method_selections')
      .insert({
        fee_calculation_id: feeId,
        client_id: clientId,
        selected_method: method,
        original_amount: originalAmount,
        discount_percent: discountPercent,
        amount_after_discount: amountAfterDiscount,
        selected_at: new Date().toISOString(),
      });

    if (selectionError) {
      console.error('Error inserting payment selection:', selectionError);
    }

    // Update fee_calculations
    const { error: updateError } = await supabase
      .from('fee_calculations')
      .update({
        payment_method_selected: method,
        payment_method_selected_at: new Date().toISOString(),
        amount_after_selected_discount: amountAfterDiscount,
      })
      .eq('id', feeId);

    if (updateError) {
      console.error('Error updating fee calculation:', updateError);
    }

    // Determine redirect URL
    let redirectUrl: string;

    switch (method) {
      case 'bank_transfer':
        redirectUrl = `${APP_URL}/bank-transfer-details.html?fee_id=${feeId}&client_id=${clientId}&amount=${amountAfterDiscount}&company_name=${encodeURIComponent(displayName)}&group_name=${encodeURIComponent(groupName)}`;
        break;

      case 'cc_single':
        const singlePaymentResult = await createCardcomPaymentPage(
          amountAfterDiscount,
          1,
          feeId,
          displayName,
          clientData?.contact_email
        );
        if (singlePaymentResult) {
          // Save payment_transaction with LowProfileId
          await supabase.from('payment_transactions').insert({
            tenant_id: feeData.tenant_id,
            client_id: clientId,
            fee_calculation_id: feeId,
            cardcom_deal_id: singlePaymentResult.lowProfileId,
            amount: amountAfterDiscount,
            currency: 'ILS',
            status: 'pending',
            payment_method: 'credit_card',
          });
          redirectUrl = singlePaymentResult.url || `${APP_URL}/payment/error?fee_id=${feeId}`;
        } else {
          redirectUrl = `${APP_URL}/payment/error?fee_id=${feeId}`;
        }
        break;

      case 'cc_installments':
        const installmentsResult = await createCardcomPaymentPage(
          amountAfterDiscount,
          10,
          feeId,
          displayName,
          clientData?.contact_email
        );
        if (installmentsResult) {
          // Save payment_transaction with LowProfileId
          await supabase.from('payment_transactions').insert({
            tenant_id: feeData.tenant_id,
            client_id: clientId,
            fee_calculation_id: feeId,
            cardcom_deal_id: installmentsResult.lowProfileId,
            amount: amountAfterDiscount,
            currency: 'ILS',
            status: 'pending',
            payment_method: 'credit_card',
          });
          redirectUrl = installmentsResult.url || `${APP_URL}/payment/error?fee_id=${feeId}`;
        } else {
          redirectUrl = `${APP_URL}/payment/error?fee_id=${feeId}`;
        }
        break;

      case 'checks':
        redirectUrl = `${APP_URL}/check-details.html?fee_id=${feeId}&client_id=${clientId}&num_checks=8&amount=${amountAfterDiscount}&company_name=${encodeURIComponent(displayName)}&group_name=${encodeURIComponent(groupName)}`;
        break;

      default:
        redirectUrl = `${APP_URL}/payment/error?fee_id=${feeId}`;
    }

    console.log(`✅ Redirecting to: ${redirectUrl}`);

    // Redirect to payment page
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectUrl,
      },
    });
  } catch (error) {
    console.error('❌ Error in track-payment-selection:');
    console.error('  - Error type:', error?.constructor?.name);
    console.error('  - Error message:', error instanceof Error ? error.message : String(error));
    console.error('  - Error stack:', error instanceof Error ? error.stack : 'N/A');

    // Check if this is an auth/permission error
    if (error?.message?.includes('401') || error?.message?.includes('authorization')) {
      console.error('🚨 This appears to be an authorization error!');
      console.error('  - Edge Functions should use SERVICE_ROLE_KEY to bypass RLS');
      console.error('  - Check that env vars are set correctly');
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 500,
        message: 'Failed to track payment selection. Check Edge Function logs for details.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
