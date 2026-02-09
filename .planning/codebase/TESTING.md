# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Runner:**
- Vitest (implied from test file imports)
- Config: Not detected in project root, likely default Vite testing config

**Assertion Library:**
- Vitest built-in assertions: `expect()`, `toBe()`, `toEqual()`, `toBeNull()`, etc.

**Run Commands:**
```bash
npm run typecheck              # TypeScript type checking (uses tsc)
npm run lint                   # ESLint code quality
npm run pre-commit             # lint + typecheck (runs before commits)
# Note: No explicit test/vitest scripts in package.json
```

**Current State:**
- Only 1 test file found: `src/services/group-fee.aggregation.test.ts`
- Testing infrastructure exists (vitest imported) but not widely adopted
- No test coverage tooling configured or visible
- Tests are optional, not required for pre-commit

## Test File Organization

**Location:**
- Co-located with implementation: `.test.ts` or `.spec.ts` suffix
- Example: `src/services/group-fee.aggregation.test.ts` alongside service logic
- Pattern: `[filename].test.ts` (not separated into `__tests__/` directories)

**Naming:**
- Describe blocks: `describe('Feature name', () => { ... })`
- Test cases: `it('should do specific behavior', async () => { ... })`
- Descriptive titles explaining what is being tested

**Structure:**
```
describe('Group Fee Aggregation Logic', () => {
  const mockTenantId = 'tenant-123';
  const mockGroupId = 'group-abc';
  const mockYear = 2025;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup for each test
  });

  it('should calculate weighted discount correctly from individual clients', async () => {
    // Arrange: setup test data
    // Act: execute function
    // Assert: verify results
  });

  it('should fallback to previous_year_discount if discount_percentage is missing', async () => {
    // Test data and assertions
  });
});
```

## Test Structure

**Suite Organization:**
From `src/services/group-fee.aggregation.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupFeeService } from './group-fee.service';
import { supabase } from '@/lib/supabase';

// Mock Supabase client at module level
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  },
}));

describe('Group Fee Aggregation Logic', () => {
  // Test variables
  const mockTenantId = 'tenant-123';

  // Setup/cleanup
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(groupFeeService as any, 'getTenantId')
      .mockResolvedValue(mockTenantId);
  });

  it('should calculate...', async () => {
    // Test implementation
  });
});
```

**Patterns Observed:**

1. **Mocking:**
   - Module-level mocks: `vi.mock('@/lib/supabase', () => ({ ... }))`
   - Spy mocks: `vi.spyOn(service, 'method').mockResolvedValue(...)`
   - Function mocks: `vi.fn().mockReturnValue(...)`
   - Return value mocks: `.mockResolvedValue({ data, error })`

2. **Async testing:**
   - Async test functions: `it('...', async () => { ... })`
   - Await mocked promises: `await service.method()`
   - No explicit done callbacks needed (Vitest handles async)

3. **Assertions:**
   - `.toBeNull()` - verify no error
   - `.toBeDefined()` - verify data exists
   - `.toBe(value)` - strict equality for primitives
   - `.toEqual(value)` - deep equality for objects/arrays

4. **Setup/Teardown:**
   - `beforeEach()` - runs before each test
   - `vi.clearAllMocks()` - reset mock call counts
   - No explicit `afterEach()` shown (likely not needed for unit tests)

## Mocking

**Framework:** Vitest with `vi` object

**Patterns:**

**Mocking Supabase client:**
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
  },
}));
```

**Mocking service methods:**
```typescript
vi.spyOn(groupFeeService as any, 'getTenantId')
  .mockResolvedValue(mockTenantId);
```

**Chaining mocks for query builders:**
```typescript
const selectClients = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: mockClients, error: null })
  })
});

