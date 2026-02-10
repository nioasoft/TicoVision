# Roadmap: Annual Balance Chat & Notifications

## Overview

This roadmap delivers a complete internal chat and notification system for the annual-balance module. Starting with database foundation and tenant isolation, building through core chat UI with real-time message delivery, then adding unread tracking, participant permissions, system-generated messages, and finally toast and email notifications. Each phase delivers a coherent, verifiable capability that builds on the previous phase.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Database Foundation** - Chat messages schema with tenant isolation and RLS policies
- [x] **Phase 2: Chat Service Layer** - Core service extending BaseService for message CRUD operations
- [x] **Phase 3: Chat UI Components** - Side panel Sheet with message display and send functionality
- [x] **Phase 4: Real-time Message Delivery** - Supabase Realtime integration with channel management
- [x] **Phase 5: Participant Permissions** - Role-based access control for chat visibility
- [ ] **Phase 6: Read Tracking** - Mark messages as read with denormalized unread counters
- [ ] **Phase 7: Unread Indicators** - Badge display in balance table with filtering
- [ ] **Phase 8: System Messages** - Auto-generated messages for auditor assignment and status changes
- [ ] **Phase 9: Notifications** - Toast notifications and email on auditor assignment
- [ ] **Phase 10: Polish & Edge Cases** - Loading states, empty states, error handling

## Phase Details

### Phase 1: Database Foundation
**Goal**: Database tables, RLS policies, and indexes are in place with proper tenant isolation for chat messages
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Chat messages table exists with tenant_id, balance_id, user_id, content, created_at columns
  2. RLS policies prevent users from reading or writing messages outside their tenant
  3. Messages support soft delete (is_deleted flag) rather than hard deletion for audit trail
  4. Database queries on (tenant_id, balance_id, created_at) execute in under 100ms for 1000+ messages
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Create balance_chat_messages table with RLS policies, indexes, Realtime publication, and regenerate TypeScript types

### Phase 2: Chat Service Layer
**Goal**: ChatService class provides CRUD operations for messages with automatic tenant isolation
**Depends on**: Phase 1
**Requirements**: (Supporting CHAT requirements)
**Success Criteria** (what must be TRUE):
  1. ChatService extends BaseService and enforces tenant_id filtering on all queries
  2. Service methods can fetch message history for a specific balance
  3. Service methods can create new messages with sender metadata
  4. Service handles database errors gracefully without exposing internal details
**Plans:** 1 plan

Plans:
- [x] 02-01-PLAN.md — Create BalanceChatService with types, four CRUD methods, sender enrichment, and singleton export

### Phase 3: Chat UI Components
**Goal**: Users can open a side panel from a balance row to view and send messages
**Depends on**: Phase 2
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-05, CHAT-06
**Success Criteria** (what must be TRUE):
  1. User can click a chat icon on any balance row to open a side panel (Sheet) for that specific balance
  2. Messages display in a scrollable list showing sender name, timestamp, and content (newest at bottom)
  3. User can type and send a text message that appears immediately in the list via optimistic update
  4. Chat panel shows a loading spinner while fetching message history from the database
  5. Chat panel shows an empty state with Hebrew message when no messages exist yet for a balance
**Plans:** 1 plan

Plans:
- [x] 03-01-PLAN.md — Build 3 chat components (Sheet, Messages, Input) and wire into BalanceTable + AnnualBalancePage

### Phase 4: Real-time Message Delivery
**Goal**: Messages are delivered instantly to all participants without requiring page refresh
**Depends on**: Phase 3
**Requirements**: CHAT-04, CHAT-10
**Success Criteria** (what must be TRUE):
  1. When user A sends a message, user B sees it appear in their open chat panel within 2 seconds without refreshing
  2. Real-time subscription is created when chat panel opens and cleaned up when panel closes
  3. Messages arrive in chronological order even when multiple users send simultaneously
  4. Duplicate messages do not appear when reconnecting after network interruption
**Plans:** 1 plan

Plans:
- [ ] 04-01-PLAN.md — Add subscribeToBalanceChat service method and Realtime subscription lifecycle in BalanceChatSheet

### Phase 5: Participant Permissions
**Goal**: Chat visibility is restricted to assigned auditor, accountants, and admin for each balance
**Depends on**: Phase 4
**Requirements**: CHAT-07
**Success Criteria** (what must be TRUE):
  1. Only the assigned auditor can view and send messages for their assigned balances
  2. Accountants (Chali, Ornit roles) can view and send messages for all balances in their tenant
  3. Admin (Tiko role) can view and send messages for all balances in their tenant
  4. Users attempting to access chats they don't have permission for see an appropriate error message
