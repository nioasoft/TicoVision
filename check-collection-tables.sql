-- Check if all collection system tables exist
SELECT
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'payment_method_selections',
  'payment_disputes',
  'payment_reminders',
  'client_interactions',
  'notification_settings',
  'reminder_rules',
  'fee_calculations',
  'generated_letters'
)
ORDER BY table_name;

-- Check columns added to fee_calculations
SELECT column_name, data_type
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

-- Check columns added to generated_letters
SELECT column_name, data_type
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
