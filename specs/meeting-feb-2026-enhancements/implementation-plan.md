# Implementation Plan: February 2026 Meeting Enhancements

## Overview

Implement enhancements from the Tiko Franco meeting in 3 phases:
1. **Phase 1**: Annual balance module - tax coding, backup link, auditor confirmation, advance rate, year activity
2. **Phase 2**: Unified client profile page at `/clients/:id`
3. **Phase 3**: Internal chat system between auditors

---

## Phase 1: Database Migration

Apply a single migration adding all new fields, triggers, and RPC updates.

### Tasks

- [ ] Apply database migration with all new columns, trigger, and RPC update

### Technical Details

**Migration name:** `annual_balance_meeting_updates`

**SQL migration:**

```sql
-- 1. Tax Coding on clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_coding TEXT DEFAULT '0';
COMMENT ON COLUMN clients.tax_coding IS 'קידוד מס - טופס 1214';

-- 2. New columns on annual_balance_sheets
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS tax_coding TEXT;
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS backup_link TEXT;
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS auditor_confirmed BOOLEAN DEFAULT false;
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS auditor_confirmed_at TIMESTAMPTZ;
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2);
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS turnover DECIMAL(15,2);
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS current_advance_rate DECIMAL(8,4);
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS calculated_advance_rate DECIMAL(8,4);
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS advance_rate_alert BOOLEAN DEFAULT false;
ALTER TABLE annual_balance_sheets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

COMMENT ON COLUMN annual_balance_sheets.tax_coding IS 'קידוד מס לשנה זו (מטופס 1214)';
COMMENT ON COLUMN annual_balance_sheets.backup_link IS 'קישור לגיבוי חומר - חובה בשלב הגעת חומר';
COMMENT ON COLUMN annual_balance_sheets.auditor_confirmed IS 'האם המבקר אישר קבלת התיק';
COMMENT ON COLUMN annual_balance_sheets.auditor_confirmed_at IS 'מתי המבקר אישר קבלת התיק';
COMMENT ON COLUMN annual_balance_sheets.tax_amount IS 'חובת מס - סכום המס';
COMMENT ON COLUMN annual_balance_sheets.turnover IS 'מחזור הכנסות';
COMMENT ON COLUMN annual_balance_sheets.current_advance_rate IS 'שיעור מקדמה נוכחי (ידני)';
COMMENT ON COLUMN annual_balance_sheets.calculated_advance_rate IS 'שיעור מחושב = tax_amount / turnover';
COMMENT ON COLUMN annual_balance_sheets.advance_rate_alert IS 'התראה - שיעור מחושב > שיעור נוכחי';
COMMENT ON COLUMN annual_balance_sheets.is_active IS 'האם הלקוח פעיל בשנה זו';

-- 3. Index for year activity queries
CREATE INDEX IF NOT EXISTS idx_abs_is_active ON annual_balance_sheets(tenant_id, year, is_active);

-- 4. Auto-calculate advance rate trigger
CREATE OR REPLACE FUNCTION public.calculate_advance_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tax_amount IS NOT NULL AND NEW.turnover IS NOT NULL AND NEW.turnover > 0 THEN
    NEW.calculated_advance_rate := NEW.tax_amount / NEW.turnover;
    IF NEW.current_advance_rate IS NOT NULL
       AND NEW.calculated_advance_rate > NEW.current_advance_rate THEN
      NEW.advance_rate_alert := true;
    ELSE
      NEW.advance_rate_alert := false;
    END IF;
  ELSE
    NEW.calculated_advance_rate := NULL;
    NEW.advance_rate_alert := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS trigger_calculate_advance_rate ON annual_balance_sheets;
CREATE TRIGGER trigger_calculate_advance_rate
  BEFORE INSERT OR UPDATE OF tax_amount, turnover, current_advance_rate
  ON annual_balance_sheets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_advance_rate();

-- 5. Update mark_materials_received RPC to require backup_link
CREATE OR REPLACE FUNCTION public.mark_materials_received(
  p_balance_sheet_id UUID,
  p_received_at TIMESTAMPTZ DEFAULT NOW(),
  p_backup_link TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_tenant_id UUID;
  v_current_status TEXT;
BEGIN
  v_tenant_id := (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID;

  SELECT status INTO v_current_status
  FROM annual_balance_sheets
  WHERE id = p_balance_sheet_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Record not found or access denied';
  END IF;

  IF v_current_status != 'waiting_for_materials' THEN
    RAISE EXCEPTION 'Can only mark materials for cases in waiting_for_materials status';
  END IF;

  IF p_backup_link IS NULL OR trim(p_backup_link) = '' THEN
    RAISE EXCEPTION 'Backup link is required when marking materials received';
  END IF;

  UPDATE annual_balance_sheets
  SET
    status = 'materials_received',
    materials_received_at = p_received_at,
    materials_received_by = auth.uid(),
    backup_link = p_backup_link,
    updated_at = NOW()
  WHERE id = p_balance_sheet_id AND tenant_id = v_tenant_id;

  INSERT INTO balance_sheet_status_history
    (balance_sheet_id, tenant_id, from_status, to_status, changed_by)
  VALUES
    (p_balance_sheet_id, v_tenant_id, 'waiting_for_materials', 'materials_received', auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
```

