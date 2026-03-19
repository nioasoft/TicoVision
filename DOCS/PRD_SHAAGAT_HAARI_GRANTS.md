# PRD: מודול מענקי "שאגת הארי" — TicoVision

> **גרסה:** 2.1 | **תאריך:** 17/03/2026
> **שינויים ב-2.1:** שלב 0 גיוס, טופס היתכנות, איסוף נתוני שכר, הגשה חובה (מספר+צילום), פירוט הוצאות, רשימת בנקים, relevance toggle, timeline, manual approval, process hub, backup, ייצוא Excel
>
> **מקור נוסחאות:** `DOCS/SHAAGAT_HAARI_FORMULAS.md` (מקור אמת יחיד)
> **מקור חוקי:** מצגת לשכת יועצי מס (ירון גינדי) — `DOCS/SHAAGAT_HAARI_PRESENTATION_TRANSCRIPT.md`
> **סטטוס חוק:** טרם אושר ונחקק

---

## 1. סקירה כללית

### 1.1 מהות המודול

מודול לניהול תהליך מענקי פיצוי ממשלתיים בגין נזקי מלחמת **"שאגת הארי"** עבור לקוחות משרד רואי חשבון. המודול מנהל את כל שרשרת הטיפול: בדיקת זכאות, חישוב סכום מענק, גביית דמי טיפול, שידור לרשות המיסים ומעקב עד קבלת הכספים.

המודול תומך ב-**6 מסלולי חישוב שונים** (standard, small, cash_basis, new_business, northern, contractor) — כל אחד עם תקופות השוואה ומאפיינים ייחודיים.

### 1.2 משתמשים

| תפקיד | גישה |
|--------|-------|
| **מנהל/רואה חשבון** | גישה מלאה: בדיקת זכאות, חישובים, שליחת מיילים, מעקב |
| **פקיד/מזכירות** | צפייה, עדכון סטטוסים בסיסיים |
| **לקוח חיצוני** | מילוי טפסים חיצוניים (פרטי בנק, אישור מענק) דרך לינקים עם טוקן |

### 1.3 הקשר ל-TicoVision

המודול ישתלב כמודול חדש במערכת TicoVision הקיימת:
- ישתמש ב-**clients** הקיימים (לא DB חדש)
- ישתלב ב-**תפריט הניווט** הראשי
- יעקוב אחרי **הפטרנים הקיימים** (BaseService, Zustand, shadcn/ui)
- כל הטבלאות עם **tenant_id** ו-RLS
- **דמי טיפול קבועים:** 1,350 + מע"מ לכל הטננטים (לא configurable)

---

## 2. לוגיקת חישוב — מקור אמת יחיד

> **חשוב מאוד:** כל החישובים חייבים להתבצע דרך פונקציה/utility אחת בלבד.
> אין לשכפל לוגיקת חישוב בין קומפוננטות, שירותים או API routes.
>
> **מקור אמת לנוסחאות:** `DOCS/SHAAGAT_HAARI_FORMULAS.md`
> **קובץ חישוב:** `src/modules/shaagat-haari/lib/grant-calculations.ts`
> **קובץ קבועים:** `src/modules/shaagat-haari/lib/grant-constants.ts`
>
> כל חישוב — בכל מקום במערכת — יקרא מקבצים אלו בלבד.

### 2.1 קבועים (Constants)

```typescript
// src/modules/shaagat-haari/lib/grant-constants.ts

export const GRANT_CONSTANTS = {
  // ────────────── ספי זכאות ──────────────

  // חד חודשי
  MONTHLY_THRESHOLDS: {
    GRAY_AREA_FACTOR: 0.92,     // תחום אפור = 92% מהסף המינימלי
    MIN_THRESHOLD: 25,           // סף מינימלי לזכאות (%)
    TIER_1: { min: 25, max: 40, rate: 7 },    // 25-40% → 7%
    TIER_2: { min: 40, max: 60, rate: 11 },    // 40-60% → 11%
    TIER_3: { min: 60, max: 80, rate: 15 },    // 60-80% → 15%
    TIER_4: { min: 80, max: 100, rate: 22 },   // 80-100% → 22%
  },

  // דו חודשי
  BIMONTHLY_THRESHOLDS: {
    GRAY_AREA_FACTOR: 0.92,
    MIN_THRESHOLD: 12.5,
    TIER_1: { min: 12.5, max: 20, rate: 7 },   // 12.5-20% → 7%
    TIER_2: { min: 20, max: 30, rate: 11 },     // 20-30% → 11%
    TIER_3: { min: 30, max: 40, rate: 15 },     // 30-40% → 15%
    TIER_4: { min: 40, max: 50, rate: 22 },     // 40-50% → 22%
  },

  // ────────────── קבועי שכר ──────────────

  SALARY: {
    REGULAR_MULTIPLIER: 1.25,    // מכפיל שכר לעסקים רגילים
    NGO_MULTIPLIER: 1.325,       // מכפיל שכר לעמותות/מלכ"רים
    GRANT_FACTOR: 0.75,          // 75% מהשכר המותאם
    CAP_PER_EMPLOYEE: 13_773,    // שכר ממוצע במשק (₪)
  },

  // ────────────── תקרת מענק כוללת ──────────────

  GRANT_CAP: {
    DEFAULT: 600_000,            // תקרת ברירת מחדל (₪)
    MAX: 1_200_000,              // תקרה מקסימלית (₪)
    TIER_START: 100_000_000,     // מחזור שנתי שמתחילה ממנו תקרה גבוהה יותר
    TIER_END: 300_000_000,       // מחזור שנתי שמסתיימת בו נוסחת תקרה
    RATE: 0.003,                 // שיעור תוספת תקרה
  },

  // ────────────── טווח מחזור שנתי ──────────────

  ANNUAL_REVENUE: {
    MIN: 12_000,                 // מחזור שנתי מינימלי (₪)
    MAX: 400_000_000,            // מחזור שנתי מקסימלי (₪)
  },

  // ────────────── מכפילים ──────────────

  BIMONTHLY_DECLINE_MULTIPLIER: 2,    // מכפיל ירידת מחזור לדו-חודשיים
  BIMONTHLY_DECLINE_CAP: 100,         // תקרת אחוז ירידה לדו-חודשיים
  CONTRACTOR_MULTIPLIER: 0.68,        // מכפיל מסלול קבלנים
  ENHANCED_RATE_MULTIPLIER: 1.5,      // מכפיל הגדלת מקדם פיצוי

  // ────────────── נזק ישיר ──────────────

  DIRECT_DAMAGE: {
    ADDITIONAL_PERIODS: 6,        // מספר חודשי זכאות נוספים
    BIMONTHLY_INCOME_CAP: 30_000, // תקרת הכנסה חייבת לתקופת דיווח דו-חודשית
    MIN_DAYS_UNUSED: 15,          // מינימום ימים שהעסק לא נעשה בו שימוש
  },

  // ────────────── דמי טיפול ──────────────

  SERVICE_FEE: {
    AMOUNT: 1_350,               // סכום דמי טיפול (₪) לפני מע"מ — קבוע לכל הטננטים
    VAT_RATE: 0.18,              // שיעור מע"מ
  },
} as const;
```

### 2.2 שישה מסלולים (Track Types)

```typescript
// src/modules/shaagat-haari/types/shaagat.types.ts

/**
 * 6 distinct calculation tracks, each with unique comparison periods.
 * The track_type determines which revenue periods are compared,
 * which inputs period is used, and any special multipliers.
 */
export type TrackType =
  | 'standard'      // מסלול רגיל — 03/2025 vs 03/2026
  | 'small'         // מסלול קטנים — עד 300,000 ₪ — lookup table
  | 'cash_basis'    // בסיס מזומן — 04/2025 vs 04/2026
  | 'new_business'  // עסק חדש (מ-01/01/2025) — תקופות מיוחדות
  | 'northern'      // עסקים בצפון (מסלול אדום) — 03/2023 vs 03/2026
  | 'contractor';   // קבלנים — ×0.68, מחזור 04/26

/**
 * Business type — orthogonal to track.
 * Affects only the employer cost multiplier (1.25 vs 1.325).
 */
export type BusinessType = 'regular' | 'ngo';

/**
 * VAT reporting frequency — affects thresholds and comparison periods.
 */
export type ReportingType = 'monthly' | 'bimonthly';

// ────────── Discriminated Union for Track-Specific Config ──────────

interface BaseTrackConfig {
  trackType: TrackType;
  reportingType: ReportingType;
  businessType: BusinessType;
}

interface StandardTrackConfig extends BaseTrackConfig {
  trackType: 'standard';
  /** Base period: 03/2025 (monthly) or 3-4/2025 (bimonthly) */
  revenueBasePeriod: string;
  /** Comparison period: 03/2026 (monthly) or 3-4/2026 (bimonthly) */
  revenueComparisonPeriod: string;
  /** Inputs averaging period: calendar year 2025 */
  inputsAveragingPeriod: string;
}

interface SmallBusinessTrackConfig extends BaseTrackConfig {
  trackType: 'small';
  /** Annual revenue 2022 — for lookup table */
  annualRevenue2022: number;
}

interface CashBasisTrackConfig extends BaseTrackConfig {
  trackType: 'cash_basis';
  /** Base: 04/2025 (monthly) or 3-4/2025 (bimonthly) */
  revenueBasePeriod: string;
  /** Comparison: 04/2026 (monthly) or 3-4/2026 (bimonthly) */
  revenueComparisonPeriod: string;
  /** March 2026 decline — must be < 40% monthly / < 20% bimonthly to qualify */
  marchDecline: number;
}

interface NewBusinessTrackConfig extends BaseTrackConfig {
  trackType: 'new_business';
  /** Business opening date — determines averaging period */
  openingDate: Date;
  /** Start of averaging period */
  averagingStartDate: Date;
  /** Number of active months (for annualization) */
  activeMonths: number;
}

interface NorthernTrackConfig extends BaseTrackConfig {
  trackType: 'northern';
  /** Base: 03/2023 (monthly) or 3-4/2023 (bimonthly) */
  revenueBasePeriod: string;
  /** Inputs period: 09/2022-08/2023 */
  inputsAveragingPeriod: string;
}

interface ContractorTrackConfig extends BaseTrackConfig {
  trackType: 'contractor';
  /** Base: average 07/2025-02/2026 */
  revenueBasePeriod: string;
  /** Comparison: 04/2026 (monthly) or 3-4/2026 (bimonthly) */
  revenueComparisonPeriod: string;
}

export type TrackConfig =
  | StandardTrackConfig
  | SmallBusinessTrackConfig
  | CashBasisTrackConfig
  | NewBusinessTrackConfig
  | NorthernTrackConfig
  | ContractorTrackConfig;
```

**טבלת תקופות השוואה לפי מסלול:**

| מסלול | תקופת בסיס (מחזור) | תקופת השוואה (מחזור) | תקופת תשומות | חודש שכר |
|---|---|---|---|---|
| **רגיל (standard)** | 03/2025 (חד) / 3-4/2025 (דו) | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע חודשי 2025 | 03/2026 |
| **קטנים (small)** | לפי מחזור 2022 — lookup table | — | — | — |
| **מזומן (cash_basis)** | 04/2025 (חד) / 3-4/2025 (דו) | 04/2026 (חד) / 3-4/2026 (דו) | ממוצע חודשי 2025 | 03/2026 |
| **חדשים (new_business)** | ממוצע 03/2025-02/2026 (או מפתיחה) | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע 03/2025-02/2026 | 03/2026 |
| **צפון (northern)** | 03/2023 (חד) / 3-4/2023 (דו) | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע 09/2022-08/2023 | 03/2026 |
| **קבלנים (contractor)** | ממוצע 07/2025-02/2026 | 04/2026 (חד) / 3-4/2026 (דו) | ממוצע 2025 (או מפתיחה) | 04/2026 |

### 2.3 חישוב זכאות (Eligibility)

```typescript
// INPUT
interface EligibilityInput {
  revenueBase: number;           // מחזור תקופת בסיס
  revenueComparison: number;     // מחזור תקופת השוואה
  capitalRevenuesBase: number;   // הכנסות הון — תקופת בסיס (הפחתה)
  capitalRevenuesComparison: number; // הכנסות הון — תקופת השוואה (הפחתה)
  selfAccountingRevenuesBase: number; // הכנסות עצמיות — תקופת בסיס (הפחתה)
  selfAccountingRevenuesComparison: number; // הכנסות עצמיות — תקופת השוואה (הפחתה)
  reportingType: ReportingType;
  annualRevenue: number;         // מחזור שנתי (לבדיקת טווח 12,000-400,000,000)
}

// OUTPUT
interface EligibilityResult {
  netRevenueBase: number;
  netRevenueComparison: number;
  declinePercentage: number;
  eligibilityStatus: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'GRAY_AREA';
  compensationRate: number;      // 0, 7, 11, 15, or 22
}
```

**אלגוריתם:**

```
שלב 1: חישוב מחזורים נקיים
  netRevenueBase = revenueBase - capitalRevenuesBase - selfAccountingRevenuesBase
  netRevenueComparison = revenueComparison - capitalRevenuesComparison - selfAccountingRevenuesComparison

שלב 2: וולידציה
  אם netRevenueBase <= 0 OR netRevenueComparison < 0 → שגיאה
  אם annualRevenue < 12,000 OR annualRevenue > 400,000,000 → לא זכאי

שלב 3: חישוב אחוז ירידה
  declinePercentage = ((netRevenueBase - netRevenueComparison) / netRevenueBase) × 100
  (ערך חיובי = ירידה, ערך שלילי = עלייה)

שלב 4: קביעת זכאות ושיעור פיצוי
  אם declinePercentage <= 0 → NOT_ELIGIBLE, rate = 0

  חודשי (monthly):
    25% — 40%   → ELIGIBLE, rate = 7%
    40% — 60%   → ELIGIBLE, rate = 11%
    60% — 80%   → ELIGIBLE, rate = 15%
    80% — 100%  → ELIGIBLE, rate = 22%

  דו-חודשי (bimonthly):
    12.5% — 20% → ELIGIBLE, rate = 7%
    20%   — 30% → ELIGIBLE, rate = 11%
    30%   — 40% → ELIGIBLE, rate = 15%
    40%   — 50% → ELIGIBLE, rate = 22%

שלב 5: בדיקת תחום אפור (אם לא זכאי)
  threshold = monthly ? 25 : 12.5
  grayAreaMin = threshold × 0.92  (= 23% לחודשי, 11.5% לדו-חודשי)
  אם declinePercentage >= grayAreaMin AND declinePercentage < threshold → GRAY_AREA
```

