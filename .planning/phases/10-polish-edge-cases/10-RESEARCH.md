# Phase 10: Polish & Edge Cases - Research

**Researched:** 2026-02-10
**Domain:** Chat UI polish, error handling, RTL layout, scroll performance
**Confidence:** HIGH

## Summary

Phase 10 is a polish phase that hardens the existing chat implementation across five success criteria: network failure recovery, send error retry, RTL long-message layout, performance at 200+ messages, and RTL correctness for all text/timestamps. The codebase already has the core chat working (Phases 1-9 complete) with optimistic sends, Realtime subscriptions, dedup, sender enrichment, unread badges, system messages, and toast notifications all in place.

The primary technical investigation areas are: (1) whether scroll virtualization is needed for 200+ messages, (2) what Supabase Realtime provides for reconnection/error handling, and (3) RTL edge cases in the current bubble layout. The findings show that 200 messages is well within the threshold where plain DOM rendering works fine (virtualization needed only above ~500-1000), Supabase JS handles reconnection automatically, and the existing layout has a few RTL-specific issues to correct.

**Primary recommendation:** Focus on defensive error handling with retry UX, RTL alignment corrections, and add a "load more" safeguard rather than full virtualization. Keep changes minimal and surgical -- this is polish, not new features.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sonner` | ^2.0.7 | Toast notifications | Already used for error/success toasts and chat notifications |
| `@supabase/supabase-js` | ^2.57.2 | Realtime + DB operations | Core backend SDK with built-in reconnection |
| `zustand` | ^5.0.8 | State management | Chat store already uses this |
| `lucide-react` | ^0.543.0 | Icons | Already used for Send, Loader2, etc. |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@radix-ui/react-dialog` | ^1.1.15 | Sheet component | Already powering BalanceChatSheet |
| `tailwind-merge` | ^3.3.1 | Class merging | Used via cn() utility |

### Not Needed
| Library | Why Not |
|---------|---------|
| `@tanstack/react-virtual` | 200 messages is well below the virtualization threshold (~500-1000+). Each message bubble is simple DOM. Adding virtualization for 200 messages adds complexity with no measurable benefit. If message counts grow beyond 500, add virtualization then. |
| `react-error-boundary` | Too heavy for one component. A simple try/catch + error state in the Sheet is sufficient. |

**Installation:** None required. All dependencies are already present.

## Architecture Patterns

### Recommended Changes Structure
```
src/modules/annual-balance/
├── components/
│   ├── BalanceChatSheet.tsx      # Add error state, retry, connection status
│   ├── BalanceChatMessages.tsx   # Fix RTL alignment, handle long text, limit
│   └── BalanceChatInput.tsx      # Add retry on send failure, toast error
└── services/
    └── balance-chat.service.ts   # Already has error handling, no changes needed
```

### Pattern 1: Network Error Recovery with Retry
**What:** When message fetch fails, show inline error with Hebrew message and retry button. When send fails, show toast with action to retry.
**When to use:** Any async operation that can fail due to network issues.
**Example:**
```typescript
// In BalanceChatSheet: error state management
const [error, setError] = useState<string | null>(null);

const fetchMessages = async () => {
  setLoading(true);
  setError(null);
  const result = await balanceChatService.getMessages(balanceCase.id);
  if (result.error) {
    setError('שגיאה בטעינת ההודעות');
  } else {
    setMessages(result.data ?? []);
  }
  setLoading(false);
};

// Error state with retry button
{error && (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
    <AlertCircle className="h-8 w-8 text-destructive" />
    <p className="text-sm text-destructive">{error}</p>
    <Button variant="outline" size="sm" onClick={fetchMessages}>
      <RefreshCw className="h-3.5 w-3.5 me-1.5" />
      נסה שוב
    </Button>
  </div>
)}
```

### Pattern 2: Send Error with Toast Retry
**What:** When a message send fails, revert optimistic update and show error toast. The toast includes a retry action that re-sends the message.
**When to use:** Optimistic send operations.
**Example:**
```typescript
if (result.error) {
  pendingOptimisticRef.current.delete(fingerprint);
  setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
  toast.error('שגיאה בשליחת ההודעה', {
    action: {
      label: 'נסה שוב',
      onClick: () => handleSend(content),
    },
  });
}
```

