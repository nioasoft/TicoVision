# 🔄 תוכנית גיבוי והחזרה - ניקוי מערכת המכתבים

**תאריך:** 19 נובמבר 2025
**Commit נקודת שחזור:** `93bca0b` - "Backup: Pre letter-system cleanup"
**Branch:** main

---

## 📦 נקודת השחזור

לפני שמתחילים בניקוי, נוצרה נקודת שחזור ב-Git:

```bash
# נקודת שחזור זו כוללת:
git show 93bca0b --stat

# קבצים ששונו לפני הניקוי:
- memory-bank/activeContext.md
- public/templates/components/payment-section.html
- src/App.tsx
- src/components/ContactAutocompleteInput.tsx
- src/components/layout/MainLayout.tsx
- src/modules/letters/services/template.service.ts
- templates/components/payment-section.html
```

---

## 🗑️ קבצים שיימחקו - שלב 1

### 1. `src/services/letter.service.ts`
**גודל:** 473 שורות
**תיאור:** שירות ישן שעובד עם `letter_history` table (deprecated)

**גיבוי:**
```bash
# לפני מחיקה - גבה את הקובץ:
cp src/services/letter.service.ts /tmp/backup_letter.service.ts

# או שמור בגרסה עם תאריך:
cp src/services/letter.service.ts src/services/letter.service.ts.BACKUP_20251119
```

**החזרה:**
```bash
# אם צריך להחזיר:
git checkout 93bca0b -- src/services/letter.service.ts

# או מהגיבוי המקומי:
cp /tmp/backup_letter.service.ts src/services/letter.service.ts
```

---

### 2. `src/services/letter-builder.service.ts`
**גודל:** 124 שורות
**תיאור:** builder פשוט למיזוג header+body+footer

**גיבוי:**
```bash
cp src/services/letter-builder.service.ts /tmp/backup_letter-builder.service.ts
```

**החזרה:**
```bash
git checkout 93bca0b -- src/services/letter-builder.service.ts
```

---

### 3. `supabase/functions/send-letter-v2/` (תיקייה)
**תיאור:** Edge Function V2 שלא עובד (מצפה ל-table שלא קיימת)

**גיבוי:**
```bash
# גבה את כל התיקייה:
cp -r supabase/functions/send-letter-v2 /tmp/backup_send-letter-v2
```

**החזרה:**
```bash
git checkout 93bca0b -- supabase/functions/send-letter-v2
```

---

### 4. `src/modules/letters-v2/` (תיקייה - אם נמחק)
**תיאור:** מודול V2 שלם (לא משולב ב-routes)

**גיבוי:**
```bash
# גבה את כל התיקייה:
cp -r src/modules/letters-v2 /tmp/backup_letters-v2
```

**החזרה:**
```bash
git checkout 93bca0b -- src/modules/letters-v2
```

---

## 📝 קבצים שישתנו - שלב 1

### 1. `src/modules/letters/components/LetterHistoryTable.tsx`
**שינוי:** החלפת קריאות מ-`letterService` ל-`TemplateService`

**גיבוי לפני שינוי:**
```bash
cp src/modules/letters/components/LetterHistoryTable.tsx /tmp/backup_LetterHistoryTable.tsx
```

**השוואה אחרי שינוי:**
```bash
diff /tmp/backup_LetterHistoryTable.tsx src/modules/letters/components/LetterHistoryTable.tsx
```

**החזרה:**
```bash
git checkout 93bca0b -- src/modules/letters/components/LetterHistoryTable.tsx
```

---

### 2. `src/modules/letters/components/ResendLetterDialog.tsx`
**שינוי:** החלפת קריאות מ-`letterService` ל-`TemplateService`

**גיבוי:**
```bash
cp src/modules/letters/components/ResendLetterDialog.tsx /tmp/backup_ResendLetterDialog.tsx
```

**החזרה:**
```bash
git checkout 93bca0b -- src/modules/letters/components/ResendLetterDialog.tsx
```

---

### 3. `src/pages/LetterHistoryPage.tsx`
**שינוי:** החלפת imports ושימוש ב-`TemplateService`

**גיבוי:**
```bash
cp src/pages/LetterHistoryPage.tsx /tmp/backup_LetterHistoryPage.tsx
```

**החזרה:**
```bash
git checkout 93bca0b -- src/pages/LetterHistoryPage.tsx
```

---

### 4. `src/services/index.ts`
**שינוי:** הסרת exports של `letterService` ו-`letterBuilderService`

**גיבוי:**
```bash
cp src/services/index.ts /tmp/backup_services_index.ts
```

**החזרה:**
```bash
git checkout 93bca0b -- src/services/index.ts
```

---

## 🗄️ שינויי Database - שלב 2

### Migration חדש: מחיקת טבלאות ריקות

**קובץ:** `supabase/migrations/XXX_cleanup_letter_tables.sql`

