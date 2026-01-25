# אישורי עובדים זרים - מדריך מלא לבנייה

## מבט כללי (Overview)

מערכת ליצירת 5 סוגי אישורים למשרד הפנים - רשות האוכלוסין ההגירה ומעברי גבול. המערכת מנהלת נתונים חודשיים רולינג (14 חודשים) לכל סניף ומאפשרת יצירת PDF מותאמים אישית לכל לקוח.

### 5 סוגי המסמכים
1. **דוח מחזורים רו"ח** (Accountant Turnover) - טבלת מחזורים חודשיים ל-12 חודשים
2. **דוח עובדים ישראליים** (Israeli Workers) - מספר עובדים ישראליים לפי חודשים
3. **עסק חי 2025** (Living Business) - אישור עסק חי פשוט
4. **אישור מחזור/עלויות** (Turnover Approval) - 3 תרחישים שונים לפי וותק החברה
5. **דוח שכר** (Salary Report) - טבלת שכר לעובדים זרים עם חתימות

---

## ארכיטקטורת מערכת

### טבלאות מסד הנתונים

#### 1. `foreign_workers` - מאגר עובדים זרים
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

**חשוב:** דרכון הוא מזהה ייחודי לכל tenant - לא יכול להיות אותו דרכון בשני לקוחות שונים!

#### 2. `foreign_worker_monthly_data` - נתוני שכר חודשיים (טאב 5)
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

#### 3. `client_monthly_reports` - דוחות חודשיים ללקוח (טאבים 1+2)
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

#### 4. `client_month_range` - טווח חודשים לכל סניף
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

## הסבר מפורט של כל מסמך

### מסמך #1: דוח מחזורים רו"ח (Accountant Turnover)

**תכלית:** אישור רו"ח המסכם את הדיווחים למע"מ ב-12 החודשים שקדמו להגשת הבקשה

**נתונים נדרשים:**
- שם החברה (`company_name`)
- ח.פ (`tax_id`)
- טבלת מחזורים חודשיים (`monthly_turnover[]`)

**מבנה הטבלה:**
```typescript
interface MonthlyTurnover {
  month: string;        // "ינואר 2024"
  amount: number;       // ₪ amount (without VAT)
}
```

**דוגמת טקסט המסמך:**
```
אישור רו"ח המסכם את הדיווחים למע"מ ב-12 החודשים שקדמו להגשת הבקשה בגין סכומי העסקאות של המבקשת

כרואי החשבון של המבקשת [שם החברה] מספר מזהה [ח.פ] הרינו לדווח לכם את סכומי העסקאות (לא כולל מע"מ) של המבקשת בלבד בכל אחד מהחודשים המפורטים להלן:

| סה"כ עסקאות ללא מע"מ | חודש דיווח |
|----------------------|------------|
| ₪150,000           | ינואר 2024 |
| ₪180,000           | פברואר 2024 |
| ...                 | ...        |

[חתימת רואה החשבון]
```

---

### מסמך #2: דוח עובדים ישראליים (Israeli Workers)

**תכלית:** דיווח מספר עובדים ישראליים לפי חודשים

**נתונים נדרשים:**
- שם החברה (`company_name`)
- ח.פ (`tax_id`)
- טבלת עובדים לפי חודשים (`israeli_workers[]`)
- ממוצע עובדים (`average_workers`)

**מבנה הטבלה:**
```typescript
interface MonthlyWorkers {
  month: string;          // "ינואר 2024"
  employee_count: number; // Number of employees
}
```

**דוגמת טקסט המסמך:**
```
הנדון: דוח מיוחד של רואה חשבון בדבר מספר עובדים ישראליים לתקופה [תאריך התחלה] - [תאריך סיום]

לבקשת חברת [שם החברה] ח.פ/ע.מ [ח.פ] ביקרנו את הנתונים בדבר מספר העובדים הישראליים... הממוצע לתקופה הוא [מספר] עובדים.

| חודש | מספר עובדים |
|-------|-------------|
| ינואר 2024 | 15 |
| פברואר 2024 | 16 |
| ...         | ... |
| סה"כ ממוצע: | 15.5 |
```

---

### מסמך #3: עסק חי 2025 (Living Business)

**תכלית:** אישור עסק חי למשרד הפנים

**נתונים נדרשים:**
- שם החברה (`company_name`)
- ח.פ (`tax_id`)
- מספר עובדים מומחים זרים (`foreign_experts_count`)

