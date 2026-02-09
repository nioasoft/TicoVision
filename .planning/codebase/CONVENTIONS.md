# Coding Conventions

**Analysis Date:** 2026-02-09

## Naming Patterns

**Files:**
- React components (`.tsx`): PascalCase, descriptive names
  - Example: `ClientFormDialog.tsx`, `BalanceTable.tsx`, `MarkMaterialsDialog.tsx`
- Services (`.ts`): camelCase with `.service.ts` suffix
  - Example: `client.service.ts`, `auth.service.ts`, `group-fee.service.ts`
- Stores (`.ts`): camelCase with `Store` suffix in filename
  - Example: `annualBalanceStore.ts`, `broadcastStore.ts`, `chatStore.ts`
- Types/interfaces (`.ts`): PascalCase, grouped in dedicated type files
  - Example: `src/modules/annual-balance/types/annual-balance.types.ts`
- Utilities/helpers (`.ts`): camelCase with descriptive naming
  - Example: `formatters.ts`, `validators.ts`, `logger.ts`

**Functions:**
- All functions use camelCase: `fetchCases()`, `getTenantId()`, `validateTaxId()`
- Async functions indicate purpose: `fetchData()`, `getUser()`, `saveRecord()`
- Hook functions start with `use`: `usePermissions()`, `useToast()`, `useDebounce()`
- Query builders/chainable methods: lowercase with semantic naming
  - Example: `.select()`, `.eq()`, `.order()`, `.range()`

**Variables:**
- Local variables: camelCase: `clientId`, `isLoading`, `selectedYear`
- Boolean variables: prefix with `is`, `has`, `can`: `isActive`, `hasError`, `canDelete`
- Constants: UPPER_SNAKE_CASE: `DEFAULT_PAGE_SIZE = 20`, `PAYMENT_DISCOUNTS`
- Database columns/fields: snake_case (following PostgreSQL convention)
  - Example: `tenant_id`, `created_at`, `company_name`, `group_id`

**Types:**
- Interface names: PascalCase without prefix: `Client`, `ServiceResponse`, `BalanceFilters`
- Type aliases: PascalCase: `ClientType`, `CompanyStatus`, `UserRole`
- Union types: use uppercase literals: `'active' | 'inactive' | 'pending'`
- DTO interfaces: `CreateClientDto`, `UpdateClientDto` suffix pattern
- Database row types: imported from Supabase generated types: `Tables['clients']['Row']`

## Code Style

**Formatting:**
- ESLint configured with TypeScript support (`@eslint/js`, `tseslint`)
- Vite + React 19 with server components by default
- No explicit Prettier config; ESLint enforces style
- Indentation: 2 spaces (inferred from code)
- Line length: no explicit limit enforced

**Linting:**
- ESLint config: `eslint.config.js` uses:
  - `js.configs.recommended`
  - `tseslint.configs.recommended`
  - `reactHooks.configs['recommended-latest']`
  - `reactRefresh.configs.vite`
- Key rule: NO unused parameters with `_` prefix - ESLint doesn't recognize `_` convention
  - If parameter is unused, just remove it or use it
  - Pre-commit hook: `npm run lint` must pass before commits

**TypeScript:**
- `strict: true` mode enforced in `tsconfig.app.json`
- `noUnusedLocals: true` - all variables must be used
- `noUnusedParameters: true` - all function parameters must be used
- `noImplicitAny: true` - explicit types required everywhere
- NO `any` types allowed in new code
- Target: ES2022, module: ESNext
- Path alias: `@/*` maps to `src/*`

## Import Organization

**Order:**
1. External dependencies: React, libraries from node_modules
   - Example: `import React from 'react'`
   - Example: `import { toast } from 'sonner'`
2. Supabase and lib utilities: `@/lib/*`
   - Example: `import { supabase } from '@/lib/supabase'`
   - Example: `import { logger } from '@/lib/logger'`
3. Services: `@/services/*`
   - Example: `import { clientService } from '@/services'`
4. Types and interfaces: `@/types/*` or from services
   - Example: `import type { Client, ServiceResponse } from '@/services'`
   - Example: `import type { Database } from '@/types/supabase'`
