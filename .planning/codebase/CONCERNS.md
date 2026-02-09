# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Duplicate Letter Modules:**
- Issue: `src/modules/letters_backup/` contains full duplicate copy of letter system (templates, components, services, utils) from production `src/modules/letters/`
- Files: `src/modules/letters_backup/` (6 subdirectories, ~3016 LOC in main component, ~2192 LOC in service)
- Impact: Doubles maintenance burden on letter system changes; confuses development; creates risk of diverging implementations
- Fix approach: Delete `letters_backup/` directory entirely once main letters module is verified stable. No references exist in main App.tsx

**Backup Page Files Scattered in Production:**
- Issue: 5 `.backup.tsx` files exist in `src/pages/` alongside active pages
- Files: `src/pages/UsersPage.backup.tsx`, `src/pages/ClientsPage.backup.tsx`, `src/pages/LetterHistoryPage.backup.tsx`, `src/pages/LetterTemplatesPage.backup.tsx`, `src/pages/LetterHistoryPage.backup.tsx`
- Impact: Code clutter; adds to git repo size; creates confusion about which page is current
- Fix approach: Archive to `docs/archive/` with date suffix and remove from src/ once verified equivalent functionality exists in non-backup versions

**Unused Letters Module (letters-v2):**
- Issue: `src/modules/letters-v2/` exists in codebase but is NOT routed in App.tsx; appears to be migration attempt
- Files: Multiple components (LetterBuilderV2, UniversalBuilderV2, LetterDisplayDialog) and PDFGenerationService
- Impact: Dead code maintainability burden; imports exist (e.g., in UniversalLetterBuilder.tsx line 31) suggesting partial migration
- Fix approach: Determine if letters-v2 represents future migration target or should be deleted; make explicit decision with Asaf

**Multiple Editor Implementations:**
- Issue: Two editor components exist without clear specialization
- Files: `src/components/editor/TiptapEditor.tsx` (1239 LOC) and `src/components/editor/LexicalEditor.tsx` (1225 LOC)
- Impact: Maintenance burden; unclear which should be used where
- Fix approach: Clarify editor strategy - is one deprecated? Consolidate on single editor system

## Known Fragility

**UniversalLetterBuilder Component - Complexity Risk:**
- Files: `src/modules/letters/components/UniversalLetterBuilder.tsx` (3444 LOC)
- Why fragile:
  - Monolithic component handling: letter builder UI, client/group selection, variable substitution, PDF generation, file uploads
  - Uses requestAnimationFrame for page break calculation (line 76-94) which is fragile across browser implementations
  - Page height calculations hardcoded with MM_TO_PX conversion (line 62) - brittle for different DPI/zoom levels
  - Manages complex state: document lines, variables, page breaks, PDF generation
- Safe modification: Extract page break calculation to custom hook; separate file upload logic; create smaller sub-components
- Test coverage: No direct unit tests found; browser-dependent calculations need visual testing

**TemplateService - Large Service with Mixed Concerns (4152 LOC):**
- Files: `src/modules/letters/services/template.service.ts`
- Why fragile:
  - Handles 5+ template types (Letter, ForeignWorker, Tzlul, CompanyOnboarding, AutoLetters)
  - Each has 50+ template variations (FOREIGN_WORKER_LABELS, TZLUL_LABELS hardcoded)
  - Variable substitution logic duplicated across template types
  - HTML sanitization with complex whitelist rules (lines 35-79)
- Safe modification: Extract template type handling to separate classes; move sanitization to dedicated utility; break into 3-4 focused services
- Test coverage: 1 test file exists but likely incomplete given complexity

**FeesPage Component - Complex State Management (3126 LOC):**
- Files: `src/pages/FeesPage.tsx`
- Why fragile:
  - Manages 11 fee letter templates, fee calculations, group billing, payment discounts
  - Form state with 40+ fields (lines 71-130 just shows interface declaration)
  - Multiple calculations happening in component (VAT, discounts, installments, bank transfer calculations)
  - Cascading dependencies between fields (changing one requires recalculation)
- Safe modification: Extract fee calculation logic to custom hook; separate payment method UI from calculations
- Test coverage: No unit tests; heavily dependent on manual testing