**דוגמת טקסט המסמך:**
```
הנדון: [שם החברה] ח.פ. [ח.פ]

בהמשך לבקשתם מחברת [שם החברה] ח.פ. [ח.פ] להלן אישור כי:

1. החברה הינה חברה פעילה.
2. לא נרשמה לחברה ולא עתידה להירשם לחברה הערת עסק חי בשנים 2024 – 2025.
3. יתרה מזאת מעולם לא נרשמה הערת אזהרה עסק חי בדוחות המבוקרים של החברה מיום היווסדה, ואנו בטוחים ברמת מובהקות גבוהה כי לא תירשם הערה כזאת בשנים הבאות.
4. החברה תעסיק [מספר] עובדים מומחים זרים ותוכל לעמוד בעלות העסקתם של אותם עובדים, אשר לא תפחת משכר השווה לכפל השכר הממוצע במשק.

[חתימת רואה החשבון]
```

---

### מסמך #4: אישור מחזור/עלויות (Turnover Approval)

**תכלית:** נספח א' - אישור רו"ח על מחזור כספי מפעילות אסייתית / עלות הקמת עסק

**3 תרחישים לפי וותק החברה:**

#### תרחיש א: 12 חודשים ומעלה
**למי:** מסעדות בעלות פעילות כספית של 12 חודשים לפחות

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

#### תרחיש ב: 4-11 חודשים
**למי:** מסעדות בעלות פעילות כספית של 4 עד 11 חודשים (כולל)

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

**חישוב:** חישוב ליניארי ל-12 חודשים
```
projected_annual = (actual / months_count) * 12
```

#### תרחיש ג: עד 3 חודשים
**למי:** מסעדות בעלות פעילות כספית של עד 3 חודשים (כולל)

```typescript
{
  scenario: 'up_to_3',
  scenario_up_to_3: {
    estimated_annual_turnover: 2500000,  // ₪ (from business plan)
    estimated_annual_costs: 1800000,     // ₪ (from business plan)
    estimate_basis: 'תוכנית עסקית מאושרת מיום 01/01/2024'
  }
}
```

**דוגמת טקסט המסמך (תרחיש א):**
```
נספח א' - אישור רו"ח על מחזור כספי מפעילות אסייתית

לבקשת חברת [שם החברה] ח.פ. [ח.פ], להלן אישורנו כי:

המחזור הכספי המצטבר בתקופה [תחלה] - [סיום] הסתכם בסך ₪[מחזור].

העלויות שנשאה החברה בתקופה זו הסתכמו בסך ₪[עלויות].

[חתימת רואה החשבון]
```

---

### מסמך #5: דוח שכר (Salary Report)

**תכלית:** דוח מיוחד של רואה חשבון בדבר נתונים על תשלום שכר למומחים זרים

**נתונים נדרשים:**
- שם החברה (`company_name`)
- ח.פ (`tax_id`)
- תקופת דיווח (`period_start` - `period_end`)
- טבלת נתוני עובדים (`workers_data[]`)
- חתימות:
  - מנהל בכיר (`senior_manager_name`, `senior_manager_title`, `senior_manager_signature`)
  - אחראי כספים (`finance_manager_name`, `finance_manager_title`, `finance_manager_signature`)
  - חותמת חברה (`company_stamp_signature`)

**מבנה הטבלה (עובד בודד - כל מסמך הוא לעובד אחד):**
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

**דוגמת טקסט המסמך:**
```
הנדון: דוח מיוחד של רואה חשבון בדבר נתונים על תשלום שכר למומחים זרים לתקופה 01/01/2024 - 31/12/2024

לבקשת חברת [שם החברה] ח.פ/ע.מ [ח.פ] ביקרנו את הנתונים בדבר תשלום שכר למומחים זרים... דוח זה הינו באחריות הנהלת החברה. אחריותנו היא לחוות דעה על הדוח הנ"ל בהתבסס על ביקורתנו.

לדעתנו, הנתונים הכלולים בדו"ח הנ"ל של החברה תואמים, מכל הבחינות המהותיות את הרשומות והאסמכתאות עליהם התבסס הדוח.

**נתונים על תשלום שכר למומחים זרים (*)**

| שם מלא | מספר דרכון | חודש דיווח (**) | נתינות | שכר בסיס (***) | תשלומים נוספים (****) |
|---------|-------------|------------------|---------|----------------|---------------------|
| Juan Perez | 123456789 | 01/2024 | מקסיקו | ₪8,000 | ₪500 |
| Juan Perez | 123456789 | 02/2024 | מקסיקו | ₪8,000 | ₪600 |
| ...       | ...         | ...             | ...     | ...            | ...                 |

(*) הדוח מתייחס לשכר ששולם בפועל לעובדים במהלך התקופה הנבדקת.
(**) חודש הדיווח מתייחס לחודש בו שולם השכר.
(***) שכר בסיס כולל משכורת חודשית בסיסית לפני ניכויים.
(****) תשלומים נוספים כוללים בונוסים, שעות נוספות, ותוספות אחרות.

**הרינו להצהיר על נכונות הנתונים:**

+-------------------------------+-------------------------------+
| המנהל הבכיר בתאגיד      | האחראי לענייני כספים |
|                               | וחשבונות                 |
|-------------------------------|-------------------------------|
| שם: [שם מנהל]              | שם: [שם כספים]           |
| תפקיד: מנהל               | תפקיד: מנהלת חשבונות  |
| חתימה: [תמונת חתימה]    | חתימה: [תמונת חתימה]    |
+-------------------------------+-------------------------------+

+---------------------------------------+
|             חותמת החברה              |
|            [תמונת חותמת]            |
+---------------------------------------+

[חתימת רואה החשבון]
```

