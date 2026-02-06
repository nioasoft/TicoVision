# Implementation Plan: מאזנים שנתיים (Annual Balance Sheets)

## Overview

Build the "Annual Balance Sheets" module - a workflow tracking system for managing the annual financial statement preparation process per client. Follows existing module patterns (collections module as reference). Includes database schema, service, store, dashboard page, workflow dialogs, and client card integration.

---

## Phase 1: Database Schema & Migration

Set up the database tables, indexes, and RLS policies for the annual balance module.

### Tasks

- [ ] Create Supabase migration with `annual_balance_sheets` table, `balance_sheet_status_history` table, indexes, and RLS policies
- [ ] Run `npm run generate-types` to update TypeScript types from Supabase schema

### Technical Details

**Migration name**: `annual_balance_sheets`

**SQL Schema - Main Table**:
```sql
-- ============================================================================
-- Annual Balance Sheets Module (מאזנים שנתיים)
-- ============================================================================

-- Main table: one record per client per year
CREATE TABLE annual_balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  -- Status workflow (8 steps)
  status TEXT NOT NULL DEFAULT 'waiting_for_materials' CHECK (status IN (
    'waiting_for_materials',
    'materials_received',
    'assigned_to_auditor',
    'in_progress',
    'work_completed',
    'office_approved',
    'report_transmitted',
    'advances_updated'
  )),

  -- Step 2: Materials received
  materials_received_at TIMESTAMPTZ,
  materials_received_by UUID REFERENCES auth.users(id),

  -- Step 3: Auditor assignment
  auditor_id UUID REFERENCES auth.users(id),
  meeting_date TIMESTAMPTZ,

  -- Step 4-5: Work progress
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,

  -- Step 6: Office approval
  office_approved_at TIMESTAMPTZ,
  office_approved_by UUID REFERENCES auth.users(id),

  -- Step 7: Report transmission
  report_transmitted_at TIMESTAMPTZ,

  -- Step 8: Tax advances
  new_advances_amount DECIMAL(15,2),
  advances_updated_at TIMESTAMPTZ,
  advances_letter_id UUID REFERENCES generated_letters(id),

  -- Debt letter (optional, not a status step)
  debt_letter_sent BOOLEAN DEFAULT false,
  debt_letter_id UUID REFERENCES generated_letters(id),

  -- General
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, client_id, year)
);

-- Performance indexes
CREATE INDEX idx_abs_tenant_id ON annual_balance_sheets(tenant_id);
CREATE INDEX idx_abs_client_id ON annual_balance_sheets(client_id);
CREATE INDEX idx_abs_status ON annual_balance_sheets(status);
CREATE INDEX idx_abs_year ON annual_balance_sheets(year);
CREATE INDEX idx_abs_auditor_id ON annual_balance_sheets(auditor_id);
CREATE INDEX idx_abs_tenant_year ON annual_balance_sheets(tenant_id, year);

-- Status history / audit trail
CREATE TABLE balance_sheet_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance_sheet_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

CREATE INDEX idx_bssh_balance_sheet_id ON balance_sheet_status_history(balance_sheet_id);
CREATE INDEX idx_bssh_tenant_id ON balance_sheet_status_history(tenant_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_abs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_abs_updated_at
  BEFORE UPDATE ON annual_balance_sheets
  FOR EACH ROW EXECUTE FUNCTION update_abs_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE annual_balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_status_history ENABLE ROW LEVEL SECURITY;

-- annual_balance_sheets: all tenant users can SELECT
CREATE POLICY "abs_select_own_tenant"
  ON annual_balance_sheets FOR SELECT
  USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

-- annual_balance_sheets: admin + accountant can INSERT
CREATE POLICY "abs_insert_admin_accountant"
  ON annual_balance_sheets FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
        AND uta.role IN ('admin', 'accountant')
    )
  );

-- annual_balance_sheets: admin + accountant can UPDATE
CREATE POLICY "abs_update_admin_accountant"
  ON annual_balance_sheets FOR UPDATE
  USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
        AND uta.role IN ('admin', 'accountant')
    )
  );

-- annual_balance_sheets: admin only can DELETE
CREATE POLICY "abs_delete_admin_only"
  ON annual_balance_sheets FOR DELETE
  USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
        AND uta.role = 'admin'
    )
  );

-- Special: bookkeeper can UPDATE only materials_received fields
-- (handled in application layer - RLS allows accountant+admin UPDATE,
--  bookkeeper uses a dedicated RPC function for marking materials)

-- RPC function for bookkeepers to mark materials received
CREATE OR REPLACE FUNCTION mark_materials_received(
  p_balance_sheet_id UUID,
  p_received_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
  v_current_status TEXT;
BEGIN
  -- Get tenant_id from user metadata
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  -- Verify the record belongs to the user's tenant
  SELECT status INTO v_current_status
  FROM annual_balance_sheets
  WHERE id = p_balance_sheet_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;

  IF v_current_status != 'waiting_for_materials' THEN
    RAISE EXCEPTION 'Can only mark materials for cases in waiting_for_materials status';
  END IF;

  -- Update the record
  UPDATE annual_balance_sheets
  SET
    status = 'materials_received',
    materials_received_at = p_received_at,
    materials_received_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_balance_sheet_id AND tenant_id = v_tenant_id;

  -- Log status change
  INSERT INTO balance_sheet_status_history (balance_sheet_id, tenant_id, from_status, to_status, changed_by)
  VALUES (p_balance_sheet_id, v_tenant_id, 'waiting_for_materials', 'materials_received', auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- balance_sheet_status_history: all tenant users can SELECT
CREATE POLICY "bssh_select_own_tenant"
  ON balance_sheet_status_history FOR SELECT
  USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

-- balance_sheet_status_history: admin + accountant can INSERT
CREATE POLICY "bssh_insert_admin_accountant"
  ON balance_sheet_status_history FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
        AND uta.role IN ('admin', 'accountant')
    )
  );
```

