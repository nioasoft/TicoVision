/**
 * Shaagat HaAri Grants — Email Templates
 *
 * Content templates for all 7 email types in the grants module.
 * Uses plain text with {{variable}} placeholders — sent via send-letter simpleMode.
 *
 * Source: DOCS/PRD_SHAAGAT_HAARI_GRANTS.md section 5.1
 *
 * Email types:
 *   1. NOT_ELIGIBLE     — client not eligible
 *   2. ELIGIBLE         — client eligible (with payment link)
 *   3. GRAY_AREA        — borderline case, needs review
 *   4. DETAILED_CALCULATION — detailed grant breakdown
 *   5. SUBMISSION_CONFIRMATION — tax authority submission confirmation
 *   6. ACCOUNTING_FORM_REQUEST — salary data request to accountant
 *   7. SALARY_DATA_REQUEST — salary data request to client/contact
 */

import type { EmailLogType } from '../services/shaagat.service';

// ─────────────────────────────────────────────────────────────────────────────
// Template variable interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface BaseEmailVariables {
  clientName: string;
  firmName: string;
}

export interface EligibilityEmailVariables extends BaseEmailVariables {
  comparisonPeriodLabel: string;
  basePeriodLabel: string;
  threshold: string;
  revenueComparison: string;
  revenueBase: string;
}

export interface NotEligibleEmailVariables extends EligibilityEmailVariables {
  changeDirection: string;
  changeAmount: string;
}

export interface EligibleEmailVariables extends EligibilityEmailVariables {
  declinePercentage: string;
  paymentLink: string;
}

export interface DetailedCalculationEmailVariables extends BaseEmailVariables {
  fixedExpensesGrant: string;
  salaryGrant: string;
  finalGrantAmount: string;
  approvalUrl: string;
}

export interface SubmissionConfirmationEmailVariables extends BaseEmailVariables {
  submissionDate: string;
  grantAmount: string;
  requestNumber: string;
}

export interface AccountingFormRequestEmailVariables extends BaseEmailVariables {
  formUrl: string;
  submissionToken: string;
  salaryPeriodLabel: string;
}

export interface SalaryDataRequestEmailVariables extends BaseEmailVariables {
  recipientName: string;
  formUrl: string;
  submissionToken: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
  type: EmailLogType;
  subject: (vars: Record<string, string>) => string;
  body: (vars: Record<string, string>) => string;
}

// ─── 1. NOT_ELIGIBLE ───

export function getNotEligibleEmail(vars: NotEligibleEmailVariables): { subject: string; body: string } {
  return {
    subject: `${vars.clientName} - תוצאות בדיקת זכאות לפיצוי "שאגת הארי"`,
    body: `לכבוד ${vars.clientName}

הנדון: אי זכאותכם לקבל פיצוי בגין נזקי מלחמת "שאגת הארי"

משרדנו בדק עבורכם את שיעור הירידה בהכנסותיכם במחזור ${vars.comparisonPeriodLabel} אל מול מחזור בסיס (${vars.basePeriodLabel}). מהבדיקה עולה כי שיעור הירידה נמוך מ-${vars.threshold}% (ירידה שהייתה מקנה לכם את הזכות לקבלת פיצוי).

הסבר:
מחזור ${vars.comparisonPeriodLabel} הסתכם ל-${vars.revenueComparison} ₪ ואילו מחזור בסיס הסתכם ל-${vars.revenueBase} ₪
עולה מכך ${vars.changeDirection} של ${vars.changeAmount}% בלבד.
מה שלא מקנה לכם את הזכות לקבלת פיצוי.

בברכה,
צוות משרד ${vars.firmName}`,
  };
}

// ─── 2. ELIGIBLE ───

