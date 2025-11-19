# 📚 TicoVision AI - Database Reference Guide
**תאריך עדכון אחרון**: נובמבר 2025 (19/11/2025)
**גרסת סכמה**: 3.3

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

### 2. **tenant_users** ⚠️ DEPRECATED
**תיאור**: ~~קישור בין משתמשי Supabase Auth לטננטים~~
**סטטוס**: ❌ **הטבלה הזו DEPRECATED - אל תשתמשו בה!**
**שימוש**: השתמשו ב-`user_tenant_access` במקום

**הערה**: טבלה זו הוחלפה ב-`user_tenant_access`. כל המשתמשים הועברו למיגרציה `migrate_tenant_users_to_user_tenant_access`.

---

### 2.1. **user_tenant_access** ✅ הטבלה הנכונה
**תיאור**: קישור בין משתמשי Supabase Auth לטננטים עם ניהול גישה מתקדם
**שימוש**: מנהל הרשאות, תפקידים וגישה של משתמשים בתוך כל משרד

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| user_id | UUID | מזהה משתמש מ-auth.users |
| tenant_id | UUID | מזהה המשרד |
| role | VARCHAR | תפקיד (admin/accountant/bookkeeper/client) |
| permissions | JSONB | הרשאות מותאמות |
| is_primary | BOOLEAN | האם זה הטננט הראשי של המשתמש |
| granted_by | UUID | מי הקצה את הגישה |
| granted_at | TIMESTAMPTZ | מתי הוקצתה הגישה |
| expires_at | TIMESTAMPTZ | תאריך תפוגה (אופציונלי) |
| last_accessed_at | TIMESTAMPTZ | כניסה אחרונה לטננט |
| is_active | BOOLEAN | האם פעיל |
| revoked_at | TIMESTAMPTZ | תאריך שלילת גישה |
| revoked_by | UUID | מי שלל את הגישה |
| revoke_reason | TEXT | סיבת שלילה |

**היררכיית תפקידים**:
1. **מנהל מערכת** (super_admin) - רואה את כל המשתמשים בכל המשרדים
2. **מנהל משרד** (admin) - רואה את כל המשתמשים של המשרד שלו בלבד
3. **רואה חשבון** (accountant) - רואה רק משתמשים של הלקוחות המשוייכים אליו
4. **לקוח** (client) - אין גישה לדף משתמשים

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

### 6. **letter_templates** ✅ שימוש מומלץ
**תיאור**: 11 תבניות מכתבים משני ותיקו
**שימוש**: תבניות מוכנות למכתבים עסקיים בעברית
**⚠️ חשוב**: השתמשו רק ב-`generated_letters` (לא ב-`letter_history`)
**📝 הערה**: Header/Footer נטענים מקבצים ב-`templates/components/` (לא מהדאטאבייס)

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| template_type | letter_template_type | סוג המכתב |
| name | TEXT | שם התבנית |
| name_hebrew | TEXT | שם עברי |
| language | TEXT | שפה (he/en) |
| subject | TEXT | נושא |
| content_html | TEXT | תוכן גוף המכתב בלבד (ללא header/footer) |
| content_text | TEXT | תוכן טקסט |
| variables_schema | JSONB | משתנים {{client_name}}, {{amount}}, {{letter_date}} |
| selection_rules | JSONB | כללי בחירה אוטומטית |
| is_active | BOOLEAN | האם פעיל |
| is_editable | BOOLEAN | ניתן לעריכה |
| version | INTEGER | גרסה |
| original_file_path | TEXT | נתיב קובץ מקור (/templates/letter-body-*.html) |
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

### 6.1. **letter_history** ⚠️ DEPRECATED
**תיאור**: ~~טבלה ישנה למעקב מכתבים~~
**סטטוס**: ❌ **טבלה זו DEPRECATED - אל תשתמשו בה!**
**שימוש**: השתמשו ב-`generated_letters` במקום