---

## מבנה ה-UI Components

### עץ הקומפוננטות
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
**תפקיד:** ניהול מאגר עובדים זרים

**פונקציות מרכזיות:**

```typescript
// חיפוש עובד לפי מספר דרכון (exact match)
findByPassport(passportNumber: string): Promise<ForeignWorkerSearchResult | null>

// יצירה חדשה או עדכון קיים
// חוסם אם הדרכון קיים בלקוח אחר!
upsertWorker(dto: CreateForeignWorkerDto): Promise<UpsertWorkerResult>

// קבלת כל העובדים של סניף
getBranchWorkers(branchId: string): Promise<ForeignWorker[]>

// עדכון עובד
updateWorker(workerId: string, updates: UpdateForeignWorkerDto)
```

**Business Rule קריטי:**
```typescript
// Passport uniqueness per tenant
// ✅ OK: Same passport at SAME client/branch
// ❌ ERROR: Same passport at DIFFERENT client

if (existing.client_id !== dto.client_id) {
  return {
    data: null,
    error: `דרכון ${passport} כבר קיים עבור לקוח אחר`,
    existsAtOtherClient: true
  };
}
```

---

### 2. MonthlyDataService
**תפקיד:** ניהול נתונים חודשיים רולינג (14 חודשים)

**פונקציות עזר (Static Utilities):**

```typescript
// המרת Date למפתח חודש (YYYY-MM-01)
dateToMonthKey(date: Date): string
// new Date('2025-01-15') -> '2025-01-01'

// המרת Date לעברית
dateToHebrew(date: Date): string
// new Date('2025-01-01') -> 'ינואר 2025'

// המרת MM/YYYY ל-Date
mmYearToDate(mmYear: string): Date | null
// '01/2025' -> Date(2025, 0, 1)

// המרת Date ל-MM/YYYY
dateToMMYear(date: Date): string
// Date(2025, 0, 1) -> '01/2025'
```

**פונקציות Month Range:**

```typescript
// קבלת טווח חודשים לסניף
getBranchMonthRange(branchId: string): Promise<MonthRange>

// הגדרת/עדכון טווח חודשים
setBranchMonthRange(branchId, clientId, startMonth, endMonth)
```

**פונקציות דוחות חודשיים (טאבים 1+2):**

```typescript
// קבלת דוחות לפי סוג
getBranchMonthlyReports(
  branchId: string,
  reportType: 'accountant_turnover' | 'israeli_workers',
  limit: number = 14
): Promise<ClientMonthlyReport[]>

// עדכון דוח בודד
upsertBranchMonthlyReport(
  branchId, clientId, reportType, monthDate,
  data: { turnoverAmount?, employeeCount?, notes? }
)

// Bulk upsert - ממומלץ לשמירה מהירה
bulkUpsertBranchMonthlyReports(
  branchId, clientId, reportType,
  records: Array<{ month_date, turnover_amount?, employee_count? }>
)

// מחיקת נתונים ישנים
deleteOldBranchReports(branchId, reportType, beforeDate)
```

**פונקציות נתוני עובדים (טאב 5):**

```typescript
// קבלת נתוני שכר לעובד/סניף
getBranchWorkerMonthlyData(
  branchId: string,
  workerId?: string,
  limit: number = 14
): Promise<WorkerMonthlyDataWithDetails[]>

// עדכון נתוני עובד בודד
upsertBranchWorkerMonthlyData(
  branchId, clientId, workerId,
  monthDate, salary, supplement
)

// Bulk upsert - שמירת כל 12 החודשים בבת אחת
bulkUpsertBranchWorkerMonthlyData(
  branchId, clientId, workerId,
  records: Array<{ month_date, salary, supplement }>
)

// מחיקת נתונים ישנים
deleteOldBranchWorkerData(branchId, beforeDate)
```

---

## תבניות המסמכים (Templates)

### מיקום התבניות
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

### מבנה ה-Template
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
- Filename includes worker name: `דוח שכר_Juan Pérez_חברת XYZ.pdf`

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

## טקסטים מדויקים לכל מסמך

