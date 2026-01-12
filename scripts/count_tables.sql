-- Quick count of collection system objects

SELECT
  'New Tables' as object_type,
  COUNT(*) as count,
  '(Expected: 6)' as expected
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

UNION ALL

SELECT
  'fee_calculations columns' as object_type,
  COUNT(*) as count,
  '(Expected: 6)' as expected
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

UNION ALL

SELECT
  'generated_letters columns' as object_type,
  COUNT(*) as count,
  '(Expected: 4)' as expected
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'generated_letters'
AND column_name IN (
  'sent_at',
  'opened_at',
  'last_opened_at',
  'open_count'
)

UNION ALL

SELECT
  'Functions' as object_type,
  COUNT(*) as count,
  '(Expected: 2)' as expected
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_collection_statistics',
  'get_fees_needing_reminders'
)

UNION ALL

SELECT
  'Views' as object_type,
  COUNT(*) as count,
  '(Expected: 1)' as expected
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'collection_dashboard_view';
