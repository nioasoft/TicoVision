/**
 * BalanceKPICards - 8 status count cards in responsive grid
 * Each card is clickable to filter by that status
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock,
  Package,
  UserCheck,
  Wrench,
  ClipboardCheck,
  Building2,
  Send,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatters';
import { BALANCE_STATUS_CONFIG, BALANCE_STATUSES } from '../types/annual-balance.types';
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
  office_approved: Building2,
  report_transmitted: Send,
  advances_updated: Coins,
};

const STATUS_CARD_COLORS: Record<BalanceStatus, {
  border: string;
  bg: string;
  text: string;
  icon: string;
  ring: string;
}> = {
  waiting_for_materials: { border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-600', ring: 'ring-gray-500' },
  materials_received: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', ring: 'ring-blue-500' },
  assigned_to_auditor: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600', ring: 'ring-purple-500' },
  in_progress: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600', ring: 'ring-orange-500' },
  work_completed: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600', ring: 'ring-yellow-500' },
  office_approved: { border: 'border-cyan-200', bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600', ring: 'ring-cyan-500' },
  report_transmitted: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', ring: 'ring-green-500' },
  advances_updated: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600', ring: 'ring-emerald-500' },
};

export const BalanceKPICards: React.FC<BalanceKPICardsProps> = ({
  stats,
  loading = false,
  selectedStatus,
  onStatusClick,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1.5" dir="rtl">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-2 px-3">
                <div className="h-6 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalCases = stats?.totalCases ?? 0;
  const statusesWithoutOfficeApproved = BALANCE_STATUSES.filter((status) => status !== 'office_approved');

  return (
    <div className="space-y-3">
      {/* Status filter cards with total cases first */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-1.5" dir="rtl">
        {/* Total cases card - first */}
        <Card className="border-gray-200">
          <CardContent className="py-1.5 px-2 flex items-center gap-1.5" dir="rtl">
            <span className="text-base font-bold text-gray-900">{formatNumber(totalCases)}</span>
            <span className="text-xs font-medium text-gray-700 flex-1 truncate">סה״כ תיקים</span>
          </CardContent>
        </Card>

        {/* Status cards */}
        {statusesWithoutOfficeApproved.map((status) => {
          const config = BALANCE_STATUS_CONFIG[status];
          const colors = STATUS_CARD_COLORS[status];
          const Icon = STATUS_ICONS[status];
          const count = stats?.byStatus[status] ?? 0;
          const isSelected = selectedStatus === status;

          return (
            <Card
              key={status}
              className={cn(
                'cursor-pointer transition-all border hover:shadow-md',
                colors.border,
                isSelected && `ring-2 ring-offset-1 ${colors.ring} ${colors.bg}`
              )}
              onClick={() => onStatusClick?.(isSelected ? undefined : status)}
            >
              <CardContent className="py-1.5 px-2 flex items-center gap-1.5" dir="rtl">
                <span className={cn('text-base font-bold', colors.text)}>{formatNumber(count)}</span>
                <span className="text-xs font-medium text-gray-700 flex-1 truncate">{config.label}</span>
                <Icon className={cn('h-4 w-4 flex-shrink-0', colors.icon)} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
