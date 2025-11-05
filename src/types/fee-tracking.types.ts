/**
 * Fee Tracking Types
 * Types for the fee tracking dashboard that shows all clients' calculation/letter/payment status
 */

import type { FeeStatus } from '@/services/fee.service';
import type { PaymentMethod } from '@/types/collection.types';

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