---

## Phase 2: TypeScript Types & Validation

Update type definitions and Zod schemas for all new fields.

### Tasks

- [ ] Add new fields to `AnnualBalanceSheet` interface and update `AnnualBalanceSheetWithClient` client subset to include `tax_coding`
- [ ] Add `confirm_assignment` to `BALANCE_PERMISSIONS`
- [ ] Update `markMaterialsSchema` to require `backupLink`, add `confirmAssignmentSchema` and `updateAdvanceRateSchema`
- [ ] Add `tax_coding` to `Client` interface and `CreateClientDto` in client service

### Technical Details

**Files to modify:**
- `src/modules/annual-balance/types/annual-balance.types.ts`
- `src/modules/annual-balance/types/validation.ts`
- `src/services/client.service.ts`

**New fields on `AnnualBalanceSheet` interface:**
```typescript
tax_coding?: string | null;
backup_link?: string | null;
auditor_confirmed: boolean;
auditor_confirmed_at?: string | null;
tax_amount?: number | null;
turnover?: number | null;
current_advance_rate?: number | null;
calculated_advance_rate?: number | null;
advance_rate_alert: boolean;
is_active: boolean;
```

**New permission:**
```typescript
confirm_assignment: ['admin', 'accountant'],
```

**New Zod schemas:**
```typescript
// Update existing
export const markMaterialsSchema = z.object({
  receivedAt: z.date(),
  backupLink: z.string().url('יש להזין קישור תקין'),
});

// New
export const confirmAssignmentSchema = z.object({
  id: z.string().uuid(),
});

export const updateAdvanceRateSchema = z.object({
  taxAmount: z.number().min(0, 'סכום מס חייב להיות חיובי'),
  turnover: z.number().min(0, 'מחזור חייב להיות חיובי'),
  currentAdvanceRate: z.number().min(0).max(1, 'שיעור מקדמה חייב להיות בין 0 ל-100%'),
});
```

---

## Phase 3: Service Layer Updates

Add new methods and modify existing ones in the annual balance service.

### Tasks

- [ ] Add `confirmAssignment(id)` method - sets auditor_confirmed=true, logs to status history
- [ ] Add `updateAdvanceRate(id, data)` method - updates tax_amount, turnover, current_advance_rate
- [ ] Add `toggleYearActivity(id, isActive)` method - toggles is_active field
- [ ] Modify `markMaterialsReceived()` to pass backup_link to RPC
- [ ] Modify `updateStatus()` to block `assigned_to_auditor` -> `in_progress` if auditor_confirmed=false
- [ ] Modify `getAll()` to default filter `is_active=true` with option to show inactive
- [ ] Modify `getDashboardStats()` to only count active records

### Technical Details

**File:** `src/modules/annual-balance/services/annual-balance.service.ts`

**New method signatures:**
```typescript
async confirmAssignment(id: string): Promise<ServiceResponse<AnnualBalanceSheet>>
// Update: auditor_confirmed=true, auditor_confirmed_at=NOW()
// Log to balance_sheet_status_history with note "מבקר אישר קבלת תיק"

async updateAdvanceRate(id: string, data: {
  taxAmount: number;
  turnover: number;
  currentAdvanceRate: number;
}): Promise<ServiceResponse<AnnualBalanceSheet>>
// Update: tax_amount, turnover, current_advance_rate
// DB trigger auto-calculates calculated_advance_rate and advance_rate_alert

async toggleYearActivity(id: string, isActive: boolean): Promise<ServiceResponse<AnnualBalanceSheet>>
// Update: is_active field
```