### 2.4 מענק הוצאות קבועות (Fixed Expenses Grant)

```
INPUT:
  vatInputs: number          // תשומות שנתיות (כולל מע"מ רגיל)
  zeroVatInputs: number      // תשומות בשיעור מע"מ אפס
  compensationRate: number   // מקדם פיצוי (7/11/15/22)
  inputsMonths: number       // מספר חודשים לממוצע (ברירת מחדל: 12)
  useEnhancedRate: boolean   // האם להשתמש במכפיל ×1.5

FORMULA:
  monthlyAvgInputs = (vatInputs + zeroVatInputs) / inputsMonths

  effectiveRate = useEnhancedRate
    ? compensationRate × 1.5
    : compensationRate

  fixedExpensesGrant = round(monthlyAvgInputs × (effectiveRate / 100))
```

> **הערה:** `inputsMonths` = 12 למרבית העסקים. לעסקים חדשים שפעלו N חודשים: `inputsMonths = N`.
> ניתן להגדיל את מקדם הפיצוי פי 1.5 אם ההוצאות הקבועות בפועל גבוהות מתחשיב המענק.
> הוצאות שירדו לטימיון נחשבות הוצאות קבועות — ניתן לכלול בתחשיב.

#### פירוט הוצאות קבועות (7 סוגים)

| שדה | עברית | חובה |
|---|---|---|
| rent | שכר דירה | לא |
| electricity | חשמל | לא |
| water | מים | לא |
| phone_internet | טלפון/אינטרנט | לא |
| insurance | ביטוח | לא |
| maintenance | אחזקה | לא |
| other_fixed | אחר (עם תיאור) | לא |

פירוט הוצאות קבועות (7 סוגים): שכ"ד, חשמל, מים, טלפון/אינטרנט, ביטוח, אחזקה, אחר
הסכום הכולל משמש להחלטה אם להפעיל מכפיל ×1.5.
הנוסחה עצמה עדיין משתמשת בתשומות ממוצעות.

### 2.5 מענק שכר (Salary Grant)

```
INPUT:
  salaryMarch2026: number        // סה"כ שכר ברוטו מרץ 2026 (טופס 102)
  tipsDeductions: number         // ניכוי טיפים (₪)
  miluimDeductions: number       // ניכוי מילואים שהתקבלו מב"ל (₪)
  chalatDeductions: number       // ניכוי חל"ת (₪)
  vacationDeductions: number     // ניכוי חופשה (₪)
  totalEmployees: number         // כמות עובדים
  tipsCount: number              // כמות עובדים בטיפים (להפחתת תקרה)
  miluimCount: number            // כמות עובדים במילואים
  chalatCount: number            // כמות עובדים בחל"ת
  vacationCount: number          // כמות עובדים בחופשה
  businessType: BusinessType     // 'regular' | 'ngo'
  declinePercentage: number      // אחוז ירידת מחזור
  reportingType: ReportingType   // 'monthly' | 'bimonthly'

FORMULA:
  שלב 1 — שכר מותאם:
    totalDeductions = tipsDeductions + miluimDeductions + chalatDeductions + vacationDeductions
    salaryAfterDeductions = salaryMarch2026 - totalDeductions    ← ⚠️ חשוב! ניכוי לפני הכפלה
    multiplier = businessType === 'ngo' ? 1.325 : 1.25
    adjustedSalary = salaryAfterDeductions × multiplier

  שלב 2 — אחוז ירידה אפקטיבי (דו-חודשי מוכפל ב-2):
    effectiveDecline = reportingType === 'bimonthly'
      ? min(declinePercentage × 2, 100)
      : declinePercentage

  שלב 3 — מענק שכר לפני תקרה:
    salaryGrantBeforeCap = round(adjustedSalary × 0.75 × (effectiveDecline / 100))

  שלב 4 — תקרת מענק שכר:
    employeeDeductions = miluimCount + chalatCount + vacationCount + tipsCount
    employeesAfterDeductions = max(totalEmployees - employeeDeductions, 1)

    ⚠️ תקרה — ללא ×0.75! (לפי המצגת):
    salaryCap = round(employeesAfterDeductions × 13,773 × multiplier × (effectiveDecline / 100))

  שלב 5 — מענק שכר סופי:
    salaryGrant = min(salaryGrantBeforeCap, salaryCap)
```

> **שגיאה היסטורית נפוצה #1:** `(salary × 1.25) - deductions` במקום `(salary - deductions) × 1.25`
> **שגיאה היסטורית נפוצה #2:** תקרה כוללת ×0.75 — לפי המצגת התקרה היא **ללא** ×0.75

### 2.6 תקרת מענק כוללת

```
  totalGrant = fixedExpensesGrant + salaryGrant

  תקרת מענק לפי מחזור שנתי:
    אם annualRevenue < 100,000,000:
      grantCap = 600,000

    אם 100,000,000 <= annualRevenue < 300,000,000:
      grantCap = min(600,000 + 0.003 × (annualRevenue - 100,000,000), 1,200,000)

    אם annualRevenue >= 300,000,000:
      grantCap = 1,200,000

  finalGrantAmount = min(totalGrant, grantCap)
```

### 2.7 מסלול קטנים — טבלת Lookup

**עסקים עם מחזור שנתי (2022) עד 300,000 ₪ — סכומים קבועים:**

| מחזור 2022 (₪) | 25-40% | 40-60% | 60-80% | 80-100% |
|---|---|---|---|---|
| 12,000-50,000 | 1,833 | 1,833 | 1,833 | 1,833 |
| 50,000-90,000 | 3,300 | 3,300 | 3,300 | 3,300 |
| 90,000-120,000 | 4,400 | 4,400 | 4,400 | 4,400 |
| 120,000-150,000 | 2,776 | 4,164 | 6,662 | 8,328 |
| 150,000-200,000 | 3,273 | 4,910 | 7,855 | 9,819 |
| 200,000-250,000 | 4,190 | 6,285 | 10,056 | 12,570 |
| 250,000-300,000 | 4,897 | 7,346 | 11,752 | 14,691 |

**הערות:**
- עסקים עד 120,000 ₪ מקבלים סכום אחיד ללא קשר לאחוז הירידה (כל עוד עומדים בסף)
- למדווחי דו-חודשי: יש להכפיל ב-2 את שיעור הירידה המחושב (לנטרל אפריל 2026)

```typescript
export const SMALL_BUSINESS_LOOKUP: SmallBusinessLookupEntry[] = [
  { minRevenue: 12_000,  maxRevenue: 50_000,   tier1: 1833, tier2: 1833, tier3: 1833, tier4: 1833 },
  { minRevenue: 50_000,  maxRevenue: 90_000,   tier1: 3300, tier2: 3300, tier3: 3300, tier4: 3300 },
  { minRevenue: 90_000,  maxRevenue: 120_000,  tier1: 4400, tier2: 4400, tier3: 4400, tier4: 4400 },
  { minRevenue: 120_000, maxRevenue: 150_000,  tier1: 2776, tier2: 4164, tier3: 6662, tier4: 8328 },
  { minRevenue: 150_000, maxRevenue: 200_000,  tier1: 3273, tier2: 4910, tier3: 7855, tier4: 9819 },
  { minRevenue: 200_000, maxRevenue: 250_000,  tier1: 4190, tier2: 6285, tier3: 10056, tier4: 12570 },
  { minRevenue: 250_000, maxRevenue: 300_000,  tier1: 4897, tier2: 7346, tier3: 11752, tier4: 14691 },
];
```

### 2.8 כלל "הגבוה מבין השניים"

```
אם annualRevenue2022 <= 300,000 AND trackType !== 'small':
  smallTrackAmount = lookupSmallBusinessGrant(annualRevenue2022, declinePercentage)
  finalAmount = max(finalGrantAmount, smallTrackAmount)
```

> עסק עם מחזור שנתי מעל 300,000 ₪ שתוצאת המענק שלו נמוכה מהמענק שהיה מקבל אילו היה במסלול הקטנים — יקבל את הגבוה מבין השניים.

### 2.9 מסלול מזומן (cash_basis)

**תקופות השוואה שונות:**
- חד חודשי: מחזור **04/2025** לעומת **04/2026**
- דו חודשי: מחזור **3-4/2025** לעומת **3-4/2026**

**תנאי כניסה:**
```
canUseCashBasisTrack =
  (reportingType === 'monthly' && marchDecline < 40) ||
  (reportingType === 'bimonthly' && marchDecline < 20)
```

העוסק מתחייב במע"מ בעת קבלת התמורה (פרק ו' לחוק המע"מ) — עיקר התקבולים השוטפים לעסקו בחודש העוקב לחודש שבו בוצעה העסקה.

### 2.10 מסלול עסקים חדשים (new_business)

**לעסקים שנפתחו מ-01/01/2025:**

**קביעת מחזור שנתי (שנת בסיס):**
- נפתח 01/01/2025 — 28/02/2025: מחזור מ-01/03/2025 עד 28/02/2026
- נפתח מ-01/03/2025: מחזור מתקופת הדיווח העוקבת עד 28/02/2026 — **בהתאמה שנתית**

**קביעת מחזור בסיס:**
- ממוצע עסקאות מיום 01/03/2025 עד 28/02/2026 (או מתקופת דיווח עוקבת)

**תקופת זכאות:**
- חד חודשי: מחזור 03/2026
- דו חודשי: מחזור 3-4/2026

**הוצאות/תשומות:** ממוצע מ-01/03/2025 עד 28/02/2026 (או מפתיחה)

**התאמה שנתית:**
```
אם העסק פעל N חודשים (N < 12):
  annualizedRevenue = (actualRevenue / N) × 12
```

### 2.11 מסלול צפון (northern)

**עסקים שזכאים למסלול אדום עד 04/2025 — פרמטרים מיוחדים:**

| פרמטר | ערך |
|--------|------|
| מחזור בסיס חד חודשי | **03/2023** |
| מחזור בסיס דו חודשי | **3-4/2023** |
| מחזור השוואה חד חודשי | 03/2026 |
| מחזור השוואה דו חודשי | 3-4/2026 |
| תקופת תשומות | ממוצע **09/2022 — 08/2023** |

> לחילופין: ניתן להגיש תביעה גם במסלול מחזורים רגיל (standard).
> על ה-UI להציע לבחור את המסלול שנותן מענק גבוה יותר.

### 2.12 מסלול קבלנים (contractor)

**"קבלן ביצוע"** = קבלן רשום לעבודות הנדסה קבלניות בנאיות.

| פרמטר | ערך |
|--------|------|
| מחזור זכאות | 04/2026 (חד) / 3-4/2026 (דו) |
| מחזור בסיס חד חודשי | ממוצע **07/2025 — 02/2026** |
| מחזור בסיס דו חודשי | ממוצע (07/2025 — 02/2026) × 2 |
| תשומות | ממוצע שנת 2025, או מחודש שלאחר הפתיחה עד 02/2026 |
| חודש שכר | **04/2026** (לא 03/2026!) |

**מכפיל:**
```
contractorFinalGrant = round(finalGrantAmount × 0.68)
```

> מקדם הפיצוי יחושב לפי מסלול כללי ויוכפל ב-0.68.

### 2.13 טבלת סיכום — כל הערכים הקבועים

| קבוע | ערך | שימוש |
|------|-----|-------|
| סף מינימלי חודשי | 25% | מתחת = לא זכאי |
| סף מינימלי דו-חודשי | 12.5% | מתחת = לא זכאי |
| תחום אפור | 92% מהסף | 23% חודשי, 11.5% דו-חודשי |
| שיעור פיצוי 1 | 7% | ירידה 25-40% חודשי / 12.5-20% דו-חודשי |
| שיעור פיצוי 2 | 11% | ירידה 40-60% חודשי / 20-30% דו-חודשי |
| שיעור פיצוי 3 | 15% | ירידה 60-80% חודשי / 30-40% דו-חודשי |
| שיעור פיצוי 4 | 22% | ירידה 80-100% חודשי / 40-50% דו-חודשי |
| מכפיל שכר רגיל | 1.25 | עסקים רגילים |
| מכפיל שכר עמותה | 1.325 | עמותות/מלכ"רים |
| מכפיל מענק שכר | 0.75 | 75% מהשכר המותאם |
| תקרה לעובד | 13,773 ₪ | שכר ממוצע במשק — בסיס לתקרה |
| כפל דו-חודשי | ×2 | מכפיל ירידה לדו-חודשיים (עד 100%) |
| מכפיל הגדלת מקדם | ×1.5 | להוכחת הוצאות קבועות גבוהות |
| מכפיל קבלנים | ×0.68 | מסלול קבלני ביצוע |
| תקרת מענק ברירת מחדל | 600,000 ₪ | מחזור < 100M |
| תקרת מענק מקסימלית | 1,200,000 ₪ | מחזור >= 300M |
| שיעור תוספת תקרה | 0.3% | על כל ₪ מעל 100M (עד 300M) |
| מחזור שנתי מינימלי | 12,000 ₪ | סף תחתון לזכאות |
| מחזור שנתי מקסימלי | 400,000,000 ₪ | סף עליון לזכאות |
| תקופת בסיס (standard) | 03/2025 vs 03/2026 | חד חודשי |
| תקופת בסיס (standard) | 3-4/2025 vs 3-4/2026 | דו חודשי |
| חודש שכר | 03/2026 | טופס 102 (04/2026 לקבלנים) |
| דמי טיפול | 1,350 ₪ + מע"מ | דמי שירות קבועים — כל הטננטים |
| תקרת הכנסה נזק ישיר | 30,000 ₪ | לתקופת דו-חודשי |