**Plans:** 1 plan

Plans:
- [ ] 05-01-PLAN.md — Role-aware RLS migration + canAccessBalanceChat helper + UI permission gating

### Phase 6: Read Tracking
**Goal**: Messages are marked as read when user opens the chat, with denormalized counters for performance
**Depends on**: Phase 5
**Requirements**: CHAT-09, INFRA-03
**Success Criteria** (what must be TRUE):
  1. When user opens a chat panel, all messages in that balance are automatically marked as read for that user
  2. Unread count for each user per balance is stored in a denormalized column (not calculated via COUNT queries)
  3. Unread counter increments via database trigger when new message is inserted
  4. Unread counter resets to zero when user opens chat panel
**Plans:** 1 plan

Plans:
- [ ] 06-01-PLAN.md — Create read tracking table with trigger, RLS, service methods (markAsRead + getUnreadCounts), and UI integration

### Phase 7: Unread Indicators
**Goal**: Users can see which balances have unread messages and filter the table to show only those with unreads
**Depends on**: Phase 6
**Requirements**: UNRD-01, UNRD-02, UNRD-03
**Success Criteria** (what must be TRUE):
  1. Each balance row in the table displays an unread message badge with count when user has unread messages for that balance
  2. User can click a filter toggle to show only balances with unread messages
  3. Unread badge count updates in real-time when new messages arrive (without page refresh)
  4. Badge displays "99+" when unread count exceeds 99 to maintain visual consistency
**Plans**: TBD

Plans:
- [ ] 07-01: TBD during planning

### Phase 8: System Messages
**Goal**: Key events automatically generate system messages in the chat timeline
**Depends on**: Phase 7
**Requirements**: CHAT-08
**Success Criteria** (what must be TRUE):
  1. When a balance is assigned to an auditor, a system message appears in chat (e.g., "מאזן שויך למבקר Sarah")
  2. When balance status changes, a system message records the change with user and timestamp
  3. System messages are visually distinct from user messages (different background or icon)
  4. System messages cannot be deleted or edited by users
**Plans**: TBD

Plans:
- [ ] 08-01: TBD during planning

### Phase 9: Notifications
**Goal**: Users receive toast notifications for new messages and email notification on first auditor assignment
**Depends on**: Phase 8
**Requirements**: NOTF-01, NOTF-02
**Success Criteria** (what must be TRUE):
  1. User receives a toast notification (using Sonner) when a new chat message arrives for any balance they have access to
  2. Toast shows sender name, balance identifier, and message preview
  3. When a balance is assigned to an auditor for the first time, that auditor receives an email via SendGrid
  4. Email contains balance details (client name, tax ID) and a link to open the balance page with chat
**Plans**: TBD

Plans:
- [ ] 09-01: TBD during planning

### Phase 10: Polish & Edge Cases
**Goal**: All edge cases, error states, and loading scenarios are handled gracefully with Hebrew RTL UI
**Depends on**: Phase 9
**Requirements**: (Validation and polish across all CHAT requirements)
**Success Criteria** (what must be TRUE):
  1. Chat panel handles network failures gracefully with retry mechanism and user-friendly Hebrew error messages
  2. Message send errors trigger toast notifications and allow user to retry
  3. Long messages wrap correctly in RTL layout without breaking UI
  4. Chat performance remains smooth with 200+ messages in a single balance (scroll virtualization if needed)
  5. All Hebrew text is right-aligned and timestamps are positioned correctly in RTL context
**Plans**: TBD

Plans:
- [ ] 10-01: TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Foundation | 1/1 | ✓ Complete | 2026-02-09 |
| 2. Chat Service Layer | 1/1 | ✓ Complete | 2026-02-10 |
| 3. Chat UI Components | 1/1 | ✓ Complete | 2026-02-10 |
| 4. Real-time Message Delivery | 1/1 | ✓ Complete | 2026-02-10 |
| 5. Participant Permissions | 1/1 | ✓ Complete | 2026-02-10 |
| 6. Read Tracking | 0/TBD | Not started | - |
| 7. Unread Indicators | 0/TBD | Not started | - |
| 8. System Messages | 0/TBD | Not started | - |
| 9. Notifications | 0/TBD | Not started | - |
| 10. Polish & Edge Cases | 0/TBD | Not started | - |
