# Phase 9: Notifications - Research

**Researched:** 2026-02-10
**Domain:** Real-time toast notifications (Sonner), global Supabase Realtime subscriptions, SendGrid email notifications from Edge Functions
**Confidence:** HIGH

## Summary

Phase 9 adds two notification capabilities: (1) in-app toast notifications via Sonner when new chat messages arrive for any balance the user has access to, and (2) email notification via SendGrid when a balance is assigned to an auditor for the first time.

The **toast notification** (NOTF-01) requires a **global-level Realtime subscription** that listens for ALL new `balance_chat_messages` across the tenant, not just for a single open balance. Currently, the Realtime subscription in `BalanceChatSheet` is scoped to a single `balance_id` and only exists when the chat Sheet is open. Phase 9 needs a tenant-wide subscription that runs at the page level (or higher) and fires a Sonner toast for messages the current user didn't send, for balances they have access to. The access check uses the existing `canAccessBalanceChat(role, userId, { auditor_id })` function, which means we need the `auditor_id` for each balance to determine if a bookkeeper should see the notification. This requires either pre-fetching auditor assignments or checking against the store's `cases` array. The store already has `cases: AnnualBalanceSheetWithClient[]` with `auditor_id` on each case, so the access check can be performed client-side against the store data.

The **email notification** (NOTF-02) requires detecting "first assignment" (balance was previously unassigned, now has an auditor). The `assignAuditor()` service method already exists and is the only place where `auditor_id` is set. The email should be sent server-side via a Supabase Edge Function (not from the browser) because: (a) SendGrid API keys should not be exposed to the client, (b) edge functions already handle all email sending in the project, and (c) the existing `send-letter` edge function with `simpleMode: true` already supports sending plain HTML transactional emails. Alternatively, a dedicated lightweight edge function or a database trigger + webhook could be used. The simplest approach is to call the existing `send-letter` edge function with `simpleMode: true` from the `assignAuditor()` method, since it already handles auth, CORS, and SendGrid integration.

**Primary recommendation:** Add a global Realtime subscription in `AnnualBalancePage` that listens for new `balance_chat_messages` (tenant-scoped, same pattern as existing unread tracking subscription) and fires `toast.custom()` with a rich JSX notification. For email, call the existing `send-letter` edge function in `simpleMode` from `assignAuditor()` when the balance previously had no auditor.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Sonner | 2.0.7 (installed) | Toast notifications with custom JSX | Already used throughout the project via `toast.error/success` |
| Supabase Realtime | @supabase/supabase-js 2.x (installed) | Global message subscription for toasts | Already used for per-balance chat and unread tracking |
| send-letter Edge Function | Deployed | Email sending via SendGrid with `simpleMode` | Already supports plain HTML transactional emails |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `canAccessBalanceChat` (internal) | N/A | Client-side permission check for toast filtering | Filter which messages generate toasts |
| `useAnnualBalanceStore` (internal) | N/A | Access `cases` array for auditor_id lookups | Permission check for bookkeeper role |
| `useAuth` (internal) | N/A | Current user ID, role, tenantId | Filter own messages, check permissions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Global Realtime in AnnualBalancePage | Global Realtime in App.tsx | App-level would work across all pages but adds complexity for a feature only relevant on the balance page. Keep it in AnnualBalancePage for now. |
| `send-letter` simpleMode for email | New dedicated edge function | send-letter already handles auth, CORS, SendGrid. Reusing it avoids deploying another function. Trade-off: coupling to letter system. |
| `toast.custom()` with rich JSX | `toast.message()` with description | `toast.custom()` gives full control over layout including RTL, sender name formatting, clickable area. `toast.message()` is simpler but less flexible. |
| Client-side email trigger (from assignAuditor) | Database trigger on `annual_balance_sheets.auditor_id` change | DB trigger guarantees email even from direct SQL, but requires access to user email (auth.users), tenant settings, and SendGrid API from SQL context. Over-engineered for this use case. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### NOTF-01: Toast Notification Architecture

