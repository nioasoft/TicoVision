/**
 * BalanceKPICards - Stacked progress bar + status count cards
 * Two-tier layout: pipeline bar on top, 7 clickable status cards below
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Clock,
  Package,
  UserCheck,
  Wrench,
  ClipboardCheck,
  Send,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';
import {
  BALANCE_STATUS_CONFIG,
  BALANCE_STATUSES,
  STATUS_BAR_COLORS,
} from '../types/annual-balance.types';
import type { BalanceStatus, BalanceDashboardStats } from '../types/annual-balance.types';

interface BalanceKPICardsProps {
  stats: BalanceDashboardStats | null;
  loading?: boolean;
  selectedStatus?: BalanceStatus;
  onStatusClick?: (status: BalanceStatus | undefined) => void;
}

const STATUS_ICONS: Record<BalanceStatus, React.ElementType> = {
  waiting_for_materials: Clock,
  materials_received: Package,
  assigned_to_auditor: UserCheck,
  in_progress: Wrench,
  work_completed: ClipboardCheck,
  office_approved: ClipboardCheck,
  report_transmitted: Send,
  advances_updated: Coins,
};

const STATUS_CARD_COLORS: Record<BalanceStatus, {
  border: string;
  iconBg: string;
  text: string;
  icon: string;
  ring: string;
  dot: string;
}> = {
  waiting_for_materials: { border: 'border-gray-200', iconBg: 'bg-gray-100', text: 'text-gray-700', icon: 'text-gray-600', ring: 'ring-gray-400', dot: 'bg-gray-500' },
  materials_received: { border: 'border-blue-200', iconBg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600', ring: 'ring-blue-400', dot: 'bg-blue-500' },
  assigned_to_auditor: { border: 'border-purple-200', iconBg: 'bg-purple-100', text: 'text-purple-700', icon: 'text-purple-600', ring: 'ring-purple-400', dot: 'bg-purple-500' },
  in_progress: { border: 'border-orange-200', iconBg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600', ring: 'ring-orange-400', dot: 'bg-orange-500' },
  work_completed: { border: 'border-yellow-200', iconBg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'text-yellow-600', ring: 'ring-yellow-400', dot: 'bg-yellow-500' },
  office_approved: { border: 'border-cyan-200', iconBg: 'bg-cyan-100', text: 'text-cyan-700', icon: 'text-cyan-600', ring: 'ring-cyan-400', dot: 'bg-cyan-500' },
  report_transmitted: { border: 'border-green-200', iconBg: 'bg-green-100', text: 'text-green-700', icon: 'text-green-600', ring: 'ring-green-400', dot: 'bg-green-500' },
  advances_updated: { border: 'border-emerald-200', iconBg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600', ring: 'ring-emerald-400', dot: 'bg-emerald-500' },
};

const VISIBLE_STATUSES = BALANCE_STATUSES.filter((s) => s !== 'office_approved');

export const BalanceKPICards: React.FC<BalanceKPICardsProps> = ({
  stats,
  loading = false,
  selectedStatus,
  onStatusClick,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" dir="rtl">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalCases = stats?.totalCases ?? 0;

  return (
    <div className="space-y-3">
      {/* Stacked progress bar */}
      {totalCases > 0 && (
        <Card className="border shadow-sm">
          <CardContent className="py-3 px-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/30" dir="rtl">
              {VISIBLE_STATUSES.map((status) => {
                const count = stats?.byStatus[status] ?? 0;
                if (count === 0) return null;
                const pct = (count / totalCases) * 100;
                const config = BALANCE_STATUS_CONFIG[status];
                return (
                  <Tooltip key={status}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'h-full transition-all hover:opacity-80',
                          STATUS_BAR_COLORS[status],
                          selectedStatus === status && 'ring-2 ring-offset-1 ring-foreground/30'
                        )}
                        style={{ width: `${pct}%` }}
                        onClick={() => onStatusClick?.(selectedStatus === status ? undefined : status)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {config.label}: {formatNumber(count)} ({Math.round(pct)}%)
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2" dir="rtl">
        {VISIBLE_STATUSES.map((status) => {
          const config = BALANCE_STATUS_CONFIG[status];
          const colors = STATUS_CARD_COLORS[status];
          const Icon = STATUS_ICONS[status];
          const count = stats?.byStatus[status] ?? 0;
          const isSelected = selectedStatus === status;

          return (
            <Card
              key={status}
              className={cn(
                'cursor-pointer transition-all duration-150 border hover:shadow-md hover:-translate-y-0.5 relative',
                colors.border,
                isSelected && `ring-2 ring-offset-1 ${colors.ring}`
              )}
              onClick={() => onStatusClick?.(isSelected ? undefined : status)}
            >
              {isSelected && (
                <span className={cn('absolute top-2 left-2 h-2 w-2 rounded-full', colors.dot)} />
              )}
              <CardContent className="py-3 px-3 flex flex-col items-center gap-1.5" dir="rtl">
                <div className={cn('rounded-lg p-1.5', colors.iconBg)}>
                  <Icon className={cn('h-4 w-4', colors.icon)} />
                </div>
                <span className={cn('text-xl font-bold tabular-nums', colors.text)}>
                  {formatNumber(count)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground text-center leading-tight">
                  {config.label}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
