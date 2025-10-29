# Collection System - Database Migrations Summary

**Created**: 2025-10-27
**Migration Numbers**: 032-040
**Purpose**: Database schema for Collection Management System

---

## Migration Overview

### 032_collection_system_fee_calculations.sql
**Purpose**: Extend `fee_calculations` table for payment tracking

**New Columns**:
- `payment_method_selected` TEXT - Client's chosen payment method (bank_transfer/cc_single/cc_installments/checks)
- `payment_method_selected_at` TIMESTAMPTZ - When client selected method
- `amount_after_selected_discount` NUMERIC - Final amount after discount (9%/8%/4%/0%)
- `partial_payment_amount` NUMERIC - Amount paid in partial payments (default 0)
- `last_reminder_sent_at` TIMESTAMPTZ - Last reminder timestamp
- `reminder_count` INTEGER - Number of reminders sent (default 0)

**Indexes**:
- `idx_fee_calculations_status` - For collection dashboard status filtering
- `idx_fee_calculations_reminders` - Partial index for reminder engine queries

---

### 033_collection_system_generated_letters.sql
**Purpose**: Extend `generated_letters` table for email tracking

**New Columns**:
- `sent_at` TIMESTAMPTZ - When letter was sent
- `opened_at` TIMESTAMPTZ - First time client opened email (tracking pixel)
- `last_opened_at` TIMESTAMPTZ - Most recent open
- `open_count` INTEGER - Total number of opens (default 0)

**Indexes**:
- `idx_generated_letters_tracking` - For sent/opened status queries

---

### 034_payment_method_selections.sql
**Purpose**: New table to track payment method selections

**Table**: `payment_method_selections`

**Columns**:
- `id` UUID PRIMARY KEY
- `tenant_id` UUID (FK to tenants)
- `client_id` UUID (FK to clients)
- `fee_calculation_id` UUID (FK to fee_calculations)
- `generated_letter_id` UUID (FK to generated_letters)
- `selected_method` TEXT - bank_transfer/cc_single/cc_installments/checks
- `original_amount` NUMERIC - Before discount
- `discount_percent` NUMERIC - 0-9%
- `amount_after_discount` NUMERIC - Final amount
- `selected_at` TIMESTAMPTZ
- `completed_payment` BOOLEAN - TRUE when payment confirmed
- `payment_transaction_id` UUID (FK to payment_transactions)
- `created_at` TIMESTAMPTZ

**RLS**: Tenant isolation policy enabled
**Indexes**: `idx_payment_selections_fee` on (tenant_id, fee_calculation_id)

---

### 035_payment_disputes.sql
**Purpose**: New table to track client disputes ("שילמתי")

**Table**: `payment_disputes`

**Columns**:
- `id` UUID PRIMARY KEY
- `tenant_id` UUID (FK to tenants)
- `client_id` UUID (FK to clients)
- `fee_calculation_id` UUID (FK to fee_calculations)
- `dispute_reason` TEXT - Client explanation
- `claimed_payment_date` DATE
- `claimed_payment_method` TEXT - bank_transfer/credit_card/check/cash/other
- `claimed_amount` NUMERIC
- `claimed_reference` TEXT - Bank reference/check number
- `status` TEXT - pending/resolved_paid/resolved_unpaid/invalid
- `resolved_by` UUID (FK to auth.users)
- `resolved_at` TIMESTAMPTZ
- `resolution_notes` TEXT
- `created_at` TIMESTAMPTZ

**RLS**: Tenant isolation policy enabled
**Indexes**: `idx_payment_disputes_pending` - Partial index WHERE status = 'pending'

---

### 036_payment_reminders.sql
**Purpose**: New table to track all payment reminders

**Table**: `payment_reminders`

