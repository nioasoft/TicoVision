# Automated Accounting Office Management Platform - Technical Architecture

## System Overview
Multi-tenant automation platform for Israeli accounting firms, designed to scale from 10 users to 10,000+ clients with white-label support from Day 1 and complete workflow automation.

## Architecture Philosophy

### Design Principles
- **Automation First**: Every manual process must be identified and automated
- **Multi-tenant Native**: Built for white-label SaaS from Day 1
- **Israeli Market Focus**: Hebrew/RTL, local payment gateways, חשבשבת integration
- **Zero DevOps**: Serverless-first architecture for minimal operational overhead
- **Template-Driven**: Letter templates from business users, not AI generation

## Core Technology Stack

### Frontend Architecture
```yaml
Framework: React 19 + Vite + TypeScript (strict mode)
UI Library: shadcn/ui + Tailwind CSS (NO other UI libraries)
State Management: Zustand (no Redux)
Routing: React Router v6
Forms: React Hook Form + Zod validation
HTTP Client: Supabase client (covers all backend needs)
Charts: Recharts (for revenue dashboards)
Icons: Lucide React
Testing: Vitest (unit) + Playwright (E2E)
```

### Backend Architecture
```yaml
Platform: Supabase (All-in-One Solution) - ALREADY CONFIGURED
Database: PostgreSQL with Row Level Security (RLS)
Authentication: Supabase Auth (Email/Google/Microsoft)
Real-time: Supabase Subscriptions
Storage: Supabase Storage
Functions: Supabase Edge Functions (Deno)
Payment: Cardcom (Israeli gateway) - See /docs/CARDCOM.md
Email: SendGrid (transactional emails)
```

### Infrastructure & Performance
```yaml
CDN: Cloudflare
  - DDoS protection
  - Edge caching
  - WAF (Web Application Firewall)
  - Israeli edge presence

Monitoring:
  - Sentry (error tracking)
  - DataDog (APM & infrastructure)
  - Vercel Analytics (Core Web Vitals)

Caching:
  - Redis/Upstash (session & data caching)
  - Cloudflare CDN (static assets)
  - Supabase query caching

Queue & Jobs:
  - BullMQ (background job processing)
  - Scheduled tasks for automation

Search:
  - Typesense (Hebrew native support)
  - Full-text search with RTL
```

### Why Supabase All-in-One?
- **Integrated Solution**: Database + Auth + Real-time + Storage in one
- **Multi-tenant Ready**: RLS policies for perfect tenant isolation
- **Real-time Native**: Essential for live dashboards and collaboration
- **Cost Effective**: Scales with usage, not complexity
- **Israeli Performance**: Good edge presence in Europe/Middle East

## Deployment & Hosting

### Production Stack: Vercel + Supabase + Cloudflare

**Why This Stack is Perfect:**
- **Vercel**: Zero DevOps, auto-scaling, multi-tenant DNS
- **Supabase**: Complete backend solution with RLS
- **Cloudflare**: Security, performance, Israeli edge presence
- **SendGrid**: Reliable email delivery with Hebrew support

### Scaling Strategy
```yaml
Phase 1 (10 users, 700 clients):
  Vercel: Hobby Plan ($0/month)
  Supabase: Free Tier ($0/month)
  Cloudflare: Free Plan ($0/month)
  SendGrid: Free Tier (100 emails/day)
  Total: ~$0/month

Phase 2 (100 users, 2000 clients):
  Vercel: Pro Plan ($20/month)
  Supabase: Pro Plan ($25/month)
  Cloudflare: Pro Plan ($20/month)
  SendGrid: Essentials ($15/month)
  Redis: Upstash Pay-as-you-go (~$10/month)
  Total: ~$90/month

Phase 3 (1000+ users, 10,000+ clients):
  Vercel: Team Plan ($100/month)
  Supabase: Team Plan ($599/month)
  Cloudflare: Business ($200/month)
  SendGrid: Pro ($90/month)
  Redis: Upstash Pro ($90/month)
  DataDog: Pro ($15/host)
  Total: ~$1,200/month
  Revenue: $50K+/month (highly profitable)

Enterprise Scale:
  Custom pricing at $500K+ ARR
  Dedicated infrastructure if needed
```

## Database Architecture

### Multi-Tenancy Strategy with Partitioning
Perfect tenant isolation using Supabase RLS with performance optimization:

