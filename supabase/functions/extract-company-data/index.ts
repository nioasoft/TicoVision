/**
 * Supabase Edge Function: Extract Company Data from PDF
 * Uses Claude Vision API to extract company information from Israeli Companies Registry documents
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

interface ExtractCompanyDataRequest {
  imageBase64: string; // Base64-encoded PNG of first PDF page
}

interface ExtractedCompanyData {
  company_name: string;
  tax_id: string;
  address_street: string;
  address_city: string;
  postal_code: string;
}

interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Credentials': string;
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  Deno.env.get('APP_URL'),
].filter(Boolean) as string[];

/**
 * Get CORS headers with validated origin
 */
function getCorsHeaders(origin: string | null): CorsHeaders {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Claude prompt for extracting company data from Israeli Companies Registry
const EXTRACTION_PROMPT = `אתה מומחה לקריאת מסמכים רשמיים בעברית מרשם החברות הישראלי.
המסמך שלפניך הוא תעודת רישום חברה או תמצית רשם חברות.

## המידע הנדרש:

1. **שם החברה** (company_name)
   - השם הרשמי בעברית
   - מופיע בדרך כלל בראש המסמך או תחת "שם החברה"

2. **מספר חברה** (tax_id)
   - 9 ספרות בדיוק
   - מופיע תחת "מספר חברה" או "ח.פ."

3. **כתובת התאגיד** - הכתובת כתובה בשורה אחת בפורמט:
   "כתובת התאגיד: [רחוב] [מספר] [עיר]"

   לדוגמא: "כתובת התאגיד: יד חרוצים 27 נתניה"

   פרק את הכתובת כך:
   - **address_street**: רחוב ומספר בית (לדוגמא: "יד חרוצים 27")
   - **address_city**: שם העיר - המילה האחרונה בכתובת (לדוגמא: "נתניה")
   - **postal_code**: מיקוד 7 ספרות אם מופיע

## פורמט התשובה:
\`\`\`json
{
  "company_name": "...",
  "tax_id": "...",
  "address_street": "...",
  "address_city": "...",
  "postal_code": "..."
}
\`\`\`

## כללים חשובים:
- קרא את הטקסט בקפידה - אות אות
- העיר תמיד תהיה המילה האחרונה בשורת הכתובת
- ערים נפוצות: תל אביב, ירושלים, חיפה, נתניה, רמת גן, פתח תקווה, באר שבע, אשדוד, הרצליה, רעננה, ראשון לציון, כפר סבא, חולון, בת ים
- אם לא מצאת שדה - החזר מחרוזת ריקה ""
- החזר JSON בלבד, ללא הסברים נוספים`;

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate API key
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const { imageBase64 } = (await req.json()) as ExtractCompanyDataRequest;

    if (!imageBase64) {
      throw new Error('imageBase64 is required');
    }

    // Validate base64 format
    if (!imageBase64.startsWith('data:image/')) {
      throw new Error('Invalid image format - must be data URI');
    }

    // Extract base64 data without the prefix
    const base64Data = imageBase64.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid base64 data');
    }

    // Determine media type
    const mediaType = imageBase64.includes('image/png') ? 'image/png' : 'image/jpeg';

    console.log('Calling Claude Vision API...');

    // Call Claude Vision API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const claudeResponse = await response.json();
    console.log('Claude response:', JSON.stringify(claudeResponse));

    // Parse Claude's response
    const content = claudeResponse.content?.[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const extractedData: ExtractedCompanyData = JSON.parse(jsonText);

    // Validate and clean tax_id (9 digits only)
    if (extractedData.tax_id) {
      extractedData.tax_id = extractedData.tax_id.replace(/\D/g, '').slice(0, 9);
    }

    // Validate and clean postal_code (7 digits only)
    if (extractedData.postal_code) {
      extractedData.postal_code = extractedData.postal_code.replace(/\D/g, '').slice(0, 7);
    }

    console.log('Extracted data:', JSON.stringify(extractedData));

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error extracting company data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
