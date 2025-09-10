-- ================================================
-- TicoVision AI - Complete Database Schema
-- Version: 2.0
-- Date: December 2024
-- Description: Full schema with partitioning and performance optimizations
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- ENUM TYPES
-- ================================================

-- Drop existing types if they exist and recreate
DO $$ BEGIN
    CREATE TYPE tenant_type AS ENUM ('internal', 'white_label');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'trial', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'accountant', 'bookkeeper', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('active', 'inactive', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fee_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE letter_status AS ENUM ('draft', 'sent', 'viewed', 'responded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- CORE TABLES
-- ================================================

-- Tenants table (white-label ready)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type tenant_type NOT NULL DEFAULT 'internal',
    status tenant_status NOT NULL DEFAULT 'active',
    subscription_plan TEXT,
    custom_domain TEXT UNIQUE,
    theme_config JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role user_role NOT NULL DEFAULT 'client',
    full_name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_name TEXT NOT NULL,
    tax_id TEXT NOT NULL, -- 9-digit Israeli tax ID
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address JSONB DEFAULT '{}', -- {street, city, postal_code}
    status client_status NOT NULL DEFAULT 'active',
    group_id UUID, -- For restaurant chains
    assigned_accountant UUID REFERENCES users(id),
    internal_external TEXT CHECK (internal_external IN ('internal', 'external')),
    collection_responsibility TEXT, -- 'tiko' or 'shani'
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, tax_id)
);

-- ================================================
-- FEE MANAGEMENT TABLES (with partitioning)
-- ================================================

-- Fee calculations (partitioned by tenant_id)
CREATE TABLE IF NOT EXISTS fee_calculations (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    year INTEGER NOT NULL,
    month INTEGER,
    -- Previous year data
    previous_year_amount DECIMAL(10,2),
    previous_year_discount DECIMAL(5,2),
    previous_year_base DECIMAL(10,2),
    -- Current year calculations
    base_amount DECIMAL(10,2) NOT NULL,
    inflation_adjustment DECIMAL(10,2) DEFAULT 0,
    inflation_rate DECIMAL(5,2) DEFAULT 3.0,
    real_adjustment DECIMAL(10,2) DEFAULT 0,
    real_adjustment_reason TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2),
    total_with_vat DECIMAL(10,2),
    -- Status tracking
    status fee_status NOT NULL DEFAULT 'draft',
    due_date DATE,
    payment_date DATE,
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, tenant_id)
) PARTITION BY LIST (tenant_id);

-- Create default partition for initial tenant
CREATE TABLE IF NOT EXISTS fee_calculations_default PARTITION OF fee_calculations DEFAULT;

-- ================================================
-- LETTER TEMPLATE SYSTEM
-- ================================================

-- Letter templates (11 templates from Shani & Tiko)
CREATE TABLE IF NOT EXISTS letter_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    template_type TEXT NOT NULL,
    template_name TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'he',
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT,
    variables_required TEXT[] DEFAULT '{}',
    selection_rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Letter generations (sent letters)
CREATE TABLE IF NOT EXISTS letter_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    fee_calculation_id UUID,
    template_id UUID REFERENCES letter_templates(id),
    letter_type TEXT NOT NULL,
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT,
    variables_used JSONB DEFAULT '{}',
    payment_link TEXT,
    status letter_status NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    email_status TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- PAYMENT INTEGRATION (Cardcom)
-- ================================================

-- Payment transactions (partitioned by month)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    fee_calculation_id UUID,
    letter_id UUID REFERENCES letter_generations(id),
    -- Cardcom fields
    cardcom_deal_id TEXT,
    cardcom_transaction_id TEXT,
    cardcom_invoice_number TEXT,
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ILS',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    payment_link TEXT,
    payment_date TIMESTAMP WITH TIME ZONE,
    -- Receipt and tracking
    receipt_url TEXT,
    failure_reason TEXT,
    webhook_data JSONB,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for 2025
CREATE TABLE IF NOT EXISTS payment_transactions_2025_01 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_02 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_03 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_04 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_05 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_06 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_07 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_08 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_09 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_10 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_11 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS payment_transactions_2025_12 PARTITION OF payment_transactions
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- ================================================
-- AUDIT AND MONITORING
-- ================================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job queue (for background processing)
CREATE TABLE IF NOT EXISTS job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    job_type TEXT NOT NULL,
    job_name TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status job_status NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook logs (for Cardcom and other integrations)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    status TEXT
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================

-- Tenant indexes
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(tenant_id, is_active);

