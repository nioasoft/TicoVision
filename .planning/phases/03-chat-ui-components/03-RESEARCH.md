# Phase 3: Chat UI Components - Research

**Researched:** 2026-02-10
**Domain:** React UI components, shadcn/ui Sheet, chat message display, RTL layout
**Confidence:** HIGH

## Summary

Phase 3 builds the core chat UI for the annual-balance module: a Sheet side panel triggered from balance table rows, a scrollable message list with sender info, a text input with send functionality, and loading/empty states. All pieces for this phase already exist in the codebase as patterns -- the project has a working chat module (`src/modules/chat/`) with MessageThread, MessageInput, and ChatPanel components that serve as reference implementations, plus a shadcn/ui Sheet component already installed and available.

The `BalanceChatService` from Phase 2 is complete and provides `getMessages()`, `sendMessage()`, `softDeleteMessage()`, and `getMessageCount()` -- all returning `ServiceResponse<T>` types. The `BalanceChatMessageWithSender` type provides `sender_name`, `sender_email`, `content`, `created_at`, `message_type`, and `id` fields. No new npm packages are needed -- everything is already in the project.

**Primary recommendation:** Build 3 focused components (BalanceChatSheet, BalanceChatMessages, BalanceChatInput) inside `src/modules/annual-balance/components/`, wire a chat icon into BalanceTable rows, and use a local Zustand store slice or useState in the Sheet for chat state. Follow the exact patterns from the existing chat module but adapted for the balance-specific service.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Sheet | latest | Side panel overlay | Already installed at `src/components/ui/sheet.tsx`, Radix-based |
| shadcn/ui ScrollArea | latest | Scrollable message list | Already at `src/components/ui/scroll-area.tsx` |
| shadcn/ui Avatar | latest | Sender avatar display | Already at `src/components/ui/avatar.tsx` |
| shadcn/ui Input | latest | Message text input | Already used in existing MessageInput |
| lucide-react | installed | Icons (MessageCircle, Send, Loader2) | Project standard icon library |
| sonner | installed | Toast notifications for errors | Project standard for toasts |
| zustand | installed | Chat state management | Project standard state management |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/formatters` | project | formatIsraeliDate, formatIsraeliDateTime | Timestamp display on messages |
| `@/contexts/AuthContext` | project | useAuth() for current user | Identify own messages vs others |
| `@/lib/utils` | project | cn() classname helper | Conditional styling |
| `@/services/base.service` | project | ServiceResponse type | Service call return types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn/ui Sheet | Custom slide panel (like existing ChatPanel) | ChatPanel uses custom CSS transform; Sheet is the project's standard overlay pattern and is simpler |
| ScrollArea (Radix) | Native overflow-y-auto | Existing MessageThread uses native overflow-y-auto with scrollIntoView; simpler and proven. ScrollArea adds Radix complexity for no benefit here |
| Separate Zustand store | React useState in Sheet | Chat state is local to the open panel; no need for global store in Phase 3. Zustand store could be added in Phase 4 when Realtime needs it |

**Installation:**
```bash
# No installation needed -- all dependencies already present
```

## Architecture Patterns

### Recommended File Structure
```
src/modules/annual-balance/
├── components/
│   ├── BalanceChatSheet.tsx       # NEW - Sheet wrapper with header, composes Messages + Input
│   ├── BalanceChatMessages.tsx    # NEW - Scrollable message list with auto-scroll
│   ├── BalanceChatInput.tsx       # NEW - Text input with send button
│   ├── BalanceTable.tsx           # MODIFIED - Add chat icon column/button
│   └── ... (existing)
├── services/
│   └── balance-chat.service.ts   # EXISTS - Phase 2 output (no changes)
├── types/
│   └── balance-chat.types.ts     # EXISTS - Phase 2 output (no changes)
└── index.ts                      # MODIFIED - Export new components
```

### Pattern 1: Sheet Side Panel (from shadcn/ui)
**What:** Side panel that slides in from the left (in RTL context, left = secondary side)
**When to use:** When user needs to view contextual information without leaving the current page
**Example:**
```typescript
// Sheet opens from left side for RTL layout (left = secondary side in RTL)
// The shadcn Sheet defaults to "right" side, but for RTL we want "left"
// so the panel appears on the user's left while they keep seeing the table on right
<Sheet open={chatOpen} onOpenChange={setChatOpen}>
  <SheetContent side="left" className="w-[400px] sm:max-w-[400px] p-0 flex flex-col" dir="rtl">
    <SheetHeader className="p-4 border-b">
      <SheetTitle className="text-right">
        שיחה - {clientName}
      </SheetTitle>
      <SheetDescription className="text-right">
        {clientTaxId} | שנת {year}
      </SheetDescription>
    </SheetHeader>
    {/* Messages area */}
    {/* Input area */}
  </SheetContent>
