/**
 * InstallmentStatusBadge Component
 * Display payment installment status with appropriate colors and icons
 * Shows status with optional due date information
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  getInstallmentStatusColor,
  getInstallmentStatusIcon,
  getInstallmentStatusLabel,
  formatIsraeliDate,
  daysBetween,
  isOverdue,
} from '@/lib/payment-utils';
import type { InstallmentStatusBadgeProps, InstallmentStatus } from '@/types/payment.types';
import { cn } from '@/lib/utils';

export function InstallmentStatusBadge({
  status,
  dueDate,
  className,
}: InstallmentStatusBadgeProps) {
  const colorClass = getInstallmentStatusColor(status);
  const icon = getInstallmentStatusIcon(status);
  const label = getInstallmentStatusLabel(status);

  // Calculate overdue days if applicable
  let overdueInfo = '';
  if (status === 'overdue' && dueDate) {
    const days = daysBetween(dueDate);
    overdueInfo = `באיחור של ${days} ימים`;
  }

  // Calculate days until due for pending
  let dueInfo = '';
  if (status === 'pending' && dueDate) {
    if (isOverdue(dueDate)) {
      const days = daysBetween(dueDate);
      dueInfo = `איחור ${days} ימים`;
    } else {
      const days = daysBetween(new Date(), dueDate);
      dueInfo = days === 0 ? 'מגיע היום' : `עוד ${days} ימים`;
    }
  }

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
      <span>{label}</span>
      {dueDate && status === 'pending' && (
        <span className="text-xs mr-1">({dueInfo})</span>
      )}
    </Badge>
  );

  // Show tooltip with date info if available
  if (dueDate) {
    const tooltipText = status === 'overdue'
      ? `תאריך: ${formatIsraeliDate(dueDate)} • ${overdueInfo}`
      : status === 'pending'
      ? `תאריך תשלום: ${formatIsraeliDate(dueDate)} • ${dueInfo}`
      : `שולם בתאריך ${formatIsraeliDate(dueDate)}`;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="rtl:text-right ltr:text-left">
            <p className="text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
}

/**
 * Installment status with urgency indicator
 */
interface InstallmentStatusWithUrgencyProps extends InstallmentStatusBadgeProps {
  showUrgency?: boolean;
}

export function InstallmentStatusWithUrgency({
  status,
  dueDate,
  showUrgency = true,
  className,
}: InstallmentStatusWithUrgencyProps) {
  // Calculate urgency level
  let urgencyIndicator: React.ReactNode = null;

  if (showUrgency && status === 'pending' && dueDate) {
    const daysUntilDue = daysBetween(new Date(), dueDate);

    if (isOverdue(dueDate)) {
      // Already overdue
      urgencyIndicator = (
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      );
    } else if (daysUntilDue <= 3) {
      // Due in 3 days or less
      urgencyIndicator = (
        <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
      );
    } else if (daysUntilDue <= 7) {
      // Due in a week
      urgencyIndicator = (
        <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" />
      );
    }
  }

  return (
    <div className="flex items-center gap-2">
      <InstallmentStatusBadge
        status={status}
        dueDate={dueDate}
        className={className}
      />
      {urgencyIndicator}
    </div>
  );
}

/**
 * Installment list item with full details
 */
interface InstallmentListItemProps {
  installmentNumber: number;
  status: InstallmentStatus;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  className?: string;
}

export function InstallmentListItem({
  installmentNumber,
  status,
  amount,
  dueDate,
  paidDate,
  className,
}: InstallmentListItemProps) {
  const formatCurrency = (amt: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.ceil(amt));
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border bg-white rtl:text-right ltr:text-left',
        status === 'overdue' && 'border-red-200 bg-red-50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="font-semibold text-gray-700">תשלום #{installmentNumber}</div>
        <InstallmentStatusWithUrgency status={status} dueDate={dueDate} />
      </div>

      <div className="flex items-center gap-4">
        <div className="text-left">
          <div className="text-sm text-gray-600">
            {status === 'paid' && paidDate
              ? `שולם: ${formatIsraeliDate(paidDate)}`
              : `מועד: ${formatIsraeliDate(dueDate)}`}
          </div>
        </div>
        <div className="font-semibold text-lg">{formatCurrency(amount)}</div>
      </div>
    </div>
  );
}

/**
 * Installment progress summary
 */
interface InstallmentProgressProps {
  totalInstallments: number;
  paidInstallments: number;
  overdueInstallments: number;
  className?: string;
}

export function InstallmentProgress({
  totalInstallments,
  paidInstallments,
  overdueInstallments,
  className,
}: InstallmentProgressProps) {
  const pendingInstallments = totalInstallments - paidInstallments - overdueInstallments;
  const progressPercent = (paidInstallments / totalInstallments) * 100;

  return (
    <div className={cn('space-y-2 rtl:text-right ltr:text-left', className)}>
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-gray-600">{paidInstallments} שולמו</span>
          </div>
          {pendingInstallments > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span className="text-gray-600">{pendingInstallments} ממתינים</span>
            </div>
          )}
          {overdueInstallments > 0 && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-gray-600">{overdueInstallments} באיחור</span>
            </div>
          )}
        </div>
        <div className="font-medium">
          {paidInstallments}/{totalInstallments} תשלומים
        </div>
      </div>
    </div>
  );
}
