# TicoVision CRM - Complete System Documentation

## Overview

**TicoVision** is a multi-tenant CRM system designed specifically for Israeli accounting firms. The system helps accountants manage their clients, generate professional letters, track fees, handle collections, and streamline various accounting-related workflows.

### Key Characteristics
- **Target Market**: Israeli accounting firms
- **Language**: Hebrew (RTL) primary, with English support
- **Current Scale**: 10 users, 700 clients → designed to scale to 10,000
- **Multi-tenant**: Each accounting firm (tenant) has isolated data
- **White-label Ready**: Designed for re-branding capability

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript (strict) + Vite |
| **UI Framework** | shadcn/ui + Tailwind CSS |
| **State Management** | Zustand |
| **Backend** | Supabase (PostgreSQL + Auth + Edge Functions) |
| **Database** | PostgreSQL with Row Level Security (RLS) |
| **Payment Gateway** | Cardcom (Israeli payment processor) |
| **Email Service** | SendGrid |
| **Hosting** | Vercel (frontend) + Supabase (backend) |

---

## Core Architecture

### Multi-Tenant Design

Every data table includes a `tenant_id` column and is protected by Row Level Security (RLS) policies. Users can only access data belonging to their tenant.

```typescript
// All services extend BaseService which enforces tenant isolation
class BaseService {
  protected async getTenantId(): Promise<string> {
    // Gets tenant_id from user's JWT metadata
  }

  // Every query includes WHERE tenant_id = ?
}
```

### User Roles

| Role | Hebrew | Permissions |
|------|--------|-------------|
| `admin` | מנהל | Full access to all features |
| `accountant` | רואה חשבון | Access to clients, fees, letters |
| `bookkeeper` | מנהל/ת חשבונות | Limited access to assigned clients |
| `client` | לקוח | Self-service portal access |

### Key Tables (Partial List)

| Table | Purpose |
|-------|---------|
| `tenants` | Accounting firms |
| `user_tenant_access` | Links users to tenants with roles |
| `clients` | Client companies |
| `client_groups` | Groups of related clients |
| `tenant_contacts` | Shared contact pool (owners, managers, etc.) |
| `client_contact_assignments` | Many-to-many link between clients and contacts |
| `fee_calculations` | Annual fee calculations per client |
| `generated_letters` | All generated letters |
| `client_files` | Uploaded files organized by category |

---

## Feature Modules

### 1. Client Management (ניהול לקוחות)

**Route**: `/clients`
**Service**: `client.service.ts`

