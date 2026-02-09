# Phase 1: Database Foundation - Research

**Researched:** 2026-02-09
**Domain:** PostgreSQL schema design, Supabase RLS, Supabase Realtime
**Confidence:** HIGH

## Summary

This phase creates the database foundation for a per-balance-sheet chat system within the annual-balance module. The critical discovery is that an existing general-purpose chat system already exists in production (`chat_channels`, `chat_messages`, `chat_read_status`) with a channel-based architecture. The new balance chat is a fundamentally different system: messages are scoped to a specific `annual_balance_sheets` row (via `balance_id`), not to named channels. **A new table `balance_chat_messages` is required** rather than modifying the existing `chat_messages` table.

The existing codebase provides well-established patterns for RLS policies (the `annual_balance_sheets` migration is the gold standard), migration naming conventions (timestamp-prefixed `YYYYMMDD_name.sql`), and Supabase Realtime configuration (publication membership, `postgres_changes` subscriptions with `eq` filters). The `chat_messages` table is already in the `supabase_realtime` publication, confirming the pattern works. REPLICA IDENTITY DEFAULT is sufficient since the chat only needs INSERT events for Realtime (soft-delete is an UPDATE, not a DELETE).

**Primary recommendation:** Create a new `balance_chat_messages` table with `balance_id` FK to `annual_balance_sheets`, following the RLS policy pattern from `annual_balance_sheets` (using `get_current_tenant_id()` + `user_tenant_access` checks + `is_super_admin` bypass). Add the table to the `supabase_realtime` publication. Do NOT modify the existing chat system.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ (Supabase managed) | Database engine | Already in use, Supabase default |
| Supabase RLS | Built-in | Row-level security | Mandatory per project rules, all tables use it |
| Supabase Realtime | Built-in | Live message delivery | Already used by existing chat system, proven pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `gen_random_uuid()` | PostgreSQL built-in | UUID generation | All primary keys (project convention, NOT `uuid_generate_v4`) |
| `supabase_realtime` publication | Built-in | Realtime change streaming | Must add new table to this publication for Phase 4 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `balance_chat_messages` table | Modify existing `chat_messages` to add optional `balance_id` | Would couple two different systems; existing chat has 0 messages and different RLS policies; cleaner to keep separate |
| Separate `balance_chat_participants` table | Inline permission checks via RLS | Not needed for Phase 1; participant logic handled in Phase 5 via RLS + `annual_balance_sheets` auditor_id joins |

## Architecture Patterns

### Recommended Table Structure
```sql
-- New table: balance_chat_messages
-- Scoped to annual_balance_sheets rows, NOT channels
CREATE TABLE balance_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Pattern 1: RLS Policy Structure (from `annual_balance_sheets`)
**What:** Multi-tier RLS with super_admin bypass + tenant isolation via `get_current_tenant_id()` + role checks via `user_tenant_access`
**When to use:** Every public table in this project
**Example:**
```sql
-- Source: supabase/migrations/20260206190809_annual_balance_sheets.sql
-- SELECT: all active tenant users can read
CREATE POLICY "bcm_select_own_tenant"
  ON balance_chat_messages FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- INSERT: all active tenant users can send messages
CREATE POLICY "bcm_insert_own_tenant"
  ON balance_chat_messages FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- UPDATE: only for soft-delete (admin/accountant only)
CREATE POLICY "bcm_update_soft_delete"
  ON balance_chat_messages FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- No DELETE policy (soft delete only, no hard deletes)
```

### Pattern 2: Index Strategy (from existing tables)
**What:** Composite index matching the primary query pattern + individual indexes for foreign keys
**When to use:** All tables with tenant-scoped queries
**Example:**
```sql
-- Primary query index: fetch messages for a balance, ordered by time
CREATE INDEX idx_bcm_tenant_balance_created
  ON balance_chat_messages(tenant_id, balance_id, created_at);

