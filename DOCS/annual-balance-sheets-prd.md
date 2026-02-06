# Product Requirements Document: מאזנים שנתיים (Annual Balance Sheets)

**Version**: 1.0
**Date**: 2026-02-06
**Author**: Sarah (Product Owner)
**Quality Score**: 91/100

---

## Executive Summary

משרדי רואי חשבון מנהלים מדי שנה תהליך הכנת דוחות כספיים (מאזנים) לכל לקוח. התהליך כולל קבלת חומר מהלקוח, שיוך לרואה חשבון מבקר, ביצוע העבודה, אישור המשרד, שידור הדוח לרשות המסים, עדכון מקדמות ושליחת מכתב חוב.

כיום התהליך מנוהל בצורה ידנית (אקסלים, זיכרון) ואין נראות לגבי כמה תיקים בכל שלב, מה מושהה ומה הושלם. מערכת "מאזנים" תיתן למשרד שקיפות מלאה על התקדמות כל התיקים, תאפשר מעקב לפי מבקר, ותתממשק עם כרטיס הלקוח ומערכת המכתבים.

המערכת מתוכננת כמנגנון שנתי כללי (מאזני 25, מאזני 26...) עם פתיחת שנה אוטומטית לכל החברות והשותפויות הפעילות.

---

## Problem Statement

**מצב נוכחי**: אין כלי מרכזי לעקוב אחר תהליך הכנת דוחות כספיים. המשרד לא יודע בכל רגע נתון כמה תיקים הגיעו, כמה בעבודה, כמה שודרו. מידע נמצא בראש של אנשים ספציפיים.

**פתרון מוצע**: תת-מערכת "מאזנים" בתוך ה-CRM הקיים - מציגה את כל הלקוחות כתיקים עם סטטוס workflow ברור, משויכים למבקר, עם דשבורד מרכזי ואינטגרציה לכרטיס לקוח.

**השפעה עסקית**:
- שקיפות מלאה על התקדמות עונת המאזנים
- זיהוי צווארי בקבוק (מבקר עמוס, תיקים תקועים)
- הפחתת פספוסי דדליינים
- מעבר חלק בין שלבים ללא תלות בזיכרון אישי

---

## Success Metrics

**Primary KPIs:**
- **אחוז השלמה**: X% מהתיקים הגיעו לסטטוס "דוח שודר" עד סוף יוני
- **זמן ממוצע לתיק**: מרגע "הגיע חומר" עד "דוח שודר"
- **חלוקה מאוזנת**: עומס מבקרים מאוזן (ניתן לראות בדשבורד)

**Validation**: מדידה דרך דשבורד המאזנים - סיכומים לפי שלב ולפי מבקר

---

## User Personas

### Primary: מנהל/ת המשרד (Admin)
- **Role**: admin
- **Goals**: לראות תמונת מצב כוללת, לשייך מבקרים, לאשר תיקים
- **Pain Points**: אין נראות על התקדמות, תלות בשאלת אנשים
- **Technical Level**: Intermediate

### Secondary: רואה חשבון / מבקר (Accountant)
- **Role**: accountant
- **Goals**: לראות את התיקים שלו, לעדכן התקדמות
- **Pain Points**: לא ברור מה הפגישה הבאה, מה הסטטוס של כל תיק
- **Technical Level**: Basic-Intermediate

### Tertiary: מהנדס/ת חשבונות (Bookkeeper)
- **Role**: bookkeeper
- **Goals**: לסמן שהגיע חומר מלקוח
- **Pain Points**: אין איפה לתעד שלקוח הביא חומר
- **Technical Level**: Basic

---

## User Stories & Acceptance Criteria

### Story 1: פתיחת שנת מאזנים

**As a** מנהל משרד (admin)
**I want to** פתוח שנת מאזנים חדשה בלחיצת כפתור
**So that** כל הלקוחות הרלוונטיים ייטענו אוטומטית עם סטטוס התחלתי

