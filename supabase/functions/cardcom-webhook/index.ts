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
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@ticovision.co.il';

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
 * Send payment notification email
 */
async function sendPaymentNotification(params: {
  toEmail: string;
  clientName: string;
  amount: number;
  cardOwnerName: string;
  approvalNumber: string;
  numPayments: number;
}): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not configured, skipping email notification');
    return;
  }

  const formattedAmount = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
  }).format(params.amount);

  const paymentType = params.numPayments > 1
    ? `${params.numPayments} תשלומים`
    : 'תשלום אחד';

  const emailContent = {
    personalizations: [{
      to: [{ email: params.toEmail }],
    }],
    from: { email: FROM_EMAIL, name: 'TicoVision - התראת תשלום' },
    subject: `✅ התקבל תשלום מ${params.clientName} - ${formattedAmount}`,
    content: [{
      type: 'text/html',
      value: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">✅ התקבל תשלום חדש</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9fafb;">
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">לקוח</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${params.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">סכום</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb; color: #16a34a; font-weight: bold;">${formattedAmount}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">אופן תשלום</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${paymentType}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">שם בעל הכרטיס</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${params.cardOwnerName}</td>
            </tr>
            <tr style="background: #f9fafb;">
              <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: bold;">מספר אישור</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">${params.approvalNumber}</td>
            </tr>
          </table>
          <p style="color: #6b7280; font-size: 14px;">
            הודעה זו נשלחה אוטומטית ממערכת TicoVision.
          </p>
        </div>
      `,
    }],
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailContent),
    });

    if (response.ok) {
      console.log(`✅ Payment notification sent to ${params.toEmail}`);
    } else {
      const errorText = await response.text();
      console.error('Failed to send payment notification:', response.status, errorText);
    }
  } catch (error) {
    console.error('Error sending payment notification:', error);
  }
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

        // Send payment notification email
        try {
          // Get fee calculation to get tenant and client info
          const { data: feeInfo } = await supabase
            .from('fee_calculations')
            .select('tenant_id, client_id')
            .eq('id', existingTransaction.fee_calculation_id)
            .single();

          if (feeInfo) {
            // Get notification settings for tenant
            const { data: notificationSettings } = await supabase
              .from('notification_settings')
              .select('notification_email, enable_email_notifications')
              .eq('tenant_id', feeInfo.tenant_id)
              .single();

            // Get client name
            const { data: clientData } = await supabase
              .from('clients')
              .select('company_name, commercial_name')
              .eq('id', feeInfo.client_id)
              .single();

            const clientName = clientData?.company_name || clientData?.commercial_name || 'לקוח';

            if (notificationSettings?.enable_email_notifications && notificationSettings?.notification_email) {
              await sendPaymentNotification({
                toEmail: notificationSettings.notification_email,
                clientName,
                amount,
                cardOwnerName: webhookData.TranzactionInfo?.CardOwnerName || 'לא צוין',
                approvalNumber: webhookData.TranzactionInfo?.ApprovalNumber || '',
                numPayments: webhookData.TranzactionInfo?.NumberOfPayments || 1,
              });
            } else {
              console.log('Payment notification skipped - email notifications disabled or no email configured');
            }
          }
        } catch (notificationError) {
          console.error('Error sending payment notification:', notificationError);
          // Don't fail the webhook for notification errors
        }
      }
    } else {
      // Transaction not found - cannot create without tenant_id and client_id (required fields)
      console.warn('⚠️ Transaction not found for LowProfileId:', lowProfileId);
      console.warn('   Cannot create new record - missing tenant_id and client_id');
      console.warn('   This payment was received but has no matching pending transaction');
      console.warn('   Payment details:', {
        amount,
        transactionId,
        cardOwnerName: webhookData.TranzactionInfo?.CardOwnerName,
        approvalNumber: webhookData.TranzactionInfo?.ApprovalNumber,
      });
      // Continue to log the webhook but skip creating incomplete record
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
