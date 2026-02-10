---
phase: 08-system-messages
plan: 01
subsystem: chat
tags: [supabase, realtime, chat, system-messages, fire-and-forget]

# Dependency graph
requires:
  - phase: 01-database-foundation
    provides: balance_chat_messages table with message_type column
  - phase: 02-chat-service-layer
    provides: BalanceChatService with sendMessage pattern
  - phase: 03-chat-ui-components
    provides: BalanceChatMessages component with message rendering
provides:
  - sendSystemMessage() method on BalanceChatService for fire-and-forget system message insertion
  - 4 integration points in annualBalanceService (updateStatus, assignAuditor, confirmAssignment, markMaterialsReceived)
  - System message rendering as centered pills with Info icon in BalanceChatMessages
affects: [09-notifications, 10-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [fire-and-forget system messages, async IIFE for non-blocking side-effects, message_type conditional rendering]

key-files:
  created: []
  modified:
    - src/modules/annual-balance/services/balance-chat.service.ts
    - src/modules/annual-balance/services/annual-balance.service.ts
    - src/modules/annual-balance/components/BalanceChatMessages.tsx

key-decisions:
  - "Fire-and-forget pattern: all sendSystemMessage calls are non-blocking (no await) to avoid impacting parent operations"
  - "Async IIFE in assignAuditor for auditor name lookup - keeps name resolution non-blocking"
  - "System messages use acting user's user_id for RLS compliance but don't display sender name in UI"

patterns-established:
  - "Fire-and-forget system messages: call balanceChatService.sendSystemMessage() without await, errors logged but never propagated"
  - "Async IIFE pattern for non-blocking side-effects that need await internally: void (async () => { ... })()"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 8 Plan 1: System Messages Summary

**Fire-and-forget system messages in balance chat for auditor assignment, status changes, confirmation, and materials received events with centered pill UI rendering**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T10:31:02Z
- **Completed:** 2026-02-10T10:33:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added sendSystemMessage() to BalanceChatService for inserting system messages with message_type='system'
- Wired 4 integration points in annualBalanceService: updateStatus (with Hebrew labels for forward/revert), assignAuditor (with auditor name lookup), confirmAssignment, markMaterialsReceived
- System messages render as centered pills with Info icon, visually distinct from user bubbles, with no delete/edit UI

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sendSystemMessage method and wire into annualBalanceService events** - `a9f2a4d` (feat)
2. **Task 2: Render system messages as centered pills and prevent deletion** - `72390c9` (feat)

## Files Created/Modified
- `src/modules/annual-balance/services/balance-chat.service.ts` - Added sendSystemMessage() method
- `src/modules/annual-balance/services/annual-balance.service.ts` - Added 4 fire-and-forget system message calls + imports
- `src/modules/annual-balance/components/BalanceChatMessages.tsx` - Added system message conditional rendering with centered pill UI

## Decisions Made
- Fire-and-forget pattern for all system message calls (no await, no error propagation) to preserve parent operation performance
- Async IIFE in assignAuditor to keep auditor name lookup non-blocking while still resolving the display name
- System messages use the acting user's user_id (satisfies RLS INSERT policy) but don't display sender name in UI
- Unicode arrow character used in status change messages for cleaner Hebrew text display

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- System messages are fully operational for all 4 event types
- Ready for Phase 9 (Notifications) which adds email notifications for chat activity
- Phase 10 (Polish) can refine system message styling if needed

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit a9f2a4d (Task 1) verified in git log
- Commit 72390c9 (Task 2) verified in git log
- typecheck: passed
- lint (modified files): passed
- build: passed
- sendSystemMessage appears 4 times in annual-balance.service.ts (verified)
- sendSystemMessage method defined 1 time in balance-chat.service.ts (verified)

---
*Phase: 08-system-messages*
*Completed: 2026-02-10*
