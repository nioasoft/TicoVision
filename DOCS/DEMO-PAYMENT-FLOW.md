# הדגמת זרימת תשלום בכרטיס אשראי - TicoVision + Cardcom

## 📊 מצב נוכחי במערכת

### ✅ מה שיש:
1. **6 לקוחות דמו** (רשת מסעדות טעים, טכנולוגיות חדשנות, וכו')
2. **עמוד חישוב שכר טרחה** - פעיל וזמין
3. **מערכת מכתבים** - 11 templates מוכנים
4. **Cardcom Service** - מוכן עם כל הפונקציות
5. **Payment Transactions Table** - DB מוכן

### ❌ מה שחסר:
1. **Credentials של Cardcom** (צריך מטיקו)
2. **נתוני דמו של Fee Calculations**
3. **חיבור בין Letter Generation ל-Payment Links**
4. **Webhook Handler** (Supabase Edge Function)

---

## 🎯 הדגמת הזרימה המלאה (כפי שתעבוד)

### שלב 1: מנהל יוצר חישוב שכר טרחה
**בעמוד:** `http://localhost:5173/fees`

```
לקוח: רשת מסעדות טעים בע"מ
סכום בסיס: ₪52,000
שנה: 2026
```

**המערכת מחשבת אוטומטית:**
- תשלום אחד (הנחה 8%): **₪47,840**
- 4 תשלומים (הנחה 4%): **₪49,920**
- 8 המחאות (ללא הנחה): **₪52,000**
- העברה בנקאית (הנחה 8%): **₪47,840**

---

### שלב 2: יצירת Payment Links דרך Cardcom

**קוד שירוץ באוטומטי:**

```typescript
// modules/letters/services/template.service.ts

async generateLetterWithPayments(clientId: string, feeCalculationId: string) {
  const client = await getClient(clientId);
  const fee = await getFeeCalculation(feeCalculationId);

  // 1. יצירת לינק תשלום אחד
  const { data: singlePayment } = await cardcomService.createPaymentPage({
    amount: fee.amount_single, // 47840
    maxPayments: 1,
    productName: `שכר טרחה לשנת ${fee.year} - תשלום אחד`,
    customerName: client.company_name,
    customerEmail: client.email,
    customerPhone: client.phone,
    documentType: 3, // Invoice + Receipt
    successUrl: `${APP_URL}/payment/success?fee=${feeCalculationId}`,
    errorUrl: `${APP_URL}/payment/error`,
    notifyUrl: `${SUPABASE_URL}/functions/v1/cardcom-webhook`
  });

  // 2. יצירת לינק 4 תשלומים
  const { data: installmentsPayment } = await cardcomService.createPaymentPage({
    amount: fee.amount_4_payments, // 49920
    maxPayments: 4,
    productName: `שכר טרחה לשנת ${fee.year} - 4 תשלומים`,
    customerName: client.company_name,
    customerEmail: client.email,
    customerPhone: client.phone,
    documentType: 3,
    successUrl: `${APP_URL}/payment/success?fee=${feeCalculationId}`,
    errorUrl: `${APP_URL}/payment/error`,
    notifyUrl: `${SUPABASE_URL}/functions/v1/cardcom-webhook`
  });

  // 3. שמירה ב-DB
  await supabase.from('payment_transactions').insert([
    {
      tenant_id: TENANT_ID,
      client_id: clientId,
      fee_calculation_id: feeCalculationId,
      amount: fee.amount_single,
      payment_method: 'credit_card_single',
      payment_link: singlePayment.url,
      cardcom_deal_id: singlePayment.lowProfileCode,
      status: 'pending'
    },
    {
      tenant_id: TENANT_ID,
      client_id: clientId,
      fee_calculation_id: feeCalculationId,
      amount: fee.amount_4_payments,
      payment_method: 'credit_card_4_payments',
      payment_link: installmentsPayment.url,
      cardcom_deal_id: installmentsPayment.lowProfileCode,
      status: 'pending'
    }
  ]);

  // 4. הכנת משתנים למכתב
  return {
    payment_link_single: singlePayment.url,
    payment_link_4_payments: installmentsPayment.url,
    amount_single: formatCurrency(fee.amount_single),
    amount_4_payments: formatCurrency(fee.amount_4_payments),
    // ... שאר המשתנים
  };
}
```

---

### שלב 3: המכתב שנשלח ללקוח

**דוגמה של Payment Section במכתב:**

```html
<!-- templates/components/payment-section.html -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding: 40px 0;">
      <h3 style="color: #2c3e50; font-size: 20px; margin-bottom: 24px;">
        אופן התשלום:
      </h3>

      <!-- אופציה 1: תשלום אחד -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
        <strong style="color: #2c3e50;">1️⃣ תשלום אחד בכרטיס אשראי</strong>
        <p style="margin: 8px 0;">הנחה מיוחדת של 8% - חיסכון של ₪4,160</p>
        <p style="font-size: 24px; color: #059669; margin: 12px 0;">
          <strong>₪47,840</strong>
        </p>
        <a href="{{payment_link_single}}"
           style="display: inline-block;
                  background: #059669;
                  color: white;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 16px;">
          💳 לתשלום מיידי לחץ כאן
        </a>
      </div>

      <!-- אופציה 2: 4 תשלומים -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
        <strong style="color: #2c3e50;">2️⃣ 4 תשלומים בכרטיס אשראי</strong>
        <p style="margin: 8px 0;">הנחה של 4% - חיסכון של ₪2,080</p>
        <p style="font-size: 24px; color: #3b82f6; margin: 12px 0;">
          <strong>₪49,920</strong>
          <span style="font-size: 16px; color: #6b7280;">(4 x ₪12,480)</span>
        </p>
        <a href="{{payment_link_4_payments}}"
           style="display: inline-block;
                  background: #3b82f6;
                  color: white;
                  padding: 14px 32px;
                  border-radius: 8px;
                  text-decoration: none;
                  font-weight: 600;
                  font-size: 16px;">
          💳 לתשלום ב-4 תשלומים לחץ כאן
        </a>
      </div>

      <!-- אופציה 3: העברה בנקאית -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
        <strong style="color: #2c3e50;">3️⃣ העברה בנקאית</strong>
        <p style="margin: 8px 0;">הנחה של 8% - ₪47,840</p>
        <p style="color: #6b7280; font-size: 14px;">
          בנק הפועלים | סניף 532 | חשבון 539990 | ע"ש פרנקו ושות' רו"ח
        </p>
      </div>

      <!-- אופציה 4: 8 המחאות -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
        <strong style="color: #2c3e50;">4️⃣ 8 המחאות</strong>
        <p style="margin: 8px 0;">סכום מלא - ₪52,000 (8 x ₪6,500)</p>
        <p style="color: #6b7280; font-size: 14px;">
          תאריכים: 5.1.2026 עד 5.8.2026 | מזהה לקוח: {{client_id}}
        </p>
      </div>
    </td>
  </tr>
</table>
```

---

### שלב 4: לקוח לוחץ על לינק ומגיע לדף Cardcom

**URL שיקבל הלקוח:**
```
https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=abc123xyz789
```

**מה יראה בדף:**
- 🏢 שם החברה: רשת מסעדות טעים בע"מ
- 💰 סכום: ₪47,840
- 📝 תיאור: שכר טרחה לשנת 2026 - תשלום אחד
- 💳 טופס כרטיס אשראי (מאובטח של Cardcom)
- ✅ כפתור "שלם עכשיו"

**דף Cardcom יכלול:**
- מספר כרטיס אשראי
- תוקף (MM/YY)
- CVV
- מספר תעודת זהות
- ✓ שמירת פרטי הכרטיס לעתיד (tokenization)

---

### שלב 5: לקוח משלם - Cardcom שולח Webhook

**מה קורה ברגע שהתשלום מאושר:**

```typescript
// supabase/functions/cardcom-webhook/index.ts

serve(async (req) => {
  // 1. קבלת נתונים מ-Cardcom
  const formData = await req.formData();
  const webhookData = {
    responsecode: formData.get('responsecode'), // '0' = הצלחה
    dealnumber: formData.get('dealnumber'),
    sum: formData.get('sum'),
    invoicenumber: formData.get('invoicenumber'),
    cardnumber: formData.get('cardnumber'), // 4 ספרות אחרונות
    tokennumber: formData.get('tokennumber'), // לתשלומים עתידיים
    // ... עוד שדות
  };

  // 2. אימות שההתראה באמת מ-Cardcom
  const clientIP = req.headers.get('x-forwarded-for');
  if (!CARDCOM_IP_RANGES.includes(clientIP)) {
    return new Response('Unauthorized', { status: 403 });
  }

  // 3. עדכון ה-DB
  if (webhookData.responsecode === '0') {
    // תשלום הצליח! 🎉
    await supabase
      .from('payment_transactions')
      .update({
        status: 'completed',
        payment_date: new Date().toISOString(),
        cardcom_transaction_id: webhookData.dealnumber,
        invoice_number: webhookData.invoicenumber,
        webhook_data: webhookData
      })
      .eq('cardcom_deal_id', webhookData.lowprofilecode);

    // עדכון סטטוס חישוב השכר
    await supabase
      .from('fee_calculations')
      .update({
        status: 'paid',
        payment_date: new Date().toISOString()
      })
      .eq('id', feeCalculationId);

    // שליחת מייל אישור ללקוח
    await sendPaymentConfirmationEmail({
      to: client.email,
      invoiceUrl: webhookData.invoicelink,
      amount: webhookData.sum,
      invoiceNumber: webhookData.invoicenumber
    });

  } else {
    // תשלום נכשל 😞
    await supabase
      .from('payment_transactions')
      .update({
        status: 'failed',
        failure_reason: getErrorMessage(webhookData.responsecode)
      })
      .eq('cardcom_deal_id', webhookData.lowprofilecode);

    // שליחת התראה למנהל
    await notifyAdminPaymentFailed({
      client: client.company_name,
      amount: webhookData.sum,
      reason: webhookData.responsemessage
    });
  }

  // 4. MUST RETURN: Cardcom מצפה ל--1 או OK
  return new Response('-1', { status: 200 });
});
```

---

### שלב 6: מה רואה המנהל ב-Dashboard

**עמוד חדש:** `http://localhost:5173/payments`

```
┌──────────────────────────────────────────────────────────────┐
│  תשלומים לשנת 2026                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  🟢 הושלם    רשת מסעדות טעים     ₪47,840    20/10/2025    │
│             תשלום אחד              חשבונית: 123456          │
│             Visa **** 1234                                   │
│                                                              │
│  🟡 ממתין    טכנולוגיות חדשנות    ₪49,920    18/10/2025    │
│             4 תשלומים              טרם שולם                 │
│             [רענן סטטוס]                                    │
│                                                              │
│  🔴 נכשל     ייצור מתקדם          ₪52,000    15/10/2025    │
│             תשלום אחד              שגיאה: כרטיס חסום        │
│             [שלח שוב] [פנה ללקוח]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

פילטרים:  [🟢 הושלם]  [🟡 ממתין]  [🔴 נכשל]  [תאריכים ▼]
```

---

## 🔐 אבטחה

### IP Whitelisting של Cardcom:
```
Range 1: 82.80.227.17/29 (82.80.227.17 - 82.80.227.24)
Range 2: 82.80.222.124/29 (82.80.222.124 - 82.80.222.131)
```

### RLS Policies:
```sql
-- רק המנהל יכול לראות תשלומים
CREATE POLICY "Users can view their tenant's payments"
ON payment_transactions FOR SELECT
USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- רק המערכת יכולה לעדכן דרך webhook
CREATE POLICY "System can update via service role"
ON payment_transactions FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role');
```

---

## 📊 מה עוד חסר לייצור:

### 1. Credentials (קריטי!)
```env
VITE_CARDCOM_TERMINAL=<מספר_מטיקו>
VITE_CARDCOM_USERNAME=<שם_מטיקו>
VITE_CARDCOM_API_KEY=<מפתח_מטיקו>
```

### 2. Webhook URL Configuration
צריך להגדיר ב-Cardcom Console:
```
Indicator URL: https://zbqfeebrhberddvfkuhe.supabase.co/functions/v1/cardcom-webhook
```

### 3. Edge Function Deployment
```bash
npx supabase functions deploy cardcom-webhook --project-ref zbqfeebrhberddvfkuhe
```

### 4. Cloudflare Configuration (אם משתמשים)
```
Page Rule: /functions/v1/cardcom-webhook
- Security Level: Off (כדי לא לחסום Cardcom)
- SSL: Flexible
```

---

## ✅ הצעד הבא:

**אפשר כבר לבנות את זה!** רק צריך:
1. ✅ קוד - כבר מוכן (cardcom.service.ts)
2. ✅ DB - כבר מוכן (payment_transactions)
3. ❌ Credentials - צריך מטיקו
4. ❌ Webhook - צריך לפרוס Edge Function
5. ❌ Integration - צריך לחבר ל-Letter System

**האם אתה רוצה שאתחיל לבנות את החיבור בין Letter Generation ל-Payment Links?**

או שאתה רוצה להמתין עד שיהיו לך credentials אמיתיים של Cardcom?

אפשר גם לעשות **מצב TEST** עם דמו של Cardcom (terminal 1000, username test9611) ולראות את זה עובד בפועל! 🚀
