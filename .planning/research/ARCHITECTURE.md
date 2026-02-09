# Architecture Research: Per-Entity Chat System

**Domain:** Internal chat and notifications for annual balance cases in accounting CRM
**Researched:** 2026-02-09
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    UI Layer (React Components)                    │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Chat Sheet   │  │ Message List │  │ Unread Badge │           │
│  │ (Sidebar)    │  │  Component   │  │  Component   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                   │
├─────────┴──────────────────┴──────────────────┴───────────────────┤
│                     State Layer (Zustand Store)                   │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Chat Store: messages[], unreadCount, activeThread        │    │
│  │ - Optimistic updates for sent messages                   │    │
│  │ - Subscribed to Realtime channel                         │    │
│  │ - Syncs with annualBalanceStore                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                               ↕                                   │
├──────────────────────────────────────────────────────────────────┤
│                    Service Layer (BaseService)                    │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ ChatService extends BaseService                          │    │
│  │ - getMessagesByEntity(entity_id, entity_type)            │    │
│  │ - sendMessage(entity_id, content)                        │    │
│  │ - markAsRead(entity_id)                                  │    │
│  │ - getUnreadCount(user_id)                                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                               ↕                                   │
├──────────────────────────────────────────────────────────────────┤
│                  Realtime Layer (Supabase Realtime)               │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Channel: balance_messages_{entity_id}                    │    │
│  │ - Listen to INSERT on balance_messages                   │    │
│  │ - Listen to UPDATE on unread_messages                    │    │
│  │ - Broadcast typing indicators (optional Phase 2)         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                               ↕                                   │
├──────────────────────────────────────────────────────────────────┤
│                  Database Layer (PostgreSQL + RLS)                │
├──────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ balance_     │  │ unread_      │  │ Database     │           │
│  │ messages     │  │ messages     │  │ Trigger      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└──────────────────────────────────────────────────────────────────┘
                              ↓
                   ┌──────────────────────┐
                   │ Edge Function        │
                   │ send_notification    │
                   │ (Email via SendGrid) │
                   └──────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **ChatSheet** | Slide-in panel UI for chat | shadcn/ui Sheet component with fixed height, scrollable messages, input at bottom |
| **MessageList** | Renders messages with timestamps, sender | Virtualized list with auto-scroll to bottom on new messages |
| **UnreadBadge** | Shows unread count indicator | Pill badge with count, positioned on tab/button trigger |
| **ChatStore** | Manages messages state, Realtime subscription | Zustand store with subscribeWithSelector for granular updates |
| **ChatService** | CRUD operations on messages, tenant isolation | Extends BaseService, enforces tenant_id + entity_id filtering |
| **Realtime Subscription** | Listens to database changes, updates store | Supabase channel per entity, filters by entity_id |
| **balance_messages** | Stores message content, metadata | PostgreSQL table with RLS policies, indexed by entity_id |
| **unread_messages** | Tracks per-user unread state | Join table: user_id + message_id, allows efficient unread queries |
| **Database Trigger** | Invokes edge function on new messages | PostgreSQL webhook or pg_net to trigger notification function |
| **Edge Function** | Sends email notifications | Deno function using SendGrid API for email delivery |

## Recommended Project Structure

```
src/modules/annual-balance/
├── services/
│   └── chat.service.ts              # Extends BaseService, CRUD for messages
├── store/
│   └── chatStore.ts                 # Zustand: messages[], subscription, unread
├── components/
│   ├── ChatSheet.tsx                # Slide-in panel (Sheet from shadcn/ui)
│   ├── MessageList.tsx              # Scrollable message display
│   ├── MessageInput.tsx             # Textarea + send button
│   ├── UnreadBadge.tsx              # Count indicator
│   └── TypingIndicator.tsx          # "X is typing..." (Phase 2)
├── hooks/
│   ├── useChat.ts                   # Wrapper: setup subscription, fetch messages
│   └── useUnreadCount.ts            # Per-entity unread count
└── types/
    └── chat.types.ts                # Message, UnreadMessage, ChatFilters

supabase/
├── migrations/
│   └── 20260210_balance_chat.sql    # Tables, indexes, RLS, triggers
└── functions/
    └── send-chat-notification/
        └── index.ts                 # Email notification on new message
```

