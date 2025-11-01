# Letter System Structure - מערכת המכתבים

## סקירה כללית
מערכת מכתבי שכר טרחה מורכבת מ-**4 חלקים עיקריים** שמתחברים יחד ליצירת מכתב מלא.

## ארכיטקטורה - 4 חלקים

### 1. Header (הדר)
**מיקום:** `templates/components/header.html`
**תיאור:** חלק קבוע משותף לכל 11 התבניות

**תוכן:**
- לוגו TICO ממורכז (180×80px) - `cid:tico_logo_new`
- קו שחור עבה (13px)
- שורת נמענים: "לכבוד:" + שם החברה (ימין) ותאריך (שמאל)

**משתנים:**
- `{{letter_date}}` - תאריך המכתב (אוטומטי - פורמט ישראלי DD/MM/YYYY)
- `{{company_name}}` - שם החברה
- `{{group_name}}` - שם הקבוצה (אופציונלי)

---

### 2. Body (גוף המכתב)
**מיקום:** `templates/bodies/` - 11 קבצי HTML שונים
**תיאור:** תוכן ייחודי לכל סוג מכתב

#### רשימת 11 ה-Bodies:

| # | שם הקובץ | סוג המכתב | קוד |
|---|----------|-----------|-----|
| 1 | `annual-fee.html` | חיצוניים - שינוי מדד בלבד | A |
| 2 | `annual-fee-as-agreed.html` | חיצוניים - כפי שסוכם | B |
| 3 | `annual-fee-real-change.html` | חיצוניים - שינוי ריאלי | C |
| 4 | `internal-audit-index.html` | ביקורת פנימית - מדד | D1 |
| 5 | `internal-audit-real-change.html` | ביקורת פנימית - ריאלי | D2 |
| 6 | `internal-audit-as-agreed.html` | ביקורת פנימית - כפי שסוכם | D3 |
| 7 | `bookkeeping-index.html` | הנהלת חשבונות - מדד | F1 |
| 8 | `bookkeeping-real-change.html` | הנהלת חשבונות - ריאלי | F2 |
| 9 | `bookkeeping-as-agreed.html` | הנהלת חשבונות - כפי שסוכם | F3 |
| 10 | `retainer-index.html` | רטיינר - מדד | E1 |
| 11 | `retainer-real-change.html` | רטיינר - ריאלי | E2 |

