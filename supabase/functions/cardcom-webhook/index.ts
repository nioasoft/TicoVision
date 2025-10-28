/**
 * Supabase Edge Function: Cardcom Webhook
 * Receives payment completion notifications from Cardcom and updates database
 *
 * Endpoint: POST /cardcom-webhook
 * Request: Form data from Cardcom
 * Response: "-1" (required by Cardcom)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL') || '';

interface CardcomWebhookData {
  terminalnumber: string;
  lowprofilecode: string;
  operation: string;
  dealnumber: string;
  tokennumber?: string;
  tokenexpdate?: string;
  cardnumber: string;
  cardexpdate: string;
  approvalnum: string;
  username: string;
  sum: string;
  currency: string;
  responsecode: string;
  responsemessage: string;
  email?: string;
  phone?: string;
  customername?: string;
  customerid?: string;
  invoicenumber?: string;
  invoicelink?: string;
  dealid?: string;
}

/**
 * Parse form data from Cardcom webhook
 */
function parseWebhookData(formData: URLSearchParams): CardcomWebhookData {
  return {
    terminalnumber: formData.get('terminalnumber') || '',
    lowprofilecode: formData.get('lowprofilecode') || '',
    operation: formData.get('operation') || '',
    dealnumber: formData.get('dealnumber') || '',
    tokennumber: formData.get('tokennumber') || undefined,
    tokenexpdate: formData.get('tokenexpdate') || undefined,
    cardnumber: formData.get('cardnumber') || '',
    cardexpdate: formData.get('cardexpdate') || '',
    approvalnum: formData.get('approvalnum') || '',
    username: formData.get('username') || '',
    sum: formData.get('sum') || '',
    currency: formData.get('currency') || '',
    responsecode: formData.get('responsecode') || '',
    responsemessage: formData.get('responsemessage') || '',
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    customername: formData.get('customername') || undefined,
    customerid: formData.get('customerid') || undefined,
    invoicenumber: formData.get('invoicenumber') || undefined,
    invoicelink: formData.get('invoicelink') || undefined,
    dealid: formData.get('dealid') || undefined,
  };
}

/**
 * Validate webhook is from Cardcom
 */
function validateWebhook(data: CardcomWebhookData): boolean {
  return data.terminalnumber === CARDCOM_TERMINAL;
}

/**
 * Check if payment was successful
 */
function isSuccessfulPayment(data: CardcomWebhookData): boolean {
  return data.responsecode === '0';
}

/**
 * Main handler
 */
serve(async (req) => {
  try {
    console.log('📨 Received Cardcom webhook');

    // Parse form data
    const formData = await req.formData();
    const urlParams = new URLSearchParams();
    formData.forEach((value, key) => {
      urlParams.append(key, value.toString());
    });

    const webhookData = parseWebhookData(urlParams);

    console.log('Webhook data:', {
      lowprofilecode: webhookData.lowprofilecode,
      dealnumber: webhookData.dealnumber,
      responsecode: webhookData.responsecode,
      sum: webhookData.sum,
    });

    // Validate webhook source
    if (!validateWebhook(webhookData)) {
      console.warn('⚠️ Invalid webhook source - terminal mismatch');
      return new Response('-1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const paymentSuccessful = isSuccessfulPayment(webhookData);
    const amount = parseFloat(webhookData.sum);

    // Find transaction by lowprofilecode (LowProfileId from payment page creation)
    const { data: existingTransaction, error: findError } = await supabase
      .from('payment_transactions')
      .select('id, fee_calculation_id, status')
      .eq('cardcom_deal_id', webhookData.lowprofilecode)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding transaction:', findError);
      // Still return -1 to Cardcom
      return new Response('-1', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    if (existingTransaction) {
      // Update existing transaction
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: paymentSuccessful ? 'completed' : 'failed',
          cardcom_transaction_id: webhookData.dealnumber,
          invoice_number: webhookData.invoicenumber || null,
          payment_date: paymentSuccessful ? new Date().toISOString() : null,
          failure_reason: paymentSuccessful ? null : webhookData.responsemessage,
          metadata: {
            approval_number: webhookData.approvalnum,
            card_last4: webhookData.cardnumber.slice(-4),
            invoice_link: webhookData.invoicelink,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTransaction.id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
      } else {
        console.log(`✅ Transaction updated: ${existingTransaction.id}`);
      }

      // If payment successful, update fee_calculations and payment_method_selections
      if (paymentSuccessful && existingTransaction.fee_calculation_id) {
        // Update fee_calculations
        const { error: feeUpdateError } = await supabase
          .from('fee_calculations')
          .update({
            status: 'paid',
            payment_date: new Date().toISOString(),
            payment_reference: webhookData.invoicenumber || webhookData.dealnumber,
          })
          .eq('id', existingTransaction.fee_calculation_id);

        if (feeUpdateError) {
          console.error('Error updating fee calculation:', feeUpdateError);
        } else {
          console.log(`✅ Fee calculation marked as paid: ${existingTransaction.fee_calculation_id}`);
        }

        // Update payment_method_selections
        const { error: selectionUpdateError } = await supabase
          .from('payment_method_selections')
          .update({
            completed_payment: true,
            payment_transaction_id: existingTransaction.id,
          })
          .eq('fee_calculation_id', existingTransaction.fee_calculation_id);

        if (selectionUpdateError) {
          console.error('Error updating payment selection:', selectionUpdateError);
        } else {
          console.log('✅ Payment selection marked as completed');
        }
      }
    } else {
      // Create new transaction record (shouldn't normally happen, but handle gracefully)
      console.warn('⚠️ Transaction not found, creating new record');

      const { error: insertError } = await supabase
        .from('payment_transactions')
        .insert({
          cardcom_deal_id: webhookData.lowprofilecode,
          cardcom_transaction_id: webhookData.dealnumber,
          amount: amount,
          currency: webhookData.currency === 'ILS' ? 'ILS' : 'USD',
          status: paymentSuccessful ? 'completed' : 'failed',
          payment_method: 'credit_card',
          invoice_number: webhookData.invoicenumber || null,
          payment_date: paymentSuccessful ? new Date().toISOString() : null,
          failure_reason: paymentSuccessful ? null : webhookData.responsemessage,
          metadata: {
            approval_number: webhookData.approvalnum,
            card_last4: webhookData.cardnumber.slice(-4),
            customer_name: webhookData.customername,
            invoice_link: webhookData.invoicelink,
          },
        });

      if (insertError) {
        console.error('Error inserting transaction:', insertError);
      } else {
        console.log('✅ New transaction created');
      }
    }

    // Log the webhook
    await supabase.from('webhook_logs').insert({
      source: 'cardcom',
      event_type: paymentSuccessful ? 'payment_success' : 'payment_failed',
      payload: webhookData,
      processed_at: new Date().toISOString(),
      response_sent: '-1',
    });

    // Cardcom requires "-1" response to acknowledge webhook
    return new Response('-1', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('❌ Error in cardcom-webhook:', error);

    // Still return -1 to Cardcom even on error
    return new Response('-1', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
});
