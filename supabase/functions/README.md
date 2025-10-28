# TicoVision Edge Functions

This directory contains Supabase Edge Functions for the TicoVision collection tracking system.

## 📋 Available Functions

### 1. track-email-open
**Purpose**: Records when a client opens an email (tracking pixel)

**Endpoint**: `GET /api/track-email-open?letter_id={uuid}`

**Usage**:
```html
<!-- Embed in email HTML -->
<img src="https://your-project.supabase.co/functions/v1/track-email-open?letter_id=abc-123-def"
     width="1" height="1" alt="" />
```

**Response**: 1x1 transparent PNG pixel

**Database Updates**:
- `opened_at` - Set once on first open
- `last_opened_at` - Updated every time
- `open_count` - Incremented on each open

---

### 2. track-payment-selection
**Purpose**: Records payment method selection and redirects to payment page

**Endpoint**: `GET /api/track-payment-selection?fee_id={uuid}&method={string}&client_id={uuid}`

**Parameters**:
- `fee_id` - Fee calculation ID
- `method` - Payment method: `bank_transfer`, `cc_single`, `cc_installments`, `checks`
- `client_id` - Client ID

**Usage**:
```html
<!-- Payment button in email -->
<a href="https://your-project.supabase.co/functions/v1/track-payment-selection?fee_id=abc&method=bank_transfer&client_id=xyz">
  לחץ לתשלום
</a>
```

**Response**: 302 Redirect to payment page

**Discounts Applied**:
- Bank transfer: 9%
- CC single payment: 8%
- CC installments: 4%
- Checks: 0%

**Database Updates**:
- Inserts into `payment_method_selections`
- Updates `fee_calculations` with selected method and discounted amount

---

### 3. payment-dispute
**Purpose**: Handles dispute submissions from clients

**Endpoint**: `POST /api/payment-dispute`

**Request Body**:
```json
{
  "fee_id": "uuid",
  "client_id": "uuid",
  "dispute_reason": "string",
  "claimed_payment_date": "date",
  "claimed_payment_method": "string",
  "claimed_amount": "number",
  "claimed_reference": "string"
}
```

**Response**:
```json
{
  "success": true,
  "message": "תודה! קיבלנו את פנייתך ונחזור אליך בהקדם.",
  "data": {
    "dispute_id": "uuid"
  }
}
```

**Actions**:
1. Inserts dispute into `payment_disputes` table
2. Sends email notification to Sigal (sigal@franco.co.il)
3. Returns success message to client

---

### 4. cardcom-webhook
**Purpose**: Receives payment completion notifications from Cardcom

**Endpoint**: `POST /cardcom-webhook`

**Request**: Form data from Cardcom (application/x-www-form-urlencoded)

**Response**: `-1` (required by Cardcom)

**Database Updates on Successful Payment**:
1. Updates `payment_transactions` with status='completed'
2. Updates `fee_calculations` with status='paid'
3. Updates `payment_method_selections` with completed_payment=true
4. Logs webhook to `webhook_logs`

**Database Updates on Failed Payment**:
1. Updates `payment_transactions` with status='failed' and failure_reason
2. Logs webhook to `webhook_logs`

---

## 🚀 Deployment

### Deploy All Functions
```bash
supabase functions deploy track-email-open
supabase functions deploy track-payment-selection
supabase functions deploy payment-dispute
supabase functions deploy cardcom-webhook
```

### Deploy Single Function
```bash
supabase functions deploy track-email-open
```

---

## 🧪 Testing

### Local Testing
```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve track-email-open --env-file .env.local
```

### Run Tests
```bash
npm run test tests/edge-functions/
```

### Manual Testing

**Test Email Open**:
```bash
curl "http://localhost:54321/functions/v1/track-email-open?letter_id=test-123"
```

**Test Payment Selection**:
```bash
curl "http://localhost:54321/functions/v1/track-payment-selection?fee_id=test-123&method=bank_transfer&client_id=test-client"
```

**Test Dispute Submission**:
```bash
curl -X POST "http://localhost:54321/functions/v1/payment-dispute" \
  -H "Content-Type: application/json" \
  -d '{
    "fee_id": "test-123",
    "client_id": "test-client",
    "dispute_reason": "שילמתי כבר",
    "claimed_payment_date": "2025-10-15",
    "claimed_payment_method": "העברה בנקאית",
    "claimed_amount": 45500,
    "claimed_reference": "123456"
  }'
```

