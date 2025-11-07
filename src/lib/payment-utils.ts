/**
 * Payment Utility Functions
 * Helper functions for payment formatting, calculations, and labeling
 */

import type {
  PaymentMethod,
  AlertLevel,
  InstallmentStatus,
  PAYMENT_DISCOUNTS
} from '@/types/payment.types';

/**
 * Format amount in Israeli Shekel with comma separators
 * @param amount - Amount to format
 * @returns Formatted string like "₪10,000"
 */
export function formatILS(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.ceil(amount));
}

/**
 * Format amount as plain number with comma separators (no ₪ symbol)
 * @param amount - Amount to format
 * @returns Formatted string like "10,000"
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.ceil(amount));
}

/**
 * Calculate VAT amount (18%)
 * @param amountBeforeVat - Amount before VAT
 * @returns VAT amount
 */
export function calculateVAT(amountBeforeVat: number): number {
  return amountBeforeVat * 0.18;
}

/**
 * Calculate amount with VAT (18%)
 * @param amountBeforeVat - Amount before VAT
 * @returns Amount with VAT included
 */
export function calculateWithVAT(amountBeforeVat: number): number {
  return amountBeforeVat * 1.18;
}

/**
 * Calculate amount before VAT from total
 * @param amountWithVat - Amount with VAT
 * @returns Amount before VAT
 */
export function calculateBeforeVAT(amountWithVat: number): number {
  return amountWithVat / 1.18;
}

/**
 * Get payment method discount percentage
 * @param method - Payment method
 * @returns Discount percentage (0-9)
 */
export function getPaymentMethodDiscount(method: PaymentMethod): number {
  const discounts: Record<PaymentMethod, number> = {
    bank_transfer: 9,
    cc_single: 8,
    cc_installments: 4,
    checks: 0,
  };
  return discounts[method];
}

/**
 * Calculate amount after discount
 * @param originalAmount - Original amount
 * @param discountPercent - Discount percentage (0-100)
 * @returns Amount after discount
 */
export function calculateAfterDiscount(originalAmount: number, discountPercent: number): number {
  return originalAmount * (1 - discountPercent / 100);
}

/**
 * Get payment method label in Hebrew
 * @param method - Payment method
 * @returns Hebrew label
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    bank_transfer: 'העברה בנקאית',
    cc_single: 'כרטיס אשראי - תשלום אחד',
    cc_installments: 'כרטיס אשראי - תשלומים',
    checks: 'המחאות',
  };
  return labels[method];
}

/**
 * Get payment method short label in Hebrew
 * @param method - Payment method
 * @returns Short Hebrew label
 */
export function getPaymentMethodShortLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    bank_transfer: 'העברה',
    cc_single: 'אשראי',
    cc_installments: 'תשלומים',
    checks: 'המחאות',
  };
  return labels[method];
}

/**
 * Get alert level color class for badges
 * @param level - Alert level
 * @returns Tailwind color classes
 */
export function getAlertLevelColor(level: AlertLevel): string {
  const colors: Record<AlertLevel, string> = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    critical: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[level];
}

/**
 * Get alert level icon
 * @param level - Alert level
 * @returns Icon string
 */
export function getAlertLevelIcon(level: AlertLevel): string {
  const icons: Record<AlertLevel, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };
  return icons[level];
}

/**
 * Get installment status color class
 * @param status - Installment status
 * @returns Tailwind color classes
 */
export function getInstallmentStatusColor(status: InstallmentStatus): string {
  const colors: Record<InstallmentStatus, string> = {
    pending: 'bg-gray-100 text-gray-800 border-gray-200',
    paid: 'bg-green-100 text-green-800 border-green-200',
    overdue: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status];
}

/**
 * Get installment status icon
 * @param status - Installment status
 * @returns Icon string
 */
export function getInstallmentStatusIcon(status: InstallmentStatus): string {
  const icons: Record<InstallmentStatus, string> = {
    pending: '⏳',
    paid: '✅',
    overdue: '❌',
  };
  return icons[status];
}

/**
 * Get installment status label in Hebrew
 * @param status - Installment status
 * @returns Hebrew label
 */
export function getInstallmentStatusLabel(status: InstallmentStatus): string {
  const labels: Record<InstallmentStatus, string> = {
    pending: 'ממתין',
    paid: 'שולם',
    overdue: 'באיחור',
  };
  return labels[status];
}

/**
 * Format percentage with sign
 * @param percent - Percentage value
 * @returns Formatted string like "+5.2%" or "-3.1%"
 */
export function formatPercentage(percent: number): string {
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(1)}%`;
}

/**
 * Format date in Israeli format (DD/MM/YYYY)
 * @param date - Date to format
 * @returns Formatted string like "15/01/2026"
 */
export function formatIsraeliDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Calculate days between two dates
 * @param from - Start date
 * @param to - End date (defaults to now)
 * @returns Number of days
 */
export function daysBetween(from: Date | string, to: Date | string = new Date()): number {
  const fromDate = typeof from === 'string' ? new Date(from) : from;
  const toDate = typeof to === 'string' ? new Date(to) : to;
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if date is overdue
 * @param dueDate - Due date to check
 * @returns True if date is in the past
 */
export function isOverdue(dueDate: Date | string): boolean {
  const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
  return date < new Date();
}

/**
 * Get file icon based on file type
 * @param fileType - MIME type or file extension
 * @returns Icon string
 */
export function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('image') || fileType.includes('jpg') || fileType.includes('jpeg') || fileType.includes('png')) return '🖼️';
  if (fileType.includes('doc')) return '📝';
  if (fileType.includes('xls') || fileType.includes('csv')) return '📊';
  return '📎';
}

/**
 * Format file size to human readable
 * @param bytes - File size in bytes
 * @returns Formatted string like "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Determine alert level based on deviation percentage
 * @param deviationPercent - Deviation percentage (positive or negative)
 * @returns Alert level
 */
export function determineAlertLevel(deviationPercent: number): AlertLevel {
  const absPercent = Math.abs(deviationPercent);

  if (absPercent < 1) return 'info';
  if (absPercent < 5) return 'warning';
  return 'critical';
}
