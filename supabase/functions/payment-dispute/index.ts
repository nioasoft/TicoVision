/**
 * Supabase Edge Function: Payment Dispute
 * Handles dispute submissions from clients claiming they already paid
 *
 * Endpoint: POST /api/payment-dispute
 * Request Body: { fee_id, client_id, dispute_reason, claimed_payment_date, claimed_payment_method, claimed_amount, claimed_reference }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

interface DisputeRequest {
  fee_id: string;
  client_id: string;
  dispute_reason: string;
  claimed_payment_date: string;
  claimed_payment_method: string;
  claimed_amount: number;
  claimed_reference: string;
}

interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
}

const corsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Send email notification to Sigal via SendGrid
 */
async function sendDisputeNotification(
  clientName: string,
  companyName: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string,
  reference: string,
  reason: string
): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SendGrid API key not configured, skipping email notification');
    return;
  }

  const emailData = {
    personalizations: [
      {
        to: [{ email: 'sigal@franco.co.il', name: 'סיגל נגר' }],
        subject: '⚠️ לקוח טוען ששילם',
      },
    ],
    from: {
      email: 'noreply@ticovision.com',
      name: 'TicoVision - מערכת ניהול',
    },
    content: [
      {
        type: 'text/html',
        value: `
          <!DOCTYPE html>
          <html lang="he" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: 'Assistant', 'Heebo', Arial, sans-serif;
                direction: rtl;
                background-color: #f9fafb;
                padding: 20px;
              }
              .container {
                background-color: white;
                border-radius: 8px;
                padding: 30px;
                max-width: 600px;
                margin: 0 auto;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                background-color: #dc2626;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                margin: -30px -30px 20px -30px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
              }
              .label {
                font-weight: 600;
                color: #374151;
              }
              .value {
                color: #1f2937;
              }
              .reason {
                background-color: #fef3c7;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border-right: 4px solid #f59e0b;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">⚠️ התראת ויכוח תשלום</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">לקוח טוען ששילם את החשבון</p>
              </div>

              <div class="info-row">
                <span class="label">שם הלקוח:</span>
                <span class="value">${clientName}</span>
              </div>

              <div class="info-row">
                <span class="label">חברה:</span>
                <span class="value">${companyName}</span>
              </div>

              <div class="info-row">
                <span class="label">סכום שנטען:</span>
                <span class="value">₪${amount.toLocaleString('he-IL')}</span>
              </div>

              <div class="info-row">
                <span class="label">תאריך תשלום נטען:</span>
                <span class="value">${new Date(paymentDate).toLocaleDateString('he-IL')}</span>
              </div>

              <div class="info-row">
                <span class="label">אמצעי תשלום:</span>
                <span class="value">${paymentMethod}</span>
              </div>

              <div class="info-row">
                <span class="label">אסמכתא/מספר תשלום:</span>
                <span class="value">${reference || 'לא סופק'}</span>
              </div>

              <div class="reason">
                <strong>סיבה/הסבר מהלקוח:</strong><br/>
                ${reason}
              </div>

              <div class="footer">
                <p><strong>פעולות מומלצות:</strong></p>
                <ol>
                  <li>בדקו את הבנק/מערכת התשלומים לאימות התשלום</li>
                  <li>התקשרו ללקוח לברר פרטים נוספים</li>
                  <li>עדכנו את המערכת בהתאם לממצאים</li>
                </ol>
                <p style="margin-top: 20px;">
                  <a href="https://ticovision.vercel.app/collection-dashboard"
                     style="background-color: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    לדף ניהול גבייה
                  </a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      },
    ],
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    console.log('✅ Dispute notification email sent to Sigal');
  } catch (error) {
    console.error('❌ Error sending dispute notification:', error);
    throw error;
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData: DisputeRequest = await req.json();
    const {
      fee_id,
      client_id,
      dispute_reason,
      claimed_payment_date,
      claimed_payment_method,
      claimed_amount,
      claimed_reference,
    } = requestData;

    // Validate required fields
    if (!fee_id || !client_id || !dispute_reason || !claimed_payment_date || !claimed_payment_method || !claimed_amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'חסרים שדות נדרשים. אנא מלא את כל הפרטים.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify fee and client exist
    const { data: feeData, error: feeError } = await supabase
      .from('fee_calculations')
      .select('id, tenant_id')
      .eq('id', fee_id)
      .eq('client_id', client_id)
      .single();

    if (feeError || !feeData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'החשבון לא נמצא במערכת.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get client details for email
    const { data: clientData } = await supabase
      .from('clients')
      .select('contact_name, company_name')
      .eq('id', client_id)
      .single();

    // Insert dispute into database
    const { data: disputeData, error: disputeError } = await supabase
      .from('payment_disputes')
      .insert({
        fee_calculation_id: fee_id,
        client_id: client_id,
        dispute_reason: dispute_reason,
        claimed_payment_date: claimed_payment_date,
        claimed_payment_method: claimed_payment_method,
        claimed_amount: claimed_amount,
        claimed_reference: claimed_reference || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (disputeError) {
      console.error('Error inserting dispute:', disputeError);
      throw new Error('Failed to save dispute');
    }

    console.log(`📝 Dispute created: ${disputeData.id}`);

    // Send email notification to Sigal
    try {
      await sendDisputeNotification(
        clientData?.contact_name || 'לקוח',
        clientData?.company_name || 'לא ידוע',
        claimed_amount,
        claimed_payment_date,
        claimed_payment_method,
        claimed_reference,
        dispute_reason
      );
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the entire request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'תודה! קיבלנו את פנייתך ונחזור אליך בהקדם.',
        data: {
          dispute_id: disputeData.id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in payment-dispute:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'שגיאה פנימית בשרת',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
