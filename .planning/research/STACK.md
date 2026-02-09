# Technology Stack - Real-time Chat System

**Project:** TicoVision CRM - Internal Chat & Notifications
**Researched:** 2026-02-09
**Overall Confidence:** HIGH

## Executive Summary

The existing codebase already has a functioning chat module using `postgres_changes` for Realtime. This research validates the current approach and provides recommendations for optimization and notification enhancements. The stack is complete and compatible - NO new major dependencies required.

**Key Finding:** Current implementation uses `postgres_changes` which works but has scaling limitations. Supabase officially recommends migrating to `Broadcast` channels for chat applications.

## Existing Stack (Already Implemented)

### Core Dependencies
| Technology | Current Version | Status | Notes |
|------------|----------------|--------|-------|
| React | 19.1.1 | ✅ Production | Latest stable |
| @supabase/supabase-js | 2.57.2 | ✅ Production | Realtime included |
| Zustand | 5.0.8 | ✅ Production | State management for chat |
| Sonner | 2.0.7 | ✅ Production | Toast notifications |
| Zod | 4.1.5 | ✅ Production | Message validation |

**Confidence:** HIGH - All versions verified from package.json and official sources.

## Recommended Stack Changes

### 1. Supabase Realtime Pattern Migration

**Current Implementation:**
```typescript
// src/modules/chat/services/chat.service.ts (line 170-184)
subscribeToMessages(tenantId: string, onMessage: (message: ChatMessage) => void) {
  return supabase
    .channel(`chat:${tenantId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `tenant_id=eq.${tenantId}`,
    }, (payload) => {
      onMessage(payload.new as ChatMessage);
    })
    .subscribe();
}
```

**Recommended Approach:** Migrate to Broadcast Channels

| Aspect | postgres_changes (Current) | Broadcast Channels (Recommended) |
|--------|---------------------------|----------------------------------|
| **Latency** | ~200-500ms | <100ms |
| **Database Load** | High (every message = INSERT + replication) | Low (ephemeral, no DB write) |
| **Scalability** | Single-threaded processing | Multi-threaded pub/sub |
| **Message History** | Automatic (in DB) | Requires separate INSERT |
| **Best For** | Initial MVP, audit requirements | Production chat, high volume |

**Why Migrate:**
- [Supabase docs explicitly recommend](https://supabase.com/docs/guides/realtime/postgres-changes): "If you are using Postgres Changes at scale, you should consider using Realtime Broadcast"
- Current pattern processes database changes on single thread - compute upgrades don't improve performance
- Broadcast supports `ack` config for reliable delivery confirmation
- Broadcast can optionally include `self` parameter for optimistic UI updates

**Confidence:** HIGH - Official Supabase recommendation from current docs.

### 2. Channel Naming Convention

**Current:** `chat:${tenantId}` (single channel for all messages)

**Recommended:** Per-entity channel pattern
```typescript
// For annual balance case chat
`chat:${tenantId}:balance:${balanceId}`

// For general channels
`chat:${tenantId}:channel:${channelId}`

// For direct messages
`chat:${tenantId}:direct:${userId1}:${userId2}`
```

**Rationale:**
- Reduces message filtering on client side
- RLS policies can be channel-specific
- Better performance (clients only subscribe to relevant channels)
- Aligns with [Supabase best practices](https://supabase.com/docs/guides/realtime/concepts): "Use topic names that correlate with concepts and tables, such as one topic per user"

**Confidence:** HIGH - Best practice from official docs and real-world implementations.

### 3. Unread Tracking Strategy

**Current Implementation:** Database-based with `chat_read_status` table (server-side)

**Recommended:** Keep current approach + add client-side optimization

| Strategy | Where | When to Use |
|----------|-------|-------------|
| **Server-side (current)** | `chat_read_status` table | Persistent, cross-device unread counts |
| **Client-side** | Zustand store + localStorage | Optimistic updates, offline-first UX |

**Hybrid Pattern:**
```typescript
// 1. Initial load: fetch from database
const { data } = await chatService.getReadStatus();

// 2. Real-time updates: optimistic local update
store.markChannelAsRead(channelId); // instant UI update

// 3. Background sync: persist to database
await chatService.markAsRead(channelId); // eventual consistency
```

**Why NOT use Presence for unread tracking:**
- Presence is for ephemeral state (online status, typing indicators)
- Unread counts must persist across sessions
- [Supabase docs confirm](https://supabase.com/docs/guides/realtime/presence): "Use broadcast for all realtime events like messaging and notifications, while use presence sparingly for user state tracking like online status"

**Confidence:** HIGH - Current implementation correct, optimization available.

## Supporting Technologies

### Real-time Features to Add

| Feature | Technology | Implementation | Complexity |
|---------|-----------|----------------|------------|
| **Typing Indicators** | Presence Channels | `channel.track({ typing: true })` | Low |
| **Online Status** | Presence Channels | `channel.track({ online_at: timestamp })` | Low |
| **Read Receipts** | Broadcast Channels | Broadcast "user_read" event | Medium |
| **Message Reactions** | Database + Broadcast | INSERT + broadcast event | Medium |

**Confidence:** MEDIUM - Patterns well-documented but not yet implemented in codebase.

### Toast Notifications

**Current:** Sonner 2.0.7 (already installed)

**Pattern for Chat Notifications:**
```typescript
import { toast } from 'sonner';

