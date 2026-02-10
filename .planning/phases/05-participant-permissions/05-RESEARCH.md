# Phase 5: Participant Permissions - Research

**Researched:** 2026-02-10
**Domain:** Supabase RLS policies, role-based access control, service-layer permission checks
**Confidence:** HIGH

## Summary

This phase restricts chat visibility so that only authorized participants can view and send messages for a given balance sheet. The current RLS policies on `balance_chat_messages` enforce tenant isolation only -- any active user in the tenant can read/write all chat messages. Phase 5 needs to add role-based + assignment-based filtering: admin and accountant roles get full tenant-wide access, while bookkeeper/auditor users can only access chats for balances where they are the assigned auditor (`annual_balance_sheets.auditor_id`).

The key architectural decision is **where to enforce permissions**: RLS policy modification, service-layer checks, or UI-layer filtering. After investigating the existing codebase patterns, the recommendation is a **dual-layer approach**: (1) modify the RLS SELECT and INSERT policies on `balance_chat_messages` to include role + auditor_id checks via a cross-table subquery to `annual_balance_sheets`, and (2) add a service-layer permission check method that the UI can call to determine whether to show the chat icon and allow opening the chat panel. The RLS layer provides security-at-depth (cannot be bypassed), while the service layer provides user-friendly error messages and UI gating.

The existing codebase has well-established patterns for this: `get_user_role()` function already exists in the database (returns the `user_role` enum for the current user), cross-table RLS subqueries are used extensively (e.g., the UPDATE policy on `balance_chat_messages` already checks `uta.role IN ('admin', 'accountant')`), and the `BALANCE_PERMISSIONS` pattern in `annual-balance.types.ts` provides a client-side permission lookup model. Supabase RLS performance docs confirm that wrapping functions in `(select ...)` and avoiding source-target joins are critical for performance -- the proposed policy structure follows both recommendations.

**Primary recommendation:** Replace the existing `bcm_select_own_tenant` and `bcm_insert_own_tenant` RLS policies with role-aware versions that grant full access to admin/accountant roles and restrict bookkeeper role to balances where `auditor_id = auth.uid()`. Add a `canAccessBalanceChat(balanceCase, userRole, userId)` helper function in the service/types layer for UI gating. No new tables are needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL RLS | 15+ (Supabase managed) | Row-level security enforcement | Already in use on all tables, mandatory per project rules |
| `get_user_role()` | Existing DB function | Retrieve current user's role in tenant | Already exists, returns `user_role` enum, used by other RLS policies |
| `get_current_tenant_id()` | Existing DB function | Retrieve current tenant ID | Already used in all existing RLS policies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `BALANCE_PERMISSIONS` pattern | Existing in codebase | Client-side permission lookup | For UI gating (show/hide chat icon, disable input) |
| `hasBalancePermission()` | Existing helper | Check role against permission map | Extend with new `view_chat` / `send_chat` permission entries |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| RLS policy modification | Service-layer only checks | Service layer can be bypassed if someone queries Supabase directly; RLS is defense-in-depth |
| Cross-table subquery in RLS | Separate `balance_chat_participants` table | Extra table + migration + sync logic for a simple auditor_id check; overkill for current user count (10 users) |
| UI-only filtering (hide chat icon) | No backend enforcement | Security theater -- data still accessible via API; unacceptable |

## Architecture Patterns

### Pattern 1: Role-Aware RLS Policy with Cross-Table Check
**What:** Replace the existing tenant-only SELECT/INSERT policies with policies that also check user role and auditor assignment.
**When to use:** When access depends on both the user's role AND their relationship to a related record.
**Example:**

```sql
-- Source: Derived from existing codebase patterns in 20260209_balance_chat_messages.sql
-- and 20260206190809_annual_balance_sheets.sql

-- DROP existing policies first
DROP POLICY IF EXISTS "bcm_select_own_tenant" ON balance_chat_messages;

-- New SELECT policy: admin/accountant = full tenant access, bookkeeper = only assigned balances
CREATE POLICY "bcm_select_by_role"
  ON balance_chat_messages FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = (select get_current_tenant_id()) AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
          AND (
            -- Admin and accountant: full tenant access
            uta.role IN ('admin', 'accountant')
            OR
            -- Bookkeeper/other: only if they are the assigned auditor for this balance
            EXISTS (
              SELECT 1 FROM annual_balance_sheets abs
              WHERE abs.id = balance_chat_messages.balance_id
                AND abs.auditor_id = (select auth.uid())
            )
          )
      )
    )
  );
```

**Performance notes (from Supabase RLS docs):**
- `(select auth.uid())` and `(select get_current_tenant_id())` are wrapped in subselects for initPlan caching -- prevents re-evaluation per row.
- The `annual_balance_sheets` subquery uses `abs.id = balance_chat_messages.balance_id` which is a primary key lookup -- O(1) with the existing PK index.
- `balance_chat_messages` already has `idx_bcm_tenant_balance_created` index covering `(tenant_id, balance_id)`.

