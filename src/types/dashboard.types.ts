/**
 * Dashboard Types
 * Types for the main dashboard KPIs and statistics
 */

/**
 * תקן תקציב (Budget Standard)
 * סכומי שכר טרחה + הנהלת חשבונות + חיובים כלליים לפני ואחרי מע"מ
 */
export interface BudgetStandard {
  // שכר טרחה (Audit fees)
  audit_before_vat: number;
  audit_with_vat: number;

  // הנהלת חשבונות (Bookkeeping fees)
  bookkeeping_before_vat: number;
  bookkeeping_with_vat: number;

  // חיובים כלליים (Billing letters - general charges)
  billing_before_vat: number;
  billing_with_vat: number;

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
 * כולל סכומים תקן (Standard) ובפועל (Actual)
 */
export interface BudgetCategory {
  // Standard amounts (theoretical max - before discounts)
  before_vat: number;
  with_vat: number;

  // NEW: Actual amounts (what's really coming in - after discounts)
  actual_before_vat: number;
  actual_with_vat: number;

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
  billing_letters: BudgetCategory;  // חיובים כלליים (מכתבי חיוב)
  exceptions: BudgetCategory;   // חריגים (בקרוב)

  // סה"כ כללי
  grand_total: number;
}

/**
 * פירוט אמצעי תשלום
 * כמה לקוחות בחרו כל שיטת תשלום וסכום כולל
 */
export interface PaymentMethodBreakdown {
  bank_transfer: {
    count: number;
    amount: number;
    discount: 9; // 9% הנחה
  };
  cc_single: {
    count: number;
    amount: number;
    discount: 8; // 8% הנחה
  };
  cc_installments: {
    count: number;
    amount: number;
    discount: 4; // 4% הנחה
  };
  checks: {
    count: number;
    amount: number;
    discount: 0; // 0% הנחה
  };
  not_selected: {
    count: number;
    amount: number;
  };
}

/**
 * נתוני Dashboard מלאים
 * כל הנתונים הדרושים לדף הראשי
 */
export interface DashboardData {
  tax_year: number; // Tax year (שנת מס) - the fiscal year FOR WHICH data is displayed
  budget_standard: BudgetStandard;
  budget_by_category?: BudgetByCategory; // פירוט תקציב מפורט (אופציונלי)
  payment_method_breakdown?: PaymentMethodBreakdown; // פירוט אמצעי תשלום (אופציונלי)
  letter_stats: LetterStats;
  payment_stats: PaymentStats;
}
