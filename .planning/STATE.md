# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Auditors and accountants can communicate about specific balance cases in real-time without leaving the annual-balance page
**Current focus:** Phase 2 complete — ready for Phase 3 (Chat UI)

## Current Position

Phase: 2 of 10 (Chat Service Layer)
Plan: 1 of 1 complete
Status: Phase 2 verified and complete
Last activity: 2026-02-10 — Completed 02-01-PLAN.md (BalanceChatService with 4 CRUD methods)

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: 4.5min
- Total execution time: 0.15 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-database-foundation | 1 | 7min | 7min |
| 02-chat-service-layer | 1 | 2min | 2min |

**Recent Trend:**
- Last 5 plans: 01-01 (7min), 02-01 (2min)
- Trend: Accelerating

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

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 (Database Foundation):**
- Need to decide on unread counter storage location (annual_balance_sheets table vs separate chat_participants table)
- Database trigger vs Supabase webhook for Edge Function invocation needs evaluation

**Phase 4 (Real-time Delivery):**
- Message deduplication window size needs validation (Set with 10,000 IDs) for long-running browser tabs
- Need to establish per-entity channel naming pattern: `chat:${tenantId}:${balanceId}`

**Phase 6 (Read Tracking):**
- Unread count query performance needs load testing with 500+ messages per balance

**Phase 9 (Notifications):**
- Email template design for Hebrew RTL context needed
- Need to determine inactivity threshold for email notifications (5 minutes suggested by research)

## Session Continuity

Last session: 2026-02-10 — Phase 2 Plan 1 execution
Stopped at: Completed 02-01-PLAN.md (chat service layer)
Resume file: .planning/phases/02-chat-service-layer/02-01-SUMMARY.md
