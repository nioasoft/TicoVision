-- Super Admin & Multi-Tenancy Tables
-- ===============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Super Admin Users (cross-tenant access)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{
    "full_access": true,
    "manage_tenants": true,
    "view_analytics": true,
    "manage_billing": true,
    "system_config": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

COMMENT ON TABLE public.super_admins IS 'Super administrators with cross-tenant access';
COMMENT ON COLUMN public.super_admins.permissions IS 'Granular permissions for super admin operations';

-- 2. Tenant Settings (white-label configuration)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Branding
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  secondary_color VARCHAR(7) DEFAULT '#10b981',
  accent_color VARCHAR(7) DEFAULT '#f59e0b',
  
  -- Company Information
  company_name VARCHAR(255),
  company_name_english VARCHAR(255),
  company_email VARCHAR(255),
  company_phone VARCHAR(50),
  company_address JSONB DEFAULT '{
    "street": "",
    "city": "",
    "postal_code": "",
    "country": "IL"
  }'::jsonb,
  
  -- Localization
  timezone VARCHAR(50) DEFAULT 'Asia/Jerusalem',
  locale VARCHAR(10) DEFAULT 'he-IL',
  currency VARCHAR(3) DEFAULT 'ILS',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  
  -- Features & Limits
  features JSONB DEFAULT '{
    "fee_management": true,
    "letter_templates": true,
    "payment_integration": true,
    "client_portal": false,
    "api_access": false,
    "white_label": false,
    "custom_domain": false
  }'::jsonb,
  
  limits JSONB DEFAULT '{
    "max_users": 10,
    "max_clients": 1000,
    "max_storage_gb": 10,
    "max_api_calls_per_day": 10000,
    "max_email_per_month": 1000
  }'::jsonb,
  
  -- Billing
  billing_plan VARCHAR(50) DEFAULT 'starter',
  trial_ends_at TIMESTAMPTZ,
  
  -- Custom Domain
  custom_domain VARCHAR(255),
  custom_domain_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

COMMENT ON TABLE public.tenant_settings IS 'Per-tenant customization and white-label settings';
COMMENT ON COLUMN public.tenant_settings.features IS 'Feature flags for tenant';
COMMENT ON COLUMN public.tenant_settings.limits IS 'Usage limits based on billing plan';

-- 3. Tenant Activity Logs (audit trail)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.tenant_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50), -- 'auth', 'data', 'settings', 'billing'
  resource_type VARCHAR(50),
  resource_id UUID,
  resource_name VARCHAR(255),
  
  -- Detailed Information
  details JSONB DEFAULT '{}'::jsonb,
  changes JSONB, -- before/after values for updates
  
  -- Request Information
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  
  -- Status
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'failure', 'pending'
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_activity_logs_tenant_id ON public.tenant_activity_logs(tenant_id);
CREATE INDEX idx_tenant_activity_logs_user_id ON public.tenant_activity_logs(user_id);
CREATE INDEX idx_tenant_activity_logs_created_at ON public.tenant_activity_logs(created_at DESC);
CREATE INDEX idx_tenant_activity_logs_action ON public.tenant_activity_logs(action);

COMMENT ON TABLE public.tenant_activity_logs IS 'Comprehensive audit log for all tenant activities';

-- 4. Tenant Subscriptions (billing)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Plan Details
  plan_id VARCHAR(50) NOT NULL,
  plan_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'trialing', 'past_due', 'suspended', 'cancelled'
  
  -- Billing Period
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  trial_end_date DATE,
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
  next_billing_date DATE,
  
  -- Pricing
  price_per_cycle DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'ILS',
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Payment Method
  payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', 'check'
  payment_details JSONB, -- encrypted payment info
  
  -- Usage & Features
  features JSONB,
  limits JSONB,
  current_usage JSONB DEFAULT '{
    "users": 0,
    "clients": 0,
    "storage_gb": 0,
    "api_calls": 0,
    "emails_sent": 0
  }'::jsonb,
  
  -- Billing Contact
  billing_email VARCHAR(255),
  billing_name VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  UNIQUE(tenant_id)
);

CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_next_billing ON public.tenant_subscriptions(next_billing_date);

COMMENT ON TABLE public.tenant_subscriptions IS 'Subscription and billing information per tenant';

-- 5. User Tenant Access (for users with access to multiple tenants)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.user_tenant_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Access Details
  role VARCHAR(50) NOT NULL, -- 'owner', 'admin', 'accountant', 'bookkeeper', 'viewer'
  permissions JSONB DEFAULT '{}'::jsonb,
  is_primary BOOLEAN DEFAULT false,
  
  -- Access Control
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoke_reason TEXT,
  
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX idx_user_tenant_access_user_id ON public.user_tenant_access(user_id);
CREATE INDEX idx_user_tenant_access_tenant_id ON public.user_tenant_access(tenant_id);
CREATE INDEX idx_user_tenant_access_active ON public.user_tenant_access(is_active);

COMMENT ON TABLE public.user_tenant_access IS 'Multi-tenant access control for users';

-- 6. Tenant Usage Statistics (for analytics)
-- ===============================================
CREATE TABLE IF NOT EXISTS public.tenant_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Usage Metrics
  active_users INTEGER DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  new_clients INTEGER DEFAULT 0,
  
  -- Activity Metrics
  total_logins INTEGER DEFAULT 0,
  letters_sent INTEGER DEFAULT 0,
  payments_processed INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  
  -- Financial Metrics
  revenue_collected DECIMAL(12,2) DEFAULT 0,
  fees_calculated DECIMAL(12,2) DEFAULT 0,
  
  -- Storage
  storage_used_mb INTEGER DEFAULT 0,
  documents_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, period_start, period_type)
);

