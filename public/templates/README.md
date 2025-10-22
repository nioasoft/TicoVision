# Letter Templates - הוראות שימוש

## 📄 קבצים במערכת

### 1. `letter-perfect.html` ⭐ **RECOMMENDED**
תבנית ה-HTML הראשית עם משתנים להחלפה.
- **Pixel-perfect positioning** מ-Figma באמצעות `inset` CSS
- תמיכה מלאה ב-RTL לעברית
- מותאם להדפסה וליצירת PDF

### 2. `letter-perfect-filled.html` ⭐ **EXAMPLE**
דוגמה מלאה עם נתונים אמיתיים - פתח בדפדפן כדי לראות את התוצאה הסופית.

### 3. `letter-precise.html` (Legacy)
גרסה ישנה - לא מומלץ לשימוש. השתמש ב-`letter-perfect.html` במקום.

### 4. `letter-template.html` (Legacy)
גרסה ישנה - לא מומלץ לשימוש. השתמש ב-`letter-perfect.html` במקום.

## 🔤 משתנים זמינים

| משתנה | תיאור | דוגמה |
|-------|--------|-------|
| `{{date}}` | תאריך המכתב | `4.10/2025` |
| `{{client_name}}` | שם הלקוח | `מסעדת האחים` |
| `{{company_name}}` | תיאור החברה | `קבוצת מסעדות ישראליות` |
| `{{year}}` | שנת המס | `2025` |
| `{{previous_year}}` | שנת המס הקודמת | `2024` |
| `{{amount}}` | סכום התשלום לתשלום בודד | `₪5,900` |
| `{{payment_start_date}}` | תאריך תשלום ראשון | `5.1.2025` |
| `{{payment_end_date}}` | תאריך תשלום אחרון | `5.8.2025` |
| `{{amount_after_discount_8}}` | סכום אחרי 8% הנחה | `₪43,344` |
| `{{amount_after_discount_4}}` | סכום אחרי 4% הנחה | `₪45,216` |
| `{{contact_name}}` | שם איש קשר | `סיגל נגר` |
| `{{contact_phone}}` | טלפון איש קשר | `050-8620993` |
| `{{contact_email}}` | אימייל איש קשר | `sigal@franco.co.il` |

## 🔄 שימוש בתבנית

### דרך 1: JavaScript (Node.js)

```javascript
const fs = require('fs');

// קרא את התבנית
let template = fs.readFileSync('letter-perfect.html', 'utf8');

// נתוני הלקוח
const clientData = {
  date: '15.1/2026',
  client_name: 'מסעדת הים התיכון',
  company_name: 'רשת מסעדות פרימיום',
  year: '2026',
  previous_year: '2025',
  amount: '₪6,200',
  payment_start_date: '5.2.2026',
  payment_end_date: '5.9.2026',
  amount_after_discount_8: '₪45,696',
  amount_after_discount_4: '₪47,616',
  contact_name: 'סיגל נגר',
  contact_phone: '050-8620993',
  contact_email: 'sigal@franco.co.il'
};

// החלף את כל המשתנים
Object.keys(clientData).forEach(key => {
  const regex = new RegExp(`{{${key}}}`, 'g');
  template = template.replace(regex, clientData[key]);
});

// שמור את הקובץ החדש
fs.writeFileSync('output-letter.html', template, 'utf8');

console.log('✅ Letter generated successfully!');
```

### דרך 2: Python

```python
from string import Template

# קרא את התבנית
with open('letter-perfect.html', 'r', encoding='utf-8') as f:
    # Template של Python משתמש ב-$ במקום {{}}
    # אז נשתמש ב-replace פשוט
    template = f.read()

# נתוני הלקוח
client_data = {
    'date': '15.1/2026',
    'client_name': 'מסעדת הים התיכון',
    'company_name': 'רשת מסעדות פרימיום',
    'year': '2026',
    'previous_year': '2025',
    'amount': '₪6,200',
    'payment_start_date': '5.2.2026',
    'payment_end_date': '5.9.2026',
    'amount_after_discount_8': '₪45,696',
    'amount_after_discount_4': '₪47,616',
    'contact_name': 'סיגל נגר',
    'contact_phone': '050-8620993',
    'contact_email': 'sigal@franco.co.il'
}

# החלף את כל המשתנים
for key, value in client_data.items():
    template = template.replace('{{' + key + '}}', value)

# שמור את הקובץ החדש
with open('output-letter.html', 'w', encoding='utf-8') as f:
    f.write(template)

print('✅ Letter generated successfully!')
```

