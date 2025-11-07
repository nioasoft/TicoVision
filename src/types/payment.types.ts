/**
 * Payment System Types
 * Comprehensive types for actual payments, installments, and deviations
 */

export type PaymentMethod = 'bank_transfer' | 'cc_single' | 'cc_installments' | 'checks';

export type AlertLevel = 'info' | 'warning' | 'critical';

export type InstallmentStatus = 'pending' | 'paid' | 'overdue';

/**
 * Actual payment record - what client actually paid
 */
export interface ActualPayment {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_calculation_id: string;

  // Amounts
  amount_paid: number;
  amount_before_vat: number;
  amount_vat: number;
  amount_with_vat: number;

  // Payment details
  payment_date: Date;
  payment_method: PaymentMethod;
  payment_reference?: string;
  num_installments?: number;

  // Files
  attachment_ids?: string[];

  // Notes
  notes?: string;

  // Audit
  created_at: Date;
  created_by?: string;
  updated_at: Date;
  updated_by?: string;
}

/**
 * Payment installment (for cc_installments and checks)
 */
export interface PaymentInstallment {
  id: string;
  tenant_id: string;
  actual_payment_id: string;

  installment_number: number;
  installment_date: Date;
  installment_amount: number;

  status: InstallmentStatus;
  paid_date?: Date;

  notes?: string;
  created_at: Date;
}

/**
 * Payment deviation alert - when actual differs from expected
 */
export interface PaymentDeviation {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_calculation_id: string;
  actual_payment_id: string;

  expected_discount_percent?: number;
  expected_amount?: number;
  actual_amount?: number;

  deviation_amount?: number;
  deviation_percent?: number;

  alert_level: AlertLevel;
  alert_message?: string;

  reviewed: boolean;
  reviewed_by?: string;
  reviewed_at?: Date;
  review_notes?: string;

  created_at: Date;
}

/**
 * Props for AmountDisplay component
 */
export interface AmountDisplayProps {
  beforeVat: number;
  withVat?: number;
  showVatOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Props for DeviationBadge component
 */
export interface DeviationBadgeProps {
  deviationAmount: number;
  deviationPercent: number;
  alertLevel: AlertLevel;
  showTooltip?: boolean;
  className?: string;
}

/**
 * Props for InstallmentStatusBadge component
 */
export interface InstallmentStatusBadgeProps {
  status: InstallmentStatus;
  dueDate?: Date;
  className?: string;
}

/**
 * Props for FileAttachmentList component
 */
export interface FileAttachmentListProps {
  attachmentIds: string[];
  onUpload?: (files: File[]) => Promise<void>;
  readonly?: boolean;
  maxFiles?: number;
  className?: string;
}

/**
 * Payment discount percentages by method
 */
export const PAYMENT_DISCOUNTS: Record<PaymentMethod, number> = {
  bank_transfer: 9,
  cc_single: 8,
  cc_installments: 4,
  checks: 0,
} as const;

/**
 * VAT rate for Israel
 */
export const VAT_RATE = 0.18;

/**
 * Payment method labels in Hebrew
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'העברה בנקאית',
  cc_single: 'כרטיס אשראי - תשלום אחד',
  cc_installments: 'כרטיס אשראי - תשלומים',
  checks: 'המחאות',
} as const;

/**
 * Alert level labels in Hebrew
 */
export const ALERT_LEVEL_LABELS: Record<AlertLevel, string> = {
  info: 'מידע',
  warning: 'אזהרה',
  critical: 'קריטי',
} as const;

/**
 * Installment status labels in Hebrew
 */
export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  pending: 'ממתין',
  paid: 'שולם',
  overdue: 'באיחור',
} as const;