### Pattern 2: Client-Side Permission Check Function
**What:** A TypeScript function that determines chat access based on user role and auditor assignment, used for UI gating.
**When to use:** Before showing the chat icon, before enabling the chat input, and when opening the chat sheet.
**Example:**

```typescript
// Source: Extends existing BALANCE_PERMISSIONS pattern in annual-balance.types.ts

/**
 * Check if a user can access the chat for a specific balance case.
 * Admin and accountant roles have full access.
 * Bookkeeper role requires being the assigned auditor.
 */
export function canAccessBalanceChat(
  role: string,
  userId: string,
  balanceCase: { auditor_id: string | null }
): boolean {
  if (role === 'admin' || role === 'accountant') return true;
  if (role === 'bookkeeper' && balanceCase.auditor_id === userId) return true;
  return false;
}
```

### Pattern 3: Service-Layer Permission Guard
**What:** A method on `BalanceChatService` that verifies permissions before fetching/sending, providing a user-friendly error.
**When to use:** As a secondary check in the service layer, before the RLS policy is hit.
**Example:**

```typescript
// Source: Follows existing BaseService pattern

async checkChatAccess(balanceId: string): Promise<ServiceResponse<boolean>> {
  try {
    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: false, error: new Error('User not authenticated') };

    // Get user role
    const role = user.user_metadata?.role as string;

    // Admin/accountant: always allowed
    if (role === 'admin' || role === 'accountant') {
      return { data: true, error: null };
    }

    // Bookkeeper: check if assigned auditor
    const { data: balance } = await supabase
      .from('annual_balance_sheets')
      .select('auditor_id')
      .eq('id', balanceId)
      .eq('tenant_id', tenantId)
      .single();

    if (balance?.auditor_id === user.id) {
      return { data: true, error: null };
    }

    return { data: false, error: new Error('אין לך הרשאה לצפות בשיחה זו') };
  } catch (error) {
    return { data: null, error: this.handleError(error as Error) };
  }
}
```

### Anti-Patterns to Avoid
- **UI-only permission checks without RLS enforcement:** Never rely solely on hiding the chat icon. A malicious user could query the API directly. RLS is the true security boundary.
- **Joining source table to target in RLS:** The Supabase RLS performance guide warns against `WHERE target_table.col = source_table.col` patterns. Instead, use `source_col IN (SELECT col FROM target WHERE condition)` pattern. In our case, the subquery `EXISTS (SELECT 1 FROM annual_balance_sheets abs WHERE abs.id = balance_chat_messages.balance_id AND abs.auditor_id = auth.uid())` is acceptable because it uses a PK lookup on `abs.id`, not a scan.
- **Checking role from `user_metadata` in RLS:** The Supabase docs explicitly warn that `user_metadata` can be modified by the user. The `user_tenant_access.role` column is the source of truth for authorization. However, for client-side UI gating, using `user_metadata.role` (from `useAuth()`) is acceptable since it's only for UX -- the RLS policy enforces the real check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User role lookup in RLS | Custom role-fetching subquery | `get_user_role()` function (already exists) or inline `user_tenant_access` check | Function is cached with `(select get_user_role())`, already proven in production |
| Permission checking pattern | New permission framework | Extend existing `BALANCE_PERMISSIONS` + `hasBalancePermission()` | Already used throughout the annual-balance module, consistent UX |
| Tenant isolation | Custom tenant check | `get_current_tenant_id()` + `user_tenant_access` EXISTS pattern | Every RLS policy in the project uses this exact pattern |

**Key insight:** This phase requires zero new infrastructure. All building blocks exist: `get_user_role()`, `user_tenant_access` table, `annual_balance_sheets.auditor_id` column, `BALANCE_PERMISSIONS` pattern, and `hasBalancePermission()` helper. The work is purely wiring existing pieces together.

## Common Pitfalls

### Pitfall 1: RLS Policy Performance with Cross-Table Subqueries
**What goes wrong:** Adding a subquery to `annual_balance_sheets` in the RLS policy could slow down every chat message SELECT if not properly indexed or structured.
**Why it happens:** The subquery `EXISTS (SELECT 1 FROM annual_balance_sheets WHERE id = balance_id AND auditor_id = auth.uid())` runs for every row that passes the tenant filter. Without proper indexing, this becomes a sequential scan.
**How to avoid:** The `annual_balance_sheets.id` is a primary key (indexed by default), so the lookup is O(1). Additionally, wrapping `auth.uid()` in `(select auth.uid())` enables initPlan caching. The existing `idx_abs_auditor_id` index on `annual_balance_sheets(auditor_id)` also helps.
**Warning signs:** If chat message loading becomes noticeably slower after the migration, check `EXPLAIN ANALYZE` on the query.

