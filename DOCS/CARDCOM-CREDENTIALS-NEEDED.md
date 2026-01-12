# 🔑 Cardcom Credentials - מה צריך מטיקו

## מצב נוכחי:
✅ **המערכת מוכנה לחלוטין!** הקוד כתוב, הכל עובד.
❌ **חסרים רק credentials אמיתיים** של Cardcom כדי שהלינקים יעבדו.

---

## 📧 מייל נשלח אליך!

בדוק את המייל שלך: **Benatia.Asaf@gmail.com**

🎯 **תראה:**
- ✅ מכתב מלא ומעוצב (Header + Body + Payment + Footer)
- ✅ 4 אופציות תשלום עם סכומים והנחות
- ✅ כפתורי תשלום (כרגע מצביעים לעמודי placeholder)
- ✅ פורמט RTL עברי מושלם

**⚠️ הכפתורים לא יעבדו עד שיהיו credentials אמיתיים!**

---

## 🎯 מה צריך לבקש מטיקו:

### 1. פרטי חשבון Cardcom
צריך לבקש מטיקו:

```
נושא: בקשה לפרטי חיבור API של Cardcom

שלום,

אנחנו בונים מערכת CRM למשרד ורוצים לאפשר ללקוחות לשלם באשראי דרך Cardcom.

נצטרך את הפרטים הבאים:

1️⃣ מספר מסוף (Terminal Number)
2️⃣ שם משתמש API (API Username)
3️⃣ מפתח API (API Key / Password)

בנוסף, נצטרך לוודא שהמודולים הבאים מופעלים במסוף Cardcom:
- ✅ Low Profile Module (לדפי תשלום)
- ✅ Documents Module (לחשבוניות אוטומטיות)
- ✅ Tokenization (לשמירת כרטיסי אשראי)

תודה!
```

### 2. מה צריך לוודא במסוף Cardcom

כשתקבל גישה למסוף Cardcom, תצטרך:

#### א. להפעיל את Low Profile Module:
```
Settings → Modules → Low Profile → Enable
```

#### ב. להגדיר Indicator URL (Webhook):
```
Settings → Low Profile → Indicator URL:
https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/cardcom-webhook
```

#### ג. לאשר IP ranges (אם נדרש):
```
Settings → Security → Allowed IPs:
- Supabase IP ranges
- Your office IP (optional)
```

---

## 🚀 אחרי שתקבל credentials:

### שלב 1: עדכון .env.local

```bash
# החלף את הערכים בפרטים האמיתיים שתקבל מטיקו
VITE_CARDCOM_ENV=production
VITE_CARDCOM_TERMINAL=<מספר_המסוף_מטיקו>
VITE_CARDCOM_USERNAME=<שם_המשתמש_מטיקו>
VITE_CARDCOM_API_KEY=<מפתח_API_מטיקו>
```

### שלב 2: בדיקה עם Sandbox (אופציונלי)

אפשר לבדוק עם sandbox של Cardcom לפני production:

```env
VITE_CARDCOM_ENV=test
VITE_CARDCOM_TERMINAL=<terminal_sandbox>
VITE_CARDCOM_USERNAME=<username_sandbox>
VITE_CARDCOM_API_KEY=<api_key_sandbox>
```

### שלב 3: הרצה מחדש

```bash
# שלח מכתב עם לינקים אמיתיים
npx tsx scripts/demo-payment-letter.ts
```

**🎉 זהו! הלינקים יהיו אמיתיים ותוכל לבדוק תשלום אמיתי!**

---

## 🧪 בדיקה (כשהלינקים יעבדו)

### כרטיסי אשראי לבדיקה (Sandbox):
```
💳 Visa:        4580000000000000
📅 תוקף:       12/26
🔒 CVV:         123
🆔 ת.ז:        123456789
```

### כרטיסי אשראי לבדיקה (Production - בקש מ-Cardcom):
Cardcom ימסור לך כרטיסי test ספציפיים לסביבת production.

---

## 📞 תמיכה

אם יש בעיה:
1. **בעיות credentials:** פנה לתמיכת Cardcom
2. **בעיות טכניות:** אני כאן לעזור! 🚀

---

## ✅ מה כבר מוכן:

1. ✅ **Cardcom Service** - [src/services/cardcom.service.ts](src/services/cardcom.service.ts)
2. ✅ **Payment Transactions Table** - DB מוכן ומחולק לפי חודשים
3. ✅ **Letter Templates** - 4 קומפוננטים (header, body, payment, footer)
4. ✅ **SendGrid Integration** - מיילים עובדים
5. ✅ **Demo Scripts** - קל להריץ ולבדוק

**רק credentials חסרים! 🔑**

---

## 🎬 הצעד הבא:

1. 📧 תבדוק את המייל שקיבלת
2. 📞 תפנה לטיקו לקבלת credentials
3. 🔑 תעדכן את `.env.local`
4. 🚀 נריץ שוב את הסקריפט
5. 💳 תוכל לראות דף תשלום אמיתי של Cardcom!

**יאללה, קדימה! 🎯**
