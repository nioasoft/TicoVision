# Collection Reminder Engine - Documentation

**Version**: 1.0
**Created**: January 2025
**Status**: Production Ready

---

## 📋 Overview

The Collection Reminder Engine is an automated system that sends payment reminders to clients based on configurable rules. It runs daily via `pg_cron` and integrates with SendGrid for email delivery.

### Features

- ✅ **Automated Daily Execution** - Runs at 9:00 AM Israel time via pg_cron
- ✅ **Multi-Tenant Support** - Processes all active tenants
- ✅ **Configurable Rules** - Flexible JSONB-based rule system
- ✅ **Rate Limiting** - Max 3 reminders per fee per day, 10 emails/second
- ✅ **Admin Alerts** - Notify Sigal for configurable thresholds
- ✅ **Comprehensive Logging** - All actions logged to `payment_reminders` table
- ✅ **Error Handling** - Continues on individual failures, logs all errors
- ✅ **Real-Time Alerts** - Hourly alert monitor for time-sensitive issues

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    pg_cron (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│  Daily at 7:00 AM UTC (9:00 AM Israel)                      │
│  └─> Calls: /functions/v1/collection-reminder-engine        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           Collection Reminder Engine (Edge Function)         │
├─────────────────────────────────────────────────────────────┤
│  1. Fetch all active tenants                                 │
│  2. For each tenant:                                         │
│     - Get active reminder rules (sorted by priority)         │
│     - Get fees needing reminders (via DB function)           │
│     - Match fees against rules (first match wins)            │
│     - Send reminder emails (SendGrid)                        │
│     - Update reminder counts                                 │
│     - Send admin alerts if configured                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  SendGrid Email Service                       │
├─────────────────────────────────────────────────────────────┤
│  Templates:                                                   │
│  - reminder_no_open_7d                                       │
│  - reminder_no_selection_14d                                 │
│  - reminder_abandoned_cart_2d                                │
│  - reminder_checks_overdue_30d                               │
│  - admin_alert_template                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Database Updates (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  - payment_reminders (INSERT)                                │
│  - fee_calculations (UPDATE reminder_count)                  │
│  - audit_logs (INSERT for admin alerts)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Files Created

### Edge Functions

1. **`/supabase/functions/collection-reminder-engine/index.ts`**
   - Daily reminder engine
   - Processes all tenants and sends automated reminders
   - Runs: Daily at 7:00 AM UTC

2. **`/supabase/functions/alert-monitor/index.ts`**
   - Real-time alert checking
   - Returns summary of all alerts
   - Runs: Hourly OR manually triggered

### Services

3. **`/src/services/email-template.service.ts`**
   - Email template generation
   - SendGrid integration
   - Reminder history logging
   - TypeScript service extending BaseService

### Database

4. **`/supabase/migrations/041_setup_pg_cron.sql`**
   - pg_cron extension setup
   - 4 scheduled jobs:
     - `daily-collection-reminders` (7:00 AM UTC)
     - `hourly-alert-monitor` (Every hour)
     - `daily-summary-email` (7:00 AM UTC)
     - `mark-overdue-fees` (1:00 AM UTC)
   - Monitoring view: `cron_job_monitoring`

### Testing

5. **`/supabase/functions/_shared/test-helpers.ts`**
   - Test data creation utilities
   - Complete scenario builders
   - Verification helpers
   - Cleanup utilities

---

## 🚀 Deployment

### Step 1: Apply Database Migration

```bash
# Navigate to project root
cd /Users/asafbenatia/asi_soft/TicoVision

# Apply pg_cron migration
npx supabase db push

# Verify cron jobs are scheduled
psql $DATABASE_URL -c "SELECT * FROM cron.job;"
```

### Step 2: Deploy Edge Functions

```bash
# Deploy collection-reminder-engine
npx supabase functions deploy collection-reminder-engine

# Deploy alert-monitor
npx supabase functions deploy alert-monitor

# Verify deployment
npx supabase functions list
```

### Step 3: Configure Environment Variables

In Supabase Dashboard → Settings → Edge Functions → Secrets:

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Test Manually

```bash
# Test reminder engine (manual trigger)
curl -X POST \
  https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/collection-reminder-engine \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# Test alert monitor
curl -X POST \
  https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/alert-monitor \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Step 5: Monitor Cron Jobs

```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- View recent executions
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;

-- View monitoring dashboard
SELECT * FROM cron_job_monitoring;
```

---

## 📊 Reminder Rules

Rules are stored in the `reminder_rules` table with JSONB configuration:

### Rule Structure

```typescript
interface ReminderRule {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  trigger_conditions: {
    days_since_sent?: number;
    days_since_opened?: number;
    days_since_selection?: number;
    payment_method_selected?: string | string[];
    payment_status?: string[];
    opened?: boolean;
    completed_payment?: boolean;
  };
  actions: {
    send_email: boolean;
    send_sms?: boolean;
    notify_admin: boolean;
    email_template?: string;
    include_mistake_button?: boolean;
  };
  is_active: boolean;
  priority: number; // Lower = higher priority (0 = highest)
}
```

### Default Rules

4 default rules are created for each tenant:

#### 1. Not Opened (7 days)
```json
{
  "name": "לא נפתח המכתב - 7 ימים",
  "trigger_conditions": {
    "days_since_sent": 7,
    "payment_status": ["sent"],
    "opened": false,
    "payment_method_selected": null
  },
  "actions": {
    "send_email": true,
    "email_template": "reminder_no_open_7d",
    "notify_admin": true,
    "include_mistake_button": true
  },
  "priority": 10
}
```

#### 2. Not Selected (14 days)
```json
{
  "name": "לא בחר אופן תשלום - 14 ימים",
  "trigger_conditions": {
    "days_since_sent": 14,
    "payment_status": ["sent"],
    "opened": true,
    "payment_method_selected": null
  },
  "actions": {
    "send_email": true,
    "email_template": "reminder_no_selection_14d",
    "notify_admin": true,
    "include_mistake_button": true
  },
  "priority": 20
}
```

#### 3. Abandoned Cardcom (2 days)
```json
{
  "name": "נטש Cardcom - 2 ימים",
  "trigger_conditions": {
    "payment_method_selected": ["cc_single", "cc_installments"],
    "completed_payment": false,
    "days_since_selection": 2
  },
  "actions": {
    "send_email": true,
    "email_template": "reminder_abandoned_cart_2d",
    "notify_admin": false,
    "include_mistake_button": false
  },
  "priority": 30
}
```

#### 4. Checks Overdue (30 days)
```json
{
  "name": "המחאות לא הגיעו - 30 ימים",
  "trigger_conditions": {
    "payment_method_selected": "checks",
    "payment_status": ["sent"],
    "days_since_selection": 30
  },
  "actions": {
    "send_email": true,
    "email_template": "reminder_checks_overdue_30d",
    "notify_admin": true,
    "include_mistake_button": true
  },
  "priority": 40
}
```

---

## 🔔 Alert Monitor

The alert monitor checks for time-sensitive issues:

### Alert Types

1. **Unopened Letters** - Letters not opened after X days (default: 7)
2. **No Payment Selection** - No payment method selected after X days (default: 14)
3. **Abandoned Cardcom** - Started Cardcom but didn't finish (default: 3 days)
4. **Checks Overdue** - Selected checks but didn't send them (default: 30 days)
5. **Pending Disputes** - Active "שילמתי" disputes

### Response Format

```json
{
  "success": true,
  "data": {
    "tenant_id": "abc-123",
    "alerts": {
      "unopened_letters": {
        "count": 5,
        "fee_ids": ["fee-1", "fee-2", "..."],
        "threshold_days": 7
      },
      "no_selection": {
        "count": 3,
        "fee_ids": ["fee-3", "fee-4", "fee-5"],
        "threshold_days": 14
      },
      "abandoned_cardcom": {
        "count": 2,
        "fee_ids": ["fee-6", "fee-7"],
        "threshold_days": 3
      },
      "checks_overdue": {
        "count": 1,
        "fee_ids": ["fee-8"],
        "threshold_days": 30
      },
      "pending_disputes": {
        "count": 1,
        "dispute_ids": ["dis-1"]
      }
    },
    "total_alerts": 12,
    "checked_at": "2025-01-27T10:00:00Z"
  }
}
```

---

## 🧪 Testing

### Using Test Helpers

```typescript
import { createClient } from '@supabase/supabase-js';
import {
  createCompleteTestScenario,
  verifyReminderSent,
  cleanupTestData
} from '../_shared/test-helpers.ts';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create complete test scenario
const { feeId, letterId, ruleId } = await createCompleteTestScenario(
  supabase,
  'tenant-id',
  'client-id',
  'no_open' // or 'no_selection', 'abandoned_cart', 'checks_overdue'
);

// Manually trigger reminder engine
const response = await fetch(
  'https://your-project.supabase.co/functions/v1/collection-reminder-engine',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    }
  }
);