Manages client companies with:
- Company details (Hebrew & English names, tax ID, registration number)
- Business type tracking (עוסק מורשה, חברה בע"מ, etc.)
- Status management (active, inactive)
- Service types (bookkeeping, auditing, payroll, etc.)
- Fee settings (internal/external, retainer, specific amounts)

**Key Fields**:
```typescript
interface Client {
  company_name: string;
  company_name_hebrew?: string;
  tax_id: string;  // 9-digit with Luhn validation
  company_registration_number?: string;
  business_type: 'osek_murshe' | 'osek_patur' | 'company' | 'association' | 'partnership';
  client_type: 'external' | 'internal';
  has_retainer: boolean;
  retainer_monthly_amount?: number;
  receives_letters: boolean;  // Controls mass mailing eligibility
}
```

### 2. Client Groups (קבוצות לקוחות)

**Route**: `/client-groups`
**Service**: `client-group.service.ts`

Groups related companies together (e.g., parent company with subsidiaries). Each group has:
- Group name (Hebrew)
- Primary contact
- Associated clients

### 3. Contacts System (אנשי קשר)

**Route**: `/contacts`
**Service**: `contact.service.ts`
**Tables**: `tenant_contacts`, `client_contact_assignments`

Manages a shared pool of contacts that can be assigned to multiple clients:
- Contact types: owner, accountant_manager, bookkeeper, contact_person, other
- Multiple contact methods: email, phone, secondary phone
- Email preferences: primary_only, cc, bcc

**One contact can be assigned to multiple clients** - useful when one person owns multiple companies.

### 4. Fee Management System (ניהול שכר טרחה)

**Route**: `/fees`
**Service**: `fee.service.ts`
**Table**: `fee_calculations`

Annual fee calculation for each client with:

#### Previous Year Data
- Base amount, discount, total with VAT

#### Current Year Calculations
- Base amount (from previous year or manual)
- Inflation adjustment (default 3%)
- Real adjustments (manual additions/deductions)
- Client requested adjustments (discounts)
- Bank transfer discount option (9%)

#### Fee Types
1. **Standard Fee** - Regular annual fee
2. **Bookkeeping Fee** - Internal bookkeeping clients have separate calculation
3. **Retainer Fee** - Monthly retainer × 12 with inflation

#### Payment Methods & Discounts
| Method | Discount |
|--------|----------|
| Bank Transfer | 9% |
| Credit Card (Single) | 8% |
| Credit Card (Installments) | 4% |
| Checks | 0% |

### 5. Collection Management (ניהול גבייה)

**Route**: `/collections`, `/collections/settings`, `/collections/disputes`
**Service**: `collection.service.ts`
**Status**: ✅ Fully Deployed

Tracks payment status and automates collection:

#### Features
- Dashboard with KPIs (open fees, overdue, payment rates)
- Payment method selection tracking
- Partial payment support
- Dispute handling ("שילמתי" button)
- Manual interaction logging

#### Automated Reminders
- Not opened (7 days after sending)
- No selection (14 days, no payment method chosen)
- Abandoned Cardcom (2 days, started but didn't complete)
- Checks overdue (30 days after due date)

#### Edge Functions
- `track-email-open` - Email open tracking pixel
- `track-payment-selection` - Records payment method choice
- `payment-dispute` - Handles dispute submissions
- `cardcom-webhook` - Syncs payment status from Cardcom
- `collection-reminder-engine` - Sends automated reminders
- `alert-monitor` - Checks alert thresholds

### 6. Letter System (מערכת מכתבים)

The letter system is one of the core features, generating professional PDF letters for various purposes.

#### Architecture: 4-Part Templates

Every letter consists of:
1. **Header** (`templates/components/header.html`) - Logo, tenant info
2. **Body** (one of 11+ templates in `templates/bodies/`) - Letter-specific content
3. **Payment Section** (`templates/components/payment-section.html`) - Payment options table
4. **Footer** (`templates/components/footer.html`) - Signature, contact info

#### Template Variables
Uses `{{variable_name}}` format. Example:
```html
<p>לכבוד: {{company_name}}</p>
<p>מספר חברה: {{company_id}}</p>
```

#### Letter Types

**Fee Letters** (שכר טרחה):
- `annual-fee.html` - Standard annual fee letter
- `annual-fee-as-agreed.html` - Fee as previously agreed
- `annual-fee-inflation-only.html` - Inflation adjustment only
- `annual-fee-with-retainer.html` - For retainer clients
- `bookkeeping-annual-fee.html` - Bookkeeping fee
- `retainer-annual-fee.html` - Retainer fee letter

**Bank/Mortgage Approvals** (אישורי בנק/משכנתא):
- `income-confirmation.html` - Income confirmation
- `mortgage-income.html` - Mortgage income letter
- `mortgage-approvals/audited-company.html` - Audited company
- `mortgage-approvals/unaudited-company.html` - Unaudited company
- `mortgage-approvals/osek-submitted.html` - Osek, report submitted
- `mortgage-approvals/osek-unsubmitted.html` - Osek, report pending

**Table**: `generated_letters`
- Stores all generated letters with metadata
- Tracks email sending (sent_at, opened_at, open_count)
- Links to client/group and fee calculation

### 7. Auto Letters (מכתבים אוטומטיים)

**Route**: `/auto-letters`
**Page**: `AutoLettersPage.tsx`
**Types**: `auto-letters.types.ts`

Comprehensive letter generation system organized by categories:

#### Categories

| Category | Hebrew | Description |
|----------|--------|-------------|
| `company_onboarding` | קליטת חברה | New client onboarding documents |
| `setting_dates` | קביעת מועדים | Meeting reminders, deadlines |
| `missing_documents` | מסמכים חסרים | Document request letters |
| `reminder_letters` | מכתבי זירוז | Reminder letters to clients/bookkeepers |
| `bank_approvals` | אישורי הכנסות | Income confirmation for banks |
| `mortgage_approvals` | אישורי משכנתא | Mortgage approval letters |
| `tax_notices` | הודעות מס | Tax payment notices |
| `audit_completion` | סיום ביקורת | Audit completion notifications |
| `tax_advances` | מקדמות מ"ה | Income tax advance notices |
| `protocols` | פרוטוקולים | Shareholder meeting protocols |

#### Letter Types per Category

**Company Onboarding**:
- VAT registration document request
- VAT file opened notification
- Price quote (small company, restaurant)
- Previous accountant document request

**Mortgage Approvals**:
- Audited company (with audited financial statements)
- Unaudited company (statements not yet audited)
- Osek submitted (tax report filed)
- Osek unsubmitted (tax report pending)

**Protocols**:
- Accountant appointment protocol (shareholder meeting)

### 8. Capital Declarations (הצהרות הון)

**Routes**: `/capital-declarations`, `/capital-declarations/:id`
**Portal**: `/capital-declaration/:token` (public)
**Types**: `capital-declaration.types.ts`

Manages capital declaration process for Israeli tax authority:

#### Workflow Status
1. `draft` - טיוטה
2. `sent` - נשלח
3. `in_progress` - הלקוח התחיל
4. `waiting_documents` - ממתין למסמכים
5. `documents_received` - מסמכים התקבלו
6. `reviewing` - בבדיקה
7. `in_preparation` - בהכנה
8. `pending_approval` - ממתין לאישור
9. `submitted` - הוגש
10. `waiting` - ממתין (deferred)

#### Document Categories
- `bank` - בנק (bank statements)
- `real_estate` - נדל"ן (property documents)
- `insurance` - קופות גמל וביטוח
- `vehicles` - רכבים
- `abroad` - נכסים בחו"ל
- `other` - נכסים/חובות נוספים
- `general` - מסמכים כלליים

#### Public Upload Portal
Clients receive a unique link (`/capital-declaration/:token`) to upload documents without logging in.

#### Penalty Management
Tracks late submission penalties:
- Penalty amount
- Status (received, appeal submitted, cancelled, paid)
- Who paid (client or office)

### 9. Tzlul Approvals (אישורי צלול)

**Route**: `/tzlul-approvals`
**Types**: `tzlul-approvals.types.ts`

Specialized documents for a specific client (צלול ניקיון ואחזקה בע"מ):

1. **Violation Correction Letter** - מכתב תיקון הפרות
2. **Summer Bonus Opinion** - חוות דעת מענק קיץ
3. **Excellence Bonus Opinion** - חוות דעת מענק מצויינות
4. **Employee Payments Approval** - אישור תשלומים לעובדים
5. **Transferred Amounts Approval** - אישור העברת סכומים
6. **Going Concern Approval** - הוכחת עמידת המשתתף
7. **Health Benefits Opinion** - חוות דעת הבראה/מחלה/ותק
8. **Salary Payment Confirmation** - אישור רו"ח בדבר תשלום השכר

### 10. Protocol Management (ניהול פרוטוקולים)

**Route**: `/protocols`
**Module**: `src/modules/protocols/`
**Types**: `protocol.types.ts`

Creates and manages meeting protocols:

#### Protocol Structure
- Meeting date
- Title (optional)
- Status: `draft` | `locked`
- Attendees (from contacts, employees, or external)
- Decisions (with responsibility assignment)
- Content sections (announcements, background, recommendations)

#### Decision Types
- Office responsibility (אחריות משרד)
- Client responsibility (אחריות לקוח)
- Bookkeeper responsibility (אחריות מנהלת חשבונות)
- Other (אחר)

#### Styling Options
- Bold/underline text
- Colors: default, blue, green, red

### 11. Foreign Workers Approvals (אישורי עובדים זרים)

**Route**: `/foreign-workers`
**Page**: `ForeignWorkersPage.tsx`

Generates approval documents for foreign worker employment:
- Multiple workers per document
- Worker details (name, passport, dates)
- Employer company information
- Official certification format

### 12. Broadcast System (רשימות תפוצה)

**Route**: `/broadcast`
**Module**: `src/modules/broadcast/`
**Types**: `broadcast.types.ts`

Mass email/letter sending to client groups:

#### Distribution Lists
- Custom lists with selected clients
- "All clients" list (only those with `receives_letters=true`)
- Member management (add/remove clients)

#### Broadcast Status
- `draft` - Being prepared
- `sending` - In progress
- `completed` - Finished
- `failed` - Error occurred
- `cancelled` - User cancelled

#### Email Tracking
- Total sent/failed
- Open tracking (count, last opened)
- Per-recipient status

### 13. Support Tickets (Tico Tickets)

**Route**: `/tico-tickets`
**Module**: `src/modules/tico-tickets/`
**Types**: `ticket.types.ts`

Internal ticketing system for client support:

#### Features
- Kanban board view
- Category/subcategory system
- Priority levels: low, normal, high, urgent
- Assignment to team members
- Reply threads
- Attachment support
- History tracking

#### Public Submission
Clients can submit tickets via public form:
- Auto-matching to existing clients (by email/phone/tax ID)
- Tracking URL for status updates

### 14. File Manager (ניהול מסמכים)

**Route**: `/files`
**Page**: `FilesManagerPage.tsx`
**Service**: `file-upload.service.ts`

Document storage organized by categories:

| Category Key | Hebrew | Description |
|--------------|--------|-------------|
| `company_registry` | רשם החברות | Company registry documents |
| `financial_report` | דו"ח כספי | Audited financial reports |
| `bookkeeping_card` | כרטיסי הנהח"ש | Bookkeeping cards |
| `quote_invoice` | הצעות מחיר | Quotes and invoices |
| `payment_proof_2026` | אסמכתאות תשלום | Payment proofs |
| `holdings_presentation` | מצגת החזקות | Holdings presentation |
| `general` | כללי | General documents |
| `foreign_worker_docs` | אישורי עובדים זרים | Foreign worker documents |
| `protocols` | פרוטוקולים | Protocols |
| `agreements` | הסכמים | Agreements |

### 15. User Management (ניהול משתמשים)

**Route**: `/users`
**Page**: `UsersPage.tsx`
**Service**: `user.service.ts`

Manages tenant users:
- Invite new users via email
- Role assignment
- Active/inactive status
- Multi-tenant support (one user can belong to multiple tenants)

### 16. Settings & Configuration

**Route**: `/settings`
**Page**: `SettingsPage.tsx`

Tenant-level settings:
- Company information
- Logo upload
- Default values
- Email templates
- Notification preferences

---

## Edge Functions (Supabase)

Located in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `send-letter` | Sends letter via email with PDF attachment |
| `generate-pdf` | Generates PDF from HTML template |
| `track-email-open` | Email open tracking pixel |
| `track-payment-selection` | Records payment method choice |
| `payment-dispute` | Handles "I already paid" disputes |
| `cardcom-webhook` | Receives payment confirmations |
| `collection-reminder-engine` | Automated collection reminders |
| `alert-monitor` | Checks and sends alert notifications |

---

## Database Schema Highlights

### Authentication Flow

No `public.users` table exists. User data comes from `auth.users`:

```sql
-- Correct way to get users for a tenant
SELECT uta.user_id, uta.role, au.email
FROM user_tenant_access uta
JOIN auth.users au ON uta.user_id = au.id
WHERE uta.tenant_id = :tenant_id AND uta.is_active = true;
```

### Tenant Isolation Function

```sql
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;
```

### Key Relationships

```
tenants
  └── clients (many)
       └── client_contact_assignments (many)
            └── tenant_contacts
       └── fee_calculations (many)
       └── generated_letters (many)
       └── client_files (many)

tenants
  └── client_groups (many)
       └── clients (many)

tenants
  └── user_tenant_access (many)
       └── auth.users
```

---

## Israeli Market Specifics

### Localization Requirements

| Requirement | Implementation |
|-------------|----------------|
| Language | Hebrew primary, RTL layout |
| Currency | ILS (₪) with Hebrew formatting |
| Date Format | DD/MM/YYYY |
| Tax ID | 9-digit with Luhn check digit |
| VAT Rate | 17% (configurable) |

### Business Entity Types

| Type | Hebrew | Description |
|------|--------|-------------|
| `osek_murshe` | עוסק מורשה | Licensed dealer |
| `osek_patur` | עוסק פטור | Exempt dealer |
| `company` | חברה בע"מ | Limited company |
| `association` | עמותה | Non-profit association |
| `partnership` | שותפות | Partnership |

### Tax Authority Integration (SHAAM)

Planned integration with Israeli tax authority systems for:
- VAT reporting
- Income tax reporting
- Company registry queries

---

## Development Commands

```bash
# Development
npm run dev                    # Start dev server (port 5173)
npm run build                  # Production build
npm run lint                   # ESLint check
npm run typecheck              # TypeScript check

# Database
npm run generate-types         # Update TypeScript types from Supabase

# Templates
npm run sync-templates         # Sync templates to public folder

# Edge Functions
npm run deploy-pdf-function    # Deploy PDF generator
SUPABASE_ACCESS_TOKEN="..." npx supabase functions deploy <name>
```

---

## Project Structure

```
TicoVision/
├── src/
│   ├── components/           # Shared UI components (shadcn/ui based)
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities (supabase client, formatters)
│   ├── modules/              # Feature modules
│   │   ├── broadcast/        # Mass email system
│   │   ├── collections/      # Collection management
│   │   ├── protocols/        # Meeting protocols
│   │   └── tico-tickets/     # Support tickets
│   ├── pages/                # Page components
│   ├── services/             # Business logic services
│   └── types/                # TypeScript type definitions
├── supabase/
│   ├── functions/            # Edge functions
│   └── migrations/           # Database migrations
├── templates/                # Letter templates (SOURCE OF TRUTH)
│   ├── components/           # Header, footer, payment section
│   └── bodies/               # Letter body templates
├── public/
│   └── templates/            # Auto-synced from templates/
└── memory-bank/              # Project documentation
```

---

## Services Architecture

All services extend `BaseService`:

```typescript
// src/services/base.service.ts
export class BaseService {
  protected tableName: string;
  protected supabase = supabase;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected async getTenantId(): Promise<string> {
    // Gets tenant_id from authenticated user's metadata
  }

  protected async query() {
    const tenantId = await this.getTenantId();
    return this.supabase
      .from(this.tableName)
      .select()
      .eq('tenant_id', tenantId);
  }
}
```

### Available Services

| Service | Purpose |
|---------|---------|
| `client.service.ts` | Client CRUD, validation |
| `client-group.service.ts` | Group management |
| `contact.service.ts` | Contact management |
| `fee.service.ts` | Fee calculations |
| `collection.service.ts` | Collection tracking |
| `template.service.ts` | Letter generation |
| `file-upload.service.ts` | File management |
| `user.service.ts` | User management |
| `reminder.service.ts` | Reminder rules |
| `notification.service.ts` | Alert settings |

---

## Planned Features (Phase 2+)

1. **Google Drive Integration**
   - Save PDFs directly to Google Drive
   - Auto folder per client
   - Picker UI for folder selection

2. **Distribution Lists in Letters**
   - Send letters to entire distribution lists
   - Email deduplication for general announcements

3. **SHAAM Integration**
   - Direct API integration with Israeli tax authority
   - Automated reporting

4. **Mobile App**
   - React Native client
   - Push notifications for reminders

---

## Notes for Rebuilding

### Critical Considerations

1. **Multi-tenancy First**: Every table needs `tenant_id` and RLS policies
2. **Hebrew RTL**: Use `dir="rtl"` and `rtl:` Tailwind classes everywhere
3. **No Public Users Table**: Always join through `user_tenant_access`
4. **Template System**: Separate header/body/footer for maintainability
5. **Service Pattern**: Extend `BaseService` for automatic tenant isolation

### Business Rules to Preserve

1. **Payment Discounts**: Bank 9%, CC Single 8%, CC Installments 4%, Checks 0%
2. **Inflation Default**: 3% annual
3. **VAT Rate**: 17% (configurable per tenant)
4. **Tax ID Validation**: 9 digits with Luhn check

### UI/UX Patterns

1. **Tables with Filtering**: All list views have filter chips
2. **Dialogs for Forms**: Use Dialog components for create/edit
3. **Toast Notifications**: Success/error feedback via toast
4. **Loading States**: Skeleton loaders during data fetch
5. **RTL Alignment**: All text right-aligned in Hebrew context

---

*Document generated: January 2026*
*System Version: Phase 1 Complete*