**Columns**:
- `id` UUID PRIMARY KEY
- `tenant_id` UUID (FK to tenants)
- `client_id` UUID (FK to clients)
- `fee_calculation_id` UUID (FK to fee_calculations)
- `reminder_type` TEXT - no_open/no_selection/abandoned_cart/checks_overdue/manual
- `reminder_sequence` INTEGER - 1, 2, 3...
- `sent_via` TEXT - email/sms/both
- `sent_at` TIMESTAMPTZ
- `template_used` TEXT
- `email_opened` BOOLEAN
- `email_opened_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ

**RLS**: Tenant isolation policy enabled
**Indexes**: `idx_payment_reminders` on (tenant_id, fee_calculation_id, sent_at DESC)

---

### 037_client_interactions.sql
**Purpose**: New table to track manual client interactions

**Table**: `client_interactions`

**Columns**:
- `id` UUID PRIMARY KEY
- `tenant_id` UUID (FK to tenants)
- `client_id` UUID (FK to clients)
- `fee_calculation_id` UUID (FK to fee_calculations, nullable)
- `interaction_type` TEXT - phone_call/email_sent/meeting/note/whatsapp/other
- `direction` TEXT - outbound/inbound
- `subject` TEXT
- `content` TEXT
- `outcome` TEXT - e.g., "הבטיח לשלם עד סוף החודש"
- `interacted_at` TIMESTAMPTZ
- `created_by` UUID (FK to auth.users)
- `created_at` TIMESTAMPTZ

**RLS**: Tenant isolation policy enabled
**Indexes**: `idx_client_interactions` on (tenant_id, client_id, interacted_at DESC)

---

### 038_notification_settings.sql
**Purpose**: New table for user notification preferences (Sigal)

**Table**: `notification_settings`

**Columns**:
- `id` UUID PRIMARY KEY
- `tenant_id` UUID (FK to tenants)
- `user_id` UUID (FK to auth.users)
- `notify_letter_not_opened_days` INTEGER (default 7)
- `notify_no_selection_days` INTEGER (default 14)
- `notify_abandoned_cart_days` INTEGER (default 2)
- `notify_checks_overdue_days` INTEGER (default 30)
- `enable_email_notifications` BOOLEAN (default TRUE)
- `notification_email` TEXT
- `enable_automatic_reminders` BOOLEAN (default TRUE)
- `first_reminder_days` INTEGER (default 14)
- `second_reminder_days` INTEGER (default 30)
- `third_reminder_days` INTEGER (default 60)
- `group_daily_alerts` BOOLEAN (default FALSE)
- `daily_alert_time` TIME (default 09:00)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ
- UNIQUE(tenant_id, user_id)

**RLS**: User isolation policy (user_id = auth.uid())
**Triggers**: `update_updated_at_column`

---

### 039_reminder_rules.sql
**Purpose**: New table for configurable reminder rules

**Table**: `reminder_rules`

**Columns**:
- `id` UUID PRIMARY KEY
- `tenant_id` UUID (FK to tenants)
- `name` TEXT
- `description` TEXT
- `trigger_conditions` JSONB - Flexible trigger conditions
- `actions` JSONB - Flexible actions
- `is_active` BOOLEAN (default TRUE)
- `priority` INTEGER (default 0, lower = higher priority)
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ

**RLS**: Tenant isolation policy enabled
**Indexes**: `idx_reminder_rules_active` - Partial index WHERE is_active = TRUE
**Triggers**: `update_updated_at_column`

**Default Rules Inserted**:
1. **לא נפתח המכתב - 7 ימים** (Priority 10)
   - Conditions: {days_since_sent: 7, payment_status: ["sent"], opened: false}
   - Actions: {send_email: true, email_template: "reminder_no_open_7d", notify_sigal: true}

2. **לא בחר אופן תשלום - 14 ימים** (Priority 20)
   - Conditions: {days_since_sent: 14, payment_status: ["sent"], opened: true, payment_method_selected: null}
   - Actions: {send_email: true, email_template: "reminder_no_selection_14d", notify_sigal: true}

3. **נטש Cardcom - 2 ימים** (Priority 30)
   - Conditions: {payment_method_selected: ["cc_single", "cc_installments"], completed_payment: false, days_since_selection: 2}
   - Actions: {send_email: true, email_template: "reminder_abandoned_cart_2d", notify_sigal: false}

4. **המחאות לא הגיעו - 30 ימים** (Priority 40)
   - Conditions: {payment_method_selected: "checks", payment_status: ["sent"], days_since_selection: 30}
   - Actions: {send_email: true, email_template: "reminder_checks_overdue_30d", notify_sigal: true}

---

### 040_collection_system_functions.sql
**Purpose**: Helper functions and views for collection dashboard

**Functions**:

1. **get_collection_statistics(p_tenant_id UUID)**
   - Returns collection dashboard KPIs
   - Output: total_expected, total_received, total_pending, collection_rate, clients_sent, clients_paid, clients_pending, alerts_unopened, alerts_no_selection, alerts_abandoned, alerts_disputes
   - Type: SECURITY DEFINER

2. **get_fees_needing_reminders(p_tenant_id UUID, p_rule_id UUID)**
   - Returns fees matching a reminder rule
   - Used by automated reminder engine
   - Output: fee_calculation_id, client_id, client_email, amount, days_since_sent, opened, payment_method_selected
   - Type: SECURITY DEFINER

**Views**:

1. **collection_dashboard_view**
   - Combines fee_calculations, clients, generated_letters, payment_disputes, client_interactions
   - Provides complete collection tracking data for dashboard
   - Includes: client info, letter tracking, payment details, reminders, disputes, interactions

**Permissions**:
- GRANT EXECUTE ON FUNCTIONS TO authenticated
- GRANT SELECT ON VIEW TO authenticated

---

## Testing Checklist

### Before Applying Migrations:
- [ ] All migrations numbered sequentially (032-040)
- [ ] All migrations use `gen_random_uuid()` not `uuid_generate_v4()`
- [ ] All tables have `tenant_id` column
- [ ] All RLS policies use `get_current_tenant_id()`
- [ ] All foreign keys properly defined
- [ ] All indexes have comments

### After Applying Migrations:
- [ ] All migrations run without errors
- [ ] All tables created successfully
- [ ] All indexes created
- [ ] RLS policies enabled and working
- [ ] Foreign keys enforcing data integrity
- [ ] Default reminder rules inserted
- [ ] Functions executable by authenticated users
- [ ] View accessible by authenticated users

### Integration Testing:
- [ ] Test collection dashboard KPI query
- [ ] Test reminder engine queries
- [ ] Test payment method selection flow
- [ ] Test dispute creation and resolution
- [ ] Test manual interaction logging
- [ ] Test notification settings CRUD
- [ ] Test reminder rules CRUD

---

## Security Considerations

### Row Level Security (RLS):
- **tenant_isolation**: All tables except notification_settings
  - Policy: `tenant_id = get_current_tenant_id()`
- **user_isolation**: notification_settings only
  - Policy: `user_id = auth.uid()`

### SECURITY DEFINER Functions:
- `get_collection_statistics()` - Safe, no user input
- `get_fees_needing_reminders()` - Safe, validates rule_id exists

### Potential Security Issues:
- ✅ All user input in JSONB fields (trigger_conditions, actions) is not executed as SQL
- ✅ No SQL injection vectors in function queries
- ✅ All foreign keys properly constrained
- ✅ RLS policies prevent cross-tenant data access

---

## Performance Considerations

### Critical Indexes:
1. `idx_fee_calculations_status` - For dashboard status filtering
2. `idx_fee_calculations_reminders` - Partial index for reminder engine
3. `idx_generated_letters_tracking` - For tracking queries
4. `idx_payment_disputes_pending` - Partial index for active disputes
5. `idx_reminder_rules_active` - Partial index for active rules

### Query Optimization:
- Partial indexes on frequently queried subsets (status = 'pending', is_active = TRUE)
- DESC indexes on timestamp columns (sent_at DESC, interacted_at DESC)
- Composite indexes for multi-column queries (tenant_id, status), (tenant_id, fee_calculation_id)

### Expected Load:
- **Initial**: 700 clients, ~1000 fees/year
- **Target**: 10,000 clients, ~15,000 fees/year
- **Dashboard queries**: Real-time, <500ms response time
- **Reminder engine**: Daily cron job (00:00), batch processing

---

## Rollback Strategy

If migrations fail or cause issues:

```sql
-- Rollback 040 (Functions and Views)
DROP VIEW IF EXISTS collection_dashboard_view CASCADE;
DROP FUNCTION IF EXISTS get_collection_statistics(UUID);
DROP FUNCTION IF EXISTS get_fees_needing_reminders(UUID, UUID);

