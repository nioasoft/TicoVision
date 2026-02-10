---
phase: 07-unread-indicators
verified: 2026-02-10T12:15:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 7: Unread Indicators Verification Report

**Phase Goal:** Users can see which balances have unread messages and filter the table to show only those with unreads
**Verified:** 2026-02-10T12:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Each balance row shows a red badge with unread count on the chat icon when user has unread messages | ✓ VERIFIED | Badge rendered on lines 304-308 of BalanceTable.tsx with conditional display `(unreadCounts[row.id] ?? 0) > 0` |
| 2 | Badge displays '99+' when unread count exceeds 99 | ✓ VERIFIED | Ternary expression on line 306: `unreadCounts[row.id] > 99 ? '99+' : unreadCounts[row.id]` |
| 3 | User can toggle a filter to show only balances with unread messages | ✓ VERIFIED | Toggle button on lines 173-181 of BalanceFilters.tsx with Hebrew text "הודעות שלא נקראו" |
| 4 | Unread badge count updates in real-time when new messages arrive (no page refresh) | ✓ VERIFIED | Realtime subscription on lines 78-105 of AnnualBalancePage.tsx listening to balance_chat_read_tracking UPDATE events |
| 5 | Badge clears immediately when user opens the chat panel (optimistic) | ✓ VERIFIED | handleChatClick on line 147 calls clearUnreadCount(row.id) before chat opens |
| 6 | Unread counts refresh on page mount (handles navigation away and back) | ✓ VERIFIED | fetchUnreadCounts() called in useEffect on line 74 alongside fetchCases and fetchDashboardStats |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/modules/annual-balance/store/annualBalanceStore.ts` | unreadCounts map, fetchUnreadCounts, updateUnreadCount, clearUnreadCount actions | ✓ VERIFIED | Lines 31 (state), 66 (init), 117-144 (actions) - all present and substantive |
| `src/modules/annual-balance/types/annual-balance.types.ts` | hasUnread field in BalanceFilters interface | ✓ VERIFIED | Line 221: `hasUnread?: boolean;` added to interface |
| `src/modules/annual-balance/pages/AnnualBalancePage.tsx` | Realtime subscription, optimistic clear, client-side filter | ✓ VERIFIED | Lines 78-105 (Realtime), 147 (optimistic clear), 184-187 (filter useMemo), all wired correctly |
| `src/modules/annual-balance/components/BalanceTable.tsx` | Unread badge on MessageCircle icon with 99+ cap | ✓ VERIFIED | Lines 294-310: Badge with proper RTL positioning (-end-1), 99+ cap, pointer-events-none |
| `src/modules/annual-balance/components/BalanceFilters.tsx` | Toggle button for unread-only filter | ✓ VERIFIED | Lines 173-181: MessageCircle icon, variant toggle, Hebrew text, wired to onFiltersChange |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| AnnualBalancePage.tsx | annualBalanceStore.fetchUnreadCounts | useEffect on mount | ✓ WIRED | Line 74: fetchUnreadCounts() called in mount effect alongside fetchCases/fetchDashboardStats |
| AnnualBalancePage.tsx | balance_chat_read_tracking Realtime | supabase.channel subscription | ✓ WIRED | Lines 82-100: Channel subscription with UPDATE event listener, cleanup on line 103 |
| AnnualBalancePage.tsx | annualBalanceStore.clearUnreadCount | handleChatClick callback | ✓ WIRED | Line 147: clearUnreadCount(row.id) called in handleChatClick before opening chat |
| BalanceTable.tsx | unreadCounts prop | prop passed from AnnualBalancePage | ✓ WIRED | Line 318: unreadCounts prop passed, line 306: used in badge render logic |
| BalanceFilters.tsx | hasUnread filter | onFiltersChange callback | ✓ WIRED | Line 177: onClick toggles hasUnread via onFiltersChange, line 62: included in hasActiveFilters check |

### Requirements Coverage

No explicit requirements mapped to this phase in REQUIREMENTS.md. Phase requirements are defined in ROADMAP.md:
- UNRD-01: Unread badge on table rows ✓ SATISFIED
- UNRD-02: Filter toggle for unread-only view ✓ SATISFIED
- UNRD-03: Real-time badge updates ✓ SATISFIED

### Anti-Patterns Found

None. All files are clean.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| - | - | - | - | - |

No TODO, FIXME, or placeholder implementations detected. All implementations are substantive and production-ready.

### Human Verification Required

#### 1. Visual Badge Display

**Test:** Open the annual balance page while having unread messages for at least one balance
**Expected:** 
- Red circular badge appears on the chat icon (MessageCircle) for balances with unreads
- Badge shows numeric count (e.g., "3") for counts 1-99
- Badge shows "99+" for counts >= 100
- Badge is positioned at the top-left corner of the chat icon (RTL layout)
**Why human:** Visual appearance and positioning require human eye verification

#### 2. Filter Toggle Behavior

**Test:** Click the "הודעות שלא נקראו" button in the filters bar
**Expected:**
- Button changes from outline to solid (default variant) when active
- Table immediately filters to show only balances with unread counts > 0
- All other balances are hidden from view
- Click again to deactivate filter and restore full table
- Filter state is included in "reset" button detection (reset button appears when filter is active)
**Why human:** Interactive filter behavior and visual feedback need user testing

#### 3. Real-time Badge Updates

**Test:** Have two browser windows open (different users or same user in incognito):
1. Window A: Viewing the annual balance table with a balance showing 0 unreads
2. Window B: Send a new message to that balance's chat
**Expected:**
- Window A: Badge appears on the chat icon within 2 seconds without page refresh
- Badge count increments correctly (1 → 2 → 3) as more messages arrive
**Why human:** Real-time behavior requires multi-window testing, timing verification

#### 4. Optimistic Badge Clear

**Test:** Click the chat icon on a balance row with an unread badge
**Expected:**
- Badge disappears immediately (before the sheet fully opens)
- Chat sheet opens with all messages visible
- If you close the chat and reopen, badge should NOT reappear (server confirmed read)
**Why human:** Timing of optimistic update vs. server sync needs human observation

#### 5. Page Mount Behavior

**Test:** 
1. Navigate to annual balance page with unreads
2. Note which balances have badges
3. Navigate away (e.g., to dashboard)
4. Navigate back to annual balance page
**Expected:**
- Unread badges reappear correctly for the same balances
- Counts are accurate (fetched from server on mount)
**Why human:** Navigation state persistence and data refresh needs route testing

#### 6. RTL Layout Verification

**Test:** Inspect the badge positioning in Hebrew RTL interface
**Expected:**
- Badge appears at the TOP-LEFT corner of the chat icon (which is the "end" in RTL)
- Badge does not overlap with adjacent UI elements
- Text "הודעות שלא נקראו" is right-aligned in the filter button
- MessageCircle icon appears to the left of the text (RTL button layout)
**Why human:** RTL layout correctness requires visual inspection

### Gaps Summary

None. All must-haves are verified and functional.

## Technical Implementation Summary

**Zustand State Management:**
- `unreadCounts` map stores balance_id → count (sparse, only non-zero entries)
- `fetchUnreadCounts` loads initial state from `balanceChatService.getUnreadCounts()`
- `updateUnreadCount` updates a single balance count (from Realtime)
- `clearUnreadCount` removes entry (optimistic on chat open)

**Realtime Subscription:**
- Subscribes to `balance_chat_read_tracking` table UPDATE events
- Filtered by tenant_id for multi-tenant isolation
- Calls `updateUnreadCount` with new count from payload
- Cleanup via `supabase.removeChannel(channel)` on unmount

**Client-Side Filtering:**
- `filteredCases` useMemo filters cases array when `filters.hasUnread` is true
- No server-side query modification (keeps getAll simple)
- Filter is reactive to both cases and unreadCounts changes

**Badge Rendering:**
- Conditional render: `(unreadCounts[row.id] ?? 0) > 0`
- 99+ cap: `unreadCounts[row.id] > 99 ? '99+' : unreadCounts[row.id]`
- RTL positioning: `-end-1` (top-left in RTL)
- Pointer events disabled to allow click-through to button

**UI/UX Features:**
- Badge is red (bg-red-500) for high visibility
- Small font (text-[10px]) to fit compact badge
- Toggle button uses MessageCircle icon for consistency
- Filter button included in hasActiveFilters check for reset button

---

_Verified: 2026-02-10T12:15:00Z_
_Verifier: Claude (gsd-verifier)_
