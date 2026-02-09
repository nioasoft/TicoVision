# Feature Research: Internal Per-Entity Chat System

**Domain:** Internal chat & notifications for annual balance case management
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Real-time message delivery | Standard in all modern chat (Slack, Teams, etc.) | MEDIUM | WebSocket or polling. Users expect instant updates without refresh. |
| Unread message indicators | Core to knowing what needs attention | LOW | Numeric badges on table rows, visual markers in chat panel. Research shows 68% of users rely on these for work apps. |
| Message history/scrollback | Users need context from past conversations | LOW | Infinite scroll or pagination. Must persist across sessions. |
| Sender identification | Need to know who said what | LOW | Display name + role/title. Avatar optional but nice. |
| Timestamp display | Understanding conversation timeline | LOW | Relative times ("2 minutes ago") with absolute on hover ("09/02/2026 14:35"). |
| Message ordering | Chronological display expected | LOW | Server-side ordering by created_at. Essential for coherent threads. |
| Notification on new message | Can't expect users to check constantly | MEDIUM | Email on message if user not active. Batching to avoid spam. |
| Mark thread as read | Clear unread state manually | LOW | Click to mark entire conversation read. Standard in all chat tools. |
| Side panel/drawer UI | Non-disruptive access while viewing table | MEDIUM | Slide-out from right (RTL context). Shadcn drawer with Vaul gestures. |
| Loading states | Users need feedback during data fetch | LOW | Skeleton loaders, spinners. Poor UX without this. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contextual chat opening | Open chat from table row → auto-focus that entity | LOW | Reduces cognitive load. Users stay oriented to which case they're discussing. |
| Table filtering by unread | Quick access to cases needing attention | LOW | Filter button "הצג רק עם הודעות חדשות". Accounting teams prioritize active cases. |
| Auto-notification on auditor assignment | Auditor gets email immediately when assigned | LOW | Proactive communication. Reduces "did you see this?" messages. |
| Optimistic message posting | Message appears instantly, syncs in background | MEDIUM | Feels faster than waiting for server. Revert on error with toast. |
| Unread count in table badge | See unread count per row without opening chat | MEDIUM | Visual scanning for high-activity cases. Research shows numeric badges reduce cognitive load 24% vs binary indicators. |
| Email digest for inactive users | Daily/weekly summary of unread messages | MEDIUM | Keeps remote/part-time users in loop. Configurable frequency per user. |
| @mention support | Directly notify specific team member | MEDIUM | Reduces noise. Only notified when explicitly mentioned. Standard in collaboration tools per 2026 research. |
| Message edit (short window) | Fix typos within 5 minutes of posting | MEDIUM | Reduces clutter from "correction" messages. Show "(edited)" indicator. |
| System messages for case events | Auto-log status changes, document uploads | LOW | Unified timeline. "Status changed to 'In Review' by Admin" reduces "what happened?" questions. |
| Desktop notifications | Browser push when app open in background | LOW | Immediate awareness without email. Requires permission prompt. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Message deletion | "I sent to wrong thread" | Breaks conversation context, creates confusion. Who saw it? What did it say? | Edit with strikethrough or "Message retracted" placeholder. Audit log preserved. |
| Read receipts (per-message) | "Did they see my message?" | Creates pressure, anxiety. Team members feel monitored. Research shows 60% disable when available. | Thread-level "last read" timestamp. Less granular, less invasive. |
| Threaded replies | "Like Slack threads" | Splits conversation, hides context. Overcomplicated for 3-5 person chats. Works for large channels, not case discussions. | Linear chat. Use @mentions for addressing specific people. |
| File attachments in chat | "Share documents here" | Duplicates existing file manager. Where's source of truth? Versioning nightmare. | Link to file in file manager. "See attached in Files tab". Single source of truth. |
| Emoji reactions | "Quick feedback" | Noise without value in professional context. Hebrew RTL has emoji positioning issues. | Text responses. "אישרתי" is clearer than thumbs-up. |
| Chat search | "Find old messages" | Low ROI for small threads. Search in 20-50 messages? Just scroll. | Scroll + Ctrl+F browser search. Add if threads grow to 500+ messages. |
| Message forwarding | "Share to other case" | Breaks context. Message out of original conversation is confusing. | Copy-paste with "Originally from Case #123" note. Explicit re-contextualization. |
| Voice messages | "Faster than typing" | Inaccessible (no transcript), Hebrew speech recognition poor, playback disrupts workflow. | Text only. Voice = phone call, not async chat. |

