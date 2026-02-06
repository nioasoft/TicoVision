/**
 * BalanceStatusBadge - Reusable color badge for balance sheet status
 * Shows Hebrew status label with color from BALANCE_STATUS_CONFIG
 */

import { cn } from '@/lib/utils';
import { BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';
import type { BalanceStatus } from '../types/annual-balance.types';

interface BalanceStatusBadgeProps {
  status: BalanceStatus;
  className?: string;
}

export function BalanceStatusBadge({ status, className }: BalanceStatusBadgeProps) {
  const config = BALANCE_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}
