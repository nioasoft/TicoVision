# Requirements: מאזנים שנתיים (Annual Balance Sheets)

## Overview

Sub-system within the TicoVision CRM for managing the annual financial statement preparation process. Each client (company/partnership) becomes a "case" (תיק) that progresses through an 8-step workflow from "materials received" to "advances updated".

The system is year-agnostic (מאזני 25, מאזני 26...) with automatic year opening that loads all relevant active clients.

**Full PRD**: `docs/annual-balance-sheets-prd.md`

## Problem

No centralized tool to track the annual financial statement process. The office doesn't know at any given moment how many cases arrived, how many are in progress, how many were transmitted. Information exists only in people's heads.

## Solution

A workflow tracking module with:
- Automatic year opening for all companies + partnerships
- 8-step status pipeline with audit trail
- Auditor (internal accountant) assignment + meeting scheduling
- Dashboard with KPI cards + table by auditor
- Client card integration (color badge + dedicated tab)
- Integration with existing letter system for debt letters

## Core Requirements

### DR-1: Year Management
- Admin can open a new balance year with one click
- All active clients of type `company` or `partnership` are auto-loaded with status `waiting_for_materials`
- Cannot open the same year twice (warning shown)
- Can manually add a client after year opening

### DR-2: 8-Step Status Workflow
Statuses progress in order:
1. `waiting_for_materials` - ממתין לחומר (Gray)
2. `materials_received` - הגיע חומר (Blue) + date
3. `assigned_to_auditor` - שויך למבקר (Purple) + auditor + meeting
4. `in_progress` - בעבודה (Orange)
5. `work_completed` - ממתין לאישור (Yellow)
6. `office_approved` - משרד אישר (Cyan)
7. `report_transmitted` - דוח שודר (Green)
8. `advances_updated` - מקדמות עודכנו (Emerald)

Every status change records: who, when, optional note.
Admin can revert to a previous status.

### DR-3: Mark Materials Received
- Any user (bookkeeper, accountant, admin) can mark materials received
- Accessible from client card, balance table, or anywhere client-related
- Opens a dialog with date picker (default: today) + confirm
- Records the user who marked it

### DR-4: Auditor Assignment
- Select from system users with role=accountant
- One auditor per case
- Meeting date + time field (simple, no calendar integration)
- Auditor can be changed at any stage (admin only)

### DR-5: Work Progress
- Auditor/admin can mark "start work" and "complete work"
- Start/complete dates are recorded
- "Complete work" means awaiting office approval

### DR-6: Office Approval & Transmission
- Admin/accountant can approve (only when status is `work_completed`)
- Admin/accountant can mark report as transmitted to tax authority
- Both record date and user

### DR-7: Tax Advances Update
- Amount field (ILS) for new advances
- Boolean mark: "advances updated"
- Link to letter from existing letter system (reference, not creation)
- Date recorded

### DR-8: Debt Letter
- Optional boolean: "debt letter sent" yes/no
- If yes: link to letter in existing auto-letters system
- Not every case requires a debt letter

### DR-9: Client Card Integration
- Color badge showing current year's status on client card
- Dedicated "מאזנים" tab in client card with year history
- Quick action "mark materials received" from client card
- Badge click navigates to case details

### DR-10: Dashboard
- KPI cards: count of cases per status (8 cards)
- Main table: all cases with filters (status, auditor, year) + search by client name
- Auditor summary: cases grouped by auditor with status breakdown
- Default view: current year

## Permissions

| Action | bookkeeper | accountant | admin |
|--------|-----------|------------|-------|
| View dashboard & cases | Yes | Yes | Yes |
| Mark materials received | Yes | Yes | Yes |
| Change other statuses | No | Yes | Yes |
| Assign/change auditor | No | Yes | Yes |
| Open new year | No | No | Yes |
| Revert status backward | No | No | Yes |

## Acceptance Criteria

- [ ] Admin can open a balance year and all companies + partnerships are loaded
- [ ] Any user can mark "materials received" with date from client card or balance table
- [ ] Auditor can be assigned from user list, meeting date/time saved
- [ ] Status progresses through all 8 steps with audit trail
- [ ] Dashboard shows KPIs per status and table grouped by auditor
- [ ] Client card shows color badge with current balance status
- [ ] Client card has "מאזנים" tab with year history
- [ ] Tax advances amount and debt letter boolean can be recorded
- [ ] Letters can be linked from existing letter system
- [ ] All data is tenant-isolated (RLS enforced)
- [ ] UI is fully RTL Hebrew

## Dependencies

- Client system (types `company`, `partnership`) - exists
- User system (role `accountant`) - exists
- Letter system (`generated_letters` table) - exists
- Client card component - needs modification (add badge + tab)
- Navigation sidebar - needs new menu item

## Out of Scope (Phase 1)

- Calendar/reminder system
- Document checklist (only general mark)
- Time tracking / profitability
- Creating debt letters from within balance module (only linking)
- Automatic tax authority transmission
- Deadline tracking by entity type
- Export to Excel
