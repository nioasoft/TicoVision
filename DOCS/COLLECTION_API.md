# Collection System - API Documentation

**Version**: 1.0
**Last Updated**: January 2025
**Base URL**: `https://your-project.supabase.co/functions/v1`

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Tracking Endpoints](#tracking-endpoints)
3. [Collection Endpoints](#collection-endpoints)
4. [Dispute Endpoints](#dispute-endpoints)
5. [Notification Endpoints](#notification-endpoints)
6. [Cron Job Endpoints](#cron-job-endpoints)
7. [Error Codes](#error-codes)

---

## Authentication

All endpoints (except tracking pixel) require authentication via Supabase JWT token.

### Headers
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Getting a Token
```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

---

## Tracking Endpoints

### 1. Track Email Open

**Endpoint**: `GET /api/track-email-open`

**Description**: Records when a client opens an email letter. Returns a 1x1 transparent pixel.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `letter_id` | UUID | Yes | ID of the generated_letters record |

**Request Example**:
```html
<!-- Embedded in email HTML -->
<img src="https://your-project.supabase.co/functions/v1/api/track-email-open?letter_id=abc-123-def"
     width="1" height="1" alt="" />
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: image/png

[1x1 transparent PNG binary data]
```

**Database Updates**:
```sql
UPDATE generated_letters SET
  opened_at = COALESCE(opened_at, NOW()),  -- Set once
  last_opened_at = NOW(),                   -- Update every time
  open_count = open_count + 1
WHERE id = :letter_id;
```

**Error Responses**:
- `400 Bad Request` - Missing letter_id
- `404 Not Found` - Letter ID not found
- `500 Internal Server Error` - Database error

---

### 2. Track Payment Selection

**Endpoint**: `GET /api/track-payment-selection`

**Description**: Records when a client selects a payment method. Redirects to the appropriate payment page.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fee_id` | UUID | Yes | ID of the fee_calculations record |
| `method` | String | Yes | Payment method: `bank_transfer`, `cc_single`, `cc_installments`, `checks` |
| `client_id` | UUID | Yes | ID of the client |

**Request Example**:
```html
<!-- Button in email -->
<a href="https://your-project.supabase.co/functions/v1/api/track-payment-selection?fee_id=abc-123&method=bank_transfer&client_id=xyz-789">
  לחץ לתשלום
</a>
```

**Response**:
```http
HTTP/1.1 302 Found
Location: https://your-domain.com/bank-transfer-details.html?fee_id=abc-123&amount=45500
```

**Database Updates**:
```sql
-- 1. Insert selection
INSERT INTO payment_method_selections (
  fee_calculation_id, client_id, selected_method,
  original_amount, discount_percent, amount_after_discount
) VALUES (...);

-- 2. Update fee calculation
UPDATE fee_calculations SET
  payment_method_selected = :method,
  payment_method_selected_at = NOW(),
  amount_after_selected_discount = :discounted_amount
WHERE id = :fee_id;
```

**Redirect URLs**:
| Method | Redirect To |
|--------|------------|
| `bank_transfer` | `/bank-transfer-details.html?fee_id={id}&amount={amount}` |
| `cc_single` | Cardcom payment page (maxPayments=1) |
| `cc_installments` | Cardcom payment page (maxPayments=10) |
| `checks` | `/check-details.html?fee_id={id}&num_checks=8` |

**Error Responses**:
- `400 Bad Request` - Missing required parameters
- `404 Not Found` - Fee ID not found
- `500 Internal Server Error` - Database error

---

## Collection Endpoints

### 3. Get Dashboard Data

**Endpoint**: `POST /api/collection/dashboard`

**Description**: Returns all data needed for the Collection Dashboard: KPIs, clients list, alerts.

**Headers**:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body**:
```json
{
  "filters": {
    "status": "sent_not_opened",
    "payment_method": "all",
    "time_range": "7-14",
    "amount_range": "all",
    "alert_type": "all"
  },
  "pagination": {
    "page": 1,
    "page_size": 20
  },
  "sort": {
    "column": "days_since_sent",
    "order": "desc"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "kpis": {
      "total_expected": 1500000,
      "total_received": 1200000,
      "total_pending": 300000,
      "collection_rate": 80,
      "clients_sent": 150,
      "clients_paid": 120,
      "clients_pending": 30,
      "alerts_unopened": 5,
      "alerts_no_selection": 3,
      "alerts_abandoned": 2,
      "alerts_disputes": 1
    },
    "rows": [
      {
        "client_id": "abc-123",
        "client_name": "חברת ABC",
        "company_name_hebrew": "ABC בע״מ",
        "contact_email": "contact@abc.co.il",
        "letter_sent_date": "2025-01-01T10:00:00Z",
        "letter_opened": true,
        "letter_opened_at": "2025-01-05T14:30:00Z",
        "letter_open_count": 3,
        "days_since_sent": 15,
        "amount_original": 50000,
        "payment_method_selected": "bank_transfer",
        "payment_method_selected_at": "2025-01-07T09:00:00Z",
        "discount_percent": 9,
        "amount_after_discount": 45500,
        "payment_status": "selected_not_paid",
        "amount_paid": 0,
        "amount_remaining": 45500,
        "reminder_count": 2,
        "last_reminder_sent": "2025-01-12T00:00:00Z",
        "has_alert": true,
        "alert_types": ["selected_not_paid_7d"],
        "has_dispute": false,
        "last_interaction": "2025-01-10T15:00:00Z",
        "interaction_count": 3
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "page_size": 20,
      "total_pages": 8
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User doesn't have access to collection module
- `500 Internal Server Error` - Database error

---

### 4. Mark Fee as Paid

**Endpoint**: `POST /api/collection/mark-paid`

**Description**: Marks a fee as fully paid.

**Request Body**:
```json
{
  "fee_id": "abc-123-def",
  "payment_date": "2025-01-15T10:00:00Z",  // Optional, defaults to NOW()
  "payment_reference": "Bank Transfer #12345"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fee_id": "abc-123-def",
    "status": "paid",
    "payment_date": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:05Z"
  }
}
```

**Database Updates**:
```sql
UPDATE fee_calculations SET
  status = 'paid',
  payment_date = :payment_date,
  payment_reference = :payment_reference,
  updated_at = NOW()
WHERE id = :fee_id;
```

**Error Responses**:
- `400 Bad Request` - Missing fee_id
- `404 Not Found` - Fee not found
- `409 Conflict` - Fee already marked as paid

---

### 5. Mark Partial Payment

**Endpoint**: `POST /api/collection/mark-partial-payment`

**Description**: Records a partial payment for a fee.

**Request Body**:
```json
{
  "fee_id": "abc-123-def",
  "amount_paid": 20000,
  "payment_date": "2025-01-15T10:00:00Z",
  "payment_reference": "Check #678",
  "notes": "קיבלנו המחאה ראשונה"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fee_id": "abc-123-def",
    "status": "partial_paid",
    "partial_payment_amount": 20000,
    "amount_remaining": 25500,
    "updated_at": "2025-01-15T10:00:05Z"
  }
}
```

**Database Updates**:
```sql
UPDATE fee_calculations SET
  status = 'partial_paid',
  partial_payment_amount = partial_payment_amount + :amount_paid,
  payment_date = :payment_date,
  payment_reference = :payment_reference,
  updated_at = NOW()
WHERE id = :fee_id;

-- If partial_payment_amount >= total_amount, mark as paid
```

**Error Responses**:
- `400 Bad Request` - Amount exceeds remaining balance
- `404 Not Found` - Fee not found

---

### 6. Add Client Interaction

**Endpoint**: `POST /api/collection/add-interaction`

**Description**: Records a manual interaction with a client (phone call, meeting, note).

**Request Body**:
```json
{
  "client_id": "abc-123",
  "fee_id": "def-456",  // Optional
  "interaction_type": "phone_call",
  "direction": "outbound",
  "subject": "התקשרתי לגבי שכר טרחה",
  "content": "דיברתי עם המנכ\"ל, הוא אמר ששלח העברה בנקאית",
  "outcome": "לבדוק בבנק מחר",
  "interacted_at": "2025-01-15T14:30:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "interaction_id": "ghi-789",
    "created_at": "2025-01-15T14:30:05Z"
  }
}
```

**Database Updates**:
```sql
INSERT INTO client_interactions (
  client_id, fee_calculation_id, interaction_type,
  direction, subject, content, outcome,
  interacted_at, created_by
) VALUES (...);
```

**Error Responses**:
- `400 Bad Request` - Missing required fields
- `404 Not Found` - Client not found

---

### 7. Send Manual Reminder

**Endpoint**: `POST /api/collection/send-reminder`

**Description**: Sends a manual reminder email to a client.

**Request Body**:
```json
{
  "fee_id": "abc-123-def",
  "template_id": "reminder_no_selection_14d",
  "include_mistake_button": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "reminder_id": "rem-456",
    "sent_at": "2025-01-15T15:00:00Z",
    "email_sent_to": "contact@client.co.il"
  }
}
```

**Database Updates**:
```sql
INSERT INTO payment_reminders (
  fee_calculation_id, reminder_type,
  sent_via, template_used
) VALUES (...);

UPDATE fee_calculations SET
  last_reminder_sent_at = NOW(),
  reminder_count = reminder_count + 1
WHERE id = :fee_id;
```

**Error Responses**:
- `400 Bad Request` - Invalid template_id
- `404 Not Found` - Fee not found
- `500 Internal Server Error` - Email send failed

---

## Dispute Endpoints

### 8. Submit Dispute

**Endpoint**: `POST /api/payment-dispute`

**Description**: Client submits a dispute claiming they already paid.

**Request Body**:
```json
{
  "fee_id": "abc-123-def",
  "client_id": "xyz-789",
  "dispute_reason": "שילמתי בהעברה בנקאית",
  "claimed_payment_date": "2025-01-10",
  "claimed_payment_method": "העברה בנקאית",
  "claimed_amount": 45500,
  "claimed_reference": "אסמכתא 123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "תודה! קיבלנו את פנייתך ונחזור אליך בהקדם.",
  "data": {
    "dispute_id": "dis-123"
  }
}
```

**Database Updates**:
```sql
INSERT INTO payment_disputes (
  fee_calculation_id, client_id,
  dispute_reason, claimed_payment_date,
  claimed_payment_method, claimed_amount,
  claimed_reference, status
) VALUES (..., 'pending');
```

**Notifications**:
- Email to Sigal: "⚠️ לקוח טוען ששילם"

**Error Responses**:
- `400 Bad Request` - Missing required fields
- `404 Not Found` - Fee or client not found

---

### 9. Resolve Dispute

**Endpoint**: `POST /api/collection/resolve-dispute`

**Description**: Sigal resolves a payment dispute.

**Headers**: Requires authentication

**Request Body**:
```json
{
  "dispute_id": "dis-123",
  "resolution_status": "resolved_paid",
  "resolution_notes": "מצאנו את ההעברה בבנק, אישרנו קבלת תשלום"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "dispute_id": "dis-123",
    "status": "resolved_paid",
    "resolved_at": "2025-01-16T10:00:00Z",
    "fee_status_updated": true
  }
}
```

**Database Updates**:
```sql
UPDATE payment_disputes SET
  status = :resolution_status,
  resolution_notes = :resolution_notes,
  resolved_by = :user_id,
  resolved_at = NOW()
WHERE id = :dispute_id;

-- If resolved_paid:
UPDATE fee_calculations SET
  status = 'paid',
  payment_date = (SELECT claimed_payment_date FROM payment_disputes WHERE id = :dispute_id)
WHERE id = (SELECT fee_calculation_id FROM payment_disputes WHERE id = :dispute_id);
```

**Error Responses**:
- `400 Bad Request` - Invalid resolution_status
- `404 Not Found` - Dispute not found
- `409 Conflict` - Dispute already resolved

---

## Notification Endpoints

### 10. Update Notification Settings

**Endpoint**: `POST /api/collection/notification-settings`

**Description**: Updates notification preferences for a user (Sigal).

**Request Body**:
```json
{
  "notify_letter_not_opened_days": 7,
  "notify_no_selection_days": 14,
  "notify_abandoned_cart_days": 2,
  "notify_checks_overdue_days": 30,
  "enable_email_notifications": true,
  "notification_email": "sigal@franco.co.il",
  "enable_automatic_reminders": true,
  "first_reminder_days": 14,
  "second_reminder_days": 30,
  "third_reminder_days": 60,
  "group_daily_alerts": false,
  "daily_alert_time": "09:00"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "settings_id": "set-123",
    "updated_at": "2025-01-16T11:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid values
- `401 Unauthorized` - Not authenticated

---

## Cron Job Endpoints

### 11. Reminder Engine (Cron)

**Endpoint**: `POST /api/cron/reminder-engine`

**Description**: Daily cron job that sends automated reminders based on rules.

**Schedule**: Daily at 00:00 (midnight)

**Authentication**: Service role key (not user JWT)

**Headers**:
```http
Authorization: Bearer <SERVICE_ROLE_KEY>
```

**Request Body**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "rules_processed": 4,
    "fees_matched": 25,
    "reminders_sent": 25,
    "emails_sent": 25,
    "sigal_notifications": 3,
    "execution_time_ms": 4523
  }
}
```

**Process**:
1. Load all active `reminder_rules`
2. For each rule, find matching `fee_calculations`
3. Send email to each client
4. Insert into `payment_reminders`
5. Update `fee_calculations.last_reminder_sent_at`
6. Send summary to Sigal

**Error Handling**:
- Continues on individual failures
- Logs all errors
- Sends error report to Sigal

---

### 12. Mark Overdue (Cron)

**Endpoint**: `POST /api/cron/mark-overdue`

**Description**: Updates fees with passed due_date to status='overdue'.

**Schedule**: Daily at 01:00

**Response**:
```json
{
  "success": true,
  "data": {
    "fees_marked_overdue": 12
  }
}
```

---

### 13. Daily Summary Email (Cron)

**Endpoint**: `POST /api/cron/daily-summary`

**Description**: Sends daily summary email to Sigal.

**Schedule**: Daily at 09:00

**Response**:
```json
{
  "success": true,
  "data": {
    "email_sent": true,
    "sent_to": "sigal@franco.co.il",
    "sent_at": "2025-01-16T09:00:00Z"
  }
}
```

---

## Error Codes

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "FEE_NOT_FOUND",
    "message": "Fee calculation not found",
    "details": {
      "fee_id": "abc-123"
    }
  }
}
```

