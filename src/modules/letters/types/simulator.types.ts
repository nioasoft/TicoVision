/**
 * Types for Letter Component Simulator
 * Allows mixing and matching letter components to create custom letters
 */

export interface SavedCombination {
  id: string;
  tenant_id: string;
  name: string;                     // "הנהח"ש רגיל", "ביקורת מדד"
  body_template: string;            // 'annual-fee.html'
  payment_template: string;         // 'payment-section-audit.html'
  default_amount?: number;          // סכום ברירת מחדל (אופציונלי)
  created_at: string;
  updated_at: string;
}

export interface ComponentSelection {
  body: string;
  payment: string;
  amount: number;
}

export interface LetterComponents {
  header: string;                    // תמיד 'header.html'
  body: string;                      // אחד מ-11
  payment: string;                   // אחד מ-4
  footer: string;                    // תמיד 'footer.html'
}

export interface BodyOption {
  value: string;
  label: string;
  code: string;
}

export interface PaymentOption {
  value: string;
  label: string;
  description: string;
}

// 11 Body templates
export const BODY_OPTIONS: BodyOption[] = [
  { value: 'annual-fee.html', label: 'A - חיצוניים - מדד', code: 'A' },
  { value: 'annual-fee-as-agreed.html', label: 'B - חיצוניים - כמוסכם', code: 'B' },
  { value: 'annual-fee-real-change.html', label: 'C - חיצוניים - ריאלי', code: 'C' },
  { value: 'internal-audit-index.html', label: 'D1 - ביקורת - מדד', code: 'D1' },
  { value: 'internal-audit-as-agreed.html', label: 'D2 - ביקורת - כמוסכם', code: 'D2' },
  { value: 'internal-audit-real-change.html', label: 'D3 - ביקורת - ריאלי', code: 'D3' },
  { value: 'retainer-index.html', label: 'E1 - רטיינר - מדד', code: 'E1' },
  { value: 'retainer-real-change.html', label: 'E2 - רטיינר - ריאלי', code: 'E2' },
  { value: 'bookkeeping-index.html', label: 'F1 - הנהח"ש - מדד', code: 'F1' },
  { value: 'bookkeeping-as-agreed.html', label: 'F2 - הנהח"ש - כמוסכם', code: 'F2' },
  { value: 'bookkeeping-real-change.html', label: 'F3 - הנהח"ש - ריאלי', code: 'F3' },
];

// 4 Payment section templates
export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'payment-section-audit.html',
    label: 'ביקורת + חיצוניים',
    description: 'מתאים לשכר טרחה ביקורת ודוחות חיצוניים'
  },
  {
    value: 'payment-section-bookkeeping.html',
    label: 'הנהלת חשבונות',
    description: 'מתאים לשכר טרחה הנהלת חשבונות'
  },
  {
    value: 'payment-section-retainer.html',
    label: 'רטיינר',
    description: 'מתאים לשכר טרחה רטיינר'
  },
  {
    value: 'payment-section.html',
    label: 'כללי (fallback)',
    description: 'תבנית כללית לכל סוג'
  },
];