</Sheet>
```
**RTL consideration:** In this RTL app, `side="left"` makes the sheet appear on the left of the viewport. This keeps the main balance table visible on the right (the primary reading side in RTL). This matches how the existing ChatPanel slides in from the left.

### Pattern 2: Message Display with Own/Other Styling (from existing MessageThread)
**What:** Chat bubble layout where own messages are styled differently from others
**When to use:** Any message list where current user identity matters
**Example:**
```typescript
// Source: src/modules/chat/components/MessageThread.tsx (adapted)
const { user } = useAuth();
const isOwn = msg.user_id === user?.id;

<div className={cn('flex', isOwn ? 'justify-start' : 'justify-end')}>
  <div className={cn(
    'max-w-[75%] rounded-lg px-3 py-2 text-sm',
    isOwn ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-900'
  )}>
    {!isOwn && (
      <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name}</p>
    )}
    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
    <p className="text-[10px] mt-1 opacity-70">{formatTime(msg.created_at)}</p>
  </div>
</div>
```
**Note:** In RTL, `justify-start` = right side, `justify-end` = left side. So own messages appear on the right (natural in RTL), others on the left.

### Pattern 3: Auto-Scroll to Bottom (from existing MessageThread)
**What:** Scroll to newest message when messages load or new message is sent
**When to use:** Any chronological chat display
**Example:**
```typescript
// Source: src/modules/chat/components/MessageThread.tsx
const bottomRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

// At bottom of messages list:
<div ref={bottomRef} />
```

### Pattern 4: Optimistic Send (from existing chatStore and project CLAUDE.md)
**What:** Show message immediately in UI before server confirms, revert on error
**When to use:** Send operations where perceived latency matters
**Example:**
```typescript
const handleSend = async (content: string) => {
  const optimisticMsg: BalanceChatMessageWithSender = {
    id: crypto.randomUUID(), // Temporary ID
    tenant_id: '', // Will be overwritten
    balance_id: balanceId,
    user_id: user.id,
    content: content.trim(),
    message_type: 'user',
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    created_at: new Date().toISOString(),
    sender_name: user.user_metadata?.full_name || user.email || '',
    sender_email: user.email || '',
  };

  // Add immediately to UI
  setMessages(prev => [...prev, optimisticMsg]);

  // Send to server
  const result = await balanceChatService.sendMessage(balanceId, content);
  if (result.error) {
    // Revert: remove optimistic message
    setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    toast.error('שגיאה בשליחת ההודעה');
  } else if (result.data) {
    // Replace optimistic with real
    setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? result.data! : m));
  }
};
```

### Pattern 5: Chat Icon in Table Row (trigger mechanism)
**What:** A chat icon button on each balance row that opens the Sheet
**When to use:** Opening contextual panel from table rows
**Example:**
```typescript
// In BalanceTable.tsx, add a new column cell
<TableCell className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
  <Button
    variant="ghost"
    size="icon"
    className="h-7 w-7"
    onClick={() => onChatClick(row)}
  >
    <MessageCircle className="h-4 w-4 text-muted-foreground" />
  </Button>
