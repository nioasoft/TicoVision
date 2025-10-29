# Edge Functions Deployment Guide

## 🚀 Quick Start

### Prerequisites
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref
```

---

## 📦 Deploy All Functions

```bash
# Deploy all Edge Functions
cd /Users/asafbenatia/asi_soft/TicoVision

supabase functions deploy track-email-open
supabase functions deploy track-payment-selection
supabase functions deploy payment-dispute
supabase functions deploy cardcom-webhook
```

---

## 🔧 Set Environment Variables

### Via Supabase Dashboard
1. Go to **Project Settings** → **Edge Functions**
2. Add the following secrets:

```env
SUPABASE_URL=https://zbqfeebrhberddvfkuhe.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SENDGRID_API_KEY=your-sendgrid-api-key
APP_URL=https://ticovision.vercel.app
CARDCOM_ENV=test
CARDCOM_TERMINAL=172012
CARDCOM_USERNAME=your-cardcom-username
```

### Via CLI
```bash
supabase secrets set SUPABASE_URL=https://zbqfeebrhberddvfkuhe.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SENDGRID_API_KEY=your-sendgrid-key
supabase secrets set APP_URL=https://ticovision.vercel.app
supabase secrets set CARDCOM_ENV=test
supabase secrets set CARDCOM_TERMINAL=172012
supabase secrets set CARDCOM_USERNAME=your-username
```

---

## 🧪 Test Deployed Functions

### 1. Test Email Tracking
```bash
curl "https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/track-email-open?letter_id=test-123"
# Expected: 1x1 PNG image
```

### 2. Test Payment Selection
```bash
curl "https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/track-payment-selection?fee_id=550e8400-e29b-41d4-a716-446655440000&method=bank_transfer&client_id=550e8400-e29b-41d4-a716-446655440001"
# Expected: 302 redirect
```

### 3. Test Dispute Submission
```bash
curl -X POST "https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/payment-dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_id": "550e8400-e29b-41d4-a716-446655440000",
    "client_id": "550e8400-e29b-41d4-a716-446655440001",
    "dispute_reason": "שילמתי בהעברה בנקאית",
    "claimed_payment_date": "2025-10-15",
    "claimed_payment_method": "העברה בנקאית",
    "claimed_amount": 45500,
    "claimed_reference": "123456"
  }'
# Expected: {"success":true,"message":"תודה!...","data":{"dispute_id":"..."}}
```

### 4. Test Cardcom Webhook
```bash
curl -X POST "https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/cardcom-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "terminalnumber=172012&lowprofilecode=test-lp&responsecode=0&sum=45500&dealnumber=deal-123"
# Expected: -1
```

---

## 📊 Monitor Functions

### View Logs
```bash
# View logs for specific function
supabase functions logs track-email-open

# View logs with tail (real-time)
supabase functions logs track-email-open --tail

# View all function logs
supabase functions logs
```

### Check Function Status
```bash
supabase functions list
```

---

## 🔄 Update Functions

After making changes to a function:

```bash
# Deploy updated function
supabase functions deploy track-email-open

