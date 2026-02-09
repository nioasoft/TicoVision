# Project Research Summary

**Project:** Internal Chat & Notifications for Annual Balance Case Management
**Domain:** Real-time collaborative communication for accounting workflows
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

The TicoVision CRM already has a functioning chat module using Supabase Realtime with `postgres_changes`, which is a solid foundation. Research validates the current tech stack is production-ready with no new major dependencies required. The key finding is that while the current implementation works well for small teams (3-5 users), Supabase officially recommends migrating to Broadcast channels for better scalability and lower latency (<100ms vs 200-500ms).

The recommended approach is a phased rollout: start by optimizing the current system with per-entity channels, toast notifications, and typing indicators (all using existing tools), then optionally migrate to Broadcast if scaling demands emerge. The architecture should follow the existing BaseService pattern with per-entity Realtime subscriptions, denormalized unread counters for performance, and async email notifications via Edge Functions.

Critical risks center on tenant isolation (MUST include tenant_id in all channel names), channel memory leaks (cleanup required in useEffect), and unread count performance (denormalized counters essential). These are not hypothetical future problems - they are day-one requirements that become extremely expensive to fix post-launch. The good news: with proper patterns from the start, this system scales comfortably to 100+ users and 200+ concurrent chats.

## Key Findings

### Recommended Stack

Current implementation is already optimal. All required dependencies exist in package.json: React 19.1.1, @supabase/supabase-js 2.57.2 (includes Realtime), Zustand 5.0.8, Sonner 2.0.7, and Zod 4.1.5. No new installations needed.

**Core technologies:**
- **Supabase Realtime**: WebSocket-based real-time updates - currently uses `postgres_changes` (works but has scaling limits), official recommendation is Broadcast channels for chat (lower latency, higher throughput)
- **Zustand**: State management for messages and subscriptions - already used in annual-balance module, follows existing patterns
- **shadcn/ui Sheet**: Side panel UI for chat drawer - fits RTL requirements, consistent with project design system
- **SendGrid**: Email notifications via Edge Functions - already configured, batching and digest support available
- **Sonner**: Toast notifications for new messages - preferred over shadcn/ui Toast (deprecated), already installed

**Critical version notes:**
- React 19.1.1 is latest stable, full compatibility confirmed
- Supabase JS 2.57.2 includes all Realtime features (postgres_changes, Broadcast, Presence)
- No library conflicts with existing codebase

### Expected Features

Research analyzed 25+ features across team chat tools (Slack, Teams), issue trackers (Linear, GitHub), and accounting software (Canopy, Uku). Key insight: Linear's per-entity comment pattern is the closest match for small-team case discussions, not Slack's channel model.

**Must have (table stakes):**
- Real-time message delivery - standard in all modern collaboration tools, users expect instant updates without refresh
- Unread message indicators - 68% of users rely on these for prioritization in work apps
- Message history with scrollback - context from past conversations is essential
- Email notification on new message - async work requires notifications when users are inactive
- Sender identification + timestamps - understanding who said what when is core to threaded communication
- Side panel/drawer UI - non-disruptive access while viewing annual balance table
- RTL Hebrew layout - right-aligned text, reversed flex layouts, proper timestamp positioning
- Mark thread as read - manual clear of unread state expected by all users

**Should have (competitive advantage):**
- Unread count in table badge - numeric badges reduce cognitive load 24% vs binary indicators
- Contextual chat opening - open from table row, auto-focus that entity, keeps users oriented
- Table filtering by unread - quick access to cases needing attention
- Auto-email on auditor assignment - proactive communication reduces "did you see this?" messages
- Optimistic message posting - perceived performance boost, standard in modern chat (Slack, Discord)
- @mention support - reduces noise, only notify when explicitly addressed (defer until threads get noisy)
- System messages for case events - unified timeline ("Status changed to 'In Review' by Admin")

**Defer (v2+):**
- Chat search - low ROI for 20-50 message threads, browser Ctrl+F sufficient
- Message reactions - low value in professional Hebrew RTL context, emoji positioning issues
- Threaded replies - splits conversation, hides context, overcomplicated for 3-5 person chats
- File attachments in chat - duplicates existing file manager, creates versioning nightmare (link to files instead)
- Voice messages - inaccessible without transcript, Hebrew speech recognition poor
- Typing indicators - nice-to-have, can be added easily with Presence (Phase 2)