(supabase.from as any).mockImplementation((table: string) => {
  if (table === 'clients') return { select: selectClients };
  return { select: vi.fn() };
});
```

**What to Mock:**
- External dependencies: Supabase, email services, APIs
- Database calls: all `.from()`, `.select()`, `.insert()` chains
- Authentication: `supabase.auth.getUser()`
- Service methods that return promises

**What NOT to Mock:**
- Pure utility functions: validators, formatters
- Custom hooks without side effects
- Zod validation (test it directly)
- Logger (can be mocked if spam is an issue)
- Local state management (Zustand - mock only if needed)

## Fixtures and Factories

**Test Data:**
From `group-fee.aggregation.test.ts`, test data is created inline:
```typescript
const mockClients = [{ id: 'client-1' }, { id: 'client-2' }];
const mockFees = [
  {
    base_amount: 1000,
    discount_percentage: 10,
    discount_amount: 100,
    final_amount: 900,
    vat_amount: 162,
    total_amount: 1062,
    previous_year_discount: 10
  },
  // More mock data
];
```

**Location:**
- Currently no shared fixture files found
- Pattern to adopt: Create `src/__fixtures__/` or `src/[module]/__mocks__/` for reusable test data
- Recommended for future expansion

**Data creation approach:**
- Use builder pattern for complex objects:
  ```typescript
  const createMockClient = (overrides?: Partial<Client>): Client => ({
    id: 'test-id',
    tenant_id: 'tenant-1',
    company_name: 'Test Company',
    // ... defaults
    ...overrides
  });
  ```

## Coverage

**Requirements:** No explicit coverage requirements configured

**View Coverage:**
- No npm script provided for coverage reporting
- Would need to add: `vitest --coverage` (requires `@vitest/coverage-v8`)

**Current state:**
- Coverage not measured or enforced
- Only 1 test file in entire codebase
- No CI/CD test gate visible

**Recommendation if coverage tracking added:**
- Minimum target: 70% for critical services (auth, payments, billing)
- 50% for UI components (difficult to test in React)
- 0% enforcement for now (adopt gradually)

## Test Types

**Unit Tests:**
- Scope: Single function/method in isolation
- Approach: Mock all external dependencies (Supabase, services)
- Example: `group-fee.aggregation.test.ts` tests `getAggregatedGroupData()`
- Assertion count: Typically 3-5 assertions per test

**Integration Tests:**
- Scope: Service method + database query without full Supabase
- Not found in codebase yet
- Would test: Service + mocked Supabase responses in realistic scenarios
- Approach: Mock Supabase at module level, test business logic flow

**E2E Tests:**
- Framework: Not used
- Would test: Full user workflows in browser
- Not applicable to service layer testing
- Could use Playwright/Cypress for UI if added

**Current focus:**
- Only unit tests of service logic
- No integration or E2E testing infrastructure

## Common Patterns

**Async Testing:**
```typescript
it('should calculate weighted discount correctly', async () => {
  // Setup mocks
  const selectClients = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockClients, error: null })
    })
  });

  (supabase.from as any).mockImplementation((table: string) => {
    if (table === 'clients') return { select: selectClients };
    if (table === 'fee_calculations') return { select: selectFees };
    return { select: vi.fn() };
  });

  // Execute
  const result = await groupFeeService.getAggregatedGroupData(mockGroupId, mockYear);

  // Assert
  expect(result.error).toBeNull();
  expect(result.data?.base_amount).toBe(3000);
});
```

**Error Testing:**
- Test both success and error paths
- ServiceResponse pattern makes this natural:
  ```typescript
  // Success case
  expect(result.error).toBeNull();
  expect(result.data).toBeDefined();

  // Error case (would need separate test)
  // Mock supabase to return error
  // expect(result.error).not.toBeNull();
  // expect(result.data).toBeNull();
  ```

**Fallback/Edge Cases:**
Example from `group-fee.aggregation.test.ts`:
```typescript
it('should fallback to previous_year_discount if discount_percentage is missing', async () => {
  // Mock with missing discount_percentage field
  const mockFees = [{
    base_amount: 1000,
    discount_percentage: 0,      // Missing current discount
    discount_amount: 0,
    previous_year_discount: 20   // But has previous year fallback
  }];

  // Execute and assert fallback behavior
  const result = await groupFeeService.getAggregatedGroupData(...);
  expect(result.data?.discount_amount).toBe(200);
});
```

**Mock data validation:**
- Test data commented with expected calculations
```typescript
const mockFees = [
  {
    // Client 1: 1000 base, 10% discount
    base_amount: 1000,
    discount_percentage: 10,
    discount_amount: 100,
    final_amount: 900,
  },
];
// Expected Totals:
// Base: 1000 + 2000 = 3000
// Discount: 200
```

## Testing Guidelines

**What to test:**
- Service business logic (all public methods)
- Validation schemas (parsing and error messages)
- Complex calculations (especially discount/fee logic)
- Error handling (service returns error in response)
- Edge cases (missing data, null values, empty arrays)

**What NOT to test:**
- React component rendering (no renderer used)
- UI interactions (no testing library used)
- Third-party library behavior (Supabase SDK, Zod)
- Simple getters/setters without logic

**Best practices observed:**
1. Mock external dependencies at module level
2. Use `vi.clearAllMocks()` in `beforeEach()`
3. Test actual business logic, not just happy path
4. Include edge cases (fallbacks, missing data)
5. Comment expected values in assertions
6. Descriptive test names that explain the scenario

**Before adding tests to codebase:**
- Ensure vitest is properly configured in `vite.config.ts` or `vitest.config.ts`
- Add test script to `package.json`: `"test": "vitest"`
- Follow module-level mocking pattern for Supabase
- Keep mocks minimal and focused
- Each test should be independent and idempotent

---

*Testing analysis: 2026-02-09*