**Modified `markMaterialsReceived` signature:**
```typescript
async markMaterialsReceived(id: string, receivedAt?: string, backupLink?: string)
// Pass p_backup_link to RPC call
```

**Modified `updateStatus` guard logic:**
```typescript
// In updateStatus, before allowing transition:
if (newStatus === 'in_progress') {
  // Fetch current record to check auditor_confirmed
  const current = await this.getById(id);
  if (!current.data?.auditor_confirmed) {
    return { data: null, error: new Error('יש לאשר קבלת תיק לפני תחילת עבודה') };
  }
}
```

**Modified `getAll` filter:**
```typescript
// Add to existing filter chain:
if (!filters?.showInactive) {
  query = query.eq('is_active', true);
}
```

---

## Phase 4: Store Updates

Update Zustand store with new filter and actions.

### Tasks

- [ ] Add `showInactive` boolean to `BalanceFilters` type and store defaults
- [ ] Add store actions: `confirmAssignment`, `toggleYearActivity`, `updateAdvanceRate`

### Technical Details

**File:** `src/modules/annual-balance/store/annualBalanceStore.ts`

Add to filters interface:
```typescript
showInactive?: boolean; // default: false
```

New actions following existing pattern (optimistic update + service call + refresh):
```typescript
confirmAssignment: async (id: string) => { ... }
toggleYearActivity: async (id: string, isActive: boolean) => { ... }
updateAdvanceRate: async (id: string, data: AdvanceRateData) => { ... }
```

---

## Phase 5: MarkMaterialsDialog - Add Backup Link [complex]

Modify the materials received dialog to require a backup link URL.

### Tasks

- [ ] Add URL input field labeled "קישור לגיבוי (Google Drive)"
  - [ ] Field is mandatory - submit button disabled without valid URL
  - [ ] Use `type="url"` with placeholder text "הכנס קישור לתיקיית גיבוי"
  - [ ] Pass backupLink to service call for both bookkeeper (RPC) and admin/accountant (direct) paths
- [ ] Update Zod validation to include backupLink

### Technical Details

**File:** `src/modules/annual-balance/components/MarkMaterialsDialog.tsx`

Current dialog has only a date picker. Add below it:
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">
    קישור לגיבוי (Google Drive): <span className="text-red-500">*</span>
  </label>
  <Input
    type="url"
    value={backupLink}
    onChange={(e) => setBackupLink(e.target.value)}
    placeholder="הכנס קישור לתיקיית גיבוי"
    className="rtl:text-right"
    dir="ltr"
  />
</div>
```

Submit handler must pass `backupLink` to both code paths:
- Bookkeeper path: `annualBalanceService.markMaterialsReceived(id, date, backupLink)`
- Admin/accountant path: needs to also set backup_link when calling updateStatus

---

## Phase 6: Auditor Confirmation Dialog

Create a new dialog for auditors to confirm file receipt.

### Tasks

- [ ] Create `ConfirmAssignmentDialog.tsx` component
  - [ ] Shows client name, assignment date, auditor name
  - [ ] Single "אישור קבלת תיק" button
  - [ ] Calls `confirmAssignment()` service method
  - [ ] Follows existing dialog pattern (dir="rtl", DialogFooter with rtl:flex-row-reverse)

### Technical Details

**New file:** `src/modules/annual-balance/components/ConfirmAssignmentDialog.tsx`

Props interface:
```typescript
interface ConfirmAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
}
```

Pattern follows `MarkMaterialsDialog.tsx` structure but simpler - no form fields, just a confirmation action.

---

## Phase 7: UpdateAdvancesDialog - Add Advance Rate Fields [complex]

Expand the advances dialog with tax calculation fields.

### Tasks

- [ ] Add 3 input fields above existing amount field
  - [ ] `tax_amount` (חובת מס) - number input in ILS
  - [ ] `turnover` (מחזור) - number input in ILS
  - [ ] `current_advance_rate` (שיעור מקדמה נוכחי) - percentage input
- [ ] Add calculated rate display: `tax_amount / turnover = X%`
- [ ] Add red alert banner when calculated > current rate
- [ ] Pre-fill fields from existing balance sheet data
- [ ] Call `updateAdvanceRate()` before or alongside `updateAdvances()`

### Technical Details

**File:** `src/modules/annual-balance/components/UpdateAdvancesDialog.tsx`

Current dialog has: amount input + letter selector. Add above them:

```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">חובת מס (₪):</label>
  <Input type="number" value={taxAmount} onChange={...} min="0" step="0.01" />
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">מחזור (₪):</label>
  <Input type="number" value={turnover} onChange={...} min="0" step="0.01" />