### 2.14 דוגמת חישוב (מהמצגת — שקף 8)

**נתונים:**
- הוצאות/תשומות ממוצעות חודשיות 2025: **150,364 ₪**
- שיעור ירידה במחזורים: **68%**
- שכר 03/2026 לפי טופס 102: **180,365 ₪**
- סוג עסק: רגיל (מכפיל 1.25)

**חישוב:**

מענק הוצאות קבועות:
- ירידה 68% → מקדם 15% (קבוצה 60-80%)
- 150,364 × 15% = **22,555 ₪**

מענק שכר:
- שכר מותאם: 180,365 × 1.25 = 225,456.25
- × 0.75 = 169,092.19
- × 68% = **114,983 ₪**

סה"כ: 22,555 + 114,983 = **137,538 ₪**

**אימות:**
- 180,365 × 1.25 × 0.75 × 0.68 = 114,982.69 ≈ 114,983 ✓
- 150,364 × 0.15 = 22,554.6 ≈ 22,555 ✓
- Total = 137,538 ✓

---

## 3. סכמת מסד נתונים (Supabase Migrations)

> כל הטבלאות כוללות `tenant_id` ו-RLS. משתמשות ב-`clients` הקיים של TicoVision.
> **10 טבלאות** + 5 RPC functions + 1 dashboard view

### 3.1 `shaagat_eligibility_checks` — בדיקות זכאות

```sql
CREATE TABLE shaagat_eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),

  -- מסלול ודיווח
  track_type TEXT NOT NULL DEFAULT 'standard' CHECK (track_type IN (
    'standard', 'small', 'cash_basis', 'new_business', 'northern', 'contractor'
  )),
  business_type TEXT NOT NULL DEFAULT 'regular' CHECK (business_type IN ('regular', 'ngo')),
  reporting_type TEXT NOT NULL DEFAULT 'monthly' CHECK (reporting_type IN ('monthly', 'bimonthly')),

  -- נתוני מחזור — שמות גנריים (לא hardcoded לשנה)
  annual_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  annual_revenue_2022 DECIMAL(15,2) DEFAULT 0,     -- למסלול קטנים (lookup)
  revenue_base_period DECIMAL(15,2) NOT NULL DEFAULT 0,       -- מחזור תקופת בסיס
  revenue_comparison_period DECIMAL(15,2) NOT NULL DEFAULT 0, -- מחזור תקופת השוואה
  revenue_base_period_label TEXT,       -- תיאור: "03/2025", "3-4/2023", etc.
  revenue_comparison_period_label TEXT, -- תיאור: "03/2026", "3-4/2026", etc.

  -- הפחתות מחזור
  capital_revenues_base DECIMAL(15,2) DEFAULT 0,
  capital_revenues_comparison DECIMAL(15,2) DEFAULT 0,
  self_accounting_revenues_base DECIMAL(15,2) DEFAULT 0,
  self_accounting_revenues_comparison DECIMAL(15,2) DEFAULT 0,

  -- תוצאות
  net_revenue_base DECIMAL(15,2) DEFAULT 0,
  net_revenue_comparison DECIMAL(15,2) DEFAULT 0,
  decline_percentage DECIMAL(8,4) DEFAULT 0,
  eligibility_status TEXT NOT NULL DEFAULT 'NOT_ELIGIBLE' CHECK (
    eligibility_status IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'GRAY_AREA')
  ),
  compensation_rate DECIMAL(5,2) DEFAULT 0,

  -- תשלום שכ"ט
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (
    payment_status IN ('UNPAID', 'PAID', 'EXEMPT')
  ),
  payment_link TEXT,
  payment_received_at TIMESTAMPTZ,

  -- מעקב
  email_sent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_relevant BOOLEAN DEFAULT TRUE,       -- סינון רלוונטיות (לא מעוניין / עסק סגור)
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE shaagat_eligibility_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_eligibility_select" ON shaagat_eligibility_checks
  FOR SELECT USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE POLICY "shaagat_eligibility_insert" ON shaagat_eligibility_checks
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
      AND uta.role IN ('admin', 'accountant')
    )
  );

CREATE POLICY "shaagat_eligibility_update" ON shaagat_eligibility_checks
  FOR UPDATE USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
      AND uta.role IN ('admin', 'accountant')
    )
  );

-- Indexes
CREATE INDEX idx_shaagat_eligibility_client ON shaagat_eligibility_checks(client_id);
CREATE INDEX idx_shaagat_eligibility_tenant ON shaagat_eligibility_checks(tenant_id);
CREATE INDEX idx_shaagat_eligibility_status ON shaagat_eligibility_checks(eligibility_status);
CREATE INDEX idx_shaagat_eligibility_track ON shaagat_eligibility_checks(track_type);
CREATE INDEX idx_shaagat_eligibility_active ON shaagat_eligibility_checks(is_active) WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER set_shaagat_eligibility_updated_at
  BEFORE UPDATE ON shaagat_eligibility_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.2 `shaagat_detailed_calculations` — חישובים מפורטים

```sql
CREATE TABLE shaagat_detailed_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  eligibility_check_id UUID NOT NULL REFERENCES shaagat_eligibility_checks(id),

  -- ═══ שלב 1: נתוני עסק (מבדיקת זכאות — readonly) ═══
  track_type TEXT NOT NULL,
  business_type TEXT NOT NULL,
  reporting_type TEXT NOT NULL DEFAULT 'monthly',
  compensation_rate DECIMAL(5,2) NOT NULL,
  decline_percentage DECIMAL(8,4) NOT NULL,
  annual_revenue DECIMAL(15,2) NOT NULL,
  revenue_base_period DECIMAL(15,2) NOT NULL,
  revenue_comparison_period DECIMAL(15,2) NOT NULL,

  -- ═══ שלב 2: הוצאות קבועות (תשומות) ═══
  vat_inputs DECIMAL(15,2) DEFAULT 0,            -- תשומות שנתיות כולל מע"מ
  zero_vat_inputs DECIMAL(15,2) DEFAULT 0,       -- תשומות בשיעור מע"מ אפס
  inputs_months INTEGER DEFAULT 12,              -- חודשים לממוצע (12 ברגיל, N לעסק חדש)
  use_enhanced_rate BOOLEAN DEFAULT FALSE,       -- שימוש במכפיל ×1.5

  -- Step 2: Fixed expenses breakdown (for x1.5 multiplier decision)
  expense_rent DECIMAL(15,2) DEFAULT 0,
  expense_electricity DECIMAL(15,2) DEFAULT 0,
  expense_water DECIMAL(15,2) DEFAULT 0,
  expense_phone_internet DECIMAL(15,2) DEFAULT 0,
  expense_insurance DECIMAL(15,2) DEFAULT 0,
  expense_maintenance DECIMAL(15,2) DEFAULT 0,
  expense_other_fixed DECIMAL(15,2) DEFAULT 0,
  expense_other_description TEXT,
  total_actual_fixed_expenses DECIMAL(15,2) DEFAULT 0,

  -- ═══ intermediate values ═══
  monthly_avg_inputs DECIMAL(15,2) DEFAULT 0,    -- ממוצע חודשי תשומות
  effective_compensation_rate DECIMAL(5,2) DEFAULT 0, -- מקדם אפקטיבי (אחרי ×1.5 אם רלוונטי)

  -- ═══ שלב 3: נתוני שכר ═══
  salary_gross DECIMAL(15,2) DEFAULT 0,          -- שכר ברוטו מרץ 2026 (טופס 102)
  num_employees INTEGER DEFAULT 0,
  miluim_deductions DECIMAL(15,2) DEFAULT 0,     -- ניכוי מילואים (₪)
  tips_deductions DECIMAL(15,2) DEFAULT 0,       -- ניכוי טיפים (₪)
  chalat_deductions DECIMAL(15,2) DEFAULT 0,     -- ניכוי חל"ת (₪)
  vacation_deductions DECIMAL(15,2) DEFAULT 0,   -- ניכוי חופשה (₪)
  miluim_count INTEGER DEFAULT 0,                -- כמות עובדים במילואים
  tips_count INTEGER DEFAULT 0,                  -- כמות עובדים בטיפים
  chalat_count INTEGER DEFAULT 0,                -- כמות עובדים בחל"ת
  vacation_count INTEGER DEFAULT 0,              -- כמות עובדים בחופשה

  -- ═══ intermediate salary values ═══
  total_deductions DECIMAL(15,2) DEFAULT 0,      -- סה"כ ניכויים (₪)
  salary_after_deductions DECIMAL(15,2) DEFAULT 0,
  employer_cost_multiplier DECIMAL(5,3) DEFAULT 1.25,
  adjusted_salary DECIMAL(15,2) DEFAULT 0,
  effective_decline DECIMAL(8,4) DEFAULT 0,      -- ירידה אפקטיבית (אחרי כפל דו-חודשי)
  employees_after_deductions INTEGER DEFAULT 0,

  -- ═══ שלב 4: תוצאות חישוב (אוטומטי) ═══
  fixed_expenses_grant DECIMAL(15,2) DEFAULT 0,
  salary_grant_before_cap DECIMAL(15,2) DEFAULT 0,
  salary_grant_cap DECIMAL(15,2) DEFAULT 0,
  salary_grant DECIMAL(15,2) DEFAULT 0,          -- אחרי תקרה
  total_calculated_grant DECIMAL(15,2) DEFAULT 0, -- לפני תקרה כוללת
  grant_cap DECIMAL(15,2) DEFAULT 0,
  final_grant_amount DECIMAL(15,2) DEFAULT 0,    -- אחרי תקרה כוללת

  -- ═══ מכפיל קבלנים ═══
  contractor_multiplier_applied BOOLEAN DEFAULT FALSE,
  grant_before_contractor_multiplier DECIMAL(15,2) DEFAULT 0,

  -- ═══ השוואת מסלול קטנים ═══
  small_track_amount DECIMAL(15,2) DEFAULT 0,    -- סכום ממסלול קטנים (אם רלוונטי)
  used_small_track BOOLEAN DEFAULT FALSE,        -- האם נלקח מסלול קטנים כי גבוה יותר

  -- ═══ audit trail ═══
  constants_version TEXT DEFAULT '1.0',           -- לעקוב אחרי שינויי רגולציה

  -- ═══ מעקב שלבים ═══
  calculation_step INTEGER DEFAULT 1 CHECK (calculation_step BETWEEN 1 AND 4),
  is_completed BOOLEAN DEFAULT FALSE,

  -- ═══ שליחה ללקוח ═══
  is_sent_to_client BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,

  -- ═══ אישור לקוח ═══
  client_approved BOOLEAN,
  client_approved_at TIMESTAMPTZ,
  client_rejection_reason TEXT,
  approval_token TEXT UNIQUE,
  approval_token_expires_at TIMESTAMPTZ,

  -- ═══ אישור ידני ע"י רו"ח ═══
  manual_approval BOOLEAN DEFAULT FALSE,
  manual_approval_note TEXT,
  manual_approved_by UUID REFERENCES auth.users(id),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE shaagat_detailed_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_calc_select" ON shaagat_detailed_calculations
  FOR SELECT USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE POLICY "shaagat_calc_insert" ON shaagat_detailed_calculations
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
      AND uta.role IN ('admin', 'accountant')
    )
  );

CREATE POLICY "shaagat_calc_update" ON shaagat_detailed_calculations
  FOR UPDATE USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
      AND uta.role IN ('admin', 'accountant')
    )
  );

CREATE INDEX idx_shaagat_calc_client ON shaagat_detailed_calculations(client_id);
CREATE INDEX idx_shaagat_calc_eligibility ON shaagat_detailed_calculations(eligibility_check_id);
CREATE INDEX idx_shaagat_calc_tenant ON shaagat_detailed_calculations(tenant_id);
CREATE INDEX idx_shaagat_calc_approval_token ON shaagat_detailed_calculations(approval_token)
  WHERE approval_token IS NOT NULL;

CREATE TRIGGER set_shaagat_calc_updated_at
  BEFORE UPDATE ON shaagat_detailed_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 `shaagat_tax_submissions` — שידור לרשות המיסים