### Structure Rationale

- **Module-scoped:** Chat is specific to annual-balance module, lives within it
- **Service pattern:** Follows existing BaseService pattern for consistency
- **Store integration:** ChatStore can reference annualBalanceStore for context
- **Component granularity:** Small, focused components for reusability
- **Edge function:** Async notifications don't block message sending

## Architectural Patterns

### Pattern 1: Per-Entity Realtime Channel

**What:** Each entity (annual balance case) gets its own Realtime channel subscription.

**When to use:** When multiple users collaborate on the same entity and need instant message updates.

**Trade-offs:**
- **Pros:** Clean isolation, easy to manage permissions, natural scoping
- **Cons:** Multiple entities open = multiple subscriptions (manage cleanup)

**Example:**
```typescript
// In ChatStore or useChat hook
const subscribeToEntity = (entityId: string) => {
  const channel = supabase
    .channel(`balance_messages:${entityId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'balance_messages',
        filter: `entity_id=eq.${entityId}`,
      },
      (payload) => {
        // Add new message to store
        addMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
```

### Pattern 2: Optimistic Message Updates

**What:** Immediately add sent message to UI, then confirm with server response.

**When to use:** Always, for chat. Users expect instant feedback.

**Trade-offs:**
- **Pros:** Feels fast, better UX, standard pattern for chat
- **Cons:** Must handle rollback on error (rare but possible)

**Example:**
```typescript
// In ChatStore
const sendMessage = async (content: string, entityId: string) => {
  const optimisticMessage: Message = {
    id: crypto.randomUUID(), // Temporary ID
    content,
    entity_id: entityId,
    sender_id: currentUserId,
    created_at: new Date().toISOString(),
    is_optimistic: true, // Flag for UI
  };

  // Add to store immediately
  set((state) => ({
    messages: [...state.messages, optimisticMessage],
  }));

  // Send to server
  const result = await chatService.sendMessage(entityId, content);

  if (result.error) {
    // Rollback: remove optimistic message
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== optimisticMessage.id),
    }));
    toast.error('שגיאה בשליחת ההודעה');
  } else {
    // Replace optimistic with real message
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === optimisticMessage.id ? result.data : m
      ),
    }));
  }
};
```

### Pattern 3: Batched Unread Tracking

**What:** Use range-based tracking instead of individual read records.

**When to use:** When users "mark all as read" frequently, to minimize database rows.

**Trade-offs:**
- **Pros:** Dramatically fewer rows (1 record per range vs 1 per message)
- **Cons:** Slightly more complex query logic for unread calculation

**Example:**
```typescript
// Database schema (from research: dev.to batching pattern)
CREATE TABLE unread_messages (
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'balance_sheet',
  first_unread_message_id UUID NOT NULL,
  last_read_message_id UUID, -- Null = only first unread marked
  mark_all BOOLEAN DEFAULT false, -- True = all messages read
  PRIMARY KEY (user_id, entity_id, entity_type, first_unread_message_id)
);

-- Query: count unread messages for user
SELECT COUNT(*)
FROM balance_messages bm
WHERE bm.entity_id = $1
  AND bm.entity_type = $2
  AND NOT EXISTS (
    SELECT 1 FROM unread_messages um
    WHERE um.user_id = $3
      AND um.entity_id = bm.entity_id
      AND um.entity_type = bm.entity_type
      AND (
        um.mark_all = true OR
        (bm.id >= um.first_unread_message_id AND
         (um.last_read_message_id IS NULL OR bm.id <= um.last_read_message_id))
      )
  );
```

### Pattern 4: Database Webhook + Edge Function for Notifications

**What:** Use Supabase webhooks (pg_net) to trigger edge function on INSERT, send email async.

**When to use:** When notifications should not block user actions.

**Trade-offs:**
- **Pros:** Async, decoupled, won't slow down message sending
- **Cons:** Requires webhook configuration, edge function deployment

**Example:**
```sql
-- Migration: Database trigger (alternative to webhook UI)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/send-chat-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'entity_id', NEW.entity_id,
      'entity_type', NEW.entity_type,
      'sender_id', NEW.sender_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON balance_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

