# Annual Balance Chat & Notifications

## What This Is

Internal chat system and notification features for the annual-balance module in TicoVision CRM. Enables auditors and accountants to discuss specific balance cases in a threaded chat panel, with real-time notifications and email alerts on auditor assignment. Built for Israeli accounting firms managing annual balance workflows.

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
- ✓ Real-time infrastructure via Supabase Realtime — existing (broadcast, collections modules)
- ✓ Email sending API via SendGrid — existing

### Active

- [ ] Internal chat per balance case (side panel)
- [ ] Real-time message delivery (Supabase Realtime)
- [ ] Chat participants: assigned auditor + accountants (Chali, Ornit) + admin (Tiko)
- [ ] Unread message badge on balance rows in table
- [ ] Toast notification on new chat message (in-app)
- [ ] Filter table by "has unread messages"
- [ ] Email notification to auditor on first balance assignment

### Out of Scope

- File/image attachments in chat — text only for v1, complexity not justified
- Email notification on every chat message — too noisy, in-app notifications sufficient
- Chat between clients and accountants — internal staff only
- Message editing/deletion — keep it simple
- Chat search — not needed for v1 volume
- Threaded replies within chat — flat conversation is sufficient

## Context

- Annual balance module is complete (7 phases, 15 files, 13 service methods, 14 components)
- Supabase Realtime already used in broadcast and collections modules — patterns exist to follow
- SendGrid email API already integrated for letter system
- ~10 users currently, scaling to 10,000 clients but user count stays small
- Users: 3-4 accountants/auditors + 1 admin working simultaneously
- Hebrew RTL UI mandatory throughout

## Constraints

- **Tech stack**: React 19 + Vite + shadcn/ui + Supabase (locked, no new libraries)
- **UI pattern**: Side panel must use shadcn Sheet component
- **Multi-tenant**: All chat data must be tenant-isolated via RLS
- **Realtime**: Must use Supabase Realtime (already available) — no polling
- **Email**: Must use existing SendGrid integration — no new email providers
- **Participants**: Chat visibility scoped to assigned auditor + accountants + admin only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Side panel (Sheet) for chat UI | Keeps context visible — user sees balance row while chatting | — Pending |
| Supabase Realtime for message delivery | Already used in other modules, no new infra needed | — Pending |
| Text-only messages | Keeps v1 simple, file attachments add storage complexity | — Pending |
| Email only on first assignment | Avoids notification fatigue, assignment is the key trigger | — Pending |
| Flat chat (no threads) | Small user count, conversations are short per balance | — Pending |

---
*Last updated: 2026-02-09 after initialization*