# Verify deployment
supabase functions list
```

---

## 🌐 Configure Cardcom Webhook URL

1. Login to Cardcom dashboard
2. Go to **Settings** → **Webhooks**
3. Set webhook URL to:
   ```
   https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/cardcom-webhook
   ```
4. Save settings

---

## 📧 Configure SendGrid

1. Create SendGrid account and API key
2. Verify sender email: `noreply@ticovision.com`
3. Add recipient to authorized senders: `sigal@franco.co.il`
4. Set API key in Supabase secrets

---

## 🔒 Database Requirements

### Required Tables

Ensure these tables exist:

- `generated_letters` - Email tracking
- `fee_calculations` - Fee management
- `payment_method_selections` - Payment selections
- `payment_disputes` - Dispute tracking
- `payment_transactions` - Payment records
- `webhook_logs` - Webhook logging

### Required Columns

**generated_letters**:
- `opened_at` (TIMESTAMPTZ)
- `last_opened_at` (TIMESTAMPTZ)
- `open_count` (INTEGER)

**fee_calculations**:
- `payment_method_selected` (TEXT)
- `payment_method_selected_at` (TIMESTAMPTZ)
- `amount_after_selected_discount` (NUMERIC)
- `status` (TEXT)
- `payment_date` (TIMESTAMPTZ)
- `payment_reference` (TEXT)

**payment_method_selections**:
- `fee_calculation_id` (UUID)
- `client_id` (UUID)
- `selected_method` (TEXT)
- `original_amount` (NUMERIC)
- `discount_percent` (NUMERIC)
- `amount_after_discount` (NUMERIC)
- `completed_payment` (BOOLEAN)
- `payment_transaction_id` (UUID)

**payment_disputes**:
- `fee_calculation_id` (UUID)
- `client_id` (UUID)
- `dispute_reason` (TEXT)
- `claimed_payment_date` (DATE)
- `claimed_payment_method` (TEXT)
- `claimed_amount` (NUMERIC)
- `claimed_reference` (TEXT)
- `status` (TEXT)

**payment_transactions**:
- `cardcom_deal_id` (TEXT)
- `cardcom_transaction_id` (TEXT)
- `status` (TEXT)
- `amount` (NUMERIC)
- `currency` (TEXT)
- `invoice_number` (TEXT)
- `payment_date` (TIMESTAMPTZ)
- `failure_reason` (TEXT)
- `metadata` (JSONB)

**webhook_logs**:
- `source` (TEXT)
- `event_type` (TEXT)
- `payload` (JSONB)
- `processed_at` (TIMESTAMPTZ)
- `response_sent` (TEXT)

---

## 🐛 Troubleshooting

### Function Fails to Deploy

**Error**: "Function build failed"
```bash
# Check syntax errors
cd supabase/functions/track-email-open
deno check index.ts
```

**Error**: "Permission denied"
```bash
# Re-login to Supabase
supabase logout
supabase login
```

### Function Returns Errors

**Check logs**:
```bash
supabase functions logs track-email-open --tail
```

**Common issues**:
1. Missing environment variables
2. Database connection issues (check service role key)
3. RLS policies blocking updates
4. Invalid table schemas

### Email Not Sending

1. Verify SendGrid API key: `supabase secrets list`
2. Check SendGrid dashboard for bounces
3. Review function logs for email errors
4. Ensure sender email is verified

### Cardcom Webhook Not Working

1. Verify webhook URL in Cardcom dashboard
2. Check terminal number matches: `supabase secrets list`
3. Review `webhook_logs` table for incoming webhooks
4. Check function logs for processing errors

---

## 📈 Performance Monitoring

### Check Function Metrics

Via Supabase Dashboard:
1. Go to **Edge Functions** → **Metrics**
2. View:
   - Invocations per minute
   - Error rate
   - Execution time
   - Memory usage

### Database Performance

```sql
-- Check tracking pixel performance
SELECT
  COUNT(*) as total_opens,
  COUNT(DISTINCT id) as unique_letters,
  AVG(open_count) as avg_opens_per_letter
FROM generated_letters
WHERE opened_at IS NOT NULL;

-- Check payment selections
SELECT
  selected_method,
  COUNT(*) as selections,
  AVG(discount_percent) as avg_discount,
  AVG(amount_after_discount) as avg_amount
FROM payment_method_selections
GROUP BY selected_method;

-- Check dispute rate
SELECT
  COUNT(*) as total_disputes,
  status,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM payment_disputes
GROUP BY status;
```

---

## 🔐 Security Checklist

- [ ] Service role key is set and kept secret
- [ ] Cardcom terminal number validation is enabled
- [ ] Email tracking returns pixel even on errors (no data leaks)
- [ ] Webhook logs don't contain sensitive data
- [ ] CORS is properly configured for client-facing endpoints
- [ ] RLS policies protect database tables
- [ ] SendGrid API key has minimum required permissions

---

## 📝 Deployment Checklist

### Before Deployment
- [ ] Test all functions locally with `supabase functions serve`
- [ ] Run test suite: `npm run test tests/edge-functions/`
- [ ] Update environment variables
- [ ] Verify database schema is up to date
- [ ] Check RLS policies

### During Deployment
- [ ] Deploy functions one by one
- [ ] Test each function after deployment
- [ ] Monitor logs for errors
- [ ] Verify webhook endpoints

### After Deployment
- [ ] Configure Cardcom webhook URL
- [ ] Test email tracking in production
- [ ] Test payment flow end-to-end
- [ ] Monitor function metrics
- [ ] Set up alerts for errors

---

**Last Updated**: October 27, 2025
**Next Review**: After first production deployment