</TableCell>
```
**Important:** `e.stopPropagation()` is critical because the row has an `onClick` handler for opening the detail dialog. Without it, clicking the chat icon would also open the detail dialog.

### Anti-Patterns to Avoid
- **Don't create a separate Zustand store for Phase 3**: Local useState is sufficient since the chat panel is a single-instance UI. Store can be added in Phase 4 for Realtime integration.
- **Don't import from `src/modules/chat/`**: The balance chat is a separate system with different data model (balance_id vs channel_id). Avoid cross-module imports.
- **Don't use ScrollArea for the message list**: The existing MessageThread uses native `overflow-y-auto` with `scrollIntoView`. ScrollArea adds Radix complexity for negligible benefit.
- **Don't hardcode sender name format**: Use `sender_name` from the enriched type directly, which already has the fallback to email built into the service.
- **Don't fetch messages on every table re-render**: Only fetch when the Sheet opens for a specific balance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Side panel overlay | Custom transform + backdrop div | shadcn/ui Sheet component | Already installed, handles accessibility, keyboard, animations |
| Sender enrichment | Per-message user lookups | balanceChatService.getMessages() | Phase 2 already handles batch enrichment via RPC |
| Date formatting | Custom date formatting | formatIsraeliDate/formatIsraeliDateTime from @/lib/formatters | Project standard, Hebrew locale aware |
| Toast notifications | Custom error display | `toast.error()` from sonner | Project standard, already configured |
| Current user identity | Manual supabase.auth.getUser() | `useAuth()` hook | AuthContext provides user, role, tenantId |
| Unique temporary IDs | Manual UUID construction | `crypto.randomUUID()` | Browser native, no dependency needed |

**Key insight:** Every building block already exists in this codebase. Phase 3 is composition, not invention.

## Common Pitfalls

### Pitfall 1: RTL Chat Bubble Alignment
**What goes wrong:** Own messages appear on the wrong side, or text alignment breaks in RTL
**Why it happens:** Forgetting that in RTL, `justify-start` = right side, `justify-end` = left side. The existing ChatPanel MessageThread already handles this correctly.
**How to avoid:** Copy the RTL-aware alignment from `MessageThread.tsx`. Own messages use `justify-start` (right in RTL = "my side"). Other messages use `justify-end` (left in RTL).
**Warning signs:** Messages from all senders appear on the same side; timestamp misaligned.

### Pitfall 2: Sheet Close Button Position in RTL
**What goes wrong:** The default Sheet close button (X) is positioned at `right-4 top-4` which in RTL lands on the content side, not the edge.
**Why it happens:** shadcn/ui Sheet hardcodes `right-4` for the close button (line 67 of sheet.tsx).
**How to avoid:** Override the close button position with `left-4` for RTL, or accept the default since the close button at `right-4` in a `side="left"` Sheet actually appears at the far right of the panel, which is fine visually.
**Warning signs:** Close button overlaps content or is unreachable.

### Pitfall 3: stopPropagation on Chat Icon
**What goes wrong:** Clicking the chat icon also triggers `onRowClick` which opens the BalanceDetailDialog.
**Why it happens:** BalanceTable rows have `onClick={() => onRowClick(row)}` (line 278). The chat icon is inside the row.
**How to avoid:** Use `onClick={(e) => e.stopPropagation()}` on the chat icon's parent TableCell, matching the pattern already used for the quick action column (line 281).
**Warning signs:** Both the chat sheet AND the detail dialog open when clicking the chat icon.

### Pitfall 4: Empty Sheet Width in RTL
**What goes wrong:** Sheet width is too wide or too narrow, content doesn't fill properly.
**Why it happens:** The Sheet defaults to `w-3/4 sm:max-w-sm` for the "left" side variant. This is too narrow for a chat panel.
**How to avoid:** Override with explicit width: `className="w-[400px] sm:max-w-[420px]"`. The existing ChatPanel uses `w-[420px]`.
**Warning signs:** Messages wrap excessively or panel wastes horizontal space.

### Pitfall 5: Messages Not Loading on Sheet Open
**What goes wrong:** Messages array stays empty even after Sheet opens.
**Why it happens:** fetch happens in useEffect but dependency array doesn't include the balance ID or open state.
**How to avoid:** Use `useEffect` with both `open` and `balanceId` as dependencies. Only fetch when `open === true && balanceId is truthy`.
**Warning signs:** Sheet opens but shows empty state even when messages exist.

### Pitfall 6: Optimistic Message Has Wrong Schema
**What goes wrong:** TypeScript error or runtime crash when creating optimistic message.
**Why it happens:** `BalanceChatMessageRow` has many required fields (tenant_id, is_deleted, etc.) that aren't obvious for an optimistic placeholder.
**How to avoid:** Construct the full object matching `BalanceChatMessageWithSender` type with all fields. Use `crypto.randomUUID()` for temporary id, empty string for tenant_id (never displayed), defaults for is_deleted/deleted_at/deleted_by.
**Warning signs:** TypeScript compilation errors on the optimistic message object.

## Code Examples

Verified patterns from the existing codebase:

### Loading State
```typescript
// Source: src/modules/chat/components/MessageThread.tsx (lines 36-42)
if (loading) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
```

### Empty State (Hebrew)
```typescript
// Source: src/modules/chat/components/MessageThread.tsx (lines 44-49)
// Adapted for balance chat context
if (messages.length === 0) {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
      אין הודעות עדיין. התחל שיחה!
    </div>
  );
}
```

### Message Input with Enter-to-Send
```typescript
// Source: src/modules/chat/components/MessageInput.tsx (lines 24-31)
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  },
  [handleSend]
);
```

### Date Separator Pattern
```typescript
// Source: src/modules/chat/components/MessageThread.tsx (lines 53-70)
let lastDate = '';

messages.map((msg) => {
  const msgDate = formatDate(msg.created_at);
  const showDateSeparator = msgDate !== lastDate;
  lastDate = msgDate;

  return (
    <div key={msg.id}>
      {showDateSeparator && (
        <div className="flex items-center justify-center my-3">
          <span className="text-xs text-muted-foreground bg-gray-100 px-3 py-1 rounded-full">
            {msgDate}
          </span>
        </div>
      )}
      {/* message bubble */}
    </div>
  );
});
```

### Service Call Pattern
```typescript
// Source: src/modules/annual-balance/services/balance-chat.service.ts
import { balanceChatService } from '../services/balance-chat.service';
import type { BalanceChatMessageWithSender } from '../types/balance-chat.types';