```sql
-- Create partitioned table for large datasets
CREATE TABLE fee_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  year INTEGER NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL,
  inflation_adjustment DECIMAL(10,2) DEFAULT 0,
  custom_adjustment DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2) NOT NULL,
  status fee_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY LIST (tenant_id);

-- Create partitions for each tenant (automated via trigger)
CREATE TABLE fee_calculations_tenant_1 PARTITION OF fee_calculations
  FOR VALUES IN ('tenant-uuid-1');

-- RLS Policy for complete tenant isolation
CREATE POLICY tenant_isolation ON fee_calculations
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Materialized views for dashboard performance
CREATE MATERIALIZED VIEW tenant_revenue_summary AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(DISTINCT client_id) as active_clients,
  SUM(final_amount) as total_revenue,
  AVG(final_amount) as avg_fee,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
FROM fee_calculations
GROUP BY tenant_id, DATE_TRUNC('month', created_at)
WITH DATA;

-- Refresh materialized view every hour
CREATE OR REPLACE FUNCTION refresh_revenue_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_revenue_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh via pg_cron
SELECT cron.schedule('refresh-revenue-summary', '0 * * * *', 
  'SELECT refresh_revenue_summary()');
```

### Core Tables Structure

#### Tenant Management
```yaml
tenants:
  - id: UUID (primary key)
  - name: TEXT (company name)
  - type: ENUM (internal, white_label)
  - status: ENUM (active, inactive, trial)
  - subscription_plan: TEXT
  - custom_domain: TEXT
  - theme_config: JSONB
  - created_at: TIMESTAMP

tenant_users:
  - tenant_id: UUID (references tenants)
  - user_id: UUID (references auth.users)
  - role: ENUM (owner, admin, accountant, bookkeeper)
  - permissions: JSONB
```

#### Core Business Data
```yaml
clients:
  - id: UUID
  - tenant_id: UUID
  - company_name: TEXT
  - tax_id: TEXT (9 digits, Israeli format)
  - contact_name: TEXT
  - contact_email: TEXT
  - status: ENUM (active, inactive, pending)
  - group_id: UUID (for restaurant chains, etc.)

fee_calculations: (partitioned by tenant_id)
  - id: UUID
  - tenant_id: UUID
  - client_id: UUID
  - year: INTEGER
  - base_amount: DECIMAL
  - inflation_adjustment: DECIMAL
  - custom_adjustment: DECIMAL
  - final_amount: DECIMAL
  - status: ENUM (draft, sent, paid, overdue)

letter_templates:
  - id: UUID
  - tenant_id: UUID
  - template_type: ENUM (11 types from Shani & Tiko)
  - language: ENUM (hebrew, english)
  - content_template: TEXT (HTML with variables like {{client_name}})
  - variables_schema: JSONB (required variables)
```

#### Payment Integration (Cardcom)
```yaml
payment_transactions:
  - id: UUID
  - tenant_id: UUID
  - client_id: UUID
  - cardcom_deal_id: TEXT
  - amount: DECIMAL
  - status: ENUM (pending, completed, failed)
  - payment_link: TEXT
  - invoice_number: TEXT
  - created_at: TIMESTAMP
```

#### Automation & Monitoring
```yaml
automation_rules:
  - id: UUID
  - tenant_id: UUID
  - trigger_type: ENUM (schedule, event, condition)
  - conditions: JSONB
  - actions: JSONB
  - is_active: BOOLEAN

audit_logs:
  - id: UUID
  - tenant_id: UUID
  - user_id: UUID
  - action: TEXT
  - resource_type: TEXT
  - resource_id: UUID
  - details: JSONB
  - ip_address: INET
  - timestamp: TIMESTAMP

job_queue: (BullMQ backed)
  - id: UUID
  - tenant_id: UUID
  - job_type: TEXT
  - payload: JSONB
  - status: ENUM (pending, processing, completed, failed)
  - attempts: INTEGER
  - scheduled_at: TIMESTAMP
  - completed_at: TIMESTAMP
```

## Security Architecture

### Authentication & Authorization
```yaml
Authentication Flow:
  1. User login via Supabase Auth (Email/Google/Microsoft)
  2. JWT includes tenant_id and role
  3. RLS policies enforce data access at database level
  4. Frontend validates permissions for UI elements

Security Layers:
  1. Database Level: RLS policies (cannot be bypassed)
  2. API Level: Edge Functions validate business logic
  3. Frontend Level: Route guards and permission checks
  4. Input Level: Zod schemas for all user inputs
  5. Network Level: Cloudflare WAF and DDoS protection
```