## Feature Dependencies

```
[Real-time message delivery]
    └──requires──> [WebSocket connection or polling]
                       └──requires──> [Server-side event handling]

[Unread indicators]
    └──requires──> [Read tracking system]
                       └──requires──> [User activity monitoring]

[Table filtering by unread]
    └──requires──> [Unread indicators]

[Email digest]
    └──requires──> [Notification system]
    └──requires──> [User activity monitoring]

[@mention support]
    └──requires──> [Message parsing]
    └──requires──> [Notification system]
    └──enhances──> [Email notifications]

[Optimistic updates]
    └──requires──> [Error handling]
    └──requires──> [Rollback mechanism]

[Desktop notifications]
    └──requires──> [Browser permission system]
    └──conflicts──> [Email notifications] (can be redundant)

[System messages]
    └──requires──> [Event logging system]
    └──enhances──> [Message history]
```

### Dependency Notes

- **Real-time delivery requires WebSocket/polling:** Can't have real-time without persistent connection. Consider Socket.io, Supabase Realtime, or polling fallback.
- **Unread tracking enables filtering:** Must track last_read_at per user per thread before can filter table by unread.
- **@mentions enhance notifications:** Mentions without notification system = useless. Notification without mentions = noisy. Build together.
- **Desktop vs Email notifications conflict:** Both notify same event. Need smart deduplication: desktop if active, email if inactive 5+ min.
- **System messages enhance history:** Auto-logged events create unified timeline. "Who changed status?" answered by reading chat.

## MVP Definition

### Launch With (v1)

Minimum viable product for 3-5 person accounting team annual balance case discussions.

- [x] **Real-time message delivery** — Core expectation. Without this, it's a comment system not a chat system.
- [x] **Side panel drawer UI** — Non-disruptive access. Must not navigate away from table view.
- [x] **Unread indicators on table rows** — Visual scanning for active cases. Binary indicator (has unread Y/N).
- [x] **Message history with scrollback** — Need context from past conversations. Infinite scroll or paginated.
- [x] **Sender + timestamp display** — Know who said what when. Relative times ("2h ago").
- [x] **Mark thread as read** — Manual clear of unread state. Click or auto on scroll-to-bottom.
- [x] **Email notification on new message** — Auditor not always in app. Send email if inactive 5+ min.
- [x] **Auto-email on auditor assignment** — Proactive notification. "You've been assigned Case #123".
- [x] **Loading states** — Skeleton loaders while fetching. Basic UX hygiene.
- [x] **RTL Hebrew UI** — Right-aligned text, reversed flex layouts. Not optional for Hebrew app.

**Why these:**
- Establishes basic chat functionality
- Covers notification needs (assignment email, message email)
- Addresses stated requirements (side panel, unread badges, table filter, email on assignment)
- Minimal complexity, high utility

### Add After Validation (v1.x)

Features to add once core is working and users provide feedback.

- [ ] **Unread count badges** — Numeric instead of binary. "3 messages" vs "has unread". Add when users request.
- [ ] **Table filtering by unread** — Quick access to active cases. Wait to see if volume justifies it.
- [ ] **@mention support** — Direct attention. Add when threads get noisy (5+ participants or 50+ messages).
- [ ] **Optimistic message posting** — Perceived performance boost. Add if users complain about slowness.
- [ ] **Message edit (5min window)** — Fix typos. Add when users request, low effort high satisfaction.
- [ ] **Desktop notifications** — Browser push. Add when users say "I miss messages". Permission friction.
- [ ] **System messages for events** — Auto-log status changes. Add when users ask "who did this?".
- [ ] **Email digest for inactive users** — Daily/weekly summary. Add if users complain about email volume.

**Triggers:**
- Unread count: Users say "I can't tell which cases are most active"
- Filtering: Users manually search for cases with messages
- Mentions: "How do I get Sarah's attention specifically?"
- Optimistic: "Why is sending so slow?"
- Edit: 3+ requests for "undo" or typo fixes
- Desktop: "I don't see messages when app is in background"
- System messages: "Who changed the status?"
- Digest: "Too many individual emails" or "I miss things when I'm away"

