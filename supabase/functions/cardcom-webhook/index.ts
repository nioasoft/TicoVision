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

      // If payment successful, create actual_payments record and update related tables
      if (paymentSuccessful && existingTransaction.fee_calculation_id) {
        console.log('Processing successful payment...');

        // Get fee_calculation to get client_id and tenant_id
        const { data: feeCalc, error: feeCalcError } = await supabase
          .from('fee_calculations')
          .select('client_id, tenant_id, amount_after_selected_discount, total_amount')
          .eq('id', existingTransaction.fee_calculation_id)
          .single();

        if (feeCalcError) {
          console.error('Error fetching fee calculation:', feeCalcError);
        } else {
          // Calculate VAT breakdown (18% VAT in Israel)
          const VAT_RATE = 0.18;
          const beforeVat = Math.round((amount / (1 + VAT_RATE)) * 100) / 100;
          const vat = Math.round((beforeVat * VAT_RATE) * 100) / 100;
          const withVat = beforeVat + vat;

          // Determine payment method based on number of installments
          const numInstallments = webhookData.TranzactionInfo?.NumberOfPayments || 1;
          const paymentMethod = numInstallments > 1 ? 'credit_card_installments' : 'credit_card';

          // Create actual_payments record for proper tracking
          const { data: actualPayment, error: actualPaymentError } = await supabase
            .from('actual_payments')
            .insert({
              tenant_id: feeCalc.tenant_id,
              client_id: feeCalc.client_id,
              fee_calculation_id: existingTransaction.fee_calculation_id,
              amount_paid: amount,
              amount_before_vat: beforeVat,
              amount_vat: vat,
              amount_with_vat: withVat,
              payment_date: new Date().toISOString(),
              payment_method: paymentMethod,
              payment_reference: webhookData.TranzactionInfo?.CouponNumber || transactionId,
              num_installments: numInstallments,
              notes: `Cardcom payment - ${webhookData.TranzactionInfo?.CardOwnerName || 'Unknown'}`,
            })
            .select('id')
            .single();

          if (actualPaymentError) {
            console.error('Error creating actual payment:', actualPaymentError);
          } else {
            console.log(`✅ Actual payment created: ${actualPayment.id}`);

            // Calculate and create deviation record
            const expectedAmount = feeCalc.amount_after_selected_discount || feeCalc.total_amount;
            const deviationAmount = expectedAmount - amount;
            const deviationPercent = expectedAmount > 0 ? (deviationAmount / expectedAmount) * 100 : 0;

            // Determine alert level
            let alertLevel = 'info';
            let alertMessage = 'התשלום תואם לסכום הצפוי';
            if (Math.abs(deviationPercent) > 5) {
              alertLevel = 'critical';
              alertMessage = `סטייה משמעותית: ${deviationPercent.toFixed(1)}%`;
            } else if (Math.abs(deviationPercent) > 2) {
              alertLevel = 'warning';
              alertMessage = `סטייה קטנה: ${deviationPercent.toFixed(1)}%`;
            }

            const { error: deviationError } = await supabase
              .from('payment_deviations')
              .insert({
                tenant_id: feeCalc.tenant_id,
                client_id: feeCalc.client_id,
                fee_calculation_id: existingTransaction.fee_calculation_id,
                actual_payment_id: actualPayment.id,
                expected_amount: expectedAmount,
                actual_amount: amount,
                deviation_amount: deviationAmount,
                deviation_percent: deviationPercent,
                alert_level: alertLevel,
                alert_message: alertMessage,
              });

            if (deviationError) {
              console.error('Error creating deviation:', deviationError);
            } else {
              console.log('✅ Payment deviation recorded');
            }

            // Update fee_calculations with payment info and deviation
            const { error: feeUpdateError } = await supabase
              .from('fee_calculations')
              .update({
                status: 'paid',
                payment_date: new Date().toISOString(),
                payment_reference: webhookData.TranzactionInfo?.CouponNumber || transactionId,
                actual_payment_id: actualPayment.id,
                has_deviation: alertLevel !== 'info',
                deviation_alert_level: alertLevel,
              })
              .eq('id', existingTransaction.fee_calculation_id);

            if (feeUpdateError) {
              console.error('Error updating fee calculation:', feeUpdateError);
            } else {
              console.log(`✅ Fee calculation marked as paid: ${existingTransaction.fee_calculation_id}`);
            }
          }
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