export function getEligibleEmail(vars: EligibleEmailVariables): { subject: string; body: string } {
  return {
    subject: `${vars.clientName} - מזל טוב! תוצאות בדיקת זכאות לפיצוי "שאגת הארי"`,
    body: `לכבוד ${vars.clientName}

הנדון: זכאותכם לקבלת פיצוי בגין נזקי מלחמת "שאגת הארי"

אנו שמחים להודיעכם כי לאחר בדיקת זכאות מדוקדקת שביצע משרדנו, הנכם זכאים לקבלת פיצוי בגין נזקי מלחמת "שאגת הארי".

פרטי הזכאות:
- תקופת הבדיקה: מחזור ${vars.comparisonPeriodLabel} לעומת מחזור בסיס (${vars.basePeriodLabel})
- מחזור ${vars.comparisonPeriodLabel}: ${vars.revenueComparison} ₪
- מחזור בסיס: ${vars.revenueBase} ₪
- שיעור הפגיעה במחזור: ${vars.declinePercentage}% ירידה
  (עומד בקריטריון של לפחות ${vars.threshold}%)

השלבים הבאים שנבצע עבורכם:
1. חישוב מדויק של גובה הפיצוי ובקשת אישורכם לשידור הבקשה
2. שידור מקוון לרשות המיסים (מס רכוש) לאחר אישורכם, ומעקב צמוד
3. מעקב על סטטוס הבקשה עד לנחיתת הכסף בבנק
4. במידת הצורך: ניהול ערעור/השגה

דמי טיפול ("הוצאות בעין") מינוריים:
כידוע לכם, משרדנו לא נוהג לגבות שכרי טרחה כאחוזים מהפיצוי.
דמי הטיפול יסתכמו לסה"כ של 1,350 ₪ בתוספת מע"מ.

במסגרת התהליך, הנכם נדרשים למלא את פרטי חשבון הבנק של החברה/העסק.

לחצו כאן להזנת פרטי הבנק ותשלום דמי הטיפול:
${vars.paymentLink}
(תשלום באמצעות כרטיס אשראי או ביט)

בברכה,
צוות משרד ${vars.firmName}`,
  };
}

// ─── 3. GRAY_AREA ───

export function getGrayAreaEmail(vars: BaseEmailVariables): { subject: string; body: string } {
  return {
    subject: `${vars.clientName} - תוצאות בדיקת זכאות לפיצוי "שאגת הארי"`,
    body: `שלום ${vars.clientName},

תודה על פנייתך בנוגע למענק "שאגת הארי".
הנתונים שהוזנו מצביעים על מצב גבולי הדורש בדיקה נוספת.
נציג מטעמנו ייצור איתך קשר בקרוב לצורך הבהרות נוספות.

בברכה,
צוות משרד ${vars.firmName}`,
  };
}

// ─── 4. DETAILED_CALCULATION ───

export function getDetailedCalculationEmail(vars: DetailedCalculationEmailVariables): { subject: string; body: string } {
  return {
    subject: `חישוב מענק מפורט - ${vars.clientName}`,
    body: `לכבוד ${vars.clientName}

הנדון: שלב 2 — פירוט גובה הפיצוי לו הנכם זכאים בגין נזקי מלחמת "שאגת הארי"

כמובטח, הושלם חישוב סכום הפיצוי לו הנכם זכאים.

הפיצוי מורכב משני רכיבים עיקריים:

1. פיצוי בגין הוצאות קבועות:
   סכום: ${vars.fixedExpensesGrant} ₪

2. פיצוי בגין הוצאות שכר:
   (לאחר ניכוי חל"ת, פדיון חופשה, טיפים, מילואים)
   סכום: ${vars.salaryGrant} ₪

סך כל הפיצוי הכולל: ${vars.finalGrantAmount} ₪

שלב 3: על מנת להמשיך ולשדר את הפיצוי לרשות המיסים, נדרש אישורכם להמשך ההליך.

לאישור או דחיית סכום הפיצוי — לחצו כאן:
${vars.approvalUrl}

שלב 4: לאחר אישורכם, נשדר את הבקשה לרשות המיסים.
שלב 5: נמשיך במעקב צמוד על קבלת הכספים.

בברכה,
צוות משרד ${vars.firmName}`,
  };
}

// ─── 5. SUBMISSION_CONFIRMATION ───

