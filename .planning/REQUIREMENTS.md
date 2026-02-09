# Requirements: Annual Balance Chat & Notifications

**Defined:** 2026-02-09
**Core Value:** Auditors and accountants can communicate about specific balance cases in real-time without leaving the annual-balance page

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Database & Infrastructure

- [ ] **INFRA-01**: Chat messages table with tenant isolation (tenant_id, balance_id, user_id, content, created_at)
- [ ] **INFRA-02**: RLS policies enforce tenant isolation on chat messages — users can only read/write messages for their tenant
- [ ] **INFRA-03**: Unread tracking with denormalized counter per user per balance (avoids COUNT queries)
- [ ] **INFRA-04**: Soft delete for messages (is_deleted flag, not hard DELETE) — preserves audit trail
- [ ] **INFRA-05**: Database indexes on (tenant_id, balance_id, created_at) for efficient message retrieval

### Chat Core

- [ ] **CHAT-01**: User can open a side panel (Sheet) from a balance row to view and send chat messages for that specific balance
- [ ] **CHAT-02**: Messages display sender name, timestamp, and content in a scrollable list (newest at bottom)
- [ ] **CHAT-03**: User can send a text message that appears immediately via optimistic update before server confirmation
- [ ] **CHAT-04**: Messages are delivered in real-time to all participants via Supabase Realtime (no page refresh needed)
- [ ] **CHAT-05**: Chat panel shows loading spinner while fetching message history
- [ ] **CHAT-06**: Chat panel shows empty state when no messages exist yet for a balance
- [ ] **CHAT-07**: Only the assigned auditor, accountants (Chali, Ornit), and admin (Tiko) can view and send messages for a balance
- [ ] **CHAT-08**: System messages are automatically created for key events (e.g., "מאזן שויך למבקר X", status changes)
- [ ] **CHAT-09**: Messages marked as read automatically when user opens the chat panel for that balance
- [ ] **CHAT-10**: Realtime channel cleanup on component unmount — no memory leaks from orphaned subscriptions

### Unread Tracking

- [ ] **UNRD-01**: Each balance row in the table shows an unread message badge with count when there are unread messages for the current user
- [ ] **UNRD-02**: User can filter the balance table to show only balances with unread messages
- [ ] **UNRD-03**: Unread count updates in real-time when new messages arrive (without page refresh)

### Notifications

- [ ] **NOTF-01**: User receives a toast notification (Sonner) when a new chat message arrives for any balance they have access to
- [ ] **NOTF-02**: When a balance is first assigned to an auditor, that auditor receives an email notification via SendGrid with balance details and a link to the balance page

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Chat Enhancements

- **CHAT-V2-01**: User can @mention specific participants in a message to notify them directly
- **CHAT-V2-02**: User can mark all messages across all balances as read in one action
- **CHAT-V2-03**: User can search through chat message history across balances
- **CHAT-V2-04**: Typing indicator shows when another user is composing a message

### Notification Enhancements

- **NOTF-V2-01**: Email digest for accumulated unread messages (batch rather than per-message)
- **NOTF-V2-02**: User can configure notification preferences (mute specific balances, quiet hours)

## Out of Scope

| Feature | Reason |
|---------|--------|
| File/image attachments in chat | Storage complexity, duplicate of existing file manager |
| Message editing after send | Breaks audit trail for accounting compliance |
| Message hard deletion | Audit trail must be preserved — soft delete only |
| Threaded replies | Flat conversation sufficient for 3-5 users per case |
| Chat between clients and staff | Internal staff communication only |
| Desktop push notifications | Toast + email sufficient for small team |
| Emoji reactions | Unnecessary complexity for professional accounting tool |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase ? | Pending |
| INFRA-02 | Phase ? | Pending |
| INFRA-03 | Phase ? | Pending |
| INFRA-04 | Phase ? | Pending |
| INFRA-05 | Phase ? | Pending |
| CHAT-01 | Phase ? | Pending |
| CHAT-02 | Phase ? | Pending |
| CHAT-03 | Phase ? | Pending |
| CHAT-04 | Phase ? | Pending |
| CHAT-05 | Phase ? | Pending |
| CHAT-06 | Phase ? | Pending |
| CHAT-07 | Phase ? | Pending |
| CHAT-08 | Phase ? | Pending |
| CHAT-09 | Phase ? | Pending |
| CHAT-10 | Phase ? | Pending |
| UNRD-01 | Phase ? | Pending |
| UNRD-02 | Phase ? | Pending |
| UNRD-03 | Phase ? | Pending |
| NOTF-01 | Phase ? | Pending |
| NOTF-02 | Phase ? | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 ⚠️

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
