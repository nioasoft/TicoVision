/**
 * DeviationBadge Component
 * Display payment deviation alerts with color-coded badges
 * Shows amount and percentage difference from expected payment
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  formatILS,
  formatPercentage,
  getAlertLevelColor,
  getAlertLevelIcon,
} from '@/lib/payment-utils';
import type { DeviationBadgeProps } from '@/types/payment.types';
import { cn } from '@/lib/utils';

export function DeviationBadge({
  deviationAmount,
  deviationPercent,
  alertLevel,
  showTooltip = true,
  className,
}: DeviationBadgeProps) {
  const colorClass = getAlertLevelColor(alertLevel);
  const icon = getAlertLevelIcon(alertLevel);

  // Determine if deviation is positive (overpayment) or negative (underpayment)
  const isOverpayment = deviationAmount > 0;
  const isUnderpayment = deviationAmount < 0;

  // Format amounts with sign
  const amountText = deviationAmount > 0
    ? `+${formatILS(Math.abs(deviationAmount))}`
    : `-${formatILS(Math.abs(deviationAmount))}`;

  const percentText = formatPercentage(deviationPercent);

  // Tooltip message
  const tooltipMessage = isOverpayment
    ? `הלקוח שילם יותר מהצפוי. סטייה של ${percentText}`
    : isUnderpayment
    ? `הלקוח שילם פחות מהצפוי. סטייה של ${percentText}`
    : 'התשלום תואם את הסכום הצפוי';

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        colorClass,
        'rtl:text-right ltr:text-left font-medium gap-1',
        className
      )}
    >
      <span>{icon}</span>
      <span>{amountText}</span>
      <span className="text-xs">({percentText})</span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="rtl:text-right ltr:text-left max-w-xs">
          <p className="text-sm">{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact deviation indicator - just icon and percentage
 */
export function DeviationIndicator({
  deviationPercent,
  alertLevel,
  className,
}: Pick<DeviationBadgeProps, 'deviationPercent' | 'alertLevel' | 'className'>) {
  const icon = getAlertLevelIcon(alertLevel);
  const colorClass = getAlertLevelColor(alertLevel);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
        colorClass,
        className
      )}
    >
      <span>{icon}</span>
      <span>{formatPercentage(deviationPercent)}</span>
    </div>
  );
}

/**
 * Deviation summary card - detailed breakdown
 */
interface DeviationSummaryProps {
  expectedAmount: number;
  actualAmount: number;
  deviationAmount: number;
  deviationPercent: number;
  alertLevel: DeviationBadgeProps['alertLevel'];
  className?: string;
}

export function DeviationSummary({
  expectedAmount,
  actualAmount,
  deviationAmount,
  deviationPercent,
  alertLevel,
  className,
}: DeviationSummaryProps) {
  const colorClass = getAlertLevelColor(alertLevel);
  const icon = getAlertLevelIcon(alertLevel);
  const isOverpayment = deviationAmount > 0;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 rtl:text-right ltr:text-left',
        colorClass,
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h4 className="font-semibold text-base">
          {isOverpayment ? 'תשלום עודף' : 'תשלום חסר'}
        </h4>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700">סכום צפוי:</span>
          <span className="font-medium">{formatILS(expectedAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700">סכום בפועל:</span>
          <span className="font-medium">{formatILS(actualAmount)}</span>
        </div>
        <div className="flex justify-between pt-2 border-t border-current/20">
          <span className="font-semibold">סטייה:</span>
          <div className="text-left">
            <div className="font-semibold">
              {deviationAmount > 0 ? '+' : ''}{formatILS(Math.abs(deviationAmount))}
            </div>
            <div className="text-xs">({formatPercentage(deviationPercent)})</div>
          </div>
        </div>
      </div>
    </div>
  );
}
