# Phase 2: Chat Service Layer - Research

**Researched:** 2026-02-10
**Domain:** TypeScript service architecture, Supabase PostgREST queries, BaseService extension
**Confidence:** HIGH

## Summary

Phase 2 creates the `BalanceChatService` class that provides CRUD operations against the `balance_chat_messages` table deployed in Phase 1. The codebase has a well-established service pattern: all services extend `BaseService`, call `getTenantId()` for tenant isolation, return `ServiceResponse<T>`, and export a singleton instance. The existing `chat.service.ts` (channel-based chat) and `annual-balance.service.ts` provide proven patterns for message fetching with sender enrichment, optimistic inserts, and soft-delete operations.

The critical finding is that the service is straightforward -- no new libraries are needed, no complex patterns to learn. The primary technical decisions are: (1) how to enrich messages with sender name/email (use `get_users_for_tenant` RPC, not per-user lookups), (2) where to locate the service file (`src/modules/annual-balance/services/` since this chat is balance-scoped, not in the generic chat module), and (3) what TypeScript types to define (using generated Supabase types as the base, with enriched interface for display).

**Primary recommendation:** Create `BalanceChatService` extending `BaseService` in `src/modules/annual-balance/services/balance-chat.service.ts` with four core methods: `getMessages(balanceId)`, `sendMessage(balanceId, content)`, `softDeleteMessage(messageId)`, and `getMessageCount(balanceId)`. Use `get_users_for_tenant` RPC for batch sender enrichment. Define types in `src/modules/annual-balance/types/balance-chat.types.ts`. No new dependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | Already installed | Database queries via PostgREST | Already used by every service in codebase |
| `BaseService` (internal) | N/A | Tenant isolation, error handling, audit logging | Mandatory pattern per project rules |
| TypeScript generated types | Auto-generated | Type safety for `balance_chat_messages` table | Already regenerated in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `logger` (internal) | N/A | Structured logging with sanitization | Error logging in catch blocks |
| `get_users_for_tenant` RPC | N/A | Batch user lookup for sender enrichment | Fetching sender names/emails for messages |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `get_users_for_tenant` (batch) | `get_user_with_auth` per user | N+1 queries vs one query; batch is better for chat where many messages share few senders |
| Custom types file | Inline types in service | Separate file is cleaner, reusable by UI components in Phase 3 |
| Module-level service (`annual-balance/services/`) | Shared service (`src/services/`) | Balance chat is tightly coupled to annual-balance module; keep together |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended File Structure
```
src/modules/annual-balance/
├── services/
│   ├── annual-balance.service.ts    # Existing
│   └── balance-chat.service.ts      # NEW: Chat CRUD operations
├── types/
│   ├── annual-balance.types.ts      # Existing
│   ├── validation.ts                # Existing
│   └── balance-chat.types.ts        # NEW: Chat message types
├── store/
│   └── annualBalanceStore.ts        # Existing (not modified in Phase 2)
└── ...
```

### Pattern 1: Service Class Structure (from annual-balance.service.ts)
**What:** Service class extending BaseService with singleton export, every method calls `getTenantId()`, returns `ServiceResponse<T>`
**When to use:** Every new service in this project
**Example:**
```typescript
// Source: Derived from src/modules/annual-balance/services/annual-balance.service.ts
import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';

class BalanceChatService extends BaseService {
  constructor() {
    super('balance_chat_messages');
  }

  async getMessages(balanceId: string, limit = 50): Promise<ServiceResponse<BalanceChatMessageWithSender[]>> {
    try {
      const tenantId = await this.getTenantId();
      // Query + enrichment logic
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const balanceChatService = new BalanceChatService();
```

