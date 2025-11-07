/**
 * AmountDisplay Component
 * Display monetary amounts in Israeli Shekel format
 * Shows both before-VAT and with-VAT amounts in compact RTL layout
 */

import { formatILS, calculateWithVAT } from '@/lib/payment-utils';
import type { AmountDisplayProps } from '@/types/payment.types';
import { cn } from '@/lib/utils';

export function AmountDisplay({
  beforeVat,
  withVat,
  showVatOnly = false,
  size = 'md',
  className,
}: AmountDisplayProps) {
  // Calculate withVat if not provided
  const calculatedWithVat = withVat ?? calculateWithVAT(beforeVat);

  // Size classes
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
  };

  // If showing VAT amount only
  if (showVatOnly) {
    return (
      <div className={cn('rtl:text-right ltr:text-left', sizeClasses[size], className)}>
        <span className="font-medium text-gray-900">
          {formatILS(calculatedWithVat)}
        </span>
        <span className="text-gray-500 text-sm mr-1">(כולל מע"מ)</span>
      </div>
    );
  }

  // Default: Show both amounts
  return (
    <div className={cn('flex items-center gap-2 rtl:text-right ltr:text-left', className)}>
      {/* Before VAT */}
      <div className="flex items-center gap-1">
        <span className={cn('font-medium text-gray-900', sizeClasses[size])}>
          {formatILS(beforeVat)}
        </span>
        <span className="text-xs text-gray-500">(לפני מע"מ)</span>
      </div>

      {/* Separator */}
      <span className="text-gray-400">|</span>

      {/* With VAT */}
      <div className="flex items-center gap-1">
        <span className={cn('font-semibold text-blue-600', sizeClasses[size])}>
          {formatILS(calculatedWithVat)}
        </span>
        <span className="text-xs text-gray-500">(כולל מע"מ)</span>
      </div>
    </div>
  );
}

/**
 * Compact variant - single line with minimal spacing
 */
export function AmountDisplayCompact({
  beforeVat,
  withVat,
  className,
}: Omit<AmountDisplayProps, 'showVatOnly' | 'size'>) {
  const calculatedWithVat = withVat ?? calculateWithVAT(beforeVat);

  return (
    <span className={cn('rtl:text-right ltr:text-left text-sm', className)}>
      {formatILS(beforeVat)} לפני • {formatILS(calculatedWithVat)} כולל
    </span>
  );
}

/**
 * VAT breakdown - shows calculation details
 */
export function AmountWithVATBreakdown({
  beforeVat,
  className,
}: Pick<AmountDisplayProps, 'beforeVat' | 'className'>) {
  const vatAmount = beforeVat * 0.18;
  const withVat = beforeVat + vatAmount;

  return (
    <div className={cn('space-y-1 rtl:text-right ltr:text-left text-sm', className)}>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">סכום לפני מע"מ:</span>
        <span className="font-medium">{formatILS(beforeVat)}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">מע"מ (18%):</span>
        <span className="font-medium text-gray-700">{formatILS(vatAmount)}</span>
      </div>
      <div className="flex justify-between items-center pt-1 border-t border-gray-200">
        <span className="font-semibold text-gray-900">סה"כ כולל מע"מ:</span>
        <span className="font-semibold text-blue-600 text-base">{formatILS(withVat)}</span>
      </div>
    </div>
  );
}
