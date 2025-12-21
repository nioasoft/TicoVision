/**
 * Collection Management System - Type Definitions
 *
 * This file contains all TypeScript types and interfaces for the Collection Management System.
 * Based on database schema from migrations 032-040.
 *
 * @module collection.types
 */

// ==================== Payment Method Types ====================

/**
 * Available payment methods for fee collection
 * Each method has a different discount percentage:
 * - bank_transfer: 9% discount
 * - cc_single: 8% discount
 * - cc_installments: 4% discount
 * - checks: 0% discount
 */
export type PaymentMethod = 'bank_transfer' | 'cc_single' | 'cc_installments' | 'checks';

/**
 * Payment status for fee calculations
 * - draft: Fee calculation created but not sent
 * - sent: Letter sent to client
 * - partial_paid: Client paid part of the amount
 * - paid: Fully paid
 * - overdue: Payment overdue (past due date)
 */
export type PaymentStatus = 'draft' | 'sent' | 'partial_paid' | 'paid' | 'overdue';

/**
 * Payment method discount percentages
 */
export const PAYMENT_DISCOUNTS: Record<PaymentMethod, number> = {
  bank_transfer: 9,
  cc_single: 8,
  cc_installments: 4,
  checks: 0,
} as const;

// ==================== Database Table Types ====================

/**
 * Payment method selection record
 * Tracks when a client selects a payment method from the letter
 */
export interface PaymentMethodSelection {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_calculation_id: string;
  generated_letter_id: string;

  // Selection details
  selected_method: PaymentMethod;
  original_amount: number;
  discount_percent: number;
  amount_after_discount: number;

  // Completion tracking
  selected_at: string;
  completed_payment: boolean;
  payment_transaction_id?: string;

  created_at: string;
}

/**
 * Payment dispute record
 * Created when a client claims "שילמתי" (I already paid)
 */
export interface PaymentDispute {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_calculation_id: string;

  // Client's claim
  dispute_reason?: string;
  claimed_payment_date?: string;
  claimed_payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other';
  claimed_amount?: number;
  claimed_reference?: string;

  // Resolution
  status: 'pending' | 'resolved_paid' | 'resolved_unpaid' | 'invalid';
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;

  created_at: string;
}

/**
 * Payment reminder record
 * Tracks automated and manual reminders sent to clients
 */
export interface PaymentReminder {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_calculation_id: string;

  // Reminder details
  reminder_type: 'no_open' | 'no_selection' | 'abandoned_cart' | 'checks_overdue';
  reminder_sequence?: number;

  // Delivery
  sent_via?: 'email' | 'sms' | 'both';
  sent_at: string;
  template_used?: string;

  // Tracking
  email_opened: boolean;
  email_opened_at?: string;

  created_at: string;
}

/**
 * Client interaction record
 * Manual interactions logged by Sigal (phone calls, meetings, notes)
 */
export interface ClientInteraction {
  id: string;
  tenant_id: string;
  client_id: string;
  fee_calculation_id?: string;

  // Interaction details
  interaction_type: 'phone_call' | 'email_sent' | 'meeting' | 'note' | 'whatsapp' | 'other';
  direction?: 'outbound' | 'inbound';

  subject: string;
  content?: string;
  outcome?: string;

  interacted_at: string;
  created_by: string;

  created_at: string;
}

/**
 * Notification settings per user
 * Configurable alert thresholds and reminder settings
 */
export interface NotificationSettings {
  id: string;
  tenant_id: string;
  user_id: string;

  // Alert thresholds (days)
  notify_letter_not_opened_days: number;
  notify_no_selection_days: number;
  notify_abandoned_cart_days: number;
  notify_checks_overdue_days: number;

  // Notification channels
  enable_email_notifications: boolean;
  notification_email?: string;

  // Reminder settings
  enable_automatic_reminders: boolean;
  first_reminder_days: number;
  second_reminder_days: number;
  third_reminder_days: number;

  // Grouping
  group_daily_alerts: boolean;
  daily_alert_time: string; // Time format: "HH:mm"

  created_at: string;
  updated_at: string;
}

/**
 * Reminder rule
 * Configurable automated reminder rules
 */
export interface ReminderRule {
  id: string;
  tenant_id: string;

  name: string;
  description?: string;

  // Flexible JSONB conditions
  trigger_conditions: ReminderTriggerConditions;
  actions: ReminderActions;

  is_active: boolean;
  priority: number;

  created_at: string;
  updated_at: string;
}

/**
 * Reminder rule trigger conditions (JSONB)
 */
export interface ReminderTriggerConditions {
  days_since_sent?: number;
  days_since_selection?: number;
  payment_status?: PaymentStatus[];
  opened?: boolean;
  payment_method_selected?: PaymentMethod[] | null;
  completed_payment?: boolean;
}

/**
 * Reminder rule actions (JSONB)
 */
export interface ReminderActions {
  send_email?: boolean;
  email_template?: string;
  send_sms?: boolean;
  notify_sigal?: boolean;
  include_mistake_button?: boolean;
}

// ==================== Dashboard Types ====================

/**
 * Collection dashboard KPIs
 * Real-time metrics for the dashboard
 */
export interface CollectionKPIs {
  // Financial
  total_expected: number;
  total_received: number;
  total_pending: number;
  collection_rate: number;

  // Client counts
  clients_sent: number;
  clients_paid: number;
  clients_pending: number;

  // Alerts
  alerts_unopened: number;
  alerts_no_selection: number;
  alerts_abandoned: number;
  alerts_disputes: number;
}

/**
 * Alert type for dashboard filtering
 */
export type AlertType =
  | 'not_opened_7d'
  | 'no_selection_14d'
  | 'abandoned_cart'
  | 'checks_overdue'
  | 'has_dispute';