**הערה**: טבלה זו הוחלפה ב-`generated_letters` שתומכת ב-header/footer נפרדים, tracking מתקדם ו-11 סוגי מכתבים.

---

### 7. **generated_letters** ✅ שימוש מומלץ
**תיאור**: מכתבים שנוצרו ונשלחו
**שימוש**: מעקב אחר מכתבים שנשלחו, נפתחו ונלחצו

**שתי דרכים ליצירת מכתבים**:
1. **Custom Mode**: מכתבים מותאמים אישית - משתמש ב-`template_id`
2. **Template Mode**: מכתבים מוכנים (11 סוגים) - משתמש ב-`template_type`

| שדה | סוג | תיאור |
|-----|-----|-------|
| id | UUID | מזהה ייחודי |
| tenant_id | UUID | מזהה המשרד |
| client_id | UUID | מזהה לקוח |
| template_id | UUID NULL | מזהה תבנית מ-letter_templates (למכתבים custom בלבד). NULL עבור מכתבים מרכיבים |
| template_type | TEXT | סוג תבנית (annual_fee, internal_audit, וכו'). משמש למכתבים מבוססי רכיבים |
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

**Constraints**:
- `CHECK (template_id IS NOT NULL OR template_type IS NOT NULL)` - חייב להיות אחד מהשניים

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

### 4. **get_users_for_tenant()** ✅ עם היררכיה מלאה
**תיאור**: מחזיר משתמשים לפי היררכיית תפקידים
**שימוש**: בדף ניהול משתמשים
**סוג**: SECURITY DEFINER (גישה ל-auth.users)
**פרמטרים**: אין (משתמש בטננט הנוכחי מה-JWT)

**מחזיר טבלה עם**:
- `user_id` UUID - מזהה המשתמש
- `tenant_id` UUID - מזהה הטננט
- `email` TEXT - כתובת מייל
- `full_name` TEXT - שם מלא (מ-raw_user_meta_data)
- `phone` TEXT - טלפון (מ-raw_user_meta_data)
- `role` user_role - תפקיד
- `is_active` BOOLEAN - האם פעיל
- `permissions` JSONB - הרשאות
- `created_at` TIMESTAMPTZ - תאריך יצירה
- `updated_at` TIMESTAMPTZ - תאריך עדכון
- `last_sign_in_at` TIMESTAMPTZ - כניסה אחרונה

**לוגיקת היררכיה**:
1. **מנהל מערכת** (super_admin) + **מנהל משרד** (admin):
   - רואים את **כל המשתמשים** של הטננט הנוכחי

2. **רואה חשבון** (accountant):
   - רואה **רק משתמשים** של הלקוחות המשוייכים אליו דרך `user_client_assignments`

3. **לקוח/אחר** (client/bookkeeper):
   - **אין גישה** - מחזיר רשימה ריקה

**הערות חשובות**:
- ✅ שדות `full_name` ו-`phone` מחולצים מ-`auth.users.raw_user_meta_data` JSONB
- ✅ הפונקציה משתמשת רק ב-`user_tenant_access` (tenant_users DEPRECATED)
- ✅ הוענקו הרשאות GRANT EXECUTE ל-authenticated
- ✅ הפונקציה בודקת `is_super_admin()` עבור מנהל מערכת

```sql
-- שליפת משתמשים לפי תפקיד
SELECT * FROM get_users_for_tenant();

-- Admin/Super Admin: מקבלים את כל המשתמשים
-- Accountant: מקבלים רק משתמשים מלקוחות משוייכים
-- Client: מקבלים רשימה ריקה
```

---

### 5. **create_user_with_role()** 🆕
**תיאור**: יוצר משתמש חדש עם תפקיד (מחליף את auth.admin.createUser)
**שימוש**: ליצירת משתמשים חדשים במערכת (admin only)
**סוג**: SECURITY DEFINER (פועל עם הרשאות מלאות)
**פרמטרים**:
- `p_email` TEXT - כתובת מייל
- `p_password` TEXT - סיסמה (מינימום 6 תווים)
- `p_full_name` TEXT - שם מלא
- `p_phone` TEXT (אופציונלי) - טלפון
- `p_role` user_role (ברירת מחדל: 'client') - תפקיד
- `p_permissions` JSONB (ברירת מחדל: '{}') - הרשאות מותאמות

**מחזיר טבלה עם**:
- `user_id` UUID - מזהה המשתמש שנוצר
- `email` TEXT - המייל
- `full_name` TEXT - שם מלא
- `role` user_role - התפקיד
- `tenant_id` UUID - מזהה הטננט

**בדיקות אבטחה**:
- ✅ בודק שהקורא הוא admin פעיל
- ✅ בודק תקינות פורמט המייל
- ✅ בודק שהמייל לא קיים כבר
- ✅ בודק שהסיסמה לפחות 6 תווים
- ✅ הצפנת סיסמה עם bcrypt

```sql
SELECT * FROM create_user_with_role(
  p_email => 'user@example.com',
  p_password => 'SecurePass123',
  p_full_name => 'ישראל ישראלי',
  p_phone => '050-1234567',
  p_role => 'accountant'
);
```

---

### 6. **update_user_role_and_metadata()** 🆕
**תיאור**: מעדכן תפקיד ומטא-דאטה של משתמש (מחליף auth.admin.updateUserById)
**שימוש**: לעדכון פרטי משתמשים (admin only)
**סוג**: SECURITY DEFINER
**פרמטרים**:
- `p_user_id` UUID - מזהה המשתמש לעדכון
- `p_role` user_role (אופציונלי) - תפקיד חדש
- `p_full_name` TEXT (אופציונלי) - שם מלא חדש
- `p_phone` TEXT (אופציונלי) - טלפון חדש
- `p_is_active` BOOLEAN (אופציונלי) - סטטוס פעיל/לא פעיל
- `p_permissions` JSONB (אופציונלי) - הרשאות חדשות

**מחזיר**: BOOLEAN (true במקרה של הצלחה)

**בדיקות אבטחה**:
- ✅ בודק שהקורא הוא admin פעיל
- ✅ בודק שהמשתמש קיים בטננט הנוכחי
- ✅ מעדכן גם user_tenant_access וגם auth.users

```sql
SELECT update_user_role_and_metadata(
  p_user_id => '550e8400-e29b-41d4-a716-446655440000',
  p_role => 'admin',
  p_full_name => 'שרה כהן',
  p_is_active => true
);
```

---

### 7. **reset_user_password()** 🆕
**תיאור**: מאפס סיסמת משתמש (מחליף auth.admin.updateUserById)
**שימוש**: לאיפוס סיסמאות משתמשים (admin only)
**סוג**: SECURITY DEFINER
**פרמטרים**:
- `p_user_id` UUID - מזהה המשתמש
- `p_new_password` TEXT - סיסמה חדשה (מינימום 6 תווים)

**מחזיר**: BOOLEAN (true במקרה של הצלחה)

**בדיקות אבטחה**:
- ✅ בודק שהקורא הוא admin פעיל
- ✅ בודק שהמשתמש קיים בטננט הנוכחי
- ✅ בודק שהסיסמה לפחות 6 תווים
- ✅ הצפנת סיסמה עם bcrypt

```sql
SELECT reset_user_password(
  p_user_id => '550e8400-e29b-41d4-a716-446655440000',
  p_new_password => 'NewSecurePass123'
);
```

---

### 8. **deactivate_user_account()** 🆕
**תיאור**: מבטל חשבון משתמש (soft delete, מחליף auth.admin.updateUserById)
**שימוש**: למחיקת משתמשים (admin only)
**סוג**: SECURITY DEFINER
**פרמטרים**:
- `p_user_id` UUID - מזהה המשתמש
- `p_reason` TEXT (ברירת מחדל: 'User deleted by admin') - סיבת הביטול

**מחזיר**: BOOLEAN (true במקרה של הצלחה)

**בדיקות אבטחה**:
- ✅ בודק שהקורא הוא admin פעיל
- ✅ בודק שהמשתמש קיים בטננט הנוכחי
- ✅ מונע מ-admin למחוק את עצמו
- ✅ מסמן כ-inactive ב-user_tenant_access
- ✅ חוסם התחברות ב-auth.users (banned_until)

```sql
SELECT deactivate_user_account(
  p_user_id => '550e8400-e29b-41d4-a716-446655440000',
  p_reason => 'User requested account closure'
);
```

---

### 9. **get_fee_summary(p_tenant_id UUID)**
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

### 📋 מדיניות RLS לפי טבלה

#### **clients** - 4 מדיניות
✅ **עודכן לאחרונה**: Migration 026 (03/10/2025) - תוקן fallback clause

| מדיניות | פקודה | תיאור |
|---------|-------|-------|
| `users_read_clients_by_role` | SELECT | Super admin רואה הכל, Admin רואה טננט, Accountant/Bookkeeper רק משוייכים, Client רק משוייכים |
| `users_insert_clients_by_role` | INSERT | Admin/Accountant/Bookkeeper יכולים להוסיף לקוחות |
| `users_update_clients_by_role` | UPDATE | Admin/Accountant/Bookkeeper יכולים לעדכן לקוחות משוייכים |
| `users_delete_clients_by_role` | DELETE | רק Admin יכול למחוק לקוחות |

**🔴 תיקון קריטי ב-Migration 026**:
- תוקן `users_read_clients_by_role` - הוסף בדיקת `role = 'client'` בתנאי הנפילה
- **לפני**: Accountants עקפו הגבלות דרך תנאי ללא בדיקת role
- **אחרי**: כל תפקיד נבדק במפורש, אין עקיפות

```sql
-- הלוגיקה המתוקנת (Migration 026):
-- 1. Super Admin: רואה הכל
-- 2. Admin: רואה כל הלקוחות בטננט
-- 3. Accountant/Bookkeeper: רק לקוחות משוייכים + בדיקת role
-- 4. Client: רק לקוחות משוייכים + בדיקת role='client'
```

---

#### **fee_calculations** - 4 מדיניות
✅ **עודכן לאחרונה**: Migration 027, 029 (03/10/2025)

| מדיניות | פקודה | תיאור |
|---------|-------|-------|
| `staff_manage_assigned_fee_calculations` | ALL | Admin/Accountant/Bookkeeper מנהלים חישובים משוייכים |
| `Bookkeepers can insert fee calculations` | INSERT | Bookkeepers יכולים ליצור חישובים |
| `users_view_assigned_fee_calculations` | SELECT | Admin + משתמשים משוייכים רואים חישובים |
| `clients_view_own_fee_calculations` | SELECT | **🆕 Migration 029** - Client role רואה חישובים משוייכים |

**🔴 תיקון ב-Migration 027**:
- הוסרה מדיניות סותרת: `"Accountants and admins can manage fee calculations"` (ALL)
- **בעיה**: נתנה גישה בלתי מוגבלת לכל Accountants
- **פתרון**: השארנו רק `staff_manage_assigned_fee_calculations` עם בדיקות שיוכים

**🆕 תוספת ב-Migration 029**:
- נוספה תמיכה ב-client role: `clients_view_own_fee_calculations`
- לקוחות יכולים כעת לצפות בחישובי עמלות שלהם (SELECT בלבד)

---

#### **generated_letters** - 4 מדיניות
✅ **עודכן לאחרונה**: Migration 028 (03/10/2025)

| מדיניות | פקודה | תיאור |
|---------|-------|-------|
| `staff_create_letters_for_assigned` | INSERT | Staff יוצרים מכתבים ללקוחות משוייכים |
| `users_view_assigned_letters` | SELECT | משתמשים רואים מכתבים משוייכים |
| `staff_update_assigned_letters` | UPDATE | **🆕** Admin/Accountant/Bookkeeper מעדכנים מכתבים משוייכים |
| `admins_delete_letters` | DELETE | **🆕** רק Admin יכול למחוק מכתבים |

**🔴 תיקון ב-Migration 028**:
- הוסרה מדיניות מסוכנת: `tenant_isolation_policy` (ALL)
- **בעיה**: אפשרה לכל משתמש בטננט למחוק/לעדכן כל מכתב
- **פתרון**: מדיניות ספציפיות עם בדיקות role ושיוכים

```sql
-- לפני Migration 028 (מסוכן):
tenant_isolation_policy (ALL) - רק tenant_id check

-- אחרי Migration 028 (בטוח):
staff_update_assigned_letters (UPDATE) - בדיקת role + שיוכים
admins_delete_letters (DELETE) - רק admin
```

---

#### **user_client_assignments** - 1 מדיניות
| מדיניות | פקודה | תיאור |
|---------|-------|-------|
| `admins_manage_client_assignments` | ALL | רק Admin יכול לנהל שיוכי משתמשים ללקוחות |

---

#### **audit_logs** - 1 מדיניות
| מדיניות | פקודה | תיאור |
|---------|-------|-------|
| `admins_view_audit_logs` | SELECT | רק Admin רואה לוגים |

---

#### **tenants** - 1 מדיניות
| מדיניות | פקודה | תיאור |
|---------|-------|-------|
| `users_read_own_tenant` | SELECT | משתמשים רואים רק את הטננט שלהם |

---

### 🔐 עקרונות אבטחה ב-RLS

1. **Explicit Role Checks** - כל מדיניות בודקת role במפורש (אין עקיפות)
2. **Assignment-Based Access** - Accountants/Bookkeepers מוגבלים לשיוכים בלבד
3. **Specific Policies** - הימנעות ממדיניות ALL רחבות, שימוש ב-INSERT/UPDATE/DELETE ספציפיים
4. **Tenant Isolation** - כל מדיניות כוללת `tenant_id = get_current_tenant_id()`
5. **Admin Restrictions** - פעולות מסוכנות (DELETE) מוגבלות ל-Admin בלבד

**📊 מטריצת גישה (Access Matrix)**:

| Role | View All | View Assigned | Create | Update | Delete |
|------|----------|---------------|--------|--------|--------|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ (tenant) | ✅ | ✅ | ✅ | ✅ |
| Accountant | ❌ | ✅ | ✅ | ✅ | ❌ |
| Bookkeeper | ❌ | ✅ | ✅ | ✅ | ❌ |
| Client | ❌ | ✅ (view only) | ❌ | ❌ | ❌ |

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
- **תאריך**: נובמבר 2025 (19/11/2025)
- **גרסה**: 3.3
- **מעדכן**: TicoVision AI Development Team
- **שינויים עיקריים**:
  - ✅ Migration 112: ניקוי טבלאות ריקות - מחיקת `letter_components` ו-`letter_component_combinations`
  - ✅ Migration 112: הסרת FK constraints מ-`letter_templates` (header_template_id, footer_template_id)
  - ✅ הוסבר שHeader/Footer נטענים מקבצים ב-`templates/components/` ולא מהדאטאבייס
  - ✅ Migration 026: תוקן באג קריטי ב-`users_read_clients_by_role` (fallback clause)
  - ✅ Migration 027: הוסרה מדיניות סותרת מ-`fee_calculations`
  - ✅ Migration 028: תוקנה מדיניות מסוכנת ב-`generated_letters`
  - ✅ Migration 029: נוספה תמיכה ל-client role ב-`fee_calculations`
  - ✅ הוספה מטריצת גישה מפורטת ועקרונות אבטחה ב-RLS

---

**חשוב**: יש לעדכן קובץ זה בכל שינוי בסכמת הדאטאבייס!