CREATE INDEX idx_tenant_usage_stats_tenant_id ON public.tenant_usage_stats(tenant_id);
CREATE INDEX idx_tenant_usage_stats_period ON public.tenant_usage_stats(period_start, period_end);

COMMENT ON TABLE public.tenant_usage_stats IS 'Aggregated usage statistics per tenant';

-- ===============================================
-- Helper Functions
-- ===============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.super_admins 
    WHERE super_admins.user_id = $1 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current tenant with super admin support
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_is_super_admin BOOLEAN;
  v_selected_tenant UUID;
  v_primary_tenant UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if user is super admin
  v_is_super_admin := public.is_super_admin(v_user_id);
  
  IF v_is_super_admin THEN
    -- For super admin, check for selected tenant in app_metadata
    v_selected_tenant := (auth.jwt() -> 'app_metadata' ->> 'selected_tenant_id')::UUID;
    IF v_selected_tenant IS NOT NULL THEN
      RETURN v_selected_tenant;
    END IF;
  END IF;
  
  -- Get user's primary tenant
  SELECT tenant_id INTO v_primary_tenant
  FROM public.user_tenant_access
  WHERE user_id = v_user_id 
  AND is_active = true
  AND is_primary = true
  LIMIT 1;
  
  IF v_primary_tenant IS NOT NULL THEN
    RETURN v_primary_tenant;
  END IF;
  
  -- Fallback to any active tenant
  SELECT tenant_id INTO v_primary_tenant
  FROM public.user_tenant_access
  WHERE user_id = v_user_id 
  AND is_active = true
  LIMIT 1;
  
  RETURN v_primary_tenant;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to log tenant activity
CREATE OR REPLACE FUNCTION public.log_tenant_activity(
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
  v_tenant_id UUID;
  v_user_email VARCHAR(255);
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := public.get_current_tenant_id();
  
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;
  
  INSERT INTO public.tenant_activity_logs (
    tenant_id,
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    v_tenant_id,
    v_user_id,
    v_user_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- Row Level Security (RLS) Policies
-- ===============================================

-- Enable RLS on all new tables
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_usage_stats ENABLE ROW LEVEL SECURITY;

-- Super Admins table policies
CREATE POLICY "super_admins_self_read" ON public.super_admins
  FOR SELECT USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "super_admins_super_manage" ON public.super_admins
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Tenant Settings policies
CREATE POLICY "tenant_settings_tenant_read" ON public.tenant_settings
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "tenant_settings_admin_update" ON public.tenant_settings
  FOR UPDATE USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_tenant_access
      WHERE tenant_id = tenant_settings.tenant_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- Activity Logs policies
CREATE POLICY "activity_logs_tenant_read" ON public.tenant_activity_logs
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "activity_logs_insert" ON public.tenant_activity_logs
  FOR INSERT WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Tenant Subscriptions policies
CREATE POLICY "subscriptions_read" ON public.tenant_subscriptions
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "subscriptions_super_manage" ON public.tenant_subscriptions
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- User Tenant Access policies
CREATE POLICY "user_access_read" ON public.user_tenant_access
  FOR SELECT USING (
    user_id = auth.uid() OR 
    tenant_id = public.get_current_tenant_id() OR
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "user_access_manage" ON public.user_tenant_access
  FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_tenant_access uta
      WHERE uta.tenant_id = user_tenant_access.tenant_id
      AND uta.user_id = auth.uid()
      AND uta.role IN ('owner', 'admin')
      AND uta.is_active = true
    )
  );

-- Usage Stats policies
CREATE POLICY "usage_stats_read" ON public.tenant_usage_stats
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "usage_stats_super_manage" ON public.tenant_usage_stats
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- ===============================================
-- Update existing tables' RLS policies for super admin access
-- ===============================================

-- Drop and recreate policies for clients table
DROP POLICY IF EXISTS "tenant_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.clients;

CREATE POLICY "clients_tenant_read" ON public.clients
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "clients_tenant_insert" ON public.clients
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "clients_tenant_update" ON public.clients
  FOR UPDATE USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "clients_tenant_delete" ON public.clients
  FOR DELETE USING (
    tenant_id = public.get_current_tenant_id() OR 
    public.is_super_admin(auth.uid())
  );

-- Similar updates for other existing tables
-- (fee_calculations, letter_templates, payments, etc.)

-- ===============================================
-- Triggers
-- ===============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_super_admins_updated_at
  BEFORE UPDATE ON public.super_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON public.tenant_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===============================================
-- Initial Data Setup
-- ===============================================

-- Create default tenant settings for existing tenants
INSERT INTO public.tenant_settings (tenant_id, company_name)
SELECT id, name FROM public.tenants
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_settings WHERE tenant_id = tenants.id
);

-- Grant access to existing tenant_users
INSERT INTO public.user_tenant_access (user_id, tenant_id, role, is_primary)
SELECT user_id, tenant_id, role, true
FROM public.tenant_users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tenant_access 
  WHERE user_id = tenant_users.user_id 
  AND tenant_id = tenant_users.tenant_id
);

-- ===============================================
-- Grants
-- ===============================================

GRANT ALL ON public.super_admins TO authenticated;
GRANT ALL ON public.tenant_settings TO authenticated;
GRANT ALL ON public.tenant_activity_logs TO authenticated;
GRANT ALL ON public.tenant_subscriptions TO authenticated;
GRANT ALL ON public.user_tenant_access TO authenticated;
GRANT ALL ON public.tenant_usage_stats TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_tenant_activity TO authenticated;