// Fetch messages
const result = await balanceChatService.getMessages(balanceId);
if (result.error) {
  toast.error('שגיאה בטעינת ההודעות');
  return;
}
const messages: BalanceChatMessageWithSender[] = result.data ?? [];

// Send message
const sendResult = await balanceChatService.sendMessage(balanceId, content);
if (sendResult.error) {
  toast.error('שגיאה בשליחת ההודעה');
}
```

## Integration Points

### BalanceTable Modification
The BalanceTable needs a new column (or icon) for chat. Currently has 6 columns:
1. Quick action (leftmost)
2. Last updated
3. Advances amount
4. Auditor
5. Status
6. Company name (rightmost)

**Recommended approach:** Add a chat icon in the Quick Action column area (leftmost), since it's already a "clickable action" area with `stopPropagation`. Alternatively, add a dedicated narrow column.

### AnnualBalancePage Wiring
The page component manages all dialog state. The chat Sheet state should follow the same pattern:
```typescript
// In AnnualBalancePage.tsx
const [chatOpen, setChatOpen] = useState(false);
const [chatBalanceCase, setChatBalanceCase] = useState<AnnualBalanceSheetWithClient | null>(null);

const handleChatClick = useCallback((row: AnnualBalanceSheetWithClient) => {
  setChatBalanceCase(row);
  setChatOpen(true);
}, []);
```

### BalanceDetailDialog Integration (Optional)
The detail dialog could also include a button to open the chat, creating two entry points. This is not in the Phase 3 requirements but is worth noting as a natural integration point.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom slide panel (ChatPanel) | shadcn/ui Sheet | Project evolution | Sheet provides Radix accessibility, proper focus trapping, keyboard handling out of the box |
| get_user_with_auth per user | get_users_for_tenant batch RPC | Phase 2 decision | N+1 eliminated; service already handles this |
| Channel-based chat (chat_messages) | Balance-scoped chat (balance_chat_messages) | Phase 1 decision | Separate table, separate service, balance_id instead of channel_id |

**Deprecated/outdated:**
- `src/modules/chat/` is the channel-based chat system. Balance chat is intentionally separate. Do not import from it.

## Open Questions

1. **Chat icon placement in table**
   - What we know: Quick action column already has stopPropagation, could host the chat icon. Alternatively, a new column.
   - What's unclear: Whether adding to the existing quick action column is too crowded, or if a new narrow column is better.
   - Recommendation: Add to the quick action column area (leftmost) to avoid adding a 7th column. The icon is always visible (not hover-only like the quick action button), so it serves as a persistent entry point.

2. **Sheet side direction for RTL**
   - What we know: The existing ChatPanel slides from the left. Sheet supports `side="left"` which slides from the left edge.
   - What's unclear: Whether the Sheet overlay (dimmed backdrop) blocks interaction with the table, making `side="left"` less useful than a non-blocking approach.
   - Recommendation: Use `side="left"` with the standard Sheet overlay. Users can close the sheet to return to the table. This is the standard UX for side panels.

3. **Message count badge on chat icon**
   - What we know: `balanceChatService.getMessageCount()` exists. Phase 7 covers unread badges.
   - What's unclear: Whether Phase 3 should show any badge/indicator on the chat icon.
   - Recommendation: No badge in Phase 3. Just a static chat icon. Badges come in Phase 7 (Unread Indicators).

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `src/modules/chat/` - complete working chat implementation as reference
- Codebase inspection: `src/modules/annual-balance/services/balance-chat.service.ts` - Phase 2 output
- Codebase inspection: `src/modules/annual-balance/types/balance-chat.types.ts` - Phase 2 output
- Codebase inspection: `src/components/ui/sheet.tsx` - shadcn/ui Sheet already installed
- Codebase inspection: `src/modules/annual-balance/components/BalanceTable.tsx` - current table structure
- Codebase inspection: `src/modules/annual-balance/pages/AnnualBalancePage.tsx` - page composition pattern
- Codebase inspection: `src/contexts/AuthContext.tsx` - useAuth hook providing user/role/tenantId

### Secondary (MEDIUM confidence)
- Phase 2 verification report: `.planning/phases/02-chat-service-layer/02-VERIFICATION.md` - confirmed service layer readiness
- REQUIREMENTS.md: `.planning/REQUIREMENTS.md` - CHAT-01 through CHAT-06 specifications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in project
- Architecture: HIGH - Directly following existing codebase patterns (MessageThread, MessageInput, ChatPanel)
- Pitfalls: HIGH - Identified from actual codebase inspection (RTL, stopPropagation, Sheet positioning)
- Integration points: HIGH - Exact files and line numbers identified for modifications

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable - no moving targets, all in-project patterns)