### Pattern 3: Message Limit as Performance Guard
**What:** Limit initial fetch to 100 messages (current: 50). If there are more, show a "load earlier messages" button at top. This avoids rendering thousands of DOM nodes.
**When to use:** When message counts could grow unbounded.
**Why not virtualization:** At 200 messages, each being a simple div with text, DOM rendering is fast. Virtualization adds complexity (dynamic height measurement for chat bubbles is notoriously tricky) with no visible performance gain. The limit parameter in getMessages already caps what is loaded.

### Anti-Patterns to Avoid
- **Full virtualization for small lists:** @tanstack/react-virtual with dynamic heights in a chat context (variable-height bubbles, date separators, system messages) is complex to implement correctly. The reverse-scroll behavior (newest at bottom) with dynamic heights is a known pain point. At 200 messages, the DOM handles this fine.
- **Auto-retry loops:** Never auto-retry failed sends. The user must explicitly trigger retry to avoid duplicate messages and unexpected behavior.
- **Reconnection logic on top of Supabase:** Supabase JS already handles WebSocket reconnection internally. Do not add custom reconnection timers -- it would conflict with the built-in behavior.
- **Using `ltr:` / `rtl:` prefixes when `dir="rtl"` is already set:** The BalanceChatSheet already has `dir="rtl"` on SheetContent, so flexbox direction is already flipped. Using `justify-start` in RTL context already means right-aligned. Verify current alignment is correct before changing it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebSocket reconnection | Custom reconnection timer/backoff | Supabase JS built-in reconnection | supabase-js automatically reconnects with exponential backoff. Building custom reconnection would conflict with it. |
| Toast notifications | Custom notification system | Sonner (already installed) | Supports custom components, actions, RTL, dismiss handlers |
| Scroll to bottom | Complex intersection observer setup | `scrollIntoView({ behavior: 'smooth' })` (already used) | Already working in BalanceChatMessages via bottomRef |
| Text truncation | Custom CSS truncation | `break-words` + `whitespace-pre-wrap` (already used) | Already present on message content `<p>` elements |

**Key insight:** Most of the heavy lifting is already done in Phases 1-9. Phase 10 is about defensive coding, not new infrastructure.

## Common Pitfalls

### Pitfall 1: RTL Message Alignment Inversion
**What goes wrong:** In RTL context with `dir="rtl"`, `justify-start` means right side. Currently, own messages use `justify-start` (right in RTL = correct, own messages should be on the right) and others use `justify-end` (left in RTL = correct, others on the left). This is actually correct for the RTL chat convention. However, verify that the close button positioning in SheetContent uses `left-4` not `right-4` since the sheet is `dir="rtl"`.
**Why it happens:** RTL layout flips horizontal directions. Developers think "own = right, others = left" and write `justify-end` for own, but in RTL, start=right.
**How to avoid:** Test visually. The current code appears correct. Verify the Sheet's built-in close button (X) is positioned correctly -- the shadcn Sheet component hardcodes `right-4` which in an RTL context may need to be `left-4` or use a logical property.
**Warning signs:** Close button overlapping the title, or appearing on the wrong side.

### Pitfall 2: Long Unbroken Text Overflowing Bubbles
**What goes wrong:** A long URL or string without spaces (e.g., `https://example.com/very/long/path/that/keeps/going`) can overflow the message bubble's `max-w-[75%]` constraint.
**Why it happens:** `break-words` only breaks at word boundaries. For truly unbreakable strings, `overflow-wrap: break-word` is needed.
**How to avoid:** The current `whitespace-pre-wrap break-words` should handle most cases. Tailwind's `break-words` maps to `overflow-wrap: break-word`. Verify with a test string containing a 200-character URL.
**Warning signs:** Horizontal scroll appearing in the message thread container.

### Pitfall 3: Stale Optimistic Messages on Network Timeout
**What goes wrong:** If the send request times out (no response), the optimistic message stays in the list forever with no error indicator.
**Why it happens:** The current handleSend waits for the response. If the network is slow but eventually responds, it works. But a true timeout (no response at all) means the user sees a "sent" message that may not have been delivered.
**How to avoid:** Add a visual "sending" indicator (subtle opacity or spinner on the optimistic message). If the server response takes > 10 seconds, treat as failure and revert.
**Warning signs:** Optimistic message stays in list but wasn't actually saved.

