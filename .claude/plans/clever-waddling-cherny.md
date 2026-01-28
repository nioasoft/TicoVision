# תיקון באג פסיקים בסכום - amount_with_vat

## הבעיה
כשנשלח מכתב שכר טרחה עם סכום כולל מע"מ של ₪51,079:
- התבנית שולחת: `amount=51,079` (עם פסיק!)
- `parseFloat("51,079")` מחזיר `51` (עוצר בפסיק)
- החישוב: 51 × 0.91 = 46.41 → `Math.ceil` = **47** ❌

## שורש הבעיה
1. `formatNumber()` מחזיר מחרוזת עם פסיקים ("51,079")
2. הערך הזה נכנס ל-URL כ-`amount={{amount_with_vat}}`
3. `parseFloat` לא יודע לפרסר מספרים עם פסיקים

## הפתרון
הוסיף משתנה חדש `amount_with_vat_raw` (מספר ללא פסיקים) לשימוש ב-URLs.

## קבצים לשינוי

### 1. `src/modules/letters/components/LetterPreviewDialog.tsx`
הוסיף:
```typescript
// Raw amounts for URL parameters (no formatting)
amount_with_vat_raw: amountWithVat,
amount_original_raw: amountOriginal,
```

### 2. `src/modules/letters/components/LetterBuilder.tsx`
הוסיף:
```typescript
// Raw amounts for URL parameters (no formatting)
amount_with_vat_raw: amountWithVat,
amount_original_raw: original,
```

### 3. `templates/components/payment-section.html`
שנה את כל ה-URLs מ:
```
amount={{amount_with_vat}}
```
ל:
```
amount={{amount_with_vat_raw}}
```

### 4. `templates/components/payment-section-bookkeeping.html`
אותו שינוי

### 5. `templates/components/payment-section-retainer.html`
אותו שינוי

### 6. `templates/components/payment-section-audit.html`
אותו שינוי

### 7. `supabase/functions/send-letter/index.ts`
בפונקציה `createShortLinksForPayment`:
- לקחת את הערך ה-raw במקום הערך המפורמט
- שורה 1375: `const amountWithVat = variables?.amount_with_vat_raw || variables?.amount_with_vat || 0;`
- להוסיף ניקוי פסיקים כ-fallback: `String(amountWithVat).replace(/,/g, '')`

## אימות
1. Deploy Edge Functions: `npx supabase functions deploy send-letter track-payment-selection`
2. Sync templates: `npm run sync-templates`
3. שלוח מכתב בדיקה
4. וודא שה-URL מכיל `amount=51079` (ללא פסיק)
5. וודא שהסכום בדף הנחיתה נכון (₪46,482)