**Acceptance Criteria:**
- [ ] כפתור "פתח מאזני [שנה]" מייצר תיק לכל לקוח פעיל מסוג `company` או `partnership`
- [ ] כל תיק נוצר עם סטטוס `waiting_for_materials`
- [ ] לא ניתן לפתוח את אותה שנה פעמיים (אזהרה אם כבר קיימת)
- [ ] לקוחות לא פעילים (`inactive`) לא נכללים
- [ ] הודעת הצלחה מציגה כמה תיקים נוצרו

### Story 2: סימון הגעת חומר

**As a** כל משתמש (bookkeeper / accountant / admin)
**I want to** לסמן שלקוח הביא חומר להנהלת חשבונות
**So that** כל המשרד יודע שהחומר הגיע

**Acceptance Criteria:**
- [ ] בכניסה למערכת, נגיש מכל מקום (כרטיס לקוח, טבלת מאזנים)
- [ ] לחיצה פותחת חלון עם תאריך (ברירת מחדל: היום) ואישור
- [ ] לאחר סימון, סטטוס התיק עובר ל-`materials_received`
- [ ] תאריך קבלת החומר נשמר ומוצג
- [ ] שם המשתמש שסימן נרשם (audit trail)

### Story 3: שיוך מבקר וקביעת פגישה

