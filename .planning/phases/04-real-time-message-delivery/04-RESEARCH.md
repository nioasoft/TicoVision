# Phase 4: Real-time Message Delivery - Research

**Researched:** 2026-02-10
**Domain:** Supabase Realtime (postgres_changes), WebSocket lifecycle, deduplication, React subscription patterns
**Confidence:** HIGH

## Summary

Phase 4 adds real-time message delivery to the balance chat built in Phase 3. The core mechanism is Supabase Realtime `postgres_changes` listening for INSERT events on the `balance_chat_messages` table, which is already added to the `supabase_realtime` publication (confirmed in Phase 1 migration, line 87: `ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_messages`). The existing chat module (`src/modules/chat/`) already implements the identical pattern: `chatService.subscribeToMessages()` creates a channel with `postgres_changes` on `chat_messages`, `ChatPanel` subscribes on open and calls `supabase.removeChannel()` on cleanup, and `chatStore.addRealtimeMessage()` deduplicates against optimistic messages by ID.

The critical architectural constraint is that Supabase Realtime `postgres_changes` supports only **single-column server-side filters**. The project cannot filter by both `tenant_id` AND `balance_id` in one subscription. The existing chat module works around this by filtering on `tenant_id=eq.${tenantId}` at the server level and then doing client-side filtering by channel. For the balance chat, the same approach applies: filter on `tenant_id` server-side, then filter by `balance_id` client-side in the callback. This is acceptable for a 10-user system where the volume of cross-balance messages is low.

RLS policies on `balance_chat_messages` are automatically enforced by Supabase Realtime for `INSERT` events -- each subscribed client only receives events that their RLS SELECT policy permits. This provides tenant isolation at the Realtime layer without custom logic. The supabase-js SDK (v2.57.2 installed, v2.44.0 required) handles automatic reconnection with exponential backoff (1s, 2s, 5s, 10s) and heartbeat monitoring (25-second intervals).

**Primary recommendation:** Add a `subscribeToBalanceChat()` method to `BalanceChatService` that creates a Supabase Realtime channel filtered by `tenant_id`, with client-side `balance_id` filtering. Integrate it into `BalanceChatSheet` via a `useEffect` that subscribes on sheet open and calls `removeChannel()` on close. Use a `Set<string>` of message IDs for deduplication between optimistic sends and real-time arrivals.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.57.2 | Realtime channel + postgres_changes subscriptions | Already installed, well above v2.44.0 minimum for Realtime features |
| React (hooks) | 19 | useEffect for subscription lifecycle, useCallback for handlers | Project standard, no additional dependencies needed |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supabase` singleton | project | `supabase.channel()`, `supabase.removeChannel()` | All Realtime operations go through the singleton client |
| `useAuth` hook | project | Get `tenantId` for channel filter, `user.id` for dedup | Required for subscription setup |
| `sonner` (toast) | installed | Error notification on subscription failure | Connection error feedback |
| `BalanceChatService` | Phase 2 | Extend with `subscribeToBalanceChat()` method | Keeps Realtime logic co-located with other chat operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| postgres_changes (CDC) | Supabase Broadcast | Broadcast requires sender to explicitly broadcast; postgres_changes fires automatically on INSERT. CDC is simpler for DB-triggered events |
| Single tenant-scoped channel | Per-balance channel | Per-balance channel would require `balance_id` in filter, but multi-column filters are NOT supported server-side. Per-balance also means more channels for users viewing multiple balances |
| Client-side balance_id filtering | Composite column filter | Could add a `tenant_balance_key` column (e.g., `${tenant_id}:${balance_id}`) to enable single-column server-side filtering. Over-engineering for 10 users; client-side filtering is sufficient |
| useState (current Phase 3) | Zustand store for chat | Phase 3 decision noted "store can be added in Phase 4." However, the chat is a single-instance panel (one open at a time). useState with a dedup Set is sufficient. Zustand adds complexity without benefit until multi-panel or global notification features exist (Phase 9) |

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended File Structure
```
src/modules/annual-balance/
├── services/
│   └── balance-chat.service.ts   # MODIFIED - Add subscribeToBalanceChat() method
├── components/
│   └── BalanceChatSheet.tsx       # MODIFIED - Add Realtime subscription lifecycle
├── types/
│   └── balance-chat.types.ts     # NO CHANGE - existing types sufficient
└── hooks/
    └── useBalanceChatRealtime.ts  # NEW (optional) - Extract subscription hook if Sheet gets complex