5. Components and local imports: `@/components/*`, relative imports
   - Example: `import { Button } from '@/components/ui/button'`
   - Example: `import { ClientFormDialog } from '@/components/clients/ClientFormDialog'`
6. Hooks: custom hooks from `@/hooks/*`
   - Example: `import { usePermissions } from '@/hooks/usePermissions'`

**Path Aliases:**
- Always use `@/` alias instead of relative paths
- Exception: internal module imports can use relative `../` when crossing few levels
- Example: Use `import { foo } from '@/components/bar'` not `import { foo } from '../../../components/bar'`

**Type imports:**
- Use `import type { ... }` for type-only imports
- Separate type and value imports:
  ```typescript
  import { clientService } from '@/services';
  import type { Client, ServiceResponse } from '@/services';
  ```

## Error Handling

**Pattern - ServiceResponse wrapper:**
All business logic functions return `ServiceResponse<T>`:
```typescript
interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}
```

**Service methods:**
- Always catch errors and return wrapped response
- Log errors via `logger.error()`
- Example from `client.service.ts`:
  ```typescript
  async create(data: CreateClientDto): Promise<ServiceResponse<Client>> {
    try {
      // Validation
      if (!this.validateTaxId(data.tax_id)) {
        return {
          data: null,
          error: new Error('Invalid Israeli tax ID. Must be 9 digits.')
        };
      }
      // DB operation
      const { data: result, error } = await supabase.from('clients').insert(...);
      if (error) {
        return { data: null, error: this.handleError(error) };
      }
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }
  ```

**Component error handling:**
- Components check `result.error` after service calls
- User-facing errors use Hebrew messages with `toast.error()`
- Example:
  ```typescript
  const result = await clientService.create(formData);
  if (result.error) {
    toast.error(result.error.message || 'שגיאה בשמירת לקוח');
    return;
  }
  ```

**ErrorBoundary:**
- Wrapped at route level in `src/components/ErrorBoundary.tsx`
- Catches React render errors and displays fallback UI
- Also caught by `src/components/ErrorFallback.tsx`

**Async/await vs promises:**
- Prefer async/await for readability
- Use Promise.all() for parallel operations
- Use try/catch, not .catch() chains

## Logging

**Framework:** Custom logger in `src/lib/logger.ts`

**Usage:**
- `logger.debug()` - development only
- `logger.info()` - normal operations
- `logger.warn()` - potential issues
- `logger.error(message, error, context?)` - critical issues

**Patterns:**
- Always log errors caught in catch blocks:
  ```typescript
  catch (error) {
    logger.error('Failed to load permissions:', error);
  }
  ```
- No console.log() in production code - use logger
- Sensitive data (passwords, tokens, tax IDs) automatically sanitized
- Log context as second parameter: `logger.info('User logged in', { userId, email })`

**Structured logging:**
```typescript
logger.error('Failed to save data', error, {
  clientId,
  operation: 'create',
  timestamp: new Date().toISOString()
});
```

## Comments

**When to Comment:**
- Complex business logic (especially calculations, discount logic)
- Non-obvious algorithms or workarounds
- Integration points with external APIs
- Edge cases and fallback behavior
- Example from annual-balance: detailed comments on weighted discount calculations

**JSDoc/TSDoc:**
- Used extensively in services and utilities
- Format:
  ```typescript
  /**
   * Validates Israeli Tax ID using Luhn algorithm
   * @param taxId - 9-digit tax ID string
   * @returns true if valid, false otherwise
   */
  export function validateTaxId(taxId: string): boolean {
    // Implementation
  }
  ```
- Include @param, @returns, @example for complex functions
- Applied to public service methods and exported utilities

**Inline comments:**
- Use `//` for short explanations
- Explain WHY, not WHAT (code shows what)
- Example: `// Fallback to previous year's discount if current not available`

## Function Design

**Size:**
- Functions kept small and focused (1-3 logical operations)
- Service methods: 20-50 lines typical, up to 100 for complex operations
- Components: broken into smaller sub-components if approaching 200+ lines
- Example: `ClientFormDialog.tsx` uses sub-components like `ClientBalanceTab`, `MarkMaterialsDialog`

