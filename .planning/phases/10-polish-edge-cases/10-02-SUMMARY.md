---
phase: 10-polish-edge-cases
plan: 02
subsystem: ui
tags: [react, chat, pagination, rtl, overflow, performance]

# Dependency graph
requires:
  - phase: 10-polish-edge-cases
    plan: 01
    provides: Error state with retry, offline banner, auto-expanding textarea
  - phase: 03-chat-ui-components
    provides: BalanceChatSheet, BalanceChatMessages, BalanceChatInput components
  - phase: 02-chat-service-layer
    provides: BalanceChatService with getMessages, sendMessage
provides:
  - Cursor-based pagination in chat service (100 messages per page, `before` timestamp cursor)
  - "Load earlier messages" button for 200+ message capacity
  - RTL-correct timestamp alignment (text-end)
  - Overflow-safe message bubbles for long unbroken text
  - Smart auto-scroll that only triggers on new messages (not prepended history)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cursor-based pagination via `before` timestamp parameter (not offset-based)"
    - "Last-message-ID ref tracking to distinguish appended vs prepended messages for scroll behavior"
    - "overflow-hidden on bubble wrapper combined with break-words on content for long URL safety"

key-files:
  created: []
  modified:
    - src/modules/annual-balance/services/balance-chat.service.ts
    - src/modules/annual-balance/components/BalanceChatSheet.tsx
    - src/modules/annual-balance/components/BalanceChatMessages.tsx

key-decisions:
  - "Cursor-based pagination (before timestamp) instead of offset-based -- avoids shifting results when new messages arrive"
  - "Last-message-ID ref for scroll control -- simple and reliable way to distinguish appended vs prepended messages"
  - "overflow-hidden on bubble div rather than overflow-wrap on container -- clips at bubble boundary without affecting scroll"

patterns-established:
  - "Cursor pagination: pass oldest message timestamp as `before` parameter to fetch next page"
  - "Scroll guard: track last message ID in ref, only scroll when it changes (new message appended)"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 10 Plan 02: Chat Pagination & RTL Hardening Summary

**Cursor-based message pagination (100/page) with load-earlier button, RTL timestamp alignment, and overflow-safe bubbles for 200+ message capacity**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T13:05:04Z
- **Completed:** 2026-02-10T13:07:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Chat service now fetches 100 messages by default (up from 50) with cursor-based `before` parameter for pagination
- "Load earlier messages" button appears at top of message list when more messages exist, enabling 200+ message support
- Auto-scroll only fires when a new message is appended (not when loading earlier history), using last-message-ID tracking
- Timestamps aligned to logical end of bubble in RTL context via `text-end` class
- Long unbroken text (200+ char URLs) clipped within bubble boundary via `overflow-hidden` on wrapper div

## Task Commits

Each task was committed atomically:

1. **Task 1: Add offset pagination to service and load-earlier handler in BalanceChatSheet** - `eca702c` (feat)
2. **Task 2: Add load-earlier button, fix RTL timestamps, guard long text overflow in BalanceChatMessages** - `d679f2a` (feat)

## Files Created/Modified
- `src/modules/annual-balance/services/balance-chat.service.ts` - Default limit 50->100, added optional `before` timestamp parameter for cursor-based pagination
- `src/modules/annual-balance/components/BalanceChatSheet.tsx` - Added hasMore state, handleLoadEarlier callback, passes new props to BalanceChatMessages
- `src/modules/annual-balance/components/BalanceChatMessages.tsx` - Load-earlier button, last-message-ID scroll guard, text-end timestamps, overflow-hidden bubbles

## Decisions Made
- Cursor-based pagination (before timestamp) instead of offset-based -- avoids shifting results when new messages arrive during active chat
- Last-message-ID ref for scroll control -- simpler and more reliable than counting messages or tracking previous array length
- overflow-hidden on bubble div rather than overflow-wrap on container -- clips at bubble boundary without affecting the scrollable container

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 10 (Polish & Edge Cases) is now fully complete
- All 10 phases of the balance chat feature have been executed
- The feature is production-ready with: database foundation, service layer, UI components, real-time delivery, permissions, read tracking, unread indicators, system messages, notifications, and polish/edge-case handling

---
*Phase: 10-polish-edge-cases*
*Completed: 2026-02-10*
