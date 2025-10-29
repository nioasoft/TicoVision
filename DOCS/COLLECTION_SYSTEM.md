# Collection Management System - Documentation

**Version**: 1.0
**Last Updated**: January 2025
**Status**: In Development

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Features](#features)
5. [User Flows](#user-flows)
6. [API Reference](#api-reference)
7. [Notification System](#notification-system)
8. [Reminder Engine](#reminder-engine)
9. [Security](#security)
10. [User Guide](#user-guide)

---

## Overview

### Purpose
מערכת ניהול גביה מלאה למנהלת הכספים (Sigal) שמאפשרת:
- מעקב אחר כל מכתב שכר טרחה שנשלח
- ידיעה בזמן אמת מי פתח, מי בחר אופן תשלום, מי שילם
- התראות אוטומטיות על לקוחות שזקוקים למעקב
- תזכורות אוטומטיות ללקוחות
- ניהול מחלוקות ("שילמתי")
- היסטוריה מלאה של כל אינטראקציה

### Business Context
- **Target Users**: Sigal Nagar (CFO) + Office managers
- **Scale**: 700+ clients initially, designed for 10,000+
- **Revenue Impact**: Critical for cash flow management
- **Automation Level**: 95% automated, 5% manual intervention

### Key Metrics
```typescript
interface SystemMetrics {
  // Tracking
  email_open_rate: number;           // Target: >80%
  payment_selection_rate: number;    // Target: >70%
  payment_completion_rate: number;   // Target: >90%

  // Collection
  collection_rate: number;            // Target: >95%
  average_days_to_payment: number;    // Target: <30 days
  dispute_rate: number;               // Target: <2%

  // Automation
  automatic_reminder_success: number; // Target: >60%
  manual_intervention_rate: number;   // Target: <5%
}
```

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                           │
├─────────────────────────────────────────────────────────────┤
│  Email Client    →  Letter HTML (tracking pixel)            │
│  Payment Pages   →  bank-transfer / check-details / Cardcom │
│  Dispute Form    →  payment-dispute.html                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  EDGE FUNCTIONS (Supabase)                   │
├─────────────────────────────────────────────────────────────┤
│  /api/track-email-open          →  Tracking pixel           │
│  /api/track-payment-selection   →  Payment method tracking  │
│  /api/payment-dispute           →  Dispute handling         │
│  /api/cardcom-webhook           →  Payment completion       │
│  /api/cron/reminder-engine      →  Daily reminders (00:00)  │
│  /api/notifications/sigal       →  Alerts to Sigal          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (PostgreSQL)                      │
├─────────────────────────────────────────────────────────────┤
│  fee_calculations           →  Fee details + status          │
│  generated_letters          →  Letter tracking               │
│  payment_method_selections  →  Payment choice tracking       │
│  payment_transactions       →  Cardcom payments              │
│  payment_disputes           →  Disputes ("שילמתי")          │
│  payment_reminders          →  Reminder history             │
│  client_interactions        →  Manual interactions          │
│  notification_settings      →  Sigal's preferences          │
│  reminder_rules             →  Configurable rules           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              COLLECTION DASHBOARD (React)                    │
├─────────────────────────────────────────────────────────────┤
│  KPIs           →  Real-time collection metrics             │
│  Filters        →  Status, method, time, amount             │
│  Table          →  All clients with full details            │
│  Actions        →  Mark paid, add interaction, send reminder│
│  Settings       →  Configure alerts and rules               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Flow 1: Letter Sent → Payment Completed
```
1. System generates letter with fee_calculations
   └─> status: 'draft'

2. Letter sent via email
   └─> fee_calculations.status: 'sent'
   └─> generated_letters.sent_at: NOW()

3. Client opens email
   └─> Tracking pixel: /api/track-email-open
   └─> generated_letters.opened_at: NOW()
   └─> generated_letters.open_count++

4. Client clicks payment button
   └─> /api/track-payment-selection?method=bank_transfer
   └─> payment_method_selections INSERT
   └─> fee_calculations.payment_method_selected: 'bank_transfer'
   └─> fee_calculations.amount_after_selected_discount: calculated

5a. Bank Transfer: Redirect to bank-transfer-details.html
5b. Credit Card: Redirect to Cardcom payment page
5c. Checks: Redirect to check-details.html

6. Payment completed (Cardcom webhook)
   └─> /api/cardcom-webhook
   └─> payment_transactions.status: 'completed'
   └─> fee_calculations.status: 'paid'
   └─> fee_calculations.payment_date: NOW()
```

#### Flow 2: Automated Reminders
```
Daily Cron Job (00:00):
1. /api/cron/reminder-engine executes

2. Load all active reminder_rules
   └─> ORDER BY priority ASC

3. For each rule:
   a. Find matching fee_calculations
   b. Check trigger conditions:
      - days_since_sent >= X
      - payment_status = ['sent', 'partial_paid']
      - payment_method_selected IS NULL

4. For each matching fee:
   a. Send reminder email to client
   b. INSERT into payment_reminders
   c. UPDATE fee_calculations.last_reminder_sent_at
   d. UPDATE fee_calculations.reminder_count++

5. Notify Sigal (if configured):
   └─> Email: "נשלחו 5 תזכורות היום"
```

#### Flow 3: Dispute Handling
```
1. Client receives reminder email
   └─> Clicks: "חלה טעות - שילמתי"

2. Redirects to /payment-dispute.html
   └─> Form: payment_date, method, amount, reference

3. Submit form
   └─> POST /api/payment-dispute
   └─> INSERT payment_disputes
   └─> Send email to Sigal: "לקוח X טוען ששילם"

4. Sigal reviews in dashboard
   └─> Opens DisputeResolutionDialog
   └─> Checks records (bank, Cardcom, etc.)

5. Sigal resolves:
   a. Resolved as paid:
      └─> UPDATE fee_calculations.status: 'paid'
      └─> UPDATE payment_disputes.status: 'resolved_paid'

   b. Resolved as unpaid:
      └─> UPDATE payment_disputes.status: 'resolved_unpaid'
      └─> Send email to client explaining
```

---

## Database Schema

### Core Tables

#### 1. `fee_calculations` (Extended)
```sql
CREATE TABLE fee_calculations (
  -- Existing columns (from fee.service.ts)
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  client_id UUID NOT NULL,
  year INTEGER NOT NULL,
  base_amount NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL, -- 'draft'|'sent'|'paid'|'partial_paid'|'overdue'

  -- NEW: Payment method tracking
  payment_method_selected TEXT,  -- 'bank_transfer'|'cc_single'|'cc_installments'|'checks'
  payment_method_selected_at TIMESTAMPTZ,
  amount_after_selected_discount NUMERIC,  -- Amount after the discount they chose

  -- NEW: Partial payment support
  partial_payment_amount NUMERIC DEFAULT 0,

  -- NEW: Reminder tracking
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_fee_status ON fee_calculations(tenant_id, status);
CREATE INDEX idx_fee_reminders ON fee_calculations(tenant_id, last_reminder_sent_at)
  WHERE status IN ('sent', 'partial_paid');
```

#### 2. `generated_letters` (Extended)
```sql
CREATE TABLE generated_letters (
  -- Existing columns
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  client_id UUID NOT NULL,
  fee_calculation_id UUID,
  generated_content_html TEXT NOT NULL,

  -- NEW: Email tracking
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,  -- First time opened
  last_opened_at TIMESTAMPTZ,  -- Most recent open
  open_count INTEGER DEFAULT 0,  -- How many times opened

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tracking queries
CREATE INDEX idx_letter_tracking ON generated_letters(tenant_id, sent_at, opened_at);
```

#### 3. `payment_method_selections` (NEW)
```sql
CREATE TABLE payment_method_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id),
  generated_letter_id UUID NOT NULL REFERENCES generated_letters(id),

  -- Selection details
  selected_method TEXT NOT NULL,  -- 'bank_transfer'|'cc_single'|'cc_installments'|'checks'
  original_amount NUMERIC NOT NULL,  -- Amount before discount
  discount_percent NUMERIC NOT NULL,  -- 9% | 8% | 4% | 0%
  amount_after_discount NUMERIC NOT NULL,  -- Final amount

  -- Completion tracking
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  completed_payment BOOLEAN DEFAULT FALSE,
  payment_transaction_id UUID REFERENCES payment_transactions(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_selections ON payment_method_selections(tenant_id, fee_calculation_id);

-- RLS Policy
CREATE POLICY "tenant_isolation" ON payment_method_selections
  USING (tenant_id = (SELECT get_current_tenant_id()));
```

#### 4. `payment_disputes` (NEW)
```sql
CREATE TABLE payment_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id),

  -- Client's claim
  dispute_reason TEXT,  -- "שילמתי בהעברה בנקאית"
  claimed_payment_date DATE,
  claimed_payment_method TEXT,
  claimed_amount NUMERIC,
  claimed_reference TEXT,  -- Bank reference / Check number

  -- Resolution
  status TEXT DEFAULT 'pending',  -- 'pending'|'resolved_paid'|'resolved_unpaid'|'invalid'
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_pending ON payment_disputes(tenant_id, status)
  WHERE status = 'pending';

-- RLS Policy
CREATE POLICY "tenant_isolation" ON payment_disputes
  USING (tenant_id = (SELECT get_current_tenant_id()));
```

#### 5. `payment_reminders` (NEW)
```sql
CREATE TABLE payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  fee_calculation_id UUID NOT NULL REFERENCES fee_calculations(id),

  -- Reminder details
  reminder_type TEXT NOT NULL,  -- 'no_open'|'no_selection'|'abandoned_cart'|'checks_overdue'
  reminder_sequence INTEGER,  -- 1, 2, 3...

  -- Delivery
  sent_via TEXT,  -- 'email'|'sms'|'both'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  template_used TEXT,

  -- Tracking
  email_opened BOOLEAN DEFAULT FALSE,
  email_opened_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders ON payment_reminders(tenant_id, fee_calculation_id, sent_at DESC);

-- RLS Policy
CREATE POLICY "tenant_isolation" ON payment_reminders
  USING (tenant_id = (SELECT get_current_tenant_id()));
```

#### 6. `client_interactions` (NEW)
```sql
CREATE TABLE client_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  fee_calculation_id UUID REFERENCES fee_calculations(id),

  -- Interaction details
  interaction_type TEXT NOT NULL,  -- 'phone_call'|'email_sent'|'meeting'|'note'
  direction TEXT,  -- 'outbound'|'inbound'

  subject TEXT NOT NULL,
  content TEXT,
  outcome TEXT,  -- "הבטיח לשלם עד סוף החודש"

  interacted_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions ON client_interactions(tenant_id, client_id, interacted_at DESC);

-- RLS Policy
CREATE POLICY "tenant_isolation" ON client_interactions
  USING (tenant_id = (SELECT get_current_tenant_id()));
```

#### 7. `notification_settings` (NEW)
```sql
CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Alert thresholds (configurable by Sigal)
  notify_letter_not_opened_days INTEGER DEFAULT 7,
  notify_no_selection_days INTEGER DEFAULT 14,
  notify_abandoned_cart_days INTEGER DEFAULT 2,
  notify_checks_overdue_days INTEGER DEFAULT 30,

  -- Notification channels
  enable_email_notifications BOOLEAN DEFAULT TRUE,
  notification_email TEXT,  -- sigal@franco.co.il

  -- Reminder settings
  enable_automatic_reminders BOOLEAN DEFAULT TRUE,
  first_reminder_days INTEGER DEFAULT 14,
  second_reminder_days INTEGER DEFAULT 30,
  third_reminder_days INTEGER DEFAULT 60,

  -- Grouping
  group_daily_alerts BOOLEAN DEFAULT FALSE,  -- Send one summary email per day
  daily_alert_time TIME DEFAULT '09:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- RLS Policy
CREATE POLICY "user_isolation" ON notification_settings
  USING (user_id = auth.uid());
```

#### 8. `reminder_rules` (NEW)
```sql
CREATE TABLE reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  name TEXT NOT NULL,
  description TEXT,

  -- Trigger conditions (JSONB for flexibility)
  trigger_conditions JSONB NOT NULL,
  /* Example:
  {
    "days_since_sent": 14,
    "payment_status": ["sent"],
    "opened": false,
    "payment_method_selected": null
  }
  */

  -- Actions (JSONB for flexibility)
  actions JSONB NOT NULL,
  /* Example:
  {
    "send_email": true,
    "email_template_id": "reminder_no_open_14d",
    "send_sms": false,
    "notify_sigal": true,
    "include_mistake_button": true
  }
  */

  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,  -- Lower = higher priority

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rules_active ON reminder_rules(tenant_id, priority)
  WHERE is_active = TRUE;

-- RLS Policy
CREATE POLICY "tenant_isolation" ON reminder_rules
  USING (tenant_id = (SELECT get_current_tenant_id()));
```

---

## Features

### 1. Real-Time Tracking

#### Email Open Tracking
- **Mechanism**: 1x1 transparent tracking pixel
- **Endpoint**: `/api/track-email-open?letter_id=xxx`
- **Data Captured**:
  - First open timestamp
  - Total open count
  - Last open timestamp
- **Privacy**: Complies with email tracking standards

#### Payment Method Selection Tracking
- **Mechanism**: Buttons redirect through tracking endpoint
- **Endpoint**: `/api/track-payment-selection?fee_id=xxx&method=bank_transfer`
- **Data Captured**:
  - Selected method
  - Timestamp of selection
  - Discount applied
  - Final amount after discount
- **Flow**:
  1. Client clicks payment button in email
  2. Redirects to tracking endpoint
  3. Records selection in database
  4. Redirects to appropriate payment page

#### Payment Completion Tracking
- **Mechanism**: Cardcom webhook
- **Endpoint**: `/api/cardcom-webhook`
- **Data Captured**:
  - Transaction ID
  - Payment amount
  - Payment date
  - Card details (last 4 digits)
- **Updates**:
  - `payment_transactions.status: 'completed'`
  - `fee_calculations.status: 'paid'`
  - `payment_method_selections.completed_payment: true`

### 2. Collection Dashboard

#### KPIs (Real-Time)
```typescript
interface DashboardKPIs {
  // Financial
  total_expected: number;        // Total fees sent
  total_received: number;        // Total paid
  total_pending: number;         // Total outstanding
  collection_rate: number;       // % collected

  // Client counts
  clients_sent: number;          // Letters sent
  clients_paid: number;          // Fully paid
  clients_pending: number;       // Outstanding

  // Alerts
  alerts_unopened: number;       // Not opened 7+ days
  alerts_no_selection: number;   // Not selected 14+ days
  alerts_abandoned: number;      // Started Cardcom, didn't finish
  alerts_disputes: number;       // Active disputes
}
```

#### Filters
1. **Payment Status**:
   - All
   - Sent but not opened
   - Opened but not selected
   - Selected but not paid
   - Partially paid
   - Fully paid
   - Disputed

2. **Payment Method Selected**:
   - All
   - Bank transfer (9% discount)
   - Credit card single (8% discount)
   - Credit card installments (4% discount)
   - Checks (0% discount)
   - Not selected yet

3. **Time Range**:
   - 0-7 days
   - 8-14 days
   - 15-30 days
   - 31-60 days
   - 60+ days (critical)
   - Custom date range

4. **Amount Range**:
   - All
   - Up to ₪10,000
   - ₪10,000 - ₪50,000
   - ₪50,000+
   - Custom range

5. **Alert Type**:
   - All
   - Not opened 7+ days
   - Not selected 14+ days
   - Abandoned Cardcom
   - Checks overdue 30+ days
   - Has active dispute

#### Table Columns
```typescript
interface CollectionRow {
  // Client
  client_id: string;
  client_name: string;
  company_name_hebrew: string;
  contact_email: string;
  contact_phone: string;

  // Letter tracking
  letter_sent_date: Date;
  letter_opened: boolean;
  letter_opened_at?: Date;
  letter_open_count: number;
  days_since_sent: number;

  // Payment
  amount_original: number;           // Before discount
  payment_method_selected?: string;
  payment_method_selected_at?: Date;
  discount_percent: number;
  amount_after_discount: number;     // After discount

  // Status
  payment_status: PaymentStatus;
  amount_paid: number;
  amount_remaining: number;

  // Reminders
  reminder_count: number;
  last_reminder_sent?: Date;

  // Alerts
  has_alert: boolean;
  alert_types: AlertType[];

  // Disputes
  has_dispute: boolean;
  dispute_status?: string;

  // Interactions
  last_interaction?: Date;
  interaction_count: number;
}
```

#### Action Buttons
1. **Mark as Paid** - Full payment
2. **Mark Partial Payment** - Partial amount
3. **Add Interaction** - Phone call, meeting, note
4. **Send Manual Reminder** - Override automatic system
5. **View Letter** - Display generated letter
6. **View History** - All interactions, reminders, payments
7. **Resolve Dispute** - Handle "שילמתי" claims

### 3. Automated Reminder System

#### Reminder Types

##### Type 1: Not Opened (7 days)
```yaml
Name: "לא נפתח המכתב - 7 ימים"
Trigger:
  days_since_sent: 7
  payment_status: ['sent']
  opened: false
Action:
  send_email: true
  email_template: 'reminder_no_open_7d'
  notify_sigal: true
  include_mistake_button: true
```

##### Type 2: Not Selected (14 days)
```yaml
Name: "לא בחר אופן תשלום - 14 ימים"
Trigger:
  days_since_sent: 14
  payment_status: ['sent']
  opened: true
  payment_method_selected: null
Action:
  send_email: true
  email_template: 'reminder_no_selection_14d'
  notify_sigal: true
  include_mistake_button: true
```

##### Type 3: Abandoned Cardcom (2 days)
```yaml
Name: "נטש Cardcom - 2 ימים"
Trigger:
  payment_method_selected: ['cc_single', 'cc_installments']
  completed_payment: false
  days_since_selection: 2
Action:
  send_email: true
  email_template: 'reminder_abandoned_cart_2d'
  notify_sigal: false
  include_mistake_button: false
```

##### Type 4: Checks Overdue (30 days)
```yaml
Name: "המחאות לא הגיעו - 30 ימים"
Trigger:
  payment_method_selected: 'checks'
  payment_status: ['sent']
  days_since_selection: 30
Action:
  send_email: true
  email_template: 'reminder_checks_overdue_30d'
  notify_sigal: true
  include_mistake_button: true
```

### 4. Notification System

#### Notifications to Sigal

##### Daily Summary (09:00)
```typescript
interface DailySummary {
  date: Date;
  new_payments: {
    count: number;
    total_amount: number;
    clients: ClientSummary[];
  };
  reminders_sent: {
    count: number;
    by_type: Record<string, number>;
  };
  new_alerts: {
    unopened_7d: number;
    no_selection_14d: number;
    abandoned_cart: number;
    checks_overdue: number;
  };
  new_disputes: {
    count: number;
    clients: ClientSummary[];
  };
}
```

##### Real-Time Alerts
- New dispute created
- Payment completed (large amount >₪50K)
- Client opened letter for first time
- Critical alert (60+ days no response)

---

## User Flows

### Flow 1: Sigal Checks Dashboard (Morning Routine)

```
1. Sigal opens Collection Dashboard
   └─> URL: /collections

2. System loads:
   └─> KPIs (real-time)
   └─> Filters (default: all pending)
   └─> Table (sorted by urgency)
   └─> Alerts sidebar

3. Sigal sees KPIs:
   └─> Total Expected: ₪1,500,000
   └─> Total Received: ₪1,200,000
   └─> Collection Rate: 80%
   └─> Pending: ₪300,000
   └─> Alerts: 8

4. Sigal filters:
   └─> Status: "Not opened 7+ days"
   └─> Result: 5 clients

5. Sigal takes action on Client A:
   └─> Clicks "Send Manual Reminder"
   └─> Confirms
   └─> Email sent immediately
   └─> Row updated: "Reminder sent 09:15"

6. Sigal adds note:
   └─> Clicks "Add Interaction"
   └─> Type: "Phone Call"
   └─> Content: "התקשרתי, לא ענו"
   └─> Saves
   └─> Interaction logged
```

### Flow 2: Client Pays via Bank Transfer

```
1. Client receives letter
   └─> Opens email
   └─> Tracking pixel fires → opened_at recorded

2. Client clicks "העברה בנקאית"
   └─> Redirects to /api/track-payment-selection
   └─> Records: method='bank_transfer', discount=9%
   └─> Redirects to /bank-transfer-details.html

3. Bank transfer page shows:
   └─> Original amount: ₪50,000
   └─> After 9% discount: ₪45,500
   └─> Bank details
   └─> Button: "אישור - שלחתי את ההעברה"

4. Client clicks "שלחתי את ההעברה"
   └─> payment_method_selections.completed_payment: false
   └─> fee_calculations.status: 'sent' (still pending)
   └─> Email to Sigal: "לקוח X אישר העברה בנקאית"

5. Sigal checks bank account
   └─> Sees ₪45,500 from client
   └─> Opens dashboard
   └─> Clicks "Mark as Paid"
   └─> fee_calculations.status: 'paid'
   └─> payment_date: NOW()
```

### Flow 3: Client Disputes ("שילמתי")

```
1. Client receives reminder (14 days)
   └─> Email includes: "חלה טעות - שילמתי"

2. Client clicks button
   └─> Redirects to /payment-dispute.html
   └─> Form appears

3. Client fills form:
   └─> "שילמתי בהעברה בנקאית"
   └─> תאריך: 05/10/2025
   └─> סכום: ₪45,500
   └─> אסמכתא: 123456
   └─> Submit

4. System processes:
   └─> INSERT payment_disputes
   └─> Email to Sigal: "לקוח X טוען ששילם"
   └─> Client sees: "תודה, נבדוק ונחזור אליך"

5. Sigal reviews:
   └─> Opens dashboard
   └─> Sees alert: "1 New Dispute"
   └─> Clicks dispute
   └─> Checks bank records

6. Sigal resolves:
   a. Found payment:
      └─> Status: 'resolved_paid'
      └─> fee_calculations.status: 'paid'
      └─> Email to client: "אישרנו קבלת תשלום"

   b. Not found:
      └─> Status: 'resolved_unpaid'
      └─> Email to client: "לא מצאנו, אנא שלח אסמכתא"
```

---

## API Reference

### See [COLLECTION_API.md](./COLLECTION_API.md) for complete API documentation

---

## Security

### Data Protection
- All tables have RLS (Row Level Security) policies
- Tenant isolation enforced at database level
- No cross-tenant data leakage possible

### Authentication
- Supabase Auth for all endpoints
- JWT tokens validated on every request
- User permissions checked before actions

### Webhook Security
- Cardcom webhook validates IP ranges
- Signature verification on all webhooks
- Replay attack prevention

### Privacy Compliance
- Email tracking pixel complies with GDPR
- Client data encrypted at rest
- Audit logs for all sensitive actions

---

## User Guide

### For Sigal (CFO)

#### Daily Routine (5 minutes)
1. Open Collection Dashboard
2. Review KPIs
3. Check alerts
4. Take action on urgent items

#### Weekly Tasks
1. Review payment disputes
2. Check collection rate trends
3. Adjust reminder rules if needed
4. Export reports for accounting

#### Monthly Review
1. Collection rate analysis
2. Payment method preferences
3. Reminder effectiveness
4. Dispute resolution rate

---

**End of Documentation**

For technical details, see:
- [COLLECTION_TASKS.md](./COLLECTION_TASKS.md) - Task breakdown
- [COLLECTION_API.md](./COLLECTION_API.md) - API documentation
- [COLLECTION_TESTING.md](./COLLECTION_TESTING.md) - Testing plan
