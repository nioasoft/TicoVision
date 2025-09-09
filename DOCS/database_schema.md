# Database Schema & Naming Conventions

**Last Updated**: September 2025  
**Purpose**: Reference for Claude Code to maintain consistent naming and structure

---

## 🗃️ Database Tables with Partitioning

### Core System Tables
```sql
-- User Management
users                    -- System users (inherits from Supabase auth.users)
user_profiles            -- Extended user information
user_permissions         -- Role-based permissions
audit_logs              -- All system activity tracking

-- Tenant Management (Multi-tenancy from Day 1)
tenants                  -- Organization/firm information
tenant_users            -- User-tenant relationships  
tenant_settings         -- Tenant-specific configurations
tenant_themes           -- White-label branding customization
```

### Phase 1: Fee Management Tables with Partitioning
```sql
-- Client Management
clients                  -- Client company information
client_contacts         -- Contact persons for each client
client_fee_history      -- Historical fee payments and adjustments

-- Fee System (PARTITIONED BY TENANT)
CREATE TABLE fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  year INTEGER NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  inflation_adjustment DECIMAL(10,2) DEFAULT 0,
  custom_adjustment DECIMAL(10,2) DEFAULT 0,
  adjustment_reason TEXT,
  final_amount DECIMAL(10,2) NOT NULL,
  status fee_status NOT NULL DEFAULT 'draft',
  due_date DATE,
  payment_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY LIST (tenant_id);

-- Create partitions automatically for each tenant
CREATE OR REPLACE FUNCTION create_tenant_partition()
RETURNS TRIGGER AS $$
DECLARE
  partition_name TEXT;
BEGIN
  partition_name := 'fee_calculations_' || REPLACE(NEW.id::text, '-', '_');
  
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF fee_calculations FOR VALUES IN (%L)',
    partition_name, NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_partition_for_tenant
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_tenant_partition();

-- Letter Template System (from Shani & Tico)
letter_templates        -- 11 letter types (pre-made, no AI generation)
letter_generations     -- Generated letters with variable replacement
letter_history         -- Sent letters tracking
letter_responses       -- Client responses/payments

-- Payment Integration (Cardcom)
payment_transactions   -- Cardcom payment tracking (PARTITIONED)
payment_links         -- Generated payment URLs in letters
payment_receipts      -- Automatic receipt generation
webhook_logs          -- Cardcom webhook events

-- Background Jobs (BullMQ)
job_queue             -- Background job processing
job_results           -- Job execution results
```

### Materialized Views for Performance
```sql
-- Revenue Summary View (refreshed hourly)
CREATE MATERIALIZED VIEW tenant_revenue_summary AS
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

-- Client Payment History View
CREATE MATERIALIZED VIEW client_payment_summary AS
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

-- Dashboard Statistics View
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
  tenant_id,
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT CASE WHEN module = 'fee-management' THEN user_id END) as active_users,
  COUNT(CASE WHEN action = 'letter_sent' THEN 1 END) as letters_sent,
  COUNT(CASE WHEN action = 'payment_received' THEN 1 END) as payments_received,
  SUM(CASE WHEN action = 'payment_received' THEN 
    (details->>'amount')::DECIMAL ELSE 0 END) as daily_revenue
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, DATE_TRUNC('day', created_at)
WITH DATA;

-- Automatic refresh schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('refresh-revenue-summary', '0 * * * *', 
  'REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_revenue_summary');
  
SELECT cron.schedule('refresh-client-summary', '*/30 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY client_payment_summary');
  
SELECT cron.schedule('refresh-dashboard-stats', '*/15 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats');
```

### Phase 2: Advanced Features Tables
```sql
-- חשבשבת Integration
hashavshevet_clients    -- Synchronized client data
financial_reports       -- P&L and balance sheet imports
client_portals         -- Client access to financial data

-- Analytics & Business Intelligence
business_analytics     -- Automated analysis results
trend_reports         -- Historical trend analysis
anomaly_detections    -- Unusual business pattern alerts

-- Search Index (Typesense)
search_index          -- Full-text search index
search_logs          -- Search query analytics
```