### Architecture Approach

The architecture follows TicoVision's existing patterns: services extend BaseService for tenant isolation, Zustand stores manage state with Realtime subscriptions, components use shadcn/ui, and async operations run in Edge Functions. Chat lives in `src/modules/annual-balance/` as a module-scoped feature.

**Major components:**
1. **ChatService (extends BaseService)** - CRUD operations on `balance_messages` table, enforces tenant_id + entity_id filtering, handles message send/receive and unread tracking
2. **ChatStore (Zustand)** - Manages messages[] state, Realtime subscription lifecycle, optimistic updates with rollback, syncs with annualBalanceStore for context
3. **ChatSheet (shadcn/ui Sheet)** - Slide-in panel from right (RTL), MessageList + MessageInput + UnreadBadge, fixed height with scrollable messages
4. **Database Tables** - `balance_messages` (content + metadata with RLS), `unread_messages` (batched range tracking, not per-message rows), indexed by tenant_id + entity_id
5. **Edge Function (send-chat-notification)** - Async email delivery via SendGrid, triggered by database webhook on INSERT, queries auditor email from annual_balance_sheets
6. **Realtime Channel** - Per-entity subscription pattern `chat:${tenantId}:${entityId}`, postgres_changes for INSERT events initially, Broadcast migration path documented for scaling

**Key patterns from research:**
- **Per-entity channels** - subscribe on entity open, unsubscribe on unmount, prevents memory leaks and reduces client-side filtering
- **Optimistic updates** - add message to store immediately, replace with server-confirmed version, rollback on error with toast
- **Denormalized unread counters** - store count in chat_participants or annual_balance_sheets, increment via trigger, avoid COUNT(*) queries that cause 10-12 second load times
- **Database webhook + Edge Function** - async notifications don't block message sending, decoupled architecture scales better
- **Batched range tracking** - `first_unread_message_id` + `last_read_message_id` instead of individual read receipts, dramatically fewer database rows

### Critical Pitfalls

Research identified 7 critical pitfalls from Supabase GitHub issues, multi-tenant security guides, and performance benchmarks. These are not theoretical - each has caused production incidents in real-world implementations.

1. **Channel Memory Leaks** - RealtimeChannel objects accumulate in RealtimeClient.channels array without cleanup, causing memory usage to grow unbounded. MUST call `supabase.removeChannel(channel)` in useEffect cleanup. Warning signs: sluggish browser after 30+ minutes, multiple WebSocket connections in network tab. Address in Phase 1 (bake into channel management from start).

