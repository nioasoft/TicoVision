# 📊 COMPREHENSIVE CODE AUDIT REPORT - TicoVision

## Executive Summary

**Overall Health Grade**: 7.2/10
- **Security**: 7/10 - Good foundation with identified vulnerabilities
- **Maintainability**: 7.5/10 - Well-structured with room for improvement
- **Performance**: 7/10 - Optimizations present but opportunities remain

**Critical Finding**: This is a **React + Vite + Supabase** project, **NOT Next.js** as mentioned in your audit request. All findings below are based on actual stack.

---

## 🔴 Security Findings

### Critical Issues

### 1. Webhook Signature Validation Missing (HIGH)
- **File**: `supabase/functions/cardcom-webhook/index.ts:347-354`
- **Issue**: `validateWebhook()` only checks terminal number match, not cryptographic signature
```typescript
validateWebhookSignature(data: CardcomWebhookData, signature: string): boolean {
  // TODO: Implement proper signature validation
  return data.terminalnumber === this.config.terminalNumber;
}
```
- **Risk**: Attackers can forge webhooks by matching terminal number
- **OWASP**: ID: CWE-347 (Improper Verification of Cryptographic Signature)
- **Recommendation**: Implement HMAC signature verification using Cardcom's signing key

### 2. Excessive SECURITY DEFINER Usage (HIGH)
- **Files**: 100+ occurrences across migrations
- **Issue**: Functions using `SECURITY DEFINER` without proper `search_path` restrictions
- **Examples**:
  - `061_fix_security_definer_search_paths.sql`
  - `116_fix_rls_security_issues.sql` (notes search_path issues)
  - `135_secure_registration_password.sql`
  - `136_client_branches.sql` (multiple functions)
- **Risk**: Potential privilege escalation, SQL injection via search_path manipulation
- **Fix Required**: All SECURITY DEFINER functions must use explicit `SET search_path = public`
```sql
CREATE OR REPLACE FUNCTION example_func()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Function body
$$;
```

### 3. CORS Configuration Too Permissive (MEDIUM)
- **File**: `supabase/functions/send-letter/index.ts:56-62`
```typescript
const ALLOWED_ORIGINS = [
  'https://ticovision.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  Deno.env.get('APP_URL'), // Dynamic origin
];
```
- **Risk**: Dynamic origin without validation allows any origin if APP_URL is compromised
- **Recommendation**: Strict whitelist only, validate against known origins

### Medium Issues

### 4. XSS Vulnerabilities (MEDIUM)
- **Files**: 10+ components use `dangerouslySetInnerHTML`:
  - `LetterViewDialog.tsx`
  - `LetterPreviewDialog.tsx`
  - `UniversalLetterBuilder.tsx`
  - `ComponentSimulator.tsx`
- **Issue**: User-generated content rendered without sanitization
- **Example**: `LetterViewDialog.tsx` displays `generated_content_html` directly
```typescript
<div dangerouslySetInnerHTML={{ __html: letter.generated_content_html }} />
```
- **Mitigation**: `isomorphic-dompurify` is in dependencies but not used in these components
- **Recommendation**: Sanitize all HTML before rendering
```typescript
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
```

### 5. Missing Rate Limiting (MEDIUM)
- **Edge Functions**: No rate limiting on:
  - `/cardcom-webhook` (payment processing)
  - `/send-letter` (email sending)
  - `/track-payment-selection`