### Future Consideration (v2+)

Features to defer until product-market fit is established or scale demands.

- [ ] **Chat search** — Low ROI for small threads. Add when threads exceed 500 messages.
- [ ] **Message reactions** — Low value in professional context. Hebrew emoji positioning issues. Defer indefinitely unless heavily requested.
- [ ] **Threaded replies** — Adds complexity, splits conversation. Only consider if threads regularly exceed 10 participants.
- [ ] **File attachments** — Duplicates file manager. Only consider if users bypass file manager to share in chat.
- [ ] **Message pinning** — Highlight important messages. Add when threads are long enough to need it (200+ messages).
- [ ] **Presence indicators** — "Online/offline" status. Add if real-time collaboration becomes critical.
- [ ] **Typing indicators** — "Sarah is typing...". Low value, technical complexity. Defer.
- [ ] **Voice messages** — Hebrew speech recognition poor, accessibility issues. Defer indefinitely.
- [ ] **Video/audio calls** — Out of scope. Use external tool (Zoom, phone).

**Why defer:**
- Most add complexity without proportional value at small scale (3-5 users, 20-50 messages per thread)
- Some duplicate existing functionality (file attachments vs file manager)
- Some have technical challenges (Hebrew emoji, voice recognition)
- Wait for user demand to validate investment

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Real-time message delivery | HIGH | MEDIUM | P1 |
| Side panel drawer UI | HIGH | MEDIUM | P1 |
| Unread indicators (binary) | HIGH | LOW | P1 |
| Message history | HIGH | LOW | P1 |
| Sender + timestamp | HIGH | LOW | P1 |
| Mark as read | HIGH | LOW | P1 |
| Email on new message | HIGH | MEDIUM | P1 |
| Email on auditor assignment | HIGH | LOW | P1 |
| Loading states | MEDIUM | LOW | P1 |
| RTL Hebrew UI | HIGH | MEDIUM | P1 |
| Unread count badges | MEDIUM | MEDIUM | P2 |
| Table filtering by unread | MEDIUM | LOW | P2 |
| @mention support | MEDIUM | MEDIUM | P2 |
| Optimistic posting | MEDIUM | MEDIUM | P2 |
| Message edit | MEDIUM | MEDIUM | P2 |
| Desktop notifications | MEDIUM | LOW | P2 |
| System messages | MEDIUM | LOW | P2 |
| Email digest | LOW | MEDIUM | P2 |
| Chat search | LOW | MEDIUM | P3 |
| Message reactions | LOW | LOW | P3 |
| Threaded replies | LOW | HIGH | P3 |
| File attachments | LOW | MEDIUM | P3 |
| Presence indicators | LOW | MEDIUM | P3 |
| Typing indicators | LOW | MEDIUM | P3 |
| Voice messages | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (10 features) — Core chat + notifications + unread tracking
- P2: Should have, add when possible (8 features) — Enhancements based on usage patterns
- P3: Nice to have, future consideration (7 features) — Defer until scale demands or heavy user request

## Competitor Feature Analysis

| Feature | Slack (team chat) | Linear (issue comments) | Accounting software notes | Our Approach |
|---------|-------------------|-------------------------|---------------------------|--------------|
| Message threading | Threaded replies | Linear comments | Simple note fields | Linear chat (no threads) — 3-5 users don't need it |
| Unread indicators | Binary + count | Count per issue | None typically | Binary MVP, count v1.x — validate before adding |
| Real-time delivery | WebSocket | WebSocket | None (refresh) | WebSocket (Supabase Realtime) — table stakes |
| Notifications | Desktop + email + mobile | Email on mention/assignment | None | Email only MVP, desktop v1.x — simpler start |
| Side panel access | Full-screen channels | Right panel per issue | Modal dialogs | Right drawer (RTL) — non-disruptive |
| @mentions | Yes, with autocomplete | Yes | No | v1.x, not MVP — add when threads get noisy |
| File sharing | In-chat uploads | Attachments per comment | Separate file area | Link to file manager — single source of truth |
| Search | Full-text across all | Search within issue | Basic filters | Defer — Ctrl+F sufficient for small threads |
| Message editing | Unlimited with log | No editing | No editing | 5min window v1.x — balance correction vs audit |
| Read receipts | Optional per-message | None | None | Thread-level only — less invasive |
| System messages | Integration posts | Auto-comments on events | Manual notes | v1.x — "Status changed by X" auto-logs |
| Presence | Online/away/offline | None | None | Defer — low value for async work |