### Row Level Security (RLS) Policies
```sql
-- Tenant isolation (applied to all tables)
CREATE POLICY tenant_isolation ON {table_name}
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Role-based access within tenant
CREATE POLICY admin_full_access ON sensitive_table
  FOR ALL USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (auth.jwt() ->> 'role') IN ('owner', 'admin')
  );

-- Client access to own data only
CREATE POLICY client_own_data ON client_reports
  FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND client_id = (auth.jwt() ->> 'client_id')::uuid
  );
```

## Israeli Market Specialization

### Language & Localization
```yaml
Hebrew Support:
  - RTL layouts in Tailwind CSS
  - Hebrew font optimization (Assistant, Heebo)
  - Date formatting (DD/MM/YYYY Israeli standard)
  - Number formatting (₪1,234.56)
  - Israeli tax ID validation (9 digits with check digit)
  - Typesense search with Hebrew stemming

Business Letter Templates:
  - 11 templates provided by Shani & Tiko (ready-made)
  - Variable replacement system: {{client_name}}, {{amount}}, {{date}}
  - Professional Hebrew business correspondence
  - Formal/informal tone variations
  - Industry-specific terminology
```

### Payment Gateway Integration
```typescript
interface PaymentSystem {
  provider: 'Cardcom'; // DECIDED - Israeli market leader
  currencies: ['ILS', 'USD', 'EUR'];
  features: {
    embedded_links: true;
    recurring_billing: true;
    invoice_generation: true;
    tax_reporting: true;
    hebrew_interface: true;
    google_pay: true;
    tokenization: true;
  };
  integration_guide: '/docs/CARDCOM.md';
}
```

### חשבשבת API Integration (Phase 2)
```yaml
Accounting Software Integration:
  - Client data synchronization
  - Financial reports (Profit & Loss)
  - Balance sheet data
  - Real-time data updates
  - Mini-site generation for client portals
```

## Letter Template System (No AI)

### Template Processing Engine
```typescript
interface LetterTemplate {
  id: string;
  tenant_id: string;
  template_type: '11_types_from_shani_tiko';
  content_html: string;        // HTML with {{variables}}
  variables_required: string[]; // ['client_name', 'amount', 'date']
  selection_rules: {           // When to use this template
    fee_type?: string;
    client_status?: string;
    amount_range?: [number, number];
  };
}

interface LetterGeneration {
  template_id: string;
  client_id: string;
  variables: Record<string, string>; // {client_name: "חברת ABC"}
  generated_content: string;         // Final HTML/text
  sent_at?: Date;
  payment_link?: string;            // Cardcom payment URL
  email_sent_via?: 'SendGrid';     // Email service tracking
}
```

### Template Selection Logic
```typescript
function selectLetterTemplate(
  client: Client,
  feeCalculation: FeeCalculation,
  templateType: LetterTemplateType
): LetterTemplate {
  // Business logic to select appropriate template
  // Based on rules provided by Shani & Tiko
}
```

## Performance & Scalability

### Database Optimization
```sql
-- Essential indexes for performance
CREATE INDEX CONCURRENTLY idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX CONCURRENTLY idx_fee_calculations_client_year 
  ON fee_calculations(client_id, year);
CREATE INDEX CONCURRENTLY idx_audit_logs_tenant_timestamp 
  ON audit_logs(tenant_id, timestamp);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_clients_tenant_status 
  ON clients(tenant_id, status);
CREATE INDEX CONCURRENTLY idx_letters_tenant_type 
  ON letter_templates(tenant_id, template_type);

-- Partial indexes for specific queries
CREATE INDEX CONCURRENTLY idx_unpaid_fees 
  ON fee_calculations(tenant_id, client_id) 
  WHERE status IN ('sent', 'overdue');
```

### Caching Strategy
```typescript
// Redis/Upstash caching layers
interface CacheStrategy {
  sessionCache: {
    provider: 'Upstash Redis';
    ttl: '30 minutes';
    data: ['user_session', 'permissions'];
  };
  
  dataCache: {
    provider: 'Upstash Redis';
    strategies: {
      tenant_settings: { ttl: '1 hour' };
      client_list: { ttl: '5 minutes' };
      revenue_summary: { ttl: '10 minutes' };
      letter_templates: { ttl: '24 hours' };
    };
  };
  
  cdnCache: {
    provider: 'Cloudflare';
    static_assets: { ttl: '1 year' };
    api_responses: { ttl: '1 minute' };
  };
}
```

