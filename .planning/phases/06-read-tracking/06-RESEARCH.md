# Phase 6: Read Tracking - Research

**Researched:** 2026-02-10
**Domain:** Denormalized unread counters, PostgreSQL triggers, Supabase upsert patterns
**Confidence:** HIGH

## Summary

This phase adds read tracking to the balance chat system so that each user's unread message count per balance is maintained as a denormalized counter. The requirements are explicit: (1) opening a chat panel marks all messages as read for that user, (2) unread counts are stored in a denormalized column (not calculated via COUNT queries), (3) a database trigger increments the counter when a new message is inserted, and (4) the counter resets to zero when the user opens the chat panel.

The key architectural decision is **where to store unread counters**. The state blocker from earlier phases identified two candidates: adding columns to `annual_balance_sheets` or creating a separate `balance_chat_participants` table. After investigating the codebase, the recommendation is a **separate `balance_chat_read_tracking` table** with composite key `(tenant_id, balance_id, user_id)` and an `unread_count` integer column. This is strongly preferred over modifying `annual_balance_sheets` for three reasons: (1) `annual_balance_sheets` is a heavily-queried table with 1,335 active rows and adding per-user columns would require JSONB or a column-per-user approach, both poor fits; (2) a separate table cleanly separates chat concerns from balance sheet domain logic; (3) the existing `chat_read_status` table in the channel-based chat module proves this pattern works in this codebase -- it uses `(tenant_id, channel_id, user_id)` with `last_read_at` timestamp and UNIQUE constraint, which is exactly the model we should follow but with a denormalized `unread_count` integer instead of a timestamp.

The implementation has three layers: (1) **database layer** -- a new table, a trigger function that increments unread_count for all participants except the sender when a message is inserted, and RLS policies; (2) **service layer** -- a `markAsRead` method on `BalanceChatService` that upserts the tracking row with `unread_count = 0` and `last_read_at = now()`; (3) **UI layer** -- call `markAsRead` when `BalanceChatSheet` opens for a balance, and expose a `getUnreadCounts` method for Phase 7's badge display.

**Primary recommendation:** Create a `balance_chat_read_tracking` table with `(tenant_id, balance_id, user_id)` UNIQUE constraint, `unread_count` integer column, and `last_read_at` timestamp. Use an AFTER INSERT trigger on `balance_chat_messages` to increment counters for all eligible users except the sender. Use upsert (ON CONFLICT UPDATE) to reset counter to zero when user opens the chat panel.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL triggers | 15+ (Supabase managed) | Auto-increment unread counters on message insert | Already used extensively in codebase (47 triggers exist), proven pattern |
| Supabase JS `upsert()` | @supabase/supabase-js 2.x | Reset counter to zero on chat open | Already used in existing `chat_read_status` system with `onConflict` |
| Supabase RLS | Built-in | Row-level security on tracking table | Mandatory per project rules, consistent with all other tables |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `get_current_tenant_id()` | Existing DB function | Tenant isolation in RLS | Every RLS policy in the project uses this |
| `BalanceChatService` | Existing in codebase | Add `markAsRead()` and `getUnreadCounts()` methods | Extends current service without new files |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `balance_chat_read_tracking` table | JSONB column on `annual_balance_sheets` | JSONB would avoid a new table but complicates queries, cannot use UNIQUE constraint, harder to index, mixes chat concerns into balance domain |
| Separate table | `last_read_at` timestamp (like `chat_read_status`) + COUNT query | Simpler schema but violates INFRA-03 requirement for denormalized counter -- COUNT queries scale poorly |
| Trigger-based increment | Application-level increment in `sendMessage()` | Trigger is more reliable (can't be bypassed), handles edge cases like direct SQL inserts, follows existing codebase pattern |
| Per-message read receipts table | Individual `(message_id, user_id)` rows | Explodes to N*M rows (messages * users), anti-pattern identified in architecture research |

## Architecture Patterns

### Recommended Table Structure

```sql
-- Source: Derived from existing chat_read_status pattern + denormalization requirement
CREATE TABLE balance_chat_read_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  balance_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_bcrt_tenant_balance_user UNIQUE (tenant_id, balance_id, user_id)
);
```

### Pattern 1: Trigger-Based Counter Increment
**What:** An AFTER INSERT trigger on `balance_chat_messages` that increments `unread_count` for all users who have tracking rows for that balance, except the message sender.
**When to use:** Every time a new chat message is inserted.
**Key design decisions:**
- The trigger only increments rows that already exist in `balance_chat_read_tracking`. It does NOT create new rows for users who have never opened the chat.
- New rows are created when a user first opens the chat (via upsert in `markAsRead`).
- This means a user who has never opened a balance's chat will have no tracking row, and the UI should treat "no row" as "no unread" (they haven't started following that chat yet).

