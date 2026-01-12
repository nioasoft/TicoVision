# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context
Multi-tenant CRM for Israeli accounting firms. 10 users, 700 clients → scaling to 10,000.
**Phase 1**: Fee Management System (Target: December 2025)

## Tech Stack (LOCKED)
- **Frontend**: React 19 + Vite + TypeScript (strict) + shadcn/ui + Tailwind + Zustand
- **Backend**: Supabase (PostgreSQL + RLS + Auth + Edge Functions)
- **Payments**: Cardcom (Israeli gateway)
- **Email**: SendGrid

## Quick Commands
```bash
# Development
npm run dev                    # Start dev (port 5173, fallback 5174)
npm run build                  # Production build
npm run lint                   # ESLint check
npm run typecheck              # TypeScript check (no emit)
npm run pre-commit             # lint + typecheck

# Database
npm run generate-types         # Update TS types from Supabase schema

# Templates & Assets
npm run sync-templates         # Sync templates/ → public/templates/
npm run upload-assets-v2       # Upload letter assets to storage
npm run verify-v2              # Verify V2 setup

# Edge Functions
npm run deploy-pdf-function    # Deploy PDF generator
SUPABASE_ACCESS_TOKEN="..." npx supabase functions deploy <name>

# Troubleshooting
lsof -i :5173                  # Check port usage
kill -9 $(lsof -t -i:5173)     # Kill process on port
```

## 🔴 NEVER Rules
1. **NEVER** use UI libraries except shadcn/ui (no MUI, Ant, Mantine)
2. **NEVER** access data without `tenant_id` filter
3. **NEVER** commit API keys - use `.env.local`
4. **NEVER** bypass Supabase RLS policies
5. **NEVER** mix business logic in components (use services)
6. **NEVER** use `any` type in TypeScript
7. **NEVER** hardcode values that could be global
8. **NEVER** use example placeholders in forms (no `050-1234567`, `example@email.com`, etc.) - use descriptive Hebrew text instead (`מספר טלפון`, `כתובת אימייל`)

## ✅ ALWAYS Rules
1. **ALWAYS** extend `BaseService` for new services
2. **ALWAYS** use `getTenantId()` for tenant isolation
3. **ALWAYS** run `npm run generate-types` after schema changes
4. **ALWAYS** use plural snake_case for tables: `clients` not `client`
5. **ALWAYS** paginate lists (default: 20 items)
6. **ALWAYS** use optimistic updates for UX

## 🔴 RTL Alignment (BASE LAW - חוק בסיס)
**ALL UI MUST BE RIGHT-ALIGNED FOR HEBREW**
- Every text element, dialog, modal, form MUST be right-aligned
- Use `rtl:text-right` and `ltr:text-left` on ALL text elements
- Button groups: Use `rtl:space-x-reverse`
- If ANY text is left-aligned in Hebrew UI → it's a BUG

## 🌐 Israeli Market Requirements
| Requirement | Format | Example |
|-------------|--------|---------|
| Language | Hebrew primary, RTL | `dir="rtl"` |
| Currency | ILS (₪) | `₪1,234.56` |
| Date | DD/MM/YYYY | `25/11/2025` |
| Tax ID | 9-digit + Luhn | `validateTaxId()` in `client.service.ts` |

## Service Architecture (MANDATORY)
```typescript
// All services MUST extend BaseService
export class YourService extends BaseService {
  constructor() {
    super('table_name');
  }

  async getAll() {
    const tenantId = await this.getTenantId(); // REQUIRED
    // Query with tenant_id filter
  }
}

// Response pattern
interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}
```

## 🚨 Database Architecture - CRITICAL
### NO `public.users` TABLE!
```sql
-- CORRECT: Get users for tenant
SELECT uta.user_id, uta.role, au.email
FROM user_tenant_access uta
JOIN auth.users au ON uta.user_id = au.id
WHERE uta.tenant_id = 'tenant-id' AND uta.is_active = true;

-- WRONG: This will FAIL
SELECT * FROM users; -- TABLE DOES NOT EXIST!
```

### Migration Requirements
```sql
-- Use gen_random_uuid() NOT uuid_generate_v4()
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Auth functions MUST be in public schema
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;
```

## 📧 Letter System - 4-Part Architecture
**Template = Header + Body (1 of 11) + Payment Section + Footer**

