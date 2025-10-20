# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# TicoVision AI - Core Rules for Claude Code

## Project Context
Multi-tenant CRM for Israeli accounting firms. Starting with 10 users, 700 clients.
Future: Scale to 10,000 clients with white-label support from Day 1.
**Full details: See `/docs/ARCHITECTURE.md` and `/docs/PRD.md`**
**Payment Integration: See `/docs/CARDCOM.md`**

## Tech Stack (LOCKED - DO NOT CHANGE)
```yaml
Frontend:
  - React 19 + Vite + TypeScript (strict mode)
  - UI: shadcn/ui + Tailwind CSS ONLY
  - State: Zustand (no Redux)
  - Router: React Router v6

Backend:
  - Supabase (Database + Auth + Realtime + Storage) - ALREADY SETUP
  - PostgreSQL with Row Level Security (RLS)
  - Edge Functions for business logic

Infrastructure:
  - CDN: Cloudflare (protection + performance)
  - Monitoring: Sentry + DataDog
  - Email: SendGrid (transactional emails)

Performance:
  - Caching: Redis/Upstash
  - Queue: BullMQ for background jobs
  - Search: Typesense (Hebrew native support)

Testing:
  - Vitest for unit tests
  - Playwright for E2E testing
  - Coverage target: 80%+ for services

Payment:
  - Cardcom (Israeli payment gateway) - DECIDED
  - Full integration guide: /docs/CARDCOM.md

Israeli Market:
  - Language: Hebrew primary, English secondary
  - External APIs: חשבשבת integration (Phase 2)
```

## 🔴 NEVER Rules (Critical Violations)
1. **NEVER** use Material-UI, Ant Design, Mantine, or any UI library except shadcn/ui
2. **NEVER** access data without tenant_id filter
3. **NEVER** commit API keys - use .env.local
4. **NEVER** bypass Supabase RLS policies
5. **NEVER** mix business logic in components (use services)
6. **NEVER** use `any` type in TypeScript
7. **NEVER** skip error boundaries in React components
8. **NEVER** hardcode values that could be global (colors, fonts, sizes, business rules)

## ✅ ALWAYS Rules

### 🔴 RTL Alignment Rule (CRITICAL - BASE LAW)
**ALL UI COMPONENTS MUST BE RIGHT-ALIGNED FOR HEBREW INTERFACE**
- **זה חוק בסיס**: Every single text element, dialog, modal, popup, dropdown, and form MUST be right-aligned
- **Use RTL classes on ALL components**: `rtl:text-right` and `ltr:text-left` classes on all text elements
- **Headers, descriptions, labels, buttons** - EVERYTHING must be right-aligned in RTL mode
- **This includes ALL shadcn/ui components**: Dialog, AlertDialog, Popover, DropdownMenu, Sheet, Tooltip, Card, etc.
- **Button groups**: Use `rtl:space-x-reverse` for proper spacing
- **Default alignment**: Should ALWAYS be right for Hebrew interface
- **NO EXCEPTIONS**: If you see ANY text aligned to the left in the Hebrew interface, it's a BUG that must be fixed immediately

1. **ALWAYS** use MCP commands first for database operations:
   ```bash
   # List tables
   /supabase list-tables
   
   # Describe table structure
   /supabase describe-table <table_name>
   
   # Get full schema overview
   /supabase get-schema
   
   # List all database functions
   /supabase list-functions
   ```

2. **ALWAYS** use available Sub-Agents for specialized tasks:
   ```bash
   # For security reviews and RLS policy validation
   @security-auditor
   
   # For database design and schema optimization
   @database-admin
   
   # For API design and backend architecture
   @backend-architect
   
   # For code quality and best practices
   @code-reviewer
   
   # For automation workflows and business logic
   @automation-engineer
   
   # For frontend components and UX
   @frontend-developer
   ```

3. **ALWAYS** use plural snake_case for tables: `clients` not `client`
4. **ALWAYS** add comments to tables and functions in SQL
5. **ALWAYS** generate types after schema changes: `npm run generate-types`
6. **ALWAYS** test RLS policies before implementing features
7. **ALWAYS** use optimistic updates for better UX
8. **ALWAYS** paginate lists (default: 20 items)