```

### Pattern 1: Service-Level Subscription Method
**What:** Add a `subscribeToBalanceChat()` method to `BalanceChatService` that encapsulates channel creation, postgres_changes config, and returns the channel for cleanup
**When to use:** When the service already owns all data operations for a domain
**Example:**
```typescript
// Source: Adapted from src/modules/chat/services/chat.service.ts (lines 166-185)
subscribeToBalanceChat(
  tenantId: string,
  balanceId: string,
  onMessage: (message: BalanceChatMessageRow) => void
) {
  const channelName = `balance-chat:${tenantId}:${balanceId}`;

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'balance_chat_messages',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const newMsg = payload.new as BalanceChatMessageRow;
        // Client-side filter: only process messages for the open balance
        if (newMsg.balance_id === balanceId && !newMsg.is_deleted) {
          onMessage(newMsg);
        }
      }
    )
    .subscribe();
}
```
**Key details:**
- Channel name includes both `tenantId` AND `balanceId` for uniqueness (prevents collisions if user opens different balances)
- Server-side filter: `tenant_id=eq.${tenantId}` (single-column, supported)
- Client-side filter: `newMsg.balance_id === balanceId` (in callback)
- Returns the channel object for cleanup via `supabase.removeChannel()`

### Pattern 2: Subscription Lifecycle in useEffect
**What:** Subscribe when Sheet opens, clean up when Sheet closes or balance changes
**When to use:** Component-scoped subscriptions tied to open/close state
**Example:**
```typescript
// Source: Adapted from src/modules/chat/components/ChatPanel.tsx (lines 28-53)
useEffect(() => {
  if (!open || !balanceCase?.id || !tenantId) return;

  let channel: RealtimeChannel | null = null;

  channel = balanceChatService.subscribeToBalanceChat(
    tenantId,
    balanceCase.id,
    (newMessage) => {
      // Enrich with sender info and deduplicate
      handleRealtimeMessage(newMessage);
    }
  );

  return () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, [open, balanceCase?.id, tenantId]);
```
**Key details:**
- Cleanup function calls `supabase.removeChannel()` (not `channel.unsubscribe()`) -- this fully removes the channel from the Realtime client, matching the existing ChatPanel pattern
- Dependencies include `open`, `balanceCase?.id`, and `tenantId` -- re-subscribes when any change
- Guard clause prevents subscription when panel is closed

### Pattern 3: Deduplication via ID Set
**What:** Prevent duplicate messages when optimistic send + Realtime INSERT arrive for the same message
**When to use:** Any optimistic update + real-time subscription combination
**Example:**
```typescript
// Source: Adapted from src/modules/chat/store/chatStore.ts (lines 105-115)
const handleRealtimeMessage = useCallback((rawMsg: BalanceChatMessageRow) => {
  setMessages(prev => {
    // Dedup: check if message already exists (from optimistic send or reconnection)
    const exists = prev.some(m => m.id === rawMsg.id);
    if (exists) {
      // If it exists as optimistic (temp ID won't match server ID),
      // the optimistic already got replaced in handleSend success path.
      // If it exists with same ID, it's a true duplicate -- skip.
      return prev;
    }

    // Enrich with sender info
    const enriched: BalanceChatMessageWithSender = {
      ...rawMsg,
      sender_email: '', // Will need enrichment
      sender_name: '',  // Will need enrichment
    };

    return [...prev, enriched];
  });
}, []);
```
**Important nuance about optimistic + Realtime dedup:**
1. User A sends message -> optimistic ID = `crypto.randomUUID()` (temp)
2. Server inserts -> real ID = `gen_random_uuid()` (different from temp)
3. `sendMessage()` success replaces optimistic with real data (same real ID now in state)
4. Realtime INSERT arrives with real ID -> `exists` check catches it -> no duplicate

This means the dedup works naturally as long as:
- `sendMessage()` replaces the optimistic message with server data BEFORE the Realtime event arrives
- The `.some(m => m.id === rawMsg.id)` check uses the real server ID

If Realtime arrives BEFORE `sendMessage()` response (race condition):
- Realtime message gets added (new ID, not matching optimistic temp ID)
- Then `sendMessage()` success tries to replace optimistic -> finds it -> replaces it
- Now we have TWO copies (Realtime + replaced optimistic)

**Mitigation:** After replacing optimistic, do a final dedup pass, OR track optimistic messages separately (e.g., by `content + timestamp` fingerprint), OR accept the rare duplicate and add a cleanup filter.

### Pattern 4: Sender Enrichment for Realtime Messages
**What:** Realtime `postgres_changes` delivers raw DB rows without sender_name/sender_email. Need to enrich before display.
**When to use:** Whenever enriched types include joined data not in the raw table
**Example:**
```typescript
// Approach: Maintain a user map, enrich realtime messages on arrival
const [userMap, setUserMap] = useState<Map<string, { name: string; email: string }>>(new Map());

// Populate user map on initial fetch (getMessages already calls get_users_for_tenant)
useEffect(() => {
  if (!open || !balanceCase?.id) return;
  // ... existing fetch logic ...
  // After fetch, also build the user map from the enriched messages
  const map = new Map<string, { name: string; email: string }>();
  for (const msg of result.data ?? []) {
    if (!map.has(msg.user_id)) {
      map.set(msg.user_id, { name: msg.sender_name, email: msg.sender_email });
    }
  }
  setUserMap(map);
}, [open, balanceCase?.id]);

// Use map to enrich realtime messages
const enrichRealtime = (rawMsg: BalanceChatMessageRow): BalanceChatMessageWithSender => {
  const sender = userMap.get(rawMsg.user_id);
  return {
    ...rawMsg,
    sender_name: sender?.name ?? 'משתמש',
    sender_email: sender?.email ?? '',
  };
};
```
**Why this works for this project:** 10 users per tenant. The user map is tiny and rarely changes. For a new user not in the map, fallback to 'משתמש' (Hebrew for "User") is acceptable, and the full list refreshes on next sheet open.

### Anti-Patterns to Avoid
- **Don't filter by `balance_id` server-side:** Supabase Realtime does not support multi-column AND filters. Using `filter: \`balance_id=eq.${balanceId}\`` would work for that single column but loses tenant isolation at the server level. Always filter on `tenant_id` server-side (for security/volume) and `balance_id` client-side.
- **Don't create one channel per balance for all balances:** Opening channels for every balance visible in the table is wasteful. Only subscribe to the balance whose chat panel is open.
- **Don't use `channel.unsubscribe()` for cleanup:** The existing project pattern uses `supabase.removeChannel(channel)` which fully removes the channel from the client. `unsubscribe()` leaves the channel object alive in the client's internal registry.
- **Don't rely on Realtime for soft-delete events filtering:** The `is_deleted = false` filter in SELECT queries doesn't apply to Realtime. Realtime delivers raw INSERT events. Since we only listen for INSERT (not UPDATE), soft-delete UPDATEs are not a concern -- but if we later add UPDATE listeners, we'd need to check `is_deleted` client-side.
- **Don't create a Zustand store just for Phase 4:** The chat panel is single-instance. Local useState + useCallback in BalanceChatSheet is sufficient. A store adds indirection without benefit until Phase 7/9 need global unread state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket management | Manual WebSocket connection | `supabase.channel().on().subscribe()` | Handles reconnection, heartbeat, auth token refresh automatically |
| Channel cleanup | Manual event listener removal | `supabase.removeChannel(channel)` | Fully unsubscribes and removes from internal registry |
| Reconnection logic | Exponential backoff implementation | Built into supabase-js Realtime client | Automatic reconnect with 1s/2s/5s/10s backoff, heartbeat at 25s intervals |
| RLS enforcement on Realtime | Custom tenant check in callback | Supabase Realtime + RLS | RLS SELECT policies are automatically applied to postgres_changes INSERT events (server-side) |
| Message ordering | Custom sort on arrival | Database `created_at` ordering + append-only | Messages arrive in INSERT order; initial fetch is ORDER BY created_at ASC; new messages appended to end |
| Unique channel names | Manual collision avoidance | `balance-chat:${tenantId}:${balanceId}` convention | Namespaced by tenant and entity; prevents collisions across tenants and balances |

**Key insight:** Supabase Realtime handles the hard infrastructure problems (WebSocket lifecycle, reconnection, heartbeat, auth). This phase is about wiring the existing infrastructure into the React component lifecycle correctly -- not building messaging infrastructure.

## Common Pitfalls

### Pitfall 1: Multi-Column Filter Assumption
**What goes wrong:** Developer writes `filter: \`tenant_id=eq.${tenantId},balance_id=eq.${balanceId}\`` assuming AND logic
**Why it happens:** The REST API supports multi-column filters, but Realtime `postgres_changes` filters only support a single column
**How to avoid:** Always use single-column filter (tenant_id for security) + client-side filtering (balance_id in callback). This is the same pattern used by the existing `chatService.subscribeToMessages()`
**Warning signs:** All messages across all balances appear in the open chat panel; or no messages appear at all because the filter silently fails

### Pitfall 2: Duplicate Messages on Optimistic + Realtime Race
**What goes wrong:** A message appears twice: once from optimistic send, once from Realtime INSERT
**Why it happens:** Optimistic message uses `crypto.randomUUID()` (client-side temp ID). Server generates a different UUID via `gen_random_uuid()`. The Realtime event arrives with the server UUID which doesn't match the temp ID, bypassing dedup.
**How to avoid:** The `sendMessage()` success path replaces the optimistic message with server data (which has the real ID). The Realtime event then arrives and matches the real ID -> `exists` check catches it. The risk is if Realtime arrives BEFORE `sendMessage()` response. Mitigation: after replacing optimistic, deduplicate by checking for messages with identical `content + user_id + created_at` (within a 5-second window).
**Warning signs:** Same message text appears twice in quick succession; more common on slow networks where `sendMessage()` response is delayed.

### Pitfall 3: Stale Subscription After Balance Switch
**What goes wrong:** User opens chat for Balance A, then closes and opens for Balance B, but sees messages from Balance A
**Why it happens:** Previous channel not cleaned up before new one created. The old callback closure captures the old `balanceId`.
**How to avoid:** The `useEffect` cleanup function must call `supabase.removeChannel()` before the new subscription is created. React's `useEffect` cleanup runs before re-running with new deps, so this works naturally if deps include `balanceCase?.id`.
**Warning signs:** Messages from wrong balance appear; channel count grows unbounded in Supabase dashboard.

### Pitfall 4: Missing Sender Enrichment on Realtime Messages
**What goes wrong:** Realtime messages display with blank sender names
**Why it happens:** `postgres_changes` delivers raw DB rows. The `balance_chat_messages` table has `user_id` but not `sender_name`/`sender_email`. These are enriched by `getMessages()` via the `get_users_for_tenant` RPC, but Realtime bypasses that service method.
**How to avoid:** Build a `userMap` from the initial `getMessages()` response. Use it to enrich Realtime messages in the callback. For the sending user's own messages, the Realtime event won't even be displayed (the optimistic/replaced message is already showing). For other users, the map should contain their info from the initial fetch. If a brand-new user sends their first message and isn't in the map, fall back to `'משתמש'` (Hebrew: "User").
**Warning signs:** Other users' messages appear without names; messages from the sending user appear twice (one with name, one without).

### Pitfall 5: Subscription on Closed Panel
**What goes wrong:** Realtime messages trigger state updates on an unmounted component
**Why it happens:** The subscription callback fires after the Sheet closes, calling `setMessages` on unmounted state
**How to avoid:** The `useEffect` cleanup calls `supabase.removeChannel()` which unsubscribes. After removal, no more events fire. The existing pattern in `ChatPanel.tsx` handles this correctly. No additional "isMounted" flag needed because `removeChannel` is synchronous and prevents further callbacks.
**Warning signs:** React "Can't perform a state update on an unmounted component" warning in console (React 19 removed this warning, but the underlying issue of wasted computation remains).

### Pitfall 6: Channel Name Collision
**What goes wrong:** Two different balances share the same Realtime channel, causing cross-contamination
**Why it happens:** Channel name doesn't include `balanceId`, e.g., `balance-chat:${tenantId}` without the balance scope
**How to avoid:** Always include the entity ID in the channel name: `balance-chat:${tenantId}:${balanceId}`. This ensures each panel subscription is unique.
**Warning signs:** Messages from different balances appear in the same chat panel.

## Code Examples

Verified patterns from the existing codebase and official docs:

### Existing Realtime Subscription Pattern (from chat module)
```typescript
// Source: src/modules/chat/services/chat.service.ts (lines 166-185)
subscribeToMessages(
  tenantId: string,
  onMessage: (message: ChatMessage) => void
) {
  return supabase
    .channel(`chat:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();
}
```

### Existing Channel Cleanup Pattern (from ChatPanel)
```typescript
// Source: src/modules/chat/components/ChatPanel.tsx (lines 28-53)
useEffect(() => {
  if (!panelOpen) return;

  fetchChannels();
  fetchReadStatus();

  let subscription: ReturnType<typeof chatService.subscribeToMessages> | null = null;

  const setupRealtime = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = user?.user_metadata?.tenant_id;
    if (!tenantId) return;

    subscription = chatService.subscribeToMessages(tenantId, (message) => {
      addRealtimeMessage(message);
    });
  };

  setupRealtime();

  return () => {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  };
}, [panelOpen, fetchChannels, fetchReadStatus, addRealtimeMessage]);
```

### Existing Deduplication Pattern (from chatStore)
```typescript
// Source: src/modules/chat/store/chatStore.ts (lines 105-115)
addRealtimeMessage: (message: ChatMessage) => {
  const { activeChannelId } = get();
  if (message.channel_id === activeChannelId) {
    set((state) => {
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    });
  }
},
```

### removeChannel API (from Supabase JS docs)
```typescript
// Source: https://supabase.com/docs/reference/javascript/removechannel
supabase.removeChannel(myChannel)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual WebSocket + polling | supabase.channel().on('postgres_changes') | supabase-js v2.x | No custom WebSocket code needed; automatic reconnection |
| Custom tenant filtering | RLS policies enforced on Realtime events | supabase-js v2.44.0+ | Server-side tenant isolation for INSERT events without custom logic |
| Channel per entity (noisy) | Tenant-scoped channel + client-side entity filter | Pattern from existing chat module | Fewer channels, lower overhead, single subscription per panel |