```typescript
// Edge function: send-chat-notification/index.ts
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

Deno.serve(async (req) => {
  const { message_id, entity_id, entity_type } = await req.json();

  // Fetch message details, entity info, assigned users
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get entity (balance sheet) to find assigned auditor
  const { data: balance } = await supabase
    .from('annual_balance_sheets')
    .select('auditor_id, client_id, year')
    .eq('id', entity_id)
    .single();

  if (!balance?.auditor_id) return new Response('No auditor assigned', { status: 200 });

  // Get auditor email
  const { data: auditor } = await supabase.rpc('get_user_with_auth', {
    p_user_id: balance.auditor_id,
  });

  if (!auditor?.[0]?.email) return new Response('No email', { status: 200 });

  // Send email
  await sgMail.send({
    to: auditor[0].email,
    from: 'notifications@ticovision.com',
    subject: `הודעה חדשה במאזן ${balance.year}`,
    text: `קיבלת הודעה חדשה במערכת לגבי מאזן לקוח`,
    html: `<p>קיבלת הודעה חדשה במערכת לגבי מאזן שנת ${balance.year}</p>`,
  });

  return new Response('OK', { status: 200 });
});
```

## Data Flow

### Message Send Flow

```
[User types message]
    ↓
[Click Send in MessageInput]
    ↓
[ChatStore.sendMessage] → Optimistic: add to messages[] immediately
    ↓
[ChatService.sendMessage] → INSERT INTO balance_messages (tenant_id, entity_id, sender_id, content)
    ↓                              ↓
[Database]                  [Database Trigger]
    ↓                              ↓
[RLS Policy Check]          [Invoke Edge Function via pg_net]
    ↓                              ↓
[Insert successful]         [Edge Function: send-chat-notification]
    ↓                              ↓
[Return message ID]         [Query auditor email, send via SendGrid]
    ↓
[ChatStore: replace optimistic with real message]
    ↓
[Realtime: broadcast to other connected users]
    ↓
[Other users' ChatStore: add message]
    ↓
[UI updates automatically]
```

### Unread Count Flow

```
[User opens ChatSheet for entity X]
    ↓
[ChatStore.markAsRead(entity_id)]
    ↓
[ChatService.markAsRead] → UPSERT INTO unread_messages (user_id, entity_id, mark_all=true)
    ↓
[Database updates unread tracking]
    ↓
[Realtime: broadcast unread count change]
    ↓
[UnreadBadge: update count from 5 → 0]
```

### State Management

```
[Zustand ChatStore]
    ↓ (subscribe)
[Components] ←→ [Actions] → [Service calls] → [ChatStore mutations]
                                ↓
                          [Realtime subscription] → [Auto-update store]
```

### Key Data Flows

1. **Initial load:** Fetch messages via ChatService.getMessagesByEntity → populate store → subscribe to Realtime
2. **New message (local user):** Optimistic add → service call → replace with confirmed message
3. **New message (other user):** Realtime INSERT event → add to store → UI updates
4. **Mark as read:** Service call → update unread_messages → Realtime UPDATE → badge updates

## Database Schema Design

### Core Tables

```sql
-- Messages table: stores all chat messages
CREATE TABLE balance_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL, -- References annual_balance_sheets.id
  entity_type TEXT NOT NULL DEFAULT 'balance_sheet',
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_balance_messages_entity
    FOREIGN KEY (entity_id)
    REFERENCES annual_balance_sheets(id)
    ON DELETE CASCADE
);

-- Unread tracking: batched range-based approach
CREATE TABLE unread_messages (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'balance_sheet',
  first_unread_message_id UUID NOT NULL REFERENCES balance_messages(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES balance_messages(id) ON DELETE CASCADE,
  mark_all BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, entity_id, entity_type, first_unread_message_id)
);
```

