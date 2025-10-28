/**
 * Supabase Edge Function: Track Email Open
 * Records when a client opens an email letter (tracking pixel)
 *
 * Endpoint: GET /api/track-email-open?letter_id={uuid}
 * Returns: 1x1 transparent PNG pixel
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 1x1 transparent PNG as base64
const TRANSPARENT_PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

/**
 * Convert base64 to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Main handler
 */
serve(async (req) => {
  // Get letter_id from query params
  const url = new URL(req.url);
  const letterId = url.searchParams.get('letter_id');

  // Always return the pixel image (even on error)
  const pixelData = base64ToUint8Array(TRANSPARENT_PIXEL);

  try {
    // Validate parameters
    if (!letterId) {
      console.warn('⚠️ Track email open: Missing letter_id');
      return new Response(pixelData, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase configuration missing');
      return new Response(pixelData, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update the letter tracking data
    // opened_at is set only once, last_opened_at is updated every time
    const { error } = await supabase
      .from('generated_letters')
      .update({
        opened_at: supabase.raw('COALESCE(opened_at, NOW())'),
        last_opened_at: new Date().toISOString(),
        open_count: supabase.raw('COALESCE(open_count, 0) + 1'),
      })
      .eq('id', letterId);

    if (error) {
      console.error('❌ Error updating letter:', error);
    } else {
      console.log(`✅ Email opened tracked: ${letterId}`);
    }
  } catch (error) {
    console.error('❌ Error in track-email-open:', error);
  }

  // Always return the pixel (don't expose errors to client)
  return new Response(pixelData, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
});
