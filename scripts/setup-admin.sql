-- Setup script for admin user
-- Run this after user signs up for the first time

-- 1. Create the main tenant
INSERT INTO tenants (
  id,
  name,
  type,
  status,
  subscription_plan,
  settings
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Fixed UUID for main tenant
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

-- 2. Function to set user as admin (run this after user signs up)
-- Replace USER_ID with actual user ID from auth.users table
CREATE OR REPLACE FUNCTION setup_admin_user(user_email TEXT)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please sign up first.', user_email;
  END IF;
  
  -- Add user to tenant_users as admin
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    permissions,
    is_active
  ) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    v_user_id,
    'admin',
    jsonb_build_object(
      'all_access', true,
      'manage_users', true,
      'manage_tenants', true,
      'view_all_data', true,
      'system_settings', true
    ),
    true
  ) ON CONFLICT (tenant_id, user_id) 
  DO UPDATE SET 
    role = 'admin',
    permissions = jsonb_build_object(
      'all_access', true,
      'manage_users', true,
      'manage_tenants', true,
      'view_all_data', true,
      'system_settings', true
    );
  
  -- Update user metadata in auth.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'tenant_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'role', 'admin',
    'full_name', 'Asaf Benatia'
  )
  WHERE id = v_user_id;
  
  RAISE NOTICE 'User % has been set as admin successfully', user_email;
END;
$$ LANGUAGE plpgsql;

-- 3. Create initial demo data (optional)
-- Some demo clients
INSERT INTO clients (tenant_id, company_name, company_name_hebrew, tax_id, contact_name, contact_email, contact_phone, contact_city, status)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tech Solutions Ltd', 'טק סולושנס בע״מ', '123456789', 'ישראל ישראלי', 'israel@techsolutions.co.il', '03-1234567', 'תל אביב', 'active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Global Imports', 'גלובל יבוא', '987654321', 'שרה כהן', 'sarah@globalimports.co.il', '04-9876543', 'חיפה', 'active'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'StartUp Nation', 'סטארטאפ ניישן', '456789123', 'דוד לוי', 'david@startupnation.co.il', '02-4567891', 'ירושלים', 'pending')
ON CONFLICT DO NOTHING;

-- Some fee types
INSERT INTO fee_types (tenant_id, name, description, base_amount, frequency, is_active)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'דמי ניהול חודשיים', 'דמי ניהול חשבונות חודשיים', 2500, 'monthly', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'דמי ניהול רבעוניים', 'דמי ניהול חשבונות רבעוניים', 7000, 'quarterly', true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'דמי ניהול שנתיים', 'דמי ניהול חשבונות שנתיים', 25000, 'annual', true)
ON CONFLICT DO NOTHING;

-- Letter templates
INSERT INTO letter_templates (tenant_id, type, name, subject, body_html, body_text, variables, is_active)
VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'payment_reminder_gentle',
    'תזכורת תשלום עדינה',
    'תזכורת: חשבון לתשלום - {{company_name}}',
    '<div dir="rtl" style="font-family: Assistant, Arial; line-height: 1.6;">
      <h2>שלום {{contact_name}},</h2>
      <p>ברצוננו להזכיר כי החשבון על סך <strong>{{amount}}</strong> טרם שולם.</p>
      <p>נשמח אם תוכלו להסדיר את התשלום בהקדם.</p>
      <p><a href="{{payment_link}}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">לחץ כאן לתשלום מאובטח</a></p>
      <p>בברכה,<br>צוות {{office_name}}</p>
    </div>',
    'שלום {{contact_name}}, ברצוננו להזכיר כי החשבון על סך {{amount}} טרם שולם. נשמח אם תוכלו להסדיר את התשלום בהקדם. קישור לתשלום: {{payment_link}}',
    ARRAY['contact_name', 'company_name', 'amount', 'payment_link', 'office_name'],
    true
  )
ON CONFLICT DO NOTHING;

-- Instructions for running:
-- 1. First, sign up with benatia.asaf@gmail.com
-- 2. Then run: SELECT setup_admin_user('benatia.asaf@gmail.com');