# Milestones

## v1.0 Annual Balance Chat & Notifications (Shipped: 2026-02-10)

**Phases completed:** 10 phases, 11 plans, 22 tasks
**Timeline:** 2 days (2026-02-09 → 2026-02-10)
**Stats:** 67 files changed, 12,218 lines added

**Key accomplishments:**
- Chat messages table with tenant-isolated RLS, soft delete, and Realtime publication
- BalanceChatService with CRUD operations, sender enrichment, and cursor-based pagination
- Side panel chat UI (Sheet) with real-time message delivery via Supabase Realtime
- Role-based chat permissions — admin/accountant see all, auditors only their assignments
- Unread tracking with denormalized counters, badges (99+ cap), and filter toggle
- System messages for auditor assignment and status changes
- Toast notifications for new messages + email notification on first auditor assignment
- Polish: error handling with retry, offline detection, multiline input, RTL timestamp alignment

---

