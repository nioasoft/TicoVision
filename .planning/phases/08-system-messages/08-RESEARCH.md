# Phase 8: System Messages - Research

**Researched:** 2026-02-10
**Domain:** Database triggers vs. application-level system message insertion, RLS bypass patterns, chat UI rendering branching
**Confidence:** HIGH

## Summary

Phase 8 adds auto-generated system messages to the balance chat timeline when key events occur: auditor assignment and balance status changes. The `message_type` column (values: `'user'` | `'system'`) was already added to `balance_chat_messages` in Phase 1 specifically for this purpose. The existing `BalanceChatMessages` component renders all messages with the same bubble style; it needs to branch rendering for `message_type === 'system'` to show a visually distinct, centered, non-deletable message.

The core technical challenge is **how to insert system messages** given the current RLS INSERT policy enforces `user_id = auth.uid()`. There are two viable approaches: (1) **Application-level insertion** -- the acting user's service call inserts the system message alongside the action (auditor assignment / status change), using their own `user_id`. The INSERT policy is satisfied because `user_id = auth.uid()`. (2) **Database trigger** -- a `SECURITY DEFINER` trigger on `annual_balance_sheets` fires on UPDATE and inserts a system message, bypassing RLS. The trigger approach is cleaner (guarantees a system message is always created, even from direct SQL) but more complex to maintain and debug.

**The application-level approach is recommended** because: (a) the acting user IS the relevant user for the message (they performed the action), so `user_id = auth.uid()` is semantically correct; (b) no schema migration is needed; (c) it follows the existing pattern where `annualBalanceService.assignAuditor()` and `annualBalanceService.updateStatus()` already perform multiple database operations within the same method; (d) the system message content needs user-friendly Hebrew text with the auditor's name and status labels, which are available in the TypeScript layer but not easily in SQL triggers. The trigger approach would require either duplicating the Hebrew status label mapping into SQL or creating a lookup table.

**Primary recommendation:** Add a `sendSystemMessage()` method to `BalanceChatService` that inserts a message with `message_type: 'system'`. Call it from `annualBalanceService.assignAuditor()` and `annualBalanceService.updateStatus()` after the primary operation succeeds. Update `BalanceChatMessages` to render system messages with a distinct centered style. Prevent soft-delete of system messages in the UI.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase PostgREST | @supabase/supabase-js 2.x (existing) | Insert system messages into `balance_chat_messages` | Already used by `BalanceChatService.sendMessage()` |
| Zustand | 4.x (existing) | No new store changes needed | Messages already flow through existing state |
| React | 19.x (existing) | Conditional rendering for system messages | Existing pattern in `BalanceChatMessages.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `BALANCE_STATUS_CONFIG` (internal) | N/A | Hebrew status labels for system message content | When generating "status changed" message text |
| `lucide-react` `Info` or `Settings` icon | Existing | Visual indicator for system messages | In the system message bubble |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| App-level insertion (recommended) | DB trigger on `annual_balance_sheets` UPDATE | Trigger guarantees insertion even from direct SQL, but needs SECURITY DEFINER bypass, Hebrew text in SQL is fragile, harder to test/debug |
| Using acting user's `user_id` for system messages | NULL `user_id` or special "system" UUID | Would require schema change (make `user_id` nullable or add a sentinel row to `auth.users`), RLS policy rewrite. The acting user IS semantically correct. |
| Inserting system message from `annualBalanceService` | Inserting from dialog components | Service-level is better -- keeps business logic centralized, works regardless of which UI triggers the action |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Implementation Flow

```
User clicks "Assign Auditor" or "Update Status"
  |
  v
Dialog calls annualBalanceService.assignAuditor() / updateStatus()
  |
  v
Service performs the primary operation (update annual_balance_sheets)
  |
  v (on success)
Service calls balanceChatService.sendSystemMessage()
  |
  v
System message inserted into balance_chat_messages (message_type='system')
  |
  v
Supabase Realtime delivers INSERT event to open chat panels
  |
  v
