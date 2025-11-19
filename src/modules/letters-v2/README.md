# Letters V2 - Unified Letter System

הגרסה החדשה של מערכת המכתבים עם אחידות מלאה, PDF אוטומטי, ועריכה פשוטה.

## מבנה

### Pages
- `LetterTemplatesPageV2` - דף ראשי (fee letters + universal builder)
- `LetterHistoryPageV2` - היסטוריית מכתבים V2
- `LetterViewerV2` - צפייה ציבורית במכתבים

### Components
- `LetterDisplayDialog` - dialog אחיד לכל התצוגות
- `VersionHistoryDialog` - היסטוריית גרסאות
- `LetterBuilderV2` - בונה מכתבי שכר טרחה
- `UniversalBuilderV2` - בונה מכתבים מותאמים

### Services
- `ImageServiceV2` - ניהול תמונות מ-Supabase Storage
- `LetterRenderingService` - rendering אחיד (email, browser, PDF)
- `PDFGenerationService` - יצירת PDF לפי דרישה

## Routes

- `/letters-v2` - דף ראשי
- `/letters-v2/history` - היסטוריה
- `/letters-v2/view/:id` - צפייה ציבורית (public)

## מעבר בין גרסאות

המשתמש יכול לעבור בקלות בין V1 ל-V2:
- כפתור בתפריט: "מכתבים V2" (עם אייקון Sparkles)
- VersionSwitcher floating button בכל דפי המכתבים
- הכפתור מופיע רק בדפים רלוונטיים ומעביר אוטומטית בין הגרסאות

## טכנולוגיות

- React 19
- TypeScript (strict mode)
- shadcn/ui
- Supabase (Storage, Edge Functions)
- Puppeteer (PDF generation)

## שילוב במערכת הקיימת

V2 משולב באופן מלא במערכת ללא לפגוע בגרסה הקיימה:

### Navigation
- תפריט: "מכתבים V2" עם submenu (בונה מכתבים חדש, היסטוריית מכתבים V2)
- VersionSwitcher: כפתור צף שמופיע בכל דפי המכתבים

### Routes
- `App.tsx` מכיל את כל ה-routes החדשים
- Protected routes: `/letters-v2`, `/letters-v2/history`
- Public route: `/letters-v2/view/:id`

### Package.json Scripts
```bash
npm run upload-assets-v2    # העלאת assets ל-Supabase Storage
npm run verify-v2           # בדיקת setup
npm run deploy-pdf-function # deployment של Edge Function
```

## יתרונות V2

1. **אחידות מלאה** - כל המכתבים נשמרים ב-`generated_letters_v2`
2. **PDF אוטומטי** - יצירת PDF לפי דרישה (lazy loading)
3. **עריכה פשוטה** - בונה אוניברסלי עם WYSIWYG editor
4. **היסטוריית גרסאות** - מעקב אחר כל שינוי
5. **צפייה ציבורית** - URL לצפייה ללא אימות
6. **תמונות מנוהלות** - כל התמונות ב-Supabase Storage

## Database Schema

השתמש ב-`generated_letters_v2`:
- תמיכה בשני טיפוסים: `fee_letter`, `universal`
- שדה `body` - HTML content
- שדה `pdf_url` - נוצר לפי דרישה
- טעינת תמונות מ-Storage בזמן rendering

## טיפים לפיתוח

1. **Rendering**: השתמש ב-`letterRenderingService` לכל הצגה
2. **תמונות**: העלה תמונות עם `imageServiceV2.uploadImage()`
3. **PDF**: השתמש ב-`pdfGenerationService.generatePDF()` רק כשצריך
4. **היסטוריה**: שמור גרסאות ב-`letter_versions`