### Phase 3: White-Label Platform Tables
```sql
-- Commercial Platform
partner_firms          -- White-label partner accounting firms
usage_tracking        -- Pay-per-click usage monitoring
billing_transactions  -- Partner firm billing
marketplace_services  -- Consulting services offered
```

---

## 🗂️ Module & Page Names

### Core Application Routes
```typescript
// Authentication (Supabase Auth - ALREADY CONFIGURED)
/login                  -- Supabase Auth login page
/register              -- New user registration (needs approval)
/forgot-password       -- Password reset flow

// Main Application
/dashboard             -- Main overview page with revenue tracking
/profile              -- User profile management

// Admin Routes (admin role only)
/admin/users          -- User management interface
/admin/permissions    -- Permission templates
/admin/audit-logs     -- System activity logs
/admin/settings       -- Tenant configuration
/admin/themes         -- White-label branding (Phase 3)
/admin/monitoring     -- System health and performance
```

### Phase 1: Fee Management Routes
```typescript
// Fee Management Module
/fee-management              -- Fee calculation dashboard
/fee-management/clients      -- Client fee overview
/fee-management/calculate    -- Fee calculation wizard
/fee-management/budgets      -- Annual budget management
/fee-management/collections  -- Payment tracking and reports

// Letter Template System (from Shani & Tico)
/letters                    -- Letter management dashboard  
/letters/templates          -- 11 letter template management
/letters/generate          -- Template selection and variable input
/letters/history           -- Sent letters log
/letters/responses         -- Payment confirmations

// Payment System (Cardcom)
/payments                  -- Payment dashboard
/payments/transactions     -- Transaction history
/payments/links           -- Payment link management
/payments/receipts        -- Receipt generation and tracking
/payments/webhooks        -- Webhook event logs
```

### Phase 2: Advanced Features Routes
```typescript
// חשבשבת Integration
/accounting                -- חשבשבת integration dashboard
/accounting/sync          -- Data synchronization
/accounting/reports       -- Financial report imports

// Client Portal (separate authentication)
/portal/login             -- Client portal login
/portal/dashboard         -- Client financial overview
/portal/reports          -- Client P&L and financial data
```

### Phase 3: White-Label Routes
```typescript
// Multi-tenant Management
/tenants                  -- Multi-tenant management
/billing                  -- Usage and billing tracking
/marketplace             -- Consulting services platform
```

---

## 🔧 Component Naming Conventions

### UI Components (shadcn/ui based)
```typescript
// Layout Components
MainLayout               -- App shell with sidebar navigation
DashboardLayout         -- Dashboard-specific layout
AuthLayout              -- Login/register pages
AdminLayout             -- Admin pages layout
ClientPortalLayout      -- Client portal layout (Phase 2)

// Feature Components  
FeeCalculationWizard    -- Step-by-step fee calculation
LetterTemplateSelector  -- Template selection from Shani & Tico
ClientFeeTable          -- Client fee overview table
PaymentTrackingCard     -- Payment status display (Cardcom)
RevenueOverviewChart    -- Real-time revenue visualization
AuditLogViewer         -- System activity display
PaymentLinkGenerator   -- Cardcom payment link creation
WebhookMonitor         -- Real-time webhook event viewer

// Hebrew/RTL Components
HebrewDatePicker       -- DD/MM/YYYY format date picker
ILSCurrencyInput       -- ₪1,234.56 formatted input
RTLDataTable          -- Right-to-left table layout
HebrewFormValidator   -- Hebrew text validation
TaxIdValidator        -- Israeli 9-digit tax ID checker
```

