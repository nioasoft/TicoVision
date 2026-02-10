# Phase 7: Unread Indicators - Research

**Researched:** 2026-02-10
**Domain:** Realtime Supabase subscriptions, Zustand global state, UI badge rendering, table filtering
**Confidence:** HIGH

## Summary

This phase surfaces the denormalized unread counters (built in Phase 6) as visual badges in the balance table and adds a filter toggle to show only balances with unread messages. The infrastructure is fully in place: the `balance_chat_read_tracking` table exists with `unread_count` column, the trigger increments it on message insert, `markAsRead` resets it on chat open, `getUnreadCounts()` returns a `Record<string, number>` map, and the table is already in the `supabase_realtime` publication for live UPDATE events.

The implementation has three layers: (1) **state management** -- a new Zustand slice (or extension of the existing `annualBalanceStore`) to hold unread counts and expose them to components; (2) **Realtime subscription** -- subscribe to UPDATE events on `balance_chat_read_tracking` filtered by `tenant_id` to receive live counter changes (RLS ensures each user only sees their own rows); (3) **UI layer** -- an unread badge component on the chat icon in `BalanceTable`, a filter toggle in `BalanceFilters`, and a "99+" cap for visual consistency.

The prior decisions from the architecture phase constrain the approach: server-side Realtime filter on `tenant_id` only (single-column Supabase limitation), client-side filtering by `balance_id`, chat icon in the existing quick-action column (no new table column), and a dual dedup strategy for optimistic + Realtime race conditions.

**Primary recommendation:** Extend `annualBalanceStore` with an `unreadCounts` map and a `fetchUnreadCounts` action that calls `balanceChatService.getUnreadCounts()`. Add a Realtime subscription in the page-level component (`AnnualBalancePage`) for UPDATE events on `balance_chat_read_tracking`, updating the store map when counts change. Render a red badge on the `MessageCircle` icon and add a toggle button in `BalanceFilters` for client-side filtering.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.x (already in project) | Global unread counts state accessible to table + filters | Already used for `annualBalanceStore` and `chatStore` |
| Supabase Realtime `postgres_changes` | @supabase/supabase-js 2.x | Live UPDATE events on `balance_chat_read_tracking` | Already used for `balance_chat_messages` INSERT events in Phase 4 |
| shadcn/ui Badge | Existing in project | Unread count display | Standard UI component, already imported in `BalanceTable.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `balanceChatService.getUnreadCounts()` | Phase 6 (built) | Initial data fetch on page load | Called once when page mounts, returns `Record<string, number>` |
| `balanceChatService.markAsRead()` | Phase 6 (built) | Reset counter when chat opens | Already called in `BalanceChatSheet.tsx` useEffect |
| lucide-react `MessageCircle` | Existing | Chat icon in quick-action column | Already used in `BalanceTable.tsx` line 34 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `annualBalanceStore` | Separate `useUnreadStore` Zustand store | Separate store is cleaner architecturally but adds another provider/subscription lifecycle. At current scale (single page consuming both), extending is simpler |
| Realtime `postgres_changes` UPDATE on tracking table | Realtime on `balance_chat_messages` INSERT + local increment | Would avoid a second subscription but requires duplicating the trigger logic client-side and handling dedup with the already-running BalanceChatSheet subscription |
| Client-side filter toggle | Server-side filter (JOIN in getAll query) | Server-side would be more correct for paginated results, but adds query complexity. With ~1335 balances and max 35 tracking rows, client-side filter on the fetched page is adequate |

## Architecture Patterns

### Recommended Data Flow

```
[DB trigger] --> UPDATE balance_chat_read_tracking
                      |
                      v
            [Supabase Realtime]
                      |
                      v (RLS: only own rows)
         [AnnualBalancePage useEffect]
                      |
                      v
           [annualBalanceStore.unreadCounts]
                      |
              +-------+-------+
              |               |
              v               v
       [BalanceTable]   [BalanceFilters]
       (badge on icon)  (toggle filter)
```

### Pattern 1: Zustand Store Extension for Unread Counts
**What:** Add `unreadCounts: Record<string, number>` and `fetchUnreadCounts()` to the existing `annualBalanceStore`.
**When to use:** Always -- the unread counts are consumed on the same page as the balance table data.
**Why extend vs. new store:** The `AnnualBalancePage` already uses `useAnnualBalanceStore`. Adding unread state there avoids a second store subscription and keeps related data co-located. The `chatStore` is for the channel-based chat system (different module).

```typescript
// Source: Extend existing annualBalanceStore.ts
interface AnnualBalanceState {
  // ... existing fields ...

