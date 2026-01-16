# Requirements: שיפור עורך הטקסט העשיר

## סקירה כללית

שיפור עורך הטקסט (TipTap) במודול המכתבים האוניברסליים, ובניית POC עם Lexical להשוואה.

## הבעיות הנוכחיות

1. **העתק/הדבק בעייתי** - כשמעתיקים טקסט מ-Word או מקורות אחרים, העיצוב נשמר ומתנגש עם העיצוב הקיים
2. **Bold משנה פונט** - כשמפעילים bold הפונט משתנה
3. **אין דרך לנקות עיצוב** - אין כפתור להסרת כל העיצוב מטקסט נבחר
4. **Bullets על פסקה שלמה** - כשמחילים bullet על טקסט מרובה שורות, זה חל על הכל כפסקה אחת במקום שורות נפרדות

## דרישות

### Phase 1: תיקון TipTap הקיים

#### DR-1: ניקוי עיצוב בהדבקה
- בהדבקת טקסט, להסיר עיצובים זרים (font-family, font-size שונים)
- לשמור על עיצוב בסיסי (bold, italic, underline)
- תמיכה ב-Ctrl+Shift+V / Cmd+Shift+V להדבקה נקייה לחלוטין

#### DR-2: תיקון Bold/Font
- וידוא שהפונט נשאר קבוע (David Libre) בכל מצבי העיצוב
- בדיקה ותיקון של FontSize extension priority

#### DR-3: כפתור "נקה עיצוב"
- כפתור בסרגל הכלים להסרת כל העיצוב מטקסט נבחר
- מסיר marks (bold, italic, color, highlight)
- מסיר nodes מיוחדים (bullets צבעוניים, color blocks)

#### DR-4: פיצול אוטומטי ל-Bullets
- כשמחילים bullet על טקסט עם ריווחי שורות, לפצל לשורות נפרדות
- כל שורה הופכת ל-bullet נפרד

### Phase 2: POC עם Lexical

#### DR-5: עורך Lexical להשוואה
- בניית עורך חדש עם Lexical (של Meta)
- דף נפרד להשוואה בין שני העורכים
- פיצ'רים: RTL, bold, italic, צבעי טקסט, יישור, רשימות

## Acceptance Criteria

### Phase 1
- [ ] העתקה מ-Word לא משנה את הפונט הבסיסי של העורך
- [ ] Ctrl+Shift+V מדביק טקסט נקי לחלוטין
- [ ] כפתור "נקה עיצוב" מסיר את כל העיצוב מטקסט נבחר
- [ ] הפעלת bullet על טקסט מרובה שורות יוצרת bullet נפרד לכל שורה
- [ ] Bold לא משנה את הפונט

### Phase 2
- [ ] עורך Lexical עובד עם RTL/עברית
- [ ] דף השוואה נגיש ב-`/editor-demo`
- [ ] ניתן לבדוק paste משני העורכים

## Dependencies

- TipTap v3.13.0 (קיים)
- Lexical packages (להתקנה)

## Related Files

- `src/components/editor/TiptapEditor.tsx` - העורך הראשי
- `src/components/editor/extensions/` - הרחבות מותאמות
- `src/modules/letters/components/UniversalLetterBuilder.tsx` - שימוש בעורך