**As a** מנהל משרד / רואה חשבון (admin / accountant)
**I want to** לשייך מבקר (רו"ח פנימי) לתיק ולקבוע תאריך פגישה
**So that** ברור מי אחראי ומתי הפגישה

**Acceptance Criteria:**
- [ ] בחירת מבקר מרשימת המשתמשים (accountant role)
- [ ] שדה תאריך + שעה לפגישה (חתימה / סקירה)
- [ ] סטטוס עובר ל-`assigned_to_auditor`
- [ ] המבקר רואה את התיק בדשבורד שלו
- [ ] ניתן לשנות מבקר ופגישה בכל שלב

### Story 4: מבקר מתחיל ומסיים עבודה

**As a** רואה חשבון (accountant / admin)
**I want to** לעדכן שהתחלתי / סיימתי לעבוד על תיק
**So that** המשרד יודע את מצב התיק

**Acceptance Criteria:**
- [ ] כפתור "התחל עבודה" → סטטוס `in_progress`
- [ ] כפתור "סיים עבודה" → סטטוס `work_completed` (ממתין לאישור משרד)
- [ ] תאריך תחילת עבודה ותאריך סיום נרשמים
- [ ] שם המבקר שביצע מוצג בתיק

### Story 5: אישור משרד

**As a** מנהל משרד (admin / accountant)
**I want to** לאשר תיק שהמבקר סיים
**So that** אפשר להמשיך לשידור

**Acceptance Criteria:**
- [ ] כפתור "אשר" זמין רק בסטטוס `work_completed`
- [ ] סטטוס עובר ל-`office_approved`
- [ ] תאריך אישור ושם המאשר נרשמים

### Story 6: שידור דוח

**As a** מנהל משרד / רואה חשבון (admin / accountant)
**I want to** לסמן שהדוח שודר לרשות המסים
**So that** ברור שהתיק הושלם ברמה הרגולטורית

**Acceptance Criteria:**
- [ ] כפתור "דוח שודר" → סטטוס `report_transmitted`
- [ ] תאריך שידור נרשם
- [ ] ניתן להוסיף הערה (אופציונלי)

### Story 7: עדכון מקדמות

**As a** מנהל משרד / רואה חשבון (admin / accountant)
**I want to** לרשום את סכום המקדמות החדש ולסמן שנשלח מכתב
**So that** יש תיעוד שהמקדמות עודכנו

**Acceptance Criteria:**
- [ ] שדה סכום מקדמות חדש (₪)
- [ ] סימון "עודכנו מקדמות" → סטטוס `advances_updated`
- [ ] אפשרות לקשר למכתב מהמערכת הקיימת (קישור, לא יצירה)
- [ ] תאריך עדכון נרשם

### Story 8: מכתב חוב

**As a** מנהל משרד (admin / accountant)
**I want to** לסמן אם נשלח מכתב חוב ללקוח
**So that** יש תיעוד מלא

**Acceptance Criteria:**
- [ ] שדה boolean: "נשלח מכתב חוב" כן/לא
- [ ] אם כן - קישור למכתב במערכת המכתבים האוטומטיים
- [ ] זה שלב אופציונלי - לא כל תיק דורש מכתב חוב

### Story 9: צפייה בכרטיס לקוח

**As a** כל משתמש
**I want to** לראות סטטוס המאזן בכרטיס הלקוח
**So that** בבירור עם לקוח אני יודע מיד מה המצב

**Acceptance Criteria:**
- [ ] באדג' צבעוני בכרטיס הלקוח מציג סטטוס נוכחי
- [ ] טאב נפרד "מאזנים" בכרטיס הלקוח עם היסטוריית שנים
- [ ] צבעי באדג': אדום (ממתין), כתום (בתהליך), ירוק (הושלם)
- [ ] לחיצה על באדג' מובילה לפרטי התיק

### Story 10: דשבורד מאזנים

**As a** מנהל משרד
**I want to** לראות תמונת מצב כוללת
**So that** אני יודע כמה תיקים בכל שלב ומי עמוס

**Acceptance Criteria:**
- [ ] KPI Cards: מספר תיקים בכל סטטוס (8 כרטיסיות)
- [ ] טבלה: כל התיקים עם פילטרים (לפי סטטוס, מבקר, שנה)
- [ ] תצוגה לפי מבקר: כמה תיקים לכל מבקר ובאיזה שלב
- [ ] ברירת מחדל: שנה נוכחית
- [ ] חיפוש לפי שם לקוח

---

## Functional Requirements

### Core Features

**Feature 1: ניהול שנות מאזנים**
- פתיחת שנה חדשה (כפתור admin בלבד)
- טעינה אוטומטית של כל חברות + שותפויות פעילות
- בחירת שנה פעילה לצפייה
- אפשרות להוסיף לקוח בודד ידנית (אם נוסף אחרי פתיחת שנה)

**Feature 2: Pipeline עם 8 שלבים**
- סטטוסים קבועים בסדר:
  1. `waiting_for_materials` - ממתין לחומר
  2. `materials_received` - הגיע חומר (+ תאריך)
  3. `assigned_to_auditor` - שויך למבקר (+ מבקר + פגישה)
  4. `in_progress` - בעבודה
  5. `work_completed` - סיום עבודה, ממתין לאישור
  6. `office_approved` - משרד אישר
  7. `report_transmitted` - דוח שודר
  8. `advances_updated` - מקדמות עודכנו
- כל מעבר סטטוס שומר: מי, מתי, הערה אופציונלית
- ניתן לחזור אחורה (admin בלבד)

**Feature 3: שיוך מבקר**
- בחירה מרשימת משתמשים עם role=accountant
- מבקר אחד לתיק
- שינוי מבקר בכל שלב (admin)
- פילטר תיקים לפי מבקר

**Feature 4: תאריך פגישה**
- שדה תאריך + שעה
- נגיש מתוך פרטי התיק
- ללא מערכת לוחות שנה חיצונית

**Feature 5: אינטגרציה לכרטיס לקוח**
- באדג' צבעוני מציג סטטוס שנה נוכחית
- טאב "מאזנים" עם היסטוריה מלאה
- לחיצה מהירה "סמן הגיע חומר" מכרטיס הלקוח

**Feature 6: דשבורד**
- KPI cards (ספירה לפי סטטוס)
- טבלת תיקים עם פילטרים + חיפוש + מיון
- תצוגה מקובצת לפי מבקר
- פילטר שנה

**Feature 7: מקדמות ומכתב חוב**
- שדה סכום מקדמות חדש
- סימון "עודכנו"
- סימון "נשלח מכתב חוב" + קישור למכתב קיים

### Out of Scope (Phase 1)
- מערכת לוחות שנה / תזכורות אוטומטיות
- צ'קליסט מסמכים מפורט (לעומת סימון כללי)
- חישוב שעות עבודה / רווחיות תיק
- יצירת מכתב חוב מתוך המאזנים (רק קישור)
- שידור אוטומטי לרשות המסים
- מעקב דדליינים לפי סוג ישות

---

## Technical Constraints

### Performance
- טעינת דשבורד עם 700 תיקים (ובעתיד 10,000) < 2 שניות
- פתיחת שנה (יצירת 700 רשומות) < 5 שניות
- Pagination ברירת מחדל: 20 פריטים

### Security
- Multi-tenant: RLS policies חובה, כל שאילתה עם `tenant_id`
- הרשאות: כל משתמש יכול לקרוא, admin+accountant יכולים לכתוב
- Audit trail: כל שינוי סטטוס נרשם (מי, מתי)

### Integration
- **Client Card**: באדג' סטטוס + טאב היסטוריה
- **Letter System**: קישור למכתב חוב/מקדמות ב-`generated_letters`
- **User System**: שיוך מבקר מ-`user_tenant_access` (role=accountant)

### Technology Stack
- Frontend: React 19 + shadcn/ui + Tailwind + Zustand (כמו שאר המערכת)
- Backend: Supabase (PostgreSQL + RLS)
- Service: extends `BaseService`
- Module structure: כמו `collections` module

---

## MVP Scope & Phasing

### Phase 1: MVP - Core Workflow
- פתיחת שנה אוטומטית
- 8 שלבי סטטוס עם מעבר ידני
- שיוך מבקר + פגישה
- דשבורד עם KPIs + טבלה
- באדג' בכרטיס לקוח
- טאב מאזנים בכרטיס לקוח
- סימון מקדמות + מכתב חוב (boolean + קישור)

**MVP Definition**: משרד יכול לפתוח שנה, לעקוב אחר כל תיק משלב "הגיע חומר" עד "מקדמות עודכנו", ולראות תמונת מצב כוללת בדשבורד.

### Phase 2: Enhancements
- דדליינים לפי סוג ישות (חברה: 30/6, שותפות: 30/6, עצמאי: 30/4)
- התראות על תיקים שלא זזו (stuck alerts)
- יצירת מכתב חוב ישירות ממערכת המאזנים
- דוחות השוואה שנה מול שנה
- ייצוא לאקסל

### Future Considerations
- צ'קליסט מסמכים מפורט (בנקים, כרטיסי חשבון וכו')
- מעקב שעות ורווחיות
- אינטגרציה עם Google Calendar לפגישות
- שידור אוטומטי לרשות המסים (API)
- Kanban board view

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| פתיחת שנה עם 10K לקוחות איטית | Low | Medium | Batch insert + progress bar |
| משתמשים לא מעדכנים סטטוסים | Medium | High | UX פשוט, נגיש מכל מקום, ללא חיכוכים |
| בלבול בין שנים | Low | Medium | ברירת מחדל לשנה נוכחית, UI ברור |
| קונפליקט בעדכון סטטוס | Low | Low | Optimistic locking, audit trail |