**ClientFormDialog - Prop Hell & Complexity (1304 LOC):**
- Files: `src/components/clients/ClientFormDialog.tsx`
- Why fragile:
  - 9+ optional callback props (onAddContact, onUpdateContact, onDeleteContact, etc.) - lines 78-87
  - Manages nested data: client → contacts (array) → phones (array) → groups
  - Form validates multiple dependent fields (tax ID, company type, balance sheet requirements)
  - Tightly coupled to multiple modules (annual-balance, file-upload, company-extraction)
- Safe modification: Use context or store for callbacks instead of prop drilling; extract contact/phone management to sub-components
- Test coverage: No unit tests found

## Performance Bottlenecks

**Missing Pagination in List Views:**
- Problem: Large list pages load all records without pagination
- Files: `src/services/base.service.ts` - buildPaginationQuery exists but not consistently used
- Cause: Component-level fetches may not apply pagination; default pageSize=20 may be too small/large for data volume
- Improvement path: Audit all .select() calls in services; ensure pagination applied; implement virtual scrolling for large lists

**Page Break Calculation Using requestAnimationFrame:**
- Problem: UniversalLetterBuilder recalculates page breaks on every render using browser timing API
- Files: `src/modules/letters/components/UniversalLetterBuilder.tsx` (lines 71-95)
- Cause: Timeout + requestAnimationFrame waiting for DOM + images; no memoization of calculation
- Improvement path: Memoize calculated page breaks; use Intersection Observer instead; defer calculation until needed

**No Asset Preloading in Letter Generation:**
- Problem: Letter PDFs may timeout if images/fonts not cached; no explicit preloading strategy
- Files: `src/modules/letters-v2/services/pdf-generation.service.ts`
- Cause: PDFs generated dynamically without ensuring resources are fetched first
- Improvement path: Preload critical assets; add timeout warnings; implement fallback for missing resources

## Security Considerations

**innerHTML Usage in Paste Handler:**
- Risk: TiptapEditor uses innerHTML to extract cleaned HTML from pasted content
- Files: `src/components/editor/TiptapEditor.tsx` (line 369)
- Current mitigation: Paste handler removes `<style>`, `<script>`, `<meta>`, `<link>` tags; only used for internal editor state
- Recommendations: Ensure DOMPurify is always applied to any output; validate all pasted HTML before inserting; consider sandboxing paste operations

**Client-Side Validation Only in Some Forms:**
- Risk: Forms may submit without server-side validation if JavaScript blocked/altered
- Files: Multiple pages with forms (ClientsPage, FeesPage, LetterHistoryPage)
- Current mitigation: BaseService.handleError catches Postgres errors; RTL/Zod validation on some fields
- Recommendations: Add explicit validation layers in service methods; validate tax_id format server-side; check tenant_id on all mutations

**Tenant Isolation via user_metadata:**
- Risk: tenant_id stored in user_metadata - if JWT manipulation occurs, tenant isolation could fail
- Files: `src/lib/supabase.ts` (line 27), `src/services/base.service.ts` (line 39-43)
- Current mitigation: RLS policies should enforce at database level; services check getTenantId()
- Recommendations: Audit all Supabase RLS policies; ensure no table can be queried without tenant_id filter; test with service role key compromise scenario

**XSS in Letter Templates:**
- Risk: Custom_header_lines and other variables can contain HTML; DOMPurify whitelist may be too permissive
- Files: `src/modules/letters/utils/template-parser.ts` (lines 32-80 show whitelist configuration)
- Current mitigation: DOMPurify whitelist for style attributes; basic escapeHtml for other fields
- Recommendations: Restrict style whitelist further (no arbitrary font-family); audit all allowed attributes; test with malicious payloads

## Scaling Limits

**No Rate Limiting on PDF Generation:**
- Current capacity: Limited by browser memory + server timeout (likely 30-60s)
- Limit: Bulk PDF generation for 100+ letters would likely fail
- Scaling path: Implement background job queue (Redis/Bull); add file size limits; stream large PDFs instead of loading entirely

**Database Query Complexity Not Optimized:**
- Current capacity: Unknown - dependent on Supabase plan tier
- Limit: Complex joins (letter + client + contact + group) may have N+1 issues
- Scaling path: Index commonly filtered columns; use connection pooling; implement query result caching in Zustand stores

**File Storage on Supabase:**
- Current capacity: Limited by Supabase storage plan
- Limit: Unclear if soft or hard limits enforced; no cleanup policy for old files
- Scaling path: Implement file retention policy; archive old PDFs to cold storage; add storage quota warnings to UI

## Test Coverage Gaps