### Error Codes Table

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `FEE_NOT_FOUND` | 404 | Fee calculation not found |
| `CLIENT_NOT_FOUND` | 404 | Client not found |
| `LETTER_NOT_FOUND` | 404 | Generated letter not found |
| `DISPUTE_NOT_FOUND` | 404 | Dispute not found |
| `INVALID_PARAMETERS` | 400 | Missing or invalid request parameters |
| `ALREADY_PAID` | 409 | Fee already marked as paid |
| `PARTIAL_EXCEEDS_TOTAL` | 400 | Partial payment exceeds total amount |
| `EMAIL_SEND_FAILED` | 500 | Failed to send email |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

- **Tracking endpoints**: 1000 requests/minute per IP
- **Collection endpoints**: 100 requests/minute per user
- **Cron endpoints**: No limit (service role only)

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642345678
```

---

## Webhooks

### Cardcom Payment Webhook

**Endpoint**: `POST /api/cardcom-webhook`

**Description**: Receives payment completion notifications from Cardcom.

**Authentication**: IP whitelisting (Cardcom IPs only)

**Request Body** (Cardcom format):
```json
{
  "terminalnumber": "172012",
  "lowprofilecode": "abc-123",
  "operation": "ChargeOnly",
  "dealnumber": "789456",
  "cardnumber": "4580****0000",
  "approvalnum": "123456",
  "sum": "45500",
  "currency": "ILS",
  "responsecode": "0",
  "responsemessage": "Success",
  "invoicenumber": "INV-123"
}
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/plain