## 📧 שימוש כ-Email Template (SendGrid)

```javascript
const sgMail = require('@sendgrid/mail');
const fs = require('fs');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// קרא והחלף משתנים כמו למעלה
let htmlContent = generateLetterFromTemplate(clientData);

const msg = {
  to: 'client@example.com',
  from: 'tico@franco.co.il',
  subject: `שכר טרחה לשנת ${clientData.year}`,
  html: htmlContent,
};

await sgMail.send(msg);
```

## 📄 המרה ל-PDF

### דרך 1: Puppeteer (Node.js)

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');

async function generatePDF() {
  // קרא והחלף משתנים
  let htmlContent = generateLetterFromTemplate(clientData);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0'
  });

  await page.pdf({
    path: 'letter-output.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });

  await browser.close();
  console.log('✅ PDF generated!');
}

generatePDF();
```

### דרך 2: Playwright

```javascript
const { chromium } = require('playwright');

async function generatePDF() {
  const htmlContent = generateLetterFromTemplate(clientData);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent);

  await page.pdf({
    path: 'letter-output.pdf',
    format: 'A4',
    printBackground: true
  });

  await browser.close();
  console.log('✅ PDF generated!');
}
```

### דרך 3: הדפסה ישירה מהדפדפן

1. פתח את `letter-perfect-filled.html` (או כל HTML שיצרת) בדפדפן
2. לחץ `Ctrl+P` (או `Cmd+P` ב-Mac)
3. בחר "Save as PDF"
4. לחץ "Save"

## 🎨 התאמת העיצוב

### שינוי צבעים

ערוך את ה-`<style>` tag ב-HTML:

```css
/* צבע רקע */
background-color: #f3e9e9;  /* ורוד בהיר */

/* צבע טקסט מודגש */
.highlight {
  color: #395bf7;  /* כחול */
}

/* תיבת פרטי בנק */
.bank-box {
  background-color: #000;  /* שחור */
}

/* Tagline */
.tagline {
  color: #bb0b0b;  /* אדום */
}
```

### שינוי גופנים

```css
body {
  font-family: 'David Libre', 'Arial', 'Heebo', sans-serif;
}
```

להוספת גופנים חדשים:

```html
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;700&display=swap" rel="stylesheet">
```

## 🔧 Integration עם TicoVision

### Service Layer

צור `letter.service.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

export interface LetterData {
  date: string;
  client_name: string;
  company_name: string;
  year: string;
  previous_year: string;
  amount: string;
  payment_start_date: string;
  payment_end_date: string;
  amount_after_discount_8: string;
  amount_after_discount_4: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
}

export class LetterService {
  private templatePath = path.join(__dirname, '../../templates/letter-perfect.html');

  generateLetter(data: LetterData): string {
    let template = fs.readFileSync(this.templatePath, 'utf8');

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      template = template.replace(regex, data[key as keyof LetterData]);
    });

    return template;
  }

  async generatePDF(data: LetterData, outputPath: string): Promise<void> {
    // Use Puppeteer/Playwright here
  }

  async sendEmail(data: LetterData, to: string): Promise<void> {
    // Use SendGrid here
  }
}
```

## 📝 טיפים

1. **תמיד בדוק את התוצאה בדפדפן** לפני שליחה ללקוח
2. **שמור גרסאות היסטוריות** של כל מכתב שנשלח
3. **השתמש ב-version control** לתבניות
4. **בדוק RTL** בדפדפנים שונים (Chrome, Firefox, Safari)
5. **בדוק הדפסה** לפני יצירת PDF סופי

## ⚠️ Known Issues

- **Fonts**: אם הגופן David Libre לא מותקן, הדפדפן יחזור ל-Arial/Heebo
- **Print Background**: ודא ש-"Background graphics" מסומן בהגדרות הדפסה
- **RTL in Email**: כמה email clients לא תומכים ב-RTL כראוי - בדוק בכמה clients

## 🚀 Next Steps

1. ייצר 11 תבניות נוספות (לפי הצורך)
2. שלב עם Cardcom payment links
3. הוסף automation rules
4. בנה ממשק UI לניהול תבניות

---

**Created for TicoVision CRM**
Phase 1: Fee Management System
December 2025
