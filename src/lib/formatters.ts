/**
 * Formatting utilities for Israeli market
 * Currency, dates, payment methods, and status labels
 */

import type { PaymentMethod, PaymentStatus } from '@/types/collection.types';

/**
 * Format amount as Israeli Shekel (ILS) - rounded to nearest shekel
 * @param amount - Amount to format
 * @returns Formatted string like "₪1,234" (no decimals)
 */
export function formatILS(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Format amount as Israeli Shekel without decimals
 * @param amount - Amount to format
 * @returns Formatted string like "₪1,234"
 */
export function formatILSInteger(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Israeli format (DD/MM/YYYY)
 * @param date - Date to format
 * @returns Formatted string like "15/01/2025"
 */
export function formatIsraeliDate(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format datetime in Israeli format
 * @param date - Date to format
 * @returns Formatted string like "15/01/2025 14:30"
 */
export function formatIsraeliDateTime(date: string | Date): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Get Hebrew label for payment method
 * @param method - Payment method
 * @returns Hebrew label with discount percentage
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    bank_transfer: 'העברה בנקאית (9% הנחה)',
    cc_single: 'כ.אשראי תשלום אחד (8% הנחה)',
    cc_installments: 'כ.אשראי בתשלומים (4% הנחה)',
    checks: 'המחאות (ללא הנחה)',
  };
  return labels[method];
}

/**
 * Get short Hebrew label for payment method (without discount)
 * @param method - Payment method
 * @returns Short Hebrew label
 */
export function getPaymentMethodShortLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    bank_transfer: 'העברה בנקאית',
    cc_single: 'כ.אשראי',
    cc_installments: 'כ.אשראי תשלומים',
    checks: 'המחאות',
  };
  return labels[method];
}

/**
 * Get Hebrew label for payment status
 * @param status - Payment status
 * @returns Hebrew label
 */
export function getStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    draft: 'טיוטה',
    sent: 'נשלח',
    partial_paid: 'שולם חלקית',
    paid: 'שולם במלואו',
    overdue: 'באיחור',
  };
  return labels[status];
}

/**
 * Get color variant for payment status badge
 * @param status - Payment status
 * @returns Badge color variant
 */
export function getStatusVariant(
  status: PaymentStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'outline',
    partial_paid: 'default',
    paid: 'default',
    overdue: 'destructive',
  };
  return variants[status] || 'default';
}

/**
 * Calculate days between two dates
 * @param from - Start date
 * @param to - End date (defaults to now)
 * @returns Number of days
 */
export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format percentage
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage like "85.5%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format number with thousands separator (Hebrew locale)
 * @param value - Number to format
 * @returns Formatted number like "1,234,567"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('he-IL').format(value);
}