**After migration**: Run `npm run generate-types` to get updated `database.types.ts`.

---

## Phase 2: TypeScript Types & Service Layer

Create the type definitions and service class following existing patterns.

### Tasks

- [ ] Create `src/modules/annual-balance/types/annual-balance.types.ts` with all interfaces and constants
- [ ] Create `src/modules/annual-balance/services/annual-balance.service.ts` extending BaseService [complex]
  - [ ] Implement `getAll()` with pagination, filters (status, auditor, year), and client join
  - [ ] Implement `getById()` with client and auditor details
  - [ ] Implement `getByClientId()` for client card tab (all years for a client)
  - [ ] Implement `openYear()` - batch insert for all active companies + partnerships
  - [ ] Implement `updateStatus()` with audit trail logging
  - [ ] Implement `markMaterialsReceived()` using the RPC function (for bookkeepers)
  - [ ] Implement `assignAuditor()` with meeting date
  - [ ] Implement `getDashboardStats()` for KPI cards (count per status + per auditor)

### Technical Details

**Types file** (`src/modules/annual-balance/types/annual-balance.types.ts`):
```typescript
export const BALANCE_STATUSES = [
  'waiting_for_materials',
  'materials_received',
  'assigned_to_auditor',
  'in_progress',
  'work_completed',
  'office_approved',
  'report_transmitted',
  'advances_updated',
] as const;

export type BalanceStatus = typeof BALANCE_STATUSES[number];

export const BALANCE_STATUS_CONFIG: Record<BalanceStatus, {
  label: string;
  color: string;
  bgColor: string;
  order: number;
}> = {
  waiting_for_materials: { label: 'ממתין לחומר', color: 'text-gray-700', bgColor: 'bg-gray-100', order: 1 },
  materials_received: { label: 'הגיע חומר', color: 'text-blue-700', bgColor: 'bg-blue-100', order: 2 },
  assigned_to_auditor: { label: 'שויך למבקר', color: 'text-purple-700', bgColor: 'bg-purple-100', order: 3 },
  in_progress: { label: 'בעבודה', color: 'text-orange-700', bgColor: 'bg-orange-100', order: 4 },
  work_completed: { label: 'ממתין לאישור', color: 'text-yellow-700', bgColor: 'bg-yellow-100', order: 5 },
  office_approved: { label: 'משרד אישר', color: 'text-cyan-700', bgColor: 'bg-cyan-100', order: 6 },
  report_transmitted: { label: 'דוח שודר', color: 'text-green-700', bgColor: 'bg-green-100', order: 7 },
  advances_updated: { label: 'מקדמות עודכנו', color: 'text-emerald-700', bgColor: 'bg-emerald-100', order: 8 },
};

export interface AnnualBalanceSheet {
  id: string;
  tenant_id: string;
  client_id: string;
  year: number;
  status: BalanceStatus;

  // Step 2
  materials_received_at: string | null;
  materials_received_by: string | null;

  // Step 3
  auditor_id: string | null;
  meeting_date: string | null;

  // Step 4-5
  work_started_at: string | null;
  work_completed_at: string | null;

  // Step 6
  office_approved_at: string | null;
  office_approved_by: string | null;

  // Step 7
  report_transmitted_at: string | null;

  // Step 8
  new_advances_amount: number | null;
  advances_updated_at: string | null;
  advances_letter_id: string | null;

  // Debt letter
  debt_letter_sent: boolean;
  debt_letter_id: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields (from queries)
  client?: {
    id: string;
    company_name: string;
    tax_id: string;
    client_type: string;
  };
  auditor?: {
    id: string;
    email: string;
  };
}

export interface BalanceStatusHistory {
  id: string;
  balance_sheet_id: string;
  tenant_id: string;
  from_status: BalanceStatus | null;
  to_status: BalanceStatus;
  changed_by: string;
  changed_at: string;
  note: string | null;
}

export interface BalanceDashboardStats {
  totalCases: number;
  byStatus: Record<BalanceStatus, number>;
  byAuditor: Array<{
    auditor_id: string;
    auditor_email: string;
    total: number;
    byStatus: Partial<Record<BalanceStatus, number>>;
  }>;
}

export interface BalanceFilters {
  status?: BalanceStatus;
  auditor_id?: string;
  year: number;
  search?: string;
}
```

