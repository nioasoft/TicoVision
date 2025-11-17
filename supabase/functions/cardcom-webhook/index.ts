/**
 * Supabase Edge Function: Cardcom Webhook
 * Receives payment completion notifications from Cardcom API v11 and updates database
 *
 * Endpoint: POST /cardcom-webhook
 * Request: JSON from Cardcom
 * Response: "-1" (required by Cardcom)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL') || '';

/**
 * Cardcom Webhook JSON structure (API v11)
 */
interface CardcomWebhookPayload {
  ResponseCode: number;
  Description: string;
  TerminalNumber: number;
  LowProfileId: string;
  TranzactionId: number;
  Operation: string;
  TranzactionInfo?: {
    ResponseCode: number;
    Description: string;
    TranzactionId: number;
    Amount: number;
    CoinId: number;
    CouponNumber: string;
    ApprovalNumber: string;
    NumberOfPayments: number;
    CardOwnerName: string;
    CardOwnerEmail?: string;
    CardOwnerPhone?: string;
    CardOwnerIdentityNumber?: string;
    Last4CardDigits?: number;
    Last4CardDigitsString?: string;
  };
}

/**
 * Validate webhook is from our Cardcom terminal
 */
function validateWebhook(data: CardcomWebhookPayload): boolean {
  const terminalMatch = data.TerminalNumber.toString() === CARDCOM_TERMINAL;
  console.log('Terminal validation:', {
    received: data.TerminalNumber,
    expected: CARDCOM_TERMINAL,
    match: terminalMatch,
  });
  return terminalMatch;
}

/**
 * Check if payment was successful
 */
function isSuccessfulPayment(data: CardcomWebhookPayload): boolean {
  return data.ResponseCode === 0;
}

/**
 * Main handler
 */
serve(async (req) => {
  try {
    console.log('📨 Received Cardcom webhook');
    console.log('Method:', req.method);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    // Parse JSON body
    const webhookData: CardcomWebhookPayload = await req.json();

    console.log('Webhook data:', {
      ResponseCode: webhookData.ResponseCode,
      LowProfileId: webhookData.LowProfileId,
      TranzactionId: webhookData.TranzactionId,
      TerminalNumber: webhookData.TerminalNumber,
      Amount: webhookData.TranzactionInfo?.Amount,
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

    // Initialize Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const paymentSuccessful = isSuccessfulPayment(webhookData);
    const amount = webhookData.TranzactionInfo?.Amount || 0;
    const lowProfileId = webhookData.LowProfileId;
    const transactionId = webhookData.TranzactionId.toString();

    console.log('Payment status:', {
      successful: paymentSuccessful,
      amount,
      lowProfileId,
      transactionId,
    });

    // Find transaction by LowProfileId (from payment link creation)
    const { data: existingTransaction, error: findError } = await supabase
      .from('payment_transactions')
      .select('id, fee_calculation_id, status')
      .eq('cardcom_deal_id', lowProfileId)
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
      console.log('Found existing transaction:', existingTransaction.id);

      // Update existing transaction
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: paymentSuccessful ? 'completed' : 'failed',
          cardcom_transaction_id: transactionId,
          invoice_number: webhookData.TranzactionInfo?.CouponNumber || null,
          payment_date: paymentSuccessful ? new Date().toISOString() : null,
          failure_reason: paymentSuccessful ? null : webhookData.Description,
          metadata: {
            approval_number: webhookData.TranzactionInfo?.ApprovalNumber,
            card_last4: webhookData.TranzactionInfo?.Last4CardDigitsString,
            card_owner_name: webhookData.TranzactionInfo?.CardOwnerName,
            number_of_payments: webhookData.TranzactionInfo?.NumberOfPayments,
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
        console.log('Updating fee_calculations to paid...');

        // Update fee_calculations
        const { error: feeUpdateError } = await supabase
          .from('fee_calculations')
          .update({
            status: 'paid',
            payment_date: new Date().toISOString(),
            payment_reference: webhookData.TranzactionInfo?.CouponNumber || transactionId,
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
      console.warn('⚠️ Transaction not found for LowProfileId:', lowProfileId);
      console.warn('Creating new transaction record...');

      const { error: insertError } = await supabase
        .from('payment_transactions')
        .insert({
          cardcom_deal_id: lowProfileId,
          cardcom_transaction_id: transactionId,
          amount: amount,
          currency: 'ILS',
          status: paymentSuccessful ? 'completed' : 'failed',
          payment_method: 'credit_card',
          invoice_number: webhookData.TranzactionInfo?.CouponNumber || null,
          payment_date: paymentSuccessful ? new Date().toISOString() : null,
          failure_reason: paymentSuccessful ? null : webhookData.Description,
          metadata: {
            approval_number: webhookData.TranzactionInfo?.ApprovalNumber,
            card_last4: webhookData.TranzactionInfo?.Last4CardDigitsString,
            card_owner_name: webhookData.TranzactionInfo?.CardOwnerName,
            number_of_payments: webhookData.TranzactionInfo?.NumberOfPayments,
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

    console.log('✅ Webhook processed successfully');

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