### Service & Hook Names
```typescript
// Services
authService              -- User authentication with Supabase
feeCalculationService    -- Fee calculation and adjustment logic
letterTemplateService    -- Template management (from Shani & Tico)
cardcomService          -- Cardcom payment integration
sendgridService         -- Email delivery service
cacheService           -- Redis/Upstash caching
queueService          -- BullMQ job processing
searchService         -- Typesense search integration
auditLoggingService     -- Activity tracking and compliance
clientManagementService -- Client CRUD operations

// Custom Hooks
useAuth                 -- Authentication state management
usePermissions         -- User permissions and role checking
useFeeCalculation      -- Fee calculation logic and state
useLetterTemplates     -- Template selection and generation
usePaymentTracking     -- Payment status and history (Cardcom)
useRealtimeUpdates     -- Supabase real-time subscriptions
useHebrewValidation    -- Hebrew text and tax ID validation
useCache              -- Redis cache management
useSearch             -- Typesense search queries
useDashboardStats     -- Materialized view data
```

---

## 🌐 Israeli Market Configuration

### Language & Localization
```typescript
// Hebrew/RTL Configuration
export const hebrewConfig = {
  direction: 'rtl',
  fonts: ['Assistant', 'Heebo', 'sans-serif'],
  dateFormat: 'DD/MM/YYYY',
  currencySymbol: '₪',
  currencyPosition: 'before', // ₪1,234.56
  thousandsSeparator: ',',
  decimalSeparator: '.',
};

// Tax ID Validation (9-digit Israeli format with check digit)
export const israeliTaxIdRegex = /^[0-9]{9}$/;

export function validateIsraeliTaxId(taxId: string): boolean {
  if (!israeliTaxIdRegex.test(taxId)) return false;
  
  const digits = taxId.split('').map(Number);
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    const val = digits[i] * ((i % 2) + 1);
    sum += val > 9 ? Math.floor(val / 10) + val % 10 : val;
  }
  
  return (sum + digits[8]) % 10 === 0;
}
```

### Business Rules Configuration
```typescript
// lib/business-rules.ts (ASK ASAF BEFORE CREATING)
export const businessRules = {
  maxClientsPerTenant: 10000,
  defaultFeeInflationRate: 0.03,  // 3% annual inflation
  paymentGracePeriodDays: 30,
  letterReminderIntervalDays: 15,
  maxLetterTemplates: 20,
  cardcomCurrencies: ['ILS', 'USD', 'EUR'],
  cacheExpiry: {
    tenantSettings: 3600,      // 1 hour
    clientList: 300,           // 5 minutes
    dashboardStats: 600,       // 10 minutes
    letterTemplates: 86400     // 24 hours
  },
  jobRetry: {
    email: 3,
    payment: 5,
    webhook: 7
  }
};
```

---

## 📊 Database Schema Details with Performance Optimization

### Core Table Structures

#### Multi-Tenant Foundation with Partitioning
```sql
-- Tenants (White-label ready from Day 1)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type tenant_type NOT NULL DEFAULT 'internal',
  status tenant_status NOT NULL DEFAULT 'active',
  subscription_plan TEXT,
  custom_domain TEXT,
  theme_config JSONB,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enum types
CREATE TYPE tenant_type AS ENUM ('internal', 'white_label');
CREATE TYPE tenant_status AS ENUM ('active', 'inactive', 'trial', 'suspended');

-- Index for domain lookup
CREATE UNIQUE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
```

#### Client Management with Optimized Indexes
```sql
-- Clients (Multi-tenant isolated)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  company_name TEXT NOT NULL,
  tax_id TEXT NOT NULL, -- 9-digit Israeli tax ID
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address JSONB, -- {street, city, postal_code, country}
  status client_status NOT NULL DEFAULT 'active',
  group_id UUID, -- For restaurant chains, etc.
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE client_status AS ENUM ('active', 'inactive', 'pending');

-- Indexes for performance
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_tax_id ON clients(tax_id);
CREATE INDEX idx_clients_status ON clients(tenant_id, status);
CREATE INDEX idx_clients_email ON clients(contact_email);
CREATE INDEX idx_clients_search ON clients USING gin(
  to_tsvector('hebrew', company_name || ' ' || contact_name)
);
```