**Test Cardcom Webhook**:
```bash
curl -X POST "http://localhost:54321/functions/v1/cardcom-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "terminalnumber=172012&lowprofilecode=test-lp&responsecode=0&sum=45500&dealnumber=deal-123&approvalnum=APP456"
```

---

## 🔧 Environment Variables

Required in `.env.local`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SendGrid (for email notifications)
SENDGRID_API_KEY=your-sendgrid-key

# App URL
APP_URL=https://ticovision.vercel.app

# Cardcom
CARDCOM_ENV=test
CARDCOM_TERMINAL=172012
CARDCOM_USERNAME=your-username
```

---

## 📊 Database Tables Used

### generated_letters
- `opened_at` - First open timestamp
- `last_opened_at` - Latest open timestamp
- `open_count` - Number of opens

### fee_calculations
- `payment_method_selected` - Selected payment method
- `payment_method_selected_at` - Selection timestamp
- `amount_after_selected_discount` - Amount after discount
- `status` - Payment status (paid/pending)
- `payment_date` - Payment completion date
- `payment_reference` - Invoice/transaction reference

### payment_method_selections
- `fee_calculation_id` - Fee reference
- `client_id` - Client reference
- `selected_method` - Payment method
- `original_amount` - Original amount
- `discount_percent` - Discount percentage
- `amount_after_discount` - Final amount
- `completed_payment` - Payment completion flag
- `payment_transaction_id` - Transaction reference

### payment_disputes
- `fee_calculation_id` - Fee reference
- `client_id` - Client reference
- `dispute_reason` - Dispute explanation
- `claimed_payment_date` - Claimed payment date
- `claimed_payment_method` - Claimed method
- `claimed_amount` - Claimed amount
- `claimed_reference` - Payment reference
- `status` - Dispute status (pending/resolved_paid/resolved_not_paid)

### payment_transactions
- `cardcom_deal_id` - Cardcom LowProfileId
- `cardcom_transaction_id` - Cardcom deal number
- `status` - Transaction status (pending/completed/failed)
- `amount` - Transaction amount
- `invoice_number` - Invoice number
- `payment_date` - Payment date
- `failure_reason` - Failure reason (if failed)

### webhook_logs
- `source` - Webhook source (cardcom)
- `event_type` - Event type (payment_success/payment_failed)
- `payload` - Full webhook data
- `processed_at` - Processing timestamp
- `response_sent` - Response sent to webhook

---

## 🔒 Security

### Authentication
- Most endpoints use **Service Role Key** for database access (no user authentication needed)
- Cardcom webhook validates `terminalnumber` to ensure it's from Cardcom

### Error Handling
- All functions return graceful responses even on errors
- `track-email-open` always returns pixel (never exposes errors)
- `cardcom-webhook` always returns `-1` (required by Cardcom)

### CORS
- `payment-dispute` has CORS enabled for client-side calls
- Tracking endpoints don't require CORS (GET/image responses)

---

## 📝 Notes

1. **Cardcom Response**: The webhook MUST return `-1` to acknowledge receipt
2. **Email Pixel**: Always returns a pixel, even on errors (for privacy/tracking)
3. **Discounts**: Applied automatically based on payment method selection
4. **Notifications**: Dispute submissions trigger email to Sigal
5. **Logging**: All webhooks are logged to `webhook_logs` table

---

## 🐛 Troubleshooting

### Function Not Responding
```bash
# Check function logs
supabase functions logs track-email-open

# Check if function is deployed
supabase functions list
```

### Database Connection Issues
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Check RLS policies on tables
- Ensure service role key has necessary permissions

### Email Not Sending
- Verify `SENDGRID_API_KEY` is valid
- Check SendGrid dashboard for delivery status
- Review function logs for email errors

### Cardcom Webhook Not Working
- Verify `CARDCOM_TERMINAL` matches your terminal number
- Check webhook URL is correctly configured in Cardcom dashboard
- Review `webhook_logs` table for incoming webhooks

---

**Last Updated**: October 2025
**Maintained By**: TicoVision AI Development Team