### Directory Structure
```
templates/              ← SOURCE OF TRUTH - ALWAYS EDIT HERE!
├── components/
│   ├── header.html
│   ├── footer.html
│   └── payment-section.html
└── bodies/             ← 11 letter types
    ├── annual-fee.html
    ├── annual-fee-as-agreed.html
    └── ... (9 more)
```

### Rules
- **Edit ONLY** `templates/` - auto-syncs to `public/templates/` on `npm run dev`
- **Use** `template.service.ts` → saves to `generated_letters` table
- **DO NOT USE** `letter.service.ts` (deprecated) or `letter_history` table
- **Variables**: Use `{{variable_name}}` format

### Payment Discounts (BUSINESS RULES)
```typescript
const PAYMENT_DISCOUNTS = {
  bank_transfer: 9,      // 9% discount
  cc_single: 8,          // 8% discount
  cc_installments: 4,    // 4% discount
  checks: 0              // 0% discount
} as const;
```

**Full details**: `/memory-bank/letter-system-structure.md`

## 📞 Contacts System
- **tenant_contacts** - Shared contact pool (owner, accountant_manager, etc.)
- **client_contact_assignments** - Many-to-many link between clients and contacts
- One contact can be assigned to multiple clients

**Full details**: See Migration 083 docs

## 📁 File Manager (10 Categories)
| Category | Hebrew |
|----------|--------|
| company_registry | רשם החברות |
| financial_report | דו"ח כספי מבוקר אחרון |
| bookkeeping_card | כרטיסי הנהח"ש אצלנו |
| quote_invoice | הצעות מחיר / תעודות חיוב |
| payment_proof_2026 | אסמכתאות תשלום 2026 |
| holdings_presentation | מצגת החזקות |
| general | כללי |
| foreign_worker_docs | אישורי עובדים זרים |
| protocols | פרוטוקולים |
| agreements | הסכמים |

**Route**: `/files` | **Service**: `file-upload.service.ts`

## 💰 Collection System (DEPLOYED)
- **Tables**: `payment_method_selections`, `payment_disputes`, `payment_reminders`, `client_interactions`, `notification_settings`, `reminder_rules`
- **Edge Functions**: `track-email-open`, `track-payment-selection`, `payment-dispute`, `cardcom-webhook`, `collection-reminder-engine`, `alert-monitor`, `send-letter`
- **Routes**: `/collections`, `/collections/settings`, `/collections/disputes`

**Full details**: `/memory-bank/collection-system-summary.md`

## User Roles
```typescript
type UserRole = 'admin' | 'accountant' | 'bookkeeper' | 'client';
```
- `user_tenant_access` - Links users to tenants with roles
- `super_admins` - Super admin access control

## File Structure
```
src/
├── components/        # UI (shadcn/ui based)
├── modules/           # Feature modules (collections, letters, etc.)
├── services/          # Business logic (EXTENDS BaseService)
├── hooks/             # Custom React hooks
├── lib/               # Utilities (supabase.ts, formatters.ts)
└── types/             # TypeScript definitions
```

## Environment Variables
```env
# Required in .env.local
VITE_SUPABASE_URL=https://zbqfeebrhberddvfkuhe.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SENDGRID_API_KEY=your-sendgrid-key
```

## Development URLs
```
http://localhost:5173/setup   # Initial setup (create admin)
http://localhost:5173/login   # Login
http://localhost:5173/        # Dashboard (after auth)
```

## 📋 Phase 2+ Planned Features
| Feature | Plan Location | Status |
|---------|---------------|--------|
| Google Drive Integration | `~/.claude/plans/jaunty-gliding-toucan.md` | Planned |

**Google Drive**: Save PDFs directly to Google Drive with Picker UI (hybrid approach - auto folder per client + user selection)

## Detailed Documentation
| Topic | Location |
|-------|----------|
| Letter System | `/memory-bank/letter-system-structure.md` |
| Collection System | `/memory-bank/collection-system-summary.md` |
| Project Brief | `/memory-bank/projectbrief.md` |
| Tech Context | `/memory-bank/techContext.md` |
| System Patterns | `/memory-bank/systemPatterns.md` |
| Active Context | `/memory-bank/activeContext.md` |
| Progress | `/memory-bank/progress.md` |

## Key Reminders
- Phase 1 = Fee Management by December 2025
- Letter templates from Shani & Tiko - NO AI generation
- Global values = Ask Asaf first
- Multi-tenant + white-label ready from Day 1
- Hebrew + RTL mandatory
- Services MUST extend BaseService