### Performance Indexes

```sql
-- Messages: query by entity
CREATE INDEX idx_balance_messages_entity
  ON balance_messages(entity_id, entity_type);

-- Messages: query by tenant (for RLS performance)
CREATE INDEX idx_balance_messages_tenant
  ON balance_messages(tenant_id);

-- Messages: sort by timestamp
CREATE INDEX idx_balance_messages_created_at
  ON balance_messages(created_at DESC);

-- Composite: tenant + entity (most common query)
CREATE INDEX idx_balance_messages_tenant_entity
  ON balance_messages(tenant_id, entity_id, entity_type);

-- Unread: query by user
CREATE INDEX idx_unread_messages_user
  ON unread_messages(user_id);

-- Unread: query by entity
CREATE INDEX idx_unread_messages_entity
  ON unread_messages(entity_id, entity_type);
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE balance_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE unread_messages ENABLE ROW LEVEL SECURITY;

-- Messages: SELECT - users with access to the balance sheet
CREATE POLICY "balance_messages_select"
  ON balance_messages FOR SELECT
  USING (
    tenant_id = get_current_tenant_id() AND
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
        AND uta.tenant_id = balance_messages.tenant_id
        AND uta.is_active = true
    )
  );

-- Messages: INSERT - authenticated users within tenant
CREATE POLICY "balance_messages_insert"
  ON balance_messages FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id() AND
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid()
        AND uta.tenant_id = balance_messages.tenant_id
        AND uta.is_active = true
    )
  );

-- Unread: SELECT - own unread records only
CREATE POLICY "unread_messages_select"
  ON unread_messages FOR SELECT
  USING (user_id = auth.uid());

-- Unread: INSERT/UPDATE - own records only
CREATE POLICY "unread_messages_modify"
  ON unread_messages FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Triggers

```sql
-- Updated_at trigger for messages
CREATE TRIGGER trigger_balance_messages_updated_at
  BEFORE UPDATE ON balance_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification trigger (calls edge function)
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON balance_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-100 users** | Current architecture is perfect. Single Realtime subscription per open entity, all messages in memory. |
| **100-1k users** | Add pagination to MessageList (load last 50 messages initially, "Load more" button). Consider message retention policy (archive messages older than 1 year). |
| **1k+ users** | Implement virtual scrolling for message list, consider Redis cache for unread counts, partition messages table by year, use materialized view for unread count aggregation. |

### Scaling Priorities

1. **First bottleneck:** Too many messages in memory (>1000 per entity)
   - **Fix:** Pagination + virtual scrolling + lazy load on scroll

2. **Second bottleneck:** Unread count queries become slow with many messages
   - **Fix:** Materialized view refreshed on INSERT, or denormalized unread_count column on entities

## Anti-Patterns

### Anti-Pattern 1: Global Chat Store for All Entities

**What people do:** Single store with `messages: Record<entityId, Message[]>`

**Why it's wrong:** Memory leak, all messages stay in memory even after closing entity tabs

**Do this instead:** Per-entity subscription cleanup on unmount, or use React Query with automatic garbage collection

### Anti-Pattern 2: Individual Read Records Per Message

**What people do:**
```sql
CREATE TABLE message_reads (
  message_id UUID,
  user_id UUID,
  PRIMARY KEY (message_id, user_id)
);
```

**Why it's wrong:** Explodes to millions of rows quickly. 1000 messages × 10 users = 10,000 rows per entity.

**Do this instead:** Batched range tracking (Pattern 3 above) or last_read_message_id pointer.

### Anti-Pattern 3: Client-Side Email Sending

**What people do:** Call SendGrid API directly from React component after message sends

**Why it's wrong:** Exposes API keys, blocks UI, fails if user closes tab

**Do this instead:** Database trigger + edge function (Pattern 4 above) or Supabase webhook

### Anti-Pattern 4: Polling for New Messages

**What people do:** `setInterval(() => fetchMessages(), 3000)`

**Why it's wrong:** Wastes database queries, battery, network. Not truly realtime.