```sql
CREATE TABLE shaagat_tax_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  calculation_id UUID NOT NULL REFERENCES shaagat_detailed_calculations(id),

  submission_number TEXT NOT NULL UNIQUE, -- מספר בקשה / מספר אישור רשות המסים — חובה לשידור!
  submission_screenshot_url TEXT NOT NULL, -- צילום ההגשה — חובה לשידור!
  submission_date TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
    'SUBMITTED',        -- הוגש
    'IN_REVIEW',        -- בבדיקה
    'OBJECTIONS',       -- השגות
    'PARTIAL_PAYMENT',  -- תשלום חלקי (מקדמה)
    'FULL_PAYMENT',     -- תשלום מלא
    'CLOSED'            -- סגור
  )),

  expected_amount DECIMAL(15,2),
  received_amount DECIMAL(15,2) DEFAULT 0,

  -- מועדים חוקיים (מחושבים אוטומטית מ-submission_date)
  documents_due_date DATE,            -- 30 ימים — הגשת מסמכים
  advance_due_date DATE,              -- 21 ימים — מקדמה 60%
  determination_due_date DATE,        -- 150 ימים — קביעת זכאות
  full_payment_due_date DATE,         -- 8 חודשים — תשלום מלא
  objection_due_date DATE,            -- 90 ימים מהחלטה — הגשת השגה
  objection_determination_date DATE,  -- 8 חודשים מהשגה — אם לא טופלה = התקבלה
  appeal_due_date DATE,               -- 8 חודשים + 60 יום — ערר

  -- תשלומים
  advance_received BOOLEAN DEFAULT FALSE,
  advance_amount DECIMAL(15,2) DEFAULT 0,
  advance_received_at TIMESTAMPTZ,

  -- JSONB for flexible data
  responses JSONB DEFAULT '[]',       -- תגובות רשות המיסים
  corrections JSONB DEFAULT '[]',     -- תיקונים שהוגשו
  payment_info JSONB DEFAULT '{}',    -- פרטי תשלומים

  -- סגירה
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  closure_reason TEXT,
  closure_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE shaagat_tax_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_submissions_select" ON shaagat_tax_submissions
  FOR SELECT USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE POLICY "shaagat_submissions_modify" ON shaagat_tax_submissions
  FOR ALL USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
      AND uta.role IN ('admin', 'accountant')
    )
  );

CREATE INDEX idx_shaagat_submissions_client ON shaagat_tax_submissions(client_id);
CREATE INDEX idx_shaagat_submissions_status ON shaagat_tax_submissions(status);
CREATE INDEX idx_shaagat_submissions_deadlines ON shaagat_tax_submissions(advance_due_date, determination_due_date, full_payment_due_date)
  WHERE is_closed = false;

-- Auto-compute deadlines on insert/update
CREATE OR REPLACE FUNCTION compute_shaagat_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submission_date IS NOT NULL AND (
    OLD.submission_date IS DISTINCT FROM NEW.submission_date
  ) THEN
    NEW.documents_due_date := (NEW.submission_date + INTERVAL '30 days')::DATE;
    NEW.advance_due_date := (NEW.submission_date + INTERVAL '21 days')::DATE;
    NEW.determination_due_date := (NEW.submission_date + INTERVAL '150 days')::DATE;
    NEW.full_payment_due_date := (NEW.submission_date + INTERVAL '8 months')::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shaagat_compute_deadlines
  BEFORE INSERT OR UPDATE ON shaagat_tax_submissions
  FOR EACH ROW EXECUTE FUNCTION compute_shaagat_deadlines();

CREATE TRIGGER set_shaagat_submissions_updated_at
  BEFORE UPDATE ON shaagat_tax_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

> ⚠️ **VALIDATION:** לא ניתן לסמן הגשה כ-'submitted' בלי:
> 1. `submission_number` — מספר אישור רשות המסים (חובה)
> 2. `submission_screenshot_url` — צילום ההגשה (חובה)
> Frontend חייב לאכוף validation זה. ללא שני השדות — כפתור השמירה מושבת.

### 3.4 `shaagat_tax_letters` — מכתבים מ/אל רשות המיסים

```sql
CREATE TABLE shaagat_tax_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  submission_id UUID NOT NULL REFERENCES shaagat_tax_submissions(id),

  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),

  type TEXT NOT NULL CHECK (type IN (
    'OBJECTION',         -- השגה (outgoing)
    'REJECTION',         -- דחייה (incoming)
    'PARTIAL_APPROVAL',  -- אישור חלקי (incoming)
    'FULL_APPROVAL',     -- אישור מלא (incoming)
    'INFO_REQUEST',      -- בקשת מידע (incoming)
    'INFO_RESPONSE',     -- תגובה לבקשת מידע (outgoing)
    'APPEAL_SUBMITTED',  -- ערעור הוגש (outgoing)
    'ADVANCE_RECEIVED',  -- מקדמה התקבלה (incoming)
    'DETERMINATION',     -- קביעת זכאות (incoming)
    'OTHER'
  )),

  received_date DATE NOT NULL,
  response_due_date DATE,

  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'HANDLED', 'EXPIRED', 'INFO_ONLY'
  )),

  reference_number TEXT,
  amount DECIMAL(15,2),              -- סכום (אם רלוונטי)
  notes TEXT,
  file_url TEXT,

  -- מעקב תגובה
  response_sent_date TIMESTAMPTZ,
  response_reference_number TEXT,
  response_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_tax_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_letters_policy" ON shaagat_tax_letters
  FOR ALL USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE INDEX idx_shaagat_letters_submission ON shaagat_tax_letters(submission_id);
CREATE INDEX idx_shaagat_letters_status ON shaagat_tax_letters(status) WHERE status = 'PENDING';
CREATE INDEX idx_shaagat_letters_due ON shaagat_tax_letters(response_due_date) WHERE status = 'PENDING';
```

### 3.5 `shaagat_additional_periods` — תקופות נזק ישיר נוספות (NEW)

```sql
CREATE TABLE shaagat_additional_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  submission_id UUID REFERENCES shaagat_tax_submissions(id),

  -- תקופה
  period_start DATE NOT NULL,         -- תחילת התקופה הנוספת
  period_end DATE NOT NULL,           -- סוף התקופה הנוספת
  period_label TEXT,                  -- תיאור: "04/2026", "05-06/2026", etc.

  -- סוג פיצוי
  compensation_type TEXT NOT NULL CHECK (compensation_type IN (
    'direct_damage',        -- נזק ישיר — הוצאות מזכות
    'direct_damage_income', -- נזק ישיר — מענק נוסף (הכנסה חייבת)
    'rent_loss_residential',-- אובדן שכ"ד — דירת מגורים
    'rent_loss_non_dealer', -- אובדן שכ"ד — נכס שאינו בידי עוסק
    'rent_loss_dealer'      -- אובדן שכ"ד — נכס בידי עוסק
  )),

  -- נתוני חישוב
  qualifying_expenses DECIMAL(15,2) DEFAULT 0,   -- הוצאות מזכות
  monthly_taxable_income DECIMAL(15,2) DEFAULT 0, -- הכנסה חייבת חודשית בשנת בסיס
  decline_percentage DECIMAL(8,4) DEFAULT 0,
  last_rent_amount DECIMAL(15,2) DEFAULT 0,      -- שכ"ד אחרון (לאובדן שכ"ד)

  -- תוצאה
  calculated_amount DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED')),

  -- תנאי זכאות
  property_unusable_until DATE,       -- עד מתי לא ניתן להשתמש בנכס
  min_days_unused_met BOOLEAN DEFAULT FALSE, -- האם 15 ימים לפחות

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_additional_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_additional_policy" ON shaagat_additional_periods
  FOR ALL USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE INDEX idx_shaagat_additional_client ON shaagat_additional_periods(client_id);
```

### 3.6 `shaagat_bank_details` — פרטי בנק (NEW)

```sql
CREATE TABLE shaagat_bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),

  -- פרטי בנק
  account_holder_name TEXT NOT NULL,
  bank_number TEXT NOT NULL,
  branch_number TEXT NOT NULL,
  account_number TEXT NOT NULL,

  -- אימות
  verification_tax_id TEXT,           -- ח.פ./ע.מ. שהוזן לאימות
  is_verified BOOLEAN DEFAULT FALSE,

  -- טוקן גישה (טופס חיצוני)
  access_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_bank_details ENABLE ROW LEVEL SECURITY;

-- RLS for authenticated users
CREATE POLICY "shaagat_bank_select" ON shaagat_bank_details
  FOR SELECT USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

-- Anon access via RPC (see functions below)
CREATE INDEX idx_shaagat_bank_client ON shaagat_bank_details(client_id);
CREATE INDEX idx_shaagat_bank_token ON shaagat_bank_details(access_token)
  WHERE submitted_at IS NULL;
```

### 3.7 `shaagat_accounting_submissions` — הגשות רואה חשבון חיצוני

```sql
CREATE TABLE shaagat_accounting_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),

  -- נתונים מהרואה חשבון (שכר)
  salary_gross DECIMAL(15,2),          -- שכר ברוטו (טופס 102)
  miluim_deductions DECIMAL(15,2),     -- ניכוי מילואים (₪)
  tips_deductions DECIMAL(15,2),       -- ניכוי טיפים (₪)
  chalat_deductions DECIMAL(15,2),     -- ניכוי חל"ת (₪)
  vacation_deductions DECIMAL(15,2),   -- ניכוי חופשה (₪)
  num_employees INTEGER,               -- כמות עובדים
  miluim_count INTEGER DEFAULT 0,      -- כמות עובדים במילואים
  tips_count INTEGER DEFAULT 0,        -- כמות עובדים בטיפים
  chalat_count INTEGER DEFAULT 0,      -- כמות עובדים בחל"ת
  vacation_count INTEGER DEFAULT 0,    -- כמות עובדים בחופשה

  -- salary period (03/2026 or 04/2026 for contractors)
  salary_period TEXT DEFAULT '03/2026',

  -- נתונים נוספים
  fruit_vegetable_purchases_annual DECIMAL(15,2) DEFAULT 0,  -- קניות פירות וירקות שנתי
  monthly_fixed_expenses DECIMAL(15,2) DEFAULT 0,            -- הוצאות קבועות חודשיות (שכירות, ארנונה וכו')

  -- מגיש
  submitted_by_email VARCHAR(255),
  submitted_by_business_id VARCHAR(20),
  submission_token VARCHAR(255) UNIQUE,  -- טוקן גישה לטופס חיצוני
  token_expires_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_accounting_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users — regular access
CREATE POLICY "shaagat_accounting_select" ON shaagat_accounting_submissions
  FOR SELECT USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

-- External form uses service_role or SECURITY DEFINER RPC
CREATE INDEX idx_shaagat_accounting_client ON shaagat_accounting_submissions(client_id);
CREATE INDEX idx_shaagat_accounting_token ON shaagat_accounting_submissions(submission_token)
  WHERE submission_token IS NOT NULL;
```

### 3.8 `shaagat_email_logs` — לוג מיילים

```sql
CREATE TABLE shaagat_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  eligibility_check_id UUID REFERENCES shaagat_eligibility_checks(id),

  email_type TEXT NOT NULL CHECK (email_type IN (
    'ELIGIBLE',
    'NOT_ELIGIBLE',
    'GRAY_AREA',
    'DETAILED_CALCULATION',
    'SUBMISSION_CONFIRMATION',
    'ACCOUNTING_FORM_REQUEST',
    'SALARY_DATA_REQUEST'
  )),

  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'FAILED')),
  error_message TEXT,
  html_content TEXT,               -- תוכן HTML שנשלח (לצפייה חוזרת)

  sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_email_logs_policy" ON shaagat_email_logs
  FOR ALL USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE INDEX idx_shaagat_email_client ON shaagat_email_logs(client_id);
CREATE INDEX idx_shaagat_email_type ON shaagat_email_logs(email_type);
```

### 3.9 `shaagat_status_history` — מעקב שינויים (NEW)

```sql
CREATE TABLE shaagat_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- Polymorphic reference
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'eligibility_check', 'calculation', 'submission', 'letter', 'additional_period'
  )),
  entity_id UUID NOT NULL,

  -- שינוי
  field_name TEXT NOT NULL,            -- שם השדה שהשתנה
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,

  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_history_policy" ON shaagat_status_history
  FOR ALL USING (
    tenant_id IN (
      SELECT uta.tenant_id FROM user_tenant_access uta
      WHERE uta.user_id = auth.uid() AND uta.is_active = true
    )
  );

CREATE INDEX idx_shaagat_history_entity ON shaagat_status_history(entity_type, entity_id);
CREATE INDEX idx_shaagat_history_changed_at ON shaagat_status_history(changed_at);
```

### 3.10 `shaagat_feasibility_checks` — בדיקות היתכנות (שלב 0)

```sql
CREATE TABLE shaagat_feasibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Token
  public_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ,        -- 7 ימים ברירת מחדל

  -- Revenue data entered by client
  revenue_base DECIMAL(15,2),
  revenue_comparison DECIMAL(15,2),

  -- Computed
  decline_percentage DECIMAL(7,4),
  has_feasibility BOOLEAN DEFAULT FALSE,

  -- Client response
  client_interested BOOLEAN,
  interested_at TIMESTAMPTZ,

  -- Payment
  payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'paid')),
  payment_received_at TIMESTAMPTZ,

  -- Tracking
  accessed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_from_ip TEXT,

  -- Relevance
  is_relevant BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shaagat_feasibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shaagat_feas_tenant" ON shaagat_feasibility_checks
  FOR ALL TO authenticated USING (tenant_id = get_current_tenant_id());
CREATE POLICY "shaagat_feas_anon_select" ON shaagat_feasibility_checks
  FOR SELECT TO anon USING (public_token IS NOT NULL);
CREATE POLICY "shaagat_feas_anon_update" ON shaagat_feasibility_checks
  FOR UPDATE TO anon USING (public_token IS NOT NULL);

CREATE INDEX idx_shaagat_feas_token ON shaagat_feasibility_checks(public_token);
CREATE INDEX idx_shaagat_feas_tenant ON shaagat_feasibility_checks(tenant_id);
CREATE INDEX idx_shaagat_feas_client ON shaagat_feasibility_checks(client_id);
```

### 3.11 PostgreSQL Functions

```sql
-- ═══ 1. Anon access: Bank details form ═══
CREATE OR REPLACE FUNCTION public.get_shaagat_bank_form_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', bd.id,
    'client_name', c.company_name,
    'client_tax_id', c.tax_id,
    'is_submitted', bd.submitted_at IS NOT NULL
  ) INTO v_result
  FROM shaagat_bank_details bd
  JOIN clients c ON bd.client_id = c.id
  WHERE bd.access_token = p_token
    AND bd.token_expires_at > NOW()
    AND bd.submitted_at IS NULL;

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;