  // Unread counts: balance_id -> count (only non-zero entries)
  unreadCounts: Record<string, number>;
  fetchUnreadCounts: () => Promise<void>;
  updateUnreadCount: (balanceId: string, count: number) => void;
  clearUnreadCount: (balanceId: string) => void;
}

// In the create() block:
unreadCounts: {},

fetchUnreadCounts: async () => {
  const result = await balanceChatService.getUnreadCounts();
  if (result.data) {
    set({ unreadCounts: result.data });
  }
},

updateUnreadCount: (balanceId: string, count: number) => {
  set((state) => {
    const updated = { ...state.unreadCounts };
    if (count > 0) {
      updated[balanceId] = count;
    } else {
      delete updated[balanceId];
    }
    return { unreadCounts: updated };
  });
},

clearUnreadCount: (balanceId: string) => {
  set((state) => {
    const updated = { ...state.unreadCounts };
    delete updated[balanceId];
    return { unreadCounts: updated };
  });
},
```

### Pattern 2: Realtime Subscription for Tracking Table Updates
**What:** Subscribe to UPDATE events on `balance_chat_read_tracking` with server-side `tenant_id` filter. RLS ensures only the current user's rows are delivered.
**When to use:** On page mount, alongside the existing data fetch.
**Critical detail:** The trigger (SECURITY DEFINER) updates rows for all tracked users. Supabase Realtime checks the SELECT RLS policy to determine which subscribers receive each event. Since the RLS policy requires `user_id = auth.uid()`, each user only receives UPDATE events for their own tracking rows.

```typescript
// Source: Add to AnnualBalancePage.tsx or a custom hook useUnreadRealtime()
useEffect(() => {
  if (!tenantId) return;

  const channel = supabase
    .channel(`unread-tracking:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'balance_chat_read_tracking',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const row = payload.new as {
          balance_id: string;
          unread_count: number;
        };
        updateUnreadCount(row.balance_id, row.unread_count);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tenantId, updateUnreadCount]);
```

### Pattern 3: Badge Component on Chat Icon
**What:** A small red circle badge showing unread count, positioned on the `MessageCircle` icon in the quick-action column.
**When to use:** When `unreadCounts[row.id] > 0` for a given balance row.
**Visual spec:** Red background, white text, rounded-full, positioned absolute on the icon container. Shows "99+" when count exceeds 99.

```typescript
// Source: In BalanceTable.tsx, modify the chat icon button
{canAccessBalanceChat(userRole, userId, { auditor_id: row.auditor_id }) && (
  <div className="relative">
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => onChatClick(row)}
    >
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
    </Button>
    {unreadCounts[row.id] > 0 && (
      <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium px-0.5">
        {unreadCounts[row.id] > 99 ? '99+' : unreadCounts[row.id]}
      </span>
    )}
  </div>
)}
```

### Pattern 4: Filter Toggle for Unread-Only Balances
**What:** A toggle button/checkbox in `BalanceFilters` that filters the currently displayed cases to show only those with unread messages.
**When to use:** User wants to focus on balances that need attention.
**Implementation approach:** Client-side filter on the already-fetched `cases` array. The filter checks `unreadCounts[case.id] > 0`.

```typescript
// Source: In BalanceFilters.tsx, add a toggle button
// In BalanceFilters type (annual-balance.types.ts):
export interface BalanceFilters {
  // ... existing fields ...
  hasUnread?: boolean;
}

// In BalanceFilters.tsx:
<Button
  variant={filters.hasUnread ? "default" : "outline"}
  size="sm"
  className="h-9 text-sm gap-1.5"
  onClick={() => onFiltersChange({ hasUnread: filters.hasUnread ? undefined : true })}
>
  <MessageCircle className="h-3.5 w-3.5" />
  הודעות שלא נקראו
</Button>
```

**Filtering approach decision:** The `hasUnread` filter should be applied **client-side** rather than adding a server-side JOIN. Reason: the unread counts are per-user and already loaded in the Zustand store. Adding a server-side filter would require a JOIN to `balance_chat_read_tracking` in the `getAll` query, which complicates the paginated query and mixes chat concerns into the balance listing service. Client-side filtering on the fetched page is adequate at current scale (20 items per page, ~1335 total balances).

**Implementation nuance:** Client-side filtering means the page may show fewer than `pageSize` items when the filter is active. This is acceptable at current scale. If it becomes an issue, the filter can be promoted to server-side later.

### Pattern 5: Optimistic Unread Count Reset on Chat Open
**What:** When the user clicks the chat icon, immediately clear the badge in the store before `markAsRead` completes on the server.
**When to use:** Every time `onChatClick` fires.
**Why:** Prevents a visual delay where the badge persists while the upsert round-trips to the server.

```typescript
// Source: In AnnualBalancePage.tsx handleChatClick
const handleChatClick = useCallback((row: AnnualBalanceSheetWithClient) => {
  setChatBalanceCase(row);
  setChatOpen(true);
  // Optimistically clear the unread badge
  clearUnreadCount(row.id);
}, [clearUnreadCount]);
```

### Anti-Patterns to Avoid
- **Subscribing to the tracking table from BalanceChatSheet:** The sheet is already subscribed to `balance_chat_messages` INSERT events. Adding a second subscription for the same balance's tracking updates would be redundant -- the sheet is already open, the user sees the messages directly, and `markAsRead` will fire.
- **Using a separate Zustand store:** Creates unnecessary indirection when the same page component (`AnnualBalancePage`) already uses `annualBalanceStore` for all its state.
- **Server-side unread filter in getAll query:** Adds a JOIN to the paginated query, mixing chat concerns into the balance listing service. Client-side filtering is adequate at current scale.
- **Polling instead of Realtime:** The tracking table is already in the Realtime publication. Polling would be wasteful and add latency.
- **Pre-populating tracking rows for all users:** Phase 6 decision: rows are only created when a user first opens a chat. Users with no tracking row have no unread badge (correct: they haven't started following that chat).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unread count state management | Custom React context/provider | Zustand store extension | Already using Zustand for all module state, proven pattern |
| Badge component | Custom div with absolute positioning | Follow existing `UnreadBadge.tsx` pattern from chat module | Consistent styling, proven RTL-safe positioning with `-start-1` |
| Realtime subscription lifecycle | Manual channel management in component | `useEffect` with cleanup following Phase 4's `BalanceChatSheet` pattern | Proven cleanup pattern with `supabase.removeChannel()` |
| Unread count formatting (99+ cap) | Complex formatting logic | Simple ternary `count > 99 ? '99+' : count` | Requirement is explicit: cap at 99+ |

**Key insight:** Phase 6 built all the hard infrastructure (table, trigger, service methods, Realtime publication). Phase 7 is purely a UI consumption phase -- fetching data, subscribing to changes, and rendering badges. No new database work is needed.

## Common Pitfalls

### Pitfall 1: Realtime UPDATE Events Not Received
**What goes wrong:** The subscription to `balance_chat_read_tracking` UPDATE events never fires, badges don't update in real-time.
**Why it happens:** Three possible causes: (1) the table is not in `supabase_realtime` publication, (2) RLS SELECT policy blocks the event, (3) the channel filter is wrong.
**How to avoid:** The table is already in the publication (verified: `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'` returns `balance_chat_read_tracking`). The RLS SELECT policy has `user_id = auth.uid()`, which means Realtime will only deliver events to the row's owner. The filter must use `tenant_id=eq.${tenantId}` (single column, same pattern as Phase 4).
**Warning signs:** Badge only updates after page refresh, never in real-time.

### Pitfall 2: Race Between Optimistic Clear and Realtime Increment
**What goes wrong:** User opens chat -> optimistic clear removes badge -> Realtime event from the trigger's UPDATE (setting count to 0) arrives and sets count to 0 (no-op). But if a NEW message arrives while the chat is open, the trigger increments the count to 1, Realtime delivers the UPDATE, and the badge reappears even though the user is currently viewing the chat.
**Why it happens:** The user has the chat open but the trigger doesn't know that. It increments the counter for all tracked users except the sender.
**How to avoid:** When the chat sheet is open for a specific balance, suppress badge updates for that balance in the Realtime handler. Check: if `chatOpen && chatBalanceCase?.id === row.balance_id`, skip the store update. Alternatively, accept the brief flash -- when the user closes the chat, `markAsRead` fires again (already implemented in Phase 6) and the badge will clear.
**Recommendation:** Accept the brief flash at current scale. The badge will show momentarily then clear when `markAsRead` fires. The user won't be confused because the chat is open and they can see the message.

### Pitfall 3: Client-Side Filter Showing Fewer Than pageSize Items
**What goes wrong:** User enables "show unread only" filter. Of the 20 items on the current page, only 3 have unreads. The page shows 3 items with lots of empty space.
**Why it happens:** Client-side filtering reduces the displayed count below `pageSize` without fetching more items from the server.
**How to avoid:** At current scale (10 users, ~1335 balances, very few unreads), this is expected behavior. The user understands they're filtering. If this becomes problematic at scale, promote the filter to server-side with a JOIN query.
**Warning signs:** Users complaining about mostly-empty pages when using the filter.

### Pitfall 4: Stale Unread Counts After Page Navigation
**What goes wrong:** User navigates away from the balance page and comes back. The Realtime subscription was cleaned up on unmount, but unreads may have changed while away.
**Why it happens:** The Realtime subscription only runs while the page is mounted. Changes that occur while unmounted are missed.
**How to avoid:** Call `fetchUnreadCounts()` on page mount alongside `fetchCases()`. This ensures fresh data on every visit. The Realtime subscription handles changes while the page is open.
**Warning signs:** Badges don't reflect messages sent while user was on a different page.

### Pitfall 5: RTL Badge Positioning
**What goes wrong:** The unread badge appears on the wrong side of the icon in RTL layout.
**Why it happens:** Using `right-*` instead of `end-*` (logical properties) for positioning.
**How to avoid:** Use `-end-1` instead of `-right-1` for the badge position. The existing `UnreadBadge.tsx` in the chat module uses `-start-1` (which is correct for its context -- nav icon). For the table icon, use `-end-1` to position at the leading edge in RTL.
**Warning signs:** Badge visually overlaps the wrong edge of the icon.

### Pitfall 6: Memory Leak from Realtime Subscription
**What goes wrong:** Navigating away from the balance page without cleaning up the Realtime channel causes a subscription leak.
**Why it happens:** Missing cleanup return in `useEffect`, or using a stale closure.
**How to avoid:** Follow the exact same pattern as `BalanceChatSheet.tsx` lines 169-181: create channel in effect body, return cleanup function that calls `supabase.removeChannel(channel)`.
**Warning signs:** Network tab shows WebSocket messages for a page the user is no longer viewing.

## Code Examples

### Example 1: Store Extension

```typescript
// Source: Extend existing annualBalanceStore.ts

// Add to AnnualBalanceState interface:
unreadCounts: Record<string, number>;
fetchUnreadCounts: () => Promise<void>;
updateUnreadCount: (balanceId: string, count: number) => void;
clearUnreadCount: (balanceId: string) => void;

// Add to create() initial state:
unreadCounts: {},

// Add to create() actions:
fetchUnreadCounts: async () => {
  const result = await balanceChatService.getUnreadCounts();
  if (result.data) {
    set({ unreadCounts: result.data });
  }
},

updateUnreadCount: (balanceId: string, count: number) => {
  set((state) => {
    const updated = { ...state.unreadCounts };
    if (count > 0) {
      updated[balanceId] = count;
    } else {
      delete updated[balanceId];
    }
    return { unreadCounts: updated };
  });
},

clearUnreadCount: (balanceId: string) => {
  set((state) => {
    const updated = { ...state.unreadCounts };
    delete updated[balanceId];
    return { unreadCounts: updated };
  });
},
```

### Example 2: Realtime Subscription Hook

```typescript
// Source: In AnnualBalancePage.tsx or extracted to useUnreadRealtime.ts

useEffect(() => {
  if (!tenantId) return;

  // Fetch initial counts
  fetchUnreadCounts();

  // Subscribe to live updates
  const channel = supabase
    .channel(`unread-tracking:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'balance_chat_read_tracking',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const row = payload.new as {
          balance_id: string;
          unread_count: number;
        };
        updateUnreadCount(row.balance_id, row.unread_count);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tenantId, fetchUnreadCounts, updateUnreadCount]);
```

### Example 3: Badge in BalanceTable

```typescript
// Source: Modify BalanceTable.tsx quick-action cell

// BalanceTable needs a new prop:
interface BalanceTableProps {
  // ... existing props ...
  unreadCounts: Record<string, number>;
}

// In the table row, replace the plain MessageCircle button:
{canAccessBalanceChat(userRole, userId, { auditor_id: row.auditor_id }) && (
  <div className="relative">
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => onChatClick(row)}
    >
      <MessageCircle className="h-4 w-4 text-muted-foreground" />
    </Button>
    {(unreadCounts[row.id] ?? 0) > 0 && (
      <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-medium px-0.5 pointer-events-none">
        {unreadCounts[row.id] > 99 ? '99+' : unreadCounts[row.id]}
      </span>
    )}
  </div>
)}
```

### Example 4: Filter Toggle in BalanceFilters

```typescript
// Source: Add to BalanceFilters.tsx, near the "Show Inactive" toggle

import { MessageCircle } from 'lucide-react';

// In the filter bar:
<Button
  variant={filters.hasUnread ? "default" : "outline"}
  size="sm"
  className="h-9 text-sm gap-1.5 rounded-lg"
  onClick={() => onFiltersChange({ hasUnread: filters.hasUnread ? undefined : true })}
>
  <MessageCircle className="h-3.5 w-3.5" />
  הודעות שלא נקראו
</Button>
```

### Example 5: Client-Side Filtering in AnnualBalancePage

```typescript
// Source: In AnnualBalancePage.tsx, filter cases before passing to BalanceTable

const filteredCases = useMemo(() => {
  if (!filters.hasUnread) return cases;
  return cases.filter((c) => (unreadCounts[c.id] ?? 0) > 0);
}, [cases, filters.hasUnread, unreadCounts]);

// Pass filteredCases to BalanceTable instead of cases
<BalanceTable
  cases={filteredCases}
  // ... other props
  unreadCounts={unreadCounts}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Channel-based chat `getUnreadCount()` uses timestamp + client-side filtering (chatStore.ts line 117-125) | Denormalized `unread_count` column with O(1) lookup via `getUnreadCounts()` map | Phase 6 (this project) | No COUNT queries, instant badge data |
| Individual polling for unread state | Realtime subscription on tracking table UPDATE events | Phase 7 (this project) | Live updates without polling, leverages existing Realtime infrastructure |

## Open Questions

1. **Should the Realtime subscription also listen for INSERT events on the tracking table?**
   - What we know: INSERT events would fire when a user first opens a chat (markAsRead creates the row). At that point the unread_count is 0, so no badge change.
   - What's unclear: Could there be an edge case where an INSERT with unread_count > 0 matters?
   - Recommendation: No. The trigger only UPDATEs existing rows. The INSERT always has unread_count = 0 (from markAsRead upsert). Only subscribe to UPDATE events.

2. **Should the filter be additive or exclusive with other filters?**
   - What we know: The `hasUnread` filter is client-side and applies after all server-side filters (status, auditor, year, search). So if a user filters by status=in_progress AND hasUnread, they see only in-progress balances with unread messages.
   - What's unclear: Is this the expected UX?
   - Recommendation: Yes, additive filtering is standard. The filter reduces the already-filtered set.

3. **Should markAsRead also fire when the chat sheet receives a new Realtime message while open?**
   - What we know: Phase 6 research (open question #2) recommended this. Currently markAsRead only fires on chat open. If a new message arrives via Realtime while the chat is open, the trigger increments the counter, causing a brief badge flash.
   - What's unclear: Will users notice the brief flash?
   - Recommendation: Add a `markAsRead` call in the BalanceChatSheet's Realtime message handler to suppress the flash. This is a minor enhancement that keeps the badge accurate.

## Sources

### Primary (HIGH confidence)
- **Existing codebase:** `balance_chat_read_tracking` table schema, RLS policies, trigger -- verified in production database
- **Existing codebase:** `balanceChatService.getUnreadCounts()` method -- built in Phase 6, returns `Record<string, number>`
- **Existing codebase:** `balanceChatService.markAsRead()` -- built in Phase 6, upsert pattern
- **Existing codebase:** `BalanceTable.tsx` -- current column layout, chat icon in quick-action cell (line 292-301)
- **Existing codebase:** `annualBalanceStore.ts` -- current Zustand store structure, all state and actions
- **Existing codebase:** `BalanceFilters.tsx` -- current filter UI, `BalanceFilters` type
- **Existing codebase:** `AnnualBalancePage.tsx` -- page composition, state management, event handlers
- **Existing codebase:** `UnreadBadge.tsx` (chat module) -- existing unread badge pattern with RTL-safe positioning
- **Existing codebase:** `BalanceChatSheet.tsx` -- Realtime subscription pattern with cleanup (lines 169-181)
- **Database verification:** `balance_chat_read_tracking` confirmed in `supabase_realtime` publication
- **Database verification:** Replica identity is `d` (default) -- UPDATE events deliver `new` record only (sufficient: we only need `unread_count` and `balance_id`)

### Secondary (MEDIUM confidence)
- **Supabase Postgres Changes docs** (https://supabase.com/docs/guides/realtime/postgres-changes) -- single-column server-side filter limitation confirmed, UPDATE event subscription pattern verified
- **Supabase Realtime Authorization docs** (https://supabase.com/docs/guides/realtime/authorization) -- "Postgres Changes are separate from Channel authorization. When using Postgres Changes with RLS, database records are sent only to clients who are allowed to read them based on your RLS policies." -- confirms RLS-based event filtering for UPDATE events

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official Supabase documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist in the codebase (Zustand, Realtime subscriptions, shadcn Badge)
- Architecture: HIGH -- directly extends existing patterns, no new libraries or concepts
- Pitfalls: HIGH -- race conditions analyzed against actual code flow, RTL positioning verified against existing badge component

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, infrastructure already built in Phase 6)