## 🌐 Israeli Market Requirements (MANDATORY)
1. **Language**: Hebrew UI with RTL support (dir="rtl" in HTML)
2. **Currency**: ILS (₪) formatting - ₪1,234.56
3. **Date Format**: DD/MM/YYYY (Israeli standard)
4. **Tax ID**: 9-digit Israeli tax ID validation with Luhn check digit
5. **Payment Gateway**: Cardcom (Israeli credit card processing) - See `/docs/CARDCOM.md`
6. **Business Letters**: Hebrew correspondence, formal tone - **Templates from Shani & Tiko**
7. **Typography**: Hebrew fonts (Assistant/Heebo) with RTL layout

### Implemented Israeli Tax ID Validation:
```typescript
// In client.service.ts - ALREADY IMPLEMENTED
private validateTaxId(taxId: string): boolean {
  if (!/^\d{9}$/.test(taxId)) return false;
  const digits = taxId.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let num = digits[i] * ((i % 2) + 1);
    sum += num > 9 ? num - 9 : num;
  }
  return sum % 10 === 0; // Luhn algorithm check
}
```

### Currency Formatting:
```typescript
// Format as Israeli Shekel
const formatILS = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS'
  }).format(amount); // Returns: ₪1,234.56
}
```

### Date Formatting:
```typescript
// Israeli date format DD/MM/YYYY
const formatIsraeliDate = (date: Date): string => {
  return new Intl.DateTimeFormat('he-IL').format(date);
}
```

## 🌍 Global Configuration Rules
1. **MANDATORY GLOBALS**: Colors, fonts, sizes, spacing - MUST be defined globally
2. **BUSINESS RULES**: Fee rates, payment terms, deadline intervals - MUST be global constants
3. **SYSTEM SETTINGS**: Pagination, timeouts, file limits - MUST be centralized
4. **ASK FIRST**: Before creating any global configuration file or constant, ask Asaf for approval
5. **SINGLE SOURCE**: Each value should have exactly one source of truth
6. **EASY OVERRIDE**: Global values should be easily changeable for white-label customization

### Global Structure Pattern:
```typescript
// ✅ Correct approach - ask Asaf first, then implement:
// lib/design-tokens.ts - for UI values
// lib/business-rules.ts - for business logic values  
// lib/system-config.ts - for system settings

// ❌ Wrong approach:
const primaryColor = "#3b82f6" // Hardcoded in component
const maxClients = 700 // Hardcoded business rule
```

## File Structure
```
src/
├── components/        # UI components (shadcn/ui based)
├── modules/           # Feature modules
│   ├── fee-management/    # Phase 1: Automated fee collection
│   ├── letter-templates/  # 11 letter templates from Shani & Tiko
│   ├── payment-system/    # Cardcom integration (see /docs/CARDCOM.md)
│   ├── clients/          # Client management (CRM base)
│   ├── user-management/  # User roles & permissions system
│   └── dashboard/        # Real-time revenue tracking
├── services/         # Business logic & API calls (EXTENDS BaseService)
│   ├── base.service.ts     # Base class for all services
│   ├── client.service.ts   # Client management with Israeli tax ID validation
│   ├── fee.service.ts      # Fee calculations and management
│   ├── letter.service.ts   # Letter template generation
│   ├── cardcom.service.ts  # Payment gateway integration
│   └── audit.service.ts    # Audit logging for all actions
├── hooks/           # Custom React hooks
├── lib/            # Utilities & configurations (GLOBAL VALUES HERE)
│   └── supabase.ts # Supabase client + helper functions
└── types/          # TypeScript definitions
```

## 🏗️ Service Architecture Pattern (MANDATORY)

### All services MUST extend BaseService:
```typescript
// Every service follows this pattern:
export class YourService extends BaseService {
  constructor() {
    super('table_name'); // Pass the table name
  }
  
  // All methods MUST use tenant isolation:
  async getAll() {
    const tenantId = await this.getTenantId(); // REQUIRED
    // Query with tenant_id filter
  }
}
```