### Pitfall 2: Admin/Accountant Short-Circuit Evaluation
**What goes wrong:** If the RLS policy checks the auditor_id subquery before checking the role, every admin/accountant query unnecessarily hits `annual_balance_sheets`.
**Why it happens:** SQL `OR` evaluation order is not guaranteed in PostgreSQL.
**How to avoid:** Structure the policy so the role check (`uta.role IN ('admin', 'accountant')`) appears first in the OR clause. PostgreSQL's optimizer typically evaluates cheaper conditions first when using EXISTS with OR, but the structure helps. Alternative: use two separate policies (one for admin/accountant, one for bookkeeper) -- PostgreSQL ORs multiple SELECT policies together.
**Warning signs:** Slow queries for admin users who should have the fastest path.

### Pitfall 3: Forgetting the INSERT Policy
**What goes wrong:** Updating SELECT policy but leaving INSERT policy unchanged means unauthorized users can still SEND messages even if they cannot READ them.
**Why it happens:** Developers focus on the read path and forget that INSERT also needs the same permission logic.
**How to avoid:** Always update SELECT and INSERT policies together. The INSERT policy needs the same role + auditor_id check as SELECT, plus the existing `user_id = auth.uid()` constraint.

### Pitfall 4: Realtime Channel Not Filtered by Permissions
**What goes wrong:** The Supabase Realtime subscription in `subscribeToBalanceChat()` uses server-side `tenant_id` filter only. After Phase 5, an unauthorized user who opens a Realtime channel would still receive messages they shouldn't see (Realtime bypasses RLS for server-side filters).
**Why it happens:** Supabase Realtime with `postgres_changes` applies RLS to the initial subscription but the server-side filter `tenant_id=eq.${tenantId}` is an additional filter that doesn't check auditor assignment.
**How to avoid:** The client-side `balance_id` filter in the `onMessage` callback already prevents displaying wrong-balance messages. The UI gating (`canAccessBalanceChat`) prevents unauthorized users from opening the chat sheet at all. Additionally, since Phase 4's Realtime subscription is inside the `BalanceChatSheet` component which only mounts when the sheet is open, and the sheet won't open for unauthorized users, this is effectively mitigated. However, note that **Supabase Realtime DOES apply RLS** for `postgres_changes` events -- the user only receives events for rows they can SELECT. So the updated RLS policy will also filter Realtime events correctly.
**Warning signs:** If an unauthorized user somehow opens the sheet, they would see no historical messages (RLS blocks SELECT) but could theoretically receive Realtime events if RLS isn't applied to Realtime. Verify Realtime respects RLS in testing.

### Pitfall 5: Stale Role in Client State
**What goes wrong:** The `useAuth()` hook reads role from `user_metadata` in the JWT. If an admin changes a user's role, the old role persists until the JWT refreshes (typically 1 hour).
**Why it happens:** JWTs are stateless and cached.
**How to avoid:** This is acceptable for UI gating because the RLS policy checks `user_tenant_access` directly (source of truth). The UI might show the chat icon briefly for a demoted user, but the RLS policy will block the actual data access. Document this as a known limitation.

## Code Examples

### Example 1: Complete RLS Policy Migration SQL

```sql
-- Source: Derived from existing patterns in the codebase

-- Drop existing tenant-only policies
DROP POLICY IF EXISTS "bcm_select_own_tenant" ON balance_chat_messages;
DROP POLICY IF EXISTS "bcm_insert_own_tenant" ON balance_chat_messages;

-- New SELECT policy: role-based with auditor assignment check
CREATE POLICY "bcm_select_by_role"
  ON balance_chat_messages FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = (select get_current_tenant_id()) AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
          AND (
            uta.role IN ('admin', 'accountant')
            OR
            EXISTS (
              SELECT 1 FROM annual_balance_sheets abs
              WHERE abs.id = balance_chat_messages.balance_id
                AND abs.auditor_id = (select auth.uid())
            )
          )
      )
    )
  );

-- New INSERT policy: same role check + user_id = auth.uid()
CREATE POLICY "bcm_insert_by_role"
  ON balance_chat_messages FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = (select get_current_tenant_id()) AND
      user_id = (select auth.uid()) AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = (select auth.uid())
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
          AND (
            uta.role IN ('admin', 'accountant')
            OR
            EXISTS (
              SELECT 1 FROM annual_balance_sheets abs
              WHERE abs.id = balance_chat_messages.balance_id
                AND abs.auditor_id = (select auth.uid())
            )
          )
      )
    )
  );

-- UPDATE policy remains unchanged (already restricted to admin/accountant)
```

### Example 2: Client-Side Permission Helper