**Parameters:**
- Maximum 3-4 parameters for regular functions
- Excess params grouped into interfaces/options objects:
  ```typescript
  // Instead of: createClient(name, email, phone, address, taxId, ...)
  // Use DTO:
  async create(data: CreateClientDto): Promise<ServiceResponse<Client>>
  ```
- Optional parameters indicated with `?` in interface
- Destructure object parameters for clarity

**Return Values:**
- Service methods: always `Promise<ServiceResponse<T>>`
- Sync utilities: return explicit types, no `any`
- React hooks: return object with methods and state: `{ data, loading, error, refresh() }`
- Example from `usePermissions()`: returns object with methods and flags

## Module Design

**Exports:**
- Services export singleton instances (not classes):
  ```typescript
  export const clientService = new ClientService('clients');
  ```
- Components export as named exports (supporting tree-shaking)
- Types exported separately for clarity
- Barrel files (index.ts) used to export public API

**Barrel Files:**
- Location: `src/services/index.ts`, `src/components/ui/index.ts`
- Purpose: centralize exports, simplify imports
- Example import via barrel: `import { clientService, feeService } from '@/services'`
- Used for UI components in `src/components/ui/`

**Service Architecture (MANDATORY):**
- All services extend `BaseService`:
  ```typescript
  export class ClientService extends BaseService {
    constructor() {
      super('clients');
    }

    async getAll(): Promise<ServiceResponse<Client[]>> {
      const tenantId = await this.getTenantId(); // REQUIRED
      // Query with tenant_id filter
    }
  }
  ```
- BaseService provides:
  - `getTenantId()` - gets tenant from JWT metadata
  - `handleError()` - wraps Supabase errors
  - `logAction()` - audit trail logging
  - `buildPaginationQuery()` - default pagination logic
- NO direct Supabase queries in components - all via services

**Directory Structure - Module Organization:**
```
src/modules/[feature-name]/
├── components/        # Feature-specific React components
├── services/          # Business logic (extends BaseService)
├── store/             # Zustand stores (if needed)
├── types/             # Feature-specific interfaces
├── pages/             # Route pages (if used)
└── utils/             # Feature-specific utilities
```
- Example: `src/modules/annual-balance/` has components, services, store, types in separate dirs
- Shared components go in `src/components/`, shared services in `src/services/`

## Validation

**Framework:** Zod v4

**Pattern:**
```typescript
export const markMaterialsSchema = z.object({
  receivedAt: z.date({ required_error: 'יש לבחור תאריך' }),
  backupLink: z.string().url('יש להזין קישור תקין'),
});

export type MarkMaterialsInput = z.infer<typeof markMaterialsSchema>;
```

**Location:** Store validation schemas in `types/validation.ts` within modules

**Error messages:** Always Hebrew (user-facing)
- Example: `'יש לבחור תאריך'` not `'Date is required'`

**Usage in components:**
```typescript
const result = schema.safeParse(formData);
if (!result.success) {
  result.error.issues.forEach(issue => {
    // Handle validation error
  });
}
```

## React Patterns

**Hooks:**
- Functional components only (no class components)
- Hooks from React 19: `useState`, `useEffect`, `useCallback`, `useRef`
- Custom hooks from `@/hooks/*`: `usePermissions()`, `useDebounce()`, `useToast()`

**State Management:**
- Component state: `useState()` for local, ephemeral state
- Global state: Zustand stores in `src/modules/[name]/store/`
- Examples: `useAnnualBalanceStore`, `useBroadcastStore`

**Styling:**
- Tailwind CSS exclusively (no inline styles)
- RTL-aware classes: `rtl:` variant for Hebrew layout
- `dir="rtl"` on dialogs and main containers
- Logical properties: `ps-4` (padding-start) not `pl-4`, `me-2` (margin-end) not `mr-2`

**Dialogs/Forms:**
- All dialogs use `dir="rtl"`
- DialogFooter: `className="flex gap-2 rtl:flex-row-reverse"`
- Input labels always Hebrew
- Required field indicators built into labels

---

*Convention analysis: 2026-02-09*