**Deprecated/outdated:**
- The `supabase/realtime-js` repository was archived January 2026. Realtime client is now bundled within `@supabase/supabase-js`. No separate package needed.
- `channel.unsubscribe()` alone is insufficient -- use `supabase.removeChannel(channel)` for full cleanup (matching existing project pattern)

## Integration Points

### BalanceChatService Modification
Add one new method: `subscribeToBalanceChat(tenantId, balanceId, onMessage)`. This returns the channel object (type: `RealtimeChannel`). The method follows the exact pattern of `chatService.subscribeToMessages()` but targets `balance_chat_messages` table and adds client-side `balance_id` filtering.

### BalanceChatSheet Modification
Add a second `useEffect` for Realtime subscription (separate from the existing fetch useEffect):
1. Guard: `if (!open || !balanceCase?.id || !tenantId) return`
2. Call `balanceChatService.subscribeToBalanceChat()`
3. In the callback: enrich the raw message with sender info from userMap, deduplicate, append to messages
4. Cleanup: `supabase.removeChannel(channel)`

### Type Import
Need to import `RealtimeChannel` from `@supabase/supabase-js` for typing the subscription variable. The existing codebase uses `ReturnType<typeof chatService.subscribeToMessages>` instead -- either approach works.

### No Database Changes
- `balance_chat_messages` is already in `supabase_realtime` publication (confirmed via SQL query)
- RLS SELECT policy already exists and will be enforced on Realtime events
- No new migration needed

