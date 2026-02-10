---
phase: 10-polish-edge-cases
plan: 01
subsystem: ui
tags: [react, error-handling, offline-detection, textarea, toast, sonner]

# Dependency graph
requires:
  - phase: 03-chat-ui-components
    provides: BalanceChatSheet, BalanceChatMessages, BalanceChatInput components
provides:
  - Error state with retry button on message fetch failure
  - Send failure toast with retry action preserving message content
  - Offline detection banner with disabled input
  - Auto-expanding multiline Textarea replacing single-line Input
  - Single Toaster instance (duplicate removed from App.tsx)
affects: [10-polish-edge-cases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useCallback for fetchMessages enables retry from both useEffect and error UI"
    - "navigator.onLine + window events for offline detection"
    - "Auto-expanding textarea via scrollHeight capped at maxHeight"
    - "Toast action with closure-captured content for send retry"

key-files:
  created: []
  modified:
    - src/modules/annual-balance/components/BalanceChatSheet.tsx
    - src/modules/annual-balance/components/BalanceChatMessages.tsx
    - src/modules/annual-balance/components/BalanceChatInput.tsx
    - src/App.tsx

key-decisions:
  - "Extracted fetchMessages as useCallback for stable retry reference (not inline in useEffect)"
  - "Offline banner placed between SheetHeader and BalanceChatMessages for visibility"
  - "Removed App.tsx Toaster, keeping main.tsx Toaster with richColors/RTL/closeButton config"
  - "items-end alignment on input container so send button stays at bottom when textarea grows"

patterns-established:
  - "Error + retry pattern: error state in parent, retry callback passed as prop to child"
  - "Offline detection: navigator.onLine state + online/offline window events"
  - "Auto-expanding textarea: useRef + useEffect measuring scrollHeight"

# Metrics
duration: 3min
completed: 2026-02-10
---

# Phase 10 Plan 01: Error Handling & Input Polish Summary

**Error retry on fetch/send failure, offline banner with WifiOff icon, auto-expanding Textarea input, and duplicate Toaster removal**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-10T13:00:23Z
- **Completed:** 2026-02-10T13:03:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Network failure on message fetch shows Hebrew error with retry button
- Send failure toast includes "retry" action that re-sends the same content via closure
- Offline state shows yellow WifiOff banner and disables chat input
- Chat input is now an auto-expanding Textarea (1 to ~4 rows) with Shift+Enter for newlines
- Removed duplicate Toaster from App.tsx (main.tsx already has the fully-configured one)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add error state with retry, send retry toast, and offline banner** - `bbd8cde` (feat)
2. **Task 2: Convert BalanceChatInput from Input to auto-expanding Textarea** - `0352d27` (feat)

## Files Created/Modified
- `src/modules/annual-balance/components/BalanceChatSheet.tsx` - Added error/isOnline state, fetchMessages callback, offline banner, retry toast action
- `src/modules/annual-balance/components/BalanceChatMessages.tsx` - Added error/onRetry props with AlertCircle + retry button UI
- `src/modules/annual-balance/components/BalanceChatInput.tsx` - Replaced Input with auto-expanding Textarea, added ref + resize effect
- `src/App.tsx` - Removed duplicate Toaster import and JSX

## Decisions Made
- Extracted fetchMessages as a stable useCallback instead of keeping it inline in useEffect -- enables retry from error UI while maintaining the same function reference
- Removed the cancelled guard from useEffect since fetchMessages is a stable callback -- simplifies the effect while maintaining correctness
- Changed container alignment from items-center to items-end in BalanceChatInput so the send button stays bottom-aligned when textarea grows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error handling, offline detection, and input polish complete
- Ready for Plan 02 (remaining polish/edge-case work)

---
*Phase: 10-polish-edge-cases*
*Completed: 2026-02-10*