**Service pattern**: Extends `BaseService` from `src/services/base.service.ts`. Key method patterns:
- `getTenantId()` before every query
- Return `ServiceResponse<T>` from all methods
- Use `logAction()` for audit logging
- `openYear()`: Query clients where `client_type IN ('company', 'partnership') AND status = 'active'`, then batch insert into `annual_balance_sheets`
- `markMaterialsReceived()`: Call `supabase.rpc('mark_materials_received', { ... })` for bookkeeper access
- `getDashboardStats()`: Single query with `group by status` + separate query grouped by `auditor_id, status`

---

## Phase 3: Zustand Store & Route Setup

Set up the client-side state management and routing.

### Tasks

- [ ] Create `src/modules/annual-balance/store/annualBalanceStore.ts` with Zustand store
- [ ] Create `src/modules/annual-balance/routes.tsx` with route definitions
- [ ] Add navigation item to sidebar in `src/components/layout/MainLayout.tsx`
- [ ] Add routes to `src/App.tsx` within the protected route section

### Technical Details

**Store** (`annualBalanceStore.ts`): Follow `collectionStore.ts` pattern:
```typescript
interface AnnualBalanceState {
  // Data
  cases: AnnualBalanceSheet[];
  dashboardStats: BalanceDashboardStats | null;
  loading: boolean;
  error: Error | null;

  // Filters
  filters: BalanceFilters;
  pagination: { page: number; pageSize: number; total: number };

  // Actions
  fetchCases: () => Promise<void>;
  fetchDashboardStats: () => Promise<void>;
  setFilters: (filters: Partial<BalanceFilters>) => void;
  resetFilters: () => void;
  setPagination: (pagination: Partial<{ page: number; pageSize: number }>) => void;
  refreshData: () => Promise<void>;
}
```

**Default year filter**: `new Date().getFullYear()` (current year, but for balance sheets this is typically the previous year - e.g., in 2026 we work on מאזני 25). Consider defaulting to `currentYear - 1`.