</div>

<div className="space-y-2">
  <label className="text-sm font-medium">שיעור מקדמה נוכחי (%):</label>
  <Input type="number" value={currentRate} onChange={...} min="0" max="100" step="0.01" />
</div>

{/* Calculated display */}
{taxAmount && turnover > 0 && (
  <div className={cn(
    "rounded-md border p-3",
    calculatedRate > currentRate ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"
  )}>
    <p className="text-sm font-medium">
      שיעור מחושב: {(taxAmount / turnover * 100).toFixed(2)}%
    </p>
    {calculatedRate > currentRate && (
      <p className="text-sm text-red-800 mt-1">
        שיעור מחושב גבוה מהשיעור הנוכחי - נדרש עדכון מקדמות!
      </p>
    )}
  </div>
)}
```

Pre-fill from `balanceCase` in useEffect (like existing amount pre-fill pattern).

---

## Phase 8: BalanceTable - New Columns & Actions [complex]

Update the main data table with new columns and context-aware actions.

### Tasks

- [ ] Add `tax_coding` column showing "1214: {value}" badge
- [ ] Add backup_link icon column (clickable external link)
- [ ] Update `assigned_to_auditor` quick action:
  - [ ] If `auditor_confirmed=false` -> "אשר קבלת תיק" opens ConfirmAssignmentDialog
  - [ ] If `auditor_confirmed=true` -> "התחל עבודה" (existing behavior)
- [ ] Add red warning icon for rows with `advance_rate_alert=true`
- [ ] Add reduced opacity + "לא פעיל" badge for `is_active=false` rows

### Technical Details

**File:** `src/modules/annual-balance/components/BalanceTable.tsx`

Table currently has 12 columns. Add:
- Column after client name: tax_coding badge
- Column after auditor: backup_link icon (ExternalLink from lucide-react)
- Alert indicator: AlertTriangle icon with red color for advance_rate_alert rows

Quick action button logic change:
```typescript
// Current: assigned_to_auditor always shows "התחל עבודה"
// New:
case 'assigned_to_auditor':
  if (!row.auditor_confirmed) {
    return { label: 'אשר קבלת תיק', action: 'confirm_assignment' };
  }
  return { label: 'התחל עבודה', action: 'start_work' };
```

Row styling for inactive:
```typescript
className={cn(
  "...",
  !row.is_active && "opacity-50"
)}
```

---

## Phase 9: BalanceDetailDialog - Show New Fields

Update the detail dialog to display all new data.

### Tasks

- [ ] Show backup_link as clickable link in timeline at materials_received step
- [ ] Show auditor_confirmed status indicator in timeline at assigned_to_auditor step
- [ ] Show tax_coding in details section
- [ ] Show advance rate calculation section (all values + alert)
- [ ] Add is_active toggle switch

### Technical Details

**File:** `src/modules/annual-balance/components/BalanceDetailDialog.tsx`

In the timeline section, for materials_received step, add:
```tsx
{balanceCase.backup_link && (
  <a href={balanceCase.backup_link} target="_blank" rel="noopener noreferrer"
     className="text-sm text-blue-600 hover:underline flex items-center gap-1">
    <ExternalLink className="h-3 w-3" /> קישור לגיבוי
  </a>
)}
```

For assigned_to_auditor step:
```tsx
{balanceCase.auditor_confirmed ? (
  <Badge variant="outline" className="text-green-700">אישר קבלת תיק</Badge>
) : (
  <Badge variant="outline" className="text-yellow-700">ממתין לאישור</Badge>
)}
```

---

## Phase 10: Filters, Status Guards & Page Wiring

Update filters, add status transition guards, and wire new dialog into page.

### Tasks

- [ ] Add "הצג לא פעילים" checkbox toggle to BalanceFilters
- [ ] Add guard in UpdateStatusDialog: block `in_progress` if `auditor_confirmed=false`
- [ ] Add warning in UpdateStatusDialog: show alert when transitioning to `report_transmitted` with `advance_rate_alert=true`
- [ ] Wire ConfirmAssignmentDialog into AnnualBalancePage (state, open/close, handler)

### Technical Details

**Files:**
- `src/modules/annual-balance/components/BalanceFilters.tsx`
- `src/modules/annual-balance/components/UpdateStatusDialog.tsx`
- `src/modules/annual-balance/pages/AnnualBalancePage.tsx`

**BalanceFilters - add toggle:**
```tsx
<div className="flex items-center gap-2">
  <Checkbox
    id="showInactive"
    checked={filters.showInactive}
    onCheckedChange={(checked) => setFilters({ ...filters, showInactive: !!checked })}
  />
  <label htmlFor="showInactive" className="text-sm">הצג לא פעילים</label>