// On new message when channel not active
if (message.channel_id !== activeChannelId) {
  toast.info(`הודעה חדשה מ-${message.sender_name}`, {
    description: message.content.substring(0, 50),
    action: {
      label: 'הצג',
      onClick: () => openChannel(message.channel_id)
    },
    duration: 5000
  });
}
```

**Note:** Sonner (not shadcn/ui Toast) is [the recommended component](https://ui.shadcn.com/docs/components/radix/toast) as Toast is deprecated in shadcn/ui.

**Confidence:** HIGH - Sonner is already installed and recommended by shadcn/ui.

## Implementation Recommendations

### Phase 1: Optimize Current System (Low Risk)
**Existing code already works. These are enhancements, not fixes.**

1. **Add per-channel subscriptions** (currently one subscription per tenant)
   - Change: Subscribe on `setActiveChannel()`, unsubscribe on channel change
   - Benefit: Reduce client-side message filtering
   - Risk: Low - additive change

2. **Add toast notifications** (Sonner already installed)
   - When: Message arrives for non-active channel
   - Benefit: Users see notifications without opening panel
   - Risk: Low - UI enhancement only

3. **Add typing indicators** (use Presence)
   - New feature, doesn't affect existing functionality
   - Risk: Low - independent feature

### Phase 2: Migrate to Broadcast (Medium Risk)
**Only if scaling issues emerge or latency becomes problem.**

1. **Create hybrid pattern:** Broadcast for delivery + INSERT for history
   ```typescript
   // On send
   const message = await chatService.sendMessage(content); // INSERT to DB
   await channel.send({ type: 'broadcast', event: 'new_message', payload: message });
   ```

2. **Update subscription:** Change from `postgres_changes` to `broadcast`
   ```typescript
   channel.on('broadcast', { event: 'new_message' }, (payload) => {
     addRealtimeMessage(payload.payload);
   });
   ```

3. **Testing:** Run both patterns in parallel for 1-2 weeks
   - Keep postgres_changes as fallback
   - Log any Broadcast delivery failures
   - Switch completely after validation

**Confidence:** HIGH - Migration path is well-documented and reversible.

## What NOT to Use

### ❌ Custom WebSocket Server
**Why:** Supabase Realtime handles WebSocket management, reconnection, authentication. Building custom server adds:
- Infrastructure complexity (deployment, scaling, monitoring)
- Security burden (auth, RLS enforcement)
- Maintenance overhead (library updates, bug fixes)

**When to consider:** Only if Supabase limits hit (10,000+ concurrent connections) or need features Supabase doesn't support.

### ❌ Third-party Chat Services (Firebase, Pusher, Ably)
**Why:** Already using Supabase. Adding another service means:
- Extra costs ($$$)
- Duplicate auth/tenant management
- Data living in multiple places
- More vendor dependencies

**Current Supabase plan suffices** for 3-5 users per chat, hundreds of chats.

### ❌ react-supabase Hooks Library
**Why:** Project already has custom service layer pattern (BaseService). Adding `react-supabase` would:
- Create two different patterns for Supabase access
- Not play well with existing Zustand stores
- Add dependency for minimal benefit

**Current pattern is correct** - services + stores + React hooks work well.

### ❌ Server-Side Rendering (SSR) for Chat
**Why:** Chat is real-time and requires client-side WebSocket connection. SSR would:
- Add complexity without benefit (can't render real-time messages)
- Hydration issues with Supabase client
- Better suited for static content, not live chat

**Current approach (CSR with Vite) is correct.**

## Installation (No New Dependencies Required)

Current `package.json` already has everything:

```bash
# Verify versions (no install needed)
npm list @supabase/supabase-js  # 2.57.2 ✓
npm list sonner                  # 2.0.7 ✓
npm list zustand                 # 5.0.8 ✓
```

**If starting fresh project:**
```bash
npm install @supabase/supabase-js@^2.57.2 sonner@^2.0.7 zustand@^5.0.8
```

## Database Schema (Already Exists)

Current schema is solid. No changes required:

```sql
-- Existing tables (verified in codebase)
chat_channels (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL, -- 'general' | 'client' | 'direct'
  client_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
)

chat_messages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