BalanceChatMessages renders with system message styling
```

### Pattern 1: sendSystemMessage Service Method
**What:** A new method on `BalanceChatService` that inserts a message with `message_type: 'system'`, using the acting user's `user_id`.
**When to use:** Called from `annualBalanceService` after auditor assignment or status change succeeds.
**Why a separate method:** Separates the system message concern from `sendMessage()` (which validates content length, does optimistic insert patterns, etc.). System messages have different semantics: they're auto-generated, shorter, and don't need content validation beyond non-empty.

```typescript
// Source: balance-chat.service.ts (new method)
async sendSystemMessage(
  balanceId: string,
  content: string
): Promise<ServiceResponse<null>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('balance_chat_messages')
      .insert({
        tenant_id: tenantId,
        balance_id: balanceId,
        user_id: user.id,
        content,
        message_type: 'system',
      });

    if (error) throw error;

    return { data: null, error: null };
  } catch (error) {
    // Non-critical: log but don't fail the parent operation
    console.error('Failed to send system message:', error);
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Pattern 2: Calling sendSystemMessage from annualBalanceService
**What:** After a successful assignAuditor or updateStatus operation, generate the Hebrew message text and call `sendSystemMessage`.
**When to use:** Always -- every auditor assignment and status change should produce a system message.
**Critical detail:** The system message call should NOT fail the parent operation. Use fire-and-forget or catch errors silently.

```typescript
// Source: annual-balance.service.ts, inside assignAuditor() after successful update

// Get auditor display name for the message
const { data: auditorUser } = await supabase.rpc('get_user_with_auth', {
  p_user_id: auditorId,
});
const auditorName = auditorUser?.[0]?.full_name || auditorUser?.[0]?.email || '';
const systemContent = `מאזן שויך למבקר ${auditorName}`;

// Fire-and-forget: don't block the assignment on chat message success
balanceChatService.sendSystemMessage(id, systemContent);
```

```typescript
// Source: annual-balance.service.ts, inside updateStatus() after successful update

const fromLabel = BALANCE_STATUS_CONFIG[currentStatus].label;
const toLabel = BALANCE_STATUS_CONFIG[newStatus].label;
const systemContent = `סטטוס שונה מ-${fromLabel} ל-${toLabel}`;

// Fire-and-forget
balanceChatService.sendSystemMessage(id, systemContent);
```

### Pattern 3: System Message UI Rendering
**What:** Conditional rendering in `BalanceChatMessages` for messages with `message_type === 'system'`. Centered text with muted styling, no sender name, no delete action.
**When to use:** For every message in the list, check `msg.message_type`.
**Visual spec:** Centered, smaller text, muted color, optional info icon, similar to the date separator visual pattern already in the component.

```typescript
// Source: BalanceChatMessages.tsx, inside the messages.map()

if (msg.message_type === 'system') {
  return (
    <div key={msg.id}>
      {showDateSeparator && (/* existing date separator */)}
      <div className="flex items-center justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          {msg.content}
        </span>
      </div>
    </div>
  );
}

// ... existing user message rendering
```

### Pattern 4: Prevent System Message Deletion
**What:** System messages should not be deletable by users, even admin/accountant.
**When to use:** In any delete UI that exists or will exist.
**Implementation:** Check `msg.message_type !== 'system'` before showing delete action. No database-level constraint needed -- the UI simply doesn't offer the option.

### Anti-Patterns to Avoid
- **Database trigger for system messages:** While it guarantees insertion, it requires: (a) SECURITY DEFINER to bypass RLS INSERT policy's `user_id = auth.uid()` check, (b) Hebrew text/status labels duplicated in SQL, (c) fetching the auditor name from `auth.users` within the trigger (cross-schema access), (d) more complex testing. The application layer already has all the data it needs.
- **Making system messages appear as a "System" user:** Would require a sentinel UUID in `auth.users` or making `user_id` nullable. Adds schema complexity for no user-facing benefit -- the acting user's identity IS relevant ("who assigned the auditor?").
- **Blocking the parent operation if system message fails:** System messages are informational. A failed chat message should not prevent a status change or auditor assignment from completing.
- **Adding a separate `system_messages` table:** The `message_type` column was added in Phase 1 specifically to avoid this. System messages are chat messages that appear inline in the timeline.
- **Using the Realtime subscription to create system messages:** This would require a listener that detects changes and inserts messages, creating a feedback loop risk.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hebrew status labels | String literals in service method | `BALANCE_STATUS_CONFIG[status].label` from types | Already defined, single source of truth, used everywhere |
| Auditor name lookup | Manual `auth.users` query | `get_user_with_auth` RPC | Already used in `assignAuditor()`, handles missing users |
| Message rendering branching | Separate component per message type | Conditional JSX within existing `BalanceChatMessages` | Only 2 types (user/system); a full component split is overkill |
| System message visual style | Custom CSS class | Reuse date separator styling pattern (centered, rounded-full, muted) | Already exists in `BalanceChatMessages.tsx`, visually consistent |

**Key insight:** No new libraries, no schema migrations, no new infrastructure. Phase 8 is purely application logic (service methods + UI rendering) building on the `message_type` column that Phase 1 already created.

## Common Pitfalls

### Pitfall 1: System Message Not Appearing in Open Chat
**What goes wrong:** User assigns an auditor with the chat panel open. The system message is inserted but doesn't appear in the chat panel until the user closes and reopens it.
**Why it happens:** The Realtime subscription in `BalanceChatSheet` listens for INSERT events on `balance_chat_messages`. System messages ARE inserts, so they WILL be delivered via Realtime. However, the `handleRealtimeMessage` callback has a dedup check using `fingerprint = ${rawMsg.user_id}:${rawMsg.content}`. If the acting user sent a regular message with the exact same content (extremely unlikely for system messages), it could be deduped.
**How to avoid:** System messages have different content from user messages. The dedup fingerprint will not match. No special handling needed.
**Warning signs:** System messages missing from open chat panels.

### Pitfall 2: System Message Incrementing Unread Count for Acting User
**What goes wrong:** User changes a status. The system message is inserted with the acting user's `user_id`. The `increment_balance_chat_unread` trigger increments unread counts for all tracked users EXCEPT the sender. This is correct -- the acting user doesn't get an unread badge for their own action. But OTHER users who have the chat open will see their badge increment.
**Why it happens:** This is the intended behavior. The trigger correctly excludes the sender.
**How to avoid:** No avoidance needed -- this is correct behavior. Other users SHOULD know about the status change.
**Warning signs:** Only a problem if the acting user sees their OWN system message as "unread" -- verify the trigger excludes `user_id = NEW.user_id`.

### Pitfall 3: Fire-and-Forget Error Swallowed Silently
**What goes wrong:** The system message insertion fails (e.g., RLS policy error, network issue) but the parent operation (status change) succeeds. The user sees the status change but no system message appears.
**Why it happens:** Fire-and-forget pattern means errors are logged but not surfaced.
**How to avoid:** Log the error with `console.error` for debugging. Do NOT toast the error to the user -- the primary action succeeded. Consider adding a retry mechanism if reliability becomes critical.
**Warning signs:** Gaps in the chat timeline where system messages should appear.

### Pitfall 4: RLS Policy Blocking System Message Insert
**What goes wrong:** The INSERT policy requires `user_id = auth.uid()`. If `sendSystemMessage` is called and the user's auth session has expired, the insert will fail silently.
**Why it happens:** The user just performed an action (which required auth), so this is extremely unlikely. But if the auth token expires between the primary action and the system message insert, it could fail.
**How to avoid:** The `sendSystemMessage` method gets the user from `supabase.auth.getUser()`. If the user is null, it returns an error gracefully. The parent operation has already succeeded.
**Warning signs:** System messages sporadically missing.

### Pitfall 5: System Messages for Reverted Status Changes
**What goes wrong:** Admin reverts a status. A system message says "status changed from X to Y". But what if the revert is undone? The timeline will show: "changed to Y", "reverted to X", "changed to Y again". This is correct but verbose.
**Why it happens:** Every status change generates a system message.
**How to avoid:** This is the desired behavior -- it creates an audit trail in the chat. Status reverts are admin-only operations that should be visible.
**Warning signs:** Users confused by multiple back-and-forth system messages.

### Pitfall 6: System Message Content Lacking Context
**What goes wrong:** The system message says "status changed from X to Y" but doesn't say WHO changed it.
**Why it happens:** The message content is a plain string without the actor's name.
**How to avoid:** Include the actor's name in the message, or rely on the `sender_name` field that is already part of the enriched message display. Since `user_id` IS the acting user, the existing sender enrichment in `getMessages()` will add their name. However, for system messages, the sender name display should be the ACTION description, not "Tiko said: status changed".
**Recommendation:** Do NOT show sender_name for system messages (the UI already won't show it since system messages have centered rendering). The `user_id` on the record IS the actor, available for auditing, but the visual display focuses on the event text.

## Code Examples

### Example 1: sendSystemMessage Method

```typescript
// Source: balance-chat.service.ts (add to BalanceChatService class)

/**
 * Insert a system-generated message into the balance chat.
 * Used for auditor assignment notifications and status change records.
 * Non-critical: errors are logged but do not propagate to caller.
 *
 * @param balanceId - The balance sheet ID
 * @param content - Hebrew message text describing the event
 * @returns null on success, error on failure
 */
async sendSystemMessage(
  balanceId: string,
  content: string
): Promise<ServiceResponse<null>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('balance_chat_messages')
      .insert({
        tenant_id: tenantId,
        balance_id: balanceId,
        user_id: user.id,
        content,
        message_type: 'system',
      });

    if (error) throw error;

    return { data: null, error: null };
  } catch (error) {
    console.error('Failed to send system message:', error);
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Example 2: System Message on Auditor Assignment

```typescript
// Source: annual-balance.service.ts, inside assignAuditor(), after successful update

// Import at top of file:
import { balanceChatService } from './balance-chat.service';
import { BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';

// After the successful update and status history insert:
// Generate system message for chat timeline
const { data: auditorInfo } = await supabase.rpc('get_user_with_auth', {
  p_user_id: auditorId,
});
const auditorDisplayName = auditorInfo?.[0]?.full_name || auditorInfo?.[0]?.email || '';

// Fire-and-forget -- don't block assignment on chat
balanceChatService.sendSystemMessage(
  id,
  `מאזן שויך למבקר ${auditorDisplayName}`
);
```

### Example 3: System Message on Status Change

```typescript
// Source: annual-balance.service.ts, inside updateStatus(), after successful update

// After the successful update and status history insert:
const fromLabel = BALANCE_STATUS_CONFIG[currentStatus].label;
const toLabel = BALANCE_STATUS_CONFIG[newStatus].label;

// Fire-and-forget
balanceChatService.sendSystemMessage(
  id,
  `סטטוס שונה: ${fromLabel} -> ${toLabel}`
);
```

### Example 4: System Message UI Rendering

```typescript
// Source: BalanceChatMessages.tsx, inside messages.map()

import { Info } from 'lucide-react';
import type { MessageType } from '../types/balance-chat.types';

// Inside the map callback, before the existing user message rendering:
if (msg.message_type === 'system') {
  return (
    <div key={msg.id}>
      {showDateSeparator && (
        <div className="flex items-center justify-center my-3">
          <span className="text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
            {msgDate}
          </span>
        </div>
      )}
      <div className="flex items-center justify-center my-2">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border border-border/50 px-3 py-1.5 rounded-full max-w-[85%]">
          <Info className="h-3 w-3 shrink-0" />
          <span className="text-center">{msg.content}</span>
        </div>
      </div>
    </div>
  );
}

// ... existing user message rendering continues
```

### Example 5: Optimistic System Message in Realtime Handler

```typescript
// Source: BalanceChatSheet.tsx handleRealtimeMessage callback
// System messages arriving via Realtime are handled by the existing handler.
// The enrichment step sets sender_name from userMap. For system messages,
// the sender_name is not displayed (UI hides it), so this is fine.
// No changes needed to the Realtime handler.
```

## Event Catalog

Events that generate system messages:

| Event | Trigger Location | Message Template (Hebrew) | Notes |
|-------|-----------------|---------------------------|-------|
| Auditor assigned | `annualBalanceService.assignAuditor()` | `מאזן שויך למבקר {auditorName}` | Always fires on assignment, even re-assignment |
| Status changed (forward) | `annualBalanceService.updateStatus()` | `סטטוס שונה: {fromLabel} -> {toLabel}` | Uses Hebrew labels from `BALANCE_STATUS_CONFIG` |
| Status changed (revert) | `annualBalanceService.updateStatus()` | `סטטוס הוחזר: {fromLabel} -> {toLabel}` | Distinguish revert from forward with different prefix |
| Auditor confirmed | `annualBalanceService.confirmAssignment()` | `מבקר אישר קבלת תיק` | Already logged in status_history, now also in chat |
| Materials received | `annualBalanceService.markMaterialsReceived()` | `חומרים התקבלו` | Simple event notification |

**Scope decision:** The success criteria mentions only auditor assignment and status changes. The additional events (auditor confirmation, materials received) are natural extensions but could be deferred. Recommend implementing all 5 events since the pattern is identical and the marginal effort is minimal.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database triggers for system messages | Application-level insertion | Current best practice for multi-language apps | Hebrew text stays in TypeScript, not SQL; easier testing |
| Separate system messages table | `message_type` column in existing table | Phase 1 design decision | Single query for full timeline; no JOIN needed |

## Open Questions

1. **Should system messages include the actor's name in the content?**
   - What we know: The `user_id` column stores who performed the action. Sender enrichment adds `sender_name`. But system message UI rendering won't display `sender_name` (centered style has no sender header).
   - What's unclear: Should the message text itself say "Tiko changed status from X to Y" or just "Status changed from X to Y"?
   - Recommendation: Omit the actor name from system message content. The message is informational about WHAT happened. If auditing is needed, the `user_id` field is available. Simpler messages are cleaner in the timeline.

2. **Should markMaterialsReceived also generate a system message?**
   - What we know: `markMaterialsReceived` is an RPC function (SECURITY DEFINER), not a regular service method. Calling `sendSystemMessage` from the TypeScript service that invokes the RPC would work, but the RPC itself doesn't return success/failure granularly.
   - What's unclear: Is materials received important enough for a chat notification?
   - Recommendation: Yes, add it. The service method `annualBalanceService.markMaterialsReceived()` can call `sendSystemMessage` after the RPC succeeds, same pattern as other events.

3. **Should status revert messages use a different visual style?**
   - What we know: Reverts are admin-only operations. The message text will indicate it's a revert.
   - What's unclear: Should the UI visually distinguish reverts (e.g., amber/warning color) vs. forward changes?
   - Recommendation: Use the same system message style for all events. The text content is sufficient to distinguish. A revert-specific style adds complexity with minimal benefit.

## Sources

### Primary (HIGH confidence)
- **Existing codebase:** `balance_chat_messages` table schema with `message_type` column -- verified in production database
- **Existing codebase:** `BalanceChatService.sendMessage()` -- insert pattern with tenant isolation, user auth, and audit logging
- **Existing codebase:** `annualBalanceService.assignAuditor()` -- lines 477-537, full auditor assignment flow with status history
- **Existing codebase:** `annualBalanceService.updateStatus()` -- lines 292-444, full status transition flow with validation, timestamps, and history
- **Existing codebase:** `BalanceChatMessages.tsx` -- current rendering with date separators and own/other message styling
- **Existing codebase:** `bcm_insert_by_role` RLS policy -- enforces `user_id = auth.uid()`, confirmed in production
- **Existing codebase:** `BALANCE_STATUS_CONFIG` -- Hebrew labels for all 8 statuses
- **Existing codebase:** `increment_balance_chat_unread` trigger -- excludes sender from unread increment (verified: `user_id != NEW.user_id`)
- **Existing codebase:** `balance-chat.types.ts` -- `MessageType = 'user' | 'system'` already defined

### Secondary (MEDIUM confidence)
- **Phase 1 research:** Open question #3 explicitly planned for `message_type` column to support Phase 8 system messages
- **Supabase docs:** SECURITY DEFINER functions for RLS bypass -- verified pattern exists but not recommended for this use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all tools already in use
- Architecture: HIGH -- directly extends existing service methods with one new method; UI change is conditional rendering
- Pitfalls: HIGH -- analyzed against actual RLS policies, trigger behavior, and Realtime delivery

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no external dependencies)