- **Risk**: Abuse, DoS attacks, spam, payment webhook replay attacks
- **Recommendation**: Implement Supabase Edge Functions rate limiting using Deno KV or Redis
```typescript
// Example rate limiting middleware
const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 6. SQL Injection Risk in Dynamic Queries (MEDIUM)
- **File**: `src/services/base.service.ts:106-122`
```typescript
protected buildFilterQuery<T = unknown>(
  query: QueryBuilder<T>,
  filters: FilterParams
): QueryBuilder<T> {
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === 'string' && value.includes('%')) {
      query = query.ilike(key, value); // User-controlled input
    }
  });
}
```
- **Risk**: If filters come from URL params, potential for injection patterns like `%` wildcards
- **Recommendation**: Validate and sanitize filter inputs

### 7. Session Management Issues (LOW-MEDIUM)
- **File**: `src/contexts/AuthContext.tsx:11-18`
- **Issue**: Manual localStorage manipulation for session cleanup
```typescript
const clearSupabaseSession = () => {
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      localStorage.removeItem(key);
    }
  });
};
```
- **Risk**: Session hijacking if XSS occurs, manual cleanup can miss tokens
- **Recommendation**: Rely on Supabase's built-in session management

### Low Issues

### 8. Error Messages Expose Sensitive Info (LOW)
- **File**: `supabase/functions/send-letter/index.ts:1491-1508`
- **Issue**: Stack traces and internal error details returned in error responses
```typescript
return new Response(JSON.stringify({
  error: error instanceof Error ? error.message : 'Unknown error',
  type: error instanceof Error ? error.constructor.name : typeof error
}));
```
- **Risk**: Information disclosure, helps attackers understand system internals
- **Recommendation**: Log details server-side, return generic messages to client

### 9. Missing CSP Headers (LOW)
- **Vite Config**: No Content Security Policy defined
- **Risk**: CSP mitigates XSS but missing completely
- **Recommendation**: Add CSP headers in Vite config or via reverse proxy
```javascript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    }
  }
})
```

---

## 🏗️ Architectural Review

### Structure Analysis

**Positive**:
- ✅ Clear separation: `services/`, `modules/`, `components/`, `hooks/`
- ✅ Service layer pattern with `BaseService` abstraction
- ✅ Multi-tenant architecture properly implemented
- ✅ Module-based organization (`letters`, `collections`, `documents`, `tico-tickets`)
- ✅ Type safety with strict TypeScript
- ✅ Comprehensive audit logging

**Negative**:
- ❌ Duplicate module directories: `letters` vs `letters_backup` (complete duplication)
- ❌ Mixed concerns: Some services have UI logic
- ❌ No clear domain layer: Business logic scattered
- ❌ Inconsistent patterns across services

### Issues

### 1. Code Duplication - Critical (HIGH)
- **Duplicate Modules**:
  - `modules/letters/` (active)
  - `modules/letters_backup/` (full duplicate)
- **Estimated Duplicate Code**: ~2,000+ lines
- **Maintenance Burden**: Changes must be made in both places
- **Recommendation**: Remove `letters_backup` or consolidate into single module

### 2. Service Layer Inconsistency (MEDIUM)
- **Inheritance Pattern**: Some extend `BaseService`, some don't
- **Examples**:
  - `client.service.ts` ✅ extends `BaseService`
  - `cardcom.service.ts` ❌ standalone class
  - `email.service.ts` ❌ standalone functions
- **Impact**: Inconsistent error handling, logging, tenant isolation
- **Recommendation**: All services should extend `BaseService` or follow consistent pattern

### 3. Context Overuse (MEDIUM)
- **Files**: Only 2 context files (AuthContext, MonthRangeContext)
- **State Management**: Zustand installed but underutilized
- **Issue**: Some components lift state unnecessarily, causing prop drilling
- **Recommendation**: Use Zustand stores for complex state

### 4. Type Safety Gaps (MEDIUM)
- **Usage of `any`**: Found in 15+ locations despite project strict rule
- **Examples**:
  - `send-letter/index.ts:35`: `subjectLines?: any[]`
  - `send-letter/index.ts:497`: `sortedLines.map((line: any, ...)`
- **Database Types**: Auto-generated but not consistently used
- **Recommendation**: Replace all `any` with proper types

### 5. Missing API Layer (LOW)
- **Direct Supabase Calls**: Components call `supabase` directly in places
- **Example**: `LetterViewDialog.tsx:69-73`
```typescript
const { data, error } = await supabase
  .from('generated_letters')
  .select('*')
  .eq('id', letterId)
  .single();
```
- **Recommendation**: All data access through services

---

## 💻 Code Quality & Redundancy

### Naming & Convention Issues

### 1. Inconsistent Naming
- Files: `fee.service.ts` vs `fee-tracking.service.ts`
- Functions: `getAll()`, `getById()`, `fetchClient()`, `loadLetter()`
- **Recommendation**: Standardize on `get/create/update/delete` prefix

### 2. Magic Numbers
- **File**: `src/services/cardcom.service.ts:87-91`
```typescript
ISOCoinId: request.currency === 'USD' ? 2 : 1, // Magic numbers
```
- **Recommendation**: Define constants
```typescript
const COIN_IDS = {
  ILS: 1,
  USD: 2
} as const;
```

### 3. Dead Code
- **File**: `src/App.tsx:354-363`
- Routes marked "Under Construction" but code exists:
  - `/tax-advances-2026`
  - `/follow-ups`
- **Impact**: Unmaintained code, technical debt
- **Recommendation**: Remove or properly stub

### Code Smells

### 1. Long Functions (HIGH)
- `supabase/functions/send-letter/index.ts:1123-1511` (388 lines)
- `src/services/auth.service.ts:112-137` (multiple 50+ line functions)
- `src/services/cardcom.service.ts:97-181` (85 lines)
- **Complexity**: High cyclomatic complexity
- **Recommendation**: Break down into smaller, focused functions (<50 lines)

### 2. Deep Nesting (MEDIUM)
- **Example**: `cardcom-webhook/index.ts:260-449`
- Nesting: 6+ levels deep
- **Impact**: Difficult to read, test, maintain
- **Recommendation**: Use early returns, extract functions

### 3. Parameter Bloat (MEDIUM)
- **Function**: `send-letter/index.ts:1123` `serve()` handler
- **Parameters**: 15+ destructured from request
- **Example**: `feeCalculationId`, `groupCalculationId`, `letterId`, `clientId`, `isHtml`, `simpleMode`, etc.
- **Recommendation**: Create request DTO/interface

### 4. Inconsistent Error Handling
- **Pattern A**: Service layer - `ServiceResponse<T>` with data/error
- **Pattern B**: Edge functions - throw/catch
- **Pattern C**: Components - try/catch with toast
- **Impact**: Developer confusion, inconsistent user experience
- **Recommendation**: Standardize on one pattern

---

## ⚡ Performance Bottlenecks

### Bundle & Build

### 1. Large Bundle Size (HIGH)
- **Dependencies**:
  - `@tiptap/*` (12 packages, heavy rich text editor)
  - `recharts` (for charts)
  - `react-pdf` (PDF rendering)
  - `pdf-lib` + `pdfjs-dist` (duplicate PDF libraries)
- **Splitting**: Manual chunks defined but not optimal
- **Estimated Initial Load**: ~2MB+ (before optimization)
- **Recommendation**:
  - Use code splitting more aggressively
  - Lazy load heavy libraries
  - Consider lighter alternatives for PDF

### 2. Code Splitting Issues (MEDIUM)
- **File**: `src/App.tsx`
- **Issue**: All routes lazy-loaded but no priority/prefetching
- **Impact**: Slow route transitions
- **Recommendation**: Prefetch on hover or idle time

### 3. Image Optimization (MEDIUM)
- **No Image Optimization**: Vite config doesn't include image plugin
- **Direct Storage Links**: Images fetched from Supabase storage unoptimized
- **Recommendation**: Use Vite image plugin or CDN

### Runtime Performance

### 4. N+1 Query Problem (HIGH)
- **File**: `src/hooks/usePermissions.ts:52-57`
```typescript
const [permResult, superAdminResult] = await Promise.all([
  permissionsService.getRolePermissions(role),
  authService.isSuperAdmin(),
]);
```
- **Issue**: Multiple sequential queries in components
- **Example**: Client list page loads client → contacts → permissions (3+ round trips)
- **Recommendation**: Batch queries or use database joins

### 5. Missing Query Caching (HIGH)
- **Supabase Client**: No query caching configured
- **Re-fetches**: Same data requested multiple times across components
- **Impact**: Unnecessary network calls, slow UI
- **Recommendation**: Implement React Query or Supabase caching
```typescript
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['client', id],
  queryFn: () => clientService.getById(id)
});
```

### 6. Unnecessary Re-renders (MEDIUM)
- **Context Updates**: AuthContext triggers all consumers on any change
- **Memoization**: Limited use of `useMemo`, `useCallback`
- **Example**: `usePermissions.ts` recalculates on every render
- **Recommendation**: Memoize expensive computations, split contexts

### 7. Database Query Issues (MEDIUM)
- **ILIKE Queries**: Used for search (case-insensitive, slower)
- **File**: `src/services/base.service.ts:113`
```typescript
query = query.ilike(key, value); // Full scan
```
- **Missing Indexes**: Some search fields lack indexes (mentioned in migration 124)
- **Recommendation**:
  - Use `LIKE` with proper indexing
  - Add full-text search indexes
  - Consider PostgreSQL `pg_trgm` extension

### 8. Large Response Payloads (MEDIUM)
- **Views**: `collection_view` returns 40+ columns
- **Usage**: Not all columns needed in UI
- **Impact**: Network + memory overhead
- **Recommendation**: Create smaller, purpose-specific views

---

## 📈 Final Scores

| Category | Score | Details |
|----------|-------|---------|
| **Security** | 7/10 | ✅ RLS, JWT auth, multi-tenant isolation<br>❌ Webhook validation, XSS vulnerabilities, excessive SECURITY DEFINER |
| **Maintainability** | 7.5/10 | ✅ Service layer, module structure, TypeScript<br>❌ Code duplication, inconsistent patterns, long functions |
| **Performance** | 7/10 | ✅ Lazy loading, chunking, pagination<br>❌ N+1 queries, missing caching, large bundle |
| **Code Quality** | 7/10 | ✅ TypeScript, ESLint, Prettier<br>❌ Long functions, deep nesting, `any` types |

---

## 🎯 Priority Recommendations

### Immediate (Critical)
1. ✅ Fix webhook signature validation
2. ✅ Secure all SECURITY DEFINER functions with explicit search_path
3. ✅ Implement XSS sanitization (DOMPurify) in all components using innerHTML
4. ✅ Remove or consolidate `letters_backup` module

### High Priority
1. ✅ Implement query caching (React Query / @tanstack/react-query)
2. ✅ Add rate limiting to edge functions
3. ✅ Fix N+1 query problems with batching/joins
4. ✅ Reduce bundle size (remove duplicate PDF libs, lazy load heavy deps)

### Medium Priority
1. ✅ Standardize error handling patterns
2. ✅ Refactor long functions (>50 lines)
3. ✅ Implement comprehensive CSP headers
4. ✅ Add performance monitoring (Sentry configured but verify)

### Low Priority
1. ✅ Remove dead code (Under Construction routes)
2. ✅ Standardize naming conventions
3. ✅ Add end-to-end tests (Playwright installed but no tests found)
4. ✅ Replace `any` types with proper TypeScript types

---

## 📊 Statistics

- **Total Lines of Code**: 133,136
- **Total Files**: 414 TypeScript/TSX files
- **Service Files**: 40+
- **Components**: 32+ shadcn/ui + 60+ custom
- **Migrations**: 177 SQL migrations
- **Edge Functions**: 15 deployed
- **SECURITY DEFINER Functions**: 100+ occurrences

---

## 🔧 Technical Stack (Verified)

- **Frontend**: React 19.1.1 + Vite 7.1.2 + TypeScript 5.8.3
- **UI Library**: shadcn/ui + Radix UI + Tailwind CSS 4.1.13
- **State Management**: Zustand 5.0.8
- **Backend**: Supabase (PostgreSQL + RLS + Auth + Edge Functions)
- **Payments**: Cardcom (Israeli payment gateway)
- **Email**: SendGrid
- **Build Tool**: Vite (NOT Next.js)
- **Routing**: React Router DOM 7.8.2

---

## 📝 Appendix: Detailed File Analysis

### Security Critical Files
1. `supabase/functions/cardcom-webhook/index.ts` - Payment processing, needs signature validation
2. `supabase/functions/send-letter/index.ts` - Email sending, XSS risk
3. `src/contexts/AuthContext.tsx` - Session management, manual token cleanup
4. `src/services/base.service.ts` - SQL injection risk in filter queries

### Performance Critical Files
1. `src/App.tsx` - Route lazy loading, no prefetching
2. `src/hooks/usePermissions.ts` - Multiple sequential queries
3. `src/services/cardcom.service.ts` - No caching, direct API calls
4. `vite.config.ts` - Bundle optimization incomplete

### Code Quality Issues
1. `modules/letters_backup/` - Complete duplicate of letters module
2. `src/services/auth.service.ts` - Long functions, mixed concerns
3. `src/modules/letters/components/LetterViewDialog.tsx` - XSS vulnerability

---

**Audit Completed**: January 12, 2026
**Audited By**: Security & Architecture Analysis
**Scope**: Full codebase scan excluding `node_modules` and build artifacts
**Methodology**: Static analysis, pattern matching, security best practices review

---

*This report provides actionable findings for improving the security, maintainability, and performance of the TicoVision codebase.*
