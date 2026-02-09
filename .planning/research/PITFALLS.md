# Pitfalls Research

**Domain:** Internal Chat & Notification System (Supabase Realtime)
**Researched:** 2026-02-09
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Channel Memory Leaks from Improper Cleanup

**What goes wrong:**
When creating channels with `supabase.channel()`, a RealtimeChannel object is appended to the RealtimeClient.channels array without being cleaned up. The array grows without bounds if channels are repeatedly created, causing severe memory leaks - particularly in long-running connections or when creating per-entity chat channels dynamically.

**Why it happens:**
Developers assume Supabase automatically cleans up channels when components unmount or when switching between chat entities. The documentation doesn't emphasize cleanup prominently, and the API design (no automatic garbage collection) makes it easy to leak channels.

**How to avoid:**
```typescript
// WRONG - creates leak when switching between chats
useEffect(() => {
  const channel = supabase.channel(`chat:${entityId}`);
  channel.subscribe();
}, [entityId]);

// CORRECT - explicit cleanup
useEffect(() => {
  const channel = supabase.channel(`chat:${entityId}`);
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [entityId]);
```

Always call `RealtimeClient.removeChannel()` after using a channel. Implement a channel management service that tracks active channels and ensures cleanup.

**Warning signs:**
- Memory usage steadily increases over time
- Browser tab becomes sluggish after 30+ minutes of use
- Network tab shows multiple WebSocket connections to same channel
- `RealtimeClient.channels.length` keeps growing in console

**Phase to address:**
Phase 1 (Core Chat Infrastructure) - Must be baked into channel management service from the start. Fixing leaks after building features is extremely difficult.

---

### Pitfall 2: RLS DELETE Event Data Leakage

**What goes wrong:**
When RLS is enabled with replica identity set to `FULL`, DELETE events only contain primary keys in the `old` record. When replica identity is `DEFAULT`, DELETE events broadcast to ALL subscribed users regardless of RLS policies because Postgres cannot verify if a user had access to a deleted record. This can leak sensitive information (e.g., "a message was deleted" reveals that a message existed).

**Why it happens:**
Fundamental PostgreSQL limitation - once a row is deleted, there's no way to check if the user had permission to see it. Developers assume RLS protects DELETE events the same way it protects INSERT/UPDATE, but it doesn't. Supabase defaults to sending DELETE events to everyone monitoring the table.

**How to avoid:**
For multi-tenant chat with strict isolation:

```sql
-- Option 1: Use soft deletes instead
ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_messages_not_deleted ON messages(id) WHERE deleted_at IS NULL;

-- Then query with:
SELECT * FROM messages WHERE deleted_at IS NULL;
```

```typescript
// Option 2: Use Broadcast instead of postgres_changes for deletes
// Server-side validates permission, then broadcasts to specific users
const deleteMessage = async (messageId: string) => {
  // Validate user can delete
  const canDelete = await checkDeletePermission(messageId);
  if (!canDelete) throw new Error('Unauthorized');

  // Delete from DB
  await supabase.from('messages').delete().eq('id', messageId);

  // Broadcast to authorized users only
  await supabase.channel('chat-updates')
    .send({
      type: 'broadcast',
      event: 'message_deleted',
      payload: { messageId, tenantId }
    });
};
```

**Warning signs:**
- Users report seeing "message deleted" notifications for chats they shouldn't have access to
- Audit logs show DELETE events being received by unauthorized users
- Compliance concerns about data leakage in multi-tenant environments

**Phase to address:**
Phase 1 (Core Chat Infrastructure) - Architecture decision between soft deletes vs. Broadcast must be made early. Changing later requires data migration and event handling refactor.

---

### Pitfall 3: postgres_changes Single-Threaded Performance Bottleneck

**What goes wrong:**
Database changes are processed on a single thread to maintain change order. When scaling to 100+ concurrent users or high-message-volume chats, postgres_changes becomes a bottleneck. Compute upgrades don't help because the limitation is architectural, not resource-based.

