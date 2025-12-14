/**
 * Supabase Edge Function: Short Link Redirect
 * Redirects short codes to original URLs with click tracking
 * Solves Outlook URL-breaking issue for payment links
 *
 * Endpoint: GET /functions/v1/s/{short_code}
 * Response: 302 Redirect to original URL
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://ticovision.vercel.app';

/**
 * Extract short_code from URL path
 * Handles both /functions/v1/s/abc123 and /s/abc123 patterns
 */
function extractShortCode(url: URL): string | null {
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Get the last path segment
  const shortCode = pathParts[pathParts.length - 1];

  // Validate format (6-8 alphanumeric characters)
  if (!shortCode || !/^[A-Za-z0-9]{6,8}$/.test(shortCode)) {
    return null;
  }

  return shortCode;
}

/**
 * Main handler
 */
serve(async (req) => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Extract short_code from URL
    const shortCode = extractShortCode(url);

    if (!shortCode) {
      console.warn('⚠️ Invalid or missing short code');
      return Response.redirect(`${APP_URL}/link-invalid`, 302);
    }

    // Validate Supabase configuration
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Supabase configuration missing');
      return Response.redirect(`${APP_URL}/error`, 302);
    }

    // Initialize Supabase client with service role key (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Look up the short link
    const { data: link, error } = await supabase
      .from('short_links')
      .select('original_url, expires_at')
      .eq('short_code', shortCode)
      .single();

    if (error || !link) {
      console.warn(`⚠️ Short link not found: ${shortCode}`);
      return Response.redirect(`${APP_URL}/link-not-found`, 302);
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      console.log(`⚠️ Short link expired: ${shortCode}`);
      return Response.redirect(`${APP_URL}/link-expired`, 302);
    }

    // Update click tracking (fire-and-forget - don't wait for response)
    // Using raw SQL through RPC would be better, but this simple approach works
    supabase
      .rpc('increment_short_link_click', { p_short_code: shortCode })
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error(`❌ Failed to update click count for ${shortCode}:`, updateError);
        }
      });

    console.log(`✅ Redirecting ${shortCode} → ${link.original_url.substring(0, 50)}...`);

    // Redirect to original URL
    return Response.redirect(link.original_url, 302);

  } catch (error) {
    console.error('❌ Error in short link redirect:', error);
    return Response.redirect(`${APP_URL}/error`, 302);
  }
});
