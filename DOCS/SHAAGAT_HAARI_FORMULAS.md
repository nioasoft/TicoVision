# מקור אמת: נוסחאות חישוב מענקי "שאגת הארי"

> **מסמך זה הוא מקור האמת היחיד לכל הנוסחאות.**
> כל קוד חישוב במערכת חייב להיות מבוסס על מסמך זה בלבד.
> מקור: מצגת לשכת יועצי המס (ירון גינדי) — טרם אושר ונחקק.
> **קובץ קוד:** `src/modules/shaagat-haari/lib/grant-calculations.ts`
> **קובץ קבועים:** `src/modules/shaagat-haari/lib/grant-constants.ts`

---

## 1. קבועים (Constants)

### 1.1 ספי זכאות — מקדם פיצוי

**חד חודשי:**
| ירידת מחזור | מקדם פיצוי |
|---|---|
| 25% — 40% | 7% |
| 40% — 60% | 11% |
| 60% — 80% | 15% |
| 80% — 100% | 22% |

**דו חודשי:**
| ירידת מחזור | מקדם פיצוי |
|---|---|
| 12.5% — 20% | 7% |
| 20% — 30% | 11% |
| 30% — 40% | 15% |
| 40% — 50% | 22% |

**סף מינימלי:** 25% חד-חודשי, 12.5% דו-חודשי
**תחום אפור:** 92% מהסף (23% חד-חודשי, 11.5% דו-חודשי)

### 1.2 קבועי שכר
| קבוע | ערך | שימוש |
|---|---|---|
| מכפיל עלות מעביד — רגיל | 1.25 | עסקים רגילים |
| מכפיל עלות מעביד — עמותה | 1.325 | עמותות/מלכ"רים |
| מכפיל מענק שכר | 0.75 | 75% מהשכר המותאם |
| שכר ממוצע במשק | 13,773 ₪ | בסיס לתקרת שכר |

### 1.3 תקרות מענק
| מחזור שנתי | תקרה |
|---|---|
| עד 100 מיליון | 600,000 ₪ |
| 100-300 מיליון | 600,000 + 0.003 × (מחזור − 100,000,000) |
| 300-400 מיליון | 1,200,000 ₪ |

### 1.4 קבועים נוספים
| קבוע | ערך |
|---|---|
| מחזור שנתי מינימלי | 12,000 ₪ |
| מחזור שנתי מקסימלי | 400,000,000 ₪ |
| מכפיל דו-חודשי | ×2 (עד 100%) |
| מכפיל קבלנים | ×0.68 |
| מכפיל הגדלת מקדם | ×1.5 |
| דמי טיפול | 1,350 ₪ + מע"מ (18%) |

---

## 2. תקופות השוואה לפי מסלול

| מסלול | תקופת בסיס (מחזור) | תקופת השוואה (מחזור) | תקופת תשומות |
|---|---|---|---|
| **רגיל** | 03/2025 (חד) / 3-4/2025 (דו) | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע חודשי 2025 |
| **מזומן** | 04/2025 (חד) / 3-4/2025 (דו) | 04/2026 (חד) / 3-4/2026 (דו) | ממוצע חודשי 2025 |
| **צפון** | 03/2023 (חד) / 3-4/2023 (דו) | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע 09/2022-08/2023 |
| **קבלנים** | ממוצע 07/2025-02/2026 | 04/2026 (חד) / 3-4/2026 (דו) | ממוצע 2025 (או מפתיחה) |
| **חדשים (01-02/25)** | ממוצע 03/2025-02/2026 | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע 03/2025-02/2026 |
| **חדשים (מ-03/25)** | ממוצע מתקופה עוקבת-02/2026 (שנתי) | 03/2026 (חד) / 3-4/2026 (דו) | ממוצע מתקופה עוקבת-02/2026 |

**שכר:** תמיד לפי טופס 102 של חודש 03/2026 (למעט קבלנים: 04/2026)

---

## 3. נוסחאות חישוב

### 3.1 חישוב זכאות (Eligibility)

```
שלב 1: מחזורים נקיים
  netRevenueBase = revenueBase − capitalRevenuesBase − selfAccountingRevenuesBase
  netRevenueComparison = revenueComparison − capitalRevenuesComparison − selfAccountingRevenuesComparison

שלב 2: אחוז ירידה
  declinePercentage = ((netRevenueBase − netRevenueComparison) / netRevenueBase) × 100
  (חיובי = ירידה, שלילי = עלייה)

שלב 3: סטטוס זכאות
  אם declinePercentage < 0 → NOT_ELIGIBLE
  אם declinePercentage < grayAreaMin → NOT_ELIGIBLE
  אם declinePercentage >= grayAreaMin AND < threshold → GRAY_AREA
  אם declinePercentage >= threshold → ELIGIBLE + compensationRate לפי טבלה

שלב 4: דו-חודשי
  effectiveDecline = reportingType === 'bimonthly'
    ? min(declinePercentage × 2, 100)
    : declinePercentage
  (משמש בחישוב מענק שכר בלבד!)
```

### 3.2 מענק הוצאות קבועות (Fixed Expenses Grant)

```
monthlyAvgInputs = (vatInputs + zeroVatInputs) / 12

fixedExpensesGrant = round(monthlyAvgInputs × (compensationRate / 100))

אופציה: מכפיל 1.5
  אם הוצאות קבועות בפועל > fixedExpensesGrant:
    fixedExpensesGrant = round(monthlyAvgInputs × (compensationRate × 1.5 / 100))
```

### 3.3 מענק שכר (Salary Grant)