```typescript
// Source: Extends existing BALANCE_PERMISSIONS pattern

// Add to BALANCE_PERMISSIONS in annual-balance.types.ts
export const BALANCE_PERMISSIONS: Record<string, BalanceUserRole[]> = {
  // ... existing entries ...
  view_chat: ['admin', 'accountant', 'bookkeeper'], // bookkeeper needs auditor_id check
  send_chat: ['admin', 'accountant', 'bookkeeper'], // bookkeeper needs auditor_id check
};

/**
 * Check if a user can access the balance chat.
 * Admin/accountant: always.
 * Bookkeeper: only if they are the assigned auditor.
 */
export function canAccessBalanceChat(
  role: string,
  userId: string,
  balanceCase: { auditor_id: string | null }
): boolean {
  if (role === 'admin' || role === 'accountant') return true;
  if (role === 'bookkeeper' && balanceCase.auditor_id === userId) return true;
  return false;
}
```

### Example 3: UI Gating in BalanceTable

```typescript
// Source: Follows existing pattern in BalanceTable.tsx for canAdvance checks

// In the table row rendering, conditionally show the chat icon:
{canAccessBalanceChat(userRole, user?.id || '', row) && (
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7 shrink-0"
    onClick={() => onChatClick(row)}
  >
    <MessageCircle className="h-4 w-4 text-muted-foreground" />
  </Button>
)}
```

### Example 4: Error State in BalanceChatSheet

```typescript
// Source: Follows existing error handling patterns

// In BalanceChatSheet, check permission before rendering:
const hasAccess = canAccessBalanceChat(role || '', user?.id || '', balanceCase || { auditor_id: null });

if (!hasAccess) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[400px] p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-right">שיחה</SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <p className="text-muted-foreground">אין לך הרשאה לצפות בשיחה זו</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tenant-only RLS on `balance_chat_messages` | Role + assignment-aware RLS | Phase 5 (this phase) | Restricts bookkeeper access to assigned balances only |
| Chat icon always visible | Conditional chat icon based on role + assignment | Phase 5 (this phase) | Bookkeepers only see chat icon for their assigned balances |

**No deprecated approaches** -- this is a new capability being added to existing infrastructure.

## Open Questions

1. **Should the `restricted` role have any chat access?**
   - What we know: There is 1 user with `restricted` role in the database. The `restricted` role has a `restricted_route` permission in the `permissions` JSONB column.
   - What's unclear: Whether restricted users should ever see balance chats.
   - Recommendation: Exclude `restricted` role from chat access entirely (they are not in the `admin`/`accountant`/`bookkeeper` list, so they are blocked by default). This is the safe default.

2. **What happens when an auditor is unassigned from a balance?**
   - What we know: The `auditor_id` on `annual_balance_sheets` can be changed. If a bookkeeper was the auditor and gets unassigned, their chat access is immediately revoked by the RLS policy.
   - What's unclear: Should they still be able to read old messages they participated in?
   - Recommendation: No -- once unassigned, they lose access. This is simpler and more secure. Their messages remain visible to admin/accountant users. If needed later, a `chat_participants` table could track historical participation.

3. **Two-policy vs single-policy approach for RLS**
   - What we know: PostgreSQL allows multiple SELECT policies on a table, which are combined with OR. This means we could create one policy for admin/accountant (simple, fast) and a separate policy for bookkeeper (with the auditor_id subquery). This could improve performance for admin/accountant users.
   - Recommendation: Use a single policy with an OR clause. The admin/accountant path short-circuits before hitting the subquery in most query plans. Two policies add migration complexity without significant benefit at the current scale (10 users, ~1300 balance sheets). Can be split later if performance testing reveals issues.

## Sources

### Primary (HIGH confidence)
- Existing migration `20260209_balance_chat_messages.sql` -- current RLS policies
- Existing migration `20260206190809_annual_balance_sheets.sql` -- `auditor_id` column, RLS patterns
- Existing `balance-chat.service.ts` -- current service layer
- Existing `annual-balance.types.ts` -- `BALANCE_PERMISSIONS` pattern, `canAccessBalanceChat` model
- Existing `AuthContext.tsx` -- role from user_metadata, tenantId
- Database: `get_user_role()` function signature and implementation
- Database: `user_tenant_access` table schema (role is varchar, not enum)
- Database: current live RLS policies on `balance_chat_messages`
- Supabase RLS Performance Guide (official docs) -- initPlan caching, join avoidance

### Secondary (MEDIUM confidence)
- Supabase Realtime behavior with RLS -- docs state that `postgres_changes` respects RLS for filtering events

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components already exist in the codebase
- Architecture: HIGH -- follows established codebase patterns exactly
- Pitfalls: HIGH -- verified against Supabase official RLS performance docs and existing codebase patterns

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no moving parts)