-- ═══ 2. Anon write: Submit bank details ═══
CREATE OR REPLACE FUNCTION public.submit_shaagat_bank_details(
  p_token TEXT,
  p_account_holder TEXT,
  p_bank_number TEXT,
  p_branch_number TEXT,
  p_account_number TEXT,
  p_verification_tax_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_id UUID;
  v_client_tax_id TEXT;
BEGIN
  -- Verify token and get client tax_id
  SELECT bd.id, c.tax_id INTO v_bank_id, v_client_tax_id
  FROM shaagat_bank_details bd
  JOIN clients c ON bd.client_id = c.id
  WHERE bd.access_token = p_token
    AND bd.token_expires_at > NOW()
    AND bd.submitted_at IS NULL;

  IF v_bank_id IS NULL THEN
    RETURN '{"error": "invalid_or_expired_token"}'::JSONB;
  END IF;

  -- Verify tax_id matches
  IF v_client_tax_id != p_verification_tax_id THEN
    RETURN '{"error": "tax_id_mismatch"}'::JSONB;
  END IF;

  -- Update bank details
  UPDATE shaagat_bank_details SET
    account_holder_name = p_account_holder,
    bank_number = p_bank_number,
    branch_number = p_branch_number,
    account_number = p_account_number,
    verification_tax_id = p_verification_tax_id,
    is_verified = TRUE,
    submitted_at = NOW()
  WHERE id = v_bank_id;

  RETURN '{"success": true}'::JSONB;
END;
$$;

-- ═══ 3. Anon access: Accounting form ═══
CREATE OR REPLACE FUNCTION public.get_shaagat_accounting_form_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', acs.id,
    'client_name', c.company_name,
    'salary_period', acs.salary_period,
    'is_submitted', acs.submitted_by_email IS NOT NULL
  ) INTO v_result
  FROM shaagat_accounting_submissions acs
  JOIN clients c ON acs.client_id = c.id
  WHERE acs.submission_token = p_token
    AND acs.token_expires_at > NOW();

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;

-- ═══ 4. Anon access: Grant approval ═══
CREATE OR REPLACE FUNCTION public.get_shaagat_approval_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', dc.id,
    'client_name', c.company_name,
    'fixed_expenses_grant', dc.fixed_expenses_grant,
    'salary_grant', dc.salary_grant,
    'final_grant_amount', dc.final_grant_amount,
    'is_approved', dc.client_approved IS NOT NULL,
    'track_type', dc.track_type
  ) INTO v_result
  FROM shaagat_detailed_calculations dc
  JOIN clients c ON dc.client_id = c.id
  WHERE dc.approval_token = p_token
    AND dc.approval_token_expires_at > NOW();

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;

-- ═══ 5. Dashboard stats ═══
CREATE OR REPLACE FUNCTION public.get_shaagat_dashboard_stats(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
  ) THEN
    RETURN '{"error": "unauthorized"}'::JSONB;
  END IF;

  SELECT jsonb_build_object(
    'total_clients', COUNT(*),
    'eligible', COUNT(*) FILTER (WHERE ec.eligibility_status = 'ELIGIBLE'),
    'not_eligible', COUNT(*) FILTER (WHERE ec.eligibility_status = 'NOT_ELIGIBLE'),
    'gray_area', COUNT(*) FILTER (WHERE ec.eligibility_status = 'GRAY_AREA'),
    'paid', COUNT(*) FILTER (WHERE ec.payment_status = 'PAID'),
    'calculations_completed', (
      SELECT COUNT(*) FROM shaagat_detailed_calculations dc
      WHERE dc.tenant_id = p_tenant_id AND dc.is_completed = true AND dc.is_active = true
    ),
    'submitted_to_tax', (
      SELECT COUNT(*) FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id AND ts.status != 'CLOSED'
    ),
    'pending_deadlines', (
      SELECT COUNT(*) FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id
        AND ts.is_closed = false
        AND (
          ts.advance_due_date <= CURRENT_DATE + INTERVAL '7 days'
          OR ts.determination_due_date <= CURRENT_DATE + INTERVAL '7 days'
          OR ts.full_payment_due_date <= CURRENT_DATE + INTERVAL '7 days'
        )
    ),
    'total_expected_amount', (
      SELECT COALESCE(SUM(ts.expected_amount), 0)
      FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id AND ts.is_closed = false
    ),
    'total_received_amount', (
      SELECT COALESCE(SUM(ts.received_amount), 0)
      FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id
    )
  ) INTO v_result
  FROM shaagat_eligibility_checks ec
  WHERE ec.tenant_id = p_tenant_id AND ec.is_active = true;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;
```

### 3.12 Dashboard View

```sql
CREATE OR REPLACE VIEW shaagat_dashboard_view
WITH (security_invoker = true)
AS
SELECT
  ec.id AS eligibility_check_id,
  ec.tenant_id,
  ec.client_id,
  c.company_name,
  c.tax_id,
  ec.track_type,
  ec.business_type,
  ec.reporting_type,
  ec.eligibility_status,
  ec.decline_percentage,
  ec.compensation_rate,
  ec.payment_status,
  ec.email_sent,
  ec.created_at AS check_date,
  -- Calculation info
  dc.id AS calculation_id,
  dc.is_completed AS calculation_completed,
  dc.final_grant_amount,
  dc.client_approved,
  dc.calculation_step,
  -- Submission info
  ts.id AS submission_id,
  ts.status AS submission_status,
  ts.submission_number,
  ts.expected_amount,
  ts.received_amount,
  ts.advance_due_date,
  ts.determination_due_date,
  ts.full_payment_due_date,
  -- Pending letters count
  (SELECT COUNT(*) FROM shaagat_tax_letters tl
   WHERE tl.submission_id = ts.id AND tl.status = 'PENDING') AS pending_letters_count
FROM shaagat_eligibility_checks ec
JOIN clients c ON ec.client_id = c.id
LEFT JOIN shaagat_detailed_calculations dc ON dc.eligibility_check_id = ec.id AND dc.is_active = true
LEFT JOIN shaagat_tax_submissions ts ON ts.calculation_id = dc.id AND ts.is_closed = false
WHERE ec.is_active = true;
```

---

## 4. Workflow וסטטוסים

### 4.1 תרשים זרימה כללי

```
═══ שלב 0: גיוס לקוחות (Outreach & Feasibility) ═══

  0א. Broadcast per-company (ללא דה-דופליקציה!)
      - כל חברה מקבלת מייל נפרד עם טוקן ייחודי
      - נושא: "{companyName} ({taxId}) — בדיקת זכאות למענק שאגת הארי"
      - בעלים של 10 חברות = 10 מיילים נפרדים
      - שליחה דרך send-letter edge function

  0ב. טופס היתכנות חיצוני (token-based, 7 ימים תוקף):
      - מציג: שם חברה + ח.פ. (readonly)
      - שדות: מחזור בסיס, מחזור השוואה
      - "בדוק היתכנות" → חישוב אוטומטי מיידי
      - תוצאה: "יש היתכנות (ירידה X%)" + כפתור "כן, תטפלו לי"
                או "אין היתכנות" → סוף

  0ג. אחרי "כן, תטפלו לי" → הסבר דמי טיפול:
      "משרדנו לא גבה, לא גובה ולא יגבה שכרי טרחה חריגים
       (אחוזים מהפיצוי כמו נציגים אחרים). אולם מניסיון העבר,
       הטיפול בנושאים אלו מייצר הוצאות בעין.
       דמי הטיפול (בלבד) יסתכמו לסה"כ של 1,350 ₪ בתוספת מע"מ"
      → כפתור תשלום Cardcom
      → אחרי תשלום → נכנס למערכת כ"ביקש + שילם"
    ↓