**Do this instead:** Supabase Realtime subscription (Pattern 1 above)

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Supabase Realtime** | Channel subscription per entity | Use postgres_changes event, filter by entity_id |
| **SendGrid API** | Called from edge function | API key in edge function env vars, not client |
| **Supabase Edge Functions** | Invoked by database webhook/trigger | Use pg_net for async invocation |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **ChatStore ↔ annualBalanceStore** | Direct import + zustand subscription | ChatStore can read current entity from annualBalanceStore |
| **ChatService ↔ BaseService** | Inheritance | ChatService extends BaseService for getTenantId(), logAction() |
| **ChatSheet ↔ BalanceDetailDialog** | Props (entityId) | BalanceDetailDialog passes entityId to ChatSheet |
| **UnreadBadge ↔ ChatStore** | Zustand selector | `const unreadCount = useChatStore(state => state.unreadCount[entityId])` |

## Suggested Build Order

### Phase 1: Core Chat (MVP)
1. **Database schema** (migration file)
   - `balance_messages` table
   - `unread_messages` table (simplified: just last_read_message_id)
   - RLS policies
   - Indexes
2. **ChatService** (extends BaseService)
   - `getMessagesByEntity(entityId)`
   - `sendMessage(entityId, content)`
   - `markAsRead(entityId, messageId)`
3. **ChatStore** (Zustand)
   - Messages state
   - Send/receive actions
   - No Realtime yet (polling acceptable for MVP)
4. **UI components**
   - ChatSheet (Sheet from shadcn/ui)
   - MessageList (simple scroll)
   - MessageInput (textarea + button)
5. **Integration**
   - Add ChatSheet to BalanceDetailDialog
   - Wire up entityId prop

**Milestone:** Users can send/receive messages, see history, basic UX works

### Phase 2: Realtime + Notifications
1. **Realtime subscription** in ChatStore
   - Subscribe on mount
   - Unsubscribe on unmount
   - Handle INSERT events
2. **UnreadBadge component**
   - Show count on tab/button
   - Update on markAsRead
3. **Edge function** for email notifications
   - Deploy send-chat-notification function
   - Configure SendGrid API key
4. **Database trigger** to invoke edge function
   - Add trigger on balance_messages INSERT
   - Use pg_net for async call

**Milestone:** Messages appear instantly, email notifications work, unread counts accurate

### Phase 3: Polish + Performance
1. **Optimistic updates** in ChatStore
2. **Pagination** for message history (last 50 messages, "Load more")
3. **Batched unread tracking** (migrate from simple to range-based)
4. **Typing indicators** (optional: use Realtime broadcast)
5. **Error handling** (retry logic, offline queue)

**Milestone:** Production-ready, performant at scale

### Dependencies
- Phase 1 has no external dependencies (can build immediately)
- Phase 2 requires Phase 1 complete (need database tables + service)
- Phase 3 requires Phase 2 complete (need Realtime subscription + unread tracking)

## Sources

**HIGH Confidence (Official Documentation):**
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime) - Realtime features overview
- [Supabase RLS Authorization](https://supabase.com/docs/guides/realtime/authorization) - RLS policies for Realtime channels
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) - Deploying edge functions
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy patterns

**MEDIUM Confidence (Technical Articles & Community):**
- [How to send welcome emails with Supabase edge functions and database triggers](https://bejamas.com/hub/guides/send-emails-supabase-edge-functions-database-triggers) - Database webhook pattern
- [Efficient unread message tracking](https://dev.to/anoopfranc/how-would-you-make-it-efficient-and-optimized-way-of-tracking-unread-message-per-user-3o00) - Batched range tracking approach
- [Realtime Chat With Supabase](https://blog.stackademic.com/realtime-chat-with-supabase-realtime-is-supa-easy-091c96411afd) - Chat implementation patterns
- [GitHub - mahirshahriar1/Chat-App](https://github.com/mahirshahriar1/Chat-App) - Zustand + Socket.IO chat example
- [Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) - Zustand store patterns for real-time

---
*Architecture research for: Per-entity chat and notification system*
*Researched: 2026-02-09*