export function getSubmissionConfirmationEmail(vars: SubmissionConfirmationEmailVariables): { subject: string; body: string } {
  return {
    subject: `הודעה על שידור הפיצוי לו הנכם זכאים בגין נזקי מלחמת "שאגת הארי"`,
    body: `לכבוד ${vars.clientName}

שלב 4: כמובטח, בהתאם לתהליך, ולאחר אישורכם

משרדנו שידר באופן מקוון והגיש את הבקשה לרשות המיסים (מס רכוש) לקבלת הפיצוי ביום ${vars.submissionDate}.

סכום הפיצוי הצפוי: ${vars.grantAmount} ₪

מספר הבקשה הינו ${vars.requestNumber}.

שלב 5: משרדנו יבצע מעקב על תקבול הפיצוי הנדרש, בפועל (גובה הסכום המתקבל ומועד).
במידת הצורך: ניהול ערעור/השגה.

זכרו — על פי החוק רשות המיסים מחויבת:
- לאחר 21 ימים: לשלם מקדמה של לפחות 60%
- לאחר 150 ימים: לקבוע זכאות (תשלום מלא), ואם לא — 10% נוסף
- לאחר 8 חודשים: אם לא אושר — תשלום מלא חובה

משרדנו כמובן ממשיך לעקוב על סטטוס הבקשה.

בברכה,
צוות משרד ${vars.firmName}`,
  };
}

// ─── 6. ACCOUNTING_FORM_REQUEST ───

export function getAccountingFormRequestEmail(vars: AccountingFormRequestEmailVariables): { subject: string; body: string } {
  return {
    subject: `בקשה להזנת נתוני שכר - ${vars.clientName}`,
    body: `שלום,

משרד ${vars.firmName} מבקש ממך למלא נתוני שכר עבור הלקוח ${vars.clientName} לצורך חישוב מענק "שאגת הארי".

מילוי טופס נתונים:
${vars.formUrl}?token=${vars.submissionToken}

הנתונים הנדרשים:
- שכר ברוטו ${vars.salaryPeriodLabel} (טופס 102)
- ניכוי מילואים (₪ + כמות עובדים)
- ניכוי טיפים (₪ + כמות עובדים)
- ניכוי חל"ת (₪ + כמות עובדים)
- ניכוי חופשה (₪ + כמות עובדים)
- כמות עובדים כוללת

בברכה,
${vars.firmName}`,
  };
}

// ─── 7. SALARY_DATA_REQUEST ───

export function getSalaryDataRequestEmail(vars: SalaryDataRequestEmailVariables): { subject: string; body: string } {
  return {
    subject: `בקשה להזנת נתוני שכר עבודה - ${vars.clientName}`,
    body: `לכבוד ${vars.recipientName}

הנדון: בקשה להזנת נתוני שכר עבודה עבור ${vars.clientName}

בהמשך לבדיקת הזכאות שבוצעה, אנו נדרשים לנתונים נוספים מתוך רישומי השכר שלכם לצורך חישוב מדויק של סכום הפיצוי.

הטופס מאובטח ולוקח מספר דקות בלבד למילוי.

הזנת נתוני שכר עבודה:
${vars.formUrl}?token=${vars.submissionToken}

הנתונים הנדרשים:
- שכר ברוטו לחודש (טופס 102)
- עובדים בחל"ת (כמות + סכום)
- פדיון חופשה (כמות + סכום)
- מילואים (כמות + סכום)
- טיפים (כמות + סכום)

הטופס תקף ל-7 ימים. ניתן לבקש שליחה מחדש מהמשרד.

בברכה,
צוות משרד ${vars.firmName}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Template registry — maps email type to its generator
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL_TEMPLATE_MAP: Record<EmailLogType, string> = {
  NOT_ELIGIBLE: 'לא זכאי',
  ELIGIBLE: 'זכאי',
  GRAY_AREA: 'תחום אפור',
  DETAILED_CALCULATION: 'חישוב מפורט',
  SUBMISSION_CONFIRMATION: 'אישור שידור',
  ACCOUNTING_FORM_REQUEST: 'בקשת נתונים מרו"ח',
  SALARY_DATA_REQUEST: 'בקשת נתוני שכר',
};
