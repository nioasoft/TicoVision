# Generate PDF Edge Function

Generates PDF from letter HTML using Puppeteer.

## Deploy

```bash
npx supabase functions deploy generate-pdf
```

## Test Locally

```bash
npx supabase functions serve generate-pdf
```

Then call:
```bash
curl -X POST http://localhost:54321/functions/v1/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"letterId": "your-letter-id"}'
```

## Environment Variables

Automatically available in Supabase Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Response

Success:
```json
{
  "success": true,
  "pdfUrl": "https://...storage.../letter-pdfs/abc-123.pdf",
  "letterId": "abc-123"
}
```

Error:
```json
{
  "success": false,
  "error": "Error message"
}
```