### Service Response Pattern:
```typescript
interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

// ALWAYS return this structure from service methods
```

### Available Helper Functions:
```typescript
// In lib/supabase.ts - USE THESE:
getCurrentTenantId(): Promise<string | null>  // Get current tenant
getCurrentUserRole(): Promise<string | null>  // Get user role

// In BaseService - INHERITED BY ALL:
getTenantId(): Promise<string>               // Throws if no tenant
handleError(error): Error                    // Standardize errors  
logAction(action, resourceId?, details?)     // Audit logging
buildPaginationQuery(query, params)          // Pagination helper
buildFilterQuery(query, filters)             // Filter helper
```

## 🚨 CRITICAL DATABASE ARCHITECTURE NOTES (DO NOT IGNORE)

### Table Architecture - THERE IS NO `users` TABLE!
The system uses **`user_tenant_access`** for user-tenant relationships:
- **auth.users** - Supabase authentication (DO NOT QUERY DIRECTLY)
- **user_tenant_access** - Links users to tenants with roles
- **super_admins** - Super admin access control
- **NO `public.users` TABLE EXISTS** - Any reference to it will fail

### Common Errors and Solutions:
1. **"column reference is ambiguous"** - Always qualify columns with table alias (e.g., `uta.user_id` not just `user_id`)
2. **"relation users does not exist"** - You're referencing non-existent `public.users` table, use `user_tenant_access` instead
3. **RLS infinite recursion** - Use SECURITY DEFINER functions to bypass RLS where needed
4. **400 Bad Request on RPC calls** - Check function parameter names and column qualifications

### Correct User Query Pattern:
```sql
-- CORRECT: Get users for a tenant
SELECT 
  uta.user_id,
  uta.role,
  au.email
FROM user_tenant_access uta
JOIN auth.users au ON uta.user_id = au.id
WHERE uta.tenant_id = 'tenant-id'
AND uta.is_active = true;

-- WRONG: This will fail
SELECT * FROM users; -- NO SUCH TABLE!
```

### Database Function Best Practices:
1. **Always qualify columns** in PL/pgSQL functions to avoid ambiguity
2. **Use table aliases** consistently (uta for user_tenant_access, au for auth.users)
3. **Declare variables** with different names than column names
4. **Test functions** directly in SQL before using in application

## 💥 User Management & Authentication System

### User Roles & Hierarchy:
```typescript
type UserRole = 'admin' | 'accountant' | 'bookkeeper' | 'client';

interface UserPermissions {
  modules: {
    [moduleName: string]: {
      read: boolean;
      write: boolean;
      view: boolean;
      delete?: boolean;
    };
  };
  systemActions: {
    manageUsers: boolean;
    viewLogs: boolean;
    systemConfig: boolean;
  };
}
```

### Authentication Flow:
1. **Supabase Auth**: Email/password + social login - ALREADY CONFIGURED
2. **Initial Setup**: First user becomes admin automatically
3. **User Registration**: New users need admin approval
4. **Role Assignment**: Admins set roles and permissions
5. **Module Access**: Sidebar shows only allowed modules

### Audit Logging Requirements:
```typescript
interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;           // "login", "create_client", "send_letter"
  module: string;           // "fee-management", "user-management"
  resource_id?: string;     // ID of affected resource
  details: Record<string, unknown>; // Action-specific data (NO ANY TYPE!)
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  tenant_id: string;       // For multi-tenancy
}
```

### Required Pages:
- `/login` - Supabase Auth login
- `/dashboard` - Main dashboard with module sidebar
- `/admin/users` - User management (admin only)
- `/admin/permissions` - Permission templates
- `/admin/audit-logs` - System activity logs

## 📋 Task Management System

### Task Tracking Rules:
1. **ALWAYS** create tasks in `/docs/TASKS.md` before starting work
2. **ALWAYS** check off completed tasks with ✅
3. **ALWAYS** add new tasks during development
4. **ALWAYS** update progress weekly