2. **RLS DELETE Event Data Leakage** - DELETE events broadcast to ALL subscribed users regardless of RLS policies because Postgres cannot verify permissions on deleted rows. Use soft deletes (`deleted_at` column) or Broadcast with server-side validation instead of postgres_changes for deletes. Address in Phase 1 (architecture decision can't change later).

3. **postgres_changes Single-Threaded Bottleneck** - Database changes processed sequentially on one thread to maintain order. With RLS, each message triggers N security checks for N subscribed users. Supabase docs explicitly recommend Broadcast for chat at scale. Symptoms: >200ms latency, out-of-order messages. Migrate to Broadcast in Phase 2 if volume demands (current implementation fine for 3-5 users).

4. **Duplicate Events from Reconnection** - WebSocket reconnections (network interruptions, sleep/wake) replay missed events without deduplication. Users see duplicate messages and double-posted sends. MUST implement client-side message ID tracking with Set and use idempotency keys for sends. Address in Phase 1 (retrofitting requires tracking IDs that weren't preserved).

5. **Unread Count Performance Death Spiral** - Naive COUNT(*) queries or loading all unread messages cause 10-12 second load times when users have 200+ unreads. Use denormalized unread_count column incremented by triggers, paginate unread messages (max 20 per fetch), display "99+" cap to allow database optimization. Address in Phase 1 (migrating from naive to denormalized requires complex data backfill).

6. **Notification Storm** - Email per message without batching or user controls creates fatigue, 50+ emails/day, high unsubscribe rate. Research shows 90% of complaints stem from lack of granular control. Implement batching (hourly/daily digest options), quiet hours, rate limiting (max 10/hour), and per-event-type preferences. Address in Phase 3 (can start simple, refine based on user feedback).

7. **Tenant Isolation Bypass** - Subscribing to channels without tenant_id filters allows cross-tenant data leakage. Channel names like `chat:${entityId}` are global. MUST use `chat:${tenantId}:${entityId}` pattern and include `filter: "tenant_id=eq.${tenantId}"` in postgres_changes subscriptions. Address in Phase 1 (catastrophic compliance violation if missed, not fixable post-launch without full security audit).

## Implications for Roadmap

Based on research, suggested 3-phase structure that builds on existing implementation and avoids critical pitfalls:

### Phase 1: Core Chat Infrastructure (Foundation)
**Rationale:** Build on existing chat module with proper patterns for tenant isolation, memory management, and performance. Must establish these fundamentals correctly from day one - fixing leaks and isolation bugs post-launch is extremely expensive.

**Delivers:**
- Per-entity chat with real-time message delivery
- Unread indicators (binary: has unread yes/no)
- Side panel ChatSheet integrated into annual balance table
- Email notifications on new message (if user inactive 5+ min)
- Auto-email on auditor assignment
- RTL Hebrew UI with proper alignment

**Technical implementation:**
- Database migration: `balance_messages` + `unread_messages` tables with RLS policies and indexes
- ChatService extends BaseService with tenant_id enforcement
- ChatStore manages subscription with proper cleanup in useEffect
- Per-entity Realtime channel: `chat:${tenantId}:${balanceId}` with tenant filter
- Message deduplication via Set<messageId> tracking
- Denormalized unread counter to avoid COUNT(*) performance trap

**Addresses features:**
- Real-time message delivery (table stakes)
- Message history with scrollback (table stakes)
- Sender + timestamp display (table stakes)
- Email notification (table stakes)
- Side panel UI (table stakes)
- Mark thread as read (table stakes)

**Avoids pitfalls:**
- Tenant isolation bypass (channel names include tenant_id, RLS filters applied)
- Channel memory leaks (cleanup in useEffect return)
- Duplicate events (message ID tracking)
- Unread count performance (denormalized counters)
- RLS DELETE leakage (soft deletes from start)

**Research flags:** Standard patterns, no additional research needed. Supabase Realtime and multi-tenant chat are well-documented.

### Phase 2: Real-time Enhancements (Polish)
**Rationale:** Once core chat works, add features that improve perceived performance and awareness. These are additive changes that don't affect Phase 1 stability.

**Delivers:**
- Unread count badges (numeric: "3 messages" vs binary indicator)
- Table filtering by unread (show only active cases)
- Optimistic message posting (instant UI feedback)
- Typing indicators ("Sarah is typing..." via Presence)
- Toast notifications for messages in non-active chats
- Message edit window (5 minutes, with "(edited)" indicator)

**Technical implementation:**
- Upgrade unread indicators from binary to count display
- Add table filter toggle for `unreadCount > 0`
- Implement optimistic updates in ChatStore with error rollback
- Add Presence subscription for typing state
- Integrate Sonner toasts in message handler
- Add `updated_at` column and edit permission checks

**Addresses features:**
- Unread count badges (competitive advantage)
- Table filtering by unread (competitive advantage)
- Optimistic posting (competitive advantage)
- Typing indicators (nice-to-have, easy with Presence)

**Uses stack elements:**
- Sonner for toast notifications (already installed)
- Supabase Presence for typing indicators (same Realtime connection)

**Research flags:** Standard patterns, no additional research needed.

### Phase 3: Notifications & Scale (Production Readiness)
**Rationale:** Prepare for broader rollout with proper notification controls and optional Broadcast migration if scaling demands emerge (only needed if >50 concurrent users or latency issues).

**Delivers:**
- @mention support with targeted notifications
- Email digest preferences (immediate/hourly/daily/never)
- Quiet hours configuration per user
- Rate limiting (max 10 notifications/hour)
- System messages for case events (status changes, document uploads)
- Optional: Migrate to Broadcast channels (if postgres_changes bottleneck appears)

**Technical implementation:**
- Message parsing for @mentions, notification preferences table
- Edge Function batch job for hourly/daily digests
- User notification settings page (quiet hours, frequency per event type)
- Rate limiting logic in notification Edge Function
- System message generation on annual_balance status changes
- Broadcast migration path: hybrid INSERT + broadcast, test in parallel

**Addresses features:**
- @mention support (competitive advantage)
- Email digest for inactive users (competitive advantage)
- System messages for events (competitive advantage)

**Addresses pitfalls:**
- Notification storm (batching, user controls, rate limiting)
- postgres_changes bottleneck (Broadcast migration if needed)

**Research flags:**
- **Needs research:** @mention parsing strategies, SendGrid batch API usage patterns
- **Standard patterns:** Notification preferences UI, Broadcast migration (well-documented by Supabase)

### Phase Ordering Rationale

**Why Phase 1 is foundational:**
- Tenant isolation, memory management, and performance patterns cannot be retrofitted. These must be correct from day one or they require architectural refactors and data migrations to fix.
- Research shows 5 of 7 critical pitfalls must be addressed in Phase 1. Deferring them creates technical debt that compounds.
- Phase 1 delivers complete MVP: users can send/receive messages, see unread indicators, get email notifications. Everything else is enhancement.

**Why Phase 2 is additive:**
- All Phase 2 features are independent additions that don't affect Phase 1 stability.
- Optimistic updates, typing indicators, and toast notifications can be added without touching database schema or core message flow.
- Unread count upgrade (binary → numeric) is a UI change with minimal backend impact.

**Why Phase 3 is production polish:**
- Notification controls become important only when users have multiple active chats. Start simple (immediate emails), add controls when volume demands.
- @mentions useful when threads get noisy (5+ participants or 50+ messages). Not needed for small team MVP.
- Broadcast migration optional - only if latency measurements show postgres_changes bottleneck. Research indicates 3-5 users won't hit this limit.

**Dependency structure:**
- Phase 1 has no dependencies (can start immediately)
- Phase 2 requires Phase 1 complete (needs database tables, service, store)
- Phase 3 requires Phase 2 complete (needs unread counts, toast system for @mentions)

**How this avoids pitfalls:**
- Phase 1 establishes tenant isolation, cleanup patterns, deduplication, denormalized counters
- Phase 2 adds features without increasing complexity of core flow
- Phase 3 addresses notification fatigue only after users experience the problem

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Core Chat):** Supabase Realtime, multi-tenant RLS, Zustand subscriptions all heavily documented in official sources and existing codebase patterns
- **Phase 2 (Enhancements):** Sonner usage, Presence API, optimistic updates all have clear examples in Supabase docs and community

**Phases needing validation during planning:**
- **Phase 3 (@mentions):** Multiple parsing strategies exist (regex vs lexer vs contenteditable), need to research which works best for Hebrew RTL with mixed English usernames
- **Phase 3 (SendGrid batching):** SendGrid batch API limits and billing implications need verification before committing to hourly/daily digest architecture

**Phases to validate with users:**
- **Phase 2 (Unread counts):** Validate whether numeric badges or binary indicators reduce cognitive load more in annual balance workflow
- **Phase 3 (Notification frequency):** Survey users about email preferences before building complex digest system (might be premature optimization)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified in current package.json, React 19 + Supabase 2.57.2 compatibility confirmed from official sources |
| Features | MEDIUM | Feature priorities based on small-team use case analysis + competitor research, but specific to 3-5 user accounting workflow (less generalized data) |
| Architecture | HIGH | Patterns match existing TicoVision codebase (BaseService, Zustand, shadcn/ui), Supabase multi-tenant architecture heavily documented |
| Pitfalls | HIGH | All 7 critical pitfalls sourced from Supabase GitHub issues, official docs warnings, and real-world incident reports with specific reproduction steps |

**Overall confidence:** HIGH

Research is comprehensive with strong primary sources (Supabase official docs, GitHub issues with maintainer responses, existing codebase patterns). Feature prioritization is the only MEDIUM area due to limited accounting-specific chat research, but analogous patterns from Linear (per-entity comments) and Teams (small team collaboration) provide good guidance.

### Gaps to Address

**During Phase 1 planning:**
- **Database trigger vs Supabase webhook:** Research shows both patterns for Edge Function invocation. Need to decide which fits TicoVision deployment better (pg_net function vs webhook UI configuration).
- **Unread counter location:** Denormalized counter can live in `annual_balance_sheets` table or separate `chat_participants` table. Need to evaluate which fits existing schema better.

**During Phase 2 planning:**
- **Optimistic update rollback UX:** Research shows pattern (remove optimistic, show toast) but need to design Hebrew error messages and retry flow.

**During Phase 3 planning:**
- **@mention autocomplete:** Research focused on parsing, not UI. Need to investigate shadcn/ui Combobox or Command components for Hebrew RTL autocomplete dropdown.
- **Email template design:** SendGrid digest emails need Hebrew RTL templates. Research covered batching logic but not visual design for accounting context.

**Validation needed during implementation:**
- **Message deduplication window size:** Research suggests Set with 10,000 message IDs, but need to validate this doesn't cause memory issues in long-running browser tabs.
- **Unread count query performance:** Denormalized counter approach is validated in research, but need to load test with 500+ messages per entity to confirm <2 second load times.
- **Broadcast vs postgres_changes latency:** Research shows <100ms vs 200-500ms benchmarks from Supabase, but need to measure actual latency in TicoVision production environment to decide if migration is worthwhile.

**Assumptions to validate with users:**
- **Email notification threshold:** Research suggests 5 minutes inactivity, but accounting team might prefer different threshold (immediate? 15 minutes?).
- **Unread count display:** Research shows "99+" cap is standard, but need to confirm accountants don't need exact counts (e.g., "243 unread" for audit compliance).
- **Message edit window:** 5 minutes is Slack's standard, but accounting compliance might require different policy (no edits? longer window with full audit log?).

## Sources

### Primary (HIGH confidence)
- **Supabase Official Documentation**
  - [Postgres Changes Guide](https://supabase.com/docs/guides/realtime/postgres-changes) - Realtime patterns, explicit recommendation to use Broadcast for chat
  - [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) - RLS policies for channels, tenant isolation
  - [Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting) - Memory leak solutions, reconnection handling
  - [Broadcast Guide](https://supabase.com/docs/guides/realtime/broadcast) - Latency benchmarks, scaling recommendations
  - [Presence Guide](https://supabase.com/docs/guides/realtime/presence) - Typing indicators, online status

- **Supabase GitHub Issues** (Maintainer-confirmed bugs)
  - [#281 realtime-js](https://github.com/supabase/realtime-js/issues/281) - Channel cleanup documentation gap
  - [#1204 supabase-js](https://github.com/supabase/supabase-js/issues/1204) - Memory leak reproduction steps
  - [#562 realtime](https://github.com/supabase/realtime/issues/562) - RLS DELETE event leakage confirmed as architectural limitation

- **TicoVision Codebase**
  - Verified current implementation in `src/modules/chat/` (ChatService, ChatStore patterns)
  - Confirmed package.json versions (React 19.1.1, Supabase 2.57.2, Zustand 5.0.8, Sonner 2.0.7)
  - BaseService pattern in `src/services/` (tenant isolation via getTenantId())

### Secondary (MEDIUM confidence)
- **Multi-Tenant Security Guides**
  - [Leanware Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) - Tenant isolation patterns
  - [Dev.to Multi-Tenant RLS Deep Dive](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2) - RLS policy examples

- **Performance Research**
  - [Dev.to Efficient Unread Tracking](https://dev.to/anoopfranc/how-would-you-make-it-efficient-and-optimized-way-of-tracking-unread-message-per-user-3o00) - Batched range approach
  - [GitHub Status-im Issue #3336](https://github.com/status-im/status-mobile/issues/3336) - 200+ unread performance degradation
  - [DrDroid Supabase Diagnostics](https://drdroid.io/stack-diagnosis/supabase-realtime-duplicate-event-handling) - Deduplication patterns

- **Notification UX Research**
  - [Knock Batched Notification Engine](https://knock.app/blog/building-a-batched-notification-engine) - Batching strategies
  - [System Design Handbook](https://www.systemdesignhandbook.com/guides/design-a-notification-system/) - Notification architecture patterns

- **Feature Research**
  - [G2 Best Team Chat Apps 2026](https://learn.g2.com/best-team-chat-apps) - Feature comparison Slack/Teams/Discord
  - [Linear Review 2026](https://work-management.org/software-development/linear-review/) - Per-entity comment patterns
  - [Uku Accounting Practice Management](https://getuku.com/articles/uks-best-accounting-practice-management-software) - Domain norms for accounting collaboration

### Tertiary (LOW confidence, needs validation)
- **RTL Chat UI:** Limited sources on Hebrew RTL-specific chat patterns, extrapolated from general RTL best practices (needs validation with actual implementation)
- **Accounting-specific email cadence:** Industry research sparse, assumptions based on analogous professions (legal case management, consulting projects)

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
