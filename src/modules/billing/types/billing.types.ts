/**
 * Billing Letter Types
 * Types for general billing letters (not fee-based)
 */

/**
 * How the letter was sent
 * - email: Sent via system email
 * - manual_mail: דואר רגיל
 * - manual_hand: מסירה ידנית
 * - manual_other: אחר
 */
export type SentMethod = 'email' | 'manual_mail' | 'manual_hand' | 'manual_other';

/**
 * Billing letter status
 */
export type BillingLetterStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

/**
 * Billing letter record from database
 */
export interface BillingLetter {
  id: string;
  tenant_id: string;
  client_id: string;

  // Service description
  service_description: string;

  // Amounts
  amount_before_vat: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;

  // Discount (bank transfer only)
  bank_discount_percentage: number;
  amount_after_discount: number | null;

  // Status
  status: BillingLetterStatus;

  // Sending info
  sent_manually: boolean;
  sent_at: string | null;
  sent_method: SentMethod | null;

  // Payment tracking
  due_date: string | null;
  payment_date: string | null;
  payment_reference: string | null;

  // References
  generated_letter_id: string | null;
  actual_payment_id: string | null;

  // Metadata
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

/**
 * Input for creating a new billing letter
 */
export interface CreateBillingLetterInput {
  client_id: string;
  service_description: string;
  amount_before_vat: number;
  bank_discount_percentage?: number;
  due_date?: string;
  notes?: string;
}

/**
 * Input for updating a billing letter
 */
export interface UpdateBillingLetterInput {
  service_description?: string;
  amount_before_vat?: number;
  bank_discount_percentage?: number;
  due_date?: string;
  notes?: string;
  status?: BillingLetterStatus;
}

/**
 * Billing letter with client details (for display)
 */
export interface BillingLetterWithClient extends BillingLetter {
  client: {
    id: string;
    company_name: string;
    company_name_hebrew: string | null;
    tax_id: string;
  };
}

/**
 * Mark as sent manually input
 */
export interface MarkAsSentManuallyInput {
  sent_method: Exclude<SentMethod, 'email'>;
  notes?: string;
}

/**
 * Hebrew labels for sent methods
 */
export const SENT_METHOD_LABELS: Record<SentMethod, string> = {
  email: 'במייל',
  manual_mail: 'דואר רגיל',
  manual_hand: 'מסירה ידנית',
  manual_other: 'אחר',
};

/**
 * Hebrew labels for billing letter status
 */
export const BILLING_STATUS_LABELS: Record<BillingLetterStatus, string> = {
  draft: 'טיוטה',
  sent: 'נשלח',
  paid: 'שולם',
  cancelled: 'בוטל',
};

/**
 * VAT rate constant (Israel)
 */
export const VAT_RATE = 0.18;

/**
 * Calculate amounts with VAT
 */
export function calculateBillingAmounts(
  amountBeforeVat: number,
  discountPercentage: number = 0
): {
  amountBeforeVat: number;
  vatAmount: number;
  totalAmount: number;
  discountAmount: number;
  amountAfterDiscount: number;
  amountAfterDiscountWithVat: number;
} {
  const vatAmount = Math.round(amountBeforeVat * VAT_RATE * 100) / 100;
  const totalAmount = amountBeforeVat + vatAmount;

  const discountAmount = Math.round(amountBeforeVat * (discountPercentage / 100) * 100) / 100;
  const amountAfterDiscount = amountBeforeVat - discountAmount;
  const amountAfterDiscountVat = Math.round(amountAfterDiscount * VAT_RATE * 100) / 100;
  const amountAfterDiscountWithVat = amountAfterDiscount + amountAfterDiscountVat;

  return {
    amountBeforeVat,
    vatAmount,
    totalAmount,
    discountAmount,
    amountAfterDiscount,
    amountAfterDiscountWithVat,
  };
}