## Open Questions

1. **Deduplication window size for long-running tabs**
   - What we know: The current approach uses `Array.some(m => m.id === id)` which scans the full messages array. For 50 messages (default limit), this is instant.
   - What's unclear: STATE.md mentions "Set with 10,000 IDs" as a concern for long-running tabs. In practice, the chat panel resets messages on close/reopen, so the array never accumulates beyond ~50 messages per session. Only a concern if a user keeps the panel open for hours with very active chat.
   - Recommendation: Use the simple `Array.some()` approach from the existing chat module. The 50-message limit and panel close/reopen cycle naturally bound the array size. Revisit if Phase 10 (Polish) load testing reveals issues.

2. **Sender enrichment for unknown users**
   - What we know: The userMap is built from initial `getMessages()` response which calls `get_users_for_tenant` RPC. If a new user is added to the tenant during an active session, their messages would arrive via Realtime without being in the userMap.
   - What's unclear: How often new users are added (this is a 10-user system, very rarely).
   - Recommendation: Fall back to `'משתמש'` for unknown user_ids. The userMap refreshes on next panel close/reopen. For a 10-user system, this edge case is negligible.

3. **Subscribe callback vs status callback**
   - What we know: `.subscribe()` accepts an optional callback `(status) => {}` where status can be `'SUBSCRIBED'`, `'TIMED_OUT'`, `'CLOSED'`, `'CHANNEL_ERROR'`.
   - What's unclear: Whether to show a connection status indicator to the user.
   - Recommendation: Skip status indicator for Phase 4 (Phase 10 covers polish). Optionally log non-SUBSCRIBED statuses with `console.warn` for debugging.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection**: `src/modules/chat/services/chat.service.ts` lines 166-185 -- existing `subscribeToMessages()` pattern with `postgres_changes`, single-column filter, channel creation
