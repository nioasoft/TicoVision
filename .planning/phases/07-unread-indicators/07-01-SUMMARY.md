---
phase: 07-unread-indicators
plan: 01
subsystem: ui
tags: [zustand, supabase-realtime, react, rtl, badges]

# Dependency graph
requires:
  - phase: 06-read-tracking
    provides: "balance_chat_read_tracking table with unread_count column, getUnreadCounts/markAsRead service methods"
provides:
  - "Unread badge on chat icon in BalanceTable with 99+ cap"
  - "hasUnread client-side filter toggle in BalanceFilters"
  - "Realtime subscription on balance_chat_read_tracking for live badge updates"
  - "Zustand unreadCounts state with fetch/update/clear actions"
affects: [08-system-messages, 09-email-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Realtime postgres_changes subscription on tracking table for badge updates"
    - "Client-side filter via useMemo over server-fetched cases"
    - "Optimistic badge clear on chat panel open"

key-files:
  created: []
  modified:
    - src/modules/annual-balance/store/annualBalanceStore.ts
    - src/modules/annual-balance/types/annual-balance.types.ts
    - src/modules/annual-balance/pages/AnnualBalancePage.tsx
    - src/modules/annual-balance/components/BalanceTable.tsx
    - src/modules/annual-balance/components/BalanceFilters.tsx

key-decisions:
  - "hasUnread is client-side-only filter (not sent to server getAll query) -- filters already-fetched cases via useMemo"
  - "Realtime subscription on balance_chat_read_tracking UPDATE events (not INSERT) for unread count changes"
  - "Badge uses -end-1 logical property for correct RTL positioning"

patterns-established:
  - "Client-side filter pattern: useMemo over cases array, filter field not in DEFAULT_FILTERS so resetFilters clears it"
  - "Realtime tracking subscription pattern: channel per tenant, UPDATE events, updateUnreadCount store action"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 7 Plan 1: Unread Indicators Summary

**Unread message badges on balance table chat icons with Realtime updates, hasUnread filter toggle, and Zustand state management**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T09:56:32Z
- **Completed:** 2026-02-10T09:59:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Balance table chat icons now show red badges with unread message counts (capped at 99+)
- Users can toggle "הודעות שלא נקראו" filter to show only balances with unread messages
- Realtime subscription on balance_chat_read_tracking delivers live badge updates without page refresh
- Badge clears optimistically when user opens the chat panel
- Unread counts refresh on every page mount

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend store with unread counts and add hasUnread to BalanceFilters type** - `ab7d5b6` (feat)
2. **Task 2: Add unread badge on chat icon, filter toggle, Realtime subscription, and page wiring** - `2256c58` (feat)

## Files Created/Modified
- `src/modules/annual-balance/store/annualBalanceStore.ts` - Added unreadCounts map with fetchUnreadCounts, updateUnreadCount, clearUnreadCount actions
- `src/modules/annual-balance/types/annual-balance.types.ts` - Added hasUnread optional boolean to BalanceFilters interface
- `src/modules/annual-balance/pages/AnnualBalancePage.tsx` - Wired unread state, Realtime subscription, optimistic clear, client-side hasUnread filter
- `src/modules/annual-balance/components/BalanceTable.tsx` - Added unreadCounts prop and red badge on MessageCircle icon with 99+ cap
- `src/modules/annual-balance/components/BalanceFilters.tsx` - Added "הודעות שלא נקראו" toggle button and hasUnread in hasActiveFilters check

## Decisions Made
- hasUnread is a client-side-only filter -- not sent to server getAll query, filters already-fetched cases via useMemo. This avoids server-side complexity since unread counts are per-user and already loaded into the store.
- Realtime subscription listens for UPDATE events (not INSERT) on balance_chat_read_tracking because the trigger increments unread_count via UPDATE.
- Badge uses `-end-1` logical property for correct RTL positioning (appears on the leading/left edge in RTL layout).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Unread indicators complete, ready for Phase 8 (System Messages) or Phase 9 (Email Notifications)
- The Realtime subscription pattern established here can be reused or extended in Phase 9 for notification delivery

---
*Phase: 07-unread-indicators*
*Completed: 2026-02-10*