</div>
```

**UpdateStatusDialog - guards:**
```typescript
// When target is in_progress and auditor not confirmed:
if (targetStatus === 'in_progress' && !balanceCase?.auditor_confirmed) {
  setError('יש לאשר קבלת תיק לפני תחילת עבודה');
  return;
}

// When target is report_transmitted and advance alert active:
if (targetStatus === 'report_transmitted' && balanceCase?.advance_rate_alert) {
  // Show warning but allow proceeding
  setShowAdvanceWarning(true);
  return;
}
```

**AnnualBalancePage - wire dialog:**
Add state similar to existing dialogs (assignAuditorDialog, markMaterialsDialog):
```typescript
const [confirmAssignmentDialog, setConfirmAssignmentDialog] = useState<{
  open: boolean;
  balanceCase: AnnualBalanceSheetWithClient | null;
}>({ open: false, balanceCase: null });
```

---

## Phase 11: Client Form & Service - Tax Coding

Add tax coding field to client management.

### Tasks

- [ ] Add `tax_coding` input field to ClientFormDialog near tax_id (labeled "קידוד מס (1214)")
- [ ] Add `tax_coding` to Client interface and CreateClientDto in client.service.ts
- [ ] Run `npm run generate-types` after migration

### Technical Details

**Files:**
- `src/components/clients/ClientFormDialog.tsx`
- `src/services/client.service.ts`

In ClientFormDialog, add in the "פרטי הרשומה" section after tax_id:
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium">קידוד מס (1214):</label>
  <Input
    value={formData.tax_coding || '0'}
    onChange={(e) => setFormData({ ...formData, tax_coding: e.target.value })}
    placeholder="0"
    className="w-24 rtl:text-right"
  />
</div>
```

---

## Phase 12: Verification & Build

Verify all changes work end-to-end.

### Tasks

- [ ] Verify migration applied correctly (query new columns)
- [ ] Test mark materials flow: without backup link fails, with link succeeds
- [ ] Test auditor confirmation: assign -> can't start work -> confirm -> can start
- [ ] Test advance rate: enter values -> verify auto-calculation and alert
- [ ] Test year activity: toggle inactive -> hidden by default, visible with filter
- [ ] Test tax coding: set on client -> visible in balance table
- [ ] Run `npm run pre-commit` (lint + typecheck)
- [ ] Run `npm run build`

### Technical Details

**Verification queries:**
```sql
-- Check columns exist
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'annual_balance_sheets'
AND column_name IN ('tax_coding', 'backup_link', 'auditor_confirmed', 'tax_amount', 'turnover', 'is_active');

-- Test trigger
UPDATE annual_balance_sheets SET tax_amount = 100, turnover = 1000, current_advance_rate = 0.05
WHERE id = 'some-test-id';
-- Expected: calculated_advance_rate = 0.1, advance_rate_alert = true
```

**Build commands:**
```bash
npm run generate-types
npm run pre-commit
npm run build
```

---

## Phase 13: Unified Client Profile Page [complex]

Build the `/clients/:id` page aggregating all client data.

### Tasks

- [ ] Create module skeleton: `src/modules/client-profile/`
- [ ] Create `useClientProfile(clientId)` hook with parallel data fetching (Promise.allSettled)
- [ ] Create `ClientProfilePage.tsx` as route handler
- [ ] Create `ClientProfileHeader.tsx` with identity, 1214 indicator, quick links
- [ ] Create `Form1214Indicator.tsx` - prominent tax coding badge
- [ ] Create `ClientOverviewTab.tsx` - summary cards from all modules [complex]
  - [ ] `ClientInfoCard` - core details read-only
  - [ ] `AnnualBalanceStatusCard` - current year balance status
  - [ ] `CollectionStatusCard` - outstanding debts
  - [ ] `AdvancePaymentAlert` - red alert if applicable
  - [ ] `RecentFilesCard` - last 5 files
