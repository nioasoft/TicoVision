# TicoVision CRM - Agent Usage Guide

## 🚀 Quick Start

הסוכנים שלך מותקנים ומוכנים לשימוש! כל סוכן מותאם במיוחד לפרויקט TicoVision CRM.

### מיקום הסוכנים
```
/Users/asafbenatia/asi_soft/TicoVision/.claude/agents/
├── backend-architect.md     # API ו-Supabase
├── security-auditor.md      # אבטחה ו-RLS
├── database-optimizer.md    # אופטימיזציה
├── frontend-developer.md    # React + shadcn/ui
└── test-automator.md        # בדיקות
```

## 📝 איך להשתמש בסוכנים

### תבנית בסיסית
```
@[agent-name] [your specific request in Hebrew or English]
```

## 🎯 דוגמאות שימוש מעשיות

### 1. Backend Architect - עיצוב API

#### יצירת API חדש
```
@backend-architect עצב API endpoint לחישוב שכר טרחה עבור לקוחות עם:
- תמיכה ב-multi-tenant דרך tenant_id
- חישוב אוטומטי של העלאות שנתיות
- תמיכה בהתאמות ידניות
- audit logging לכל שינוי
```

#### בדיקת ארכיטקטורה קיימת
```
@backend-architect סקור את המבנה של /api/clients ובדוק:
- האם יש בידוד נכון של tenant
- האם ה-error handling תקין
- האם יש caching מתאים
```

### 2. Security Auditor - אבטחה ו-RLS

#### בדיקת RLS policies
```
@security-auditor בדוק את ה-RLS policies בטבלת clients:
- וודא שאין דליפת מידע בין tenants
- בדוק הרשאות לפי role (admin, accountant, bookkeeper, client)
- וודא הצפנה של מספרי ח.פ
```

#### יצירת audit logging
```
@security-auditor עזור לי להוסיף audit logging ל:
- כל פעולות CRUD בטבלת clients
- שינויים בחישובי שכר טרחה
- שליחת מכתבים ללקוחות
עם שמירת IP, user agent, ופרטי המשתמש
```

### 3. Database Optimizer - אופטימיזציה

#### שיפור ביצועים
```
@database-optimizer הquery הבא איטי:
SELECT * FROM clients 
WHERE tenant_id = $1 
  AND status = 'active' 
  AND last_payment < NOW() - INTERVAL '30 days'
איך אפשר לשפר אותו?
```

#### תכנון indexes
```
@database-optimizer תכנן indexes לטבלת fee_calculations:
- חיפושים תכופים לפי client_id ו-year
- סינון לפי tenant_id תמיד
- מיון לפי created_at
- צפי של 100,000 רשומות בשנה
```

### 4. Frontend Developer - React + UI

#### יצירת קומפוננטה חדשה
```
@frontend-developer צור קומפוננטת ClientForm עם:
- שדות בעברית ואנגלית
- אימות ח.פ ישראלי (9 ספרות)
- שמירה אוטומטית עם Zustand
- שימוש ב-shadcn/ui forms
- תמיכה ב-RTL
```

#### שיפור ביצועי UI
```
@frontend-developer ה-Dashboard נטען לאט. עזור לי:
- להוסיף lazy loading
- לממש virtualization לרשימות ארוכות
- להוסיף skeleton loaders
- לשפר את ה-bundle size
```

### 5. Test Automator - בדיקות

#### יצירת בדיקות יחידה
```
@test-automator כתוב בדיקות Vitest ל:
- פונקציית calculateFee עם כל המקרים הקיצוניים
- validation של ח.פ ישראלי
- חישוב מע"מ לפי החוק הישראלי
```

#### בדיקות E2E
```
@test-automator צור בדיקת Playwright ל-flow הקריטי:
1. התחברות כ-accountant
2. הוספת לקוח חדש
3. חישוב שכר טרחה
4. יצירת מכתב תשלום
5. וידוא שהלקוח קיבל את המכתב
```

## 🔄 Workflows נפוצים

### הוספת פיצ'ר חדש מקצה לקצה

```bash
# 1. תכנון ה-API
@backend-architect תכנן API למערכת תזכורות אוטומטיות

# 2. אבטחה
@security-auditor הוסף RLS policies לטבלת reminders

# 3. אופטימיזציה
@database-optimizer תכנן indexes לחיפושי תזכורות

# 4. UI
@frontend-developer צור ממשק ניהול תזכורות

# 5. בדיקות
@test-automator כתוב בדיקות למערכת התזכורות
```

### ביקורת קוד לפני production

```bash
# סריקה מקיפה
@security-auditor בדוק את כל ה-RLS policies בפרויקט
@database-optimizer חפש queries איטיים בלוגים
@frontend-developer בדוק accessibility ו-performance
@test-automator וודא coverage מעל 80%
```

## 💡 טיפים מתקדמים

### 1. שילוב סוכנים
```
@backend-architect + @security-auditor 
תכננו יחד API מאובטח לניהול תשלומים עם:
- tokenization של כרטיסי אשראי
- audit logging מלא
- rate limiting
- PCI compliance
```

### 2. Context משותף
```
@frontend-developer + @test-automator
צרו יחד קומפוננטת PaymentForm עם:
- UI מושלם ב-shadcn/ui
- בדיקות יחידה מלאות
- בדיקות E2E
- Storybook stories
```

### 3. Performance מקצה לקצה
```
@database-optimizer + @backend-architect + @frontend-developer
שפרו את זמן טעינת Dashboard ל-sub 2 seconds:
- אופטימיזציה של queries
- caching strategy
- lazy loading בצד client
- code splitting
```

## 🚨 מתי להשתמש בכל סוכן

| סוכן | השתמש כאשר | דוגמה |
|------|------------|--------|
| backend-architect | יוצרים API חדש | עיצוב endpoints, Supabase functions |
| security-auditor | מוסיפים פיצ'ר רגיש | RLS, הרשאות, הצפנה |
| database-optimizer | יש בעיות ביצועים | queries איטיים, indexes |
| frontend-developer | בונים UI | קומפוננטות, forms, dashboards |
| test-automator | צריך לוודא איכות | unit tests, E2E, coverage |

## 📚 משאבים נוספים

- **Config**: `/Users/asafbenatia/asi_soft/TicoVision/.claude/AGENTS_CONFIG.md`
- **Project Rules**: `/Users/asafbenatia/asi_soft/TicoVision/CLAUDE.md`
- **Architecture**: `/Users/asafbenatia/asi_soft/TicoVision/DOCS/architecture.md`

## 🆘 בעיות נפוצות

### הסוכן לא מבין את הקונטקסט
```
# הוסף context ספציפי
@backend-architect [עם הקובץ /api/clients.ts] שפר את ה-error handling
```

### הסוכן נותן תשובה גנרית
```
# היה ספציפי יותר
@security-auditor בדוק RLS policy ספציפית:
CREATE POLICY "clients_tenant_isolation" ON clients
FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### הסוכן מתעלם מהטכנולוגיות שלך
```
# הזכר לו את ה-stack
@frontend-developer [זכור: אנחנו משתמשים רקקק ב-shadcn/ui, לא Material-UI]
צור טבלה עם pagination
```

---

**זכור**: הסוכנים מותאמים במיוחד ל-TicoVision CRM ומכירים את כל הדרישות הייחודיות שלך - multi-tenancy, חוקי מס ישראליים, תמיכה בעברית, ו-white-label.