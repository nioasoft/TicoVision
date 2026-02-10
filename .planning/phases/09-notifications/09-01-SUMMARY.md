---
phase: 09-notifications
plan: 01
subsystem: ui
tags: [sonner, supabase-realtime, sendgrid, toast, email, rtl]

# Dependency graph
requires:
  - phase: 08-system-messages
    provides: "System message IIFE pattern in assignAuditor, fire-and-forget balanceChatService calls"
  - phase: 07-unread-indicators
    provides: "Unread count tracking, clearUnreadCount, Realtime subscription pattern"
  - phase: 04-real-time-message-delivery
    provides: "Supabase Realtime postgres_changes subscription pattern for balance_chat_messages"
  - phase: 05-participant-permissions
    provides: "canAccessBalanceChat pure function for access filtering"
provides:
  - ChatNotificationToast component for RTL-aware toast rendering
  - Global tenant-scoped Realtime subscription for chat toast notifications
  - Tenant user map ref for sender name resolution
  - Email notification on first auditor assignment via send-letter edge function
affects: [10-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [ref-based Realtime callback to avoid stale closures and subscription churn, fire-and-forget edge function invocation for transactional email]

key-files:
  created:
    - src/modules/annual-balance/components/ChatNotificationToast.tsx
  modified:
    - src/modules/annual-balance/pages/AnnualBalancePage.tsx
    - src/modules/annual-balance/services/annual-balance.service.ts

key-decisions:
  - "Refs (casesRef, chatStateRef, tenantUsersRef) used instead of state deps to avoid Realtime subscription churn"
  - "Tenant users fetched once on mount via get_users_for_tenant RPC for sender name enrichment"
  - "Email uses existing send-letter edge function with simpleMode: true -- no new edge function needed"
  - "isFirstAssignment computed before UPDATE query to correctly detect first vs re-assignment"

patterns-established:
  - "Global toast notification subscription: tenant-scoped Realtime channel with refs for callback stability"
  - "Fire-and-forget email via send-letter simpleMode inside existing async IIFE"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 9 Plan 1: Notifications Summary

**Sonner toast notifications for new chat messages via global Realtime subscription, plus email notification to auditor on first balance assignment via send-letter edge function**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T11:39:39Z
- **Completed:** 2026-02-10T11:42:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- ChatNotificationToast component renders RTL toast with sender name, client name, and truncated message preview
- Global tenant-scoped Realtime subscription in AnnualBalancePage fires toasts for new chat messages (skips own, system, and open-chat-balance messages)
- Tenant user map fetched once on mount for sender name resolution without N+1 queries
- Email sent to auditor on first assignment only (not re-assignments) with Hebrew text including client name, tax ID, year, and link

## Task Commits

Each task was committed atomically:

1. **Task 1: Toast notification component and global Realtime subscription** - `0095937` (feat)
2. **Task 2: Email notification on first auditor assignment** - `24bb2f4` (feat)

## Files Created/Modified
- `src/modules/annual-balance/components/ChatNotificationToast.tsx` - RTL-aware custom toast component rendered inside Sonner toast.custom()
- `src/modules/annual-balance/pages/AnnualBalancePage.tsx` - Added refs, tenant user fetch, and global chat-notifications Realtime subscription
- `src/modules/annual-balance/services/annual-balance.service.ts` - Expanded assignAuditor to detect first assignment and send email via send-letter

## Decisions Made
- Used refs (casesRef, chatStateRef, tenantUsersRef) to avoid subscription churn when cases/chatState change -- plan explicitly avoids these in deps
- Tenant user map fetched once on mount via get_users_for_tenant RPC (same pattern as BalanceChatSheet sender enrichment)
- Reused existing send-letter edge function with simpleMode: true -- no new edge function deployment needed
- isFirstAssignment derived from pre-update auditor_id value, captured before the UPDATE query executes
- typeof window guard for SSR safety when building email link URL

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- ESLint exhaustive-deps warning on chat-notifications useEffect (line 199) for `user` object -- intentional design to use specific fields (user?.id, user?.user_metadata?.tenant_id) as deps instead of full user object, avoiding unnecessary subscription reconnects. Warning is acceptable (0 errors, 1 warning).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All notification infrastructure is in place
- Toast notifications fire for new chat messages from other users
- Email notifications fire on first auditor assignment
- Ready for Phase 10 (Polish) which may add deep-linking, notification throttling, or additional notification types

## Self-Check: PASSED

All files verified present, all commit hashes found in git log.

---
*Phase: 09-notifications*
*Completed: 2026-02-10*