-- Foreign key indexes (performance for JOIN operations)
CREATE INDEX idx_bcm_balance_id ON balance_chat_messages(balance_id);
CREATE INDEX idx_bcm_user_id ON balance_chat_messages(user_id);

-- Soft-delete filter (partial index for efficiency)
CREATE INDEX idx_bcm_not_deleted
  ON balance_chat_messages(tenant_id, balance_id, created_at)
  WHERE is_deleted = false;
```

### Pattern 3: Realtime Publication
**What:** Add table to `supabase_realtime` publication for `postgres_changes` streaming
**When to use:** Any table that needs real-time updates on the client
**Example:**
```sql
-- Source: Supabase docs - Postgres Changes guide
ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_messages;
```

### Pattern 4: Migration File Convention
**What:** Timestamp-prefixed SQL files in `supabase/migrations/`
**When to use:** All DDL changes
**Example:** `20260209_balance_chat_messages.sql`

### Anti-Patterns to Avoid
- **Using `uuid_generate_v4()`:** Project convention is `gen_random_uuid()`. The former requires pgcrypto extension.
- **Direct JWT extraction in RLS:** The existing `chat_messages` RLS uses `(auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid` directly. The newer, better pattern uses `get_current_tenant_id()` which has a fallback to `user_tenant_access`. Use the newer pattern.
- **Hard DELETE on chat messages:** Requirements explicitly forbid hard deletion. Use `is_deleted` flag.
- **Modifying the existing `chat_messages` table:** The existing channel-based chat is a separate system with 0 data. Keep systems separate.
- **Adding `updated_at` to chat messages:** Chat messages are write-once (content never changes). Only the `is_deleted` flag changes, which is tracked by `deleted_at`. An `updated_at` column is unnecessary.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant isolation | Custom middleware | Supabase RLS + `get_current_tenant_id()` | RLS enforced at database level, impossible to bypass from client |
| UUID generation | Custom ID generation | `gen_random_uuid()` (PostgreSQL built-in) | Project convention, works with Supabase |
| Realtime delivery | WebSocket server or polling | `supabase_realtime` publication + `postgres_changes` | Already proven in existing chat module |
| Audit trail for deletes | Custom audit table | `is_deleted` + `deleted_at` + `deleted_by` columns | Simple, queryable, no extra table needed |

**Key insight:** Supabase's built-in RLS + Realtime handles 90% of the infrastructure. The migration is just DDL — no custom functions needed for Phase 1.

## Common Pitfalls

### Pitfall 1: Forgetting to Add Table to Realtime Publication
**What goes wrong:** Messages insert successfully but Realtime subscriptions receive nothing
**Why it happens:** New tables are not automatically included in `supabase_realtime` publication
**How to avoid:** Include `ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_messages;` in the migration
**Warning signs:** Inserts work via PostgREST but client `postgres_changes` subscription never fires

### Pitfall 2: RLS Policies Using Old JWT Pattern
**What goes wrong:** Users without `tenant_id` in JWT metadata get access denied even though they're valid users
**Why it happens:** The old pattern (`auth.jwt() -> 'user_metadata' ->> 'tenant_id'`) requires JWT to contain tenant_id. The `get_current_tenant_id()` function has a fallback to `user_tenant_access` table.
**How to avoid:** Use `get_current_tenant_id()` in all new RLS policies (consistent with `annual_balance_sheets` pattern)
**Warning signs:** RLS errors for users who recently had their JWT metadata cleared or changed

### Pitfall 3: Missing Foreign Key Indexes
**What goes wrong:** Queries that JOIN on `balance_id` or `user_id` do sequential scans, degrading as data grows
**Why it happens:** PostgreSQL does NOT automatically create indexes on foreign key columns
**How to avoid:** Always create explicit indexes on FK columns
**Warning signs:** Slow query performance on JOIN operations, visible in `EXPLAIN ANALYZE`

### Pitfall 4: REPLICA IDENTITY for Soft-Delete Updates
**What goes wrong:** Realtime UPDATE events for soft-delete don't include the `old` record data
**Why it happens:** Default REPLICA IDENTITY only sends primary key for UPDATE/DELETE events
**How to avoid:** For Phase 1, this is NOT a problem because: (a) the primary Realtime use case is INSERT events for new messages, and (b) soft-delete UPDATEs send the full `new` record which contains `is_deleted = true`, sufficient for the client to remove the message from display. If needed later, `ALTER TABLE balance_chat_messages REPLICA IDENTITY FULL` can be applied.
**Warning signs:** Only relevant if Phase 4+ needs `old` record data on UPDATE events

### Pitfall 5: Not Adding CASCADE on balance_id FK
**What goes wrong:** Cannot delete annual_balance_sheets rows that have chat messages
**Why it happens:** Default FK behavior is RESTRICT
**How to avoid:** Use `REFERENCES annual_balance_sheets(id) ON DELETE CASCADE`
**Warning signs:** Foreign key constraint errors when deleting balance sheets

### Pitfall 6: Missing `NOT NULL` on `is_deleted` Default
**What goes wrong:** NULL values in `is_deleted` column break `WHERE is_deleted = false` filter (NULL != false in SQL)
**Why it happens:** Forgetting `NOT NULL` constraint
**How to avoid:** Always use `is_deleted BOOLEAN NOT NULL DEFAULT false`
**Warning signs:** Messages appearing/disappearing unexpectedly, partial index not covering all rows

## Code Examples

### Complete Migration SQL
```sql
-- Source: Combination of patterns from annual_balance_sheets migration
-- and existing chat_messages table structure

-- ============================================================================
-- Balance Chat Messages (per-balance-sheet internal chat)
-- ============================================================================

CREATE TABLE IF NOT EXISTS balance_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_bcm_tenant_balance_created
  ON balance_chat_messages(tenant_id, balance_id, created_at);
CREATE INDEX idx_bcm_balance_id ON balance_chat_messages(balance_id);
CREATE INDEX idx_bcm_user_id ON balance_chat_messages(user_id);

-- Partial index for common query (exclude soft-deleted)
CREATE INDEX idx_bcm_active_messages
  ON balance_chat_messages(tenant_id, balance_id, created_at)
  WHERE is_deleted = false;

-- Enable RLS
ALTER TABLE balance_chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant users
CREATE POLICY "bcm_select_own_tenant"
  ON balance_chat_messages FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- INSERT: all active tenant users
CREATE POLICY "bcm_insert_own_tenant"
  ON balance_chat_messages FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- UPDATE: admin/accountant only (for soft-delete operations)
CREATE POLICY "bcm_update_admin_accountant"
  ON balance_chat_messages FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- No DELETE policy (soft delete only)

-- Add to Realtime publication for live message delivery
ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_messages;
```

### Realtime Subscription Pattern (from existing chat.service.ts)
```typescript
// Source: src/modules/chat/services/chat.service.ts (existing pattern)
// This shows how the codebase already subscribes to Realtime
supabase
  .channel(`balance-chat:${tenantId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'balance_chat_messages',
      filter: `tenant_id=eq.${tenantId}`,
    },
    (payload) => {
      onMessage(payload.new as BalanceChatMessage);
    }
  )
  .subscribe();
```

### Verification Queries
```sql
-- Verify table exists with correct columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'balance_chat_messages'
ORDER BY ordinal_position;

-- Verify RLS is enabled
SELECT relrowsecurity FROM pg_class WHERE relname = 'balance_chat_messages';

-- Verify indexes exist
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'balance_chat_messages';

-- Verify Realtime publication includes the table
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'balance_chat_messages';

-- Verify RLS policies
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'balance_chat_messages';

-- Performance test: EXPLAIN on primary query pattern
EXPLAIN ANALYZE
SELECT * FROM balance_chat_messages
WHERE tenant_id = 'test-uuid'
  AND balance_id = 'test-uuid'
  AND is_deleted = false
ORDER BY created_at ASC
LIMIT 50;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RLS using direct JWT extraction | `get_current_tenant_id()` with fallback | Migration 015 | More robust tenant identification |
| `uuid_generate_v4()` (pgcrypto) | `gen_random_uuid()` (built-in) | Early project convention | No extension dependency |
| Existing `chat_messages` uses old JWT RLS | New table uses modern RLS pattern | This migration | Consistent with annual_balance_sheets |

**Deprecated/outdated:**
- The existing `chat_channels`/`chat_messages`/`chat_read_status` tables use the OLD RLS pattern (direct JWT extraction). They have 0 data and may eventually be migrated to the new pattern, but that is out of scope for this phase.

## Critical Design Decision: New Table vs. Modify Existing

**Decision: Create NEW `balance_chat_messages` table**

**Evidence supporting this decision:**
1. Existing `chat_messages` has `channel_id` FK, not `balance_id` — different relationship model
2. Existing tables have 0 messages and 0 channels — no data migration needed
3. Existing RLS uses old JWT pattern; new table uses modern `get_current_tenant_id()` pattern
4. The two chat systems serve different purposes: general team chat (channels) vs. per-balance-case discussion
5. Keeping systems separate avoids complex conditional logic in a shared table
6. The roadmap (Phase 5) needs balance-specific permissions (auditor assignment checks), which would be awkward to add to a channel-based system

## Open Questions

1. **Content length limit**
   - What we know: Text messages only, no files/images (per requirements)
   - What's unclear: Maximum message length. 5000 chars proposed as reasonable for professional discussion.
   - Recommendation: Use `CHECK (char_length(content) > 0 AND char_length(content) <= 5000)` — can be altered later if needed

2. **INSERT policy: should `user_id = auth.uid()` be enforced?**
   - What we know: The INSERT policy should ensure users can only insert messages as themselves
   - What's unclear: Phase 8 adds system messages (no real user sender). System messages may need `user_id = NULL` or a special system user.
   - Recommendation: Enforce `user_id = auth.uid()` in Phase 1 INSERT policy for safety. Phase 8 can add a SECURITY DEFINER function for system messages that bypasses this check.

3. **Message type column for system messages?**
   - What we know: Phase 8 will add system-generated messages (status changes, auditor assignments)
   - What's unclear: Should the `message_type` column be added now or in Phase 8?
   - Recommendation: Add `message_type TEXT NOT NULL DEFAULT 'user' CHECK (message_type IN ('user', 'system'))` now. It's a small addition that avoids a schema migration later and the partial index can exclude system messages if needed. However, this is Claude's discretion — it could also be deferred.

## Sources

### Primary (HIGH confidence)
- `supabase/migrations/20260206190809_annual_balance_sheets.sql` — RLS policy pattern, index pattern, table structure
- `supabase/migrations/015_fix_get_current_tenant_id.sql` — `get_current_tenant_id()` function definition
- Production database queries — Verified existing table schemas, RLS policies, indexes, REPLICA IDENTITY, publication membership, and row counts
- `src/modules/chat/services/chat.service.ts` — Existing Realtime subscription pattern
- `src/modules/chat/types/chat.types.ts` — Existing chat type definitions
- Supabase official docs: Postgres Changes guide (https://supabase.com/docs/guides/realtime/postgres-changes) — Realtime publication requirements, REPLICA IDENTITY behavior, filter syntax

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` + `.planning/REQUIREMENTS.md` — Phase requirements and success criteria
- `specs/meeting-feb-2026-enhancements/implementation-plan.md` — Original chat system design (Phase 14)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All technology is already in use in the project
- Architecture: HIGH - Patterns directly copied from existing `annual_balance_sheets` migration and verified against production
- Pitfalls: HIGH - All pitfalls verified against actual database state (e.g., REPLICA IDENTITY checked, publication membership confirmed)

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable — PostgreSQL and Supabase patterns don't change frequently)