```
שלב 1 — שכר מותאם:
  totalDeductions = tipsDeductions + miluimDeductions + chalatDeductions + vacationDeductions
  salaryAfterDeductions = salaryGross − totalDeductions        ← חשוב! ניכוי לפני הכפלה
  multiplier = businessType === 'ngo' ? 1.325 : 1.25
  adjustedSalary = salaryAfterDeductions × multiplier

שלב 2 — ירידה אפקטיבית:
  effectiveDecline = reportingType === 'bimonthly'
    ? min(declinePercentage × 2, 100)
    : declinePercentage

שלב 3 — מענק שכר לפני תקרה:
  salaryGrantBeforeCap = round(adjustedSalary × 0.75 × (effectiveDecline / 100))

שלב 4 — תקרת מענק שכר:
  employeeDeductions = miluimCount + chalatCount + vacationCount + tipsCount
  employeesAfterDeductions = max(totalEmployees − employeeDeductions, 1)

  ⚠️ נוסחת תקרה (לפי המצגת — ללא ×0.75!):
  salaryCap = round(employeesAfterDeductions × 13,773 × multiplier × (effectiveDecline / 100))

שלב 5 — מענק שכר סופי:
  salaryGrant = min(salaryGrantBeforeCap, salaryCap)
```

> **שגיאה היסטורית נפוצה #1:** `(salary × 1.25) − deductions` במקום `(salary − deductions) × 1.25`
> **שגיאה היסטורית נפוצה #2:** תקרה כוללת ×0.75 — לפי המצגת התקרה היא **ללא** ×0.75

### 3.4 סה"כ מענק + תקרה כוללת

```
totalGrant = fixedExpensesGrant + salaryGrant

תקרת מענק לפי מחזור שנתי:
  אם annualRevenue < 100,000,000:
    grantCap = 600,000

  אם 100,000,000 <= annualRevenue < 300,000,000:
    grantCap = min(600,000 + 0.003 × (annualRevenue − 100,000,000), 1,200,000)

  אם annualRevenue >= 300,000,000:
    grantCap = 1,200,000

finalGrantAmount = min(totalGrant, grantCap)
```

### 3.5 מסלול קבלנים — מכפיל 0.68

```
contractorFinalGrant = round(finalGrantAmount × 0.68)
```

### 3.6 השוואה עם מסלול קטנים ("הגבוה מבין השניים")

```
אם annualRevenue2022 <= 300,000:
  smallTrackAmount = lookupSmallBusinessGrant(annualRevenue2022, declinePercentage)
  finalAmount = max(finalGrantAmount, smallTrackAmount)
```

---

## 4. מסלול עסקים קטנים — טבלת Lookup

**עסקים עם מחזור שנתי (2022) עד 300,000 ₪ — סכומים קבועים:**

| מחזור 2022 (₪) | 25-40% | 40-60% | 60-80% | 80-100% |
|---|---|---|---|---|
| 12,000-50,000 | 1,833 | 1,833 | 1,833 | 1,833 |
| 50,000-90,000 | 3,300 | 3,300 | 3,300 | 3,300 |
| 90,000-120,000 | 4,400 | 4,400 | 4,400 | 4,400 |
| 120,000-150,000 | 2,776 | 4,164 | 6,662 | 8,328 |
| 150,000-200,000 | 3,273 | 4,910 | 7,855 | 9,819 |
| 200,000-250,000 | 4,190 | 6,285 | 10,056 | 12,570 |
| 250,000-300,000 | 4,897 | 7,346 | 11,752 | 14,691 |

**הערה:** עסקים עד 120,000 ₪ מקבלים סכום אחיד ללא קשר לאחוז הירידה (כל עוד עומדים בסף המינימלי).

---

## 5. דוגמת חישוב (מהמצגת — שקף 8)

### נתונים:
- הוצאות/תשומות ממוצעות חודשיות 2025: **150,364 ₪**
- שיעור ירידה במחזורים: **68%**
- שכר 03/2026 לפי טופס 102: **180,365 ₪**
- סוג עסק: רגיל (מכפיל 1.25)

### חישוב:

**מענק הוצאות קבועות:**
- ירידה 68% → מקדם 15% (קבוצה 60-80%)
- 150,364 × 15% = **22,555 ₪**

**מענק שכר:**
- שכר מותאם: 180,365 × 1.25 = 225,456
- × 0.75 = 169,092
- × 68% = **114,983 ₪**

**סה"כ: 22,555 + 114,983 = 137,538 ₪**

### אימות:
- 180,365 × 1.25 × 0.75 × 0.68 = 114,982.69 ≈ 114,983 ✓
- 150,364 × 0.15 = 22,554.6 ≈ 22,555 ✓
- Total = 137,538 ✓

---

## 6. נוסחאות מיוחדות

### 6.1 מזומן — תנאי כניסה
```
canUseCashBasisTrack =
  (reportingType === 'monthly' && marchDecline < 40) ||
  (reportingType === 'bimonthly' && marchDecline < 20)
```

### 6.2 עסק חדש — התאמה שנתית
```
אם העסק פעל N חודשים (N < 12):
  annualizedRevenue = (actualRevenue / N) × 12
```

### 6.3 נזק ישיר — מענק נוסף
```
additionalGrant = min(monthlyTaxableIncome × declinePercentage, 30000)
// לתקופת דיווח דו-חודשית
```

---

## 7. כללי עיגול

- כל ביניים: ללא עיגול (precision מלאה)
- תוצאה סופית בלבד: `Math.round()` (עיגול לשקל הקרוב)
- אחוזים: precision עד 4 ספרות אחרי הנקודה (לבדיקת תחום אפור)