**Untested Critical Paths:**
- What's not tested: Payment integrations (Cardcom), PDF generation, email sending, letter variable substitution
- Files:
  - `src/modules/letters/services/template.service.ts` - no integration tests for complex variable substitution
  - `src/services/payment*.service.ts` - no tests for Cardcom webhook handling
  - `src/modules/billing/` - no E2E tests for complete billing flow
- Risk: Payment failures go unnoticed; incorrect letters sent to clients; email delivery silently fails
- Priority: HIGH - Finance critical paths need comprehensive testing

**No Component Unit Tests:**
- What's not tested: React components, dialog flows, form validation
- Files: `src/components/`, `src/pages/` - only 1 test file found
- Risk: UI regressions on refactoring; broken dialogs discovered only in QA
- Priority: MEDIUM - Add component snapshots and interaction tests

**Missing RTL Testing:**
- What's not tested: Hebrew layout in all components, dialog positioning, table column ordering
- Files: All components with `dir="rtl"`
- Risk: RTL issues discovered late; users see misaligned UI
- Priority: MEDIUM - Add visual regression tests with different text directions

## Dependencies at Risk

**Tiptap Editor Maintenance:**
- Risk: Two competing editor libraries (Tiptap + Lexical) - unclear which is maintained
- Impact: If Tiptap development stalls, feature requests blocked
- Migration plan: Evaluate ContentEditable standardization; consider moving to markdown + simple formatting toolbar

**Supabase Edge Functions Complexity:**
- Risk: Email sending, PDF generation, webhooks in Edge Functions - limited debugging capability
- Impact: Failures hard to diagnose; no local development flow
- Migration plan: Consider moving critical functions to Node.js backend for better observability

**DOMPurify Version:**
- Risk: HTML sanitization library may have vulnerabilities; whitelist rules are custom
- Impact: Potential XSS if whitelist too permissive
- Migration plan: Keep DOMPurify updated; audit whitelist quarterly; consider using native parser instead

## Missing Critical Features

**No Offline Mode:**
- Problem: All features require internet; users can't view cached letters or enter data offline
- Blocks: Mobile usage scenarios; poor UX on spotty connections
- Gap: No service worker; no local state persistence strategy

**No Audit Trail Completeness:**
- Problem: audit_logs table exists but not all mutations logged; no retention policy
- Blocks: Compliance requirements; debugging user issues
- Gap: Many services don't call logAction(); no cleanup for old logs

**No Field-Level Encryption:**
- Problem: Sensitive client data (tax ID, phone, email) stored in plaintext in Postgres
- Blocks: GDPR compliance; data breach risk
- Gap: No encryption at application layer; relies on Supabase TLS only

**Missing Error Recovery:**
- Problem: Failed operations often leave data in inconsistent state
- Example: Letter sent but payment record not created
- Gap: No transaction-like behavior across multiple tables; no rollback mechanism

## Systemic Issues

**No Consistent Error Handling Pattern:**
- Issue: ServiceResponse pattern used but not consistently; some services throw, others return null
- Files: `src/services/base.service.ts` defines pattern (line 8-11); not all services follow
- Impact: Unpredictable error handling in consuming code; unhandled exceptions possible
- Fix approach: Enforce ServiceResponse<T> return type across all services; prohibit throwing from services

**Incomplete Type Safety:**
- Issue: Database types auto-generated (good) but manual type definitions may diverge
- Files: `src/types/database.types.ts` vs hand-written types in service files
- Impact: Type mismatches at runtime; Zod schema validation sometimes missing
- Fix approach: Use database types as source of truth; generate service DTOs from database types

**No Environment-Specific Configuration:**
- Issue: Hardcoded values like PAYMENT_DISCOUNTS, TEMPLATE_OPTIONS in components/services
- Files: `src/pages/FeesPage.tsx` (lines 56-69), `src/modules/letters/services/template.service.ts` (lines 61-78)
- Impact: Changing discount rates requires code deployment; can't configure per-tenant
- Fix approach: Move to Supabase settings table; fetch on app init; cache in Zustand

**No Feature Flags System:**
- Issue: New features (Distribution Lists, Google Drive integration) documented but not partially deployed
- Files: Features exist in code but may not be fully integrated (see CLAUDE.md)
- Impact: Users may see incomplete features; no gradual rollout capability
- Fix approach: Implement feature flag system (PostHog or custom); wrap new features with flags

---

*Concerns audit: 2026-02-09*
