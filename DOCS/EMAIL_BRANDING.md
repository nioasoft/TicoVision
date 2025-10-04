# Email Branding Configuration

## סקירה כללית
המיילים שנשלחים על ידי Supabase Auth (איפוס סיסמה, אימות אימייל וכו') נשלחים מתבניות ברירת מחדל ללא מיתוג.
כדי למתג אותם עם פרטי העסק שלך, יש צורך בהגדרה ידנית ב-Supabase Dashboard.

## שלבים למיתוג המיילים

### 1. כניסה ל-Supabase Dashboard
1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרוייקט שלך: **TicoVision**
3. לחץ על **Authentication** בתפריט הצד
4. לחץ על **Email Templates** בתת-תפריט

### 2. תבניות המייל הזמינות
Supabase מספק 4 תבניות מייל שניתן להתאים אישית:

1. **Confirm Signup** - אימות הרשמה (לא בשימוש כרגע)
2. **Invite User** - הזמנת משתמש (לא בשימוש כרגע)
3. **Magic Link** - קישור התחברות (לא בשימוש כרגע)
4. **Change Email Address** - שינוי כתובת דוא"ל (לא בשימוש כרגע)
5. **Reset Password** - **זה התבנית שצריך למתג!** ✅

### 3. עריכת תבנית "Reset Password"

לחץ על **Reset Password** ותראה 2 שדות:

#### Subject Line (נושא המייל):
```
איפוס סיסמה - TicoVision AI
```

#### Message Body (גוף המייל):
```html
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>איפוס סיסמה</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; direction: rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">TicoVision AI</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">מערכת לניהול משרד רואי חשבון</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; text-align: right;">שלום,</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; text-align: right;">
                קיבלנו בקשה לאיפוס הסיסמה שלך במערכת TicoVision AI.
              </p>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: right;">
                לחץ על הכפתור למטה כדי לאפס את הסיסמה שלך:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      איפוס סיסמה
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: right;">
                אם לא ביקשת לאפס את הסיסמה, אנא התעלם ממייל זה. הסיסמה שלך לא תשתנה.
              </p>

              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 20px 0 0 0; text-align: right; border-top: 1px solid #eeeeee; padding-top: 20px;">
                הקישור תקף ל-60 דקות בלבד מסיבות אבטחה.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; margin: 0; font-size: 14px;">
                © 2025 TicoVision AI - מערכת לניהול משרד רואי חשבון
              </p>
              <p style="color: #999999; margin: 10px 0 0 0; font-size: 12px;">
                מייל זה נשלח אוטומטית, אנא אל תשיב.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 4. שמירה
1. לחץ על **Save** בתחתית העמוד
2. המיילים יישלחו עכשיו עם המיתוג החדש! ✅

## משתנים זמינים בתבניות

Supabase מספק משתנים שניתן להשתמש בהם בתבניות:

- `{{ .Email }}` - כתובת הדוא"ל של המשתמש
- `{{ .Token }}` - טוקן האימות
- `{{ .TokenHash }}` - Hash של הטוקן
- `{{ .ConfirmationURL }}` - קישור מלא לאימות (כולל הטוקן)
- `{{ .RedirectTo }}` - URL להפניה אחרי אימות
- `{{ .SiteURL }}` - URL של האפליקציה

## תבניות נוספות שכדאי למתג בעתיד

### Confirm Signup (אימות הרשמה)
אם תחליט בעתיד להשתמש באימות מייל בזמן הרשמה, תוכל למתג גם תבנית זו באותו אופן.

### Magic Link (התחברות ללא סיסמה)
אם תרצה להוסיף אפשרות להתחברות עם קישור במייל (ללא סיסמה), תוכל למתג גם תבנית זו.

## בדיקה
1. לך לדף ההתחברות: `http://localhost:5173/login`
2. לחץ על "שכחת סיסמה?"
3. הזן כתובת דוא"ל ולחץ על השלח
4. בדוק את תיבת הדואר - המייל אמור להגיע עם המיתוג החדש!

## הערות חשובות
- ⚠️ שינויים בתבניות נכנסים לתוקף מיידית
- ⚠️ מומלץ לשמור עותק של התבניות מחוץ ל-Dashboard
- ⚠️ בדוק תמיד את התבניות לפני פרסום לפרודקשן
- ✅ תבניות HTML תומכות ב-RTL (Right-to-Left) עבור עברית

## תמיכה
אם יש בעיות עם המיילים, בדוק:
1. **Authentication > Settings > SMTP Settings** - הגדרות שרת המייל
2. **Authentication > Settings > Email Auth** - אפשרויות אימות מייל
3. לוגים ב-**Database > Logs** לשגיאות משלוח מייל
