# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**Payment Processing:**
- Cardcom (Israeli payment gateway) - Credit card payments, installments, tokenization
  - SDK/Client: Native HTTP via `cardcom.service.ts`
  - Auth: Terminal credentials (`VITE_CARDCOM_TERMINAL`, `VITE_CARDCOM_USERNAME`, `VITE_CARDCOM_API_KEY`)
  - Environment: `VITE_CARDCOM_ENV` (test/production)
  - Payment Methods: Bank transfer, CC single payment, CC installments, checks
  - Webhook: Incoming webhook listener for payment status updates

**Email Service:**
- SendGrid - Transactional and bulk email delivery
  - SDK/Client: `@sendgrid/mail` 8.1.6
  - Auth: `SENDGRID_API_KEY` or `VITE_SENDGRID_API_KEY`
  - Implementation: `src/services/email.service.ts`, `src/modules/letters-v2/services/email.service.ts`
  - Features: HTML emails, attachments, CC/BCC, reply-to, templates

## Data Storage

**Databases:**

- Supabase PostgreSQL (Primary)
  - Connection: `VITE_SUPABASE_URL` (PostgREST endpoint)
  - Client: `@supabase/supabase-js` 2.57.2
  - Auth Method: Session-based (JWT in auth context)
  - RLS: Row-Level Security enforced on all tables
  - Key Tables:
    - `tenants` - Multi-tenant isolation root
    - `clients` - Client company data
    - `user_tenant_access` - User role assignment per tenant
    - `generated_letters` - Letter storage with PDF URLs
    - `client_attachments` - File metadata
    - `tenant_contacts` - Shared contact pool
    - `client_contact_assignments` - Many-to-many client-contact links
    - `payment_method_selections`, `payment_disputes`, `payment_reminders` - Collection system
    - `super_admins` - Super admin access control

**File Storage:**

- Supabase Storage (Object Storage)
  - Bucket: `client-attachments` - Client file uploads
  - Bucket: `letter-pdfs` - Generated PDF letters
  - Bucket: `signatures` - Digital signatures
  - Access: Multi-tenant path-based isolation (`{tenant_id}/{category}/{filename}`)
  - Caching: 3600s (1 hour) cache control on uploads

**Caching:**

- Redis - Optional (defined in `.env.example` as `REDIS_URL` but not actively integrated in current codebase)

## Authentication & Identity

**Auth Provider:**

- Supabase Authentication (built-in)
  - Implementation: Email/password via Supabase Auth
  - User Metadata: Tenant ID and role stored in `auth.users.user_metadata`
  - Role-Based Access: `admin`, `accountant`, `bookkeeper`, `client`, `super_admin`
  - Session: Persistent with auto-refresh token
  - Sign-up: Admin creates users via `user.service.ts` → invokes `create_user_with_role` RPC
  - Password Reset: Via `reset_user_password` RPC

**Current User Context:**

- AuthContext (React) - Provides authenticated user state
- Helper Functions:
  - `getCurrentTenantId()` - Returns user's tenant ID from JWT metadata
  - `getCurrentUserRole()` - Returns user's role from JWT metadata
  - `getTenantId()` in services - Used by BaseService for tenant isolation

## Monitoring & Observability

**Error Tracking:**

- Sentry - Optional error tracking
  - Config: `SENTRY_DSN` defined in `.env.example` but integration code not found in current exploration
  - Recommendation: Check if initialized in main app entry point

**Logs:**

- Custom Logger: `src/lib/logger.ts`
  - Methods: `info()`, `warn()`, `error()`, `debug()`
  - Environment: Development logs all; production redacts stack traces
  - No external log aggregation found in current codebase (Datadog defined in example but not integrated)

**Monitoring:**

- Datadog - Optional monitoring
  - Config: `DATADOG_API_KEY` defined in `.env.example` but not integrated in code

## CI/CD & Deployment

**Hosting:**

- Supabase - Primary backend
  - Edge Functions: Serverless functions for PDF generation, email, webhooks
  - Database: PostgreSQL with RLS
  - Auth: Built-in auth system

**CI Pipeline:**

- None detected in repository - No GitHub Actions, GitLab CI, or similar automation found
- Recommendation: Manual deployment for now; consider adding pre-commit hooks via npm scripts

**Pre-Commit Hooks:**