**Why it happens:**
Supabase must process changes sequentially to guarantee ordering. With RLS enabled, each change requires a security check (temporarily assuming each subscribed client's identity and running a query). For a chat with 50 users, every message insert triggers 50 security checks on a single thread.

**How to avoid:**
1. **For high-volume chats:** Use Broadcast instead of postgres_changes

```typescript
// WRONG - doesn't scale past ~50 concurrent users
const channel = supabase.channel('chat')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    handleNewMessage
  );

// CORRECT - scales to 1000+ users
const channel = supabase.channel('chat')
  .on('broadcast', { event: 'new_message' }, handleNewMessage);

// Server-side: After inserting message
await supabase.from('messages').insert(message);
await channel.send({
  type: 'broadcast',
  event: 'new_message',
  payload: message
});
```

2. **For moderate volume:** Use separate "public" table without RLS + manual filtering

3. **Hybrid approach:** postgres_changes for metadata (read receipts, typing indicators), Broadcast for messages

**Warning signs:**
- Message delivery latency exceeds 200ms consistently
- Supabase dashboard shows realtime lag spikes during active chat periods
- Messages arrive out of order for some users
- 30+ second delays when 10+ users send messages simultaneously

**Phase to address:**
Phase 2 (Scaling & Performance) - Can start with postgres_changes in Phase 1 for simplicity, but must refactor before production deployment with 5+ concurrent users per chat.

---

### Pitfall 4: Duplicate Events from Reconnection Without Deduplication

**What goes wrong:**
WebSocket reconnections (network interruptions, laptop sleep/wake, mobile background/foreground) cause missed events to be replayed. Without deduplication logic, users see duplicate messages, duplicate notifications, and duplicate unread counts. In worst cases, reconnection during message send causes double-posting.

**Why it happens:**
Supabase Realtime streams events as they occur without built-in deduplication. During reconnection recovery, the client may receive events it already processed before disconnection. Network retries can cause the same INSERT to trigger multiple postgres_changes events.

**How to avoid:**
Implement client-side deduplication with message IDs:

```typescript
// Message ID tracking service
class MessageDeduplicator {
  private seenIds = new Set<string>();
  private maxSize = 10000; // Sliding window

  isDuplicate(messageId: string): boolean {
    if (this.seenIds.has(messageId)) {
      return true;
    }

    this.seenIds.add(messageId);

    // Prevent unbounded growth
    if (this.seenIds.size > this.maxSize) {
      const firstId = this.seenIds.values().next().value;
      this.seenIds.delete(firstId);
    }

    return false;
  }
}

// In message handler
channel.on('postgres_changes', { event: 'INSERT' }, (payload) => {
  const message = payload.new;

  if (deduplicator.isDuplicate(message.id)) {
    console.log('Duplicate message ignored:', message.id);
    return;
  }

  handleNewMessage(message);
});
```

Use idempotency keys for critical actions:

```typescript
// Message sending with idempotency
const sendMessage = async (content: string) => {
  const idempotencyKey = crypto.randomUUID();

  await supabase.from('messages').insert({
    id: idempotencyKey, // Use idempotency key as message ID
    content,
    tenant_id: tenantId,
    entity_id: entityId
  });
};
```

**Warning signs:**
- Users report seeing same message multiple times
- Unread count increases by 2+ for single message
- Notification emails sent multiple times for same event
- Logs show duplicate INSERT events with identical timestamps

**Phase to address:**
Phase 1 (Core Chat Infrastructure) - Deduplication must be built into message handling from the start. Retrofitting is extremely difficult because you need to track message IDs that weren't preserved.

---

### Pitfall 5: Unread Count Performance Death Spiral

**What goes wrong:**
Naive unread counting (COUNT(*) queries or loading all unread messages) causes severe performance degradation when users have 200+ unread messages. Apps become unusable with 10-12 second load times. The problem compounds when multiple users simultaneously load high-unread-count chats.

**Why it happens:**
Developers implement unread tracking as `SELECT COUNT(*) FROM messages WHERE unread = true`, which requires full table scans or expensive index operations. Loading a chat with 200 unread messages triggers 200+ DOM operations, database queries for message details, and real-time subscription setup - all synchronously.

**How to avoid:**
Use denormalized unread counters:

```sql
-- Add counter to chat participants table
ALTER TABLE chat_participants ADD COLUMN unread_count INTEGER DEFAULT 0;
CREATE INDEX idx_chat_participants_unread ON chat_participants(user_id, tenant_id) WHERE unread_count > 0;

-- Increment on new message (via trigger or application logic)
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_participants
  SET unread_count = unread_count + 1
  WHERE chat_id = NEW.chat_id
    AND user_id != NEW.sender_id
    AND tenant_id = NEW.tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reset on chat open
UPDATE chat_participants
SET unread_count = 0, last_read_at = NOW()
WHERE chat_id = :chat_id AND user_id = :user_id;
```

Paginate unread messages aggressively:

```typescript
// Load only 20 most recent unread, not all 200+
const { data: unreadMessages } = await supabase
  .from('messages')
  .select('*')
  .eq('chat_id', chatId)
  .gt('created_at', lastReadAt)
  .order('created_at', { ascending: false })
  .limit(20); // Critical: Don't load all unreads
```

Display unread badge with "99+" cap:

```typescript
// WRONG - exact count forces full query
<Badge>{unreadCount}</Badge>

// CORRECT - capped display allows database optimization
<Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
```

**Warning signs:**
- Chat list load time increases linearly with unread count
- Database CPU spikes when users with high unread counts log in
- Pagination queries take 2+ seconds for users with 100+ unreads
- Browser tab freezes when rendering unread messages

**Phase to address:**
Phase 1 (Core Chat Infrastructure) - Unread counter architecture must be correct from start. Migrating from naive counting to denormalized counters requires data backfill and is error-prone.

---

### Pitfall 6: Notification Storm from Granular Controls

**What goes wrong:**
Implementing email notifications for every message/mention without batching, rate limiting, or granular user controls creates notification fatigue. Users receive 50+ emails per day, disable all notifications, and miss critical updates. Support tickets flood in about "too many emails."

**Why it happens:**
90% of notification complaints stem from lack of user control over notification frequency and types. Developers implement a single "Allow notifications?" toggle, which users must choose between all-or-nothing. Industry research shows users don't dislike notifications - they dislike losing control over them.

**How to avoid:**
Implement batching and granular controls:

```typescript
// Notification preferences schema
interface NotificationPreferences {
  email_mentions: 'immediately' | 'batched_hourly' | 'daily_digest' | 'never';
  email_all_messages: 'immediately' | 'batched_hourly' | 'daily_digest' | 'never';
  email_assignments: 'immediately' | 'never';
  quiet_hours_start?: string; // "22:00"
  quiet_hours_end?: string;   // "08:00"
  quiet_hours_timezone?: string;
}

// Batch processing
const sendBatchedNotifications = async () => {
  const users = await getUsersWithBatchedPreferences();

  for (const user of users) {
    const events = await getUnsentEvents(user.id, user.last_batch_sent_at);

    if (events.length === 0) continue;

    // Single email with digest
    await sendEmail({
      to: user.email,
      subject: `${events.length} updates in your chats`,
      body: renderDigest(events)
    });

    await markEventsBatched(events.map(e => e.id));
  }
};
```

Rate limiting per user:

```typescript
// Prevent notification spam
const canSendNotification = async (userId: string): Promise<boolean> => {
  const recentNotifications = await supabase
    .from('notification_log')
    .select('count')
    .eq('user_id', userId)
    .gte('sent_at', new Date(Date.now() - 3600000)); // Last hour

  return recentNotifications.count < 10; // Max 10/hour
};
```

**Warning signs:**
- Support tickets about "too many emails"
- High email unsubscribe rate (>5%)
- Notification open rate <10%
- Users asking "how do I turn off notifications?"

**Phase to address:**
Phase 3 (Email Notifications) - Can start with simple immediate notifications in Phase 1, but must implement batching and controls before rolling out to all users.

---

### Pitfall 7: Tenant Isolation Bypass in Realtime Subscriptions

**What goes wrong:**
Subscribing to channels without tenant_id filters allows users to receive messages from other tenants. In multi-tenant CRM, Tenant A's accountant sees Tenant B's client messages. Critical compliance violation and security breach.

**Why it happens:**
Realtime subscriptions bypass application-level tenant filtering if not explicitly configured. RLS policies protect database reads, but developers forget to apply the same filtering to real-time channels. Channel names without tenant_id (`chat:${entityId}`) are global across all tenants.

**How to avoid:**
Always include tenant_id in channel names and filters:

```typescript
// WRONG - global channel, no tenant isolation
const channel = supabase.channel(`annual-balance:${balanceId}`);

// CORRECT - tenant-scoped channel
const channel = supabase.channel(`annual-balance:${tenantId}:${balanceId}`);

// CORRECT - postgres_changes with tenant filter
channel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'messages',
  filter: `tenant_id=eq.${tenantId}` // Critical filter
}, handleNewMessage);
```

Server-side validation for Broadcast:

```typescript
// Edge function that sends broadcasts
const sendMessage = async (req: Request) => {
  const { message } = await req.json();
  const user = await getCurrentUser(req);

  // Verify user belongs to tenant
  const hasAccess = await verifyTenantAccess(user.id, message.tenant_id);
  if (!hasAccess) {
    return new Response('Forbidden', { status: 403 });
  }

  // Safe to broadcast
  await supabase.channel(`chat:${message.tenant_id}:${message.chat_id}`)
    .send({ type: 'broadcast', event: 'message', payload: message });
};
```

Test with multiple tenants:

```typescript
// Integration test
test('tenant isolation in realtime', async () => {
  const tenantAUser = await loginAs('tenant-a-user');
  const tenantBUser = await loginAs('tenant-b-user');

  const tenantAChannel = supabaseAs(tenantAUser)
    .channel(`chat:tenant-a:chat-1`);

  const tenantBChannel = supabaseAs(tenantBUser)
    .channel(`chat:tenant-b:chat-1`);

  // Tenant B sends message
  await sendMessage(tenantBUser, { content: 'Secret' });

  // Verify Tenant A never receives it
  const received = await waitForEvent(tenantAChannel, 1000);
  expect(received).toBeNull();
});
```

**Warning signs:**
- Audit logs show users accessing data outside their tenant
- Users report seeing other organizations' data
- Channel names in network tab don't include tenant identifiers
- RLS policies pass but cross-tenant data appears in UI

**Phase to address:**
Phase 1 (Core Chat Infrastructure) - MUST be correct from day 1. Tenant isolation bugs in production are catastrophic for B2B SaaS. Not fixable post-launch without full security audit.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using postgres_changes without Broadcast fallback | Simple API, less code | Doesn't scale past 50 concurrent users, requires full refactor | Never for production chat |
| Skipping message deduplication | Faster initial implementation | Duplicate messages on every reconnection, poor UX | Only for internal testing |
| Exact unread counts without "99+" cap | Slightly more accurate UI | Forces expensive COUNT queries, performance death spiral | Never in production |
| No notification batching | Simple immediate send logic | Notification fatigue, high unsubscribe rate | Only for critical alerts (assignments) |
| Storing read receipts as individual rows | Normalized schema, easy queries | Write amplification (N rows per message), database bloat | Acceptable for small teams (<10 users) |
| Loading full chat history on open | Simple pagination-free code | 10+ second load for active chats, memory issues | Never - always paginate |
| Using offset pagination for messages | Familiar implementation | Duplicate messages when new ones arrive, poor performance | Never for chat - use cursor |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| SendGrid email notifications | Sending individual email per mention | Batch notifications, use SendGrid's batch API, respect user digest preferences |
| Supabase Edge Functions | Deploying without timeout configuration | Set timeout to 30s max, implement queue for long operations |
| Realtime + RLS | Assuming DELETE events respect RLS | Use soft deletes or Broadcast for deletes, never rely on RLS for DELETE |
| Auth JWT claims | Storing tenant_id in user_metadata only | Also store in app_metadata (immutable), validate server-side |
| Storage for file uploads in chat | Storing in default bucket | Create per-tenant buckets, configure RLS on storage |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 queries for message sender details | Chat loads in 5+ seconds | Use joins or denormalize sender name/avatar in messages table | 50+ messages with unique senders |
| Real-time subscription per message | Browser DevTools shows 100+ WebSocket subscriptions | Single subscription per chat, not per message | 20+ messages in view |
| Unindexed tenant_id + chat_id filters | Slow queries in production | `CREATE INDEX idx_messages_chat ON messages(tenant_id, chat_id, created_at)` | 10K+ total messages |
| Loading all chat participants on every message | API latency spikes | Cache participants list, refresh only on JOIN/LEAVE events | 10+ participants |
| No cursor pagination for message history | Duplicate/missing messages when scrolling | Use cursor-based pagination with `created_at` + `id` | 100+ messages per chat |
| Synchronous email sending in message handler | Message send feels slow (1-2s delay) | Queue emails for async processing, return immediately | Any email notification enabled |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Channel names without tenant_id | Cross-tenant data leakage | Always include: `channel:${tenantId}:${entityId}` |
| Trusting client-provided tenant_id in broadcasts | Tenant impersonation | Extract tenant_id from JWT server-side |
| No rate limiting on message sends | Spam attacks, database overload | Rate limit: 20 messages/minute per user |
| Exposing service_role key in client code | Complete database access bypass | Only use anon key in client, service_role in Edge Functions |
| No message content sanitization | XSS attacks via chat messages | Sanitize HTML, escape special characters, use Content Security Policy |
| Allowing file uploads without virus scanning | Malware distribution via chat | Integrate virus scanning (ClamAV), limit file types |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading states during message send | Users double-click, send duplicate messages | Show "sending..." state, disable input until confirmed |
| No optimistic UI updates | Chat feels laggy, users think it's broken | Immediately show message, rollback if fails |
| Notification sounds for every message | Disruptive in active conversations | Only sound for @mentions or first message after idle period |
| No "other user is typing" indicator | Users send messages simultaneously | Implement typing indicators via Presence |
| Unread count badge on current open chat | Confusing UX, badge doesn't clear | Clear unread count when chat is in viewport |
| No message failed state | Lost messages, frustrated users | Show failed state with retry button |

## "Looks Done But Isn't" Checklist

- [ ] **Chat list ordering:** Often missing proper sorting by last_message_at - verify chat with newest message always appears first
- [ ] **Unread counts after logout/login:** Often miscounted - verify counts persist correctly across sessions
- [ ] **Notification deduplication:** Often missing - verify @mention in rapid edits sends only 1 email
- [ ] **Timezone handling:** Often hardcoded to UTC - verify timestamps display in user's timezone
- [ ] **Empty states:** Often missing - verify UI for "no chats yet", "no messages yet", "chat deleted"
- [ ] **Error boundaries:** Often missing - verify chat UI doesn't crash entire page on Supabase error
- [ ] **Offline handling:** Often missing - verify graceful degradation when WebSocket disconnects
- [ ] **Message deletion permission:** Often missing - verify only sender or admin can delete
- [ ] **Read receipt privacy:** Often publicly exposed - verify users can opt out of read receipts
- [ ] **Channel cleanup on unmount:** Often missing - verify no memory leaks after switching between 20 chats

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Channel memory leaks | LOW | Add cleanup to existing useEffect hooks, monitor memory |
| Missing tenant_id in channels | HIGH | Rename all channels with tenant prefix, migrate active subscriptions |
| No message deduplication | MEDIUM | Add message ID tracking, backfill IDs for old messages if needed |
| Naive unread counting | HIGH | Create denormalized counters, backfill counts, update all increment logic |
| postgres_changes bottleneck | HIGH | Refactor to Broadcast, update all message handlers, test ordering |
| Notification storm | MEDIUM | Add batching logic, migrate user preferences, communicate changes |
| DELETE event data leakage | MEDIUM | Switch to soft deletes, migrate deletion logic, update RLS policies |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Channel memory leaks | Phase 1 (Core Infrastructure) | Memory profiler shows flat memory usage over 1 hour session |
| RLS DELETE data leakage | Phase 1 (Core Infrastructure) | Audit logs confirm DELETE events only to authorized users |
| postgres_changes bottleneck | Phase 2 (Scaling & Performance) | Load test: 100 concurrent users, <200ms message delivery |
| Duplicate events | Phase 1 (Core Infrastructure) | Reconnection test: no duplicate messages after 10 reconnections |
| Unread count performance | Phase 1 (Core Infrastructure) | Chat with 500 unread messages loads in <2 seconds |
| Notification storm | Phase 3 (Email Notifications) | User survey: <5% report "too many notifications" |
| Tenant isolation bypass | Phase 1 (Core Infrastructure) | Penetration test: no cross-tenant data access possible |

## Sources

**Supabase Official Documentation:**
- [Postgres Changes | Supabase Docs](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Realtime Authorization | Supabase Docs](https://supabase.com/docs/guides/realtime/authorization)
- [Realtime Troubleshooting | Supabase Docs](https://supabase.com/docs/guides/realtime/troubleshooting)
- [Realtime Benchmarks | Supabase Docs](https://supabase.com/docs/guides/realtime/benchmarks)

**Supabase GitHub Issues & Discussions:**
- [Docs for broadcasting messages don't explain that channels need to be cleaned up](https://github.com/supabase/realtime-js/issues/281)
- [Long running realtime channel results in steady growing memory](https://github.com/supabase/supabase-js/issues/1204)
- [Realtime delete event is not containing all old data when RLS is enabled](https://github.com/orgs/supabase/discussions/12471)
- [Bug: realtime RLS policy evaluation differs for DELETE](https://github.com/supabase/realtime/issues/562)

**Multi-Tenant Security:**
- [Best Practices for Supabase | Security, Scaling & Maintainability](https://www.leanware.co/insights/supabase-best-practices)
- [Enforcing Row Level Security in Supabase: Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

**Performance & Architecture:**
- [How Twitter Scales Its Feed: Cursor Pagination & Kafka](https://medium.com/codex/how-twitter-scales-its-feed-infinite-scroll-cursor-pagination-fan-out-kafka-explained-9a524096fccc)
- [Understanding Cursor Pagination and Why It's So Fast](https://www.milanjovanovic.tech/blog/understanding-cursor-pagination-and-why-its-so-fast-deep-dive)
- [Supabase Realtime Duplicate Event Handling](https://drdroid.io/stack-diagnosis/supabase-realtime-duplicate-event-handling)
- [Supabase Realtime Client-Side Memory Leak](https://drdroid.io/stack-diagnosis/supabase-realtime-client-side-memory-leak)

**Notification Best Practices:**
- [How to Design a Notification System: A Complete Guide](https://www.systemdesignhandbook.com/guides/design-a-notification-system/)
- [Building a batched notification engine | Knock](https://knock.app/blog/building-a-batched-notification-engine)
- [App Push Notification Best Practices for 2026](https://appbot.co/blog/app-push-notifications-2026-best-practices/)

**WebSocket Patterns:**
- [How to Handle WebSocket Reconnection Logic](https://oneuptime.com/blog/post/2026-01-24-websocket-reconnection-logic/view)
- [WebSocket architecture best practices](https://ably.com/topic/websocket-architecture-best-practices)

**Unread Tracking:**
- [Perf: Time lags navigating to chat with 200 unread messages](https://github.com/status-im/status-mobile/issues/3336)
- [Efficient and optimized way of tracking unread message per user](https://dev.to/anoopfranc/how-would-you-make-it-efficient-and-optimized-way-of-tracking-unread-message-per-user-3o00)

---
*Pitfalls research for: Internal Chat & Notification System (Supabase Realtime)*
*Researched: 2026-02-09*