### Task Format:
```markdown
## Current Sprint Tasks

### Phase 1: Fee Management System
- [ ] Setup user authentication with Supabase
- [ ] Create user roles and permissions system
- [ ] Build admin user management interface
- [ ] Implement audit logging for all actions
- [x] Setup project structure and dependencies ✅
```

## Current Development Phase
**Phase 1: Fee Management System** (Active - Target: December 2025)
- ✅ Focus: Automated fee collection + 11 letter templates from Shani & Tiko
- ✅ Payment integration: Cardcom credit card links in letters (see /docs/CARDCOM.md)
- ✅ Real-time dashboard: Budget vs. actual collections
- ✅ Letter template system: Simple variable replacement (NO AI GENERATION)
- ✅ Multi-tenant with RLS from Day 1 for white-label support
- ⏸️ Skip: Advanced AI, Tax authority APIs (Phase 2-3)

## 🗄️ Database Migration Guidelines

### CRITICAL: Migration Requirements
```sql
-- ALWAYS use gen_random_uuid() NOT uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Auth functions MUST be in public schema (permission issues)
CREATE OR REPLACE FUNCTION public.get_current_tenant_id() 
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- NOT in auth schema - will fail with permission denied
```

### Table Naming Conventions:
- **ALWAYS** plural snake_case: `clients`, `fee_calculations`, `letter_templates`
- **ALWAYS** include `tenant_id UUID NOT NULL` for multi-tenancy
- **ALWAYS** add RLS policies for tenant isolation
- **ALWAYS** add table comments for documentation

## Environment Setup
```bash
# Development setup needed:
cp .env.example .env.local
npm install
npx supabase start
npm run dev

# Required environment variables (ALREADY CONFIGURED):
VITE_SUPABASE_URL=https://zbqfeebrhberddvfkuhe.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SENDGRID_API_KEY=your-sendgrid-key
REDIS_URL=your-redis-url
CARDCOM_TERMINAL_NUMBER=see-cardcom-docs
CARDCOM_API_USERNAME=see-cardcom-docs
```

## Quick Commands
```bash
# Development
npm run dev                    # Start dev server (port 5173)
npm run build                  # Build for production
npm run preview                # Preview production build
npm run lint                   # Check code quality with ESLint
npm run typecheck              # TypeScript type checking (no emit)
npm run pre-commit             # Run lint + typecheck before commit

# Database (Supabase already setup)
npx supabase db reset          # Reset local DB
npm run generate-types         # Update TypeScript types from database

# MCP Database Operations (USE THESE FIRST)
/supabase list-tables          # View all tables
/supabase describe-table <name> # Table structure
/supabase get-schema           # Full schema overview
/supabase list-functions       # Database functions

# Troubleshooting
lsof -i :5173                  # Check if port is in use
kill -9 $(lsof -t -i:5173)    # Kill process on port 5173
```

## MCP & Sub-Agents Usage

### When to Use Sub-Agents:
```bash
# Security and compliance
@security-auditor "Review RLS policies for fee_calculations table"
@security-auditor "Audit authentication flow for multi-tenant access"

# Database operations
@database-admin "Design schema for Hebrew letter templates"
@database-admin "Optimize queries for 10,000+ clients"
@database-admin "Setup table partitioning for multi-tenancy"

# Backend architecture
@backend-architect "Design fee calculation service architecture"
@backend-architect "Plan API structure for Cardcom payment integration"

# Automation workflows
@automation-engineer "Design automated fee collection workflow"
@automation-engineer "Create letter sending automation rules"

# Code quality
@code-reviewer "Review fee calculation logic for business rules"
@code-reviewer "Check TypeScript types for audit logging"

# Frontend development
@frontend-developer "Build Hebrew RTL dashboard with shadcn/ui"
@frontend-developer "Create responsive payment status components"
```

### MCP Database Commands Priority:
1. **FIRST**: Use MCP commands for database exploration
2. **SECOND**: Use npx supabase commands for schema changes
3. **THIRD**: Manual SQL only when needed