### Frontend Performance
```typescript
// Code splitting by feature
const FeeManagement = lazy(() => import('./modules/fee-management'));
const LetterTemplates = lazy(() => import('./modules/letter-templates'));
const ReportsAnalytics = lazy(() => import('./modules/reports-analytics'));

// React Query for server state with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

### Real-time Architecture
```typescript
// Supabase real-time subscriptions for live updates
const useRealtimeData = (tenantId: string) => {
  useEffect(() => {
    const subscription = supabase
      .channel(`tenant_${tenantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fee_calculations',
        filter: `tenant_id=eq.${tenantId}`
      }, handleRealtimeUpdate)
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [tenantId]);
};
```

### Background Jobs with BullMQ
```typescript
// Job processing for automation
interface JobProcessing {
  queues: {
    email_queue: {
      processor: 'SendGrid';
      jobs: ['send_letter', 'payment_reminder'];
      retry: 3;
    };
    
    payment_queue: {
      processor: 'Cardcom';
      jobs: ['check_payment_status', 'create_invoice'];
      retry: 5;
    };
    
    automation_queue: {
      jobs: ['fee_calculation', 'report_generation'];
      schedule: 'cron';
    };
  };
}
```

## White-Label Architecture (Day 1)

### Multi-Domain Strategy
```yaml
Domain Routing:
  main_app: "crm.ticoaccounting.com"
  client_subdomains: 
    - "client1.ticoaccounting.com"
    - "client2.ticoaccounting.com"
  custom_domains:
    - "customdomain.co.il" 
    - "anotherfirm.com"

Vercel Configuration:
  - Automatic SSL for all domains
  - Edge routing based on domain
  - Per-tenant CDN caching
  - Custom error pages per tenant

Cloudflare Setup:
  - DNS management
  - SSL certificates
  - Page rules per domain
  - Custom WAF rules
```

### Theme Customization System
```typescript
interface TenantTheme {
  tenant_id: string;
  brand_name: string;
  
  // Visual identity
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  favicon_url: string;
  
  // Typography
  font_family: string;
  heading_font: string;
  
  // Layout customization
  sidebar_style: 'modern' | 'classic' | 'minimal';
  button_style: 'rounded' | 'square' | 'pill';
  
  // Feature flags
  enabled_modules: string[];
  custom_css?: string;
}
```

## Testing Strategy

### Testing Framework
```yaml
Unit Testing:
  - Framework: Vitest
  - Coverage: 80%+ for services and hooks
  - Focus: Business logic, utilities, custom hooks

E2E Testing:
  - Framework: Playwright
  - Coverage: Critical user flows
  - Hebrew/RTL specific test cases
  - Multi-tenant isolation testing
  - Payment flow testing (Cardcom)

Security Testing:
  - RLS policies validation
  - Authentication flows
  - Authorization checks
  - Input sanitization
  - Penetration testing

Performance Testing:
  - 10,000+ clients simulation
  - Concurrent user testing
  - Real-time updates stress testing
  - Cache effectiveness
```

### Test Structure
```
tests/
├── unit/              # Vitest unit tests
│   ├── services/      # Business logic tests
│   ├── hooks/         # Custom hooks tests
│   └── utils/         # Utility function tests
├── e2e/               # Playwright E2E tests
│   ├── auth.spec.ts   # Authentication flows
│   ├── fee-management.spec.ts
│   ├── payment.spec.ts # Cardcom integration
│   └── hebrew-rtl.spec.ts
└── fixtures/          # Test data and mocks
```

## Monitoring & Observability

### Error Tracking & Performance
```yaml
Error Tracking (Sentry): 
  - Real-time error alerts
  - Source maps for debugging
  - User context tracking
  - Hebrew error messages localization
  - Integration with Slack/Email

Performance Monitoring (DataDog):
  - APM for backend services
  - Database query performance
  - Custom business metrics
  - Real-time dashboards
  - Alert thresholds

Analytics (Vercel):
  - Core Web Vitals
  - User experience metrics
  - Edge function performance
  - Geographic distribution

Logging Strategy:
  - Structured logs with Winston
  - Audit trail for all user actions
  - Security events logging
  - Performance metrics collection
  - Log aggregation in DataDog
```

### Key Metrics
```yaml
Business Metrics:
  - Revenue per tenant
  - Letter automation success rate
  - Payment collection efficiency (via Cardcom)
  - User engagement per module
  - Email delivery rate (SendGrid)

Technical Metrics:
  - API response times (<200ms p95)
  - Database query performance (<50ms p95)
  - Cache hit rate (>90%)
  - Error rates (<1%)
  - Uptime (>99.9%)
```

## CI/CD Pipeline

### GitHub Actions + Vercel
```yaml
Pipeline Stages:
  1. Code Quality:
     - ESLint + Prettier
     - TypeScript strict checks
     - Import organization

  2. Testing:
     - Vitest unit tests (80%+ coverage)
     - Playwright E2E tests
     - Hebrew/RTL specific tests
     - Payment flow tests

  3. Security:
     - npm audit (vulnerability scan)
     - Dependency license check
     - Environment variable validation
     - OWASP dependency check

  4. Build & Deploy:
     - Vite production build
     - Deploy to Vercel preview
     - Manual approval for production
     - Supabase migrations (if needed)
     - Cache invalidation (Cloudflare)

  5. Post-Deploy:
     - Smoke tests on live environment
     - Performance monitoring alerts
     - Error tracking activation
     - Notify team via Slack
```

## Development Workflow

### Project Structure
```
src/
├── components/          # Reusable UI components (shadcn/ui based)
│   ├── ui/             # Base shadcn/ui components
│   ├── forms/          # Form components with validation
│   └── charts/         # Data visualization components
├── modules/            # Feature modules
│   ├── fee-management/ # Phase 1: Fee calculation & letters
│   ├── letter-templates/ # Template management (from Shani & Tico)
│   ├── payment-system/ # Cardcom integration
│   ├── clients/        # Client management (CRM base)
│   └── dashboard/      # Real-time revenue tracking
├── services/           # Business logic & API integration
│   ├── supabase.ts    # Database client
│   ├── cardcom.ts     # Payment gateway integration
│   ├── sendgrid.ts    # Email service
│   ├── cache.ts       # Redis/Upstash caching
│   ├── queue.ts       # BullMQ job processing
│   ├── letter-engine.ts # Template processing engine
│   ├── hashavshevet.ts # חשבשבת API integration (Phase 2)
│   └── search.ts      # Typesense search
├── hooks/              # Custom React hooks
├── utils/              # Helper functions
├── types/              # TypeScript type definitions
└── lib/               # External library configurations
```

### Development Environment
```bash
# Setup commands
npm create vite@latest tiko-crm -- --template react-ts
cd tiko-crm
npm install @supabase/supabase-js
npm install @sendgrid/mail
npm install upstash/redis
npm install bull bullmq
npm install typesense
npx shadcn-ui@latest init
npx supabase init
npx supabase start

# Development workflow
npm run dev              # Start development server
npx supabase db reset    # Reset local database
npm run generate-types   # Generate TypeScript types from Supabase
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run build            # Build for production
```

## Migration Strategy

### Phase 1 Implementation (Priority - December 2025)
1. **Core Infrastructure**: Multi-tenant Supabase with RLS policies
2. **Authentication**: User management with role-based permissions
3. **Fee Management**: Calculator + 11 letter templates from Shani & Tiko
4. **Cardcom Integration**: Israeli payment gateway + tracking (see /docs/CARDCOM.md)
5. **Basic Dashboard**: Real-time revenue overview
6. **Email Service**: SendGrid for letter delivery

### Phase 2 Expansion (Q1-Q2 2026)
1. **Advanced Analytics**: Business insights and forecasting
2. **חשבשבת Integration**: Accounting software data sync
3. **Client Portal**: Mini-sites with P&L reports
4. **Enhanced Automation**: Workflow rules and triggers
5. **Search Enhancement**: Typesense full-text search

### Phase 3 White-Label (Q3-Q4 2026)
1. **Multi-tenant UI**: Theme customization system
2. **Domain Management**: Custom domain automation
3. **Billing System**: Usage-based pricing
4. **Partner Onboarding**: Self-service setup
5. **Advanced Monitoring**: Full DataDog APM

## Risk Mitigation

### Technical Risks
```yaml
Vendor Lock-in: 
  mitigation: "Use standard SQL, avoid proprietary features"
  
Performance Issues:
  mitigation: "Database partitioning, materialized views, multi-layer caching"
  
Cardcom API Changes:
  mitigation: "Wrapper service layer, fallback mechanisms, see /docs/CARDCOM.md"

Security Breaches:
  mitigation: "RLS policies, Cloudflare WAF, security audits, principle of least privilege"

Email Deliverability:
  mitigation: "SendGrid reputation management, proper SPF/DKIM setup"
```

### Business Risks
```yaml
Regulatory Changes:
  mitigation: "Israeli compliance monitoring, modular integration design"
  
Competition:
  mitigation: "Focus on automation depth, Israeli market expertise"

Scaling Challenges:
  mitigation: "Serverless architecture, proven scaling patterns, caching layers"
```

---

**Last Updated**: September 2025  
**Next Review**: Monthly during development phases

This architecture document serves as the foundation for all technical decisions and should be consulted before any major implementation choices.