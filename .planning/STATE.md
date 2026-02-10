# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Auditors and accountants can communicate about specific balance cases in real-time without leaving the annual-balance page
**Current focus:** Phase 6 complete — ready for Phase 7 (Unread Badges)

## Current Position

Phase: 6 of 10 (Read Tracking)
Plan: 1 of 1 complete
Status: Phase 6 verified and complete
Last activity: 2026-02-10 — Completed 06-01-PLAN.md (Denormalized unread counter with trigger + upsert markAsRead)

Progress: [██████░░░░] 60%

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 3min
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-foundation | 1 | 7min | 7min |
| 02-chat-service-layer | 1 | 2min | 2min |
| 03-chat-ui-components | 1 | 3min | 3min |
| 04-real-time-message-delivery | 1 | 2min | 2min |
| 05-participant-permissions | 1 | 3min | 3min |
| 06-read-tracking | 1 | 3min | 3min |

**Recent Trend:**
- Last 5 plans: 02-01 (2min), 03-01 (3min), 04-01 (2min), 05-01 (3min), 06-01 (3min)
- Trend: Stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Side panel (Sheet) for chat UI — keeps context visible while chatting
- Supabase Realtime for message delivery — already used in other modules
- Text-only messages — keeps v1 simple, no file attachment complexity
- Email only on first assignment — avoids notification fatigue
- Flat chat (no threads) — sufficient for small team conversations
- New balance_chat_messages table (not modifying existing chat_messages) — different relationship model, separate systems
- message_type column added in Phase 1 — avoids Phase 8 schema migration
- Migration applied via Management API — local/remote history mismatch workaround
- Used get_users_for_tenant RPC for batch sender enrichment (not per-user get_user_with_auth) — avoids N+1 queries
- Service placed in annual-balance module (not generic chat module) — balance-scoped chat
- Types derived from Database['public']['Tables']['balance_chat_messages'] — auto-synced with schema
- Chat icon in existing quick-action column (not new column) — avoids table width expansion
- useState for chat state (not Zustand store) — local single-instance UI, store can be added in Phase 4
- Optimistic send with revert — perceived performance for message sending
- Single-column server-side Realtime filter (tenant_id) with client-side balance_id filter — Supabase limitation
- useRef for userMap (not useState) — lookup data not rendered state, avoids re-renders
- Dual dedup strategy for optimistic + Realtime race — handles all timing edge cases
- No service-layer checkChatAccess method — RLS is the security boundary, UI helper is sufficient for UX gating
- canAccessBalanceChat is a pure function (role + userId + auditor_id comparison) — no async/DB calls needed
- Separate balance_chat_read_tracking table (not JSONB on annual_balance_sheets) — clean separation of chat concerns from balance domain
- Trigger only updates existing tracking rows (no pre-population) — users self-register by opening chat
- markAsRead called after messages load (fire-and-forget, no await) — minimizes race condition window without blocking UI
- Denormalized unread_count with trigger increment + upsert reset — O(1) badge lookup, no COUNT queries

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 (Database Foundation):** RESOLVED
- Unread counter stored in separate `balance_chat_read_tracking` table (not annual_balance_sheets columns)
- Database trigger chosen for unread increment (SECURITY DEFINER, atomic, handles concurrent sends)

**Phase 4 (Real-time Delivery):** RESOLVED
- Dedup handled via ID-based check in state (prev.some), no window/Set needed
- Channel pattern established: `balance-chat:${tenantId}:${balanceId}`

**Phase 6 (Read Tracking):** RESOLVED
- Partial index `idx_bcrt_user_unread` on `(tenant_id, user_id) WHERE unread_count > 0` handles badge queries efficiently
- At current scale (35 users, 1335 balances), trigger UPDATE hits at most 34 rows per message send

**Phase 9 (Notifications):**
- Email template design for Hebrew RTL context needed
- Need to determine inactivity threshold for email notifications (5 minutes suggested by research)

## Session Continuity

Last session: 2026-02-10 — Phase 6 Plan 1 execution
Stopped at: Completed 06-01-PLAN.md (read tracking)
Resume file: .planning/phases/06-read-tracking/06-01-SUMMARY.md