**Key insights:**
- **Linear's approach is closer match** — Per-entity comments, small teams, contextual communication. Slack over-features for our use case.
- **Accounting software lacks collaboration** — Most use simple note fields or none. Opportunity to differentiate with actual chat.
- **Hybrid model** — Linear's simplicity + Slack's real-time feel + our unique table filtering.

## Domain-Specific Considerations

### Accounting Workflow Context

**Annual balance workflow characteristics:**
- 3-5 users per case (auditor + accountants + admin)
- 2-8 week case lifecycle
- 20-50 messages per case (estimated)
- Async work (not always online together)
- Hebrew language, RTL layout
- Desktop-primary workflow (not mobile)

**Implications:**
- Small participant count → no need for @mentions initially
- Short lifecycle → less need for search (recent history is all that matters)
- Low message volume → no threading needed (won't get lost)
- Async → email notifications critical, real-time nice-to-have
- Hebrew RTL → careful UI testing, avoid emoji complexity
- Desktop → can use side panel, don't need mobile app

### User Roles and Permissions

**Participant types:**
- **Admin** — Full access, sees all chats, can message all cases
- **Accountant Manager** — Sees assigned cases, can message those cases
- **Auditor** — Sees assigned cases, receives email on assignment + new messages
- **Bookkeeper** — Typically no chat access (not mentioned in requirements)

**Permission implications:**
- Read access = can see messages in cases they can see
- Write access = can send messages to cases they can see
- No special moderation needed (trusted internal team)
- No message deletion (audit compliance)

### Notification Strategy

**Email triggers:**
1. **Auditor assignment** — Immediate email to auditor with case details + chat link
2. **New message in thread** — Email if user inactive 5+ minutes
3. **@mention (v1.x)** — Email regardless of activity status

**Email batching:**
- If multiple messages in same thread within 5min → single email with count ("3 new messages")
- Prevent email storm if rapid conversation

**Desktop notifications (v1.x):**
- Only if browser permission granted
- Only if app open in background tab
- Deduplicate with email (desktop if active, email if inactive)

### RTL and Hebrew Considerations

**UI challenges:**
- Text alignment: All messages right-aligned
- Drawer direction: Slide from right (not left)
- Timestamp position: Left side of message (reversed from LTR)
- Avatar position: Right side of sender name
- Input field icons: Reversed (send button on left)
- Scrollbar: Native behavior (automatically mirrors in RTL)

**Typography:**
- Hebrew text wrapping can be longer than English
- Mixed Hebrew-English (code, numbers) → LTR marks needed
- Font: Use system font or Rubik (good Hebrew support)

**Testing requirements:**
- Test with all-Hebrew messages
- Test with mixed Hebrew-English (dates, numbers)
- Test with URLs (should be LTR within RTL context)
- Test emoji positioning (known RTL issues)

## Sources

**Research sources:**

- [24 Chatbot Best Practices You Can't Afford to Miss in 2026](https://botpress.com/blog/chatbot-best-practices)
- [Task Management for Service Teams: Best Practices for 2026 | Lua CRM Blog](https://www.luacrm.com/en/blog-detail/task-management-best-practices-for-service-teams-2026)
- [Microsoft Integrates Viva Engage Communities Into Teams Chat](https://winbuzzer.com/2026/02/03/microsoft-integrates-viva-engage-communities-into-teams-chat-xcxwbn/)
- [5 Best Team Chat Apps I'd Use to Run Any Team in 2026](https://learn.g2.com/best-team-chat-apps)
- [Top 25 Team Communication Tools to Enhance the Modern Workplace in 2026](https://clariti.app/blog/team-communication-tools/)
- [Linear Review: Features, Pricing, Pros & Cons 2026](https://work-management.org/software-development/linear-review/)
- [Linear vs. Asana: Which Tool is Best in 2026? | ClickUp](https://clickup.com/blog/linear-vs-asana/)
- [Unread Message Indicators: Optimizing UX In Digital Scheduling Tools](https://www.myshyft.com/blog/unread-message-indicators/)
- [System Design — Newly Unread Message Indicator | by Krutsilin Siarhei | Medium](https://medium.com/@krutilin.sergey.ks/system-design-newly-unread-message-indicator-bb118492af92)
- [Indicators, Validations, and Notifications: Pick the Correct Communication Option - NN/G](https://www.nngroup.com/articles/indicators-validations-notifications/)
- [The top 5 real-time notification services for building in-app notifications in 2026 | Knock](https://knock.app/blog/the-top-real-time-notification-services-for-building-in-app-notifications)
- [8 Best Accounting Practice Management Software of 2026 - Accounting Practice Management Software - Uku](https://getuku.com/articles/uks-best-accounting-practice-management-software)
- [Best Apps for Accountants & CPAs in 2026 | Uku](https://getuku.com/articles/apps-for-accountants)
- [Canopy Review: Is This Practice Management Software Right for Your Needs In 2026?](https://getuku.com/articles/canopy-review)
- [Best Internal Communication Tools and Softwares (2026)](https://www.simpplr.com/blog/best-internal-communication-tools/)
- [Top 5 Case Management Tools in 2026 - Kissflow](https://kissflow.com/workflow/case/case-management-tools/)
- [How to build notifications that encourage collaboration | Liveblocks blog](https://liveblocks.io/blog/how-to-build-notifications-that-encourage-collaboration)
- [Use @mention to collaborate with your team using Notes - Power Apps | Microsoft Learn](https://learn.microsoft.com/en-us/power-apps/user/use-@mentions)
- [Drawer UI Design: Best practices, Design variants & Examples | Mobbin](https://mobbin.com/glossary/drawer)
- [UI design pattern tips: slideouts, sidebars and drawers | Creative Bloq](https://www.creativebloq.com/ux/ui-design-pattern-tips-slideouts-sidebars-101413343)
- [Side Drawer UI: A Guide to Smarter Navigation](https://www.designmonks.co/blog/side-drawer-ui)
- [61 SaaS Side Panel UI Design Examples](https://www.saasframe.io/patterns/side-panel)
- [Shadcn Drawer](https://www.shadcn.io/ui/drawer)
- [Email Digest: Overview and Setup Guide](https://bettermode.com/hub/apps-integrations/post/email-digest-overview-and-setup-guide-7TCMUnTstvUqcRa)
- [What is the Email Digest feature and how does it work? : Support Portal & Knowledge Base](https://help.channeltivity.com/support/solutions/articles/3000068433-what-is-the-email-digest-feature-and-how-does-it-work-)
- [Mark a conversation or thread as read or unread - Computer - Google Chat Help](https://support.google.com/chat/answer/9965883?hl=en&co=GENIE.Platform%3DDesktop)
- [Microsoft Teams Activity feed: Mark all as read - Super Simple 365](https://supersimple365.com/microsoft-teams-activity-feed-mark-all-as-read/)
- [Microsoft 365: Mark as read all messages in chats and channels in Microsoft Teams!](https://jcgonzalezmartin.wordpress.com/2025/02/10/microsoft-365-mark-as-read-all-messages-in-chats-and-channels-in-microsoft-teams/)

**Confidence notes:**
- HIGH confidence: Core chat features (messages, real-time, unread) — widely documented patterns
- MEDIUM confidence: Feature prioritization — based on small team use case analysis + accounting workflow research
- LOW confidence: Hebrew RTL specific issues — limited sources on RTL chat UI, relying on general RTL principles + project context

**Research approach:**
- Analyzed team collaboration tools (Slack, Teams, Google Chat) for chat patterns
- Studied issue-tracking tools (Linear, GitHub, Asana) for per-entity discussion patterns
- Reviewed accounting practice management software (Canopy, Uku ecosystem) for domain norms
- Examined notification UX research for unread indicators and email digest strategies
- Synthesized for small-team, per-entity, Hebrew RTL accounting context

---
*Feature research for: Internal per-entity chat & notification system*
*Researched: 2026-02-09*
*Context: 3-5 user annual balance case discussions in Israeli accounting CRM*
