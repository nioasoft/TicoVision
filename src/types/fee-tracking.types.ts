/**
 * Fee Tracking Types
 * Types for the fee tracking dashboard that shows all clients' calculation/letter/payment status
 */

import type { FeeStatus } from '@/services/fee.service';
import type { PaymentMethod, AlertLevel } from '@/types/payment.types';

/**
 * Payment status - derived from fee calculation status and letter status
 */
export type PaymentStatus =
  | 'not_calculated'  // Client has no fee calculation for this year
  | 'not_sent'        // Has calculation but no letter sent
  | 'pending'         // Letter sent, waiting for payment
  | 'partial_paid'    // Partially paid
  | 'paid';           // Fully paid

/**
 * Single row in the fee tracking table
 * Represents one client's complete status for a tax year
 */
export interface FeeTrackingRow {
  // Client info
  client_id: string;
  client_name: string;
  client_name_hebrew: string | null;
  tax_id: string;

  // Calculation status
  has_calculation: boolean;
  calculation_id?: string;
  calculation_status?: FeeStatus;
  calculation_amount?: number;
  calculation_created_at?: Date;

  // Letter status
  has_letter: boolean;
  letter_id?: string;
  letter_sent_at?: Date;

  // Payment status (derived)
  payment_status: PaymentStatus;
  payment_amount?: number;
  payment_date?: Date;

  // Payment method selection (from fee_calculations)
  payment_method_selected?: PaymentMethod | null;
  amount_after_selected_discount?: number | null;
  payment_method_selected_at?: Date | null;
}

/**
 * KPI metrics for the tracking dashboard
 */
export interface FeeTrackingKPIs {
  // Total counts
  total_clients: number;

  // Breakdown by status
  not_calculated: number;       // ❌ לא חושב
  calculated_not_sent: number;  // ⚠️ חושב ולא נשלח
  sent_not_paid: number;        // ⏳ נשלח ולא שולם
  paid: number;                 // ✅ שולם

  // Completion percentage (how many clients completed the full process)
  completion_percentage: number; // (paid / total_clients) * 100
}

/**
 * Filter options for the tracking table
 */
export type TrackingFilter =
  | 'all'
  | 'not_calculated'
  | 'calculated_not_sent'
  | 'sent_not_paid'
  | 'paid';

/**
 * Advanced filters for enhanced tracking view
 */
export interface FeeTrackingFilters {
  status?: FeeStatus;
  search?: string;
  deviationLevel?: AlertLevel;
  hasFiles?: boolean;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Enhanced tracking row from fee_tracking_enhanced_view
 * Includes all payment details, deviations, and installments
 */
export interface FeeTrackingEnhancedRow {
  // Basic info
  fee_calculation_id: string;
  tenant_id: string;
  client_id: string;
  company_name: string;
  tax_id: string;
  year: number;

  // Original amounts
  original_amount: number;
  original_before_vat: number;
  original_with_vat: number;

  // Expected payment
  payment_method_selected: PaymentMethod | null;
  expected_amount: number | null;
  expected_discount_percent: number;

  // Actual payment
  actual_payment_id: string | null;
  actual_amount_paid: number | null;
  actual_before_vat: number | null;
  actual_with_vat: number | null;
  actual_payment_date: string | null;
  actual_payment_method: PaymentMethod | null;
  payment_reference: string | null;
  num_installments: number | null;
  attachment_ids: string[] | null;

  // Deviation
  deviation_id: string | null;
  deviation_amount: number | null;
  deviation_percent: number | null;
  deviation_alert_level: AlertLevel | null;
  deviation_alert_message: string | null;
  deviation_reviewed: boolean | null;
  deviation_reviewed_by: string | null;
  deviation_reviewed_at: string | null;
  deviation_review_notes: string | null;

  // Status
  status: FeeStatus;
  fee_payment_date: string | null;
  has_deviation: boolean;

  // Counts
  installment_count: number;
  installments_paid: number;
  installments_overdue: number;
  attachment_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  payment_created_at: string | null;
  payment_updated_at: string | null;
}

/**
 * Complete data returned from the tracking service
 */
export interface FeeTrackingData {
  kpis: FeeTrackingKPIs;
  clients: FeeTrackingRow[];
}

/**
 * Props for action buttons in the table
 */
export interface TrackingActionProps {
  row: FeeTrackingRow;
  onCalculate: (clientId: string) => void;
  onPreviewLetter: (calculationId: string) => void;
  onSendLetter: (calculationId: string) => void;
  onEditCalculation: (calculationId: string, clientId: string) => void;
  onSendReminder: (letterId: string) => void;
  onViewLetter: (letterId: string) => void;
  onMarkAsPaid: (calculationId: string) => void;
}