**מבנה משותף לכל body:**
- קו הפרדה עליון (1px)
- כותרת "הנדון:" בכחול (#395BF7, 26px, bold)
- קו הפרדה מתחת לכותרת
- סעיף "בפתח הדברים, ברצוננו:"
- bullets כחולים (`cid:bullet_star_blue`, 11×11px)
- סעיף "ולגופו של עניין:"
- תוכן ייחודי לכל סוג

**משתנים נפוצים:**
- `{{company_name}}` - שם החברה
- `{{year}}` - שנה נוכחית/עתידית
- `{{previous_year}}` - שנה קודמת
- `{{tax_year}}` - שנת המס
- `{{inflation_rate}}` - אחוז אינפלציה (למשל: "4%")
- `{{real_adjustment_reason}}` - סיבת שינוי ריאלי (רק במכתבי real_change)

---

### 3. Payment Section (סעיף תשלומים)
**מיקום:** `templates/components/payment-section.html`
**תיאור:** חלק קבוע עם 4 אפשרויות תשלום

**תוכן:**
- קו הפרדה (1px)
- כותרת "אופן התשלום:" (28px, bold)

**4 כפתורי תשלום (בסדר כך):**

#### כפתור 1: העברה בנקאית (המומלץ ביותר)
- **רקע:** #EEEDD8 (בז')
- **הנחה:** 9%
- **כותרת:** "תשלום מומלץ - בהעברה בנקאית"
- **הנחה באדום:** "בתמורה משרדנו יעניק לכם הנחה של 9%."
- **טקסט כפתור:** "לחץ לאישור" (לא "לביצוע תשלום")
- **קישור:** `https://ticovision.vercel.app/bank-transfer-details.html?client_id={{client_id}}&amount={{amount_original}}`

#### כפתור 2: כרטיס אשראי תשלום אחד
- **רקע:** #EEEDD8 (בז')
- **הנחה:** 8%
- **כותרת:** "כרטיס אשראי בתשלום אחד"
- **הנחה באדום:** "בתמורה משרדנו יעניק לכם הנחה של 8%."
- **טקסט כפתור:** "לביצוע תשלום"
- **קישור:** `https://ticovision.vercel.app/payment-credit-single.html?client_id={{client_id}}&amount={{amount_original}}`

#### כפתור 3: כרטיס אשראי בתשלומים
- **רקע:** #EEEDD8 (בז')
- **הנחה:** 4%
- **כותרת:** "כרטיס אשראי בתשלומים - ככל שתחפצו"
- **הנחה באדום:** "בתמורה משרדנו יעניק לכם הנחה של 4%."
- **טקסט כפתור:** "לביצוע תשלום"
- **קישור:** `https://ticovision.vercel.app/payment-credit-installments.html?client_id={{client_id}}&amount={{amount_original}}`

#### כפתור 4: המחאות (8 או 12)
- **רקע:** #EEEDD8 (בז')
- **הנחה:** 0% (ללא הנחה)
- **כותרת:** "תשלום רגיל בהמחאות: כמדי שנה {{num_checks}} המחאות שוות"
- **טקסט נוסף:** "תאריכי ההמחאות הינם לחמישי לכל חודש, {{check_dates_description}}."
- **טקסט כפתור:** "לחץ לאישור" (לא "לביצוע תשלום")
- **קישור:** `https://ticovision.vercel.app/check-details.html?client_id={{client_id}}&amount={{amount_original}}&company_name={{company_name}}&group_name={{group_name}}&num_checks={{num_checks}}`

**פרטי קשר (סיגל נגר):**
- טקסט: "להסדרת התשלום יש לפנות לסמנכ"לית הכספים, סיגל נגר, בטלפון 050-8620993 או במייל sigal@franco.co.il."
- פונט: 19px, bold
- צבע: #09090b

**משתנים:**
- `{{amount_original}}` - סכום מקורי לפני הנחה
- `{{amount_after_bank}}` - סכום אחרי הנחה 9% (העברה בנקאית)
- `{{amount_after_single}}` - סכום אחרי הנחה 8% (אשראי תשלום אחד)
- `{{amount_after_payments}}` - סכום אחרי הנחה 4% (אשראי תשלומים)
- `{{client_id}}` - מזהה לקוח
- `{{company_name}}` - שם החברה
- `{{group_name}}` - שם הקבוצה
- `{{num_checks}}` - מספר המחאות (8 או 12)
- `{{check_dates_description}}` - תיאור טווח תאריכים (למשל: "החל מיום 5.1.2026 ועד ליום 5.8.2026")
- `{{tax_year}}` - שנת המס

**חישובי הנחות (BUSINESS RULES):**
```typescript
const PAYMENT_DISCOUNTS = {
  bank_transfer: 9,      // 9% הנחה
  cc_single: 8,          // 8% הנחה
  cc_installments: 4,    // 4% הנחה
  checks: 0              // 0% הנחה
} as const;
```

**עיצוב כפתורים:**
- רוחב: 30% מהרוחב הכולל
- רקע כפתור: #000000 (שחור)
- טקסט כפתור: #ffffff (לבן), 19px
- חץ: מורכב משני אלמנטים:
  1. קו לבן: 48px רוחב, 1px גובה
  2. משולש לבן: 10px רוחב, 14px גובה (7px למעלה + 7px למטה)

---

### 4. Footer (כותרת תחתונה)
**מיקום:** `templates/components/footer.html`
**תיאור:** חלק קבוע סטטי משותף לכל התבניות

**תוכן:**
- קו שחור עבה (13px)
- טבלה עם 2 עמודות:
  - **עמודה ימנית (30%):** לוגו Franco (`cid:franco_logo_new`, 135×95px)
  - **עמודה שמאלית (45.5%):** פרטי קשר עם אייקונים:
    - 📍 כתובת: שד"ל 3, מגדל אלרוב קומה ראשונה, תל אביב
    - 📞 טלפון: 03-5666170
    - 📧 מייל: tico@franco.co.il
- קו שחור עבה נוסף (13px)
- תמונת סלוגן: `cid:tagline` (800×113px)
  - טקסט: "DARE TO THINK · COMMIT TO DELIVER"

**משתנים:** אין - תוכן סטטי לחלוטין

---

## תהליך הרכבת מכתב

**Service:** `src/modules/letters/services/template.service.ts`
**Function:** `generateLetterFromComponents()`

### שלבי ההרכבה:

```typescript
async generateLetterFromComponents(
  templateType: LetterTemplateType,
  clientId: string,
  variables: Partial<LetterVariables>,
  feeCalculationId?: string
): Promise<ServiceResponse<GeneratedLetter>>
```

**תהליך:**
1. **טעינת קבצים:**
   - `loadTemplateFile('components/header.html')` → Header
   - `loadTemplateFile('components/footer.html')` → Footer
   - `loadTemplateFile('bodies/{body_file}')` → Body (לפי template_type)
   - `loadTemplateFile('components/payment-section.html')` → Payment (אם נדרש)

2. **הוספת משתנים אוטומטיים:**
   - `letter_date` - תאריך נוכחי בפורמט ישראלי (אם לא סופק)
   - `year` - שנה נוכחית (אם לא סופק)
   - `tax_year` - שנה הבאה (אם לא סופק)
   - `num_checks` - 8 (ברירת מחדל)
   - `check_dates_description` - טווח תאריכים (מחושב אוטומטית)

3. **בניית HTML מלא:**
   ```typescript
   buildFullHTML(header, body, paymentSection, footer)
   ```
   - מוסיף `<!DOCTYPE html>`, `<head>`, `<body>`
   - מחבר את 4 החלקים בתוך `<table>` מרכזית
   - רוחב: 800px, RTL, פונטים עבריים

4. **החלפת משתנים:**
   ```typescript
   TemplateParser.replaceVariables(fullHtml, fullVariables)
   ```
   - מחליף כל `{{variable}}` בערך אמיתי

5. **שמירה ב-DB:**
   - טבלה: `generated_letters`
   - שדות: `tenant_id`, `client_id`, `template_id` (null), `fee_calculation_id`, `variables_used`, `generated_content_html`, `payment_link`

---

## מיפוי Template Types ל-Body Files

```typescript
const bodyMap: Record<LetterTemplateType, string> = {
  'external_index_only': 'annual-fee.html',
  'external_real_change': 'annual-fee-real-change.html',
  'external_as_agreed': 'annual-fee-as-agreed.html',
  'internal_audit_index': 'internal-audit-index.html',
  'internal_audit_real': 'internal-audit-real-change.html',
  'internal_audit_agreed': 'internal-audit-as-agreed.html',
  'retainer_index': 'retainer-index.html',
  'retainer_real': 'retainer-real-change.html',
  'internal_bookkeeping_index': 'bookkeeping-index.html',
  'internal_bookkeeping_real': 'bookkeeping-real-change.html',
  'internal_bookkeeping_agreed': 'bookkeeping-as-agreed.html'
};
```

---

## תמונות CID (Content-ID) למיילים

כל התמונות נמצאות ב-`public/brand/` ומוטמעות כ-inline attachments במיילים:

```typescript
const cidMap = {
  'cid:tico_logo_new': 'Tico_logo_png_new.png',        // Header - לוגו TICO
  'cid:bullet_star_blue': 'Bullet_star_blue.png',      // Body - bullets כחולים
  'cid:franco_logo_new': 'Tico_franco_co.png',         // Footer - לוגו Franco
  'cid:tagline': 'tagline.png'                         // Footer - סלוגן
};
```

**לתצוגה בדפדפן:**
ב-`previewLetterFromFiles()` - CIDs מומרים לנתיבים רגילים (`/brand/...`)

---

## סיכום מהיר

**מכתב = Header (קבוע) + Body (1 מ-11) + Payment (קבוע) + Footer (קבוע)**

- **Header:** לוגו + תאריך + "לכבוד"
- **Body:** 11 גרסאות שונות (מדד/ריאלי/כפי שסוכם)
- **Payment:** 4 כפתורים (העברה/אשראי/אשראי תשלומים/המחאות)
- **Footer:** לוגו Franco + פרטי קשר + סלוגן

**קבצים עיקריים:**
- `templates/components/header.html`
- `templates/components/payment-section.html`
- `templates/components/footer.html`
- `templates/bodies/[11-files].html`
- `src/modules/letters/services/template.service.ts` (הרכבה)

**טבלה בDB:** `generated_letters` (לא `letter_history` - deprecated!)