### Pitfall 4: Duplicate Toaster Instances
**What goes wrong:** Two `<Toaster>` components exist: one in `main.tsx` and one in `App.tsx`. This can cause duplicate toasts.
**Why it happens:** Incremental development -- one was added for global toasts, another for in-app toasts.
**How to avoid:** Verify behavior. If duplicates are observed, remove one Toaster. The `main.tsx` one with RTL + richColors config should be the primary.
**Warning signs:** Each toast appearing twice.

### Pitfall 5: Sheet Close Button Position in RTL
**What goes wrong:** The shadcn Sheet component has a hardcoded close button at `right-4 top-4`. In a `dir="rtl"` container, this may place it in the wrong corner (right side = start side in RTL, which is where content begins, not where close buttons typically go).
**Why it happens:** shadcn/ui Sheet is designed for LTR. The close button position doesn't use logical properties.
**How to avoid:** The BalanceChatSheet already sets `dir="rtl"` on SheetContent. The close button CSS uses `absolute right-4 top-4`, which in an RTL flexbox context might still render at the visual right. Test visually to confirm it's acceptable. If it needs to be on the visual left (end side in RTL), use `start-4` or `left-4`.
**Warning signs:** Close button appearing in an unexpected position or overlapping the title.

## Code Examples

### Error State in BalanceChatMessages
```typescript
// New prop for error state
interface BalanceChatMessagesProps {
  messages: BalanceChatMessageWithSender[];
  loading: boolean;
  currentUserId: string;
  error?: string | null;
  onRetry?: () => void;
}

// Error rendering (before loading check)
if (error) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
      <AlertCircle className="h-8 w-8 text-destructive/70" />
      <p className="text-sm text-destructive">{error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 me-1.5" />
          נסה שוב
        </Button>
      )}
    </div>
  );
}
```

### Toast Error with Retry Action
```typescript
// Source: Sonner docs - toast.error with action
toast.error('שגיאה בשליחת ההודעה', {
  action: {
    label: 'נסה שוב',
    onClick: () => handleSend(content),
  },
});
```

### RTL-Correct Timestamp Positioning
```typescript
// Timestamps should align to the end of the bubble (visual left in RTL for own messages)
<p className={cn(
  'text-[10px] mt-1 text-end', // text-end = logical end = left in RTL
  isOwn ? 'opacity-70' : 'text-muted-foreground'
)}>
  {formatTime(msg.created_at)}
</p>
```

