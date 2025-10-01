-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'bookkeeper', 'client');
CREATE TYPE tenant_type AS ENUM ('internal', 'white_label');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'trial', 'suspended');
CREATE TYPE fee_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE letter_template_type AS ENUM (
  'annual_fee_notification',
  'fee_increase_inflation',
  'fee_increase_real',
  'payment_reminder_gentle',
  'payment_reminder_firm',
  'payment_overdue',
  'service_suspension_warning',
  'payment_confirmation',
  'new_client_welcome',
  'service_completion',
  'custom_consultation'
);

-- ==============================================
-- TENANTS TABLE - Core of multi-tenancy
-- ==============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type tenant_type DEFAULT 'internal',
  status tenant_status DEFAULT 'active',
  subscription_plan TEXT,
  custom_domain TEXT UNIQUE,
  theme_config JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tenants IS 'Multi-tenant organizations - foundation for white-label support';
COMMENT ON COLUMN tenants.theme_config IS 'Custom branding: colors, logos, fonts';
COMMENT ON COLUMN tenants.settings IS 'Tenant-specific business rules and configurations';

-- ==============================================
-- USERS & AUTHENTICATION
-- ==============================================
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'bookkeeper',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);

COMMENT ON TABLE tenant_users IS 'Links Supabase auth users to tenants with roles';

-- ==============================================
-- CLIENTS TABLE - CRM Core
-- ==============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_name_hebrew TEXT, -- Hebrew name for letters
  tax_id TEXT NOT NULL, -- 9-digit Israeli tax ID
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  contact_city TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  group_id UUID, -- For restaurant chains, franchises
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_tax_id CHECK (tax_id ~ '^\d{9}$')
);

CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_tax_id ON clients(tenant_id, tax_id);
CREATE INDEX idx_clients_status ON clients(tenant_id, status);
CREATE INDEX idx_clients_search ON clients USING gin(company_name gin_trgm_ops);

COMMENT ON TABLE clients IS 'Client management - core CRM functionality';
COMMENT ON COLUMN clients.tax_id IS '9-digit Israeli tax ID with validation';

-- ==============================================
-- FEE MANAGEMENT
-- ==============================================
CREATE TABLE fee_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_amount DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER, -- Optional for monthly fees
  fee_type_id UUID REFERENCES fee_types(id),
  base_amount DECIMAL(10,2) NOT NULL,
  inflation_adjustment DECIMAL(10,2) DEFAULT 0,
  custom_adjustment DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  status fee_status DEFAULT 'draft',
  notes TEXT,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2100),
  CONSTRAINT valid_month CHECK (month IS NULL OR (month >= 1 AND month <= 12))
);

CREATE INDEX idx_fee_calculations_tenant_client ON fee_calculations(tenant_id, client_id);
CREATE INDEX idx_fee_calculations_year ON fee_calculations(tenant_id, year);
CREATE INDEX idx_fee_calculations_status ON fee_calculations(tenant_id, status);

COMMENT ON TABLE fee_calculations IS 'Automated fee calculation with adjustments';

-- ==============================================
-- LETTER TEMPLATES
-- ==============================================
CREATE TABLE letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_type letter_template_type NOT NULL,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'he' CHECK (language IN ('he', 'en')),
  subject TEXT,
  content_html TEXT NOT NULL, -- HTML template with {{variables}}
  content_text TEXT, -- Plain text version
  variables_schema JSONB NOT NULL, -- Required variables definition
  selection_rules JSONB, -- When to use this template
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, template_type, language, version)
);

CREATE INDEX idx_letter_templates_tenant_type ON letter_templates(tenant_id, template_type);

COMMENT ON TABLE letter_templates IS '11 letter templates from Shani & Tiko';
COMMENT ON COLUMN letter_templates.variables_schema IS 'JSON schema defining required variables like {{client_name}}, {{amount}}';

-- ==============================================
-- LETTER GENERATION & TRACKING
-- ==============================================
CREATE TABLE generated_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES letter_templates(id),
  fee_calculation_id UUID REFERENCES fee_calculations(id),
  variables_used JSONB NOT NULL, -- Actual values used
  generated_content_html TEXT NOT NULL,
  generated_content_text TEXT,
  payment_link TEXT, -- Cardcom payment URL
  sent_at TIMESTAMPTZ,
  sent_via TEXT, -- email, print, etc.
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_generated_letters_tenant_client ON generated_letters(tenant_id, client_id);
CREATE INDEX idx_generated_letters_sent ON generated_letters(tenant_id, sent_at);

