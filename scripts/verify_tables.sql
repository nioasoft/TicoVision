-- Verify all collection system tables were created successfully

-- 1. Check all new tables exist
SELECT
  table_name,
  'EXISTS ✅' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_method_selections',
  'payment_disputes',
  'payment_reminders',
  'client_interactions',
  'notification_settings',
  'reminder_rules'
)
ORDER BY table_name;

-- 2. Check new columns in fee_calculations
SELECT
  'fee_calculations' as table_name,
  column_name,
  data_type,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'fee_calculations'
AND column_name IN (
  'payment_method_selected',
  'payment_method_selected_at',
  'amount_after_selected_discount',
  'partial_payment_amount',
  'last_reminder_sent_at',
  'reminder_count'
)
ORDER BY column_name;

-- 3. Check new columns in generated_letters
SELECT
  'generated_letters' as table_name,
  column_name,
  data_type,
  '✅' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'generated_letters'
AND column_name IN (
  'sent_at',
  'opened_at',
  'last_opened_at',
  'open_count'
)
ORDER BY column_name;

-- 4. Check functions were created
SELECT
  routine_name as function_name,
  'EXISTS ✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_collection_statistics',
  'get_fees_needing_reminders'
)
ORDER BY routine_name;

-- 5. Check view was created
SELECT
  table_name as view_name,
  'EXISTS ✅' as status
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'collection_dashboard_view';
