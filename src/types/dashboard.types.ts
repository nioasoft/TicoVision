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
 * נתוני Dashboard מלאים
 * כל הנתונים הדרושים לדף הראשי
 */
export interface DashboardData {
  tax_year: number; // Tax year (שנת מס) - the fiscal year FOR WHICH data is displayed
  budget_standard: BudgetStandard;
  letter_stats: LetterStats;
  payment_stats: PaymentStats;
}
