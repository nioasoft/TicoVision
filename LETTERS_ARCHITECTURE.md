# 📧 ארכיטקטורת מערכת המכתבים - TicoVision

**תאריך עדכון אחרון:** 19 נובמבר 2025
**גרסה:** 1.0 (לאחר ניקוי deprecated code)

---

## 📋 תוכן עניינים

1. [סקירה כללית](#סקירה-כללית)
2. [ארכיטקטורת השכבות](#ארכיטקטורת-השכבות)
3. [מבנה התבניות (4 חלקים)](#מבנה-התבניות-4-חלקים)
4. [שירותים ופונקציונליות](#שירותים-ופונקציונליות)
5. [מסד נתונים](#מסד-נתונים)
6. [Edge Functions](#edge-functions)
7. [זרימות עבודה](#זרימות-עבודה)
8. [החלטות ארכיטקטוניות](#החלטות-ארכיטקטוניות)

---

## 🎯 סקירה כללית

מערכת המכתבים של TicoVision מנהלת שני סוגי מכתבים:

1. **מכתבי שכר טרחה** (11 תבניות קבועות) - לחשבונאות
2. **מכתבים כלליים** (Universal Builder) - טקסט חופשי עם Tiptap

### תכונות עיקריות:
- ✅ 11 תבניות שכר טרחה מוכנות מראש
- ✅ מכתבים מותאמים אישית (Universal Builder)
- ✅ שליחת מיילים דרך SendGrid
- ✅ יצירת PDF
- ✅ מעקב אחר פתיחות וקליקים
- ✅ ניהול גרסאות (versioning)
- ✅ תמיכה בקישורי תשלום (Cardcom)

---

## 🏗️ ארכיטקטורת השכבות

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                    │
│                     (Frontend - React)                  │
├─────────────────────────────────────────────────────────┤
│  Pages:                                                 │
│  • LetterTemplatesPage.tsx    ← יצירת מכתב חדש         │
│  • LetterHistoryPage.tsx      ← היסטוריית מכתבים      │
│  • LetterViewer.tsx            ← צפייה ציבורית         │
│                                                          │
│  Components:                                             │
│  • UniversalLetterBuilder.tsx  ← Builder עם Tiptap     │
│  • LetterHistoryTable.tsx      ← טבלת היסטוריה        │
│  • LetterViewDialog.tsx        ← תצוגה מקדימה          │
│  • ResendLetterDialog.tsx      ← שליחה מחדש            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                        │
│                  (Business Logic)                       │
├─────────────────────────────────────────────────────────┤
│  template.service.ts (1,587 lines) - השירות הראשי     │
│  ├─ generateLetterFromComponents()                      │
│  │  └─ טוען 4 חלקים: Header + Body + Payment + Footer│
│  ├─ generateFromCustomText()                            │
│  │  └─ Universal Builder עם Tiptap                     │
│  ├─ previewLetterFromFiles()                            │
│  ├─ updateLetterContent()                               │
│  └─ createLetterVersion()                               │
│                                                          │
│  letter-history.service.ts (341 lines)                  │
│  └─ שאילתות והיסטוריה (קורא מ-generated_letters)      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                  EDGE FUNCTION LAYER                    │
│                    (Supabase)                           │
├─────────────────────────────────────────────────────────┤
│  send-letter/                                            │
│  ├─ Template mode (11 fee letters)                      │
│  ├─ Custom mode (Universal Builder)                     │
│  ├─ SendGrid integration                                │
│  └─ Updates generated_letters status                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                       │
│                   (PostgreSQL)                          │
├─────────────────────────────────────────────────────────┤
│  generated_letters (83 rows) - כל המכתבים              │
│  ├─ Fee letters (template_type: 'external_index_only')  │
│  ├─ Custom letters (template_type: 'custom_text')       │
│  └─ Versioning support (parent_letter_id, version_number)│
│                                                          │
│  letter_templates (11 rows) - תבניות קבועות            │
│  └─ 11 Body templates (A, B, C, D1-3, F1-3, E1-2)      │
│                                                          │
│  custom_letter_bodies (2 rows) - תבניות שמורות         │
│  └─ Universal Builder saved templates                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📄 מבנה התבניות (4 חלקים)

### מושג יסוד: **מכתב = Header + Body + Payment + Footer**

כל מכתב שכר טרחה מורכב מ-4 חלקים קבועים:

```
┌────────────────────────────────────────────────────┐
│  1. HEADER (קבוע - templates/components/header.html) │
│     • Logo TICO (180×80px)                          │
│     • קו עבה (21.6px)                               │
│     • "לכבוד:" + שם חברה + תאריך                   │
├────────────────────────────────────────────────────┤
│  2. BODY (משתנה - 11 אופציות)                      │
│     templates/bodies/annual-fee.html               │
│     templates/bodies/internal-audit-index.html     │
│     templates/bodies/bookkeeping-index.html        │
│     ... (11 קבצים שונים)                           │
├────────────────────────────────────────────────────┤
│  3. PAYMENT SECTION (קבוע)                         │
│     templates/components/payment-section.html      │
│     • 4 כפתורי תשלום (בנק, כ"א, תשלומים, המחאות) │
│     • הנחות: 9%, 8%, 4%, 0%                        │
│     • פרטי איש קשר: Sigal Nagar                    │
├────────────────────────────────────────────────────┤
│  4. FOOTER (קבוע - templates/components/footer.html)│
│     • קו עבה (21.6px)                               │
│     • לוגו Franco + פרטי התקשרות                   │
│     • Tagline: "DARE TO THINK · COMMIT TO DELIVER" │
└────────────────────────────────────────────────────┘
```

### 11 תבניות Body:

| # | קובץ | סוג מכתב | קוד |
|---|------|----------|-----|
| 1 | `annual-fee.html` | חיצוניים - מדד בלבד | A |
| 2 | `annual-fee-as-agreed.html` | חיצוניים - כפי שסוכם | B |
| 3 | `annual-fee-real-change.html` | חיצוניים - ריאלי | C |
| 4 | `internal-audit-index.html` | ביקורת פנימית - מדד | D1 |
| 5 | `internal-audit-real-change.html` | ביקורת פנימית - ריאלי | D2 |
| 6 | `internal-audit-as-agreed.html` | ביקורת פנימית - כפי שסוכם | D3 |
| 7 | `bookkeeping-index.html` | הנהלת חשבונות - מדד | F1 |
| 8 | `bookkeeping-real-change.html` | הנהלת חשבונות - ריאלי | F2 |
| 9 | `bookkeeping-as-agreed.html` | הנהלת חשבונות - כפי שסוכם | F3 |
| 10 | `retainer-index.html` | רטיינר - מדד | E1 |
| 11 | `retainer-real-change.html` | רטיינר - ריאלי | E2 |

---

## ⚙️ שירותים ופונקציונליות

### 1. **TemplateService** - השירות הראשי

**מיקום:** `src/modules/letters/services/template.service.ts`

#### מתודות עיקריות:

##### א. `generateLetterFromComponents(templateType, clientId, variables)`
**תכלית:** יצירת מכתב שכר טרחה מ-4 חלקים

**זרימה:**
```typescript
1. טעינת קבצים:
   - fetch('/templates/components/header.html')
   - fetch('/templates/bodies/{templateType}.html')
   - fetch('/templates/components/payment-section.html')
   - fetch('/templates/components/footer.html')

2. מיזוג:
   finalHTML = header + body + payment + footer

3. החלפת משתנים:
   {{letter_date}} → '4.10.2025'
   {{company_name}} → 'מסעדת האחים'
   {{amount_original}} → 50000
   ... (כל המשתנים)

4. שמירה:
   INSERT INTO generated_letters (
     generated_content_html,
     body_content_html,
     template_type,
     variables_used,
     ...
   )
```

**משתנים נדרשים:**
- `company_name` - שם החברה
- `amount_original` - סכום מקורי
- `amount_after_bank` - סכום אחרי 9% הנחה
- `amount_after_single` - סכום אחרי 8% הנחה
- `amount_after_payments` - סכום אחרי 4% הנחה

**משתנים שנוצרים אוטומטית:**
- `letter_date` - תאריך היום
- `year` - שנה נוכחית/הבאה
- `tax_year` - שנת המס
- `num_checks` - מספר המחאות (ברירת מחדל: 8)
- `check_dates_description` - תיאור תאריכי המחאות

---

##### ב. `generateFromCustomText(plainText, clientId, options)`
**תכלית:** יצירת מכתב כללי עם Universal Builder

**זרימה:**
```typescript
1. פרסור Tiptap HTML:
   - Plain text → Tiptap JSON
   - Tiptap JSON → HTML

2. עטיפה בHeader/Footer:
   finalHTML = header + parsedHTML + footer

3. אופציות:
   - includePayment: true/false
   - customHeaderLines: שורות נוספות מתחת לנמען
   - subjectLines: שורות הנדון

4. שמירה:
   - generated_letters (template_type: 'custom_text')
   - custom_letter_bodies (אם שמור כתבנית)
```

---

##### ג. `previewLetterFromFiles(templateType, variables)`
**תכלית:** תצוגה מקדימה ללא שמירה ב-DB

**שימוש:** Live preview במסך יצירת מכתב חדש

---

##### ד. `updateLetterContent(letterId, newContent)`
**תכלית:** עריכת מכתב קיים

**הגבלה:** רק למכתבים מסוג `custom_text` (Universal Builder)

---

##### ה. `createLetterVersion(parentLetterId, changes)`
**תכלית:** יצירת גרסה חדשה למכתב קיים

**מבנה Versioning:**
```typescript
parent_letter_id → מצביע למכתב המקורי
version_number   → מספר רץ (1, 2, 3...)
is_latest        → האם זו הגרסה העדכנית ביותר
```

---

### 2. **LetterHistoryService** - ניהול היסטוריה

**מיקום:** `src/services/letter-history.service.ts`

**מתודות:**
- `getAllLetters(filters, sort, pagination)` - שאילתות עם פילטרים
- `getLetterById(id)` - קבלת מכתב בודד
- `resendLetter(id, recipients)` - שליחה מחדש דרך Edge Function
- `deleteDraft(id)` - מחיקת טיוטה

---

## 🗄️ מסד נתונים

### 1. **generated_letters** - הטבלה המרכזית

**שורות:** 83 (נכון ל-19/11/2025)

**עמודות עיקריות:**

#### זיהוי ומטא-דאטה:
```sql
id                    UUID PRIMARY KEY
tenant_id             UUID NOT NULL
client_id             UUID (nullable - מאפשר מכתבים כלליים)
created_at            TIMESTAMP
created_by            UUID
```

#### סוג ותוכן:
```sql
template_id           UUID (nullable - מאז migration 096)
template_type         VARCHAR(50) (e.g., 'custom_text', 'external_index_only')
generated_content_html TEXT NOT NULL (HTML מלא מוכן לשליחה)
body_content_html     TEXT (רק Body - לעריכה, מאז migration 101)
variables_used        JSONB NOT NULL (משתנים ששימשו)
subject               TEXT (נושא המייל)
```

#### מעקב שליחה:
```sql
status                VARCHAR(20) ('draft', 'saved', 'sent_email', 'sent_whatsapp', 'sent_print')
sent_at               TIMESTAMP
sent_via              VARCHAR(20) ('email', 'whatsapp', 'print')
recipient_emails      JSONB ARRAY
```

#### מעקב אחר פתיחות:
```sql
opened_at             TIMESTAMP (פתיחה ראשונה)
last_opened_at        TIMESTAMP (פתיחה אחרונה)
open_count            INTEGER (מספר פתיחות)
clicked_at            TIMESTAMP (קליק על קישור)
```

#### Versioning:
```sql
parent_letter_id      UUID (self-reference)
version_number        INTEGER (default 1)
is_latest             BOOLEAN (default true)
```

#### PDF:
```sql
pdf_url               TEXT (קישור ל-PDF ב-Storage)
```

#### מערכת V2:
```sql
system_version        VARCHAR(10) ('v1', 'v2')
rendering_engine      VARCHAR(20) ('legacy', 'unified')
```

**Indexes:** 24 אינדקסים (כולל tenant_id, client_id, status, sent_at, versioning)

**RLS Policies:** 6 מדיניות (tenant isolation, role-based access)

---

### 2. **letter_templates** - 11 תבניות

**שורות:** 11

**עמודות:**
```sql
id                    UUID PRIMARY KEY
tenant_id             UUID NOT NULL
template_type         VARCHAR(100) NOT NULL (enum)
name                  VARCHAR(255)
content_html          TEXT NOT NULL (תבנית ה-Body)
variables_schema      JSONB NOT NULL (סכמת משתנים)
is_active             BOOLEAN (default true)
language              VARCHAR(2) ('he', 'en')
```

**הערה חשובה:**
- `header_template_id` ו-`footer_template_id` **הוסרו** ב-migration 112
- Header/Footer נטענים מקבצים (`templates/components/`) ולא מ-DB

---

### 3. **custom_letter_bodies** - תבניות שמורות

**שורות:** 2

**עמודות:**
```sql
id                    UUID PRIMARY KEY
tenant_id             UUID NOT NULL
name                  VARCHAR(255) UNIQUE
plain_text            TEXT NOT NULL (טקסט מקורי)
parsed_html           TEXT NOT NULL (HTML מפורסר)
includes_payment      BOOLEAN (האם כולל תשלום)
```

**שימוש:** שמירת מכתבים מותאמים מ-Universal Builder כתבניות לשימוש חוזר

---

### 4. **טבלאות שנמחקו** (Migration 112 - 19/11/2025)

❌ **`letter_components`** - תוכננה לאחסון Header/Footer ב-DB (מעולם לא שימשה)
❌ **`letter_component_combinations`** - תוכננה לקומבינציות Body+Payment (מעולם לא שימשה)

**סיבה למחיקה:** שתי הטבלאות היו ריקות (0 rows), Header/Footer תמיד נטענו מקבצים.

---

## 🚀 Edge Functions

### **send-letter** - השירות היחיד (פעיל)

**מיקום:** `supabase/functions/send-letter/index.ts`

**תכלית:** שליחת מיילים דרך SendGrid

#### שני מצבים:

##### 1. Template Mode (מכתבי שכר טרחה)
```typescript
POST /send-letter
{
  "mode": "template",
  "templateType": "external_index_only",
  "clientId": "uuid",
  "variables": {
    "amount_original": 50000,
    ...
  },
  "recipientEmails": ["client@example.com"]
}
```

**זרימה:**
1. טוען 4 קבצים מ-`templates/`
2. ממזג ומחליף משתנים
3. שולח דרך SendGrid
4. שומר/מעדכן ב-`generated_letters`

---

##### 2. Custom Mode (Universal Builder)
```typescript
POST /send-letter
{
  "mode": "custom",
  "plainText": "תוכן המכתב...",
  "clientId": "uuid",
  "recipientEmails": ["client@example.com"],
  "includePayment": false
}
```

**זרימה:**
1. פורס Tiptap HTML
2. עוטף בHeader/Footer
3. שולח דרך SendGrid
4. שומר ב-`generated_letters`

---

### **Edge Functions שנמחקו:**

❌ **send-letter-v2** - נמחק (היה קורא לטבלה לא קיימת `generated_letters_v2`)

---

## 🔄 זרימות עבודה

### זרימה 1: יצירת מכתב שכר טרחה חדש

```
1. משתמש → /letter-templates
2. בוחר תבנית (1-11)
3. בוחר לקוח
4. ממלא משתנים (סכומים, פרטים)
5. Preview → previewLetterFromFiles()
6. לחץ "שמור" → generateLetterFromComponents()
   ├─ שומר ב-generated_letters (status: 'saved')
   └─ מחזיר letter_id
7. לחץ "שלח" → Edge Function: send-letter
   ├─ שולח SendGrid
   ├─ מעדכן status → 'sent_email'
   ├─ מעדכן sent_at
   └─ שומר recipient_emails
```

---

### זרימה 2: יצירת מכתב כללי (Universal Builder)

```
1. משתמש → /letter-templates
2. בוחר "מכתב כללי"
3. בוחר:
   ├─ Client mode → בוחר לקוח מהרשימה
   └─ Manual mode → מזין נמען ידנית
4. כותב תוכן במכתב (Tiptap editor)
5. אופציונלי: מוסיף payment section
6. Preview → previewFromCustomText()
7. "שמור כתבנית" → custom_letter_bodies
8. "שמור מכתב" → generateFromCustomText()
   └─ שומר ב-generated_letters (template_type: 'custom_text')
9. "שלח" → Edge Function: send-letter (mode: 'custom')
```

---

### זרימה 3: צפייה ציבורית במכתב (Tracking)

```
1. נמען מקבל מייל עם קישור:
   https://ticovision.com/letters/view/{letter_id}

2. פתיחת הקישור → LetterViewer.tsx
   ├─ טוען את המכתב מ-generated_letters
   ├─ מעדכן open_count++
   ├─ מעדכן last_opened_at
   └─ מציג את ה-HTML המלא

3. קליק על קישור תשלום:
   ├─ מעדכן clicked_at
   └─ מפנה ל-Cardcom
```

---

### זרימה 4: עריכת מכתב קיים

```
1. משתמש → /letter-history
2. בוחר מכתב (רק custom_text!)
3. לחץ "ערוך" → UniversalLetterBuilder
   ├─ טוען body_content_html
   └─ מציג ב-Tiptap editor
4. עורך תוכן
5. "שמור" → updateLetterContent()
   ├─ יוצר גרסה חדשה (version_number++)
   ├─ parent_letter_id → מכתב מקורי
   └─ is_latest: true (גרסה קודמת → false)
```

---

## 🎯 החלטות ארכיטקטוניות

### 1. **למה 4 חלקים נפרדים?**

**החלטה:** Header + Body + Payment + Footer כקבצים נפרדים

**סיבות:**
- ✅ **גמישות:** קל לשנות Header/Footer גלובלית
- ✅ **תחזוקה:** שינוי בHeader משפיע על כל המכתבים
- ✅ **בדיקות:** קל לבדוק כל חלק בנפרד

**אלטרנטיבה שנדחתה:** מכתב שלם כקובץ אחד (קשה לתחזוקה)

---

### 2. **למה Templates בקבצים ולא ב-DB?**

**החלטה:** `templates/` directory במקום `letter_components` table

**סיבות:**
- ✅ **Git versioning:** שינויים בקוד מתועדים ב-git
- ✅ **Deploy פשוט:** קבצים נטענים עם האפליקציה
- ✅ **Performance:** לא צריך query ל-DB בכל פעם
- ✅ **Backup:** חלק מהקוד (לא צריך backup נפרד)

**תוצאה:** מחיקת `letter_components` table (Migration 112)

---

### 3. **למה שני מצבים: Template vs Custom?**

**החלטה:** `generateLetterFromComponents()` + `generateFromCustomText()`

**סיבות:**
- ✅ **Use case שונה:** שכר טרחה vs מכתב כללי
- ✅ **Validation:** Templates מאומתים, Custom חופשי
- ✅ **UX:** Templates = טופס, Custom = עורך

**אלטרנטיבה שנדחתה:** Builder אחד לכל הסוגים (מסובך מדי)

---

### 4. **למה Versioning?**

**החלטה:** `parent_letter_id` + `version_number` + `is_latest`

**סיבות:**
- ✅ **Audit trail:** מי שינה מה ומתי
- ✅ **Rollback:** אפשר לחזור לגרסה קודמת
- ✅ **Compare:** השוואה בין גרסאות

**מימוש:**
```sql
parent_letter_id → מכתב מקורי
version_number   → 1, 2, 3...
is_latest        → רק אחד true בכל קבוצה
```

---

### 5. **למה Edge Function במקום Backend?**

**החלטה:** Supabase Edge Functions לשליחת מיילים

**סיבות:**
- ✅ **Serverless:** לא צריך לנהל שרת
- ✅ **Scalability:** אוטומטי
- ✅ **Security:** SendGrid API key מוסתר
- ✅ **Supabase native:** גישה ישירה ל-DB

---

### 6. **למה PDF generation נפרד?**

**החלטה:** `letters-v2/services/pdf-generation.service.ts`

**סיבות:**
- ✅ **Browser-based:** jsPDF + html2canvas
- ✅ **Async:** לא חוסם UI
- ✅ **Caching:** PDF URL נשמר ב-DB

**שימוש:**
- `UniversalLetterBuilder` → יצירת PDF
- `LetterHistoryPage` → הורדת PDF

---

## 📚 קבצים חשובים

### Frontend:
```
src/modules/letters/
├── pages/
│   ├── LetterTemplatesPage.tsx    (33 lines - wrapper)
│   └── LetterHistoryPage.tsx      (637 lines)
├── components/
│   ├── UniversalLetterBuilder.tsx (2,340 lines - ⚠️ גדול!)
│   ├── LetterHistoryTable.tsx     (353 lines)
│   ├── LetterViewDialog.tsx       (310 lines)
│   └── ResendLetterDialog.tsx     (224 lines)
└── services/
    └── template.service.ts        (1,587 lines)

src/pages/
└── LetterViewer.tsx               (250 lines - public view)

src/services/
└── letter-history.service.ts      (341 lines)
```

### Backend:
```
supabase/functions/
└── send-letter/
    └── index.ts                   (שליחת מיילים)

supabase/migrations/
├── 001_initial_setup.sql          (letter_templates)
├── 020_letter_versioning.sql      (versioning)
├── 028_generated_letters.sql      (הטבלה המרכזית)
└── 112_cleanup_empty_tables.sql   (ניקוי)
```

### Templates:
```
templates/
├── components/
│   ├── header.html                (Header משותף)
│   ├── payment-section.html       (Payment משותף)
│   └── footer.html                (Footer משותף)
└── bodies/
    ├── annual-fee.html            (חיצוניים - מדד)
    ├── internal-audit-index.html  (ביקורת - מדד)
    ├── bookkeeping-index.html     (הנהח"ש - מדד)
    └── ... (8 קבצים נוספים)
```

---

## 🔧 תחזוקה ופיתוח

### הוספת תבנית חדשה (Body):

1. צור קובץ חדש: `templates/bodies/new-template.html`
2. הוסף enum: `src/types/letter.types.ts`
3. הוסף row ל-`letter_templates` table
4. עדכן UI: `LetterBuilder` dropdown

---

### שינוי Header/Footer גלובלי:

1. ערוך: `templates/components/header.html`
2. Deploy → כל המכתבים החדשים ישתמשו בגרסה החדשה
3. ⚠️ מכתבים ישנים לא ישתנו (HTML שמור ב-DB)

---

### הוספת משתנה חדש:

1. הוסף `{{new_variable}}` בקובץ Template
2. עדכן `variables_schema` ב-`letter_templates`
3. עדכן UI: form field ב-`UniversalLetterBuilder`
4. עדכן `generateLetterFromComponents()` logic

---

## 🐛 בעיות ידועות

### 1. **UniversalLetterBuilder גדול מדי**
- **בעיה:** 2,340 שורות בקומפוננטה אחת
- **השפעה:** קשה לתחזוקה
- **פתרון מוצע:** פיצול ל-sub-components

### 2. **Chunk size warning**
- **בעיה:** `LetterTemplatesPage.js` (469KB)
- **פתרון מוצע:** Code splitting + dynamic imports

### 3. **Draft vs Saved לא ברור**
- **בעיה:** משתמשים לא מבינים ההבדל
- **פתרון מוצע:** שינוי שמות ל-`unsaved_draft` / `saved_draft`

---

## 📊 סטטיסטיקות

**נכון ל-19 נובמבר 2025:**

- **מכתבים במערכת:** 83
- **תבניות קבועות:** 11
- **תבניות מותאמות:** 2
- **טבלאות DB:** 3 (אחרי ניקוי)
- **Edge Functions:** 1
- **Services:** 2 (template, letter-history)
- **שורות קוד (frontend):** ~5,000
- **שורות קוד (backend):** ~1,500

---

## 📖 מסמכים קשורים

- `BACKUP_RECOVERY_PLAN.md` - תוכנית שחזור
- `DATABASE_REFERENCE.md` - תיעוד מסד נתונים
- `CLAUDE.md` - הנחיות למפתחים
- `memory-bank/letter-system-structure.md` - מבנה מפורט

---

**עודכן לאחרונה:** 19/11/2025
**גרסה:** 1.0 (post-cleanup)
**מתחזק:** TicoVision Development Team
