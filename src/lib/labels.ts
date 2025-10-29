import type { PaymentRole } from '@/services/client.service';

/**
 * Hebrew labels for payment roles in client groups
 */
export const PAYMENT_ROLE_LABELS: Record<PaymentRole, string> = {
  independent: 'משלם לבד',
  member: 'חלק מהקבוצה',
  primary_payer: 'משלם ראשי',
};

/**
 * Detailed descriptions for payment roles
 */
export const PAYMENT_ROLE_DESCRIPTIONS: Record<PaymentRole, string> = {
  independent: 'הלקוח משלם בנפרד, לא חלק מחיוב קבוצתי',
  member: 'הלקוח חלק מחיוב משותף של הקבוצה',
  primary_payer: 'הלקוח מקבל את חיוב הקבוצה המלא ומשלם עבור כל החברות',
};

/**
 * Short descriptions for tooltips
 */
export const PAYMENT_ROLE_TOOLTIPS: Record<PaymentRole, string> = {
  independent: 'לא משויך לתשלום קבוצתי',
  member: 'הקבוצה משלמת עבורו',
  primary_payer: 'מקבל חיוב עבור הקבוצה',
};
