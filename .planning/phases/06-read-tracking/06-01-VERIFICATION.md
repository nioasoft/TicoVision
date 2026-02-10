---
phase: 06-read-tracking
verified: 2026-02-10T10:15:00Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 6: Read Tracking Verification Report

**Phase Goal:** Messages are marked as read when user opens the chat, with denormalized counters for performance
**Verified:** 2026-02-10T10:15:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | When user opens a chat panel, their unread count for that balance resets to zero | ✓ VERIFIED | `markAsRead()` method exists, called in `BalanceChatSheet.tsx` line 87, uses upsert to set `unread_count = 0` |
| 2 | When a new message is inserted, unread counters increment for all tracked users except the sender | ✓ VERIFIED | `trigger_increment_chat_unread` on `balance_chat_messages` table, SECURITY DEFINER function updates all rows WHERE `user_id != NEW.user_id` |
| 3 | Unread count is stored as a denormalized integer column, not calculated via COUNT queries | ✓ VERIFIED | `balance_chat_read_tracking.unread_count INTEGER NOT NULL DEFAULT 0` in migration, no COUNT queries found in service methods |
| 4 | Users who have never opened a chat have no tracking row (correct: they are not following that chat) | ✓ VERIFIED | Trigger only updates existing rows (lines 70-76 in migration), new rows created via upsert on first `markAsRead` call |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260210_balance_chat_read_tracking.sql` | Table, indexes, RLS, trigger, Realtime publication | ✓ VERIFIED | 91 lines, contains CREATE TABLE (line 7), 2 indexes (lines 22, 26), 3 RLS policies (lines 31-50), updated_at trigger (line 55), increment trigger function (line 61), message trigger (line 83), Realtime publication (line 90) |
| `src/modules/annual-balance/services/balance-chat.service.ts` | markAsRead and getUnreadCounts methods | ✓ VERIFIED | `markAsRead()` lines 273-301, `getUnreadCounts()` lines 312-337, both use correct types and patterns |
| `src/modules/annual-balance/components/BalanceChatSheet.tsx` | markAsRead call on sheet open | ✓ VERIFIED | Line 87 calls `balanceChatService.markAsRead(balanceCase.id)` after messages load, fire-and-forget pattern |
| `src/types/database.types.ts` | TypeScript types for balance_chat_read_tracking | ✓ VERIFIED | Line 373 contains `balance_chat_read_tracking` with Row/Insert/Update types (auto-generated) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| BalanceChatSheet.tsx | balance-chat.service.ts | `markAsRead(balanceCase.id)` | ✓ WIRED | Line 87 calls service method with balance ID |
| balance-chat.service.ts | balance_chat_read_tracking table | `supabase.from('balance_chat_read_tracking').upsert()` | ✓ WIRED | Lines 284-294 upsert with onConflict, lines 321-325 select for getUnreadCounts |
| trigger function | balance_chat_read_tracking table | AFTER INSERT trigger on balance_chat_messages | ✓ WIRED | Lines 83-87 create trigger, lines 61-80 define SECURITY DEFINER function, lines 70-76 UPDATE tracking table |

### Requirements Coverage

No explicit requirements mapped to Phase 06 in REQUIREMENTS.md.

### Anti-Patterns Found

None. All files are clean implementations:
- No TODO/FIXME/PLACEHOLDER comments
- No empty implementations or console.log-only stubs
- No hardcoded values that should be configurable
- Proper error handling in all service methods
- TypeScript strict mode compliance

### Human Verification Required

#### 1. Real-time counter increment test
**Test:** 
1. Have User A open a balance chat panel (creates tracking row)
2. Have User B send a message to that balance
3. Verify User A's `unread_count` increments by 1 without User A refreshing

**Expected:** User A's tracking row updates automatically via trigger

**Why human:** Requires multi-user session simulation and database inspection

#### 2. Counter reset on panel open
**Test:**
1. Send 3 messages to a balance while User A is not viewing it
2. Verify User A has `unread_count = 3`
3. User A opens the balance chat panel
4. Verify User A's `unread_count` resets to 0

**Expected:** Counter resets after panel opens and messages load

**Why human:** Requires timing verification between UI action and database state

#### 3. Sender exclusion verification
**Test:**
1. User A has tracking row with `unread_count = 5` for Balance X
2. User A sends a message to Balance X
3. Verify User A's `unread_count` remains 5 (does not increment)

**Expected:** Sender's own counter is not incremented by their messages

**Why human:** Requires specific user context and database state inspection

#### 4. First-time tracking row creation
**Test:**
1. Create a new balance chat with no tracking rows
2. User A opens the chat panel for the first time
3. Verify tracking row is created with `unread_count = 0`
4. User B sends a message
5. Verify User A's tracking row now has `unread_count = 1`

**Expected:** Upsert creates row on first visit, trigger increments after

**Why human:** Requires database inspection to verify row creation timing

### Technical Notes

**Phase completed successfully with no deviations from plan.**

**Key implementation details:**
- Migration applied via Supabase Management API (consistent with Phase 1 pattern)
- `SECURITY DEFINER` on trigger function allows it to bypass RLS and update other users' rows
- Partial index `WHERE unread_count > 0` optimizes badge queries in Phase 7
- Fire-and-forget `markAsRead` call (not awaited) prevents UI blocking
- `markAsRead` called AFTER messages load to minimize race condition window

**Database verification (from SUMMARY.md self-check):**
- Table exists with UNIQUE constraint on `(tenant_id, balance_id, user_id)`
- 3 RLS policies active (SELECT/INSERT/UPDATE own rows only)
- Trigger `trigger_increment_chat_unread` exists on `balance_chat_messages`
- Table added to `supabase_realtime` publication for Phase 7

**Code quality:**
- TypeScript typecheck passes with no errors
- All service methods follow BaseService patterns
- Proper tenant isolation via `getTenantId()`
- Error handling with ServiceResponse pattern
- JSDoc comments on all public methods

---

_Verified: 2026-02-10T10:15:00Z_
_Verifier: Claude (gsd-verifier)_