### Pattern 2: Sender Enrichment (from chat.service.ts + capital-declaration.service.ts)
**What:** Fetch all tenant users via RPC, build a Map, enrich messages with sender name/email
**When to use:** When displaying user-created records that need author attribution
**Example:**
```typescript
// Source: Pattern from src/services/capital-declaration.service.ts lines 362-380
// Uses get_users_for_tenant (no args, uses JWT tenant_id internally)
const { data: allTenantUsers } = await supabase.rpc('get_users_for_tenant');

const senderMap = new Map<string, { email: string; name: string }>();
if (allTenantUsers) {
  for (const u of allTenantUsers) {
    senderMap.set(u.user_id, {
      email: u.email,
      name: u.full_name || u.email,
    });
  }
}

// Enrich each message
const enriched = messages.map((m) => ({
  ...m,
  sender_email: senderMap.get(m.user_id)?.email ?? '',
  sender_name: senderMap.get(m.user_id)?.name ?? '',
}));
```

### Pattern 3: Type Derivation from Supabase Generated Types (from group-fee.service.ts)
**What:** Use `Database['public']['Tables']['table_name']['Row']` as base type, extend with enriched fields
**When to use:** When the service returns data with joined/computed fields beyond the raw row
**Example:**
```typescript
// Source: Pattern from src/services/group-fee.service.ts lines 14-16
import type { Database } from '@/types/database.types';

type BalanceChatMessageRow = Database['public']['Tables']['balance_chat_messages']['Row'];
type BalanceChatMessageInsert = Database['public']['Tables']['balance_chat_messages']['Insert'];

// Enriched type for display (adds sender info not in DB)
export interface BalanceChatMessageWithSender extends BalanceChatMessageRow {
  sender_email: string;
  sender_name: string;
}
```