#### Payment Integration with Cardcom
```sql
-- Payment Transactions (Partitioned by month)
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  fee_calculation_id UUID REFERENCES fee_calculations(id),
  cardcom_deal_id TEXT,
  cardcom_transaction_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method TEXT, -- 'credit_card', 'bank_transfer', 'google_pay'
  payment_link TEXT, -- Cardcom payment URL
  invoice_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE,
  receipt_url TEXT,
  failure_reason TEXT,
  webhook_data JSONB, -- Raw webhook data for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE payment_transactions_2025_09 PARTITION OF payment_transactions
  FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE payment_transactions_2025_10 PARTITION OF payment_transactions
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
-- ... continue for each month

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Indexes
CREATE INDEX idx_payment_transactions_tenant_id ON payment_transactions(tenant_id);
CREATE INDEX idx_payment_transactions_client_id ON payment_transactions(client_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status, created_at);
CREATE INDEX idx_payment_transactions_cardcom ON payment_transactions(cardcom_deal_id);
```

#### Background Jobs with BullMQ
```sql
-- Job Queue for background processing
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  job_type TEXT NOT NULL, -- 'send_email', 'check_payment', 'generate_report'
  job_name TEXT NOT NULL,
  payload JSONB NOT NULL,
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

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

-- Indexes for job processing
CREATE INDEX idx_job_queue_status_scheduled ON job_queue(status, scheduled_at) 
  WHERE status = 'pending';
CREATE INDEX idx_job_queue_tenant_type ON job_queue(tenant_id, job_type);
```

---

## 🔒 Row Level Security (RLS) Policies

### Tenant Isolation (Applied to ALL tables)
```sql
-- Perfect tenant isolation
CREATE POLICY tenant_isolation ON clients
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Role-based access within tenant
CREATE POLICY admin_full_access ON fee_calculations
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
  );

-- Accountant access to clients they manage
CREATE POLICY accountant_client_access ON clients
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (
      (auth.jwt() ->> 'role') IN ('owner', 'admin') OR
      created_by = (auth.jwt() ->> 'sub')::uuid
    )
  );

-- Read-only access for bookkeepers
CREATE POLICY bookkeeper_read_only ON fee_calculations
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') = 'bookkeeper'
  );
```

---

## 📛 Naming Convention Rules

### Database Naming (ENFORCED)
- **Tables**: Plural snake_case (`clients`, `fee_calculations`)
- **Columns**: Descriptive snake_case (`contact_email`, `tax_id`)
- **Functions**: Verb_noun_purpose (`calculate_fee_adjustment`, `generate_payment_link`)
- **Indexes**: `idx_table_column` or `idx_table_column1_column2`
- **Constraints**: `fk_table_column` or `chk_table_condition`
- **Materialized Views**: `view_name_summary` or `view_name_stats`

### API Endpoint Patterns
```typescript
// RESTful API structure (PostgREST via Supabase)
GET    /clients                    -- List clients (with tenant isolation)
POST   /clients                    -- Create new client
GET    /clients/:id                -- Get specific client
PATCH  /clients/:id                -- Update client
DELETE /clients/:id                -- Delete client (soft delete)

// Fee Management
GET    /fee-calculations           -- List fee calculations
POST   /fee-calculations           -- Create new calculation
GET    /fee-calculations/:id       -- Get specific calculation
PATCH  /fee-calculations/:id       -- Update calculation

// Letter System
GET    /letter-templates           -- List templates
POST   /letters/generate           -- Generate letter from template
GET    /letters/:id                -- Get specific letter
POST   /letters/:id/send           -- Send letter to client

// Payment System (Cardcom)
POST   /payments/create-link        -- Create Cardcom payment link
GET    /payments/:id/status         -- Check payment status
POST   /payments/webhook            -- Cardcom webhook endpoint
GET    /payments/transactions       -- List transactions

// Background Jobs
POST   /jobs/queue                  -- Queue new job
GET    /jobs/:id/status            -- Check job status
POST   /jobs/:id/retry            -- Retry failed job
```

---

## 📄 Data Migration Strategy