-- Client indexes
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tax_id ON clients(tenant_id, tax_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_accountant ON clients(tenant_id, assigned_accountant);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(contact_email);

-- Fee calculation indexes
CREATE INDEX IF NOT EXISTS idx_fee_calc_tenant_client ON fee_calculations(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_fee_calc_year ON fee_calculations(tenant_id, year);
CREATE INDEX IF NOT EXISTS idx_fee_calc_status ON fee_calculations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_calc_unpaid ON fee_calculations(tenant_id, client_id) 
    WHERE status IN ('sent', 'overdue');

-- Letter indexes
CREATE INDEX IF NOT EXISTS idx_letters_tenant_client ON letter_generations(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON letter_generations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_letters_sent ON letter_generations(tenant_id, sent_at);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant_client ON payment_transactions(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment_transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_cardcom ON payment_transactions(cardcom_deal_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);

-- Job queue indexes
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON job_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_type ON job_queue(tenant_id, job_type);

-- ================================================
-- FUNCTIONS
-- ================================================

-- Function to get current tenant ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN auth.jwt() -> 'user_metadata' ->> 'role';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to automatically create partition for new tenant
CREATE OR REPLACE FUNCTION create_tenant_partition()
RETURNS TRIGGER AS $$
DECLARE
    partition_name TEXT;
BEGIN
    -- Create partition for fee_calculations
    partition_name := 'fee_calculations_' || REPLACE(NEW.id::text, '-', '_');
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF fee_calculations FOR VALUES IN (%L)',
        partition_name, NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create partition on tenant creation
CREATE TRIGGER create_partition_for_tenant
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_tenant_partition();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fee_calculations_updated_at BEFORE UPDATE ON fee_calculations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_letter_templates_updated_at BEFORE UPDATE ON letter_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_letter_generations_updated_at BEFORE UPDATE ON letter_generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_users ON users
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_clients ON clients
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_fee_calculations ON fee_calculations
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_letter_templates ON letter_templates
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_letter_generations ON letter_generations
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_payment_transactions ON payment_transactions
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_job_queue ON job_queue
    FOR ALL USING (tenant_id = public.get_current_tenant_id());

-- Admin full access policies
CREATE POLICY admin_full_access_tenants ON tenants
    FOR ALL USING (
        id = public.get_current_tenant_id() OR
        public.get_current_user_role() = 'admin'
    );

-- Role-based policies for sensitive operations
CREATE POLICY accountant_client_access ON clients
    FOR ALL USING (
        tenant_id = public.get_current_tenant_id() AND
        (public.get_current_user_role() IN ('admin', 'accountant') OR
         assigned_accountant = auth.uid())
    );

CREATE POLICY bookkeeper_read_only ON fee_calculations
    FOR SELECT USING (
        tenant_id = public.get_current_tenant_id() AND
        public.get_current_user_role() IN ('admin', 'accountant', 'bookkeeper')
    );

-- ================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ================================================

-- Revenue summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_revenue_summary AS
SELECT 
    tenant_id,
    DATE_TRUNC('month', created_at) as month,
    DATE_TRUNC('year', created_at) as year,
    COUNT(DISTINCT client_id) as active_clients,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_fee,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
    SUM(final_amount) FILTER (WHERE status = 'paid') as collected_revenue,
    SUM(final_amount) FILTER (WHERE status IN ('sent', 'overdue')) as pending_revenue
FROM fee_calculations
WHERE created_at >= NOW() - INTERVAL '2 years'
GROUP BY tenant_id, DATE_TRUNC('month', created_at), DATE_TRUNC('year', created_at)
WITH DATA;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_summary_unique 
    ON tenant_revenue_summary(tenant_id, month, year);

-- Client payment summary
CREATE MATERIALIZED VIEW IF NOT EXISTS client_payment_summary AS
SELECT 
    tenant_id,
    client_id,
    COUNT(*) as total_invoices,
    SUM(final_amount) as total_billed,
    SUM(CASE WHEN status = 'paid' THEN final_amount ELSE 0 END) as total_paid,
    AVG(CASE 
        WHEN payment_date IS NOT NULL 
        THEN EXTRACT(DAY FROM payment_date - due_date) 
        ELSE NULL 
    END) as avg_payment_delay_days,
    MAX(payment_date) as last_payment_date
FROM fee_calculations
GROUP BY tenant_id, client_id
WITH DATA;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_payment_unique 
    ON client_payment_summary(tenant_id, client_id);

-- ================================================
-- INITIAL DATA
-- ================================================

-- Insert default tenant (will be updated with actual data)
INSERT INTO tenants (id, name, type, status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'internal', 'active')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================

COMMENT ON TABLE tenants IS 'Multi-tenant organizations with white-label support';
COMMENT ON TABLE clients IS 'Client companies managed by the accounting firm';
COMMENT ON TABLE fee_calculations IS 'Annual fee calculations with inflation and adjustments';
COMMENT ON TABLE letter_templates IS '11 letter templates from Shani & Tiko';
COMMENT ON TABLE payment_transactions IS 'Cardcom payment tracking and history';
COMMENT ON TABLE audit_logs IS 'Complete audit trail for compliance';

COMMENT ON COLUMN clients.tax_id IS '9-digit Israeli tax ID with Luhn check digit';
COMMENT ON COLUMN fee_calculations.inflation_rate IS 'Default 3% annual inflation';
COMMENT ON COLUMN fee_calculations.vat_amount IS '18% VAT (מע"מ) in Israel';
COMMENT ON COLUMN payment_transactions.currency IS 'ILS for Israeli Shekel';

-- ================================================
-- Grant necessary permissions
-- ================================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;