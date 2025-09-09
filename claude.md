# CRM System - Core Rules for Claude Code

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
1. **Language**: Hebrew UI with RTL support
2. **Currency**: ILS (₪) formatting - ₪1,234.56
3. **Date Format**: DD/MM/YYYY (Israeli standard)
4. **Tax ID**: 9-digit Israeli tax ID validation with check digit
5. **Payment Gateway**: Cardcom (Israeli credit card processing) - See `/docs/CARDCOM.md`
6. **Business Letters**: Hebrew correspondence, formal tone - **Templates from Shani & Tiko**
7. **Typography**: Hebrew fonts (Assistant/Heebo) with RTL layout

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
├── services/         # Business logic & API calls
│   ├── cardcom.service.ts # Payment gateway integration
│   ├── sendgrid.service.ts # Email service
│   └── cache.service.ts    # Redis/Upstash caching
├── hooks/           # Custom React hooks
├── lib/            # Utilities & configurations (GLOBAL VALUES HERE)
└── types/          # TypeScript definitions
```

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

## Environment Setup
```bash
# Development setup needed:
cp .env.example .env.local
npm install
npx supabase start
npm run dev

# Required environment variables (see /docs/CARDCOM.md for payment vars):
VITE_SUPABASE_URL=your-dev-supabase-url
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key
SENDGRID_API_KEY=your-sendgrid-key
REDIS_URL=your-redis-url
CARDCOM_TERMINAL_NUMBER=see-cardcom-docs
CARDCOM_API_USERNAME=see-cardcom-docs
```

## Quick Commands
```bash
# Development
npm run dev                    # Start dev server
npm run test                   # Run Vitest unit tests
npm run test:e2e              # Run Playwright E2E tests
npm run lint                   # Check code quality

# Database (Supabase already setup)
npx supabase db reset          # Reset local DB
npm run generate-types         # Update TypeScript types

# MCP Database Operations (USE THESE FIRST)
/supabase list-tables          # View all tables
/supabase describe-table <name> # Table structure
/supabase get-schema           # Full schema overview
/supabase list-functions       # Database functions

# Before commit
npm run pre-commit             # Run all checks
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

## Letter Template System (NOT AI GENERATION)

### How Letter Templates Work:
1. **Shani & Tiko provide 11 completed letter templates** (HTML/Text)
2. **System replaces variables**: `{{client_name}}`, `{{amount}}`, `{{date}}`
3. **Template selection logic**: Based on fee type, client status, etc.
4. **NO AI generation needed** - simple string replacement

### Template Variables:
```typescript
interface LetterVariables {
  client_name: string;
  company_name: string;
  amount: string;        // Formatted in ILS (₪1,234.56)
  due_date: string;      // DD/MM/YYYY format
  contact_name: string;
  previous_amount?: string;
  adjustment_reason?: string;
  payment_link?: string;     // Cardcom payment URL
}
```

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

## Where to Find More
- **Architecture Details**: `/docs/ARCHITECTURE.md`
- **Product Requirements**: `/docs/PRD.md`
- **API Documentation**: `/docs/API.md`
- **Cardcom Integration**: `/docs/CARDCOM.md`
- **Database Schema**: Auto-generated via MCP tools
- **Task Management**: `/docs/TASKS.md`
- **Naming Conventions**: `/docs/DATABASE-SCHEMA.md`

---
**Remember**: 
- Phase 1 = Fee Management System by December 2025. Keep it simple, focused, and automated.
- Letter templates come from Shani & Tico - NO AI generation needed.
- Global values = Ask Asaf first, implement second.
- Multi-tenant & white-label ready from Day 1.
- Hebrew + RTL support is mandatory from day one.
- Use MCP commands and Sub-Agents - they're already installed and ready to use.
- Cardcom integration is critical - see `/docs/CARDCOM.md` for full details.