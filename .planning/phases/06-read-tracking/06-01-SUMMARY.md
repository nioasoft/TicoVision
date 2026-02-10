---
phase: 06-read-tracking
plan: 01
subsystem: database
tags: [postgresql, supabase, triggers, rls, realtime, denormalized-counter, upsert]

# Dependency graph
requires:
  - phase: 01-database-foundation
    provides: "balance_chat_messages table (trigger attaches to this table)"
  - phase: 02-chat-service-layer
    provides: "BalanceChatService class (methods added here)"
  - phase: 03-chat-ui-components
    provides: "BalanceChatSheet component (markAsRead call added here)"
provides:
  - "balance_chat_read_tracking table with denormalized unread_count column"
  - "SECURITY DEFINER trigger for atomic unread increment on message insert"
  - "markAsRead(balanceId) service method using upsert to reset counter"
  - "getUnreadCounts() service method returning balance_id -> count map"
  - "UI integration: markAsRead called when BalanceChatSheet opens"
  - "Realtime publication membership for live badge updates"
affects: [07-unread-badges, 08-system-messages, 09-email-notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Denormalized counter with trigger increment + upsert reset (no COUNT queries)"
    - "SECURITY DEFINER trigger to update other users' rows bypassing RLS"
    - "Partial index WHERE unread_count > 0 for efficient badge queries"
    - "Fire-and-forget markAsRead call (no await, no error handling needed)"
    - "Tracking rows created on first chat open (not pre-populated for all users)"

key-files:
  created:
    - "supabase/migrations/20260210_balance_chat_read_tracking.sql"
  modified:
    - "src/types/database.types.ts"
    - "src/modules/annual-balance/services/balance-chat.service.ts"
    - "src/modules/annual-balance/components/BalanceChatSheet.tsx"

key-decisions:
  - "Separate balance_chat_read_tracking table (not JSONB on annual_balance_sheets) for clean separation of concerns"
  - "Trigger only updates existing rows, does not create rows for users who never opened chat"
  - "markAsRead called after messages load (not before) to minimize race condition window"
  - "Fire-and-forget markAsRead (no await) to avoid blocking UI"
  - "Migration applied via Supabase Management API (consistent with Phase 1 approach)"

patterns-established:
  - "Denormalized counter pattern: trigger increment + upsert reset for O(1) badge lookups"
  - "RLS 3-policy pattern for user-scoped tracking: SELECT/INSERT/UPDATE own rows, no DELETE"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 6 Plan 1: Read Tracking Summary

**Denormalized unread counter table with SECURITY DEFINER trigger for atomic increment and upsert-based markAsRead for O(1) badge lookups**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T09:19:14Z
- **Completed:** 2026-02-10T09:22:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `balance_chat_read_tracking` table with `(tenant_id, balance_id, user_id)` UNIQUE constraint and denormalized `unread_count` integer
- Deployed SECURITY DEFINER trigger that atomically increments unread_count for all tracked users (except sender) on message insert
- Added `markAsRead(balanceId)` service method using upsert to reset counter to 0 on chat open
- Added `getUnreadCounts()` service method returning balance_id -> count map for Phase 7 badge display
- Integrated markAsRead call in BalanceChatSheet (fire-and-forget after messages load)
- Added table to supabase_realtime publication for Phase 7 live badge updates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create balance_chat_read_tracking table with trigger and RLS** - `9709b7b` (feat)
2. **Task 2: Add markAsRead and getUnreadCounts service methods with UI integration** - `4aa0f86` (feat)

## Files Created/Modified
- `supabase/migrations/20260210_balance_chat_read_tracking.sql` - DDL for table, indexes, RLS policies, triggers, and Realtime publication
- `src/types/database.types.ts` - Regenerated TypeScript types including balance_chat_read_tracking (Row, Insert, Update)
- `src/modules/annual-balance/services/balance-chat.service.ts` - Added markAsRead and getUnreadCounts methods
- `src/modules/annual-balance/components/BalanceChatSheet.tsx` - Added markAsRead call after messages load

## Decisions Made
- **Separate table:** Created dedicated `balance_chat_read_tracking` table instead of adding columns to `annual_balance_sheets` (clean separation of chat concerns from balance domain, consistent with existing `chat_read_status` pattern)
- **Trigger-only-updates:** Trigger only increments existing rows -- does not create tracking rows for users who have never opened the chat (correct: they are not following that chat)
- **markAsRead timing:** Called after `setLoading(false)` to minimize race condition window between trigger increment and upsert reset
- **Fire-and-forget:** markAsRead is not awaited in the UI -- failure only means badge stays until next visit, which is acceptable
- **Migration method:** Applied via Supabase Management API (same as Phase 1) due to local/remote migration history mismatch

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Read tracking infrastructure is live with trigger + upsert pattern working
- `getUnreadCounts()` is ready for Phase 7 (Unread Badges) to consume for badge display
- Realtime publication membership enables Phase 7 to subscribe to live badge updates
- `markAsRead` is called on chat open, ensuring counters reset when users view messages
- Resolved STATE.md blocker: "unread counter storage location" -- separate table chosen over `annual_balance_sheets` columns

## Self-Check: PASSED

- [x] `supabase/migrations/20260210_balance_chat_read_tracking.sql` exists
- [x] `src/types/database.types.ts` exists and contains `balance_chat_read_tracking`
- [x] `src/modules/annual-balance/services/balance-chat.service.ts` exists with `markAsRead` and `getUnreadCounts`
- [x] `src/modules/annual-balance/components/BalanceChatSheet.tsx` exists with `markAsRead` call
- [x] Commit `9709b7b` (Task 1) exists
- [x] Commit `4aa0f86` (Task 2) exists
- [x] Remote database verified: table created, trigger exists, 3 RLS policies active

---
*Phase: 06-read-tracking*
*Completed: 2026-02-10*
