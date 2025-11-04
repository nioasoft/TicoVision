/**
 * Dashboard Types
 * Types for the main dashboard KPIs and statistics
 */

/**
 * תקן תקציב (Budget Standard)
 * סכומי שכר טרחה + הנהלת חשבונות לפני ואחרי מע"מ
 */
export interface BudgetStandard {
  // שכר טרחה (Audit fees)
  audit_before_vat: number;
  audit_with_vat: number;

  // הנהלת חשבונות (Bookkeeping fees)
  bookkeeping_before_vat: number;
  bookkeeping_with_vat: number;

  // סה"כ (Total)
  total_before_vat: number;
  total_with_vat: number;
}

/**
 * סטטיסטיקת מכתבים
 * מספר לקוחות ששולחו להם מכתבים
 */
export interface LetterStats {
  clients_sent_count: number;
}

/**
 * סטטיסטיקת תשלומים
 * מספר לקוחות ששילמו/ממתינים + סכומים
 */
export interface PaymentStats {
  clients_paid_count: number;
  clients_pending_count: number;
  amount_collected: number;
  amount_pending: number;
  collection_rate_percent: number;
}

/**
 * קטגוריית תקציב
 * סכום + מספר לקוחות לכל קטגוריה
 */
export interface BudgetCategory {
  before_vat: number;
  with_vat: number;
  client_count: number;
}

/**
 * פירוט תקציב לפי קטגוריות
 * חלוקה מפורטת של התקציב לפי סוגי שירותים ולקוחות
 */
export interface BudgetByCategory {
  // ראיית חשבון
  audit_external: BudgetCategory;  // לקוחות חיצוניים
  audit_internal: BudgetCategory;  // לקוחות פנימיים
  audit_retainer: BudgetCategory;  // ריטיינר (1/3)
  audit_total: number;             // סה"כ ראיית חשבון

  // הנהלת חשבונות
  bookkeeping_internal: BudgetCategory;  // לקוחות פנימיים
  bookkeeping_retainer: BudgetCategory;  // ריטיינר (2/3)
  bookkeeping_total: number;             // סה"כ הנהלת חשבונות

  // נוספים
  freelancers: BudgetCategory;  // עצמאים
  exceptions: BudgetCategory;   // חריגים (בקרוב)

  // סה"כ כללי
  grand_total: number;
}

/**
 * נתוני Dashboard מלאים
 * כל הנתונים הדרושים לדף הראשי
 */
export interface DashboardData {
  tax_year: number; // Tax year (שנת מס) - the fiscal year FOR WHICH data is displayed
  budget_standard: BudgetStandard;
  budget_by_category?: BudgetByCategory; // פירוט תקציב מפורט (אופציונלי)
  letter_stats: LetterStats;
  payment_stats: PaymentStats;
}