### Pattern 4: Soft Delete (from Phase 1 RLS + project conventions)
**What:** UPDATE `is_deleted = true, deleted_at = NOW(), deleted_by = user_id` instead of DELETE
**When to use:** Balance chat messages (per requirements: INFRA-04, audit trail preservation)
**Example:**
```typescript
// Source: Phase 1 migration defines UPDATE policy for admin/accountant only
async softDeleteMessage(messageId: string): Promise<ServiceResponse<null>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('balance_chat_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      })
      .eq('id', messageId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Anti-Patterns to Avoid
- **Calling `get_user_with_auth` per message sender:** Creates N+1 query problem. Use `get_users_for_tenant` once, build Map, enrich all messages.
- **Placing balance chat service in `src/modules/chat/`:** The existing chat module is for general channel-based chat. Balance chat is scoped to `annual-balance` module. Keep them separate.
- **Skipping `tenant_id` filter on queries:** Even though RLS enforces it at DB level, the service MUST also filter by `tenant_id` as defense-in-depth (project convention per CLAUDE.md).
- **Returning raw Supabase error messages to callers:** Use `this.handleError()` to wrap errors. Never expose PostgreSQL error codes to the UI layer.
- **Using `message_type` filter in Phase 2:** The `message_type` column exists ('user'/'system') but Phase 2 only handles 'user' messages. System messages come in Phase 8. Don't pre-filter by type unless needed.
- **Using the existing `ChatMessage` type from `src/modules/chat/types/chat.types.ts`:** This type has `channel_id` and `sender_id` fields. Balance chat messages have `balance_id` and `user_id`. Different schemas need different types.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tenant isolation | Custom middleware or manual checks | `BaseService.getTenantId()` + RLS | Database-level enforcement, impossible to bypass |
| Error wrapping | Custom error classes | `BaseService.handleError()` | Consistent error format across all services |
| Audit logging | Custom logging table inserts | `BaseService.logAction()` | Already writes to `audit_logs` with user info, IP, etc. |
| User name resolution | Manual `auth.users` table queries | `get_users_for_tenant` RPC | RPC handles the auth.users join securely (no direct access to auth schema) |
| Pagination | Custom OFFSET/LIMIT logic | `BaseService.buildPaginationQuery()` | Handles range calculation, sorting, page math |
| Type generation | Manual interface definitions for DB columns | `Database['public']['Tables']['balance_chat_messages']` | Auto-generated from Supabase schema, always in sync |

**Key insight:** Phase 2 is almost entirely reuse of existing patterns. The service is a thin wrapper around Supabase queries with the established BaseService infrastructure. The only novel aspect is the sender enrichment logic, which itself is already proven in `capital-declaration.service.ts`.

## Common Pitfalls

### Pitfall 1: N+1 Queries for Sender Enrichment
**What goes wrong:** Service fetches each sender's name individually per message, causing 50+ RPC calls for a chat history.
**Why it happens:** Following the naive pattern of `get_user_with_auth(senderId)` per message.
**How to avoid:** Call `get_users_for_tenant()` ONCE to get all tenant users, build a `Map<user_id, {email, name}>`, then map over messages to enrich. This is O(1) per enrichment after the initial fetch.
**Warning signs:** Slow message loading (1-2 seconds for 20 messages), many parallel RPC calls in network tab.

### Pitfall 2: Existing chat.service.ts Bug with get_user_with_auth
**What goes wrong:** The existing `chat.service.ts` (line 75-77) calls `get_user_with_auth` with `{ p_tenant_id: tenantId }` but the RPC signature expects `{ p_user_id: string }`. This appears to be a bug or the RPC was refactored.
**Why it happens:** The existing chat module was likely written when the RPC had a different signature, or the call relies on PostgreSQL function overloading.
**How to avoid:** For the new balance chat service, use `get_users_for_tenant()` (takes no args, uses JWT tenant internally) which is the proven pattern in `capital-declaration.service.ts` and `user.service.ts`.
**Warning signs:** If you copy the existing chat.service.ts enrichment pattern verbatim, sender names may not resolve.

### Pitfall 3: Not Filtering `is_deleted = false` in Message Queries
**What goes wrong:** Soft-deleted messages appear in the chat history.
**Why it happens:** Forgetting to add `WHERE is_deleted = false` filter. The DB has an optimized partial index for this pattern (`idx_bcm_active_messages`).
**How to avoid:** Always include `.eq('is_deleted', false)` in message fetch queries. This also ensures the partial index is used for optimal performance.
**Warning signs:** Messages that were "deleted" still showing up in the UI.

### Pitfall 4: Missing `.select()` After Insert
**What goes wrong:** Insert returns `null` data even though the row was created successfully.
**Why it happens:** Supabase's `.insert()` without `.select()` returns only count/status, not the inserted row.
**How to avoid:** Always chain `.select().single()` after `.insert()` when the caller needs the created row back (for optimistic update reconciliation in Phase 3).
**Warning signs:** Successful inserts returning `{ data: null }` instead of the message object.

### Pitfall 5: Exposing Database Error Details to Frontend
**What goes wrong:** Raw PostgreSQL error messages (e.g., "violates check constraint") leak to the user.
**Why it happens:** Not using `this.handleError()` or throwing raw Supabase errors.
**How to avoid:** Always catch errors and wrap with `this.handleError(error as Error)`. The BaseService method produces generic `"Database error: ..."` messages that are safe to show (or can be further wrapped by the UI layer with Hebrew messages).
**Warning signs:** Hebrew users seeing English PostgreSQL error codes in toasts.

### Pitfall 6: TypeScript Type Casting Issues
**What goes wrong:** Type errors when the Supabase query returns data that doesn't match the expected enriched type.
**Why it happens:** The raw query returns `BalanceChatMessageRow` (DB schema) but the method signature promises `BalanceChatMessageWithSender` (enriched). The enrichment happens after the query.
**How to avoid:** Query returns raw `BalanceChatMessageRow[]`, then map to `BalanceChatMessageWithSender[]` after enrichment. Use explicit casting only on the enriched result, not on the raw query. Follow the pattern from `annual-balance.service.ts` line 101: `const rows = (data ?? []) as unknown as Type[]`.
**Warning signs:** TypeScript errors about missing `sender_email`/`sender_name` fields.

## Code Examples

### Complete Service Method: getMessages
```typescript
// Source: Derived from annual-balance.service.ts + capital-declaration.service.ts patterns
async getMessages(
  balanceId: string,
  limit = 50
): Promise<ServiceResponse<BalanceChatMessageWithSender[]>> {
  try {
    const tenantId = await this.getTenantId();

    const { data, error } = await supabase
      .from('balance_chat_messages')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('balance_id', balanceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Batch sender enrichment
    const messages = data ?? [];
    const senderIds = [...new Set(messages.map((m) => m.user_id))];

    const senderMap = new Map<string, { email: string; name: string }>();

    if (senderIds.length > 0) {
      const { data: allUsers } = await supabase.rpc('get_users_for_tenant');
      if (allUsers) {
        for (const u of allUsers) {
          senderMap.set(u.user_id, {
            email: u.email,
            name: u.full_name || u.email,
          });
        }
      }
    }

    const enriched: BalanceChatMessageWithSender[] = messages.map((m) => ({
      ...m,
      sender_email: senderMap.get(m.user_id)?.email ?? '',
      sender_name: senderMap.get(m.user_id)?.name ?? '',
    }));

    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Complete Service Method: sendMessage
```typescript
// Source: Derived from existing chat.service.ts sendMessage pattern
async sendMessage(
  balanceId: string,
  content: string
): Promise<ServiceResponse<BalanceChatMessageWithSender>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('balance_chat_messages')
      .insert({
        tenant_id: tenantId,
        balance_id: balanceId,
        user_id: user.id,
        content: content.trim(),
        message_type: 'user',
      })
      .select()
      .single();

    if (error) throw error;

    // Enrich with current user's info (no need to call RPC for own message)
    const enriched: BalanceChatMessageWithSender = {
      ...data,
      sender_email: user.email ?? '',
      sender_name: user.user_metadata?.full_name || user.email ?? '',
    };

    await this.logAction('send_balance_chat_message', balanceId, {
      message_id: data.id,
    });

    return { data: enriched, error: null };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Type Definitions
```typescript
// Source: Derived from database.types.ts balance_chat_messages + chat.types.ts pattern
import type { Database } from '@/types/database.types';

/** Raw database row type */
export type BalanceChatMessageRow = Database['public']['Tables']['balance_chat_messages']['Row'];

/** Insert type (for creating new messages) */
export type BalanceChatMessageInsert = Database['public']['Tables']['balance_chat_messages']['Insert'];

/** Update type (for soft-delete operations) */
export type BalanceChatMessageUpdate = Database['public']['Tables']['balance_chat_messages']['Update'];

/** Message type enum values */
export type MessageType = 'user' | 'system';

/** Enriched message with sender info (for UI display) */
export interface BalanceChatMessageWithSender extends BalanceChatMessageRow {
  sender_email: string;
  sender_name: string;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Existing `chat.service.ts` uses `get_user_with_auth` with wrong args | Use `get_users_for_tenant` (no args) for batch enrichment | Observed in `capital-declaration.service.ts` | Correct RPC usage, better performance |
| Existing chat types use `channel_id`/`sender_id` | New types use `balance_id`/`user_id` | Phase 1 table design | Different type system for different chat model |
| Custom error handling per service | `BaseService.handleError()` unified | Early project convention | Consistent error wrapping |

**Deprecated/outdated:**
- The existing `src/modules/chat/services/chat.service.ts` sender enrichment pattern (calling `get_user_with_auth` with `p_tenant_id`) appears buggy. The new service should use `get_users_for_tenant` instead, which is the pattern used by `user.service.ts` and `capital-declaration.service.ts`.

## Service Method Inventory

Based on Phase 2 success criteria and downstream Phase 3-10 needs, the service should expose:

| Method | Purpose | Success Criteria | Used By |
|--------|---------|-----------------|---------|
| `getMessages(balanceId, limit?)` | Fetch message history for a balance | SC-2: fetch message history | Phase 3 (UI display) |
| `sendMessage(balanceId, content)` | Create new user message | SC-3: create messages with sender metadata | Phase 3 (send button) |
| `softDeleteMessage(messageId)` | Soft-delete a message (admin/accountant only) | SC-4: handle errors gracefully | Phase 3 (message actions) |
| `getMessageCount(balanceId)` | Count active messages for a balance | Supports Phase 7 (unread badges) | Phase 7 (unread counting) |

**Not needed in Phase 2 (deferred):**
- `subscribeToMessages()` -- Phase 4 (Realtime)
- `markAsRead()` -- Phase 6 (Read Tracking)
- `createSystemMessage()` -- Phase 8 (System Messages)

## Open Questions

1. **Should `sendMessage` validate content length before sending?**
   - What we know: DB has `CHECK (char_length(content) > 0 AND char_length(content) <= 5000)` constraint
   - What's unclear: Whether to duplicate this validation in the service or rely on DB constraint
   - Recommendation: Add a service-level check (fast, avoids unnecessary network round-trip on invalid input). Validate `content.trim().length > 0 && content.trim().length <= 5000` before insert.

2. **Should `getMessages` support pagination or just limit?**
   - What we know: Phase 2 success criteria say "fetch message history". Phase 3 needs a scrollable list. Phase 10 mentions 200+ messages per balance.
   - What's unclear: Whether cursor-based pagination is needed now or just a simple limit
   - Recommendation: Start with `limit` parameter (default 50). Chat messages load newest-first-from-bottom, not paginated. If Phase 10 needs scroll-back, add cursor-based pagination then. Keep the interface extensible (`limit` param can be replaced with `{ limit, before?: string }` later).

3. **Where should audit logging thresholds be?**
   - What we know: BaseService has `logAction()`. The existing chat.service.ts does NOT call `logAction()` for sends.
   - What's unclear: Whether every message send should be audit-logged (high volume) or just deletes
   - Recommendation: Log `sendMessage` and `softDeleteMessage` via `logAction()`. Message sends are low-volume (10 users, maybe 20 messages/day). If volume grows, can reduce to delete-only logging.

## Sources

### Primary (HIGH confidence)
- `src/services/base.service.ts` -- BaseService class definition, all protected methods
- `src/modules/annual-balance/services/annual-balance.service.ts` -- Gold standard service pattern (getAll, getById, update)
- `src/modules/chat/services/chat.service.ts` -- Existing chat service (sender enrichment pattern, Realtime subscription)
- `src/services/capital-declaration.service.ts` -- Correct `get_users_for_tenant` usage pattern (lines 362-380, 1218-1221)
- `src/types/database.types.ts` lines 344-397 -- Generated TypeScript types for `balance_chat_messages`
- `supabase/migrations/20260209_balance_chat_messages.sql` -- Table schema, constraints, RLS policies
- `.planning/codebase/CONVENTIONS.md` -- Naming conventions, file organization, error handling patterns
- `.planning/codebase/ARCHITECTURE.md` -- Layer separation, data flow, BaseService abstraction

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` -- CHAT-01 through CHAT-10 requirements, Phase 2 mapping
- `.planning/ROADMAP.md` -- Phase 2 success criteria, downstream phase dependencies
- `.planning/phases/01-database-foundation/01-01-SUMMARY.md` -- Phase 1 outputs (table columns, indexes, RLS)
- `.planning/STATE.md` -- Current project state, accumulated decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries needed, all patterns already proven in codebase
- Architecture: HIGH -- Service structure directly derived from existing `annual-balance.service.ts` and `capital-declaration.service.ts`
- Pitfalls: HIGH -- All pitfalls identified from actual code inspection (e.g., the `get_user_with_auth` bug in existing chat.service.ts)
- Types: HIGH -- Generated Supabase types already verified in Phase 1

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable -- all patterns are internal codebase conventions, not external library APIs)