// Verify reminder was sent
const sent = await verifyReminderSent(supabase, feeId, 'no_open');
console.assert(sent, 'Reminder should have been sent');

// Clean up
await cleanupTestData(supabase, 'tenant-id');
```

### Manual Testing Scenarios

#### Scenario 1: Letter Not Opened (7 days)

```sql
-- Create test data
INSERT INTO fee_calculations (tenant_id, client_id, status, created_at)
VALUES ('tenant-id', 'client-id', 'sent', NOW() - INTERVAL '7 days');

INSERT INTO generated_letters (tenant_id, client_id, fee_calculation_id, sent_at, opened_at)
VALUES ('tenant-id', 'client-id', 'fee-id', NOW() - INTERVAL '7 days', NULL);

-- Trigger reminder engine
-- (Use curl command from Deployment section)

-- Verify reminder sent
SELECT * FROM payment_reminders WHERE fee_calculation_id = 'fee-id';
SELECT reminder_count FROM fee_calculations WHERE id = 'fee-id';
```

---

## 📈 Monitoring & Metrics

### Cron Job Status

```sql
-- View all cron jobs and their last execution
SELECT * FROM cron_job_monitoring;

-- Expected output:
jobid | jobname                      | schedule   | active | current_status
------|------------------------------|------------|--------|----------------
1     | daily-collection-reminders   | 0 7 * * *  | t      | Success
2     | hourly-alert-monitor         | 0 * * * *  | t      | Success
3     | daily-summary-email          | 0 7 * * *  | t      | Success
4     | mark-overdue-fees            | 0 1 * * *  | t      | Success
```

### Reminder Statistics

```sql
-- Daily reminder count
SELECT
  DATE(sent_at) as date,
  reminder_type,
  COUNT(*) as count