### Phase 1: Monday.com Migration
```sql
-- Import existing client data from Monday.com
-- Temporary staging tables for data validation
CREATE TABLE temp_monday_clients (
  monday_id TEXT,
  client_name TEXT,
  contact_info JSONB,
  fee_history JSONB,
  import_status TEXT DEFAULT 'pending'
);

-- Migration validation queries
-- Ensure data integrity before final import
INSERT INTO clients (tenant_id, company_name, tax_id, contact_name, contact_email)
SELECT 
  'your-tenant-id',
  client_name,
  contact_info->>'tax_id',
  contact_info->>'contact_name',
  contact_info->>'email'
FROM temp_monday_clients
WHERE import_status = 'validated';
```

### Schema Evolution
```sql
-- Migration versioning
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track all schema changes for rollback capability
INSERT INTO schema_migrations (version, description) VALUES
  ('001', 'Initial schema with tenants and clients'),
  ('002', 'Add partitioning to fee_calculations'),
  ('003', 'Add materialized views for dashboard'),
  ('004', 'Add Cardcom payment integration tables'),
  ('005', 'Add BullMQ job queue tables');
```

---

## 📊 Performance Optimization

### Critical Indexes
```sql
-- Multi-tenant performance
CREATE INDEX CONCURRENTLY idx_all_tables_tenant_id ON {table_name}(tenant_id);

-- Fee management performance
CREATE INDEX CONCURRENTLY idx_fee_calc_client_year ON fee_calculations(client_id, year);
CREATE INDEX CONCURRENTLY idx_fee_calc_status_date ON fee_calculations(status, due_date);
CREATE INDEX CONCURRENTLY idx_fee_calc_unpaid ON fee_calculations(tenant_id, client_id) 
  WHERE status IN ('sent', 'overdue');

-- Payment tracking performance
CREATE INDEX CONCURRENTLY idx_payments_status_date ON payment_transactions(status, created_at);
CREATE INDEX CONCURRENTLY idx_payments_pending ON payment_transactions(tenant_id) 
  WHERE status = 'pending';

-- Letter system performance
CREATE INDEX CONCURRENTLY idx_letters_client_sent ON letter_history(client_id, sent_at);

-- Audit log performance
CREATE INDEX CONCURRENTLY idx_audit_logs_tenant_date ON audit_logs(tenant_id, timestamp);
CREATE INDEX CONCURRENTLY idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Job queue performance
CREATE INDEX CONCURRENTLY idx_jobs_pending ON job_queue(scheduled_at) 
  WHERE status = 'pending';
```

### Query Optimization Guidelines
- Always include `tenant_id` in WHERE clauses
- Use LIMIT for pagination (default 20 items)
- Avoid SELECT * - specify needed columns
- Use prepared statements for repeated queries
- Leverage materialized views for dashboard data
- Use partitioning for large tables (>1M rows)
- Implement connection pooling (via Supabase)

### Caching Strategy
```typescript
// Cache keys structure
const cacheKeys = {
  tenant: (id: string) => `tenant:${id}`,
  client: (id: string) => `client:${id}`,
  clientList: (tenantId: string) => `clients:${tenantId}`,
  dashboard: (tenantId: string) => `dashboard:${tenantId}`,
  letterTemplate: (id: string) => `template:${id}`,
  paymentStatus: (dealId: string) => `payment:${dealId}`
};

// Cache TTL configuration
const cacheTTL = {
  tenant: 3600,        // 1 hour
  client: 1800,        // 30 minutes
  clientList: 300,     // 5 minutes
  dashboard: 600,      // 10 minutes
  letterTemplate: 86400, // 24 hours
  paymentStatus: 60    // 1 minute
};
```

---

**Usage Notes**:
- All table names use plural form (`clients`, `tenants`, `fee_calculations`)
- Multi-tenant isolation is mandatory - every table has `tenant_id`
- Hebrew/RTL support is built into all text fields and UI components
- Cardcom payment integration is the chosen gateway for Israeli market
- Letter templates come from Shani & Tico - no AI generation needed
- All schema changes must be approved by Asaf before implementation
- Partitioning is used for large tables to improve performance
- Materialized views are refreshed on schedule for dashboard performance
- Background jobs are processed via BullMQ for reliability