- [ ] Create Contacts tab reusing `ContactsManager` + `PhoneNumbersManager`
- [ ] Create Balance tab reusing `ClientBalanceTab`
- [ ] Create Collection tab with KPIs + fee history
- [ ] Create Files tab reusing `FileDisplayWidget` per category
- [ ] Create Activity tab with interactions timeline
- [ ] Add `/clients/:id` route to App.tsx (lazy loaded)
- [ ] Update `ClientsTable` row click to navigate to `/clients/:id`
- [ ] Keep edit button opening `ClientFormDialog`

### Technical Details

**Module structure:**
```
src/modules/client-profile/
├── pages/ClientProfilePage.tsx
├── components/
│   ├── ClientProfileHeader.tsx
│   ├── Form1214Indicator.tsx
│   ├── ClientOverviewTab.tsx
│   ├── AnnualBalanceStatusCard.tsx
│   ├── CollectionStatusCard.tsx
│   ├── AdvancePaymentAlert.tsx
│   ├── RecentFilesCard.tsx
│   ├── ClientCollectionTab.tsx
│   ├── ClientFilesTab.tsx
│   └── ClientActivityTab.tsx
├── hooks/useClientProfile.ts
└── types/client-profile.types.ts
```

**Data fetching (useClientProfile.ts):**
```typescript
const results = await Promise.allSettled([
  clientService.getById(clientId),
  clientService.getClientContacts(clientId),
  clientService.getClientPhones(clientId),
  annualBalanceService.getByClientId(clientId),
  feeService.getByClient(clientId),
  fileUploadService.getFilesByClient(clientId),
  // client_interactions query
  // collection_dashboard_view query
]);
```

**Routing (App.tsx):**
```tsx
const ClientProfilePage = lazy(() => import('@/modules/client-profile/pages/ClientProfilePage'));

<Route path="/clients/:id" element={<ClientProfilePage />} />
```

**Existing components to reuse:**
- `ClientBalanceTab` from `src/modules/annual-balance/components/ClientBalanceTab.tsx`
- `ContactsManager` from `src/components/ContactsManager.tsx`
- `PhoneNumbersManager` from `src/components/PhoneNumbersManager.tsx`
- `FileDisplayWidget` from `src/components/files/FileDisplayWidget.tsx`
- `BalanceStatusBadge` from `src/modules/annual-balance/components/BalanceStatusBadge.tsx`
- Formatters: `formatILS()`, `formatIsraeliDate()` from `src/lib/formatters.ts`

---

## Phase 14: Internal Chat System [complex]

Build real-time messaging between auditors using Supabase Realtime.

### Tasks

- [ ] Create database migration for chat tables (chat_channels, chat_messages, chat_read_status) with RLS
- [ ] Create chat service extending BaseService
- [ ] Create Zustand store for chat state
- [ ] Create `ChatPanel.tsx` - slide-out sidebar panel [complex]
  - [ ] `ChannelList.tsx` - list of channels with unread counts
  - [ ] `MessageThread.tsx` - message display with auto-scroll
  - [ ] `MessageInput.tsx` - compose and send messages
- [ ] Create `UnreadBadge.tsx` for navigation menu
- [ ] Set up Supabase Realtime subscriptions for live updates
- [ ] Add chat toggle button to MainLayout navigation
- [ ] Support channel types: general, per-client, direct messaging

### Technical Details

**Database tables:**
```sql
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('general', 'client', 'direct')),
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chat_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, channel_id, user_id)
);
```

**RLS:** All tables filtered by tenant_id. Only 'accountant' and 'admin' roles can access.

**Realtime subscription:**
```typescript
supabase
  .channel(`chat:${tenantId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `tenant_id=eq.${tenantId}`,
  }, handleNewMessage)
  .subscribe();
```

**Module structure:**
```
src/modules/chat/
├── pages/ChatPage.tsx (optional dedicated route)
├── components/
│   ├── ChatPanel.tsx
│   ├── ChannelList.tsx
│   ├── MessageThread.tsx
│   ├── MessageInput.tsx
│   └── UnreadBadge.tsx
├── services/chat.service.ts
├── store/chatStore.ts
└── types/chat.types.ts
```