-1
```

**Note**: Cardcom requires `-1` response to acknowledge webhook.

**Database Updates**:
```sql
-- 1. Update payment_transactions
UPDATE payment_transactions SET
  status = 'completed',
  cardcom_transaction_id = :dealnumber,
  invoice_number = :invoicenumber,
  payment_date = NOW()
WHERE cardcom_deal_id = :lowprofilecode;

-- 2. Update fee_calculations
UPDATE fee_calculations SET
  status = 'paid',
  payment_date = NOW(),
  payment_reference = :invoicenumber
WHERE id = (SELECT fee_calculation_id FROM payment_transactions WHERE cardcom_deal_id = :lowprofilecode);

-- 3. Update payment_method_selections
UPDATE payment_method_selections SET
  completed_payment = TRUE,
  payment_transaction_id = (SELECT id FROM payment_transactions WHERE cardcom_deal_id = :lowprofilecode)
WHERE fee_calculation_id = (SELECT fee_calculation_id FROM payment_transactions WHERE cardcom_deal_id = :lowprofilecode);
```

---

## Testing

### Testing Endpoints

Use the following test endpoints in development:

**Test Email Open**:
```bash
curl "http://localhost:54321/functions/v1/api/track-email-open?letter_id=test-123"
```

**Test Payment Selection**:
```bash
curl "http://localhost:54321/functions/v1/api/track-payment-selection?fee_id=test-123&method=bank_transfer&client_id=test-client"
```

**Test Dashboard (with auth)**:
```bash
curl -X POST "http://localhost:54321/functions/v1/api/collection/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filters":{}}'
```

---

**Last Updated**: January 2025
**Next Review**: After implementation completion