**תוכן המיגרציה:**
```sql
-- Cleanup: Remove unused letter tables
-- Date: 2025-11-19

-- Drop empty tables
DROP TABLE IF EXISTS letter_component_combinations CASCADE;
DROP TABLE IF EXISTS letter_components CASCADE;

-- Remove FK constraints from letter_templates
ALTER TABLE letter_templates
  DROP CONSTRAINT IF EXISTS letter_templates_header_template_id_fkey,
  DROP CONSTRAINT IF EXISTS letter_templates_footer_template_id_fkey;

-- Remove columns that referenced deleted tables
ALTER TABLE letter_templates
  DROP COLUMN IF EXISTS header_template_id,
  DROP COLUMN IF EXISTS footer_template_id;
```

**החזרה (אם צריך):**
```bash
# אם המיגרציה עדיין לא רצה:
rm supabase/migrations/XXX_cleanup_letter_tables.sql

# אם המיגרציה כבר רצה - צריך revert migration:
# 1. צור migration חדש שמשחזר את הטבלאות:
supabase migration new restore_letter_components

# 2. העתק את ה-DDL המקורי מ-migration ישן
# (חפש CREATE TABLE letter_components...)
```

**מצא את המיגרציה המקורית:**
```bash
# חפש מתי נוצרו הטבלאות:
grep -r "CREATE TABLE letter_components" supabase/migrations/
grep -r "CREATE TABLE letter_component_combinations" supabase/migrations/
```

---

## 🔙 החזרה מלאה לנקודת השחזור

אם משהו השתבש ורוצים לחזור לגמרי לנקודת ההתחלה:

### אופציה 1: Reset Hard (⚠️ מאבד שינויים!)
```bash
# חזרה מלאה ל-commit הגיבוי:
git reset --hard 93bca0b

# אם כבר עשית push לשינויים החדשים:
git push --force  # זהירות! רק אם אתה לבד על ה-branch
```

### אופציה 2: Revert Commit (✅ מומלץ)
```bash
# יוצר commit חדש שמבטל את השינויים:
git revert HEAD  # מבטל את ה-commit האחרון
git revert <commit-hash>  # מבטל commit ספציפי

# Push בטוח:
git push
```

### אופציה 3: חזרה סלקטיבית (קבצים ספציפיים)
```bash
# החזר רק קבצים ספציפיים:
git checkout 93bca0b -- src/services/letter.service.ts
git checkout 93bca0b -- src/services/letter-builder.service.ts

# Commit השחזור:
git add .
git commit -m "Restore: Reverted letter service files"
git push
```

---

## 📋 רשימת בדיקה לפני תחילת העבודה

- [x] נוצר commit גיבוי: `93bca0b`
- [x] Pushed לריפו: origin/main
- [x] תיעוד גיבוי נוצר: `BACKUP_RECOVERY_PLAN.md`
- [ ] גיבוי מקומי של קבצים למחיקה ל-`/tmp/backup_*`
- [ ] בדיקה שהאפליקציה עובדת לפני השינויים
- [ ] בדיקה שיש גישה ל-Git ואפשר לעשות push

---

## 🧪 בדיקות אחרי השינויים

לאחר כל שלב, בדוק:

### 1. TypeScript Compilation
```bash
npm run typecheck
```

### 2. Build Success
```bash
npm run build
```

### 3. Dev Server
```bash
npm run dev
# בדוק שהאפליקציה עולה ב-http://localhost:5173
```

### 4. Basic Functionality
- [ ] עמוד היסטוריית מכתבים נטען
- [ ] אפשר ליצור מכתב חדש
- [ ] אפשר לצפות במכתב קיים
- [ ] אפשר לשלוח מכתב מחדש

---

## 📞 במקרה חירום

אם משהו לא עובד ואתה צריך עזרה:

1. **אל תפניק** - כל השינויים ב-Git
2. **תעצור את השינויים:**
   ```bash
   git stash  # שומר שינויים זמניים
   ```

3. **תחזור לנקודת שחזור:**
   ```bash
   git checkout 93bca0b
   npm install  # אם צריך
   npm run dev  # ודא שעובד
   ```

4. **אחזר את השינויים כשמוכן:**
   ```bash
   git checkout main
   git stash pop  # מחזיר שינויים זמניים
   ```

---

## 🎯 תוצאה צפויה

אחרי השלמת כל 3 השלבים:

### קבצים שנמחקו:
- `src/services/letter.service.ts` ❌
- `src/services/letter-builder.service.ts` ❌
- `supabase/functions/send-letter-v2/` ❌
- `src/modules/letters-v2/` ❌ (אם החלטנו)

### טבלאות שנמחקו:
- `letter_components` ❌
- `letter_component_combinations` ❌

### טבלה שנשארה:
- `generated_letters` ✅ (השינויים היחידים)

### שירות אחד:
- `src/modules/letters/services/template.service.ts` ✅

### Edge Function אחד:
- `supabase/functions/send-letter/` ✅

### תיעוד מעודכן:
- `LETTERS_ARCHITECTURE.md` ✅ (חדש)
- `DATABASE_REFERENCE.md` ✅ (מעודכן)
- `CLAUDE.md` ✅ (מעודכן)

---

**נקודת גיבוי:** `93bca0b`
**תאריך יצירה:** 19/11/2025
**סטטוס:** ✅ מוכן לשימוש

---

💡 **טיפ:** שמור קובץ זה! הוא מכיל את כל המידע הדרוש לשחזור במקרה הצורך.
