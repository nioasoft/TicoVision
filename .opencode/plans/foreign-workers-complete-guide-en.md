# Foreign Workers Approvals - Complete Implementation Guide

## Overview

A system for generating 5 types of approval documents for the Ministry of Interior - Population, Immigration and Border Crossings Authority. The system manages rolling 14-month historical data per branch and enables PDF generation tailored to each client.

### 5 Document Types
1. **Accountant Turnover Report** (דוח מחזורים רו"ח) - Monthly turnover table for 12 months
2. **Israeli Workers Report** (דוח עובדים ישראליים) - Number of Israeli employees by month
3. **Living Business 2025** (עסק חי 2025) - Simple living business approval
4. **Turnover/Costs Approval** (אישור מחזור/עלויות) - 3 scenarios based on company age
5. **Salary Report** (דוח שכר) - Salary table for foreign workers with signatures

---

## System Architecture

### Database Tables

#### 1. `foreign_workers` - Foreign Workers Pool
```sql
CREATE TABLE public.foreign_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  branch_id UUID NOT NULL REFERENCES client_branches(id),
  passport_number VARCHAR(50) NOT NULL,          -- PRIMARY KEY per tenant
  full_name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100),
  salary NUMERIC(12,2) DEFAULT 0,
  supplement NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(tenant_id, passport_number)             -- Passport unique per tenant
);
```

**Important:** Passport is unique per tenant - cannot exist at different clients!

#### 2. `foreign_worker_monthly_data` - Monthly Salary Data (Tab 5)
```sql
CREATE TABLE public.foreign_worker_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  branch_id UUID NOT NULL REFERENCES client_branches(id),
  worker_id UUID NOT NULL REFERENCES foreign_workers(id),
  month_date DATE NOT NULL,                      -- First day of month: '2025-01-01'
  salary NUMERIC(12,2) DEFAULT 0,
  supplement NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, branch_id, worker_id, month_date)
);
```

#### 3. `client_monthly_reports` - Client Monthly Reports (Tabs 1+2)
```sql
CREATE TABLE public.client_monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  branch_id UUID NOT NULL REFERENCES client_branches(id),
  report_type TEXT NOT NULL,                      -- 'accountant_turnover' | 'israeli_workers'
  month_date DATE NOT NULL,                      -- First day of month
  turnover_amount NUMERIC(15,2),                 -- For accountant_turnover
  employee_count INTEGER,                        -- For israeli_workers
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, branch_id, report_type, month_date)
);
```

#### 4. `client_month_range` - Month Range per Branch
```sql
CREATE TABLE public.client_month_range (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  branch_id UUID NOT NULL REFERENCES client_branches(id),
  start_month DATE NOT NULL,                    -- e.g., '2024-01-01'
  end_month DATE NOT NULL,                      -- e.g., '2025-12-01'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY(tenant_id, branch_id)
);
```

---

## Detailed Document Explanations

### Document #1: Accountant Turnover Report (דוח מחזורים רו"ח)

**Purpose:** CPA approval summarizing VAT reports for the 12 months preceding the application

**Required Data:**
- Company name (`company_name`)
- Tax ID (`tax_id`)
- Monthly turnover table (`monthly_turnover[]`)

**Table Structure:**
```typescript
interface MonthlyTurnover {
  month: string;        // "January 2024"
  amount: number;       // ₪ amount (without VAT)
}
```

**Sample Document Text:**
```
CPA approval summarizing VAT reports for the 12 months preceding this application for transaction amounts of the applicant

As the CPA of the applicant [Company Name] ID No. [Tax ID], we report to you the transaction amounts (excluding VAT) of the applicant alone in each of the detailed months:

| Total Excluding VAT | Reporting Month |
|----------------------|-----------------|
| ₪150,000           | January 2024    |
| ₪180,000           | February 2024   |
| ...                 | ...             |

[CPA Signature]
```

---

### Document #2: Israeli Workers Report (דוח עובדים ישראליים)

**Purpose:** Report of number of Israeli employees by month

**Required Data:**
- Company name (`company_name`)
- Tax ID (`tax_id`)
- Employee count table by month (`israeli_workers[]`)
- Average employees (`average_workers`)

**Table Structure:**
```typescript
interface MonthlyWorkers {
  month: string;          // "January 2024"
  employee_count: number; // Number of employees
}
```

**Sample Document Text:**
```
Subject: Special CPA report on the number of Israeli employees for period [Start Date] - [End Date]

At the request of [Company Name] ID No. [Tax ID], we examined the data regarding the number of Israeli employees... the average for the period is [Number] employees.

| Month   | Number of Employees |
|---------|---------------------|
| January 2024 | 15 |
| February 2024 | 16 |
| ...            | ... |
| Average:      | 15.5 |
```

---

### Document #3: Living Business 2025 (עסק חי 2025)

**Purpose:** Living business approval for Ministry of Interior

**Required Data:**
- Company name (`company_name`)
- Tax ID (`tax_id`)
- Number of foreign expert workers (`foreign_experts_count`)

**Sample Document Text:**
```
Subject: [Company Name] ID No. [Tax ID]

Following your request from [Company Name] ID No. [Tax ID], we confirm that:

1. The Company is an active company.
2. No living business remark has been registered to the company and will not be registered to the company in the years 2024 - 2025.
3. Furthermore, no warning business remark has ever been registered in the company's audited reports since its establishment, and we rely on high reliability that such a remark will not be registered in the coming years.
4. The Company will employ [Number] foreign expert workers and will be able to bear their employment cost, which will not be less than the average salary in the business.

[CPA Signature]
```

---

### Document #4: Turnover/Costs Approval (אישור מחזור/עלויות)

**Purpose:** Appendix A - CPA approval on financial turnover from Asian activity / business establishment costs

**3 Scenarios Based on Company Age:**

#### Scenario A: 12+ Months
**For:** Restaurants with financial activity of at least 12 months

```typescript
{
  scenario: '12_plus',
  scenario_12_plus: {
    period_start: '01/2024',      // MM/YYYY format
    period_end: '12/2024',
    total_turnover: 2500000,      // ₪
    total_costs: 1800000          // ₪
  }
}
```

#### Scenario B: 4-11 Months
**For:** Restaurants with financial activity of 4 to 11 months (inclusive)

```typescript
{
  scenario: '4_to_11',
  scenario_4_to_11: {
    period_start: '03/2024',
    period_end: '11/2024',        // Auto-calculated
    months_count: 9,              // 4-11
    total_turnover: 1500000,      // ₪ (actual)
    total_costs: 1000000,         // ₪ (actual)
    projected_annual_turnover: 2000000,  // ₪ (extrapolated)
    projected_annual_costs: 1333333       // ₪ (extrapolated)
  }
}
```

**Calculation:** Extrapolate to 12 months linearly
```
projected_annual = (actual / months_count) * 12
```

#### Scenario C: Up to 3 Months
**For:** Restaurants with financial activity of up to 3 months (inclusive)

```typescript
{
  scenario: 'up_to_3',
  scenario_up_to_3: {
    estimated_annual_turnover: 2500000,  // ₪ (from business plan)
    estimated_annual_costs: 1800000,     // ₪ (from business plan)
    estimate_basis: 'Approved business plan from 01/01/2024'
  }
}
```

**Sample Document Text (Scenario A):**
```
Appendix A - CPA approval on financial turnover from Asian activity

At the request of [Company Name] ID No. [Tax ID], we confirm that:

The financial turnover recorded in period [Start] - [End] totaled ₪[Turnover].

The costs borne by the Company during this period totaled ₪[Costs].

[CPA Signature]
```

---

### Document #5: Salary Report (דוח שכר)

**Purpose:** Special CPA report on data regarding salary payment to foreign experts

**Required Data:**
- Company name (`company_name`)
- Tax ID (`tax_id`)
- Reporting period (`period_start` - `period_end`)
- Worker data table (`workers_data[]`)
- Signatures:
  - Senior Manager (`senior_manager_name`, `senior_manager_title`, `senior_manager_signature`)
  - Finance Manager (`finance_manager_name`, `finance_manager_title`, `finance_manager_signature`)
  - Company stamp (`company_stamp_signature`)

**Table Structure (single worker - each document is for one worker):**
```typescript
interface WorkerData {
  id: string;               // Worker database ID
  passport_number: string;  // PRIMARY identifier
  full_name: string;
  nationality: string;
  month: string;           // "01/2024"
  salary: number;          // ₪
  supplement: number;      // ₪
}
```

**Sample Document Text:**
```
Subject: Special CPA report on data regarding salary payment to foreign experts for period 01/01/2024 - 31/12/2024

At the request of [Company Name] ID No. [Tax ID], we examined the data regarding salary payment to foreign experts... This report is the responsibility of the company management. Our responsibility is to give an opinion on the said report based on our audit.

In our opinion, the data included in the said report of the Company corresponds, in all material respects, to the records and evidences upon which the report is based.

**Data on Salary Payment to Foreign Experts (*)**

| Full Name | Passport No. | Reporting Month (**) | Nationality | Basic Salary (***) | Additional Payments (****) |
|-----------|---------------|----------------------|-------------|-------------------|---------------------------|
| Juan Perez | 123456789 | 01/2024 | Mexican | ₪8,000 | ₪500 |
| Juan Perez | 123456789 | 02/2024 | Mexican | ₪8,000 | ₪600 |
| ...       | ...           | ...                  | ...       | ...       | ...                       |

(*) The report refers to salary actually paid to workers during the examined period.
(**) The reporting month refers to the month in which the salary was paid.
(***) Basic salary includes basic monthly salary before deductions.
(****) Additional payments include bonuses, extra hours, and other additions.

**We Declare the Truthfulness of the Data:**

+-------------------------------+-------------------------------+
| The Senior Manager in the      | The Finance and Accounts     |
| Conglomerate                 | Manager                      |
|-------------------------------|-------------------------------|
| Name: [Manager Name]          | Name: [Finance Name]         |
| Title: Manager                | Title: Accounts Manager      |
| Signature: [Signature Image]   | Signature: [Signature Image]  |
+-------------------------------+-------------------------------+

+---------------------------------------+
|             Company Stamp                |
|            [Stamp Image]              |
+---------------------------------------+

[CPA Signature]
```

---

## UI Components Structure

### Component Tree
```
ForeignWorkersPage (Main Page)
├── SharedDataForm (Common data - client, branch, date)
├── MonthRangeSelector (14-month range viewer)
├── Tabs (5 tabs)
│   ├── Tab 0: AccountantTurnoverTab
│   ├── Tab 1: IsraeliWorkersTab
│   ├── Tab 2: LivingBusinessTab
│   ├── Tab 3: TurnoverApprovalTab
│   └── Tab 4: SalaryReportTab
│       ├── WorkerSelector (Combobox)
│       ├── NewWorkerForm
│       ├── SalaryTable (12 months × 2 fields)
│       └── WorkerEditDialog
├── Action Buttons
│   ├── Preview
│   └── Generate PDF
└── SharePdfPanel (After generation)
```

---

## Key Services Explained

### 1. ForeignWorkerService
**Purpose:** Manage foreign workers pool

**Key Functions:**

```typescript
// Find worker by passport number (exact match)
findByPassport(passportNumber: string): Promise<ForeignWorkerSearchResult | null>

// Create new OR update existing
// BLOCKS if passport exists at different client!
upsertWorker(dto: CreateForeignWorkerDto): Promise<UpsertWorkerResult>

// Get all workers for a branch
getBranchWorkers(branchId: string): Promise<ForeignWorker[]>

// Update worker
updateWorker(workerId: string, updates: UpdateForeignWorkerDto)
```

**Critical Business Rule:**
```typescript
// Passport uniqueness per tenant
// ✅ OK: Same passport at SAME client/branch
// ❌ ERROR: Same passport at DIFFERENT client

if (existing.client_id !== dto.client_id) {
  return {
    data: null,
    error: `Passport ${passport} already exists at another client`,
    existsAtOtherClient: true
  };
}
```

---

### 2. MonthlyDataService
**Purpose:** Manage rolling 14-month monthly data

**Static Utility Functions:**

```typescript
// Convert Date to month key (YYYY-MM-01)
dateToMonthKey(date: Date): string
// new Date('2025-01-15') -> '2025-01-01'

// Convert Date to Hebrew
dateToHebrew(date: Date): string
// new Date('2025-01-01') -> 'January 2025'

// Convert MM/YYYY to Date
mmYearToDate(mmYear: string): Date | null
// '01/2025' -> Date(2025, 0, 1)

// Convert Date to MM/YYYY
dateToMMYear(date: Date): string
// Date(2025, 0, 1) -> '01/2025'
```

**Month Range Functions:**

```typescript
// Get month range for a branch
getBranchMonthRange(branchId: string): Promise<MonthRange>

// Set/update month range
setBranchMonthRange(branchId, clientId, startMonth, endMonth)
```

**Monthly Reports Functions (Tabs 1+2):**

```typescript
// Get reports by type
getBranchMonthlyReports(
  branchId: string,
  reportType: 'accountant_turnover' | 'israeli_workers',
  limit: number = 14
): Promise<ClientMonthlyReport[]>

// Upsert single report
upsertBranchMonthlyReport(
  branchId, clientId, reportType, monthDate,
  data: { turnoverAmount?, employeeCount?, notes? }
)

// Bulk upsert - recommended for fast save
bulkUpsertBranchMonthlyReports(
  branchId, clientId, reportType,
  records: Array<{ month_date, turnover_amount?, employee_count? }>
)

// Delete old data
deleteOldBranchReports(branchId, reportType, beforeDate)
```

**Worker Monthly Data Functions (Tab 5):**

```typescript
// Get salary data for worker/branch
getBranchWorkerMonthlyData(
  branchId: string,
  workerId?: string,
  limit: number = 14
): Promise<WorkerMonthlyDataWithDetails[]>

// Upsert single worker monthly data
upsertBranchWorkerMonthlyData(
  branchId, clientId, workerId,
  monthDate, salary, supplement
)

// Bulk upsert - save all 12 months at once
bulkUpsertBranchWorkerMonthlyData(
  branchId, clientId, workerId,
  records: Array<{ month_date, salary, supplement }>
)

// Delete old data
deleteOldBranchWorkerData(branchId, beforeDate)
```

---

## Template Structure

### Template Location
```
public/templates/
├── components/
│   └── foreign-workers-header.html      <!-- Header shared by all 5 docs -->
└── bodies/
    └── foreign-workers/
        ├── accountant-turnover.html    <!-- Template Type: foreign_worker_accountant_turnover -->
        ├── israeli-workers.html       <!-- Template Type: foreign_worker_israeli_workers -->
        ├── living-business.html        <!-- Template Type: foreign_worker_living_business -->
        ├── turnover-approval.html     <!-- Template Type: foreign_worker_turnover_approval -->
        └── salary-report.html        <!-- Template Type: foreign_worker_salary_report -->
```

### Template Structure
```html
<!-- Header: foreign-workers-header.html -->
<!-- Variables: {{letter_date}}, {{recipient}} -->
<!-- CID Images: cid:tico_logo_new -->

<!-- Body: Template-specific -->
<!-- Variables: {{company_name}}, {{tax_id}}, ... -->

<!-- Footer (embedded in main generation) -->
```

---

## Business Rules & Logic

### Rule 1: Passport Uniqueness
- ✅ Passport unique per **tenant** (not global)
- ✅ Same passport OK at **same client** (even different branches)
- ❌ Same passport at **different client** = ERROR

### Rule 2: Month Range Limits
- Max: 14 months rolling history
- Display: Always show 12 months for documents
- Extend: Can extend range forward/backward as needed

### Rule 3: Auto-Save Before Generation
- Tabs 0, 1, 4 (monthly data) → Auto-save before PDF
- Tabs 2, 3 → No DB data to save

### Rule 4: Single Worker per Salary Report
- Salary Report (Tab 4) = ONE worker per PDF
- Worker selector chooses which worker
- Filename includes worker name: `Salary Report_Juan Pérez_Company XYZ.pdf`

### Rule 5: Signatures for Salary Report
- Fetch from client contacts:
  - `primaryContact` (is_primary=true) → Senior Manager
  - `accountant_manager` → Finance Manager
- Company stamp from `clients.signature_path`
- Signatures as base64 for PDF embedding

### Rule 6: Turnover Approval Scenarios
- Scenario A: 12+ months → Actual data
- Scenario B: 4-11 months → Actual + projected
- Scenario C: ≤3 months → Estimates from business plan
- Auto-calculate from Tab 1 (accountant turnover) data

### Rule 7: File Manager Integration
- Category: `foreign_worker_docs`
- Hebrew label: "אישורי עובדים זרים"
- Storage path: `letter-pdfs/{letterId}.pdf`
- After PDF generation → Delete from `generated_letters` (drafts not needed)

---

## Detailed Text for Each Document

### Shared Header Text
```html
<!-- Black line header text -->
Franco & Co. Certified Public Accountants (Isr.)

<!-- Recipient -->
Ministry of Interior - Population, Immigration and Border Crossings Authority
```

### Tab Labels & Descriptions
```typescript
const FOREIGN_WORKER_TABS = [
  { label: 'Accountant Turnover Report', description: 'Monthly turnover report - 12 months' },
  { label: 'Israeli Workers Report', description: 'Number of Israeli employees by month' },
  { label: 'Living Business 2025', description: 'Living business approval for Ministry of Interior' },
  { label: 'Turnover/Costs Approval', description: 'Turnover and costs approval - 3 scenarios' },
  { label: 'Salary Report', description: 'Salary report table - 12 months of work' }
];
```

### Form Labels (Hebrew)
```typescript
// Shared Data
'בחר לקוח'              // Select Client
'סניף'                  // Branch
'תאריך המסמך'        // Document Date
'שם החברה'             // Company Name
'ח.פ'                    // Tax ID

// Accountant Turnover
'דוח מחזורים רו"ח'    // Accountant Turnover Report
'אישור המסכם את הדיווחים למע"מ ב-12 החודשים'  // Approval summarizing VAT reports for 12 months
'חודש דיווח'           // Reporting Month
'סכום (ללא מע"מ)'     // Amount (Excluding VAT)
'סה"כ'                  // Total
'שמור'                  // Save
'רענן'                 // Refresh

// Israeli Workers
'דוח עובדים ישראליים'  // Israeli Workers Report
'חודש'                 // Month
'מספר עובדים'         // Number of Employees

// Living Business
'עסק חי 2025'           // Living Business 2025
'כמות עובדים זרים מומחים'  // Number of Foreign Expert Workers

// Turnover Approval
'אישור מחזור/עלויות'  // Turnover/Costs Approval
'בחר תרחיש'             // Choose Scenario
'א. פעילות של 12 חודשים ומעלה'       // A. Activity of 12+ months
'ב. פעילות של 4-11 חודשים'         // B. Activity of 4-11 months
'ג. פעילות של עד 3 חודשים'        // C. Activity of up to 3 months
'חודש התחלה'          // Start Month
'חודש סיום'              // End Month
'סך מחזור (ש"ח)'       // Total Turnover (₪)
'עלות הקמת העסק (ש"ח)'   // Business Establishment Costs (₪)
'בסיס להערכה'        // Estimate Basis

// Salary Report
'דוח שכר - מומחים זרים'  // Salary Report - Foreign Experts
'בחר עובד להזנת נתוני שכר'  // Select worker to enter salary data
'בחירת עובד'           // Worker Selection
'בחר עובד:'             // Select Worker:
'➕ הוסף עובד חדש'      // + Add New Worker
'פרטי עובד חדש:'       // New Worker Details:
'מספר דרכון'            // Passport Number
'שם מלא'                // Full Name
'נתינות'                // Nationality
'צור והוסף'            // Create and Add
'ערוך פרטי עובד'       // Edit Worker Details
'נתוני שכר - [שם עובד]'  // Salary Data - [Worker Name]
'חודש'                  // Month
'שכר בסיס (₪)'          // Base Salary (₪)
'תוספת (₪)'             // Supplement (₪)
'העתק לכל החודשים'    // Copy to All Months
'איפוס'                 // Reset
'שמור שינויים'          // Save Changes
```

### Toast Messages
```typescript
// Success
'המסמך "דוח מחזורים רו"ח" נוצר בהצלחה!'  // The document "Accountant Turnover Report" was created successfully!
'הנתונים נשמרו בהצלחה'              // Data saved successfully
'הערך ₪5,000 הועתק לכל החודשים'   // Value ₪5,000 copied to all months
'עובד נוצר בהצלחה'                    // Worker created successfully

// Error
'נא למלא את כל השדות הנדרשים'       // Please fill in all required fields
'שגיאה ביצירת המסמך'               // Error creating document
'שגיאה בשמירת נתונים'               // Error saving data
'שגיאה בטעינת נתונים'               // Error loading data
'דרכון 123456789 כבר קיים עבור לקוח אחר'  // Passport 123456789 already exists at another client
'אין ערך להעתקה'                      // No value to copy
'יש לבחור סניף'                         // Must select a branch
```

### Instructions Messages
```typescript
// Initial instructions
'הוראות:
1. מלא את הנתונים המשותפים למעלה (לקוח, תאריך, שם רואה חשבון)
2. בחר טאב של המסמך שברצונך ליצור
3. מלא את הנתונים הייחודיים למסמך
4. לחץ על "הפק מסמך PDF" ליצירת המסמך הסופי'
// Instructions:
// 1. Fill in the shared data above (client, date, CPA name)
// 2. Select the tab of the document you want to create
// 3. Fill in the unique data for the document
// 4. Click "Generate PDF Document" to create the final document

// Validation messages
'יש למלא את כל השדות המסומנים ב- לפני מעבר לטאבים'
'יש לבחור תרחיש ולמלא את כל השדות הנדרשים'
'יש לאתחל טווח חודשים לצפייה ועריכת נתונים חודשיים'
// Must fill all fields marked * before moving to tabs
// Must select scenario and fill in all required fields
// Must initialize month range for viewing and editing monthly data

// Info boxes
'הערה: הנתונים נשמרים בבסיס הנתונים. לחץ "שמור" לשמירת שינויים.
ניתן לנהל את טווח החודשים באמצעות כפתור הטווח למעלה.'
// Note: Data is saved in the database. Click "Save" to save changes.
// You can manage the month range using the range selector above.
```

---

## Step-by-Step Implementation Guide

### Step 1: Database Setup
```sql
-- Run migrations in order
supabase/migrations/129_add_foreign_worker_docs_category.sql
supabase/migrations/130_foreign_workers_table.sql
supabase/migrations/133_foreign_worker_monthly_data.sql
```

### Step 2: Create Types
```typescript
// src/types/foreign-worker.types.ts
export interface ForeignWorker {
  id: string;
  tenant_id: string;
  client_id: string;
  branch_id: string;
  passport_number: string;  // PRIMARY KEY per tenant
  full_name: string;
  nationality: string | null;
  salary: number;
  supplement: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// src/types/foreign-workers.types.ts
export interface ForeignWorkerSharedData {
  company_name: string;
  tax_id: string;
  document_date: string;  // YYYY-MM-DD
}

export interface AccountantTurnoverVariables extends ForeignWorkerSharedData {
  monthly_turnover: MonthlyTurnover[];
  total_turnover?: number;
  period_start?: string;  // MM/YYYY
  period_end?: string;    // MM/YYYY
}

// ... other document types
```

### Step 3: Create Services
```typescript
// src/services/foreign-worker.service.ts
export class ForeignWorkerService extends BaseService {
  static async findByPassport(passportNumber: string) {
    // RPC call: find_worker_by_passport
  }

  static async upsertWorker(dto: CreateForeignWorkerDto) {
    // Check existing
    const existing = await this.findByPassport(dto.passport_number);
    if (existing && existing.client_id !== dto.client_id) {
      return { error: 'Passport exists at other client', existsAtOtherClient: true };
    }
    // Insert or update
  }
}

// src/services/monthly-data.service.ts
export class MonthlyDataService extends BaseService {
  // Static utilities for date conversion
  static dateToMonthKey(date: Date): string { ... }
  static dateToHebrew(date: Date): string { ... }
  static dateToMMYear(date: Date): string { ... }

  // Branch monthly reports (tabs 1+2)
  async getBranchMonthlyReports(branchId, reportType, limit = 14) { ... }
  async bulkUpsertBranchMonthlyReports(branchId, clientId, reportType, records) { ... }

  // Worker monthly data (tab 5)
  async getBranchWorkerMonthlyData(branchId, workerId, limit = 14) { ... }
  async bulkUpsertBranchWorkerMonthlyData(branchId, clientId, workerId, records) { ... }
}
```

### Step 4: Create Tabs
```typescript
// Tab 0: AccountantTurnoverTab.tsx
export const AccountantTurnoverTab = forwardRef<AccountantTurnoverTabRef, Props>(
  function AccountantTurnoverTab({ value, onChange, clientId, branchId }, ref) {
    const { range, displayMonths } = useMonthRange();
    const [monthData, setMonthData] = useState<Map<string, number>>(new Map());

    // Load data when branch/range changes
    useEffect(() => {
      if (branchId && range) loadData();
    }, [branchId, range]);

    // Sync with parent
    useEffect(() => {
      const monthlyTurnover = displayMonths.map(date => ({
        month: MonthlyDataService.dateToHebrew(date),
        amount: monthData.get(MonthlyDataService.dateToMonthKey(date)) || 0
      }));
      onChange({ ...value, monthly_turnover: monthlyTurnover });
    }, [monthData, displayMonths]);

    // Render table with MoneyInput for each month
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accountant Turnover Report</CardTitle>
        </CardHeader>
        <CardContent>
          <table>
            {displayMonths.map(date => (
              <tr key={date}>
                <td>{MonthlyDataService.dateToHebrew(date)}</td>
                <td>
                  <MoneyInput
                    value={monthData.get(MonthlyDataService.dateToMonthKey(date)) || ''}
                    onChange={(val) => handleAmountChange(monthKey, val)}
                  />
                </td>
              </tr>
            ))}
          </table>
          <Button onClick={handleSave}>Save</Button>
        </CardContent>
      </Card>
    );
  }
);

// Expose save() via ref for auto-save
useImperativeHandle(ref, () => ({
  save: async () => await handleSave()
}));
```

### Step 5: Create PDF Generation
```typescript
// src/modules/letters/services/template.service.ts
async generateForeignWorkerDocument(
  templateType: ForeignWorkerTemplateType,
  clientId: string,
  variables: ForeignWorkerVariables
) {
  // 1. Load template components
  const header = await this.loadTemplateFile('components/foreign-workers-header.html');
  const bodyFile = BODY_FILES[templateType];
  const body = await this.loadTemplateFile(`bodies/foreign-workers/${bodyFile}`);
  const footer = await this.loadTemplateFile('components/footer.html');

  // 2. Generate dynamic table rows
  let processedBody = body;
  if (templateType === 'foreign_worker_accountant_turnover') {
    const rows = variables.monthly_turnover.map(m =>
      `<tr><td>₪${m.amount.toLocaleString('he-IL')}</td><td>${m.month}</td></tr>`
    ).join('');
    processedBody = body.replace('{{monthly_turnover_rows}}', rows);
  }

  if (templateType === 'foreign_worker_salary_report') {
    const rows = variables.workers_data.map(w =>
      `<tr><td>${w.full_name}</td><td>${w.passport_number}</td><td>${w.month}</td>...</tr>`
    ).join('');
    processedBody = body.replace('{{workers_data_rows}}', rows);
  }

  // 3. Replace variables
  const html = header + processedBody + footer;
  const processedHtml = this.replaceVariables(html, {
    letter_date: formatDateToHebrew(variables.document_date),
    recipient: 'Ministry of Interior - Population, Immigration and Border Crossings Authority',
    company_name: variables.company_name,
    tax_id: variables.tax_id,
    ...variables
  });

  // 4. Embed images as CID
  const finalHtml = await this.embedImagesAsCid(processedHtml);

  // 5. Save to generated_letters table
  const { data: letter } = await supabase
    .from('generated_letters')
    .insert({
      tenant_id: await getTenantId(),
      client_id: clientId,
      template_type: templateType,
      variables: JSON.stringify(variables),
      generated_content_html: finalHtml,
      subject: generateSubject(templateType, variables)
    })
    .select()
    .single();

  return { data: letter, error: null };
}
```

### Step 6: Generate PDF and Save to File Manager
```typescript
// In ForeignWorkersPage.tsx - handleGenerateDocument()
const handleGenerateDocument = async () => {
  // 1. Generate document (HTML)
  const result = await templateService.generateForeignWorkerDocument(
    tab.templateType,
    selectedClientId,
    variables
  );

  // 2. Generate PDF via Edge Function
  const { data: pdfData } = await supabase.functions.invoke('generate-pdf', {
    body: { letterId: result.data.id }
  });

  // 3. Save PDF reference to File Manager
  await fileUploadService.savePdfReference(
    selectedClientId,
    `letter-pdfs/${result.data.id}.pdf`,
    pdfFileName,
    'foreign_worker_docs',  // Category
    description
  );

  // 4. Delete from generated_letters (drafts not needed)
  await supabase.from('generated_letters').delete().eq('id', result.data.id);

  // 5. Show share panel
  setShowSharePanel(true);
  setGeneratedPdfUrl(pdfData.pdfUrl);
};
```

### Step 7: Add Templates to Folder
```bash
# Create templates
templates/components/foreign-workers-header.html
templates/bodies/foreign-workers/accountant-turnover.html
templates/bodies/foreign-workers/israeli-workers.html
templates/bodies/foreign-workers/living-business.html
templates/bodies/foreign-workers/turnover-approval.html
templates/bodies/foreign-workers/salary-report.html

# Sync to public/templates
npm run sync-templates
```

---

## Testing Checklist

### Database Tests
- [ ] Passport uniqueness per tenant
- [ ] Same passport at same client (branches) = OK
- [ ] Same passport at different client = ERROR
- [ ] Month range upsert (create/update)
- [ ] Monthly reports upsert (bulk)
- [ ] Worker monthly data upsert (bulk)
- [ ] Deletion of old data (before date)

### UI Tests
- [ ] Client selector loads clients
- [ ] Branch selector loads branches
- [ ] Date picker defaults to today
- [ ] Tabs disabled until shared data complete
- [ ] Month range initializer appears when no range
- [ ] Month range selector allows extending past/future
- [ ] Accountant Turnover: loads and saves monthly data
- [ ] Israeli Workers: loads and saves monthly data
- [ ] Living Business: saves expert count
- [ ] Turnover Approval: scenario selection and auto-fill
- [ ] Salary Report: worker selector, salary grid, copy buttons
- [ ] Preview generates HTML correctly
- [ ] PDF generation succeeds
- [ ] PDF saved to File Manager
- [ ] Share panel opens with correct details

### Integration Tests
- [ ] Generate Tab 0 → PDF in File Manager
- [ ] Generate Tab 1 → PDF in File Manager
- [ ] Generate Tab 2 → PDF in File Manager
- [ ] Generate Tab 3 (all 3 scenarios) → PDF in File Manager
- [ ] Generate Tab 4 → PDF in File Manager with worker name in filename
- [ ] Signature images embedded correctly in PDF (Tab 4)
- [ ] Auto-save before generation (Tabs 0, 1, 4)
- [ ] Draft deleted after PDF generation

---

## Common Pitfalls

### ❌ Don't Do
```typescript
// WRONG: Query without tenant_id
supabase.from('foreign_workers').select('*')

// WRONG: Use global passport uniqueness
UNIQUE(passport_number)  // Wrong! Should be UNIQUE(tenant_id, passport_number)

// WRONG: Save each month individually
for (const month of months) {
  await upsertReport(branchId, month); // Slow!
}

// WRONG: Generate PDF without saving
await generatePDF(); // Data might be lost
```

### ✅ Do Instead
```typescript
// CORRECT: Always include tenant_id
const tenantId = await getTenantId();
supabase.from('foreign_workers').select('*').eq('tenant_id', tenantId)

// CORRECT: Use composite unique constraint
UNIQUE(tenant_id, passport_number)

// CORRECT: Use bulk upsert for performance
await bulkUpsertBranchMonthlyReports(branchId, clientId, reportType, records);

// CORRECT: Auto-save before generation
await saveCurrentTabData();
await generatePDF();
```

---

## Related Files Reference

### Database Migrations
```
supabase/migrations/129_add_foreign_worker_docs_category.sql
supabase/migrations/130_foreign_workers_table.sql
supabase/migrations/133_foreign_worker_monthly_data.sql
```

### Types
```
src/types/foreign-worker.types.ts
src/types/foreign-workers.types.ts
src/types/monthly-data.types.ts
```

### Services
```
src/services/foreign-worker.service.ts
src/services/monthly-data.service.ts
src/modules/letters/services/template.service.ts
```

### Components
```
src/pages/ForeignWorkersPage.tsx
src/components/foreign-workers/SharedDataForm.tsx
src/components/foreign-workers/BranchSelector.tsx
src/components/foreign-workers/WorkerEditDialog.tsx
src/components/foreign-workers/tabs/AccountantTurnoverTab.tsx
src/components/foreign-workers/tabs/IsraeliWorkersTab.tsx
src/components/foreign-workers/tabs/LivingBusinessTab.tsx
src/components/foreign-workers/tabs/TurnoverApprovalTab.tsx
src/components/foreign-workers/tabs/SalaryReportTab.tsx
```

### Templates
```
templates/components/foreign-workers-header.html
templates/bodies/foreign-workers/accountant-turnover.html
templates/bodies/foreign-workers/israeli-workers.html
templates/bodies/foreign-workers/living-business.html
templates/bodies/foreign-workers/turnover-approval.html
templates/bodies/foreign-workers/salary-report.html
```

---

## Summary

The Foreign Workers Approvals system manages:
1. **Foreign Workers Pool** with passport-based unique identification per tenant
2. **Rolling Monthly Data** (14 months) for each branch
3. **5 Document Types** with HTML templates and PDF conversion
4. **File Manager Integration** for saving PDFs in a dedicated category

**Key Implementation Notes:**
- RTL alignment (Hebrew)
- Tenant isolation (`tenant_id` in all queries)
- Passport uniqueness per tenant (not global)
- Branch-based data storage
- Auto-save before generation
- Signature embedding for salary reports
- Template-based HTML generation

This documentation contains all the information needed to build the system from scratch, including code, detailed text, and business rules.