- npm run lint && npm run typecheck - Run before commit (defined in `package.json`)

## Edge Functions

**Deployed Edge Functions:**

All functions located in `supabase/functions/` (not shown in current exploration but referenced in code):

- `generate-pdf` - PDF generation from HTML (called via `supabase.functions.invoke()`)
  - Input: `letterId`
  - Output: PDF URL stored in `generated_letters.pdf_url`
  - Implementation: Server-side rendering to PDF, storage in `letter-pdfs` bucket

- `send-letter` - Email dispatch for generated letters
  - Called from: `src/services/letter-history.service.ts`
  - Input: Letter ID, recipient details
  - Process: Render letter → generate PDF → send via SendGrid

- `capital-declaration-reminder-engine` - Automated reminder workflow
  - Invoked from: `src/services/capital-declaration-reminder.service.ts`
  - Purpose: Send capital declaration reminders to clients

- `track-email-open` - Email open tracking webhook
- `track-payment-selection` - Payment method selection tracking
- `payment-dispute` - Handle payment dispute events
- `cardcom-webhook` - Incoming Cardcom payment notifications
- `collection-reminder-engine` - Automated payment collection reminders
- `alert-monitor` - Alert and notification monitoring

## RPC (Remote Procedure Call) Functions

**Called from Client Code:**

- `get_fee_tracking_data` - Fetch fee tracking dashboard data
- `calculate_payment_deviation` - Calculate payment variances
- `increment_reminder_count` - Track reminder attempts
- `get_client_statistics` - Aggregate client statistics
- `get_users_for_tenant` - Fetch tenant users with auth details
- `create_user_with_role` - Create new user with role assignment
- `update_user_role_and_metadata` - Modify user roles
- `deactivate_user_account` - Soft delete user
- `reset_user_password` - Trigger password reset email

All RPC functions are PostgreSQL plpgsql functions in Supabase with tenant isolation via RLS.

## Webhooks & Callbacks

**Incoming:**

- Cardcom Payment Webhook - Payment status updates (Success/Failure/Processing)
  - Endpoint: `supabase/functions/cardcom-webhook`
  - Trigger: Payment completion, cancellation, refund
  - Processing: Update `payment_method_selections`, notify via `collection-reminder-engine`

- SendGrid Event Webhook - Email delivery status (Bounces, Opens, Clicks, Complaints)
  - Endpoint: `supabase/functions/track-email-open` (and similar)
  - Processing: Update email delivery metrics, track engagement

**Outgoing:**

- SendGrid Email Delivery - Via `sendEmail()` from `src/services/email.service.ts`
  - Trigger: Letter distribution, payment reminders, notifications
  - Response: Message ID, delivery status

- Cardcom Payment Page - Redirect to payment gateway
  - Trigger: Payment request flow
  - Callback: Return URL specified in request, webhook confirmation

## Environment Configuration

**Required Environment Variables:**

```env
# Supabase
VITE_SUPABASE_URL=https://zbqfeebrhberddvfkuhe.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Cardcom (Israeli Payment Gateway)
VITE_CARDCOM_ENV=test or production
VITE_CARDCOM_TERMINAL=<terminal-number>
VITE_CARDCOM_USERNAME=<username>
VITE_CARDCOM_API_KEY=<api-key>

# SendGrid
SENDGRID_API_KEY=SG.<key>
# or
VITE_SENDGRID_API_KEY=SG.<key>

# Optional
REDIS_URL=redis://...
SENTRY_DSN=https://...
DATADOG_API_KEY=...
```

**Secrets Location:**

- Development: `.env.local` (gitignored)
- Production: Environment variables set in deployment platform (Vercel, Supabase, etc.)
- Never commit `.env.local` or hardcode keys

## API Response Patterns

**Service Responses:**

```typescript
interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}
```

All services follow this pattern for consistency.

**Supabase Query Pattern:**

```typescript
const { data, error } = await supabase
  .from('table')
  .select()
  .eq('tenant_id', tenantId);
```

All queries must include `tenant_id` filter for RLS compliance.

## Rate Limiting & Quotas

- Supabase: Default PostgreSQL connection limits
- SendGrid: Standard plan rate limits (~100k emails/month)
- Cardcom: Terminal-specific daily limits

---

*Integration audit: 2026-02-09*
