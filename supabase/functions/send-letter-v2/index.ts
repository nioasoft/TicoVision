import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Credentials': string;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Alternative dev port
  Deno.env.get('APP_URL'),  // Custom deployment URL
].filter(Boolean) as string[];

/**
 * Get CORS headers with validated origin
 */
function getCorsHeaders(origin: string | null): CorsHeaders {
  // Check if origin is allowed
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

interface SendLetterRequest {
  letterId: string;
  recipientEmails: string[];
  subject?: string;
  ccEmails?: string[];
  bccEmails?: string[];
}

interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: 'inline';
  content_id: string;
}

serve(async (req) => {
  // Get CORS headers based on request origin
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create Supabase client with user's JWT - this will verify the JWT signature
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify JWT and get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized: Invalid or expired token');
    }

    const tenantId = user.user_metadata?.tenant_id;

    if (!tenantId) {
      throw new Error('Missing tenant_id in user metadata');
    }

    // 2. Parse request
    const {
      letterId,
      recipientEmails,
      subject,
      ccEmails = [],
      bccEmails = []
    }: SendLetterRequest = await req.json();

    if (!letterId || !recipientEmails || recipientEmails.length === 0) {
      throw new Error('letterId and recipientEmails are required');
    }

    // 3. Fetch letter from database
    const { data: letter, error: fetchError } = await supabase
      .from('generated_letters_v2')
      .select('*')
      .eq('id', letterId)
      .single();

    if (fetchError || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    // 4. Get HTML with CID references (already in DB)
    const html = letter.generated_content_html;

    // 5. Fetch all images as base64 from Supabase Storage
    const bucket = 'letter-assets-v2';

    const imageFiles = [
      { key: 'tico_logo_new', file: 'Tico_logo_png_new.png' },
      { key: 'franco_logo_new', file: 'Tico_franco_co.png' },
      { key: 'tagline', file: 'tagline.png' },
      { key: 'bullet_star_blue', file: 'Bullet_star_blue.png' },
      { key: 'tico_logo', file: 'tico_logo_240.png' },
      { key: 'franco_logo', file: 'franco-logo-hires.png' },
      { key: 'bullet_star', file: 'bullet-star.png' }
    ];

    // Helper function to fetch image as base64
    const fetchImageBase64 = async (fileName: string): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(fileName);

      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      return btoa(String.fromCharCode(...bytes));
    };

    // Fetch all images
    const imagesBase64 = await Promise.all(
      imageFiles.map(async (img) => ({
        key: img.key,
        base64: await fetchImageBase64(img.file),
        filename: img.file
      }))
    );

    // 6. Build email attachments array
    const attachments: EmailAttachment[] = imagesBase64.map(img => ({
      content: img.base64,
      filename: img.filename,
      type: 'image/png',
      disposition: 'inline',
      content_id: img.key
    }));

    // 7. Prepare SendGrid payload
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      throw new Error('SENDGRID_API_KEY not configured');
    }

    const emailSubject = subject || `מכתב מ-TICO`;

    const sendgridPayload = {
      personalizations: [
        {
          to: recipientEmails.map(email => ({ email })),
          cc: ccEmails.map(email => ({ email })),
          bcc: bccEmails.map(email => ({ email })),
          subject: emailSubject
        }
      ],
      from: {
        email: 'sigal@franco.co.il',
        name: 'Sigal Nagar - TICO Franco'
      },
      content: [
        {
          type: 'text/html',
          value: html
        }
      ],
      attachments
    };

    // 8. Send via SendGrid
    const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendgridPayload)
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      throw new Error(`SendGrid error: ${errorText}`);
    }

    // 9. Update letter status in DB
    const { error: updateError } = await supabase
      .from('generated_letters_v2')
      .update({
        status: 'sent',
        sent_count: (letter.sent_count || 0) + 1,
        last_sent_at: new Date().toISOString(),
        recipient_emails: recipientEmails,
        updated_at: new Date().toISOString()
      })
      .eq('id', letterId);

    if (updateError) {
      console.error('Failed to update letter status:', updateError);
    }

    // 10. Return success
    return new Response(
      JSON.stringify({
        success: true,
        letterId,
        recipientCount: recipientEmails.length,
        message: 'Email sent successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error sending email:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