---

## Dependencies & Blockers

**Dependencies:**
- Client system: סוגי לקוחות (`company`, `partnership`) קיימים ✅
- User system: roles (`accountant`) קיימים ✅
- Letter system: `generated_letters` table קיימת ✅
- Client card: צריך להוסיף באדג' וטאב

**Known Blockers:**
- אין - המערכת הקיימת מכילה את כל התשתיות הנדרשות

---

## Database Schema (Proposed)

### Main Table: `annual_balance_sheets`

```sql
CREATE TABLE annual_balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  -- Status workflow
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

  -- Step 2: Materials
  materials_received_at TIMESTAMPTZ,
  materials_received_by UUID REFERENCES auth.users(id),

  -- Step 3: Auditor assignment
  auditor_id UUID REFERENCES auth.users(id),
  meeting_date TIMESTAMPTZ,

  -- Step 4-5: Work
  work_started_at TIMESTAMPTZ,
  work_completed_at TIMESTAMPTZ,

  -- Step 6: Office approval
  office_approved_at TIMESTAMPTZ,
  office_approved_by UUID REFERENCES auth.users(id),

  -- Step 7: Transmission
  report_transmitted_at TIMESTAMPTZ,

  -- Step 8: Advances
  new_advances_amount DECIMAL(15,2),
  advances_updated_at TIMESTAMPTZ,
  advances_letter_id UUID REFERENCES generated_letters(id),

  -- Debt letter (optional)
  debt_letter_sent BOOLEAN DEFAULT false,
  debt_letter_id UUID REFERENCES generated_letters(id),

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, client_id, year)
);
```