## 📧 Letter System - CRITICAL ARCHITECTURE

### ⚠️ IMPORTANT - Database Tables
**USE ONLY:** `generated_letters` table (via `template.service.ts`)
**DO NOT USE:** `letter_history` table (deprecated)

### Template Structure (3-Part System)
All 11 letters share the same Header + Footer, only Body content changes:

1. **Header** (`/templates/letter-header.html`) - Shared by all
   - Logo TICO + Date
   - Recipient details (לכבוד)
   - Variables: `{{letter_date}}`, `{{company_name}}`, `{{group_name}}`

2. **Body** (`/templates/letter-body-[type].html`) - Unique per template
   - 11 different bodies (one per template type)
   - Example: `letter-body-annual-fee.html`
   - Variables: `{{company_name}}`, `{{year}}`, `{{inflation_rate}}`

3. **Footer** (`/templates/letter-footer.html`) - Shared by all
   - Payment section (4 options: CC single, CC 4 payments, Bank, Checks)
   - Contact details (Sigal Nagar)
   - Franco logo + company info
   - Tagline: "DARE TO THINK · COMMIT TO DELIVER"
   - Variables: `{{amount_single}}`, `{{payment_link_single}}`, etc.

### How System Merges Components
```typescript
// System automatically combines:
final_letter = header + body + footer

// Example flow:
const variables = {
  letter_date: '4.10.2025',        // Auto-generated if not provided
  company_name: 'מסעדת האחים',
  amount_single: 43344,
  payment_link_single: 'https://cardcom...'
};

await templateService.generateLetter(templateId, clientId, variables);
// → Saves to generated_letters with full HTML
```

### Template Variables - COMPLETE LIST