FROM payment_reminders
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), reminder_type
ORDER BY date DESC;

-- Success rate (email opened)
SELECT
  reminder_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE email_opened = TRUE) as opened,
  ROUND(COUNT(*) FILTER (WHERE email_opened = TRUE)::NUMERIC / COUNT(*) * 100, 2) as open_rate
FROM payment_reminders
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY reminder_type;
```

---

## 🛠️ Troubleshooting

### Issue: Cron job not running

**Check:**
```sql
-- Verify pg_cron extension is installed
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check if jobs are scheduled
SELECT * FROM cron.job;

-- Check recent execution logs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
```

**Fix:**
```sql
-- Re-apply migration
\i supabase/migrations/041_setup_pg_cron.sql
```

### Issue: Emails not sending

**Check:**
1. SendGrid API key configured: `SELECT current_setting('app.settings.sendgrid_api_key', true);`
2. SendGrid templates exist with correct IDs
3. Client email addresses are valid

**Debug:**
```bash
# Test SendGrid directly
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "sigal@franco.co.il"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

### Issue: Reminders sent multiple times

**Check:**
```sql
-- Check duplicate reminders
SELECT
  fee_calculation_id,
  reminder_type,
  DATE(sent_at),
  COUNT(*) as count
FROM payment_reminders
WHERE sent_at >= CURRENT_DATE
GROUP BY fee_calculation_id, reminder_type, DATE(sent_at)
HAVING COUNT(*) > 1;
```

**Fix:** The engine has built-in duplicate prevention. Check for:
- Rate limit bypass (max 3 per day per fee)
- `wasReminderSentToday()` function logic

---

## 🔐 Security

### Access Control

- ✅ Edge Functions require service role key
- ✅ RLS policies on all tables
- ✅ Tenant isolation enforced
- ✅ Audit logging for all actions

### Rate Limiting

- ✅ Max 3 reminders per fee per day
- ✅ 10 emails/second to SendGrid
- ✅ 100ms delay between emails
- ✅ Batch processing (100 fees at a time)

### Error Handling

- ✅ Individual failures don't break batch
- ✅ All errors logged to console
- ✅ Admin alert if >10% failure rate
- ✅ Comprehensive error messages

---

## 📝 Next Steps

### Phase 1 (Completed)
- ✅ Reminder engine implementation
- ✅ Alert monitor
- ✅ pg_cron setup
- ✅ Test helpers

### Phase 2 (Future)
- [ ] SMS integration (Twilio)
- [ ] WhatsApp reminders
- [ ] A/B testing for email templates
- [ ] Advanced analytics dashboard
- [ ] Machine learning for optimal send times

---

## 📞 Support

For questions or issues:
- **Email**: asaf@ticovision.com
- **Documentation**: `/docs/COLLECTION_SYSTEM.md`
- **API Reference**: `/docs/COLLECTION_API.md`

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Production Ready ✅