### Status History Table: `balance_sheet_status_history`

```sql
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
```

---

## Status Definitions & Colors

| Status | Hebrew | Color | Badge |
|--------|--------|-------|-------|
| `waiting_for_materials` | ממתין לחומר | Gray | ⬜ |
| `materials_received` | הגיע חומר | Blue | 🟦 |
| `assigned_to_auditor` | שויך למבקר | Purple | 🟪 |
| `in_progress` | בעבודה | Orange | 🟧 |
| `work_completed` | ממתין לאישור | Yellow | 🟨 |
| `office_approved` | משרד אישר | Cyan | 🔵 |
| `report_transmitted` | דוח שודר | Green | 🟩 |
| `advances_updated` | מקדמות עודכנו | Emerald | ✅ |

---

## Module Structure (Proposed)

```
src/modules/annual-balance/
├── components/
│   ├── BalanceDashboard.tsx          # KPI cards + summary
│   ├── BalanceTable.tsx              # Main data table
│   ├── BalanceFilters.tsx            # Status, auditor, year filters
│   ├── BalanceStatusBadge.tsx        # Color-coded status badge
│   ├── BalanceDialog.tsx             # Edit/view single record
│   ├── MarkMaterialsDialog.tsx       # Quick "mark materials received"
│   ├── AssignAuditorDialog.tsx       # Assign auditor + meeting
│   ├── OpenYearDialog.tsx            # Open new year confirmation
│   ├── AuditorSummaryTable.tsx       # Grouped by auditor view
│   └── ClientBalanceTab.tsx          # Tab for client card
├── pages/
│   └── AnnualBalancePage.tsx         # Main page
├── services/
│   └── annual-balance.service.ts     # Extends BaseService
├── store/
│   └── annualBalanceStore.ts         # Zustand store
├── types/
│   └── annual-balance.types.ts       # TypeScript definitions
├── index.ts
└── routes.tsx
```

---

## Appendix

### Glossary
- **מאזן**: דוח כספי שנתי (Annual Financial Statement / Balance Sheet)
- **מבקר**: רואה חשבון מבקר פנימי (Internal Auditor - system user with accountant role)
- **שידור**: שליחה דיגיטלית לרשות המסים (Digital transmission to Tax Authority)
- **מקדמות**: תשלומי מס מקדימים על חשבון שנת המס הבאה (Tax advance payments)
- **תיק**: רשומה של לקוח-שנה בתהליך המאזנים (A client-year record in the balance process)

### Relevant Deadlines (Reference)
| Entity Type | Tax Return Deadline | Notes |
|-------------|-------------------|-------|
| חברה פרטית | 31 במאי (5 חודשים מסוף שנה) | + אישור רשם חברות |
| שותפות | 31 במאי | |
| עצמאי | 30 באפריל (30 במאי עם ייצוג) | לא בסקופ Phase 1 |

---

*This PRD was created through interactive requirements gathering with quality scoring to ensure comprehensive coverage of business, functional, UX, and technical dimensions.*