- **Codebase inspection**: `src/modules/chat/components/ChatPanel.tsx` lines 28-53 -- existing subscription lifecycle with `useEffect`, async setup, `removeChannel()` cleanup
- **Codebase inspection**: `src/modules/chat/store/chatStore.ts` lines 105-115 -- existing deduplication via `messages.some(m => m.id === message.id)`
- **Codebase inspection**: `supabase/migrations/20260209_balance_chat_messages.sql` line 87 -- `ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_messages`
- **Live DB query**: `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'` -- confirmed `balance_chat_messages` is in publication
- **Package verification**: `@supabase/supabase-js` v2.57.2 installed (above v2.44.0 requirement)
- **Supabase official docs**: https://supabase.com/docs/guides/realtime/postgres-changes -- postgres_changes API, filter syntax, RLS behavior
- **Supabase official docs**: https://supabase.com/docs/reference/javascript/removechannel -- `removeChannel()` JS API

### Secondary (MEDIUM confidence)
- **Supabase official docs**: https://supabase.com/docs/guides/realtime/authorization -- RLS caching behavior, per-connection policy checks
- **Supabase blog**: https://supabase.com/blog/realtime-row-level-security-in-postgresql -- RLS enforcement on Realtime events, DELETE limitation

### Tertiary (LOW confidence - needs validation)
- **GitHub issue**: https://github.com/supabase/realtime-js/issues/97 -- multi-column filter limitation (repo archived Jan 2026, issue still open). Confirmed by testing: the filter parameter only accepts single `column=op.value` syntax.
- **WebSearch**: Reconnection behavior (exponential backoff 1s/2s/5s/10s, heartbeat 25s) -- mentioned in multiple Supabase troubleshooting docs but exact implementation details are internal to the SDK.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used; existing chat module demonstrates exact pattern
- Architecture: HIGH - Directly following existing `chatService.subscribeToMessages()` + `ChatPanel` subscription lifecycle. Only adaptation needed is table name and client-side `balance_id` filter.
- Pitfalls: HIGH - Multi-column filter limitation confirmed via GitHub issue + official docs. Dedup pattern verified from existing chatStore. Cleanup pattern verified from existing ChatPanel.
- Integration points: HIGH - Exact files, methods, and line numbers identified. No new tables or migrations required.

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable -- Supabase Realtime API is mature, all patterns exist in codebase)
