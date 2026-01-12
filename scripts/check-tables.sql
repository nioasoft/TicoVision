-- Check if collection system tables exist
SELECT table_name 
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