-- Rollback 039 (Reminder Rules)
DROP TABLE IF EXISTS reminder_rules CASCADE;

-- Rollback 038 (Notification Settings)
DROP TABLE IF EXISTS notification_settings CASCADE;

-- Rollback 037 (Client Interactions)
DROP TABLE IF EXISTS client_interactions CASCADE;

-- Rollback 036 (Payment Reminders)
DROP TABLE IF EXISTS payment_reminders CASCADE;

-- Rollback 035 (Payment Disputes)
DROP TABLE IF EXISTS payment_disputes CASCADE;

-- Rollback 034 (Payment Method Selections)
DROP TABLE IF EXISTS payment_method_selections CASCADE;

-- Rollback 033 (Generated Letters)
ALTER TABLE generated_letters
  DROP COLUMN IF EXISTS sent_at,
  DROP COLUMN IF EXISTS opened_at,
  DROP COLUMN IF EXISTS last_opened_at,
  DROP COLUMN IF EXISTS open_count;
DROP INDEX IF EXISTS idx_generated_letters_tracking;

-- Rollback 032 (Fee Calculations)
ALTER TABLE fee_calculations
  DROP COLUMN IF EXISTS payment_method_selected,
  DROP COLUMN IF EXISTS payment_method_selected_at,
  DROP COLUMN IF EXISTS amount_after_selected_discount,
  DROP COLUMN IF EXISTS partial_payment_amount,
  DROP COLUMN IF EXISTS last_reminder_sent_at,
  DROP COLUMN IF EXISTS reminder_count;