chat_read_status (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL,
  UNIQUE(tenant_id, channel_id, user_id)
)
```

**RLS Policies Required:**
```sql
-- Enable RLS on all tables
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_status ENABLE ROW LEVEL SECURITY;

-- Policies (should match tenant_id from JWT)
CREATE POLICY "Users can view channels in their tenant"
  ON chat_channels FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::UUID);

CREATE POLICY "Users can send messages in their tenant"
  ON chat_messages FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::UUID);

-- Similar for other operations
```

## Performance Considerations

| Metric | Current (postgres_changes) | With Broadcast | Notes |
|--------|----------------------------|----------------|-------|
| **Message Latency** | 200-500ms | <100ms | Supabase docs benchmark |
| **Database Load** | High (every msg = INSERT + WAL) | Low (optional INSERT) | Single-threaded bottleneck removed |
| **Concurrent Users** | 10-50 recommended | 200-500+ proven | Real-world implementations |
| **Message Throughput** | ~10 msgs/sec | ~100 msgs/sec | Rough estimates |

**For 3-5 users per chat:** Current implementation is perfectly adequate. Broadcast migration is optimization, not requirement.

**Confidence:** MEDIUM - Latency estimates from [Supabase official docs](https://supabase.com/docs/guides/realtime/broadcast) and community reports, not direct testing.

## Scaling Path

### Current Usage: ~10 users, ~20-30 chats
**Status:** ✅ Current postgres_changes pattern is fine

### Medium Scale: ~100 users, ~200 chats
**Recommendation:** Migrate to Broadcast channels
**Trigger:** If message latency >1 second or database CPU >70%

### Large Scale: ~1000+ users
**Recommendation:**
- Broadcast channels (required)
- Read replicas for message history queries
- Edge Functions for message processing
- Consider message archiving strategy

**Confidence:** HIGH - Scaling recommendations from [Supabase official docs](https://supabase.com/docs/guides/realtime/architecture).

## Security Checklist

- [x] **RLS enabled** on all chat tables
- [x] **Tenant isolation** via `tenant_id` filter in all queries (BaseService pattern)
- [x] **Private channels** (requires auth token)
- [x] **Content validation** (Zod schemas, XSS prevention)
- [ ] **Rate limiting** (not yet implemented - consider for production)
- [ ] **Message encryption** (not implemented - probably overkill for internal chat)

**Recommendation:** Add rate limiting via Supabase Edge Functions if abuse becomes issue.

**Confidence:** HIGH - Current implementation follows security best practices.

## Migration Checklist (postgres_changes → Broadcast)

**Only do this if scaling issues appear. Not required for MVP.**

1. [ ] Create new `sendMessageWithBroadcast()` method in chat.service.ts
2. [ ] Update subscription pattern in ChatPanel.tsx
3. [ ] Add `ack: true` config for delivery confirmation
4. [ ] Test with multiple users/tabs (ensure no message loss)
5. [ ] Monitor for 1 week (compare latency, error rates)
6. [ ] Remove old postgres_changes subscription
7. [ ] Update documentation

**Estimated effort:** 2-4 hours (low risk, well-documented pattern)

## Sources & Confidence Levels

| Source | Confidence | URLs |
|--------|------------|------|
| **Supabase Official Docs** | HIGH | [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Broadcast](https://supabase.com/docs/guides/realtime/broadcast), [Presence](https://supabase.com/docs/guides/realtime/presence) |
| **Current Codebase** | HIGH | Verified in `src/modules/chat/` |
| **Package Versions** | HIGH | Verified in package.json |
| **Supabase Recommendations** | HIGH | ["Use Broadcast for chat"](https://supabase.com/docs/guides/realtime/postgres-changes) official recommendation |
| **Community Implementations** | MEDIUM | [Real-time Notifications](https://makerkit.dev/blog/tutorials/real-time-notifications-supabase-nextjs), [Building Chat Apps](https://blog.stackademic.com/realtime-chat-with-supabase-realtime-is-supa-easy-091c96411afd) |
| **Performance Benchmarks** | MEDIUM | Supabase docs + community reports (no direct testing) |
| **React 19 Compatibility** | MEDIUM | Sonner works in current codebase, official compatibility not explicitly documented |

## Key Recommendations Summary

1. **Keep current implementation** - it works, follows best practices
2. **Add toast notifications** - Sonner already installed, quick win
3. **Use per-channel subscriptions** - better performance, cleaner architecture
4. **Plan Broadcast migration** - not urgent, but document the path
5. **Add typing indicators** - nice-to-have, uses Presence (separate from message delivery)

**Most Important:** Current stack is complete and production-ready. Focus on features, not infrastructure changes.

---

**Research completed by:** Claude Opus 4.6 (GSD Project Researcher)
**Last updated:** 2026-02-09
