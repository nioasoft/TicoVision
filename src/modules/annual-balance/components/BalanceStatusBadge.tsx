/**
 * BalanceStatusBadge - Reusable color badge for balance sheet status
 * Shows Hebrew status label with colored dot indicator
 */

import { cn } from '@/lib/utils';
import { BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';
import type { BalanceStatus } from '../types/annual-balance.types';

interface BalanceStatusBadgeProps {
  status: BalanceStatus;
  className?: string;
}

/** Dot color mapping per status */
const DOT_COLORS: Record<BalanceStatus, string> = {
  waiting_for_materials: 'bg-gray-500',
  materials_received: 'bg-blue-500',
  assigned_to_auditor: 'bg-purple-500',
  in_progress: 'bg-orange-500',
  work_completed: 'bg-yellow-500',
  office_approved: 'bg-cyan-500',
  report_transmitted: 'bg-green-500',
  advances_updated: 'bg-emerald-500',
};

export function BalanceStatusBadge({ status, className }: BalanceStatusBadgeProps) {
  const config = BALANCE_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        config.bgColor,
        config.color,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', DOT_COLORS[status])} />
      {config.label}
    </span>
  );
}