DROP INDEX IF EXISTS idx_fee_calculations_status;
DROP INDEX IF EXISTS idx_fee_calculations_reminders;
```

---

## Next Steps

### After Applying Migrations:
1. Generate TypeScript types: `npm run generate-types`
2. Create TypeScript interfaces for new tables
3. Implement collection service layer
4. Build collection dashboard UI
5. Implement reminder engine (Edge Function)
6. Implement tracking endpoints (email open, payment selection)
7. Test full collection workflow end-to-end

### Service Implementation Order:
1. `collection.service.ts` - Collection statistics and dashboard queries
2. `payment-selection.service.ts` - Payment method selection tracking
3. `dispute.service.ts` - Dispute creation and resolution
4. `reminder.service.ts` - Reminder sending and tracking
5. `interaction.service.ts` - Manual interaction logging
6. `notification-settings.service.ts` - User preferences management
7. `reminder-rules.service.ts` - Rule configuration management

---

**Migration Status**: ✅ Ready for Testing
**Total Files**: 9 migration files (032-040)
**Total Tables Added**: 6 new tables
**Total Columns Added**: 10 (fee_calculations + generated_letters)
**Total Functions**: 2
**Total Views**: 1
**Default Data**: 4 reminder rules per tenant

---

**References**:
- [COLLECTION_SYSTEM.md](/docs/COLLECTION_SYSTEM.md) - Full system documentation
- [DATABASE_REFERENCE.md](/docs/DATABASE_REFERENCE.md) - Database schema reference
- [COLLECTION_API.md](/docs/COLLECTION_API.md) - API documentation (to be created)