### Shared Header Text
```html
<!-- Black line header text -->
Franco & Co. Certified Public Accountants (Isr.)

<!-- Recipient -->
למשרד הפנים - רשות האוכלוסין ההגירה ומעברי גבול
```

### Tab Labels & Descriptions
```typescript
const FOREIGN_WORKER_TABS = [
  { label: 'דוח מחזורים רו"ח', description: 'דוח מחזורים חודשי - 12 חודשים' },
  { label: 'דוח עובדים ישראליים', description: 'מספר עובדים ישראליים לפי חודשים' },
  { label: 'עסק חי 2025', description: 'אישור עסק חי למשרד הפנים' },
  { label: 'אישור מחזור/עלויות', description: 'אישור מחזור ועלויות - 3 תרחישים' },
  { label: 'דוח שכר', description: 'טבלת דוח שכר - 12 חודשי עבודה' }
];
```

### Form Labels (Hebrew)
```typescript
// Shared Data
'בחר לקוח'
'סניף'
'תאריך המסמך'
'שם החברה'
'ח.פ'

// Accountant Turnover
'דוח מחזורים רו"ח'
'אישור המסכם את הדיווחים למע"מ ב-12 החודשים'
'חודש דיווח'
'סכום (ללא מע"מ)'
'סה"כ'
'שמור'
'רענן'

// Israeli Workers
'דוח עובדים ישראליים'
'חודש'
'מספר עובדים'

// Living Business
'עסק חי 2025'
'כמות עובדים זרים מומחים'

// Turnover Approval
'אישור מחזור/עלויות'
'בחר תרחיש'
'א. פעילות של 12 חודשים ומעלה'
'ב. פעילות של 4-11 חודשים'
'ג. פעילות של עד 3 חודשים'
'חודש התחלה'
'חודש סיום'
'סך מחזור (ש"ח)'
'עלות הקמת העסק (ש"ח)'
'בסיס להערכה'

// Salary Report
'דוח שכר - מומחים זרים'
'בחר עובד להזנת נתוני שכר'
'בחירת עובד'
'בחר עובד:'
'➕ הוסף עובד חדש'
'פרטי עובד חדש:'
'מספר דרכון'
'שם מלא'
'נתינות'
'צור והוסף'
'ערוך פרטי עובד'
'נתוני שכר - [שם עובד]'
'חודש'
'שכר בסיס (₪)'
'תוספת (₪)'
'העתק לכל החודשים'
'איפוס'
'שמור שינויים'
```

### Toast Messages
```typescript
// Success
'המסמך "דוח מחזורים רו"ח" נוצר בהצלחה!'
'הנתונים נשמרו בהצלחה'
'הערך ₪5,000 הועתק לכל החודשים'
'עובד נוצר בהצלחה'

// Error
'נא למלא את כל השדות הנדרשים'
'שגיאה ביצירת המסמך'
'שגיאה בשמירת נתונים'
'שגיאה בטעינת נתונים'
'דרכון 123456789 כבר קיים עבור לקוח אחר'
'אין ערך להעתקה'
'יש לבחור סניף'
```

### Instructions Messages
```typescript
// Initial instructions
'הוראות:
1. מלא את הנתונים המשותפים למעלה (לקוח, תאריך, שם רואה חשבון)
2. בחר טאב של המסמך שברצונך ליצור
3. מלא את הנתונים הייחודיים למסמך
4. לחץ על "הפק מסמך PDF" ליצירת המסמך הסופי'

// Validation messages
'יש למלא את כל השדות המסומנים ב- לפני מעבר לטאבים'
'יש לבחור תרחיש ולמלא את כל השדות הנדרשים'
'יש לאתחל טווח חודשים לצפייה ועריכת נתונים חודשיים'

// Info boxes
'הערה: הנתונים נשמרים בבסיס הנתונים. לחץ "שמור" לשמירת שינויים.
ניתן לנהל את טווח החודשים באמצעות כפתור הטווח למעלה.'
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

## סיכום

מערכת אישורי עובדים זרים מנהלת:
1. **מאגר עובדים זרים** עם זיהוי דרכון ייחודי לכל tenant
2. **נתונים חודשיים רולינג** (14 חודשים) לכל סניף
3. **5 סוגי מסמכים** עם תבניות HTML והמרה ל-PDF
4. **שילוב File Manager** לשמירת ה-PDFs תחת קטגוריה ייעודית

**נקודות מפתח:**
- RTL alignment (עברית)
- Tenant isolation (`tenant_id` בכל query)
- Passport uniqueness per tenant (לא global)
- Branch-based data storage
- Auto-save before generation
- Signature embedding for salary reports
- Template-based HTML generation

הדוקומנטציה הזו מכילה את כל המידע הנדרש לבניית המערכת מההתחלה, כולל קוד, טקסטים מדויקים, ו-business rules.
