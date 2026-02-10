# Annual Balance Chat & Notifications

## What This Is

Internal chat system and notification features for the annual-balance module in TicoVision CRM. Enables auditors and accountants to discuss specific balance cases in a side panel chat, with real-time message delivery, unread tracking, system-generated messages, toast notifications, and email alerts on auditor assignment. Built for Israeli accounting firms managing annual balance workflows.

## Core Value

Auditors and accountants can communicate about specific balance cases in real-time without leaving the annual-balance page — reducing miscommunication and speeding up the review process.

## Requirements

### Validated

- ✓ Annual balance CRUD with 8-step workflow (waiting_for_materials → advances_updated) — existing
- ✓ Balance assignment to auditors (accountants) — existing
- ✓ Balance table with 12 columns, filters, pagination — existing
- ✓ Client form dialog with blue header sections — existing
- ✓ Zustand store for balance state management — existing
- ✓ Multi-tenant RLS isolation on all queries — existing
- ✓ Real-time infrastructure via Supabase Realtime — existing
- ✓ Email sending API via SendGrid — existing
- ✓ Internal chat per balance case (side panel) — v1.0
- ✓ Real-time message delivery (Supabase Realtime) — v1.0
- ✓ Chat participants: assigned auditor + accountants + admin — v1.0
- ✓ Unread message badge on balance rows in table — v1.0
- ✓ Toast notification on new chat message (in-app) — v1.0
- ✓ Filter table by "has unread messages" — v1.0
- ✓ Email notification to auditor on first balance assignment — v1.0

### Active

(None — next milestone not yet defined)

### Out of Scope

- File/image attachments in chat — text only, complexity not justified
- Email notification on every chat message — too noisy, in-app sufficient
- Chat between clients and accountants — internal staff only
- Message editing after send — breaks audit trail for accounting compliance
- Chat search — not needed at current volume
- Threaded replies within chat — flat conversation sufficient for small teams
- @mentions — not needed at current user count
- Desktop push notifications — toast + email sufficient

## Context

- Annual balance module complete (7 phases, 15 files, 13 service methods, 14 components)
- Chat system shipped v1.0 (10 phases, 11 plans, 67 files modified, 12K+ LOC)
- Supabase Realtime used across broadcast, collections, and now chat modules
- SendGrid email integrated for letters and now chat assignment notifications
- ~10 users, scaling to 10,000 clients but user count stays small
- Users: 3-4 accountants/auditors + 1 admin working simultaneously
- Hebrew RTL UI throughout

## Constraints

- **Tech stack**: React 19 + Vite + shadcn/ui + Supabase (locked, no new libraries)
- **UI pattern**: Side panel uses shadcn Sheet component
- **Multi-tenant**: All chat data tenant-isolated via RLS
- **Realtime**: Supabase Realtime (no polling)
- **Email**: SendGrid integration (no new email providers)
- **Participants**: Chat visibility scoped to assigned auditor + accountants + admin

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Side panel (Sheet) for chat UI | Keeps context visible — user sees balance row while chatting | ✓ Good — natural UX, no navigation away |
| Supabase Realtime for message delivery | Already used in other modules, no new infra needed | ✓ Good — consistent patterns across app |
| Text-only messages | Keeps v1 simple, file attachments add storage complexity | ✓ Good — sufficient for accounting discussions |
| Email only on first assignment | Avoids notification fatigue, assignment is the key trigger | ✓ Good — appropriate notification level |
| Flat chat (no threads) | Small user count, conversations are short per balance | ✓ Good — keeps UI simple |
| New balance_chat_messages table | Different relationship model from existing chat_messages | ✓ Good — clean separation of concerns |
| Denormalized unread_count with trigger | O(1) badge lookup, avoids COUNT queries | ✓ Good — scales well |
| Cursor-based pagination (before timestamp) | Stable results when new messages arrive during paging | ✓ Good — correct for real-time context |
| Fire-and-forget for system messages | Non-blocking, errors logged but never propagated | ✓ Good — doesn't break parent operations |
| Refs instead of state deps for Realtime | Avoids subscription churn on state changes | ✓ Good — stable channel lifecycle |

---
*Last updated: 2026-02-10 after v1.0 milestone*
