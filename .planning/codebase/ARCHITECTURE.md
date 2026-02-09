# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** Layered client-server architecture with feature-based module organization

**Key Characteristics:**
- Client-side SPA (React 19 + Vite) with server-side database (Supabase PostgreSQL)
- Multi-tenant isolation enforced via RLS policies and `tenant_id` filtering
- Feature modules are self-contained with services, components, stores, and types
- Zustand for client-side state management (per-module stores)
- Supabase for authentication, real-time updates, and edge functions

## Layers

**Presentation Layer (React Components):**
- Purpose: Render UI and handle user interactions
- Location: `src/components/`, `src/modules/*/components/`, `src/pages/`
- Contains: React functional components, dialogs, forms, tables, UI primitives
- Depends on: Hooks, services, stores, Zustand
- Used by: React Router routes, layouts, nested component trees

**Business Logic Layer (Services):**
- Purpose: Encapsulate database queries, external API calls, and business rules
- Location: `src/services/` (global), `src/modules/*/services/` (feature-specific)
- Contains: Service classes extending `BaseService`, CRUD operations, workflows
- Depends on: Supabase client, validators (Zod), types
- Used by: Components via hooks, Zustand stores, other services

**State Management Layer (Zustand Stores):**
- Purpose: Manage client-side UI state (filters, pagination, cached data)
- Location: `src/modules/*/store/`
- Contains: Zustand store definitions with actions and selectors
- Depends on: Services, types
- Used by: Components via hooks (e.g., `useAnnualBalanceStore`)

**Data Access Layer (Supabase + Types):**
- Purpose: Execute queries, manage authentication, provide type safety
- Location: `src/lib/supabase.ts`, `src/types/database.types.ts`, `src/types/supabase.ts`
- Contains: Supabase client singleton, RPC helpers, generated types
- Depends on: External Supabase API
- Used by: Services, authentication context

**Shared Utilities & Infrastructure:**
- Purpose: Provide cross-cutting utilities and configuration
- Location: `src/lib/` (validators, formatters, constants, logger)
- Contains: Business rules, Israeli market formatters, label mappings, design tokens
- Used by: All layers

## Data Flow

**User Login → Authenticated State:**

1. User submits credentials on `LoginPage`
2. `authService.signIn()` → Supabase Auth
3. Auth context listens to `supabase.auth.onAuthStateChange()`
4. User metadata (role, tenant_id) extracted from JWT
5. AuthContext provides user/role/tenantId to entire app
6. Protected routes check auth status and role

**Client Fetches Data:**

1. Component mounts or user action triggers data fetch
2. Component calls service method: `annualBalanceService.getAll(filters)`
3. Service calls `getTenantId()` to enforce multi-tenant isolation
4. Service constructs Supabase query with `tenant_id` filter and RLS
5. Query executes in Supabase (PostgreSQL + RLS policies)
6. Service returns `ServiceResponse<T>` with `{ data, error }`
7. Component updates local state or Zustand store

**User Updates Data (Optimistic Pattern):**

1. Component prepares data: `{ company_name: 'Acme Ltd', ...}`
2. Component immediately updates Zustand store (optimistic)
3. Component calls service: `clientService.update(id, data)`
4. Service validates with Zod, calls Supabase `update()`, logs action
5. If error: Zustand store reverts optimistic update, toast error
6. If success: Supabase RLS prevents unauthorized writes, audit logged

**Real-time Updates (WebSockets):**

1. Supabase subscriptions via `supabase.channel().on()`
2. Used in modules: broadcast, chat, collections
3. Components subscribe on mount, unsubscribe on unmount
4. Store actions triggered on remote changes

**State Management:**

**Authentication State:**
- Managed by: `AuthContext` (React Context)
- Contains: user, session, role, tenantId
- Provided to: All components via `useAuth()`

**Page/Feature State:**
- Managed by: Module-level Zustand stores (e.g., `useAnnualBalanceStore`)
- Contains: Data (cases), filters, pagination, loading/error states
- Actions: `fetchCases()`, `setFilters()`, `confirmAssignment()`, etc.
- Accessed via: `const { cases, loading } = useAnnualBalanceStore()`

**Server/Database State:**
- Single source of truth: Supabase PostgreSQL
- RLS policies enforce row-level security by tenant_id
- Services always filter by current tenant_id
- No local caching except in Zustand (transient)

## Key Abstractions

**BaseService:**
- Purpose: Provide common CRUD, pagination, error handling, audit logging
- Examples: `ClientService`, `AnnualBalanceService`, `PaymentService`
- Pattern: Services extend `BaseService`, call `getTenantId()`, return `ServiceResponse<T>`
- File: `src/services/base.service.ts`

**ServiceResponse<T>:**
- Purpose: Standardized error handling across all services
- Structure: `{ data: T | null, error: Error | null }`
- Usage: `const { data, error } = await service.getAll()`
- Replaces try/catch proliferation