```sql
-- Source: Follows existing trigger patterns in codebase (increment_letter_opens, calculate_advance_rate)
CREATE OR REPLACE FUNCTION increment_balance_chat_unread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Increment unread_count for all tracked users of this balance
  -- except the sender of the message
  UPDATE balance_chat_read_tracking
  SET
    unread_count = unread_count + 1,
    updated_at = NOW()
  WHERE balance_id = NEW.balance_id
    AND tenant_id = NEW.tenant_id
    AND user_id != NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_chat_unread
  AFTER INSERT ON balance_chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION increment_balance_chat_unread();
```

### Pattern 2: Upsert-Based Mark-as-Read
**What:** When user opens the chat panel, upsert a row with `unread_count = 0` and `last_read_at = NOW()`. If the row exists, update it. If not, create it (first visit).
**When to use:** Every time `BalanceChatSheet` opens for a balance.

```typescript
// Source: Follows existing chat_read_status upsert pattern in chat.service.ts
async markAsRead(balanceId: string): Promise<ServiceResponse<null>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    const { error } = await supabase
      .from('balance_chat_read_tracking')
      .upsert(
        {
          tenant_id: tenantId,
          balance_id: balanceId,
          user_id: user.id,
          unread_count: 0,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,balance_id,user_id' }
      );

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Pattern 3: Batch Fetch Unread Counts
**What:** Fetch all unread counts for the current user in a single query (for Phase 7 badge display).
**When to use:** When loading the balance table, to show unread badges on each row.

```typescript
// Source: Designed for Phase 7 consumption, built in Phase 6
async getUnreadCounts(): Promise<ServiceResponse<Record<string, number>>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: {}, error: null };

    const { data, error } = await supabase
      .from('balance_chat_read_tracking')
      .select('balance_id, unread_count')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .gt('unread_count', 0);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.balance_id] = row.unread_count;
    }
    return { data: counts, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Pattern 4: UI Integration in BalanceChatSheet
**What:** Call `markAsRead` when the chat sheet opens, reset local state.
**When to use:** In the `useEffect` that fires when `open` changes to `true`.

```typescript
// Source: Add to existing BalanceChatSheet.tsx useEffect
useEffect(() => {
  if (!open || !balanceCase?.id) return;

  // Mark as read when chat opens
  balanceChatService.markAsRead(balanceCase.id);

  // ... existing message fetch logic ...
}, [open, balanceCase?.id]);
```

### Anti-Patterns to Avoid
- **COUNT queries for unread:** Never do `SELECT COUNT(*) FROM balance_chat_messages WHERE created_at > last_read_at`. This violates INFRA-03 and degrades as message volume grows. The whole point of this phase is denormalized counters.
- **Creating tracking rows for ALL users on message insert:** The trigger should only UPDATE existing rows. Creating rows for users who have never visited the chat wastes storage and complicates RLS (who are "all users" for a balance? Depends on role + assignment).
- **Storing unread count on `annual_balance_sheets`:** This table is fetched in the main list query with joins. Adding per-user unread data here would require JSONB (messy) or per-user columns (doesn't scale). Keep it in a separate table.
- **Using `last_read_at` WITHOUT denormalized count:** The `chat_read_status` table in the existing channel chat uses only `last_read_at` and then calculates unread with client-side filtering. The chatStore's `getUnreadCount()` filters messages by timestamp. This works for small scale but is the pattern we're explicitly required to avoid.
- **Forgetting soft-deleted messages in trigger:** The trigger WHEN clause (`NEW.is_deleted = false`) prevents counting soft-deleted messages. But if a message is soft-deleted AFTER being counted, the counter will be too high. At current scale (2 messages total, 10 users), this is negligible. A decrement trigger on UPDATE (when `is_deleted` changes to `true`) could be added later if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tracking row upsert logic | Custom INSERT-or-UPDATE with SELECT check | Supabase `upsert()` with `onConflict` | Race-condition safe, atomic, already used in `chat_read_status` |
| Counter increment atomicity | Application-level read-modify-write | PostgreSQL trigger with `SET unread_count = unread_count + 1` | Atomic, no race conditions, handles concurrent message sends |
| User enumeration for a balance | Custom query to find all eligible users | Let the trigger only update existing tracking rows | Avoids complex role+assignment logic in the trigger, users self-register by opening chat |
| RLS on tracking table | Custom auth checks | Standard RLS with `user_id = auth.uid()` pattern | Consistent with `chat_read_status` RLS, simpler, proven |

**Key insight:** The trigger + upsert combination handles all the complexity. The trigger atomically increments counters when messages arrive. The upsert atomically resets counters when the chat is opened. No application-level coordination is needed between these two operations.

## Common Pitfalls

### Pitfall 1: Trigger Incrementing for Users Who Never Opened Chat
**What goes wrong:** If the trigger creates tracking rows for all tenant users on every message, the table fills with rows for users who don't care about that balance's chat.
**Why it happens:** Developer tries to pre-create tracking rows so badge counts are immediately visible.
**How to avoid:** Only UPDATE existing rows in the trigger. Rows are created via upsert when a user first opens the chat. Users who have never opened the chat have no row and see no badge (correct behavior -- they haven't started following that chat).
**Warning signs:** `balance_chat_read_tracking` table growing to `users * balances` rows (35 * 1335 = 46,725 rows for current data).

### Pitfall 2: Race Condition Between markAsRead and Incoming Messages
**What goes wrong:** User opens chat, `markAsRead` fires (sets count to 0), but a message arrives between the read and the upsert. The trigger increments the count to 1, then `markAsRead` sets it back to 0 -- user misses the message indicator.
**Why it happens:** Non-atomic sequence: fetch messages -> trigger fires -> markAsRead.
**How to avoid:** This is acceptable at current scale (10 users, 2 messages). The message itself will be visible in the open chat panel via Realtime, so the user sees it regardless of the badge count. The badge will be wrong by at most 1 until the next page load. If this becomes an issue, `markAsRead` can be called AFTER messages are loaded and rendered, minimizing the window.
**Warning signs:** Users reporting "I opened chat but still see an unread badge."

### Pitfall 3: Soft-Delete Not Decrementing Counter
**What goes wrong:** Admin soft-deletes a message. The unread counter was already incremented when the message was inserted. Now the counter is off by 1.
**Why it happens:** The INSERT trigger increments, but there is no UPDATE trigger to decrement on soft-delete.
**How to avoid:** For Phase 6, accept this limitation. With 2 total messages in production, soft-delete is extremely rare. Document it. If needed later, add a second trigger:
```sql
CREATE TRIGGER trigger_decrement_chat_unread_on_delete
  AFTER UPDATE OF is_deleted ON balance_chat_messages
  FOR EACH ROW
  WHEN (OLD.is_deleted = false AND NEW.is_deleted = true)
  EXECUTE FUNCTION decrement_balance_chat_unread();
```
**Warning signs:** Persistent non-zero badges that don't clear even after opening chat.

### Pitfall 4: Missing Realtime Publication for Tracking Table
**What goes wrong:** Phase 7 needs real-time badge updates. If `balance_chat_read_tracking` is not added to the Realtime publication, UPDATE events won't fire.
**Why it happens:** Developer forgets to add the new table to `supabase_realtime` publication.
**How to avoid:** Include `ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_read_tracking;` in the migration. Phase 7 will need this for live badge updates.
**Warning signs:** Badges don't update until page refresh.

### Pitfall 5: RLS Policy Missing user_id Check on INSERT
**What goes wrong:** A malicious client could insert tracking rows for other users, manipulating their unread counts.
**Why it happens:** INSERT policy only checks tenant_id, not user_id.
**How to avoid:** RLS INSERT policy must include `user_id = auth.uid()` in WITH CHECK. The trigger (SECURITY DEFINER) bypasses RLS, so it can update any user's row.
**Warning signs:** Unexpected tracking rows appearing for users.

### Pitfall 6: Trigger SECURITY DEFINER Requirement
**What goes wrong:** Trigger function runs as the invoking user (the message sender). RLS on `balance_chat_read_tracking` blocks the sender from updating OTHER users' rows.
**Why it happens:** The trigger needs to increment unread_count for all tracked users, not just the sender.
**How to avoid:** The trigger function MUST be `SECURITY DEFINER` so it runs with elevated privileges. This is the same pattern used by `increment_letter_opens` in the codebase.
**Warning signs:** Trigger silently fails to update rows for non-sender users; unread counts never increment.

## Code Examples

### Example 1: Complete Migration SQL

```sql
-- Source: Derived from existing codebase patterns

-- 1. Create tracking table
CREATE TABLE balance_chat_read_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  balance_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_bcrt_tenant_balance_user UNIQUE (tenant_id, balance_id, user_id)
);

-- 2. Indexes
CREATE INDEX idx_bcrt_user_unread ON balance_chat_read_tracking(tenant_id, user_id)
  WHERE unread_count > 0;
CREATE INDEX idx_bcrt_balance ON balance_chat_read_tracking(balance_id);

-- 3. RLS
ALTER TABLE balance_chat_read_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bcrt_select_own"
  ON balance_chat_read_tracking FOR SELECT
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY "bcrt_insert_own"
  ON balance_chat_read_tracking FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_current_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY "bcrt_update_own"
  ON balance_chat_read_tracking FOR UPDATE
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

-- 4. Updated_at trigger (reuse existing function)
CREATE TRIGGER trigger_bcrt_updated_at
  BEFORE UPDATE ON balance_chat_read_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Unread increment trigger function
CREATE OR REPLACE FUNCTION increment_balance_chat_unread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  UPDATE balance_chat_read_tracking
  SET
    unread_count = unread_count + 1,
    updated_at = NOW()
  WHERE balance_id = NEW.balance_id
    AND tenant_id = NEW.tenant_id
    AND user_id != NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_chat_unread
  AFTER INSERT ON balance_chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION increment_balance_chat_unread();

-- 6. Add to Realtime publication (for Phase 7)
ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_read_tracking;
```

### Example 2: Service Method -- markAsRead

```typescript
// Source: Add to existing balance-chat.service.ts
// Follows existing chat.service.ts markAsRead pattern

async markAsRead(balanceId: string): Promise<ServiceResponse<null>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('balance_chat_read_tracking')
      .upsert(
        {
          tenant_id: tenantId,
          balance_id: balanceId,
          user_id: user.id,
          unread_count: 0,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,balance_id,user_id' }
      );

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Example 3: Service Method -- getUnreadCounts (for Phase 7)

```typescript
// Source: Designed for Phase 7 badge display

async getUnreadCounts(): Promise<ServiceResponse<Record<string, number>>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: {}, error: null };

    const { data, error } = await supabase
      .from('balance_chat_read_tracking')
      .select('balance_id, unread_count')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .gt('unread_count', 0);

    if (error) throw error;

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.balance_id] = row.unread_count;
    }
    return { data: counts, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Example 4: UI Integration in BalanceChatSheet

```typescript
// Source: Modify existing useEffect in BalanceChatSheet.tsx

// In the fetchMessages useEffect, add markAsRead call:
useEffect(() => {
  if (!open || !balanceCase?.id) return;

  let cancelled = false;

  const fetchMessages = async () => {
    setLoading(true);
    const result = await balanceChatService.getMessages(balanceCase.id);

    if (cancelled) return;

    if (result.error) {
      toast.error('שגיאה בטעינת ההודעות');
    } else {
      setMessages(result.data ?? []);
      // ... existing userMap build logic ...
    }
    setLoading(false);

    // Mark as read AFTER messages are loaded (minimizes race condition window)
    if (!cancelled) {
      balanceChatService.markAsRead(balanceCase.id);
    }
  };

  fetchMessages();

  return () => { cancelled = true; };
}, [open, balanceCase?.id, user]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `last_read_at` timestamp + COUNT query | Denormalized `unread_count` column with trigger | This phase | Eliminates COUNT queries, O(1) badge lookup |
| Individual read receipts per message | Aggregate counter per user per entity | Industry standard for small-team chat | Dramatically fewer rows, simpler queries |
| Application-level counter management | Database trigger for atomic increment | Best practice for concurrent systems | No race conditions, works with any client |

**Not deprecated** -- this is new infrastructure being built.

## Open Questions

1. **Should the trigger also handle soft-delete decrement?**
   - What we know: The INSERT trigger increments counters. If a message is later soft-deleted, the counter stays inflated.
   - What's unclear: How often will messages be soft-deleted? At current usage (2 messages), this is theoretical.
   - Recommendation: Skip the decrement trigger for Phase 6. Add it later if soft-delete becomes frequent. The counter self-corrects when the user opens the chat (reset to 0).

2. **Should `markAsRead` also be called when receiving Realtime messages while the chat is open?**
   - What we know: When the chat is already open and a new Realtime message arrives, the trigger increments the user's unread_count even though they're actively viewing. The count will be wrong until they close and reopen.
   - What's unclear: Will users notice a stale badge while the chat is open?
   - Recommendation: Yes, call `markAsRead` when receiving a Realtime message while the sheet is open. This is a single upsert that resets the counter. It's cheap and keeps the badge accurate. Alternatively, this can be deferred to Phase 7 (when badges are actually displayed).

3. **Performance of trigger UPDATE across all tracking rows**
   - What we know: The trigger does `UPDATE ... WHERE balance_id = X AND user_id != sender`. At current scale (35 eligible users, 1335 balances), the maximum tracking rows per balance is 35. The UPDATE hits at most 34 rows per message send.
   - What's unclear: At 10,000 clients with proportionally more balances, will this remain fast?
   - Recommendation: The partial index `idx_bcrt_balance ON (balance_id)` ensures the UPDATE is efficient. Even at 100x scale, 34 rows per UPDATE is trivial. No concern at projected scale.

4. **TypeScript types regeneration**
   - What we know: After adding the new table, `npm run generate-types` must be run to update `database.types.ts`.
   - Recommendation: Include this as a task step. The new table's types will be needed for the service methods.

## Sources

### Primary (HIGH confidence)
- **Existing codebase:** `chat_read_status` table schema, constraints, RLS policies -- exact precedent for this pattern
- **Existing codebase:** `chat.service.ts` `markAsRead()` method -- upsert with `onConflict` pattern (line 139-161)
- **Existing codebase:** `chatStore.ts` `markChannelAsRead()` -- UI integration pattern (line 79-89)
- **Existing codebase:** `increment_letter_opens` trigger function -- SECURITY DEFINER trigger pattern with counter increment
- **Existing codebase:** `update_updated_at_column` trigger function -- reusable updated_at trigger
- **Database inspection:** 47 existing triggers, all following `AFTER INSERT/UPDATE ... EXECUTE FUNCTION` pattern
- **Database inspection:** `balance_chat_messages` already in `supabase_realtime` publication
- **Database inspection:** 35 chat-eligible users in single tenant, 1335 active balances, 2 active messages

### Secondary (MEDIUM confidence)
- **Supabase docs:** Upsert with `onConflict` parameter -- verified JS client supports this
- **Supabase docs:** Realtime `postgres_changes` respects RLS for event filtering
- **Architecture research:** `.planning/research/ARCHITECTURE.md` -- anti-pattern analysis for per-message read receipts, recommendation for denormalized counters

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist in the codebase (triggers, upsert, RLS patterns)
- Architecture: HIGH -- directly follows existing `chat_read_status` pattern with denormalization added
- Pitfalls: HIGH -- race condition analysis verified against actual code flow, trigger behavior confirmed against existing triggers

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no moving parts)