═══ שלב 1: בדיקת זכאות מלאה (רו"ח/פקידה) ═══

  צעד 1 — סיווג העסק (קובע תקופות ושדות):
    ├── האם עסק חדש? (נפתח מ-01/01/2025)
    │   ├── כן → מסלול new_business (תקופות מיוחדות)
    │   └── לא → המשך
    ├── האם עסק בצפון? (זכאי למסלול אדום עד 04/2025)
    │   ├── כן → מסלול northern (תקופות בסיס 2023, ייתכנו שדות נוספים)
    │   └── לא → המשך
    ├── סוג דיווח: חד-חודשי / דו-חודשי
    │   (קובע את תקופות ההשוואה + ספי הזכאות)
    └── סוג עסק: רגיל / עמותה (קובע מכפיל 1.25 / 1.325)

  ⚠️ רק אחרי הסיווג — מוצגים השדות הנכונים עם תוויות התקופות!
  לדוגמה: מסלול רגיל חד-חודשי → "מחזור 03/2025", "מחזור 03/2026"
           מסלול צפון חד-חודשי → "מחזור 03/2023", "מחזור 03/2026"

  צעד 2 — הזנת נתוני מחזור (לפי התקופות שנקבעו):
    - מחזור שנתי
    - מחזור בסיס ({basePeriodLabel})
    - מחזור השוואה ({comparisonPeriodLabel})
    - הפחתות (אופציונלי): הכנסות הון, הכנסות עצמיות

  צעד 3 — חישוב אוטומטי + תוצאה:
    ├── NOT_ELIGIBLE → סימון במערכת (הלקוח כבר יודע מטופס ההיתכנות בשלב 0)
    ├── GRAY_AREA → סימון במערכת + בדיקה ידנית ע"י רו"ח
    └── ELIGIBLE → ממשיכים לשלב 2
    (אין שליחת מייל זכאות — הלקוח כבר קיבל היתכנות בשלב 0)
    ↓

═══ שלב 2: איסוף נתוני שכר והוצאות ═══

  הפקידה בוחרת נמענים (לקוח / מנהלת חשבונות / איש קשר)
  → מייל עם לינק לטופס חיצוני (טוקן 7 ימים, ניתן לשלוח מחדש)

  הטופס (3 שלבים):
    שלב 1: אימות זהות (ח.פ./ע.מ.)
    שלב 2: הזנת נתונים:
      ── נתוני שכר ──
      - שכר ברוטו לחודש (טופס 102) — חובה
      - עובדים בחל"ת (כמות + סכום)
      - פדיון חופשה (כמות + סכום)
      - מילואים (כמות + סכום)
      - טיפים (כמות + סכום)
      ── נתונים נוספים ──
      - קניות פירות וירקות שנתי (₪) — לחישוב תשומות מע"מ אפס
      - הוצאות קבועות חודשיות (₪) — שכירות, ארנונה וכו'
      ── הערות ──
      - הערות (טקסט חופשי)
    שלב 3: סיכום + אישור

  הנתונים נטענים אוטומטית ל-Wizard שלב 3 (ניתן לערוך)
    ↓

═══ שלב 3: חישוב מענק מפורט (4 תתי-שלבים) ═══
    ├── צעד 1: אימות נתוני עסק (מבדיקת זכאות — readonly)
    ├── צעד 2: הזנת תשומות (הוצאות קבועות)
    ├── צעד 3: הזנת נתוני שכר (אופציה: טעינה אוטומטית מטופס רו"ח)
    └── צעד 4: חישוב סופי (אוטומטי — כולל השוואה למסלול קטנים)
    ↓
    שליחת תוצאות ללקוח (מייל עם פירוט המענק + לינק אישור)
    ↓

═══ שלב 4: אישור לקוח + פרטי בנק ═══

  הלקוח מקבל מייל עם פירוט המענק ולינק לטופס אישור.
  בטופס החיצוני (token-based):
    צעד 1: אימות זהות (ח.פ./ע.מ.)
    צעד 2: צפייה בפירוט המענק (הוצאות + שכר + סה"כ)
    צעד 3: אישור או דחייה
      ├── אישור → צעד 4: הזנת פרטי חשבון בנק (חובה!)
      │   - שם בעל חשבון
      │   - בנק (dropdown רשימת בנקים ישראליים)
      │   - סניף
      │   - מספר חשבון
      └── דחייה → הזנת סיבה → סוף

  אפשרות: אישור ידני ע"י רו"ח
    - במקרים שהלקוח אישר בטלפון / בפגישה
    - הרו"ח לוחץ "אישור ידני" + מזין הערה (חובה)
    - פרטי בנק מוזנים ידנית ע"י הרו"ח
    ↓

═══ שלב 5: שידור לרשות המיסים ═══
  ⚠️ חובה: מספר אישור רשות המסים + צילום ההגשה
    ↓

═══ שלב 6: מעקב תשלומים מרשות המיסים ═══
    ├── יום 21: מקדמה 60%
    ├── יום 150: קביעת זכאות / 10% נוסף
    └── 8 חודשים: תשלום מלא
    ↓
סגירה
```

### 4.2 סטטוסים

**Eligibility Status:**
| סטטוס | משמעות | פעולה |
|--------|--------|-------|
| `NOT_ELIGIBLE` | לא זכאי | מייל דחייה |
| `GRAY_AREA` | תחום אפור (92-100% מהסף) | מייל + בדיקה ידנית |
| `ELIGIBLE` | זכאי | מייל + לינק תשלום |

**Payment Status (שכ"ט):**
| סטטוס | משמעות |
|--------|--------|
| `UNPAID` | ממתין לתשלום |
| `PAID` | שולם (דרך Cardcom) |
| `EXEMPT` | פטור (ידני) |

**Calculation Step:**
| שלב | תיאור |
|------|--------|
| 1 | נתוני עסק (מבדיקת זכאות) |
| 2 | תשומות / הוצאות קבועות |
| 3 | נתוני שכר |
| 4 | חישוב סופי |

**Tax Submission Status:**
| סטטוס | משמעות |
|--------|--------|
| `SUBMITTED` | הוגש לרשות המיסים |
| `IN_REVIEW` | בבדיקה |
| `OBJECTIONS` | השגות/ערעור |
| `PARTIAL_PAYMENT` | מקדמה התקבלה |
| `FULL_PAYMENT` | תשלום מלא |
| `CLOSED` | סגור |

---

## 5. מערכת מיילים

> **עיצוב:** יהיה לפי עיצוב TicoVision — לא לפי HTML של המערכת הישנה.
> להלן **תוכן** המיילים ו**לוגיקת השליחה** בלבד.

### 5.1 סוגי מיילים

#### מייל 1: לא זכאי (NOT_ELIGIBLE)

**נושא:** `{clientName} - תוצאות בדיקת זכאות לפיצוי "שאגת הארי"`

**תוכן:**
```
לכבוד {clientName}

הנדון: אי זכאותכם לקבל פיצוי בגין נזקי מלחמת "שאגת הארי"

משרדנו בדק עבורכם את שיעור הירידה בהכנסותיכם במחזור {comparisonPeriodLabel}
אל מול מחזור בסיס ({basePeriodLabel}). מהבדיקה עולה כי שיעור הירידה נמוך
מ-{threshold}% (ירידה שהייתה מקנה לכם את הזכות לקבלת פיצוי).

הסבר:
מחזור {comparisonPeriodLabel} הסתכם ל-{revenueComparison} ₪
ואילו מחזור בסיס הסתכם ל-{revenueBase} ₪
עולה מכך {changeDirection} של {changeAmount}% בלבד.
מה שלא מקנה לכם את הזכות לקבלת פיצוי.

בברכה,
צוות משרד {firmName}
```

**משתני תבנית:**
- `{clientName}` — שם הלקוח
- `{comparisonPeriodLabel}` — "03/2026", "3-4/2026" (לפי מסלול ודיווח)
- `{basePeriodLabel}` — "03/2025", "3-4/2025", "03/2023" (לפי מסלול ודיווח)
- `{threshold}` — 25% לחודשי, 12.5% לדו-חודשי
- `{revenueComparison}` — מחזור תקופת השוואה (מפורמט)
- `{revenueBase}` — מחזור בסיס (מפורמט)
- `{changeDirection}` — "ירידה" אם declinePercentage > 0, "עלייה" אם שלילי
- `{changeAmount}` — ערך מוחלט של אחוז השינוי
- `{firmName}` — שם המשרד (מהגדרות tenant)

---

#### מייל 2: זכאי (ELIGIBLE)

**נושא:** `{clientName} - מזל טוב! תוצאות בדיקת זכאות לפיצוי "שאגת הארי"`

**תוכן:**
```
לכבוד {clientName}

הנדון: זכאותכם לקבלת פיצוי בגין נזקי מלחמת "שאגת הארי"

אנו שמחים להודיעכם כי לאחר בדיקת זכאות מדוקדקת שביצע משרדנו,
הנכם זכאים לקבלת פיצוי בגין נזקי מלחמת "שאגת הארי".

פרטי הזכאות:
- תקופת הבדיקה: מחזור {comparisonPeriodLabel} לעומת מחזור בסיס ({basePeriodLabel})
- מחזור {comparisonPeriodLabel}: {revenueComparison} ₪
- מחזור בסיס: {revenueBase} ₪
- שיעור הפגיעה במחזור: {declinePercentage}% ירידה
  (עומד בקריטריון של לפחות {threshold}%)

השלבים הבאים שנבצע עבורכם:
1. חישוב מדויק של גובה הפיצוי ובקשת אישורכם לשידור הבקשה
2. שידור מקוון לרשות המיסים (מס רכוש) לאחר אישורכם, ומעקב צמוד
3. מעקב על סטטוס הבקשה עד לנחיתת הכסף בבנק
4. במידת הצורך: ניהול ערעור/השגה

דמי טיפול ("הוצאות בעין") מינוריים:
כידוע לכם, משרדנו לא נוהג לגבות שכרי טרחה כאחוזים מהפיצוי.
דמי הטיפול יסתכמו לסה"כ של 1,350 ₪ בתוספת מע"מ.

במסגרת התהליך, הנכם נדרשים למלא את פרטי חשבון הבנק של החברה/העסק.

[כפתור: לחצו כאן להזנת פרטי הבנק ותשלום דמי הטיפול]
→ הלינק: {paymentLink}
(תשלום באמצעות כרטיס אשראי או ביט)

בברכה,
צוות משרד {firmName}
```

---

#### מייל 3: תחום אפור (GRAY_AREA)

**נושא:** `{clientName} - תוצאות בדיקת זכאות לפיצוי "שאגת הארי"`

**תוכן:**
```
שלום {clientName},

תודה על פנייתך בנוגע למענק "שאגת הארי".
הנתונים שהוזנו מצביעים על מצב גבולי הדורש בדיקה נוספת.
נציג מטעמנו ייצור איתך קשר בקרוב לצורך הבהרות נוספות.

בברכה,
צוות משרד {firmName}
```

---

#### מייל 4: חישוב מענק מפורט (DETAILED_CALCULATION)

**נושא:** `חישוב מענק מפורט - {clientName}`

**תוכן:**
```
לכבוד {clientName}

הנדון: שלב 2 — פירוט גובה הפיצוי לו הנכם זכאים
בגין נזקי מלחמת "שאגת הארי"

כמובטח, הושלם חישוב סכום הפיצוי לו הנכם זכאים.

הפיצוי מורכב משני רכיבים עיקריים:

1. פיצוי בגין הוצאות קבועות:
   סכום: {fixedExpensesGrant} ₪

2. פיצוי בגין הוצאות שכר:
   (לאחר ניכוי חל"ת, פדיון חופשה, טיפים, מילואים)
   סכום: {salaryGrant} ₪

סך כל הפיצוי הכולל: {finalGrantAmount} ₪

שלב 3: על מנת להמשיך ולשדר את הפיצוי לרשות המיסים,
נדרש אישורכם להמשך ההליך.

[כפתור: לאישור או דחיית סכום הפיצוי — לחצו כאן]
→ הלינק: {approvalUrl}

שלב 4: לאחר אישורכם, נשדר את הבקשה לרשות המיסים.
שלב 5: נמשיך במעקב צמוד על קבלת הכספים.

בברכה,
צוות משרד {firmName}
```

---

#### מייל 5: אישור שידור לרשות המיסים (SUBMISSION_CONFIRMATION)

**נושא:** `הודעה על שידור הפיצוי לו הנכם זכאים בגין נזקי מלחמת "שאגת הארי"`

**תוכן:**
```
לכבוד {clientName}

שלב 4: כמובטח, בהתאם לתהליך, ולאחר אישורכם

משרדנו שידר באופן מקוון והגיש את הבקשה לרשות המיסים (מס רכוש)
לקבלת הפיצוי ביום {submissionDate}.

סכום הפיצוי הצפוי: {grantAmount} ₪

מספר הבקשה הינו {requestNumber}.

שלב 5: משרדנו יבצע מעקב על תקבול הפיצוי הנדרש,
בפועל (גובה הסכום המתקבל ומועד).
במידת הצורך: ניהול ערעור/השגה.

זכרו — על פי החוק רשות המיסים מחויבת:
- לאחר 21 ימים: לשלם מקדמה של לפחות 60%
- לאחר 150 ימים: לקבוע זכאות (תשלום מלא), ואם לא — 10% נוסף
- לאחר 8 חודשים: אם לא אושר — תשלום מלא חובה

משרדנו כמובן ממשיך לעקוב על סטטוס הבקשה.

בברכה,
צוות משרד {firmName}
```

---

#### מייל 6: בקשת נתונים מרואה חשבון (ACCOUNTING_FORM_REQUEST)

**תוכן:**
```
שלום,

משרד {firmName} מבקש ממך למלא נתוני שכר עבור הלקוח {clientName}
לצורך חישוב מענק "שאגת הארי".

[כפתור: מילוי טופס נתונים]
→ הלינק: {formUrl}?token={submissionToken}

הנתונים הנדרשים:
- שכר ברוטו {salaryPeriodLabel} (טופס 102)
- ניכוי מילואים (₪ + כמות עובדים)
- ניכוי טיפים (₪ + כמות עובדים)
- ניכוי חל"ת (₪ + כמות עובדים)
- ניכוי חופשה (₪ + כמות עובדים)
- כמות עובדים כוללת

בברכה,
{firmName}
```

---

#### מייל 7: בקשת נתוני שכר (SALARY_DATA_REQUEST)

**נושא:** `בקשה להזנת נתוני שכר עבודה - {clientName}`

**תוכן:**
```
לכבוד {recipientName}

הנדון: בקשה להזנת נתוני שכר עבודה עבור {clientName}

בהמשך לבדיקת הזכאות שבוצעה, אנו נדרשים לנתונים נוספים מתוך
רישומי השכר שלכם לצורך חישוב מדויק של סכום הפיצוי.

הטופס מאובטח ולוקח מספר דקות בלבד למילוי.

[כפתור: הזנת נתוני שכר עבודה]
→ הלינק: {formUrl}?token={submissionToken}

הנתונים הנדרשים:
- שכר ברוטו לחודש (טופס 102)
- עובדים בחל"ת (כמות + סכום)
- פדיון חופשה (כמות + סכום)
- מילואים (כמות + סכום)
- טיפים (כמות + סכום)

⚠️ הטופס תקף ל-7 ימים. ניתן לבקש שליחה מחדש מהמשרד.

בברכה,
צוות משרד {firmName}
```

### 5.2 לוגיקת שליחה

| אירוע | מייל שנשלח | נמענים |
|-------|-----------|--------|
| בדיקת זכאות הושלמה | NOT_ELIGIBLE / ELIGIBLE / GRAY_AREA | כל המיילים של הלקוח |
| חישוב מפורט הושלם (שלב 4) | DETAILED_CALCULATION | כל המיילים של הלקוח |
| לקוח אישר → שודר לרשות המיסים | SUBMISSION_CONFIRMATION | כל המיילים של הלקוח |
| נדרש נתוני שכר | ACCOUNTING_FORM_REQUEST | מייל רואה חשבון |
| נדרש נתוני שכר | SALARY_DATA_REQUEST | לקוח / מנהלת חשבונות / איש קשר |

### 5.3 הגדרות שליחה (SendGrid)

- **From:** מתוך הגדרות tenant (מייל מאומת)
- **BCC:** מייל מעקב (הגדרה ברמת tenant)
- **Click tracking:** DISABLED (לשמור על לינקים)
- **Open tracking:** DISABLED
- **Categories:** `['shaagat-haari', 'grant-notification']`

---

## 6. אינטגרציית תשלום (Cardcom)

### 6.1 זרימת תשלום

```
1. לקוח לוחץ על "תשלום" במייל הזכאות
2. מועבר לדף פרטי בנק + תשלום (טופס חיצוני של TicoVision)
3. לקוח ממלא פרטי חשבון בנק
4. מועבר ל-Cardcom לתשלום (1,350 ₪ + מע"מ)
5. Cardcom שולח webhook עם אישור
6. המערכת מעדכנת payment_status = 'PAID'
```

### 6.2 לינק תשלום

```
// הלינק שנשלח ללקוח:
{frontendUrl}/shaagat-haari/bank-details?token={bankDetailsToken}&client={clientId}&paymentLink={cardcomUrl}

// Cardcom URL:
https://secure.cardcom.solutions/EA/EA5/{TERMINAL_ID}/PaymentSP?custom1={clientId}
```

### 6.3 טופס חיצוני (Bank Details Form)

טופס ציבורי (ללא auth) שנגיש דרך טוקן:
- שם בעל חשבון
- מספר בנק
- מספר סניף
- מספר חשבון
- אימות: הזנת מספר ח.פ./ע.מ.

---

## 7. מסכי UI

### 7.1 כניסה מהתפריט

**שם בתפריט:** "מענקי שאגת הארי"
**אייקון:** `Award` מ-Lucide (או `Shield`, `Swords`)
**Route:** `/shaagat-haari`
**Allowed roles:** `['admin', 'accountant', 'bookkeeper']`

### 7.2 דשבורד מענקים (עמוד ראשי)

```
┌────────────────────────────────────────────────────┐
│  KPI Cards:                                        │
│  [סה"כ לקוחות] [זכאים] [לא זכאים] [אפור]          │
│  [שולמו] [חישוב הושלם] [שודרו] [ממתינים]           │
│  [סה"כ מענקים צפויים] [סה"כ התקבלו]                │
├────────────────────────────────────────────────────┤
│  Filters: [חיפוש] [סטטוס] [מסלול] [סוג דיווח]     │
├────────────────────────────────────────────────────┤
│  טבלת לקוחות:                                       │
│  שם | ח.פ. | מסלול | סטטוס זכאות | % ירידה | שכ"ט │
│  חישוב | שודר | פעולות                              │
│                                                     │
│  כל שורה: כפתורי פעולה (בדיקת זכאות, חישוב,        │
│  שליחת מייל, צפייה בהיסטוריה)                       │
├────────────────────────────────────────────────────┤
│  ⚠️ התראות מועדים: מקדמה / קביעת זכאות / תשלום     │
└────────────────────────────────────────────────────┘
```

### סינון רלוונטיות
- כל לקוח ניתן לסימון כ"לא רלוונטי" (toggle)
- ברירת מחדל: מוסתרים מהטבלה
- Checkbox "הצג גם לא רלוונטיים"
- שדה: `is_relevant BOOLEAN DEFAULT TRUE` על `shaagat_feasibility_checks`

### ייצוא נתונים
- כפתור "ייצוא לאקסל" על הטבלה הראשית
- מייצא את כל השורות עם הפילטרים הנוכחיים
- כולל: שם, ח.פ., מסלול, סטטוס, אחוז ירידה, מענק צפוי, שכ"ט, סטטוס הגשה

### 7.3 טופס בדיקת זכאות

```
┌────────────────────────────────────────────────────┐
│  בחירת לקוח: [dropdown מרשימת clients]              │
│                                                     │
│  ── הגדרות ──                                        │
│  מסלול: [רגיל / מזומן / צפון / קבלנים / חדש]        │
│  סוג עסק: [רגיל / עמותה]                             │
│  סוג דיווח: [חודשי / דו-חודשי]                      │
│  מחזור שנתי: [______] (12,000-400,000,000)           │
│                                                     │
│  ── מחזורים (תקופות משתנות לפי מסלול) ──             │
│  מחזור בסיס ({basePeriodLabel}): [______]            │
│  מחזור השוואה ({comparisonPeriodLabel}): [______]    │
│                                                     │
│  ── הפחתות (אופציונלי) ──                            │
│  הכנסות הון בסיס: [______]  הכנסות הון השוואה: [____]│
│  עצמיות בסיס: [______]      עצמיות השוואה: [______]  │
│                                                     │
│  [חישוב זכאות]                                       │
│                                                     │
│  ── תוצאה ──                                         │
│  ירידת מחזור: 32.5%                                  │
│  סטטוס: ✅ זכאי | שיעור פיצוי: 7%                   │
│                                                     │
│  [שמור] [שמור + שלח מייל]                            │
└────────────────────────────────────────────────────┘
```

> **חשוב:** תוויות התקופות (labels) משתנות דינמית לפי בחירת המסלול וסוג הדיווח.
> לדוגמה: "03/2025" למסלול רגיל חד-חודשי, "03/2023" למסלול צפון חד-חודשי.

### 7.4 חישוב מענק מפורט (Wizard — 4 שלבים)

**צעד 1:** אימות נתוני עסק (מבדיקת זכאות — readonly)
**צעד 2:** הזנת תשומות (vatInputs, zeroVatInputs, inputsMonths) + אפשרות מכפיל ×1.5
**צעד 3:** הזנת נתוני שכר (עם אפשרות טעינה אוטומטית מטופס רו"ח)
**צעד 4:** תוצאות חישוב (אוטומטי) — מענק הוצאות, מענק שכר, תקרה, השוואה למסלול קטנים, סה"כ

### 7.5 מעקב שידור לרשות המיסים

טבלה עם כל השידורים + סטטוסים + מועדים חוקיים + מכתבים + התראות deadline

### 7.6 ציר זמן לקוח (Client Timeline)

Route: `/shaagat-haari/client/:clientId/history`

מציג את כל הפעולות לאורך הזמן: בדיקות היתכנות, זכאות, תשלומים,
טפסי שכר, חישובים, מיילים, אישורים, הגשות, מכתבים מרשות המסים,
עדכוני סטטוס, העלאות קבצים.

מקור: `shaagat_status_history` + joins

### 7.7 מפת תהליך (Process Hub)

Route: `/shaagat-haari/process`

5 כרטיסים ויזואליים שמייצגים את שלבי התהליך:
📧 גיוס → ✅ זכאות → 🧮 חישוב → 📋 הגשה → 💰 מעקב

כל כרטיס מציג KPI עדכני + לחיצה מנווטת לעמוד הרלוונטי.

---

## 8. הנחיות ארכיטקטורה ל-TicoVision

### 8.1 מבנה מודול

```
src/modules/shaagat-haari/
├── pages/
│   ├── ShaagatDashboardPage.tsx          # עמוד ראשי
│   ├── EligibilityCheckPage.tsx          # טופס בדיקת זכאות
│   ├── DetailedCalculationPage.tsx       # Wizard חישוב מפורט
│   ├── TaxSubmissionsPage.tsx            # מעקב שידורים
│   ├── BankDetailsFormPage.tsx           # טופס חיצוני (ללא auth)
│   ├── GrantApprovalPage.tsx             # טופס חיצוני אישור (ללא auth)
│   └── AccountingFormPage.tsx            # טופס חיצוני רו"ח (ללא auth)
├── components/
│   ├── EligibilityForm.tsx
│   ├── EligibilityDashboard.tsx
│   ├── TrackSelector.tsx                 # בחירת מסלול
│   ├── CalculationWizard.tsx
│   ├── GrantKPICards.tsx
│   ├── GrantFilters.tsx
│   ├── GrantTable.tsx
│   ├── TaxSubmissionTracker.tsx
│   ├── DeadlineAlerts.tsx                # התראות מועדים חוקיים
│   └── SmallTrackComparison.tsx          # השוואת מסלולים
├── services/
│   └── shaagat.service.ts                # extends BaseService
├── store/
│   └── shaagatStore.ts                   # Zustand store
├── lib/
│   ├── grant-calculations.ts            # ⚠️ מקור אמת יחיד לחישובים
│   ├── grant-constants.ts               # כל הקבועים
│   ├── grant-email-templates.ts         # תוכן מיילים
│   ├── track-periods.ts                 # לוגיקת תקופות לפי מסלול
│   └── small-business-lookup.ts         # טבלת lookup מסלול קטנים
├── types/
│   └── shaagat.types.ts                  # TypeScript types (discriminated unions)
└── index.ts
```

### 8.2 Calculation Engine Architecture

```
calculateGrant() — Main entry point (pure function)
├── calculateEligibility()
│   ├── calculateNetRevenue()
│   ├── calculateDeclinePercentage()
│   ├── determineEligibilityStatus()
│   └── getCompensationRate()
├── calculateGrantBreakdown()
│   ├── calculateFixedExpensesGrant()
│   ├── calculateSalaryGrant()
│   │   ├── calculateAdjustedSalary()
│   │   ├── calculateEffectiveDecline()
│   │   └── calculateSalaryCap()
│   ├── applyTrackMultiplier()    — (contractor × 0.68)
│   └── applyGrantCap()
└── maybeCompareWithSmallBusiness() — "take higher" rule
    └── lookupSmallBusinessGrant()
```

**Key Design Decisions:**
1. **All calculations in TypeScript** (not PostgreSQL) — real-time preview in wizard UI
2. **DB stores inputs + ALL intermediate values** — audit trail as explicit columns, not JSONB
3. **Constants versioning** — `constants_version` in audit trail for future regulation changes
4. **Testing:** Pure functions = no mocking needed. Target 100+ parameterized test cases
5. **The caller (UI/service) provides correct period data** — the engine does not know about dates

### 8.3 Service Pattern

```typescript
// src/modules/shaagat-haari/services/shaagat.service.ts
import { BaseService } from '@/services/base.service';

export class ShaagatService extends BaseService {
  constructor() {
    super('shaagat_eligibility_checks');
  }

  // כל query חייב לכלול tenant_id
  async getEligibilityChecks(filters?: ShaagatFilters) {
    const tenantId = await this.getTenantId();
    // ...
  }

  async getDashboardStats() {
    const tenantId = await this.getTenantId();
    const { data } = await supabase.rpc('get_shaagat_dashboard_stats', {
      p_tenant_id: tenantId,
    });
    return data;
  }
}

export const shaagatService = new ShaagatService();
```

### 8.4 Store Pattern (Zustand)

```typescript
// src/modules/shaagat-haari/store/shaagatStore.ts
import { create } from 'zustand';

interface ShaagatState {
  checks: EligibilityCheck[];
  stats: GrantStats;
  filters: ShaagatFilters;
  isLoading: boolean;
  selectedTrack: TrackType;

  fetchChecks: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<ShaagatFilters>) => void;
  setTrack: (track: TrackType) => void;
  // ...
}
```

### 8.5 Navigation Integration

הוסף ב-`MainLayout.tsx` בתוך מערך `navigation`:

```typescript
{
  name: 'מענקי שאגת הארי',
  href: '/shaagat-haari',
  icon: Award, // מ-lucide-react
  menuKey: 'shaagat-haari',
  allowedRoles: ['admin', 'accountant', 'bookkeeper'],
  submenu: [
    { name: 'לוח בקרה', href: '/shaagat-haari' },
    { name: 'בדיקת זכאות', href: '/shaagat-haari/eligibility' },
    { name: 'חישובי מענק', href: '/shaagat-haari/calculations' },
    { name: 'שידורים לרשות המיסים', href: '/shaagat-haari/submissions' },
  ]
}
```

### 8.6 Routes (App.tsx)

```typescript
const ShaagatDashboard = lazy(() => import('./modules/shaagat-haari/pages/ShaagatDashboardPage'));
const EligibilityCheck = lazy(() => import('./modules/shaagat-haari/pages/EligibilityCheckPage'));
const DetailedCalculation = lazy(() => import('./modules/shaagat-haari/pages/DetailedCalculationPage'));
const TaxSubmissions = lazy(() => import('./modules/shaagat-haari/pages/TaxSubmissionsPage'));
const BankDetailsForm = lazy(() => import('./modules/shaagat-haari/pages/BankDetailsFormPage'));
const GrantApproval = lazy(() => import('./modules/shaagat-haari/pages/GrantApprovalPage'));
const AccountingForm = lazy(() => import('./modules/shaagat-haari/pages/AccountingFormPage'));

// Protected routes
<Route path="/shaagat-haari" element={<ShaagatDashboard />} />
<Route path="/shaagat-haari/eligibility" element={<EligibilityCheck />} />
<Route path="/shaagat-haari/eligibility/:clientId" element={<EligibilityCheck />} />
<Route path="/shaagat-haari/calculations/:checkId" element={<DetailedCalculation />} />
<Route path="/shaagat-haari/submissions" element={<TaxSubmissions />} />

// Public routes (with token)
<Route path="/shaagat-haari/bank-details" element={<BankDetailsForm />} />
<Route path="/shaagat-haari/grant-approval" element={<GrantApproval />} />
<Route path="/shaagat-haari/accounting-form" element={<AccountingForm />} />
```

---

## 9. טפסים חיצוניים

### 9.1 טופס פרטי בנק (Bank Details Form)

**URL:** `/shaagat-haari/bank-details?token={accessToken}&client={clientId}&paymentLink={cardcomUrl}`
**אימות:** token validation בלבד (ללא login) — דרך RPC `get_shaagat_bank_form_by_token`

**שדות:**

| שדה | סוג | חובה | תיאור |
|-----|------|------|-------|
| שם בעל חשבון | טקסט | כן | |
| מספר בנק | מספר | כן | |
| מספר סניף | מספר | כן | |
| מספר חשבון | מספר | כן | |
| ח.פ./ע.מ. לאימות | טקסט | כן | חייב להתאים ללקוח |

**זרימה:**
1. לקוח ממלא פרטי בנק → שמירה דרך RPC `submit_shaagat_bank_details`
2. מועבר ל-Cardcom לתשלום דמי טיפול
3. Cardcom webhook מעדכן `payment_status = 'PAID'`

#### רשימת בנקים ישראליים (dropdown)

| קוד | שם הבנק |
|---|---|
| 10 | בנק לאומי |
| 11 | בנק דיסקונט |
| 12 | בנק הפועלים |
| 13 | בנק איגוד |
| 14 | בנק אוצר החייל |
| 17 | בנק מרכנתיל דיסקונט |
| 20 | בנק מזרחי-טפחות |
| 31 | בנק הבינלאומי |
| 46 | בנק מסד |
| 52 | בנק פאגי |
| 54 | בנק ירושלים |

### 9.2 טופס אישור מענק (Grant Approval)

**URL:** `/shaagat-haari/grant-approval?token={approvalToken}`
**אימות:** token validation — דרך RPC `get_shaagat_approval_by_token`

**מציג:**
- פירוט מענק הוצאות קבועות
- פירוט מענק שכר
- סה"כ מענק
- כפתור "מאשר" / "לא מאשר" (עם שדה סיבה)

### 9.3 טופס רואה חשבון חיצוני (Accounting Submission)

**URL:** `/shaagat-haari/accounting-form?token={submissionToken}&client={clientId}`
**אימות:** token validation — דרך RPC `get_shaagat_accounting_form_by_token`

**שדות:**

| שדה | סוג | חובה | תיאור |
|-----|------|------|-------|
| שכר ברוטו (טופס 102) | מספר | כן | חודש {salaryPeriodLabel} |
| ניכוי מילואים (₪) | מספר | לא | |
| כמות עובדים במילואים | מספר שלם | לא | |
| ניכוי טיפים (₪) | מספר | לא | |
| כמות עובדים בטיפים | מספר שלם | לא | |
| ניכוי חל"ת (₪) | מספר | לא | |
| כמות עובדים בחל"ת | מספר שלם | לא | |
| ניכוי חופשה (₪) | מספר | לא | |
| כמות עובדים בחופשה | מספר שלם | לא | |
| כמות עובדים כוללת | מספר שלם | כן | |

**טעינה אוטומטית:** כשנתוני חשבונאות הוגשו, שלב 3 בחישוב המפורט טוען אותם אוטומטית (עם אפשרות לערוך).

### 9.4 ניהול טוקנים

ניהול טוקנים:
- תוקף ברירת מחדל: 7 ימים
- כפתור "שלח מחדש" במערכת → יוצר טוקן חדש + שולח מייל חדש
- המערכת מראה: תאריך שליחה אחרון, תאריך פקיעת תוקף
- טוקן ישן מתבטל בעת יצירת חדש

---

## 10. הגדרות חוקיות ותחולת החוק

### 10.1 מי בתחולת החוק (זכאי)

- כל העוסקים למינהם (פטור, מורשה), בעלי מחזור שנתי **מעל 12,000 ₪ ועד 400 מיליון ₪**
- **מוסד ציבורי זכאי** — 25% לפחות מהכנסתו בשנת 2022 (לפי סעיף 131) ממכירת שירותים/מוצרים, באופן שוטף וברוב חודשי השנה
- **קבלני ביצוע** — קבלנים רשומים לעבודות הנדסה קבלניות בנאיות

### 10.2 מי הוחרג מתחולת החוק (לא זכאי)

- מוסד פיננסי, קופ"ח, גופים מתוקצבים, המדינה, חברות ממשלתיות, תאגיד שהוקם לפי חוק
- מוסד ציבורי (שלא עומד בהגדרת "זכאי")
- מי שעיסוקו בסחר בזכויות במקרקעין המהווה מלאי עסקי בידיו
- מי ש-50%+ מהעבודות שביצע ב-2022 או 2023 היו עבודות למעל שנה — **למעט:** קבלן ביצוע, יהלומנים, חקלאות
- מי שפנקסיו לשנת 2025 נקבעו כ**בלתי קבילים** (בקביעה שאינה ניתנת לערר/ערעור)

### 10.3 עסק סגור (לא זכאי)

מי יחשב עסק סגור:
- דיווח לרשות המיסים על סגירת עסקו **לפני 12/06/2025**
- דיווח **4 דוחות 0** לפני 01/03/2026 — אלא אם שוכנע המנהל שהעסק פעיל
- **לא הגיש 2 מתוך 3** דוחות מע"מ שמועדם לפני 12/06/2025 — אלא אם שוכנע המנהל שהעסק פעיל

### 10.4 הגדרות חוקיות

**מחזור עסקאות:**
- כפי שדווח למע"מ
- **למעט:** עסקאות מחשבונית עצמית, הכנסות הוניות
- מכר/שירות מעוסק לקרובו: ניתן לכלול אם החשבונית מקיימת תנאי שוק

**הוצאות/תשומות שוטפות:**
- הוצאות שנוכה מהן מע"מ תשומות **רגיל** (לא ציוד)
- תשומות בשיעור מע"מ **אפס** (פירות וירקות, תיירות — סעיף 30 לחוק מע"מ)
- **לא כולל:** ארנונה, ביטוח, אגרות (אין להן מע"מ)
- **למעט:** תשומות מרכישה מעוסק קרוב (אלא אם תנאי שוק)

**עמותה/חל"צ — מוסד ציבורי זכאי:**
- **תמיכות פעילות:** תמיכה ישירה בפעילות ספציפית תחשב כהכנסה ממכירת שירותים
- **מחזור העסקאות:** יכלול סכום ההכנסות ממכירת שירותים/מוצרים בלבד
- **הבחנה:** הכנסות ממתן שירותים למדינה (כולל מכרזים) = לא תמיכה, אלא הכנסה ממכירת שירותים

**שונות:**
- המענק **אינו חייב במע"מ**, **חייב בדמי ביטוח לאומי**
- עוסק שתקופת הדיווח שלו **השתנתה** — ימדד על בסיס דיווח **דו-חודשי**
- מענק **לעוסק פטור** ישולם על בסיס מילוי נתוני מחזור בהצהרה
- **חשוב לבדוק פטור מניכוי מס במקור** לפני הגשת המענקים

---

## 11. מועדים חוקיים (Deadlines)

### 11.1 מועדים לאישור בקשה

| מועד | פעולה |
|------|-------|
| הגשת הבקשה | הגשת בקשה + המצאת מסמכים תוך **30 יום** |
| **21 ימים** מהגשה | מקדמה **60%** |
| **150 ימים** מהגשה | קביעת זכאות, ואם לא — **10% נוספים** |
| **8 חודשים** מהגשה | אם לא נקבעה זכאות — **הבקשה התקבלה במלואה** |

### 11.2 מועדים להשגה וערר

| מועד | פעולה |
|------|-------|
| מכתב החלטה | נקודת מוצא |
| **90 ימים** מהחלטה | הגשת **השגה** |
| **8 חודשים** מהשגה | אם לא טופלה — ההשגה **התקבלה במלואה** |
| **8 חודשים + 60 יום** | הגשת **ערר** |
| אחרי קביעת זכאות | תשלום תוך **14 יום** |
| אורכה בהשגה | **10 חודשים** מקסימום |

### 11.3 חישוב אוטומטי של מועדים

```typescript
// המערכת מחשבת אוטומטית מועדים על בסיס submission_date (ראה trigger בסכמה 3.3)
interface SubmissionDeadlines {
  documentsDueDate: Date;           // submission + 30 days
  advanceDueDate: Date;             // submission + 21 days
  determinationDueDate: Date;       // submission + 150 days
  fullPaymentDueDate: Date;         // submission + 8 months
  objectionDueDate?: Date;          // decision + 90 days
  objectionDeterminationDate?: Date; // objection + 8 months
  appealDueDate?: Date;             // objection + 8 months + 60 days
}
```

---

## 12. דגשים להגשה

### 12.1 עסק צומח

עסק בהתרחבות ששינה את מבנה ואופי הפעילות שלו באמצעות הוספת סניפים, ענפים, פעילות, פרויקטים, לקוחות, או הסכמים אסטרטגיים משמעותיים.
> הערה למערכת: לשמור סימון "עסק צומח" ברמת לקוח — להצדקת ירידת מחזור מול רשות המיסים.

### 12.2 ירידה טבעית

**אין** להפחית את המענק לאור ירידה טבעית במחזורים בשנת 2025 — אלא במקרים חריגים של סגירת סניפים/פעילות.

### 12.3 עונתיות

עונתיות **אינה** תנודתיות — אין להפחית את המענק בשל כך.

### 12.4 תנודתיות

במידה ורשות המיסים מבקשת להפחית את המענק כתוצאה מתנודתיות עסקית — יש לבחון האם קיימת תנודתיות **מהותית** בעסק ואם כן כיצד בוצע התחשיב.

### 12.5 הגדלת מקדם פיצוי (×1.5)

ניתן להגדיל את מקדם הפיצוי **פי 1.5** על ידי הוכחת הוצאות קבועות מעבר לתחשיב הנוסחה הרגילה.

### 12.6 הוצאות שירדו לטימיון

נחשבות להוצאות קבועות — ניתן לכלול בתחשיב לצורך הגדלת המקדם ו/או הוכחת תשלום הוצאות קבועות.

### 12.7 חובת הגשת דוח מע"מ

חובה להגיש דוח מע"מ 03/2026 (לחד חודשי) או 03-04/2026 (לדו חודשי) **בהתאמה** — לפני הגשת הבקשה.

### 12.8 פטור מניכוי מס במקור

חשוב לבדוק פטור מניכוי מס במקור **לפני** הגשת המענקים.

---

## 13. נזק ישיר ואובדן שכר דירה

### 13.1 פיצוי בעד נזק עקיף לנפגע בנזק ישיר

**6 חודשי זכאות נוספים:**
- בדיווח חד חודשי: **04-09/2026**
- בדיווח דו חודשי: **05-10/2026**

**תנאים מקדימים:**
1. בשל הנזק הישיר **לא ניתן להשתמש** במקום העסק שניזוק, **עד ליום 30/04/2026**
2. במהלך כל תקופה נוספת — לא ניתן להשתמש במקום העסק שניזוק, בתקופה של **15 ימים לפחות**

**הזכאות:**
1. מענק בגין **הוצאות מזכות** ל-6 התקופות הנוספות
2. מענק נוסף בגובה **ההכנסה החייבת החודשית** (סעיף 2(1) או 2(6)) בשנת הבסיס, ובלבד שלתקופת דיווח דו-חודשית **לא יעלה על 30,000 ₪** × שיעור ירידת המחזורים

```
additionalGrant = min(monthlyTaxableIncome × declinePercentage, 30_000)
// לתקופת דיווח דו-חודשית
```

### 13.2 פיצוי בעד אובדן שכר דירה לבעלי נכסים

**תנאים מקדימים:**
1. הדירה/הנכס הייתה **מושכרת** ביום קרות הנזק או בשלושת החודשים שקדמו
2. בשל הנזק **לא ניתן להשתמש** בדירה/נכס לתקופה של **חודש לפחות**
3. **הוכח למנהל** שלא שולם שכ"ד לבעלים כל תקופת השיקום

**פיצויים:**
- **דירת מגורים:** פיצוי בגובה שכ"ד האחרון שקיבל לאורך תקופת השיקום
- **נכס שאינו בידי עוסק:** פיצוי בגובה שכ"ד האחרון שקיבל לאורך תקופת השיקום
- **נכס בידי עוסק:** תקופות נוספות (מאי-יוני, יולי-אוגוסט, ספטמבר-אוקטובר 2026):
  1. מסלול הוצאות מזכות
  2. פיצוי נוסף בגובה ההכנסה החייבת (2(1) או (6)) — מוגבל ל-30,000 ₪ לתקופת דו-חודשי

---

## 14. לקחים מהמערכת הישנה (Anti-Patterns to Avoid)

### 14.1 באגים שנמצאו

**באג #1 — סדר פעולות בשכר (CRITICAL):**
```
שגוי (frontend):  (salary × 1.25) - deductions = ₪115,000
נכון:             (salary - deductions) × 1.25 = ₪112,500
→ הפרש של ₪2,500 לכל עובד!
```

**באג #2 — תקרת שכר — שלוש נוסחאות שונות:**
```
Frontend: cap = employees × 13,773 × 1.25  (חסרים decline% ו-0.75!)
Backend:  cap = employees × 13,773 × 1.25 × 0.75 × decline%  (כולל 0.75 — שגוי!)
מצגת:    cap = employees × 13,773 × 1.25 × decline%  (ללא 0.75!)
→ שלושה מקומות, שלוש נוסחאות שונות!
```

**באג #3 — קבועים מפוזרים:**
- `1.25` הופיע ב-6 קבצים
- `13,773` הופיע ב-4 קבצים
- `0.75` הופיע ב-4 קבצים
- `0.003` הופיע ב-3 קבצים

**באג #4 — 7 מקומות שונים עם חישובים (!):**
1. GrantCalculationPage.tsx (frontend — נוסחה שגויה)
2. server-simple.ts (backend — נוסחה מתוקנת)
3. recalculate-all-grants.ts (סקריפט תיקון)
4. fix-incomplete-calculations.js (סקריפט תיקון נוסף)
5. grant_calculator.tsx (מחשבון עצמאי)
6. GrantDetailedCalculationPage.tsx (wizard)
7. emailService.ts (בתוך הודעות מייל)

### 14.2 עקרונות למניעה במערכת החדשה

| בעיה ישנה | פתרון חדש |
|---|---|
| נוסחאות ב-7 מקומות | **קובץ אחד בלבד:** `grant-calculations.ts` |
| קבועים מפוזרים | **קובץ constants אחד:** `grant-constants.ts` |
| Frontend מחשב לבד | Frontend קורא **מאותה pure function** |
| אין טסטים | **100+ unit tests** על pure functions |
| סדר פעולות שונה | **כל intermediate value שמור ב-DB** — audit trail |
| תקרה לא נכונה | **נוסחת תקרה מפורשת:** `13,773 × multiplier × employees × decline%` (ללא ×0.75!) |
| תקופות hardcoded (2023, יוני 2025) | **תקופות גנריות:** `revenue_base_period`, `revenue_comparison_period` |

---

## 15. גיבוי ושחזור (Backup System)

יצירת snapshot של כל טבלאות שאגת הארי.

### טבלאות:
כל 10 טבלאות של המודול (feasibility, eligibility, calculations, submissions, letters, periods, bank, accounting, email_logs, status_history)

### פעולות:
- יצירת גיבוי ידני
- הורדת גיבוי (ZIP)
- שחזור מגיבוי (עם אישור כפול)
- שליחת גיבוי במייל
- שמירת 30 גיבויים אחרונים

---

## 16. Checklist ביצוע

### Database & Backend
- [ ] יצירת migration files ל-9 טבלאות
- [ ] 5 RPC functions (token-based forms + dashboard stats)
- [ ] Dashboard view (`shaagat_dashboard_view`)
- [ ] Deadline computation trigger
- [ ] RLS policies (role-aware, not simple tenant isolation)

### Calculation Engine
- [ ] `grant-constants.ts` — כל הקבועים
- [ ] `grant-calculations.ts` — מקור אמת יחיד
- [ ] `small-business-lookup.ts` — טבלת lookup
- [ ] `track-periods.ts` — לוגיקת תקופות לפי מסלול
- [ ] 100+ unit tests על pure functions
- [ ] דוגמת המצגת (שקף 8) כ-test case

### Types
- [ ] `shaagat.types.ts` — discriminated unions ל-6 מסלולים
- [ ] Zod schemas לוולידציית טפסים

### Service & Store
- [ ] `shaagat.service.ts` — extends BaseService
- [ ] `shaagatStore.ts` — Zustand store

### UI Pages
- [ ] דשבורד ראשי עם KPIs + התראות מועדים
- [ ] טופס בדיקת זכאות (עם בחירת מסלול דינמית)
- [ ] Wizard חישוב מפורט (4 שלבים)
- [ ] מעקב שידורים + מכתבים + מועדים
- [ ] טופס חיצוני — פרטי בנק + תשלום
- [ ] טופס חיצוני — אישור מענק
- [ ] טופס חיצוני — הגשת נתוני רו"ח

### Email & Integration
- [ ] תבניות מייל (6 סוגים) עם משתנים מעודכנים
- [ ] אינטגרציית Cardcom
- [ ] הוספה לתפריט ניווט
- [ ] Routes ב-App.tsx

### Testing & Validation
- [ ] כל הנוסחאות מהמצגת מכוסות
- [ ] כל 6 מסלולים (standard, small, cash_basis, new_business, northern, contractor) נבדקו
- [ ] דוגמת המצגת (137,538 ₪) עוברת
- [ ] תקרת שכר ללא ×0.75
- [ ] תקופות נכונות (03/2025 vs 03/2026, לא 2023 vs יוני 2025)
- [ ] RTL layout verified

### גרסה 2.1 — תוספות
- [ ] שלב 0: Broadcast per-company + טופס היתכנות + תשלום
- [ ] טבלת `shaagat_feasibility_checks`
- [ ] טופס נתוני שכר (חיצוני, טוקן 7 ימים, שליחה מחדש)
- [ ] מייל #7: בקשת נתוני שכר
- [ ] הגשה חובה: מספר אישור + צילום (validation)
- [ ] פירוט הוצאות קבועות (7 סוגים)
- [ ] רשימת בנקים ישראליים (dropdown)
- [ ] Client Relevance Toggle
- [ ] Client History/Timeline
- [ ] Manual Approval Override
- [ ] Process Hub Page
- [ ] Dashboard funnel KPIs
- [ ] ייצוא Excel מדשבורד
- [ ] Backup System
- [ ] ניהול טוקנים (7 ימים, שליחה מחדש)