**Navigation sidebar** - Add to `navigation` array in `MainLayout.tsx`:
```typescript
// Import icon
import { Scale } from 'lucide-react';  // or FileSpreadsheet, BarChart3

// Add to navigation array
{
  name: 'מאזנים',
  href: '/annual-balance',
  icon: Scale,
  menuKey: 'annual-balance',
  allowedRoles: ['admin', 'accountant', 'bookkeeper'],
}
```

**Routes in App.tsx** - Add inside the protected routes section:
```tsx
{/* Annual Balance routes */}
<Route path="/annual-balance" element={
  <ErrorBoundary>
    <AnnualBalancePage />
  </ErrorBoundary>
} />
```

---

## Phase 4: Dashboard & Main Page UI [complex]

Build the main annual balance page with KPI cards, filters, and data table.

### Tasks

- [ ] Create `src/modules/annual-balance/components/BalanceStatusBadge.tsx` - reusable color badge
- [ ] Create `src/modules/annual-balance/components/BalanceKPICards.tsx` - 8 status count cards
- [ ] Create `src/modules/annual-balance/components/BalanceFilters.tsx` - status, auditor, year, search filters
- [ ] Create `src/modules/annual-balance/components/BalanceTable.tsx` - main data table with pagination [complex]
  - [ ] Columns: client name, tax ID, status badge, auditor, meeting date, last updated
  - [ ] Row click opens detail/edit dialog
  - [ ] Quick action buttons per row (context-dependent on current status)
  - [ ] Pagination with page size selector
- [ ] Create `src/modules/annual-balance/components/AuditorSummaryTable.tsx` - cases grouped by auditor
- [ ] Create `src/modules/annual-balance/components/OpenYearDialog.tsx` - confirmation dialog for opening new year
- [ ] Create `src/modules/annual-balance/pages/AnnualBalancePage.tsx` - main page composing all components
- [ ] Create `src/modules/annual-balance/index.ts` - module exports

### Technical Details

**Page layout** (RTL Hebrew, follows collections dashboard pattern):
```
┌─────────────────────────────────────────────────────┐
│ Header: "מאזנים" + Year selector + "פתח שנה" button │
├─────────────────────────────────────────────────────┤
│ KPI Cards (8 status counts in a responsive grid)    │
├─────────────────────────────────────────────────────┤
│ Tabs: [כל התיקים] [לפי מבקר]                        │
├─────────────────────────────────────────────────────┤
│ Filters: Status | Auditor | Search                  │
├─────────────────────────────────────────────────────┤
│ Data Table with pagination                          │
└─────────────────────────────────────────────────────┘
```

**KPI Cards**: Use shadcn `Card` component. Grid layout: `grid grid-cols-2 md:grid-cols-4 gap-4`. Each card shows status name (Hebrew), count, and a small colored indicator.

**Table columns**:
| Column | Field | Width | Notes |
|--------|-------|-------|-------|
| שם חברה | client.company_name | flex | Link to client |
| ח.פ. | client.tax_id | 120px | |
| סטטוס | status | 150px | BalanceStatusBadge |
| מבקר | auditor.email | 150px | Display name if available |
| פגישה | meeting_date | 130px | DD/MM/YYYY HH:mm |
| עדכון אחרון | updated_at | 130px | Relative time |
| פעולות | - | 80px | Context menu |

**Auditor Summary Table**: Group by auditor, show status breakdown per auditor as a horizontal bar or mini badges.

**"Open Year" dialog**: Confirmation dialog showing:
- Year to open (default: current year - 1)
- Count of clients that will be loaded
- Warning if year already exists
- Progress indicator during creation

---

## Phase 5: Workflow Action Dialogs

Build the dialogs for each workflow step transition.

### Tasks

- [ ] Create `src/modules/annual-balance/components/MarkMaterialsDialog.tsx` - date picker + confirm
- [ ] Create `src/modules/annual-balance/components/AssignAuditorDialog.tsx` - auditor select + meeting date/time
- [ ] Create `src/modules/annual-balance/components/UpdateStatusDialog.tsx` - generic status transition dialog with optional note
- [ ] Create `src/modules/annual-balance/components/UpdateAdvancesDialog.tsx` - advances amount + letter link
- [ ] Create `src/modules/annual-balance/components/BalanceDetailDialog.tsx` - full detail view/edit of a single case [complex]
  - [ ] Shows all fields organized by workflow step
  - [ ] Status history timeline
  - [ ] Action buttons based on current status and user role
  - [ ] Edit meeting date, notes, advances, debt letter fields

