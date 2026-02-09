# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
src/
├── App.tsx                          # Router definition & route lazy loading
├── main.tsx                         # React root entry point
├── vite-env.d.ts
├── index.css                        # Global Tailwind & styles
│
├── components/                      # Shared components (reusable across features)
│   ├── ui/                          # shadcn/ui primitives (button, dialog, badge, etc.)
│   ├── layout/                      # Navigation, MainLayout
│   ├── auth/                        # ProtectedRoute, RoleBasedRoute, LoginForm
│   ├── clients/                     # Client-specific shared components
│   ├── contacts/                    # Contact management UI
│   ├── files/                       # File upload, manager
│   ├── payments/                    # Payment UI (dialogs, cards)
│   ├── auto-letters/                # Auto-generated letter forms by type
│   │   └── forms/                   # 8+ letter type forms (tax-advances, protocols, etc.)
│   ├── letters/                     # Letter editing & preview components
│   ├── dashboard/                   # Dashboard widgets
│   ├── foreign-workers/             # Foreign worker management UI
│   ├── tzlul-approvals/             # Tzlul approval UI
│   ├── capital-declarations/        # Capital declaration UI
│   ├── company-onboarding/          # Company setup forms
│   ├── freelancers/                 # Freelancer-specific UI
│   ├── users/                       # User management UI
│   ├── groups/                      # Client group UI
│   ├── fee-tracking/                # Fee tracking dashboard
│   ├── editor/                      # Rich text editor (TipTap/Lexical)
│   └── ErrorBoundary.tsx            # Error boundary wrapper
│
├── modules/                         # Feature modules (self-contained)
│   ├── annual-balance/              # Annual balance sheets workflow
│   │   ├── components/              # 14 balance-specific components
│   │   ├── services/                # annual-balance.service.ts
│   │   ├── store/                   # annualBalanceStore.ts (Zustand)
│   │   ├── types/                   # annual-balance.types.ts, validation.ts
│   │   ├── pages/                   # AnnualBalancePage.tsx
│   │   └── index.ts                 # Public exports
│   ├── letters/                     # Letter system (templates, generation)
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── templates/               # HTML email templates
│   │   └── index.ts
│   ├── letters-v2/                  # V2 letter system (newer implementation)
│   ├── letters_backup/              # Legacy letters (deprecated)
│   ├── collections/                 # Payment collection workflow
│   │   ├── components/
│   │   ├── services/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── types/
│   │   └── index.ts
│   ├── billing/                     # Billing letters & invoices
│   ├── broadcast/                   # Distribution lists
│   │   ├── components/
│   │   ├── services/
│   │   ├── store/
│   │   ├── pages/
│   │   └── index.ts
│   ├── protocols/                   # Protocol management
│   ├── documents/                   # Document hub & categorization
│   ├── client-profile/              # Client profile unified view
│   ├── chat/                        # Real-time messaging system
│   ├── help/                        # Help & documentation
│   ├── tico-tickets/                # Internal ticket management
│   └── [feature]/                   # Pattern for new modules
│
├── pages/                           # Route pages (lazy loaded by App.tsx)
│   ├── LoginPage.tsx
│   ├── SetupPage.tsx
│   ├── DashboardPage.tsx
│   ├── ClientsPage.tsx
│   ├── FeesPage.tsx
│   ├── LettersPage.tsx
│   ├── AutoLettersPage.tsx
│   ├── ForeignWorkersPage.tsx
│   ├── FilesManagerPage.tsx
│   ├── PermissionsPage.tsx
│   ├── UsersPage.tsx
│   ├── SettingsPage.tsx
│   ├── [feature]Page.tsx             # One page per major feature
│   └── ComponentSimulatorPage.tsx    # Dev utility
│
├── services/                        # Global services (extend BaseService)
│   ├── base.service.ts              # Abstract base class with CRUD, pagination, logging
│   ├── auth.service.ts              # Authentication & session management
│   ├── client.service.ts            # Client CRUD & validation
│   ├── user.service.ts              # User management
│   ├── permissions.service.ts       # Role-based permissions
│   ├── email.service.ts             # Email sending via SendGrid
│   ├── file-upload.service.ts       # Supabase Storage file handling
│   ├── collection.service.ts        # Collection workflow
│   ├── payment*.service.ts           # 5+ payment-related services
│   ├── letter*.service.ts            # Letter generation & management
│   ├── foreign-worker.service.ts    # Foreign worker operations
│   ├── capital-declaration*.service.ts
│   ├── [entity].service.ts           # One service per entity type
│   └── [entity].aggregation.test.ts  # Business logic tests
│
├── contexts/                        # React Context providers
│   ├── AuthContext.tsx              # Authentication state & user metadata
│   └── MonthRangeContext.tsx         # Month range picker state
│
├── hooks/                           # Custom React hooks
│   ├── useAuth.ts                   # Access AuthContext
│   ├── useClients.ts                # Fetch clients with caching
│   ├── usePermissions.ts            # Check user role/permissions
│   ├── useUsers.ts                  # Fetch users
│   ├── usePdfSignature.ts           # PDF signing logic
│   ├── useFileUpload.ts             # File upload handler
│   ├── useDebounce.ts               # Debounce hook
│   ├── use[Feature].ts              # Domain-specific hooks
│   └── use[Feature]*.ts
│
├── lib/                             # Shared utilities & config
│   ├── supabase.ts                  # Supabase client + getCurrentTenantId()
│   ├── utils.ts                     # General utilities (cn, formatters, etc.)
│   ├── validators.ts                # Zod schemas for shared types
│   ├── logger.ts                    # Logging utility
│   ├── formatters.ts                # Number, date, currency formatting
│   ├── payment-utils.ts             # Payment calculations
│   ├── business-rules.ts            # Payment discounts, tax calculations
│   ├── labels.ts                    # UI label mappings
│   ├── design-tokens.ts             # Tailwind colors, spacing, etc.
│   ├── letter-assets.ts             # Letter template asset URLs
│   ├── constants/
│   │   └── israeli-banks.ts         # Bank list & codes
│   └── [util].ts                    # Utility by domain
│
├── types/                           # TypeScript type definitions
│   ├── database.types.ts            # Generated from Supabase (do not edit)
│   ├── supabase.ts                  # Generated Supabase schema types
│   ├── [feature].types.ts           # Domain-specific types (auto-letters, collection, etc.)
│   ├── [entity].types.ts            # Entity types (capital-declaration, foreign-workers, etc.)
│   ├── payment.types.ts
│   ├── user-role.ts                 # User roles enum
│   └── file-attachment.types.ts
│
├── contexts/                        # React Context (see above)
├── styles/                          # Global CSS
│   └── globals.css
├── assets/                          # Images, icons, fonts
│   └── [asset].[ext]
└── data/                            # Static data (rarely used)
```

## Directory Purposes

**src/components/:**
- Purpose: Shared, reusable UI components used across multiple features
- Contains: Button, Dialog, Input (shadcn/ui), auth forms, layout wrappers
- Rule: Components here should NOT be feature-specific (e.g., no `ClientBalanceBadge` - belongs in module)
- Import pattern: `import { Button } from '@/components/ui/button'`

**src/modules/:**
- Purpose: Self-contained feature modules with all their code
- Contains: Components, services, stores, types, pages specific to one feature
- Rule: Each module is independently deployable and testable
- Example: `/annual-balance/` has 14 components + service + store + types
- Import pattern: `import { ClientBalanceBadge } from '@/modules/annual-balance'` (via index.ts)

**src/pages/:**
- Purpose: Route handlers - one file per major app page
- Contains: Page-level components, route setup, minimal logic
- Rule: Pages are lazy-loaded by App.tsx, never import other pages
- Pattern: `const Page = lazy(() => import('@/pages/XyzPage'))` in App.tsx

**src/services/:**
- Purpose: Global domain services extending BaseService
- Contains: Client, User, Auth, Email, File, Payment, Letter services
- Rule: All services must `getTenantId()` and filter by tenant
- Pattern: `class ClientService extends BaseService { ... }`

**src/hooks/:**
- Purpose: Custom React hooks for data fetching and state
- Contains: `useAuth()`, `useClients()`, `usePermissions()`
- Rule: Hooks should encapsulate service calls + loading/error states
- Pattern: `const { data, loading, error } = useClients()`

**src/lib/:**
- Purpose: Utility functions, formatters, constants, validators
- Contains: Supabase client singleton, Zod schemas, business rules
- Rule: All pure functions, no side effects (except logger)
- Exports: `supabase`, `formatCurrency()`, `validateTaxId()`, `PAYMENT_DISCOUNTS`

**src/types/:**
- Purpose: TypeScript definitions for entities and domains
- Contains: Auto-generated Supabase types, custom DTOs, enums
- Rule: `database.types.ts` is auto-generated (do not edit)
- Pattern: Domain types like `AnnualBalanceSheet`, `Collection`, `PaymentMethod`

**src/contexts/:**
- Purpose: Global React Context for cross-app state
- Contains: Authentication user/role, month range filter
- Rule: Minimal state here - use Zustand stores for feature state

**src/assets/:**
- Purpose: Static images, icons, fonts
- Rule: Use `next/image` equivalent optimization when possible

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React root - loads App.tsx and Sonner toaster
- `src/App.tsx`: Router - defines all routes and lazy loads pages
- `src/vite-env.d.ts`: Vite type definitions
- `vite.config.ts`: Build configuration, path aliases

**Configuration:**
- `.env.local`: Environment variables (Supabase URL, keys)
- `components.json`: shadcn/ui config
- `eslint.config.js`: Linting rules
- `tailwind.config.ts`: Tailwind customization
- `tsconfig.json`: TypeScript strict mode settings

**Core Logic:**
- `src/services/base.service.ts`: Abstract service class - all services extend this
- `src/lib/supabase.ts`: Supabase client + tenant helpers
- `src/contexts/AuthContext.tsx`: Auth provider - wraps entire app
- `src/components/layout/MainLayout.tsx`: Sidebar navigation + outlet

**Database & Types:**
- `src/types/database.types.ts`: Generated from Supabase (220KB) - DO NOT EDIT
- `src/types/supabase.ts`: Type utilities from Supabase CLI
- `supabase/migrations/`: SQL migrations (numbered sequence)
- `supabase/functions/`: Edge Functions (PDF generation, webhooks)

**Testing & Examples:**
- `src/services/group-fee.aggregation.test.ts`: Example business logic test
- `src/pages/ComponentSimulatorPage.tsx`: UI component testing page
- `src/modules/*/store/*.ts`: Zustand store examples

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `ClientBalanceBadge.tsx`)
- Services: `kebab-case.service.ts` (e.g., `annual-balance.service.ts`)
- Stores: `camelCase.ts` (e.g., `annualBalanceStore.ts`)
- Types: `kebab-case.types.ts` (e.g., `annual-balance.types.ts`)
- Pages: `PascalCase.tsx` (e.g., `DashboardPage.tsx`)
- Utilities: `kebab-case.ts` (e.g., `business-rules.ts`)
- CSS: `index.css` or `globals.css`

**Directories:**
- Feature modules: `kebab-case` (e.g., `annual-balance`, `client-profile`)
- Shared components: `kebab-case` (e.g., `auto-letters`, `foreign-workers`)
- Utilities: `lib/` for all utility modules

**Functions & Variables:**
- Functions: `camelCase` (e.g., `getTenantId()`, `formatCurrency()`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `PAYMENT_DISCOUNTS`, `DEFAULT_PAGE_SIZE`)
- Component props: `camelCase` (e.g., `className`, `onSuccess`)
- Types: `PascalCase` (e.g., `AnnualBalanceSheet`, `ServiceResponse<T>`)

## Where to Add New Code

**New Feature (major functionality):**
1. Create module directory: `src/modules/[feature-name]/`
2. Add subdirectories:
   - `components/` - Feature UI components
   - `services/` - Business logic service class extending `BaseService`
   - `store/` - Zustand store for this feature
   - `types/` - TypeScript definitions
   - `pages/` - Route page components
3. Create `index.ts` barrel file to control public API
4. Create route page: `src/pages/[Feature]Page.tsx` that imports from module
5. Add route to `src/App.tsx` lazy loading

**Example: Adding "Reports" module**
```
src/modules/reports/
├── components/
│   ├── ReportCard.tsx
│   ├── ReportFilters.tsx
│   └── ReportTable.tsx
├── services/
│   └── reports.service.ts          # extends BaseService
├── store/
│   └── reportsStore.ts             # Zustand store
├── types/
│   └── reports.types.ts
├── pages/
│   └── ReportsPage.tsx
└── index.ts                        # export public API

src/pages/ReportsPage.tsx           # lazy load route
src/App.tsx                          # add route
```

**New Component (within existing feature):**
1. Add to appropriate component directory (module-specific or shared)
2. Use PascalCase filename with `.tsx` extension
3. If component is feature-specific: Add to `src/modules/[feature]/components/`
4. If component is reusable: Add to `src/components/[category]/`

**New Service Method (existing entity):**
1. Open `src/services/[entity].service.ts`
2. Add method extending `BaseService` pattern:
   ```typescript
   async methodName(id: string): Promise<ServiceResponse<Type>> {
     try {
       const tenantId = await this.getTenantId();
       // Query with tenant_id filter
       if (error) return { data: null, error: this.handleError(error) };
       await this.logAction('METHOD_NAME', id);
       return { data: result, error: null };
     } catch (error) {
       return { data: null, error: this.handleError(error) };
     }
   }
   ```
3. Export from service class
4. Create hook wrapper in `src/hooks/` if frequently used

**Utility Function:**
1. Create in `src/lib/[category].ts` (e.g., `formatters.ts`)
2. Pure function (no side effects)
3. Export: `export function myUtil(...): ReturnType { ... }`
4. Import: `import { myUtil } from '@/lib/formatters'`

**Zod Validator:**
1. Add to `src/lib/validators.ts` (shared) or `src/modules/[feature]/types/validation.ts` (feature-specific)
2. Pattern: `export const MySchema = z.object({ ... })`
3. Import in service: `const result = MySchema.parse(data)`

## Special Directories

**src/modules/[feature]/:**
- Purpose: Self-contained feature
- Generated: No (manually created)
- Committed: Yes
- Internal structure: Always includes components/, services/, types/, store/, pages/
- Exports: Via index.ts barrel file

**src/types/:**
- Purpose: Type definitions
- Generated: `database.types.ts` is auto-generated from Supabase CLI (`npm run generate-types`)
- Committed: All files committed (including generated types)
- DO NOT EDIT: `database.types.ts` - regenerate with `npm run generate-types` after schema changes

**templates/:**
- Purpose: Letter email templates (source of truth)
- Generated: No (manually created/edited)
- Committed: Yes
- Auto-synced: On `npm run dev`, contents synced to `public/templates/`
- Structure:
  - `templates/components/` - HTML header, footer, payment section
  - `templates/bodies/` - 11 letter type bodies

**supabase/migrations/:**
- Purpose: SQL migrations (database schema)
- Generated: No (manually created)
- Committed: Yes
- Pattern: Numbered sequence (001.sql, 002.sql, etc.)
- Applied by: Supabase CLI on deploy

**supabase/functions/:**
- Purpose: Serverless functions (Edge Functions)
- Generated: No (manually created)
- Committed: Yes
- Deployed via: `npm run deploy-pdf-function` or `SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy <name>`

**public/templates/:**
- Purpose: Built letter templates (auto-generated)
- Generated: Yes - synced from `templates/` on dev/build
- Committed: No (in .gitignore)
- Files are served at runtime for email generation

**dist/:**
- Purpose: Production build output
- Generated: Yes - `npm run build`
- Committed: No (in .gitignore)
- Contains: Minified JS, CSS, assets

---

*Structure analysis: 2026-02-09*
