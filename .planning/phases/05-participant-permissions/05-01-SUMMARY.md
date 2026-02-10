---
phase: 05-participant-permissions
plan: 01
subsystem: database, ui
tags: [postgresql, rls, supabase, permissions, rbac, chat]

# Dependency graph
requires:
  - phase: 01-database-foundation
    provides: "balance_chat_messages table with tenant-only RLS policies"
  - phase: 03-chat-ui-components
    provides: "BalanceChatSheet and BalanceTable with chat icon"
provides:
  - "Role-aware RLS policies on balance_chat_messages (admin/accountant full, bookkeeper auditor-only)"
  - "canAccessBalanceChat helper function for client-side permission gating"
  - "Permission-denied fallback UI in BalanceChatSheet (Hebrew)"
  - "Conditional chat icon rendering in BalanceTable based on role + auditor assignment"
affects: [06-read-tracking, 08-system-messages, 09-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-aware RLS with nested EXISTS: uta.role check OR auditor_id subquery on annual_balance_sheets"
    - "initPlan caching via (select auth.uid()) and (select get_current_tenant_id()) wrappers"
    - "Defense-in-depth: RLS = security boundary, UI helper = UX gating"
    - "canAccessBalanceChat(role, userId, {auditor_id}) pattern for client-side permission check"

key-files:
  created:
    - "supabase/migrations/20260210_bcm_role_aware_rls.sql"
  modified:
    - "src/modules/annual-balance/types/annual-balance.types.ts"
    - "src/modules/annual-balance/components/BalanceChatSheet.tsx"
    - "src/modules/annual-balance/components/BalanceTable.tsx"
    - "src/modules/annual-balance/pages/AnnualBalancePage.tsx"

key-decisions:
  - "No service-layer checkChatAccess method -- RLS is the security boundary, UI helper is sufficient for UX gating (avoids redundant DB round-trip)"
  - "canAccessBalanceChat is a pure function (no async/DB call) -- role + userId + auditor_id comparison only"

patterns-established:
  - "Role-aware RLS with admin/accountant short-circuit before bookkeeper auditor_id check"
  - "Client-side canAccessBalanceChat(role, userId, {auditor_id}) for conditional UI rendering"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 5 Plan 1: Participant Permissions Summary

**Role-aware RLS policies replacing tenant-only chat access, with canAccessBalanceChat UI helper gating chat icon and sheet for bookkeeper auditor-only restriction**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T08:57:17Z
- **Completed:** 2026-02-10T09:00:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Replaced tenant-only SELECT and INSERT RLS policies on balance_chat_messages with role-aware versions (admin/accountant = full tenant access, bookkeeper = assigned auditor only)
- Added canAccessBalanceChat helper function to annual-balance.types.ts for client-side permission gating
- Conditionally rendered chat icon in BalanceTable -- hidden for bookkeepers on unassigned balances
- Added permission-denied fallback in BalanceChatSheet with Hebrew error message ("אין לך הרשאה לצפות בשיחה זו")
- TypeScript, lint, and production build all pass with zero new errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Apply role-aware RLS migration for balance_chat_messages** - `88fdbf4` (feat)
2. **Task 2: Add canAccessBalanceChat helper and UI permission gating** - `b6973c0` (feat)

## Files Created/Modified
- `supabase/migrations/20260210_bcm_role_aware_rls.sql` - Migration dropping old tenant-only policies and creating role-aware bcm_select_by_role and bcm_insert_by_role policies
- `src/modules/annual-balance/types/annual-balance.types.ts` - Added view_chat/send_chat permissions and canAccessBalanceChat helper function
- `src/modules/annual-balance/components/BalanceChatSheet.tsx` - Added permission check with Hebrew permission-denied fallback
- `src/modules/annual-balance/components/BalanceTable.tsx` - Added userId prop and conditional chat icon rendering via canAccessBalanceChat
- `src/modules/annual-balance/pages/AnnualBalancePage.tsx` - Destructured user from useAuth and passed userId to BalanceTable

## Decisions Made
- **No service-layer permission check:** RLS is the security boundary; the UI helper is sufficient for UX gating. Adding a service-layer checkChatAccess would be redundant and add an unnecessary DB round-trip.
- **Pure function for client-side check:** canAccessBalanceChat uses only role, userId, and auditor_id comparison -- no async calls or database lookups needed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RLS enforcement is live -- bookkeepers can only SELECT/INSERT messages for balances where they are the assigned auditor
- UI gating prevents chat icon from appearing for unauthorized bookkeepers
- Ready for Phase 6 (Read Tracking) which will add unread counters on top of the existing permission model
- Ready for Phase 8 (System Messages) which will use the same role-aware RLS policies

## Self-Check: PASSED

- [x] `supabase/migrations/20260210_bcm_role_aware_rls.sql` exists
- [x] `src/modules/annual-balance/types/annual-balance.types.ts` exists and contains `canAccessBalanceChat`
- [x] `src/modules/annual-balance/components/BalanceChatSheet.tsx` exists and contains `canAccessBalanceChat`
- [x] `src/modules/annual-balance/components/BalanceTable.tsx` exists and contains `canAccessBalanceChat`
- [x] `src/modules/annual-balance/pages/AnnualBalancePage.tsx` exists and passes `userId` to BalanceTable
- [x] Commit `88fdbf4` (Task 1) exists
- [x] Commit `b6973c0` (Task 2) exists
- [x] Remote database verified: bcm_select_by_role (SELECT), bcm_insert_by_role (INSERT), bcm_update_admin_accountant (UPDATE)

---
*Phase: 05-participant-permissions*
*Completed: 2026-02-10*
