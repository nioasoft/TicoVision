# Requirements: February 2026 Meeting Enhancements

## Background

Based on the meeting with Tiko Franco on 8/2/2026, several enhancements are needed to the TicoVision CRM system. The main focus areas are:

1. **Annual balance module improvements** - Add backup link requirement, auditor confirmation, advance rate calculation, tax coding, and year activity tracking
2. **Unified client profile page** - A single screen aggregating all client data from different modules
3. **Internal chat system** - Real-time messaging between auditors within the system

## Feature 1: Annual Balance Module Enhancements

### 1.1 Form 1214 / Tax Coding (קידוד מס)

**What:** Add a tax coding field (simple number like '0') to both the client record and each annual balance sheet.

**Why:** This is described as "the most important data point for management decisions." It indicates the client's tax classification from the Israeli Tax Authority.

**Acceptance Criteria:**
- [ ] `tax_coding` field on `clients` table (default '0')
- [ ] `tax_coding` snapshot field on `annual_balance_sheets` table
- [ ] Visible in ClientFormDialog near the tax_id field
- [ ] Visible as a column in BalanceTable showing "1214: {value}"
- [ ] Visible in BalanceDetailDialog

### 1.2 Mandatory Backup Link at Materials Received

**What:** When marking "הגיע חומר" (materials received), a Google Drive backup link MUST be provided.

**Why:** Tiko's rule: "If it's not in the drive, it hasn't arrived." Ensures all client materials have a digital backup before proceeding.

**Acceptance Criteria:**
- [ ] `backup_link` field on `annual_balance_sheets` table
- [ ] MarkMaterialsDialog requires a URL input field
- [ ] Cannot submit without providing a valid URL
- [ ] RPC `mark_materials_received()` validates backup_link is present
- [ ] Backup link is clickable in BalanceDetailDialog and BalanceTable

### 1.3 Auditor Confirmation Step

**What:** After an auditor is assigned to a case, they must explicitly confirm receipt of the file before starting work.

**Why:** Creates accountability - the auditor acknowledges they received and reviewed the materials before beginning work.

**Acceptance Criteria:**
- [ ] `auditor_confirmed` boolean + `auditor_confirmed_at` timestamp on `annual_balance_sheets`
- [ ] When status is `assigned_to_auditor` and not confirmed, show "אשר קבלת תיק" action
- [ ] After confirmation, show "התחל עבודה" action
- [ ] Cannot transition from `assigned_to_auditor` to `in_progress` without confirmation
- [ ] Confirmation is logged in status history

### 1.4 Advance Payment Rate Calculation

**What:** Calculate advance payment rate using formula: `rate = tax_amount / turnover`. Alert when calculated rate exceeds current rate.

**Why:** Prevents situations where advance payments are too low relative to actual tax obligations, which could result in penalties.

**Acceptance Criteria:**
- [ ] `tax_amount`, `turnover`, `current_advance_rate` input fields on balance sheet
- [ ] `calculated_advance_rate` auto-computed via DB trigger
- [ ] `advance_rate_alert` flag set when calculated > current
- [ ] Red warning icon in BalanceTable for alerting rows
- [ ] Warning dialog when transitioning to `report_transmitted` with active alert
- [ ] Full calculation displayed in UpdateAdvancesDialog and BalanceDetailDialog

### 1.5 Year Activity Tracking

**What:** Allow marking a client as inactive for a specific year while remaining active in other years.

**Why:** Some clients are active in year 2026 but not in 2025, or vice versa. The system needs to track this per-year granularity.

**Acceptance Criteria:**
- [ ] `is_active` boolean field on `annual_balance_sheets` (default true)
- [ ] Default view filters to active records only
- [ ] "הצג לא פעילים" toggle in BalanceFilters
- [ ] Inactive rows shown with reduced opacity and badge
- [ ] Toggle available in BalanceDetailDialog
- [ ] Dashboard stats only count active records

## Feature 2: Unified Client Profile Page

**What:** A central page at `/clients/:id` that aggregates all client data from different modules into a single view.

**Why:** Tiko demands "everything on one screen." Currently data is scattered across `/clients`, `/files`, `/collections`, `/annual-balance`.

**Acceptance Criteria:**
- [ ] Route `/clients/:id` showing unified client view
- [ ] Header with client identity, tax coding (1214), status, quick links
- [ ] Tabbed interface: Overview, Contacts, Balance, Collection, Files, Activity
- [ ] Overview tab shows summary cards from all modules
- [ ] Parallel data fetching for performance
- [ ] Click row in ClientsTable navigates to profile page
- [ ] Edit button opens existing ClientFormDialog
- [ ] Deep links to full module pages

## Feature 3: Internal Chat System

**What:** Real-time messaging between auditors within the CRM system.

**Why:** Tiko wants internal communication without relying on external tools like WhatsApp or Teams.

**Acceptance Criteria:**
- [ ] Real-time messaging using Supabase Realtime
- [ ] Channel types: general, per-client, per-auditor-pair
- [ ] Slide-out chat panel or dedicated route
- [ ] Unread message badges in navigation
- [ ] Scope limited to auditors (role = 'accountant') and admins
- [ ] Multi-tenant isolated

## Dependencies

- Feature 1 (Annual Balance) has no external dependencies
- Feature 2 (Client Profile) depends on Feature 1 being complete (to show tax coding)
- Feature 3 (Chat) is independent but lower priority

## Related Systems

- Annual Balance Module: `src/modules/annual-balance/`
- Client Management: `src/components/clients/`, `src/services/client.service.ts`
- Collections: `src/modules/collections/`
- File Manager: `src/components/files/`
- Supabase Realtime (for chat feature)
