# PDF Generation Setup Guide

## Overview

The system uses **Puppeteer + Browserless.io** to generate professional PDFs from Hebrew HTML letters with perfect RTL support.

## Architecture

```
Frontend (LetterPreviewDialog)
    ↓ Click "שמור כ-PDF"
    ↓ HTML content
Edge Function (generate-pdf)
    ↓ WebSocket connection
Browserless.io (Chrome Headless)
    ↓ Rendered PDF
Download to user
```

## Setup Instructions

### Step 1: Sign Up for Browserless.io

1. Go to https://browserless.io
2. Click "Sign Up" and create a free account
3. Navigate to "API Keys" section
4. Copy your API token (starts with `YOUR-TOKEN-HERE`)

**Free Tier Limits:**
- 10,000 requests/month
- Perfect for TicoVision (700 clients × 2 letters/year = 1,400 PDFs/year)

### Step 2: Add Token to Supabase Secrets

```bash
# Set the token in Supabase
npx supabase secrets set BROWSERLESS_TOKEN=YOUR-TOKEN-HERE

# Verify it was set
npx supabase secrets list
```

**Expected output:**
```
┌─────────────────────┬────────────────┬──────────┐
│ Name                │ Value          │ Digest   │
├─────────────────────┼────────────────┼──────────┤
│ BROWSERLESS_TOKEN   │ YOUR-TOKEN-... │ 6d3b4... │
└─────────────────────┴────────────────┴──────────┘
```

### Step 3: Deploy Edge Function

```bash
# Deploy generate-pdf function to production
npx supabase functions deploy generate-pdf

# Expected output:
# Deploying function generate-pdf (project ref: zbqfeebrhberddvfkuhe)
# Deployed successfully!
# URL: https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/generate-pdf
```

### Step 4: Test the Function

#### Local Testing (Optional)

```bash
# Start local Supabase (if not running)
npx supabase start

# Serve the function locally
npx supabase functions serve generate-pdf --env-file ./supabase/.env.local

# In another terminal, test with curl:
curl -X POST http://localhost:54321/functions/v1/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html dir=\"rtl\"><body><h1>שלום עולם</h1><p>זהו מבחן PDF בעברית</p></body></html>",
    "filename": "test.pdf"
  }' \
  --output test.pdf

# Check the file
open test.pdf  # macOS
# or
xdg-open test.pdf  # Linux
```

#### Production Testing

```bash
# Test deployed function
curl -X POST https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/generate-pdf \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR-SUPABASE-ANON-KEY" \
  -d '{
    "html": "<html dir=\"rtl\"><body><h1>מכתב בדיקה</h1></body></html>",
    "filename": "production_test.pdf"
  }' \
  --output production_test.pdf
```

### Step 5: Verify in Frontend

1. Navigate to http://localhost:5173/fees/calculate
2. Fill in fee calculation for any client
3. Click "שמור וצפה במכתב"
4. In the preview dialog, click "שמור כ-PDF"
5. PDF should download automatically with name: `CompanyName_audit_2026.pdf`

## Troubleshooting

### Error: "BROWSERLESS_TOKEN not configured"

**Cause:** Token not set in Supabase secrets

**Solution:**
```bash
npx supabase secrets set BROWSERLESS_TOKEN=your-actual-token
npx supabase functions deploy generate-pdf  # Redeploy to pick up new secret
```

### Error: "Connection timeout" or "WebSocket error"

**Cause:** Browserless.io might be down or token is invalid

**Solution:**
1. Check Browserless.io status: https://status.browserless.io
2. Verify token at https://app.browserless.io/account
3. Try regenerating token if needed

### PDF has missing images or broken layout

**Cause:** Images not loading (CORS, timeout, or wrong URLs)

**Solution:**
- Check `convertHtmlForDisplay()` in LetterPreviewDialog.tsx
- Verify image URLs are accessible: https://ticovision.vercel.app/brand/...
- Increase timeout in Edge Function (currently 30 seconds)

### Hebrew text is broken or reversed

**Cause:** Missing `dir="rtl"` in HTML

**Solution:**
- Verify preview div has `dir="rtl"` (line 440 in LetterPreviewDialog.tsx)
- Check template files have proper RTL structure

## Monitoring

### View Edge Function Logs

```bash
# Real-time logs
npx supabase functions logs generate-pdf --tail

# Last 100 logs
npx supabase functions logs generate-pdf
```

### Check Usage Stats

Go to Browserless.io dashboard:
- https://app.browserless.io/usage
- Monitor request count vs. 10k free tier limit

## Upgrading from Free Tier

If you exceed 10,000 PDFs/month (unlikely for 700 clients):

**Browserless.io Paid Plans:**
- **Starter**: $50/month → 100,000 requests
- **Business**: $250/month → Unlimited requests

**Alternative:** Self-host Browserless on your own server (advanced)

## Security Notes

✅ **Safe:**
- HTML content passes through Browserless but is NOT stored
- Token is secured in Supabase secrets (not in code)
- Edge Function runs in Supabase trusted environment

❌ **Don't:**
- Commit BROWSERLESS_TOKEN to git
- Share token publicly
- Use production token in local dev (use separate dev token)

## File Structure

```
supabase/functions/generate-pdf/
├── index.ts          # Main Edge Function code
└── deno.json         # Deno configuration

src/modules/letters/components/
└── LetterPreviewDialog.tsx  # Frontend PDF download logic
```

## Related Documentation

- **Browserless Docs**: https://docs.browserless.io
- **Puppeteer Docs**: https://pptr.dev
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **TicoVision Letter System**: `/docs/LETTER_SYSTEM.md`

---

**Setup Complete!** ✅

PDF downloads should now work seamlessly with professional Hebrew RTL support.