-- ==============================================
-- PAYMENT TRACKING (Cardcom Integration)
-- ==============================================
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fee_calculation_id UUID REFERENCES fee_calculations(id),
  cardcom_deal_id TEXT, -- Cardcom's LowProfileCode
  cardcom_transaction_id TEXT, -- Cardcom's TransactionID
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',
  status payment_status DEFAULT 'pending',
  payment_method TEXT, -- credit_card, bank_transfer, etc.
  payment_link TEXT,
  invoice_number TEXT,
  payment_date TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_tenant_client ON payment_transactions(tenant_id, client_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(tenant_id, status);
CREATE INDEX idx_payment_transactions_cardcom ON payment_transactions(cardcom_deal_id);

-- ==============================================
-- AUDIT LOGS
-- ==============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(tenant_id, action);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for compliance';

-- ==============================================
-- WEBHOOK LOGS (for Cardcom and other integrations)
-- ==============================================
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- cardcom, sendgrid, etc.
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  response_sent TEXT,
  error_message TEXT
);

CREATE INDEX idx_webhook_logs_source ON webhook_logs(source, processed_at DESC);

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_current_tenant_id() 
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role() 
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'user_metadata' ->> 'role';
$$ LANGUAGE SQL STABLE;

-- Tenant isolation policy (applies to all tables with tenant_id)
CREATE POLICY tenant_isolation_policy ON clients
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_policy ON fee_types
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_policy ON fee_calculations
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_policy ON letter_templates
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_policy ON generated_letters
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_policy ON payment_transactions
  FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_policy ON audit_logs
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

-- Admin-only policies
CREATE POLICY admin_only_tenants ON tenants
  FOR ALL USING (
    id = public.get_current_tenant_id() AND 
    public.get_current_user_role() = 'admin'
  );

CREATE POLICY admin_only_tenant_users ON tenant_users
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id() AND 
    public.get_current_user_role() = 'admin'
  );

-- Audit logs insert policy (anyone can insert their own actions)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (
    tenant_id = public.get_current_tenant_id() AND
    user_id = auth.uid()
  );

-- ==============================================
-- HELPER FUNCTIONS
-- ==============================================

-- Function to validate Israeli tax ID (9 digits with check digit)
CREATE OR REPLACE FUNCTION validate_israeli_tax_id(tax_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  digits INTEGER[];
  checksum INTEGER := 0;
  i INTEGER;
  digit INTEGER;
  step INTEGER;
BEGIN
  -- Check if it's exactly 9 digits
  IF NOT tax_id ~ '^\d{9}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Convert to array of integers
  FOR i IN 1..9 LOOP
    digits[i] := SUBSTRING(tax_id, i, 1)::INTEGER;
  END LOOP;
  
  -- Calculate checksum
  FOR i IN 1..8 LOOP
    step := digits[i] * ((i % 2) + 1);
    checksum := checksum + (step / 10) + (step % 10);
  END LOOP;
  
  -- Validate check digit
  RETURN (checksum + digits[9]) % 10 = 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format ILS currency
CREATE OR REPLACE FUNCTION format_ils(amount DECIMAL)
RETURNS TEXT AS $$
BEGIN
  RETURN '₪' || TO_CHAR(amount, 'FM999,999,999.00');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to format Israeli date (DD/MM/YYYY)
CREATE OR REPLACE FUNCTION format_israeli_date(date_input DATE)
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(date_input, 'DD/MM/YYYY');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_fee_calculations_updated_at BEFORE UPDATE ON fee_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_letter_templates_updated_at BEFORE UPDATE ON letter_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Insert default tenant for development
INSERT INTO tenants (id, name, type, status, settings)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Tico Franco Accounting',
  'internal',
  'active',
  '{
    "locale": "he-IL",
    "currency": "ILS",
    "timezone": "Asia/Jerusalem",
    "fiscal_year_start": 1,
    "working_days": ["sunday", "monday", "tuesday", "wednesday", "thursday"]
  }'
);

-- Insert default fee types
INSERT INTO fee_types (tenant_id, name, description, default_amount)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'שכר טרחה שנתי', 'Annual accountant fee', 5000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'ייעוץ מס', 'Tax consultation', 1000),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'הכנת דוחות', 'Report preparation', 500);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;