**Auto-Generated (you don't need to provide):**
- `{{letter_date}}` - Current date in Israeli format (4.10.2025)
- `{{year}}` - Current year (2025)

**Required in Header:**
- `{{company_name}}` - Client company name
- `{{group_name}}` - Company group name (optional)

**Required in Footer (Payment):**
- `{{amount_single}}` - Single payment amount
- `{{amount_4_payments}}` - 4 payments amount
- `{{amount_bank}}` - Bank transfer amount
- `{{amount_checks}}` - 8 checks amount
- `{{discount_single}}` - Single payment savings
- `{{discount_4_payments}}` - 4 payments savings
- `{{payment_link_single}}` - Cardcom link (single payment)
- `{{payment_link_4_payments}}` - Cardcom link (4 payments)
- `{{client_id}}` - Client ID for check details

**Body Variables (vary by template):**
- `{{inflation_rate}}` - 4% (for annual fee letters)
- `{{adjustment_reason}}` - Reason for fee change
- etc. (see `letter.types.ts` for full schema)

### Services Architecture

**USE THIS:** `modules/letters/services/template.service.ts`
- Advanced system with header/footer support
- Auto-generates `letter_date` and `year`
- Saves to `generated_letters` table
- Tracks opens, clicks, payments

**DO NOT USE:** `services/letter.service.ts`
- Old/deprecated implementation
- Saves to `letter_history` (deprecated table)
- No header/footer support

### Variable Format
Always use double curly braces: `{{variable_name}}`

**Examples:**
- ✅ `{{letter_date}}` - Correct
- ✅ `{{company_name}}` - Correct
- ❌ `[letter_date]` - Wrong (old format)
- ❌ `{letter_date}` - Wrong (single braces)

## API Key Security - Development Phase
```env
# .env.local (for development only)
VITE_SUPABASE_URL=your-dev-supabase-url
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key

# Email Service
SENDGRID_API_KEY=your-sendgrid-key

# Caching
REDIS_URL=your-redis-url

# Cardcom Payment Gateway (see /docs/CARDCOM.md)
CARDCOM_TERMINAL_NUMBER=cardcom-terminal
CARDCOM_API_USERNAME=cardcom-username
CARDCOM_API_KEY=cardcom-key-here

# חשבשבת Integration (Phase 2)
HASHAVSHEVET_API_KEY=hashavshevet-key-here

# Monitoring
SENTRY_DSN=your-sentry-dsn
DATADOG_API_KEY=your-datadog-key

# NEVER commit these files:
.env
.env.local
.env.production
```

## Monitoring & Error Handling
```yaml
Error Tracking: Sentry (production)
Performance: DataDog + Vercel Analytics
Logging: Structured logs with Supabase
Alerts: Critical errors via email/Slack
```

## Testing Strategy
```yaml
Unit Tests: Vitest (80%+ coverage for services)
E2E Tests: Playwright (critical user flows)
RTL Testing: Hebrew UI specific test cases
Security Testing: RLS policies validation
Performance Testing: 10,000+ clients simulation
```

## CI/CD Pipeline
```yaml
Platform: GitHub Actions + Vercel
Stages:
  - Lint & Type Check
  - Unit Tests (Vitest)
  - E2E Tests (Playwright)
  - Security Audit
  - Deploy to Preview
  - Deploy to Production (manual approval)
```

## Development Workflow with Global Values
1. **Before coding**: Identify any values that might be reused or changed
2. **Ask Asaf**: "Should [X value] be global? Where should it go?"
3. **Get approval**: Wait for confirmation before creating global constants
4. **Implement**: Create the global configuration as agreed
5. **Use everywhere**: Import and use the global value consistently

## 🚀 Development Server & Troubleshooting

### Starting Development:
```bash
# Default port: http://localhost:5173
npm run dev

# Access points:
http://localhost:5173/setup   # Initial setup page (create admin)
http://localhost:5173/login   # Login page
http://localhost:5173/        # Main dashboard (after auth)
```

### Common Issues & Solutions:

#### Multiple Dev Servers Running:
```bash
# Check running processes
ps aux | grep vite
lsof -i :5173

# Kill old processes
kill -9 $(lsof -t -i:5173)

# Or kill all node processes (careful!)
killall node
```

#### Import Errors:
```typescript
// ❌ Wrong - may cause "does not provide export" error
import { Session } from '@supabase/supabase-js';

// ✅ Correct - use type imports
import type { Session } from '@supabase/supabase-js';
```

#### Component Import Issues:
```bash
# shadcn/ui components may install in wrong location
# If @/components/ui doesn't work, check:
ls src/components/ui/
ls "@/components/ui/"  # Wrong location

# Fix by moving:
mv "@/components/ui/"* src/components/ui/
```

#### Missing Dependencies:
```bash
# Common missing packages after shadcn/ui install:
npm install class-variance-authority
npm install @tailwindcss/postcss
```

## Where to Find More
- **Architecture Details**: `/docs/ARCHITECTURE.md`
- **Product Requirements**: `/docs/PRD.md`
- **API Documentation**: `/docs/API.md`
- **Cardcom Integration**: `/docs/CARDCOM.md`
- **Database Reference**: `/docs/DATABASE_REFERENCE.md` ⭐ **ALWAYS USE THIS FIRST!**
- **Database Schema**: Auto-generated via MCP tools
- **Task Management**: `/docs/TASKS.md`
- **Naming Conventions**: `/docs/DATABASE-SCHEMA.md`

## 🗄️ Database Reference - MANDATORY USE
**CRITICAL**: Always consult `/docs/DATABASE_REFERENCE.md` BEFORE:
- Creating any migration
- Writing any SQL query
- Using any table or function
- Adding new database objects

**UPDATE REQUIREMENT**: Any database changes MUST be reflected in DATABASE_REFERENCE.md immediately

---
**Remember**: 
- Phase 1 = Fee Management System by December 2025. Keep it simple, focused, and automated.
- Letter templates come from Shani & Tico - NO AI generation needed.
- Global values = Ask Asaf first, implement second.
- Multi-tenant & white-label ready from Day 1.
- Hebrew + RTL support is mandatory from day one.
- Use MCP commands and Sub-Agents - they're already installed and ready to use.
- Cardcom integration is critical - see `/docs/CARDCOM.md` for full details.
- Service architecture pattern is MANDATORY - all services must extend BaseService.