```
AnnualBalancePage mounts
  |
  v
useEffect subscribes to: supabase.channel(`chat-notifications:${tenantId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'balance_chat_messages', filter: `tenant_id=eq.${tenantId}` })
  |
  v
On new message:
  1. Skip if user_id === currentUser.id (own message)
  2. Skip if message_type === 'system' (system messages don't need toast - they have the unread badge)
  3. Find balance in store.cases by balance_id
  4. Skip if canAccessBalanceChat(role, userId, { auditor_id }) === false
  5. Enrich with sender name (from store's user map or userMapRef)
  6. Fire toast.custom() with sender name, client name, message preview
```

### Pattern 1: Global Tenant-Scoped Realtime Subscription
**What:** A second `postgres_changes` subscription on `balance_chat_messages` at the page level, separate from the per-balance subscription in `BalanceChatSheet`.
**When to use:** While AnnualBalancePage is mounted.
**Key distinction:** The existing subscription in `BalanceChatSheet` handles message delivery to the open chat panel. The new subscription handles toast notifications for ALL balances (whether chat is open or not). These are independent -- the toast subscription does NOT feed into the messages state.

```typescript
// Source: AnnualBalancePage.tsx, new useEffect
useEffect(() => {
  if (!tenantId || !user) return;

  const channel = supabase
    .channel(`chat-notifications:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'balance_chat_messages',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        const msg = payload.new as BalanceChatMessageRow;

        // Skip own messages and system messages
        if (msg.user_id === user.id) return;
        if (msg.message_type === 'system') return;

        // Check access: find balance in store
        const balanceCase = cases.find(c => c.id === msg.balance_id);
        if (!balanceCase) return; // Balance not in current view
        if (!canAccessBalanceChat(role, user.id, { auditor_id: balanceCase.auditor_id })) return;

        // Fire toast
        const clientName = balanceCase.client?.company_name || '';
        const preview = msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content;

        toast.custom((id) => (
          <ChatNotificationToast
            id={id}
            clientName={clientName}
            senderName={/* enriched from user map */}
            preview={preview}
            onDismiss={() => toast.dismiss(id)}
            onClick={() => {
              // Open chat for this balance
              setChatBalanceCase(balanceCase);
              setChatOpen(true);
              clearUnreadCount(balanceCase.id);
              toast.dismiss(id);
            }}
          />
        ), { duration: 8000 });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tenantId, user, role, cases]);
```

### Pattern 2: ChatNotificationToast Component
**What:** A small presentational component for the toast notification content.
**When to use:** Rendered inside `toast.custom()`.
**Design:** RTL-aware, shows sender name, client/balance identifier, and message preview. Clickable to open the chat sheet for that balance.

```typescript
// Source: New component, e.g., src/modules/annual-balance/components/ChatNotificationToast.tsx

interface ChatNotificationToastProps {
  id: string | number;
  senderName: string;
  clientName: string;
  preview: string;
  onDismiss: () => void;
  onClick: () => void;
}

function ChatNotificationToast({ id, senderName, clientName, preview, onDismiss, onClick }: ChatNotificationToastProps) {
  return (
    <div
      dir="rtl"
      className="w-[356px] bg-background border border-border rounded-lg shadow-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{senderName}</span>
            <span className="text-xs text-muted-foreground truncate">· {clientName}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDismiss(); }} className="shrink-0">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
```

### Pattern 3: Sender Name Enrichment for Toast
**What:** The Realtime payload includes `user_id` but not the sender's display name. We need to resolve this.
**Approach:** Use the store's `cases` data plus a user map. The `BalanceChatSheet` already maintains a `userMapRef` for sender enrichment. For the toast notification, we need a similar approach at the page level.

**Options (in order of preference):**
1. **Maintain a tenant user map in the store or a ref** -- fetch once via `get_users_for_tenant` RPC when the page mounts, cache it. Lookup sender name from the map when a Realtime message arrives.
2. **Use `user.user_metadata.full_name` from the BalanceChatSheet's userMap** -- but this is scoped to the Sheet component, not accessible from the page.
3. **Show a generic "הודעה חדשה" without sender name** -- degraded experience but simpler.

**Recommendation:** Option 1. Fetch tenant users once on mount and store in a ref. This is the same pattern already used in `BalanceChatSheet` (lines 69-81) and `BalanceChatService.getMessages()` (lines 60-70).

### Pattern 4: Avoiding Duplicate Notifications
**What:** When the chat sheet is OPEN for a specific balance, the user already sees new messages in real-time. Showing a toast for the same message would be redundant.
**How to avoid:** Check if the chat sheet is currently open for that specific balance_id. If `chatOpen && chatBalanceCase?.id === msg.balance_id`, skip the toast.

```typescript
// Inside the Realtime callback:
if (chatOpen && chatBalanceCase?.id === msg.balance_id) return; // Already visible in open chat
```

### NOTF-02: Email on First Auditor Assignment

```
User clicks "Assign Auditor" → AssignAuditorDialog → annualBalanceService.assignAuditor()
  |
  v
assignAuditor() checks: was auditor_id previously null?
  |
  YES → First assignment → Send email notification
  |
  v
Call supabase.functions.invoke('send-letter', {
  body: {
    simpleMode: true,
    recipientEmails: [auditorEmail],
    recipientName: auditorName,
    subject: 'תיק מאזן חדש שויך אליך',
    customText: `שלום ${auditorName},\n\nתיק מאזן שנתי חדש שויך אליך:\n\nלקוח: ${clientName}\nח.פ./ע.מ.: ${taxId}\nשנת מס: ${year}\n\nלצפייה בתיק ולשיחה עם הצוות:\n${appUrl}/annual-balance?highlight=${balanceId}`
  }
})
```

**Key design decisions for email:**
- **First assignment only:** Check if the balance's current `auditor_id` is null before the update. If it's already set (re-assignment), skip the email. This prevents notification fatigue on re-assignments.
- **Use existing `send-letter` edge function** with `simpleMode: true`: Reuses auth, CORS, and SendGrid integration. No new edge function needed.
- **Auditor email lookup:** The `assignAuditor()` method already looks up the auditor name via `get_user_with_auth` RPC in the system message IIFE. The email is available from the same RPC result. The email send can be added to the same IIFE.
- **Fire-and-forget:** Same pattern as system messages -- the email send should not block the assignment operation.
- **Link to balance page:** Include a URL that opens the annual balance page. The URL can include a query parameter to highlight or scroll to the specific balance, but this is a nice-to-have (Phase 10 polish).

### Anti-Patterns to Avoid
- **Subscribing to ALL tables globally in App.tsx:** Over-scoped. Balance chat notifications are only relevant when viewing the annual balance page.
- **Using browser Notification API / push notifications:** Out of scope per REQUIREMENTS.md ("Desktop push notifications: Toast + email sufficient for small team").
- **Sending email from the browser (client-side SendGrid):** Exposes API keys. Always use edge functions for email.
- **Creating a new edge function for a single email:** The existing `send-letter` with `simpleMode` already handles this. Don't add deployment complexity.
- **Polling for new messages instead of Realtime:** Wastes bandwidth and has latency. Realtime is already proven in this codebase.
- **Showing toast for own messages:** The user already sees their own message via optimistic update. Toasting it would be redundant and confusing.
- **Showing toast for system messages:** System messages (status changes, assignments) generate unread badges. A toast on top of that would be noisy, especially since the acting user triggers them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | Sonner `toast.custom()` | Already installed (v2.0.7), configured in main.tsx with RTL support, position top-center |
| Email sending | Browser-side SendGrid API call | `send-letter` edge function (simpleMode) | API key stays server-side, handles CORS, auth, logging |
| Realtime subscriptions | Custom WebSocket connection | Supabase Realtime `postgres_changes` | Already used for chat messages and unread tracking, handles reconnection |
| Permission checking | New RLS policy for notifications | `canAccessBalanceChat()` pure function | Already exists, tested, covers admin/accountant/bookkeeper roles |
| User name resolution | Per-message RPC call | Batch `get_users_for_tenant` RPC cached in ref | Pattern already used in BalanceChatSheet and BalanceChatService |

**Key insight:** Phase 9 adds NO new libraries, NO new database tables, and potentially NO new edge functions. It wires together existing infrastructure (Sonner, Supabase Realtime, send-letter edge function, canAccessBalanceChat) in new ways.

## Common Pitfalls

### Pitfall 1: Toast Fires When Chat Sheet Is Open for That Balance
**What goes wrong:** User has chat open for Balance A. Another user sends a message. The user sees the message appear in the chat panel AND gets a toast notification for the same message.
**Why it happens:** Two independent Realtime subscriptions (per-balance in BalanceChatSheet + global in AnnualBalancePage) both receive the INSERT event.
**How to avoid:** In the global subscription callback, check if `chatOpen && chatBalanceCase?.id === msg.balance_id`. If true, skip the toast.
**Warning signs:** Duplicate notification for messages that are already visible in the open chat.

### Pitfall 2: Stale `cases` Array in Realtime Callback
**What goes wrong:** The Realtime callback captures a stale reference to the `cases` array (closure over old state). When a new message arrives for a balance that was recently added or whose auditor was just changed, the access check uses outdated data.
**Why it happens:** React closure over `cases` in the useEffect dependency array. If `cases` changes, the subscription is torn down and recreated, but there's a brief window.
**How to avoid:** Include `cases` in the useEffect dependency array. This means the subscription reconnects whenever cases change. At current scale (< 1000 cases, infrequent changes), this is acceptable. Alternatively, use a ref (`casesRef.current = cases`) to always access the latest value without re-subscribing.
**Recommendation:** Use a ref for `cases` to avoid subscription churn:
```typescript
const casesRef = useRef(cases);
casesRef.current = cases;
// In callback: const balanceCase = casesRef.current.find(...)
```
**Warning signs:** Bookkeeper doesn't get a toast for a balance they were just assigned to.

### Pitfall 3: Email Sent on Re-Assignment (Not Just First Assignment)
**What goes wrong:** Admin re-assigns a balance from Auditor A to Auditor B. Both Auditor A and Auditor B receive email notifications, or Auditor B gets an email even though it's a re-assignment (the STATE.md says "email only on first assignment").
**Why it happens:** The `assignAuditor()` method doesn't distinguish between first assignment and re-assignment.
**How to avoid:** Before the update, check if the current `auditor_id` is null. The `assignAuditor()` method already fetches the current record (`current.status`). Extend that to also select `auditor_id`:
```typescript
const { data: current } = await supabase
  .from('annual_balance_sheets')
  .select('status, auditor_id')  // <-- add auditor_id
  .eq('id', id)
  .eq('tenant_id', tenantId)
  .single();

const isFirstAssignment = !current.auditor_id;
```
**Warning signs:** Auditors receiving multiple assignment emails for the same balance.

### Pitfall 4: Sender Name Missing in Toast
**What goes wrong:** The toast shows "הודעה חדשה" without the sender's name because the Realtime payload only has `user_id`, not the name.
**Why it happens:** `postgres_changes` delivers the raw row, which doesn't include sender metadata.
**How to avoid:** Pre-fetch tenant users on page mount and cache in a ref. Look up `user_id` in the map when a message arrives. This is the exact same pattern used in `BalanceChatSheet` (lines 69-81).
**Warning signs:** Toasts with missing or "Unknown" sender names.

### Pitfall 5: Toast Fires for Balances Not in Current Filter View
**What goes wrong:** User has filtered the table to show only "in_progress" balances. A message arrives for a "waiting_for_materials" balance. The toast fires because the global subscription doesn't know about the filter.
**Why it happens:** The subscription is tenant-wide, not filtered by current UI filters.
**How to avoid:** This is actually CORRECT behavior. The user should be notified of messages for ANY balance they have access to, not just the ones currently visible in the table. The notification helps them discover activity they might otherwise miss.
**Important:** Do NOT filter toasts by the current table filter. Toasts are for awareness, not for the current view.

### Pitfall 6: Race Between Email Send and `assignAuditor` Response
**What goes wrong:** The email send (via edge function) is fire-and-forget. If the edge function takes a long time, the `assignAuditor()` method has already returned success. The user sees "auditor assigned" but the email hasn't been sent yet. If the email fails, no one knows.
**Why it happens:** Fire-and-forget pattern trades reliability for responsiveness.
**How to avoid:** Log the edge function call result (success/failure) to the console. For v1, this is acceptable since the system message in chat already notifies the auditor. The email is a supplementary notification, not the primary one.
**Warning signs:** Email delivery failures silently ignored.

## Code Examples

### Example 1: Global Realtime Subscription for Toast Notifications

```typescript
// Source: AnnualBalancePage.tsx (new useEffect, alongside existing unread tracking subscription)

// Ref to avoid subscription churn when cases change
const casesRef = useRef(cases);
casesRef.current = cases;

// Ref to track if chat is open for a specific balance (avoids stale closure)
const chatStateRef = useRef({ open: chatOpen, balanceId: chatBalanceCase?.id });
chatStateRef.current = { open: chatOpen, balanceId: chatBalanceCase?.id };

// User map for sender name enrichment
const tenantUsersRef = useRef<Map<string, string>>(new Map());

// Fetch tenant users once on mount for sender name resolution
useEffect(() => {
  const fetchUsers = async () => {
    const { data } = await supabase.rpc('get_users_for_tenant');
    if (data) {
      const map = new Map<string, string>();
      for (const u of data) {
        map.set(u.user_id, u.full_name || u.email);
      }
      tenantUsersRef.current = map;
    }
  };
  fetchUsers();
}, []);

// Global toast notification subscription
useEffect(() => {
  const currentTenantId = user?.user_metadata?.tenant_id;
  if (!currentTenantId || !user) return;

  const channel = supabase
    .channel(`chat-notifications:${currentTenantId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'balance_chat_messages',
        filter: `tenant_id=eq.${currentTenantId}`,
      },
      (payload) => {
        const msg = payload.new as { id: string; balance_id: string; user_id: string; content: string; message_type: string };

        // Skip own messages and system messages
        if (msg.user_id === user.id) return;
        if (msg.message_type === 'system') return;

        // Skip if chat is open for this specific balance
        if (chatStateRef.current.open && chatStateRef.current.balanceId === msg.balance_id) return;

        // Check access
        const balanceCase = casesRef.current.find(c => c.id === msg.balance_id);
        if (!balanceCase) return;
        if (!canAccessBalanceChat(role || '', user.id, { auditor_id: balanceCase.auditor_id })) return;

        // Enrich sender name
        const senderName = tenantUsersRef.current.get(msg.user_id) || 'משתמש';
        const clientName = balanceCase.client?.company_name || '';
        const preview = msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content;

        toast.custom((id) => (
          <ChatNotificationToast
            id={id}
            senderName={senderName}
            clientName={clientName}
            preview={preview}
            onDismiss={() => toast.dismiss(id)}
            onClick={() => {
              setChatBalanceCase(balanceCase);
              setChatOpen(true);
              clearUnreadCount(balanceCase.id);
              toast.dismiss(id);
            }}
          />
        ), { duration: 8000 });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.user_metadata?.tenant_id, user?.id, role]);
```

### Example 2: ChatNotificationToast Component

```typescript
// Source: src/modules/annual-balance/components/ChatNotificationToast.tsx

import { MessageCircle, X } from 'lucide-react';

interface ChatNotificationToastProps {
  id: string | number;
  senderName: string;
  clientName: string;
  preview: string;
  onDismiss: () => void;
  onClick: () => void;
}

export function ChatNotificationToast({
  senderName,
  clientName,
  preview,
  onDismiss,
  onClick,
}: ChatNotificationToastProps) {
  return (
    <div
      dir="rtl"
      className="w-[356px] bg-background border border-border rounded-lg shadow-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{senderName}</span>
            <span className="text-xs text-muted-foreground truncate">
              · {clientName}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="shrink-0 p-0.5 rounded-sm hover:bg-muted"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
```

### Example 3: Email on First Auditor Assignment

```typescript
// Source: annual-balance.service.ts, inside assignAuditor(), modify the existing IIFE

// Change the current select to include auditor_id:
const { data: current, error: fetchError } = await supabase
  .from('annual_balance_sheets')
  .select('status, auditor_id, client_id, year')  // <-- add auditor_id, client_id, year
  .eq('id', id)
  .eq('tenant_id', tenantId)
  .single();

const isFirstAssignment = !current.auditor_id;

// Expand the existing fire-and-forget IIFE:
void (async () => {
  try {
    const { data: auditorInfo } = await supabase.rpc('get_user_with_auth', {
      p_user_id: auditorId,
    });
    const auditorDisplayName = auditorInfo?.[0]?.full_name || auditorInfo?.[0]?.email || '';
    const auditorEmail = auditorInfo?.[0]?.email || '';

    // System message (existing)
    balanceChatService.sendSystemMessage(id, `מאזן שויך למבקר ${auditorDisplayName}`);

    // Email notification on first assignment only
    if (isFirstAssignment && auditorEmail) {
      // Fetch client info for the email
      const { data: clientInfo } = await supabase
        .from('clients')
        .select('company_name, tax_id')
        .eq('id', current.client_id)
        .single();

      const clientName = clientInfo?.company_name || '';
      const taxId = clientInfo?.tax_id || '';
      const year = current.year;
      const appUrl = window?.location?.origin || 'https://ticovision.vercel.app';

      await supabase.functions.invoke('send-letter', {
        body: {
          simpleMode: true,
          recipientEmails: [auditorEmail],
          recipientName: auditorDisplayName,
          subject: `תיק מאזן שנתי חדש שויך אליך - ${clientName}`,
          customText: [
            `שלום ${auditorDisplayName},`,
            '',
            'תיק מאזן שנתי חדש שויך אליך:',
            '',
            `לקוח: ${clientName}`,
            `ח.פ./ע.מ.: ${taxId}`,
            `שנת מס: ${year}`,
            '',
            `לצפייה בתיק: ${appUrl}/annual-balance`,
          ].join('\n'),
        },
      });
    }
  } catch {
    // Non-critical — silently ignore
  }
})();
```

### Example 4: Sonner Toaster Configuration (Already Correct)

```typescript
// Source: main.tsx (ALREADY CONFIGURED - no changes needed)
<Toaster
  position="top-center"
  richColors
  dir="rtl"
  duration={6000}
  expand={true}
  closeButton={true}
/>
```

Note: The global Toaster already has `dir="rtl"`. Custom toasts rendered via `toast.custom()` still need their own `dir="rtl"` on the root element because `toast.custom()` bypasses the default styling.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for new messages | Supabase Realtime `postgres_changes` | Standard since supabase-js v2 | Sub-second message delivery, no polling overhead |
| Browser Notification API | In-app toast (Sonner) | Project decision | Works without OS permission, consistent UX across browsers |
| Dedicated notification edge function | Reuse `send-letter` with `simpleMode` | Project pattern | Fewer functions to maintain, consistent SendGrid configuration |

## Open Questions

1. **Should toasts show for ALL balances or only current-year balances?**
   - What we know: The AnnualBalancePage always has a year filter (default: current year - 1). The store's `cases` array only contains the currently filtered results.
   - What's unclear: If a message arrives for a balance from a different year, the balance won't be in `cases`, so the toast will be skipped by the `find()` check.
   - Recommendation: Accept this limitation for v1. Users viewing 2025 balances won't get toasts for 2024 balance messages. This is reasonable because they're focused on the current year. A future enhancement could subscribe to ALL balances from `getUnreadCounts()` tracking data.

2. **Should the email include a direct link to the balance with chat pre-opened?**
   - What we know: The current routing is `/annual-balance` (single page with table). There's no deep link to a specific balance or to open the chat sheet.
   - What's unclear: Adding query parameter support (e.g., `?openChat=balanceId`) would require routing logic in AnnualBalancePage.
   - Recommendation: For v1, link to `/annual-balance` without a specific balance highlight. Add deep-linking in Phase 10 (Polish). The email provides context (client name, tax ID) so the auditor can find the balance.

3. **Should `window.location.origin` be used in edge function context?**
   - What we know: The `assignAuditor()` method runs in the browser, so `window.location.origin` is available. The email is sent via the edge function, but the URL is composed client-side before invoking the function.
   - What's unclear: Nothing -- this works because the URL is built client-side and passed as part of the `customText` string.
   - Recommendation: Use `window.location.origin` for the link. This correctly resolves to `https://ticovision.vercel.app` in production or `http://localhost:5173` in dev.

4. **Should we throttle toasts if many messages arrive rapidly?**
   - What we know: Sonner queues toasts and shows them in a stack (expand=true in current config). At current team size (10 users), burst messaging is unlikely.
   - What's unclear: Edge case behavior when 5+ messages arrive within 1 second.
   - Recommendation: Accept Sonner's default stacking behavior for v1. It handles queue management automatically. If it becomes an issue, add a simple debounce (max 1 toast per balance per 5 seconds).

## Sources

### Primary (HIGH confidence)
- **Existing codebase:** `BalanceChatSheet.tsx` -- Realtime subscription pattern (lines 169-181), sender enrichment via userMap ref (lines 69-81)
- **Existing codebase:** `AnnualBalancePage.tsx` -- Existing unread tracking Realtime subscription (lines 78-105), exact same channel pattern
- **Existing codebase:** `balance-chat.service.ts` -- `subscribeToBalanceChat()` (lines 281-304), channel naming convention, client-side balance_id filter
- **Existing codebase:** `canAccessBalanceChat()` in `annual-balance.types.ts` -- Permission check function (lines 256-264)
- **Existing codebase:** `main.tsx` -- Sonner Toaster config (position, RTL, duration, expand, closeButton)
- **Existing codebase:** `annual-balance.service.ts` -- `assignAuditor()` method (lines 489-564), current record fetch, system message IIFE pattern
- **Existing codebase:** `send-letter/index.ts` -- `simpleMode` handler (lines 1228-1250), builds simple HTML email and sends via SendGrid
- **Existing codebase:** `increment_balance_chat_unread` trigger -- Confirms Realtime subscription receives INSERT events for all balance_chat_messages
- **Sonner official docs:** `toast.custom()` API for rendering custom JSX -- https://sonner.emilkowal.ski/toast
- **Supabase Realtime publication:** `balance_chat_messages` already published to `supabase_realtime` -- verified via pg_publication_tables query

### Secondary (MEDIUM confidence)
- **Sonner npm:** Version 2.0.7 installed -- verified from package.json in node_modules
- **Supabase docs:** `postgres_changes` with single-column filter -- verified by existing working subscriptions in the codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all tools already in use and proven in this codebase
- Architecture: HIGH -- all patterns (Realtime subscription, toast, edge function invocation) are direct extensions of existing code
- Pitfalls: HIGH -- analyzed against actual codebase structure (stale closures, duplicate notifications, access checks)

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no external dependencies changing)