### Connection Status Indicator
```typescript
// Simple online/offline detection for the Sheet header
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// In header: show warning when offline
{!isOnline && (
  <div className="text-xs text-amber-600 flex items-center gap-1 px-4 py-1.5 bg-amber-50 border-b">
    <WifiOff className="h-3 w-3" />
    <span>אין חיבור לאינטרנט</span>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Virtualize all lists | Virtualize only when needed (500+ items) | ~2024 | React 19 concurrent rendering handles moderate lists efficiently |
| Custom reconnection | Supabase JS built-in reconnection | supabase-js v2+ | No need for custom WebSocket reconnection logic |
| window.navigator.onLine only | navigator.onLine + online/offline events | Long-standing browser API | Sufficient for showing user-facing offline indicator |

**Not deprecated:**
- `scrollIntoView({ behavior: 'smooth' })` -- still the standard way to scroll to bottom in chat
- Sonner `toast.error` with `action` -- supported in Sonner v2
- Tailwind `break-words` -- maps to `overflow-wrap: break-word`, fully supported

## Supabase Realtime Error Handling

**Key finding (HIGH confidence):** Supabase JS SDK handles WebSocket reconnection automatically with exponential backoff. When the connection drops:
1. The SDK attempts to reconnect automatically
2. `supabase-js` reconnects when message throughput decreases below plan limit (for `tenant_events` errors)
3. The `.subscribe()` callback can receive status updates (`SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR`)

**What this means for Phase 10:**
- Do NOT build custom reconnection logic
- DO listen to the subscribe callback for status to show connection state to user
- DO handle the case where Realtime is disconnected: messages sent during disconnect won't appear via Realtime but will appear on next fetch
- The existing dedup logic in `handleRealtimeMessage` (checking message ID existence) already handles the reconnection replay scenario

## Specific Gaps in Current Implementation

### 1. No error state in BalanceChatSheet
**Current:** If `getMessages` fails, shows toast but leaves the messages area empty with no way to retry.
**Fix:** Add error state with retry button.

### 2. No send retry mechanism
**Current:** If `sendMessage` fails, toast says error but user must retype the message.
**Fix:** Store failed message content and offer retry via toast action or inline retry button.

### 3. No offline/connection indicator
**Current:** No visual feedback when the user is offline or Realtime connection drops.
**Fix:** Add navigator.onLine listener and show banner in chat header.

### 4. Message content not tested for long text
**Current:** `whitespace-pre-wrap break-words` is used, which should handle most cases. But `max-w-[75%]` on the bubble parent needs verification with very long unbroken strings.
**Fix:** Verify and add `overflow-hidden` on the outer bubble wrapper if needed.

### 5. Input should support multiline
**Current:** Uses `<Input>` (single line) with Enter-to-send. Long messages need multi-line support.
**Fix:** Switch to auto-expanding `<Textarea>` with a max-height, keeping Enter-to-send and Shift+Enter for newline. The Textarea component already exists in `src/components/ui/textarea.tsx`.

### 6. No message limit indicator
**Current:** Fetches max 50 messages. If a balance has 200+ messages, user only sees the latest 50 with no way to load more.
**Fix:** Either increase limit or add "load earlier messages" button at top.

### 7. Timestamp RTL positioning
**Current:** Timestamps use no explicit text alignment. In RTL context, verify they appear on the correct side of the bubble.
**Fix:** Add `text-end` class for consistent positioning.

## Open Questions

1. **Should the message limit be increased from 50 to 200?**
   - What we know: Success criteria mentions 200+ messages. Current limit is 50.
   - What's unclear: Whether 200 messages should be the default fetch limit or if "load more" pagination is preferred.
   - Recommendation: Increase default to 100, add "load earlier" button that fetches the next 100. This satisfies the 200+ requirement while keeping initial load fast.

2. **Should there be a character counter on the input?**
   - What we know: Service validates 5000 char max. UI has no counter.
   - What's unclear: Whether users need to see remaining characters.
   - Recommendation: Add a subtle character counter that only appears when content exceeds 4500 characters (approaching limit). Not critical for MVP polish.

3. **Duplicate Toaster instances**
   - What we know: `main.tsx` and `App.tsx` both render `<Toaster>`.
   - What's unclear: Whether this causes actual duplicate toasts or if Sonner deduplicates.
   - Recommendation: Investigate during implementation. If duplicates occur, remove the App.tsx one.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: All chat files in `src/modules/chat/` and `src/modules/annual-balance/` read and analyzed
- Supabase Realtime docs: Error handling, reconnection behavior, limits ([Realtime Limits](https://supabase.com/docs/guides/realtime/limits))
- Supabase Realtime Protocol: Subscribe callback statuses (`SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR`) ([Protocol docs](https://supabase.com/docs/guides/realtime/protocol))

### Secondary (MEDIUM confidence)
- TanStack Virtual: Not needed at 200 messages. Reverse-scroll with dynamic heights is a known challenge ([GitHub discussions](https://github.com/TanStack/virtual/discussions/195))
- Sonner toast actions: Verified via [Sonner npm](https://www.npmjs.com/package/sonner) -- `action` prop on `toast.error()` is supported

### Tertiary (LOW confidence)
- React 19 rendering performance for 200 DOM nodes: Based on general knowledge that modern React handles moderate lists without virtualization. Would benefit from profiling in actual app.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, no new dependencies needed
- Architecture: HIGH - Changes are to existing files with established patterns
- Pitfalls: HIGH - Based on direct code inspection of current implementation gaps
- Performance: MEDIUM - 200-message threshold assessment based on general knowledge, not profiled

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable domain, no external library changes expected)