**Zustand Store Actions:**
- Purpose: Encapsulate mutations and service calls
- Pattern: Actions call services, update state on success/failure
- Example: `fetchCases: async () => { ... }`, `setFilters: (filters) => { ... }`
- Provides: Loading states, error handling, pagination

**Module Barrel Files (index.ts):**
- Purpose: Control public API of feature modules
- Pattern: Export types, services, components, stores from module
- Prevents: Internal component imports from outside module
- Example: `/src/modules/annual-balance/index.ts` exports what's safe to use elsewhere

**RLS Policies:**
- Purpose: Database-level security (enforces tenant isolation)
- Pattern: All tables have `tenant_id` column, RLS policies check `current_user_id`
- Applied to: Every table insert, update, delete, select
- Fallback to: Service-level `getTenantId()` filter as defense-in-depth

## Entry Points

**Application Root:**
- Location: `src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Create React root, render App, setup Sonner toaster

**App Router:**
- Location: `src/App.tsx`
- Triggers: App component mounts
- Responsibilities: Define all routes, lazy load pages, wrap with providers (AuthProvider, ErrorBoundary)

**Pages (Lazy Loaded):**
- Location: `src/pages/*.tsx`
- Examples: `LoginPage.tsx`, `ClientsPage.tsx`, `DashboardPage.tsx`
- Responsibility: One page per route, import modules/components, manage page-level state

**Layout:**
- Location: `src/components/layout/MainLayout.tsx`
- Renders: Navigation sidebar, Outlet for page content
- Provides: Consistent layout for authenticated routes

**Auth Flow:**
- Setup Route: `http://localhost:5173/setup` → `SetupPage` (create initial admin)
- Login Route: `http://localhost:5173/login` → `LoginPage` (Supabase Auth)
- Dashboard: `http://localhost:5173/` → Protected by `ProtectedRoute`

## Error Handling

**Strategy:** Three-level error handling (database, service, component)

**Database Level (RLS):**
- RLS policies reject unauthorized queries before execution
- Supabase returns 403 Forbidden
- Service catches and converts to `Error` object

**Service Level (try/catch + validation):**
- Services validate input with Zod before sending to DB
- Services catch Supabase errors, convert to `ServiceResponse` with error
- Services log all operations via `logAction()`
- Never throw exceptions to components (always return ServiceResponse)

**Component Level (toast notifications):**
- Components check `if (result.error)` and show user-friendly toast
- Toast messages in Hebrew: `toast.error('שגיאה בשמירת הנתונים')`
- Console logging for debugging: `console.error('Failed to save:', error)`

**Pattern Example:**
```typescript
// Service - never throws
async updateClient(id: string, data: UpdateClientDto): Promise<ServiceResponse<Client>> {
  try {
    const tenantId = await this.getTenantId();
    const validation = clientSchema.parse(data);
    const { data: result, error } = await supabase
      .from('clients')
      .update(validation)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) return { data: null, error: this.handleError(error) };
    await this.logAction('UPDATE_CLIENT', id, data);
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error) };
  }
}

// Component - checks error and notifies user
const { data, error } = await clientService.updateClient(clientId, formData);
if (error) {
  toast.error('שגיאה בעדכון פרטי הלקוח');
  console.error('Update failed:', error);
  return;
}
toast.success('הלקוח עודכן בהצלחה');
```

## Cross-Cutting Concerns

**Logging:**
- Implementation: `src/lib/logger.ts` (exports `logger` object)
- Methods: `logger.info()`, `logger.error()`, `logger.warn()`, `logger.debug()`
- Usage: Async operations, error handling, debugging
- Audit logging: Service method `logAction()` inserts into `audit_logs` table

**Validation:**
- Framework: Zod v4 (schema definitions)
- Location: Service methods and component-level validation schemas
- Pattern: `const parsed = schema.parse(data)` before sending to DB
- Error messages: `.issues` property on validation errors (not `.errors`)

**Authentication:**
- Provider: Supabase Auth (JWT + session tokens)
- Context: `AuthContext` provides user, role, tenantId
- RLS: Database policies check `current_user_id` from JWT
- Service-level: `getTenantId()` adds defense-in-depth filter

**Multi-tenancy:**
- Enforcement: Every query filters by `tenant_id`
- Source: `user_metadata.tenant_id` from JWT, obtained via `supabase.auth.getUser()`
- Fallback: If missing, service throws `"No tenant ID found. User must be authenticated."`
- RLS Policies: All tables have `tenant_id` column with RLS policy

**RTL & Localization:**
- Framework: Tailwind RTL plugin + logical properties
- Direction: `dir="rtl"` on root components
- Properties: Use `ps-` (padding-start), `me-` (margin-end) instead of `pl-`, `mr-`
- Dialogs: `DialogFooter className="flex gap-2 rtl:flex-row-reverse"`
- Text: Most UI strings hardcoded in Hebrew (no i18n currently)

---

*Architecture analysis: 2026-02-09*
