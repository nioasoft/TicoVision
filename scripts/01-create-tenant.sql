-- Create the main tenant
INSERT INTO tenants (
  id,
  name,
  type,
  status,
  subscription_plan,
  settings
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'TicoVision Main',
  'internal',
  'active',
  'enterprise',
  jsonb_build_object(
    'company_name', 'TicoVision AI',
    'admin_email', 'benatia.asaf@gmail.com',
    'language', 'he',
    'timezone', 'Asia/Jerusalem'
  )
) ON CONFLICT (id) DO NOTHING;