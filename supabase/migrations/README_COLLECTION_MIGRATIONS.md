# Collection System Migrations - Quick Reference

**Date Created**: 2025-10-27
**Migration Range**: 032-040 (9 files)
**Status**: Ready for Testing

---

## Migration Files

| # | File | Purpose | Tables/Changes |
|---|------|---------|----------------|
| 032 | collection_system_fee_calculations.sql | Extend fee_calculations | +6 columns, +2 indexes |
| 033 | collection_system_generated_letters.sql | Extend generated_letters | +4 columns, +1 index |
| 034 | payment_method_selections.sql | New table | payment_method_selections + RLS |
| 035 | payment_disputes.sql | New table | payment_disputes + RLS |
| 036 | payment_reminders.sql | New table | payment_reminders + RLS |
| 037 | client_interactions.sql | New table | client_interactions + RLS |
| 038 | notification_settings.sql | New table | notification_settings + RLS |
| 039 | reminder_rules.sql | New table + defaults | reminder_rules + RLS + 4 default rules |
| 040 | collection_system_functions.sql | Functions + views | 2 functions + 1 view |

---

## Key Features

### UUID Generation
✅ All migrations use `gen_random_uuid()` (not uuid_generate_v4())

### Multi-Tenancy
✅ All tables have `tenant_id` column
✅ All RLS policies use `get_current_tenant_id()`

### Foreign Keys
✅ All foreign keys properly defined with ON DELETE CASCADE/SET NULL

### Indexes
✅ Performance indexes on frequently queried columns
✅ Partial indexes for filtered queries (WHERE clauses)

### Documentation
✅ All tables have COMMENT ON TABLE
✅ All columns have COMMENT ON COLUMN
✅ All indexes have COMMENT ON INDEX

---

## Testing Commands

### Apply Migrations (Local)
```bash
npx supabase db reset  # Reset local DB with all migrations
```

### Apply Migrations (Production)
```bash
npx supabase db push   # Push migrations to production
```

### Generate TypeScript Types
```bash
npm run generate-types  # After migrations applied
```

### Verify Tables Created
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_method_selections',
  'payment_disputes',
  'payment_reminders',
  'client_interactions',
  'notification_settings',
  'reminder_rules'
);
```

### Verify Columns Added
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'fee_calculations'
AND column_name IN (
  'payment_method_selected',
  'payment_method_selected_at',
  'amount_after_selected_discount',
  'partial_payment_amount',
  'last_reminder_sent_at',
  'reminder_count'
);
```

### Verify Indexes
```sql
SELECT indexname FROM pg_indexes
WHERE tablename IN (
  'fee_calculations',
  'generated_letters',
  'payment_method_selections',
  'payment_disputes',
  'payment_reminders',
  'client_interactions',
  'reminder_rules'
);
```

### Verify RLS Policies
```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN (
  'payment_method_selections',
  'payment_disputes',
  'payment_reminders',
  'client_interactions',
  'notification_settings',
  'reminder_rules'
);
```

### Verify Functions
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_collection_statistics',
  'get_fees_needing_reminders'
);
```

### Verify View
```sql
SELECT table_name FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'collection_dashboard_view';
```

### Test Functions
```sql
-- Test collection statistics
SELECT * FROM get_collection_statistics(
  (SELECT get_current_tenant_id())
);

-- Test reminder engine (replace with actual rule_id)
SELECT * FROM get_fees_needing_reminders(
  (SELECT get_current_tenant_id()),
  (SELECT id FROM reminder_rules WHERE is_active = TRUE LIMIT 1)
);
```

### Verify Default Reminder Rules
```sql
SELECT name, priority, is_active
FROM reminder_rules
WHERE tenant_id = (SELECT get_current_tenant_id())
ORDER BY priority;
-- Should return 4 rules:
-- 1. לא נפתח המכתב - 7 ימים (priority 10)
-- 2. לא בחר אופן תשלום - 14 ימים (priority 20)
-- 3. נטש Cardcom - 2 ימים (priority 30)
-- 4. המחאות לא הגיעו - 30 ימים (priority 40)
```

---

## Schema Overview

### Extended Tables (2)
- **fee_calculations** - Added payment tracking, partial payments, reminders
- **generated_letters** - Added email tracking (sent, opened, open count)

### New Tables (6)
1. **payment_method_selections** - Client payment choice tracking
2. **payment_disputes** - "שילמתי" dispute handling
3. **payment_reminders** - Reminder history
4. **client_interactions** - Manual interaction logging
5. **notification_settings** - User alert preferences
6. **reminder_rules** - Configurable reminder automation

### Database Functions (2)
1. **get_collection_statistics()** - Dashboard KPIs
2. **get_fees_needing_reminders()** - Reminder engine queries

### Views (1)
1. **collection_dashboard_view** - Combined collection data

---

## Common Issues & Solutions

### Issue: Migration fails with "function does not exist"
**Solution**: Ensure `get_current_tenant_id()` function exists (from earlier migrations)

### Issue: Migration fails with "relation does not exist"
**Solution**: Check that referenced tables exist (tenants, clients, fee_calculations, etc.)

### Issue: RLS policy prevents access
**Solution**: Ensure user has valid tenant_id in JWT token (app_metadata)

### Issue: Foreign key constraint violation
**Solution**: Verify parent records exist before inserting child records

### Issue: JSONB validation errors in reminder_rules
**Solution**: Ensure trigger_conditions and actions are valid JSON objects

---

## Rollback Instructions

If you need to rollback these migrations:

```sql
-- Run in reverse order (040 to 032)
-- See full rollback script in /docs/COLLECTION_MIGRATIONS.md
```

---

## Next Steps After Migration

1. **Generate Types**
   ```bash
   npm run generate-types
   ```

2. **Create TypeScript Interfaces**
   - PaymentMethodSelection
   - PaymentDispute
   - PaymentReminder
   - ClientInteraction
   - NotificationSettings
   - ReminderRule

3. **Implement Services**
   - collection.service.ts
   - payment-selection.service.ts
   - dispute.service.ts
   - reminder.service.ts
   - interaction.service.ts
   - notification-settings.service.ts
   - reminder-rules.service.ts

4. **Build UI Components**
   - Collection Dashboard
   - Dispute Resolution Dialog
   - Notification Settings Panel
   - Reminder Rules Configuration

5. **Implement Edge Functions**
   - /api/track-email-open
   - /api/track-payment-selection
   - /api/payment-dispute
   - /api/cron/reminder-engine
   - /api/notifications/sigal

6. **Testing**
   - Unit tests for all services
   - Integration tests for collection flow
   - E2E tests for reminder automation

---

## Documentation Links

- [COLLECTION_SYSTEM.md](/docs/COLLECTION_SYSTEM.md) - Complete system documentation
- [COLLECTION_MIGRATIONS.md](/docs/COLLECTION_MIGRATIONS.md) - Detailed migration guide
- [DATABASE_REFERENCE.md](/docs/DATABASE_REFERENCE.md) - Database schema reference

---

**Status**: ✅ Ready for Testing
**Created By**: Database Admin Agent
**Date**: 2025-10-27