### Technical Details

**MarkMaterialsDialog**: Simple dialog with:
- `DatePicker` (default: today) using shadcn Calendar component
- Confirm button
- Calls `service.markMaterialsReceived()` or `service.updateStatus()` depending on user role

**AssignAuditorDialog**:
- `Select` dropdown populated from `user_tenant_access` where `role = 'accountant'`
- `DatePicker` for meeting date
- Time input (HH:mm) for meeting time
- Submit calls `service.assignAuditor()`

**UpdateStatusDialog** (reusable for steps 4-7):
- Shows current status → next status
- Optional note textarea
- Confirm button
- Validates status transition is valid (sequential order, unless admin reverting)

**UpdateAdvancesDialog**:
- Amount input (₪) with `type="number"`
- Optional link to existing letter (select from `generated_letters`)
- Submit updates `new_advances_amount`, `advances_updated_at`, `advances_letter_id`

**BalanceDetailDialog**: Full case view with sections:
```
┌───────────────────────────────────────────┐
│ Client: CompanyName (123456789)           │
│ Year: 2025     Status: [Badge]            │
├───────────────────────────────────────────┤
│ Timeline:                                 │
│ ✅ הגיע חומר - 15/01/2026 (מרים)         │
│ ✅ שויך למבקר - 20/01/2026 (אסף)         │
│ 🔄 בעבודה - 25/01/2026                   │
│ ⬜ ממתין לאישור                            │
│ ⬜ ...                                     │
├───────────────────────────────────────────┤
│ פרטים:                                    │
│ מבקר: [Name]    פגישה: [Date Time]       │
│ מקדמות: ₪X,XXX  מכתב חוב: כן/לא         │
│ הערות: [...]                              │
├───────────────────────────────────────────┤
│ [Action Button based on current status]   │
└───────────────────────────────────────────┘
```

---

## Phase 6: Client Card Integration

Add balance sheet status badge and history tab to the client card.

### Tasks

- [ ] Create `src/modules/annual-balance/components/ClientBalanceBadge.tsx` - small color badge for client card header
- [ ] Create `src/modules/annual-balance/components/ClientBalanceTab.tsx` - tab content showing all years with status timeline
- [ ] Integrate badge into client card/list view (modify `src/components/clients/ClientFormDialog.tsx` or equivalent)
- [ ] Add "מאזנים" tab to client detail view
- [ ] Add quick "סמן הגיע חומר" action from client card context

### Technical Details

**ClientBalanceBadge**: Fetches current year balance status for the client. Shows a small badge with color + Hebrew status text. On click, navigates to `/annual-balance?client_id={id}` or opens detail dialog.

```tsx
// Usage in client list/card:
<ClientBalanceBadge clientId={client.id} year={currentYear} />
```

**ClientBalanceTab**: Shows a table of all years for this client:
| Year | Status | Auditor | Materials Date | Transmitted Date |
Includes a "mark materials" quick button if status is `waiting_for_materials`.

**Integration points** - Files to modify:
- Client list table: Add a "מאזן" column with `ClientBalanceBadge`
- Client detail/form dialog: Add a "מאזנים" tab alongside existing tabs
- The exact files depend on current client component structure - look for `ClientFormDialog.tsx` or client detail page

**Data fetching**: `annualBalanceService.getByClientId(clientId)` returns all balance records for a client across years.

---

## Phase 7: Final Polish & Integration

Wire up remaining integrations and ensure consistency.

### Tasks

- [ ] Ensure all dialogs and forms use Zod validation schemas
- [ ] Add optimistic updates for status changes (instant UI feedback)
- [ ] Verify RTL alignment across all components (text, badges, tables, dialogs)
- [ ] Verify multi-tenant isolation works correctly (check RLS policies)
- [ ] Add loading states and error handling to all components
- [ ] Run `npm run lint` and `npm run typecheck` to ensure no issues
