---
phase: 04-real-time-message-delivery
plan: 01
subsystem: ui
tags: [supabase-realtime, postgres-changes, websocket, dedup, optimistic-ui]

# Dependency graph
requires:
  - phase: 02-chat-service-layer
    provides: BalanceChatService with getMessages/sendMessage methods
  - phase: 03-chat-ui-components
    provides: BalanceChatSheet with optimistic send and message display
provides:
  - subscribeToBalanceChat() Realtime method on BalanceChatService
  - Real-time message delivery in BalanceChatSheet with dedup and sender enrichment
  - Subscription lifecycle tied to sheet open/close state
affects: [05-typing-indicators, 06-read-tracking, 10-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [supabase-realtime-postgres-changes, client-side-balance-filter, usermap-ref-for-enrichment, dual-dedup-optimistic-realtime]

key-files:
  created: []
  modified:
    - src/modules/annual-balance/services/balance-chat.service.ts
    - src/modules/annual-balance/components/BalanceChatSheet.tsx

key-decisions:
  - "Single-column server-side filter (tenant_id only) with client-side balance_id filter -- Supabase Realtime limitation"
  - "useRef for userMap instead of useState -- lookup data, not rendered state"
  - "Dual dedup strategy: handleRealtimeMessage checks by ID, handleSend filters both optimistic and Realtime duplicates"

patterns-established:
  - "Balance Realtime channel naming: balance-chat:${tenantId}:${balanceId}"
  - "supabase.removeChannel() for cleanup (not channel.unsubscribe())"
  - "UserMap ref pattern for enriching Realtime messages with sender info"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 4 Plan 1: Real-time Message Delivery Summary

**Supabase Realtime subscription on balance_chat_messages with postgres_changes INSERT listener, dual dedup for optimistic + Realtime race, and sender enrichment via userMap ref**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T00:18:15Z
- **Completed:** 2026-02-10T00:20:42Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `subscribeToBalanceChat()` method to BalanceChatService with tenant-scoped Realtime channel
- Wired Realtime subscription lifecycle into BalanceChatSheet (subscribe on open, removeChannel on close)
- Implemented dual dedup strategy: incoming Realtime messages are deduped against existing state, and handleSend success path removes both optimistic and any early Realtime duplicates
- Built userMap from fetched messages + current user to enrich incoming Realtime messages with sender info

## Task Commits

Each task was committed atomically:

1. **Task 1: Add subscribeToBalanceChat method to BalanceChatService** - `531cc5c` (feat)
2. **Task 2: Add Realtime subscription lifecycle to BalanceChatSheet** - `bfe7cec` (feat)

## Files Created/Modified
- `src/modules/annual-balance/services/balance-chat.service.ts` - Added subscribeToBalanceChat() Realtime subscription method
- `src/modules/annual-balance/components/BalanceChatSheet.tsx` - Added Realtime lifecycle, dedup, userMap enrichment, supabase/useRef imports

## Decisions Made
- **Single-column server-side filter:** Supabase Realtime only supports single-column filters, so we filter by `tenant_id` server-side and `balance_id` client-side
- **useRef for userMap:** Sender lookup data is not rendered state, so ref avoids unnecessary re-renders
- **Dual dedup strategy:** `handleRealtimeMessage` does `prev.some(m => m.id === rawMsg.id)` for normal flow; `handleSend` success path filters both `optimisticMsg.id` and `result.data!.id` to handle the Realtime-arrives-before-sendMessage-response race

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added user to fetch useEffect dependency array**
- **Found during:** Task 2 (Realtime subscription lifecycle)
- **Issue:** Adding `user` reference inside the fetch useEffect for userMap building triggered react-hooks/exhaustive-deps warning
- **Fix:** Added `user` to the useEffect dependency array `[open, balanceCase?.id, user]`
- **Files modified:** src/modules/annual-balance/components/BalanceChatSheet.tsx
- **Verification:** `npm run lint` shows no warnings for BalanceChatSheet.tsx
- **Committed in:** bfe7cec (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor lint compliance fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Real-time message delivery is functional -- ready for Phase 5 (Typing Indicators) or Phase 6 (Read Tracking)
- Channel naming pattern `balance-chat:${tenantId}:${balanceId}` established for future Realtime features
- UserMap pattern available for reuse in typing indicator enrichment

---
*Phase: 04-real-time-message-delivery*
*Completed: 2026-02-10*
