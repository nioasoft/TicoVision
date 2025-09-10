# 📚 TicoVision AI - Database Reference Guide
**תאריך עדכון אחרון**: דצמבר 2024  
**גרסת סכמה**: 3.1

---

## 📋 תוכן עניינים
- [טבלאות (Tables)](#טבלאות-tables)
- [פונקציות (Functions)](#פונקציות-functions)
- [Enums](#enums)
- [RLS Policies](#rls-policies)
- [אינדקסים](#אינדקסים)

---

## 🗂️ טבלאות (Tables)

### 1. **tenants** 
**תיאור**: טבלת חברות/משרדי רואי חשבון - Multi-tenant isolation  
**שימוש**: מאפשרת בידוד מלא בין משרדים שונים (white-label ready)

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| name | TEXT | שם המשרד |
| type | TEXT | סוג (internal/client/partner) |
| status | TEXT | סטטוס (active/inactive/suspended) |
| subscription_plan | TEXT | תוכנית מנוי (basic/professional/enterprise) |
| settings | JSONB | הגדרות כלליות |
| max_users | INTEGER | מקסימום משתמשים |
| max_clients | INTEGER | מקסימום לקוחות |
| features | JSONB | פיצ'רים מופעלים |
| billing_email | TEXT | מייל לחיוב |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| updated_at | TIMESTAMPTZ | תאריך עדכון |
| expires_at | TIMESTAMPTZ | תאריך תפוגה |

---

### 2. **tenant_users**
**תיאור**: קישור בין משתמשי Supabase Auth לטננטים  
**שימוש**: מנהל הרשאות ותפקידים של משתמשים בתוך כל משרד

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| user_id | UUID | מזהה משתמש מ-auth.users |
| role | user_role | תפקיד (admin/accountant/bookkeeper/client) |
| permissions | JSONB | הרשאות מותאמות |
| is_active | BOOLEAN | האם פעיל |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| updated_at | TIMESTAMPTZ | תאריך עדכון |

---

### 3. **clients**
**תיאור**: לקוחות של משרד רואי החשבון  
**שימוש**: ניהול כל הלקוחות עם ולידציית ת.ז ישראלית

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| tax_id | TEXT | מספר ת.ז/ח.פ (9 ספרות עם Luhn check) |
| company_name | TEXT | שם החברה |
| company_name_hebrew | TEXT | שם החברה בעברית |
| contact_name | TEXT | איש קשר |
| contact_email | TEXT | מייל איש קשר |
| contact_phone | TEXT | טלפון איש קשר |
| email | TEXT | מייל החברה |
| phone | TEXT | טלפון החברה |
| address | TEXT | כתובת |
| city | TEXT | עיר |
| postal_code | TEXT | מיקוד |
| business_type | TEXT | סוג עסק |
| incorporation_date | DATE | תאריך התאגדות |
| annual_revenue | NUMERIC | הכנסה שנתית |
| employee_count | INTEGER | מספר עובדים |
| payment_terms | INTEGER | תנאי תשלום (ימים, ברירת מחדל 30) |
| preferred_language | TEXT | שפה מועדפת (he/en, ברירת מחדל he) |
| status | TEXT | סטטוס (active/inactive/suspended) |
| notes | TEXT | הערות |
| tags | TEXT[] | תגיות |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| updated_at | TIMESTAMPTZ | תאריך עדכון |
| created_by | UUID | מי יצר |

---

### 4. **fee_calculations**
**תיאור**: חישובי שכר טרחה עם חוקי מס ישראליים  
**שימוש**: חישוב אוטומטי של שכ"ט עם מדד (3%), תוספות ומע"מ (18%)

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| client_id | UUID | מזהה לקוח |
| fee_type_id | UUID | סוג השכ"ט |
| year | INTEGER | שנה |
| month | INTEGER | חודש (1-12, אופציונלי) |
| period_start | DATE | תחילת תקופת החישוב |
| period_end | DATE | סוף תקופת החישוב |
| previous_year_data | JSONB | נתוני שנה קודמת |
| previous_year_amount | NUMERIC | סכום שנה קודמת |
| previous_year_discount | NUMERIC | הנחה שנה קודמת (%) |
| previous_year_base | NUMERIC | סכום בסיס שנה קודמת |
| current_year_data | JSONB | נתוני שנה נוכחית |
| base_amount | NUMERIC | סכום בסיס נוכחי |
| base_amount_calculated | NUMERIC | סכום בסיס מחושב |
| inflation_rate | NUMERIC | אחוז מדד (ברירת מחדל 3%) |
| inflation_adjustment | NUMERIC | התאמת מדד בש"ח |
| real_adjustments | JSONB | התאמות ריאליות |
| real_adjustment_reason | TEXT | סיבת התאמה ריאלית |
| discount_percentage | NUMERIC | אחוז הנחה |
| discount_amount | NUMERIC | סכום הנחה |
| final_amount | NUMERIC | סכום סופי לפני מע"מ |
| calculated_base_amount | NUMERIC | סכום בסיס מחושב |
| vat_amount | NUMERIC | סכום מע"מ (18%) |
| total_amount | NUMERIC | סה"כ לתשלום כולל מע"מ |
| status | TEXT | סטטוס (draft/pending_approval/approved/sent/paid) |
| approved_by | UUID | מי אישר |
| approved_at | TIMESTAMPTZ | מתי אושר |
| due_date | DATE | תאריך תשלום |
| payment_date | DATE | תאריך קבלת תשלום |
| payment_reference | TEXT | מספר אסמכתא תשלום |
| payment_terms | TEXT | תנאי תשלום |
| notes | TEXT | הערות |
| calculation_metadata | JSONB | מטא-דאטה |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| updated_at | TIMESTAMPTZ | תאריך עדכון |
| created_by | UUID | מי יצר |
| updated_by | UUID | מי עדכן לאחרונה |

---

### 5. **fee_types**
**תיאור**: סוגי שכר טרחה  
**שימוש**: הגדרת סוגי שכ"ט שונים (חודשי, רבעוני, שנתי, חד-פעמי)

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| name | TEXT | שם סוג השכ"ט |
| description | TEXT | תיאור |
| default_amount | NUMERIC | סכום ברירת מחדל |
| is_active | BOOLEAN | האם פעיל |
| created_at | TIMESTAMPTZ | תאריך יצירה |

---

### 6. **letter_templates**
**תיאור**: 11 תבניות מכתבים משני ותיקו  
**שימוש**: תבניות מוכנות למכתבים עסקיים בעברית

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| template_type | letter_template_type | סוג המכתב |
| name | TEXT | שם התבנית |
| language | TEXT | שפה (he/en) |
| subject | TEXT | נושא |
| content_html | TEXT | תוכן HTML |
| content_text | TEXT | תוכן טקסט |
| variables_schema | JSONB | משתנים {{client_name}}, {{amount}} |
| selection_rules | JSONB | כללי בחירה אוטומטית |
| is_active | BOOLEAN | האם פעיל |
| version | INTEGER | גרסה |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| updated_at | TIMESTAMPTZ | תאריך עדכון |

**סוגי מכתבים (template_type)**:
- `annual_fee_notification` - הודעה על שכ"ט שנתי
- `fee_increase_inflation` - עדכון שכ"ט עקב מדד
- `fee_increase_real` - עדכון שכ"ט ריאלי
- `payment_reminder_gentle` - תזכורת תשלום עדינה
- `payment_reminder_firm` - תזכורת תשלום נחרצת
- `payment_overdue` - חוב בפיגור
- `service_suspension_warning` - אזהרת הפסקת שירות
- `payment_confirmation` - אישור תשלום
- `new_client_welcome` - ברוך הבא ללקוח חדש
- `service_completion` - סיום שירות
- `custom_consultation` - ייעוץ מותאם אישית

---

### 7. **generated_letters**
**תיאור**: מכתבים שנוצרו ונשלחו  
**שימוש**: מעקב אחר מכתבים שנשלחו, נפתחו ונלחצו

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| client_id | UUID | מזהה לקוח |
| template_id | UUID | מזהה תבנית |
| fee_calculation_id | UUID | מזהה חישוב שכ"ט |
| variables_used | JSONB | משתנים שהוחלפו |
| generated_content_html | TEXT | תוכן סופי HTML |
| generated_content_text | TEXT | תוכן סופי טקסט |
| payment_link | TEXT | קישור תשלום Cardcom |
| sent_at | TIMESTAMPTZ | מתי נשלח |
| sent_via | TEXT | איך נשלח (email/sms) |
| opened_at | TIMESTAMPTZ | מתי נפתח |
| clicked_at | TIMESTAMPTZ | מתי נלחץ |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| created_by | UUID | מי יצר |

---

### 8. **payment_transactions**
**תיאור**: תנועות תשלום עם Cardcom  
**שימוש**: מעקב אחר תשלומים, קבלות וסטטוסים

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| client_id | UUID | מזהה לקוח |
| fee_calculation_id | UUID | מזהה חישוב שכ"ט |
| cardcom_deal_id | TEXT | מזהה עסקה בCardcom |
| cardcom_transaction_id | TEXT | מזהה טרנזקציה |
| amount | NUMERIC | סכום |
| currency | TEXT | מטבע (ILS) |
| status | payment_status | סטטוס (pending/completed/failed/refunded) |
| payment_method | TEXT | אמצעי תשלום |
| payment_link | TEXT | קישור תשלום |
| invoice_number | TEXT | מספר חשבונית |
| payment_date | TIMESTAMPTZ | תאריך תשלום |
| failure_reason | TEXT | סיבת כישלון |
| metadata | JSONB | מטא-דאטה |
| created_at | TIMESTAMPTZ | תאריך יצירה |
| updated_at | TIMESTAMPTZ | תאריך עדכון |

---

### 9. **audit_logs**
**תיאור**: לוג פעולות מלא לביקורת  
**שימוש**: מעקב אחר כל הפעולות במערכת לצרכי אבטחה וביקורת

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| user_id | UUID | מזהה משתמש |
| user_email | TEXT | מייל משתמש |
| action | TEXT | פעולה (login/create_client/send_letter) |
| module | TEXT | מודול (fee-management/clients) |
| resource_id | UUID | מזהה משאב |
| resource_type | TEXT | סוג משאב |
| details | JSONB | פרטי הפעולה |
| ip_address | INET | כתובת IP |
| user_agent | TEXT | דפדפן |
| created_at | TIMESTAMPTZ | תאריך |

---

### 10. **job_queue**
**תיאור**: תור משימות רקע  
**שימוש**: ניהול משימות אסינכרוניות (שליחת מיילים, דוחות)

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| job_type | TEXT | סוג משימה |
| payload | JSONB | מידע למשימה |
| status | TEXT | סטטוס (pending/processing/completed/failed) |
| priority | INTEGER | עדיפות |
| max_retries | INTEGER | מקסימום ניסיונות |
| retry_count | INTEGER | ניסיונות עד כה |
| scheduled_at | TIMESTAMPTZ | מתוזמן ל |
| started_at | TIMESTAMPTZ | התחיל ב |
| completed_at | TIMESTAMPTZ | הסתיים ב |
| failed_at | TIMESTAMPTZ | נכשל ב |
| error_message | TEXT | הודעת שגיאה |

---

### 11. **webhook_logs**
**תיאור**: לוג של Webhooks מCardcom ואחרים  
**שימוש**: מעקב אחר התראות מגורמים חיצוניים

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| source | TEXT | מקור (cardcom/sendgrid) |
| event_type | TEXT | סוג אירוע |
| payload | JSONB | תוכן |
| processed_at | TIMESTAMPTZ | מתי עובד |
| ip_address | INET | כתובת IP |
| response_sent | TEXT | תגובה שנשלחה |
| error_message | TEXT | שגיאה אם הייתה |

---

## 🔧 פונקציות (Functions)

### 1. **get_current_tenant_id()**
**תיאור**: מחזיר את ה-tenant_id של המשתמש המחובר  
**שימוש**: בכל שאילתה שצריכה בידוד multi-tenant  
**פרמטרים**: אין  
**מחזיר**: UUID של הטננט  

```sql
SELECT get_current_tenant_id();
```

---

### 2. **get_current_user_role()**
**תיאור**: מחזיר את התפקיד של המשתמש המחובר  
**שימוש**: בדיקת הרשאות  
**פרמטרים**: אין  
**מחזיר**: TEXT (admin/accountant/bookkeeper/client)  

```sql
SELECT get_current_user_role();
```

---

### 3. **get_client_statistics(p_tenant_id UUID)**
**תיאור**: מחזיר סטטיסטיקות על לקוחות  
**שימוש**: בדשבורד הראשי  
**פרמטרים**: 
- `p_tenant_id` - מזהה המשרד

**מחזיר טבלה עם**:
- `total_clients` - סה"כ לקוחות
- `active_clients` - לקוחות פעילים
- `inactive_clients` - לקוחות לא פעילים
- `pending_clients` - לקוחות ממתינים

```sql
SELECT * FROM get_client_statistics('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

---

### 4. **get_users_for_tenant()**
**תיאור**: מחזיר את כל המשתמשים של הטננט עם מידע מ-auth.users  
**שימוש**: בדף ניהול משתמשים  
**פרמטרים**: אין (משתמש בטננט הנוכחי)  

**מחזיר טבלה עם**:
- `id`, `tenant_id`, `user_id`
- `role`, `permissions`, `is_active`
- `email`, `last_sign_in_at`
- `created_at`, `updated_at`

```sql
SELECT * FROM get_users_for_tenant();
```

---

### 5. **get_fee_summary(p_tenant_id UUID)**
**תיאור**: מחזיר סיכום חישובי שכ"ט  
**שימוש**: בדשבורד פיננסי  
**פרמטרים**: 
- `p_tenant_id` - מזהה המשרד

**מחזיר טבלה עם**:
- `total_fees` - סה"כ חישובים
- `total_draft` - טיוטות
- `total_sent` - נשלחו
- `total_paid` - שולמו
- `total_approved` - אושרו
- `total_pending` - ממתינים
- `total_amount` - סה"כ סכום
- `paid_amount` - סכום ששולם
- `pending_amount` - סכום ממתין

```sql
SELECT * FROM get_fee_summary('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
```

---

### 6. **create_tenant_partition()**
**תיאור**: יוצר partition לטננט חדש (Trigger)  
**שימוש**: אוטומטי בעת יצירת טננט חדש  
**פרמטרים**: אין  
**הערה**: רץ אוטומטית כ-TRIGGER  

---

### 7. **update_updated_at_column()**
**תיאור**: מעדכן את שדה updated_at אוטומטית  
**שימוש**: Trigger על טבלאות  
**פרמטרים**: אין  
**הערה**: רץ אוטומטית כ-TRIGGER  

---

## 📝 Enums

### user_role
```sql
'admin'       -- מנהל מערכת
'accountant'  -- רואה חשבון
'bookkeeper'  -- מנהלת חשבונות
'client'      -- לקוח
```

### payment_status
```sql
'pending'    -- ממתין
'completed'  -- הושלם
'failed'     -- נכשל
'refunded'   -- הוחזר
```

### letter_template_type
```sql
'annual_fee_notification'    -- הודעה על שכ"ט שנתי
'fee_increase_inflation'     -- עדכון מדד
'fee_increase_real'         -- עדכון ריאלי
'payment_reminder_gentle'    -- תזכורת עדינה
'payment_reminder_firm'      -- תזכורת נחרצת
'payment_overdue'           -- חוב בפיגור
'service_suspension_warning' -- אזהרת הפסקת שירות
'payment_confirmation'       -- אישור תשלום
'new_client_welcome'        -- ברוך הבא
'service_completion'        -- סיום שירות
'custom_consultation'       -- ייעוץ מותאם
```

---

## 🔒 RLS Policies

### מדיניות בסיסית
כל הטבלאות מוגנות ב-RLS עם מדיניות:
1. **SELECT**: רק רשומות של הטננט שלך
2. **INSERT**: רק עם tenant_id שלך
3. **UPDATE**: רק רשומות של הטננט שלך
4. **DELETE**: רק למנהלים

### דוגמה למדיניות
```sql
-- Policy for SELECT
CREATE POLICY "Users can view own tenant data" 
ON clients FOR SELECT 
USING (tenant_id = get_current_tenant_id());

-- Policy for INSERT
CREATE POLICY "Users can insert to own tenant" 
ON clients FOR INSERT 
WITH CHECK (tenant_id = get_current_tenant_id());
```

---

## 🚀 אינדקסים

### אינדקסים קריטיים לביצועים
- `idx_clients_tenant_id` - לשאילתות לפי טננט
- `idx_clients_tax_id` - לחיפוש לפי ת.ז
- `idx_fee_calc_tenant_client` - לחיפוש חישובים של לקוח
- `idx_fee_calc_unpaid` - למציאת חובות
- `idx_audit_tenant_date` - ללוג פעולות לפי תאריך
- `idx_jobs_pending` - למשימות ממתינות

---

## 📌 הערות חשובות

1. **Multi-Tenancy**: כל טבלה חייבת `tenant_id` לבידוד מלא
2. **ולידציה ישראלית**: ת.ז עם Luhn algorithm, מע"מ 18%, מדד 3%
3. **Partitioning**: טבלת fee_calculations מחולקת לפי tenant לביצועים
4. **Security Definer**: פונקציות עם גישה ל-auth.users מוגדרות כ-SECURITY DEFINER
5. **Soft Delete**: משתמשים ולקוחות לא נמחקים, רק מסומנים כלא פעילים

---

## 🔄 עדכון אחרון
- **תאריך**: דצמבר 2024
- **גרסה**: 3.1
- **מעדכן**: TicoVision AI Development Team

---

**חשוב**: יש לעדכן קובץ זה בכל שינוי בסכמת הדאטאבייס!