/**
 * Collection dashboard row data
 * Comprehensive data for each client in the collection dashboard table
 */
export interface CollectionRow {
  // Client info
  client_id: string;
  client_name: string;
  company_name_hebrew?: string;
  contact_email: string;
  contact_phone?: string;

  // Fee calculation
  fee_calculation_id: string;

  // Letter tracking
  letter_sent_date: string;
  letter_opened: boolean;
  letter_opened_at?: string;
  letter_open_count: number;
  days_since_sent: number;

  // Payment
  amount_original: number;
  payment_method_selected?: PaymentMethod;
  payment_method_selected_at?: string;
  discount_percent: number;
  amount_after_discount: number;

  // Status
  payment_status: PaymentStatus;
  amount_paid: number;
  amount_remaining: number;

  // Reminders
  reminder_count: number;
  last_reminder_sent?: string;

  // Alerts
  has_alert: boolean;
  alert_types: AlertType[];

  // Disputes
  has_dispute: boolean;
  dispute_status?: string;

  // Interactions
  last_interaction?: string;
  interaction_count: number;
}

/**
 * Complete collection dashboard data
 */
export interface CollectionDashboardData {
  kpis: CollectionKPIs;
  rows: CollectionRow[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
}

// ==================== Filter Types ====================

/**
 * Dashboard filters
 */
export interface CollectionFilters {
  // Payment status filter
  status?:
    | 'all'
    | 'sent_not_opened'
    | 'opened_not_selected'
    | 'selected_not_paid'
    | 'partial_paid'
    | 'paid'
    | 'disputed';

  // Payment method filter
  payment_method?: PaymentMethod | 'all' | 'not_selected';

  // Time range filter (days since sent)
  time_range?: 'all' | '0-7' | '8-14' | '15-30' | '31-60' | '60+' | 'custom';
  custom_date_from?: string;
  custom_date_to?: string;

  // Amount range filter
  amount_range?: 'all' | 'up_to_10k' | '10k-50k' | '50k+' | 'custom';
  custom_amount_min?: number;
  custom_amount_max?: number;

  // Alert type filter
  alert_type?: AlertType | 'all';
}

/**
 * Dashboard sort options
 */
export interface CollectionSort {
  column:
    | 'client_name'
    | 'days_since_sent'
    | 'amount_original'
    | 'payment_status'
    | 'reminder_count';
  order: 'asc' | 'desc';
}

/**
 * Dashboard pagination
 */
export interface CollectionPagination {
  page: number;
  page_size: number;
}

// ==================== DTO Types (Data Transfer Objects) ====================

/**
 * DTO for marking a fee as paid
 * UPDATED 2025-12-21: Added payment_method for proper actual_payments tracking
 */
export interface MarkAsPaidDto {
  fee_id: string;
  payment_date?: string;
  payment_reference?: string;
  payment_method?: 'bank_transfer' | 'checks' | 'credit_card' | 'cash';
}

/**
 * DTO for recording a partial payment
 */
export interface MarkPartialPaymentDto {
  fee_id: string;
  amount_paid: number;
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
}

/**
 * DTO for adding a client interaction
 */
export interface AddClientInteractionDto {
  client_id: string;
  fee_id?: string;
  interaction_type: 'phone_call' | 'email_sent' | 'meeting' | 'note' | 'whatsapp' | 'other';
  direction?: 'outbound' | 'inbound';
  subject: string;
  content?: string;
  outcome?: string;
  interacted_at?: string;
}

/**
 * DTO for resolving a dispute
 */
export interface ResolveDisputeDto {
  dispute_id: string;
  resolution_status: 'resolved_paid' | 'resolved_unpaid' | 'invalid';
  resolution_notes?: string;
}

/**
 * DTO for submitting a payment dispute
 */
export interface SubmitDisputeDto {
  fee_id: string;
  client_id: string;
  dispute_reason: string;
  claimed_payment_date?: string;
  claimed_payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other';
  claimed_amount?: number;
  claimed_reference?: string;
}

/**
 * DTO for sending a manual reminder
 */
export interface SendManualReminderDto {
  fee_id: string;
  template_id: string;
  include_mistake_button?: boolean;
}

/**
 * DTO for updating notification settings
 */
export interface UpdateNotificationSettingsDto {
  notify_letter_not_opened_days?: number;
  notify_no_selection_days?: number;
  notify_abandoned_cart_days?: number;
  notify_checks_overdue_days?: number;
  enable_email_notifications?: boolean;
  notification_email?: string;
  enable_automatic_reminders?: boolean;
  first_reminder_days?: number;
  second_reminder_days?: number;
  third_reminder_days?: number;
  group_daily_alerts?: boolean;
  daily_alert_time?: string;
}

/**
 * DTO for updating a reminder rule
 */
export interface UpdateReminderRuleDto {
  name?: string;
  description?: string;
  trigger_conditions?: ReminderTriggerConditions;
  actions?: ReminderActions;
  is_active?: boolean;
  priority?: number;
}

// ==================== Helper Types ====================

/**
 * Date range for KPI calculations
 */
export interface DateRange {
  from: string;
  to: string;
}

/**
 * Overdue client info
 */
export interface OverdueClient {
  client_id: string;
  client_name: string;
  company_name_hebrew?: string;
  fee_calculation_id: string;
  amount_remaining: number;
  days_since_sent: number;
  last_reminder_sent?: string;
  reminder_count: number;
}

/**
 * Payment details for marking as paid
 */
export interface PaymentDetails {
  payment_date?: string;
  payment_reference?: string;
  payment_method?: PaymentMethod;
  notes?: string;
}
