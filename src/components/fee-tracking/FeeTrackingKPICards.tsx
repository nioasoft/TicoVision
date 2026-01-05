/**
 * Fee Tracking KPI Cards Component
 * Displays fee tracking metrics in two rows: summary stats + clickable filter cards
 * Design pattern matches Collection Dashboard for consistency
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  XCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  UserCheck,
  TrendingUp,
  FileText,
  Coins,
} from 'lucide-react';
import type { FeeTrackingKPIs, TrackingFilter } from '@/types/fee-tracking.types';
import { formatILS, formatNumber, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface FeeTrackingKPICardsProps {
  kpis: FeeTrackingKPIs;
  membersCount: number;
  totalAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  loading?: boolean;
  selectedCard?: TrackingFilter;
  onCardClick?: (filter: TrackingFilter) => void;
}

/**
 * Summary stat - compact inline display
 */
const SummaryStat: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
}> = ({ label, value, icon: Icon, iconColor, valueColor = 'text-gray-900' }) => (
  <div className="flex items-center gap-2" dir="rtl">
    <Icon className={cn('h-5 w-5', iconColor)} />
    <span className="text-sm text-gray-500">{label}:</span>
    <span className={cn('text-base font-bold', valueColor)}>{value}</span>
  </div>
);

/**
 * Filter card - clickable filter button
 */
const FilterCard: React.FC<{
  title: string;
  count: number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';
  isSelected: boolean;
  onClick: () => void;
  isClickable?: boolean;
}> = ({ title, count, subtitle, icon: Icon, color, isSelected, onClick, isClickable = true }) => {
  const colorClasses = {
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', ring: 'ring-blue-500' },
    green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', ring: 'ring-green-500' },
    yellow: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600', ring: 'ring-yellow-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600', ring: 'ring-orange-500' },
    red: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', ring: 'ring-red-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600', ring: 'ring-purple-500' },
    gray: { border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-700', icon: 'text-gray-600', ring: 'ring-gray-500' },
  };

  const c = colorClasses[color];

  return (
    <Card
      className={cn(
        'transition-all border-2',
        c.border,
        isClickable && 'cursor-pointer hover:shadow-md',
        isSelected && `ring-2 ring-offset-1 ${c.ring} ${c.bg}`
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="py-2 px-3 flex items-center gap-2" dir="rtl">
        <span className={cn('text-xl font-bold', c.text)}>{formatNumber(count)}</span>
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-700">{title}</span>
          {subtitle && (
            <p className="text-[10px] text-gray-500">{subtitle}</p>
          )}
        </div>
        <Icon className={cn('h-5 w-5 flex-shrink-0', c.icon)} />
      </CardContent>
    </Card>
  );
};

/**
 * Fee Tracking KPI Cards Component
 */
export const FeeTrackingKPICards: React.FC<FeeTrackingKPICardsProps> = ({
  kpis,
  membersCount,
  totalAmount = 0,
  paidAmount = 0,
  pendingAmount = 0,
  loading = false,
  selectedCard = 'all',
  onCardClick,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        <Card className="animate-pulse">
          <CardContent className="py-3 px-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="py-2 px-3">
                <div className="h-6 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate clients with letters sent (pending + partial_paid + paid)
  const clientsSent = kpis.sent_not_paid + kpis.paid;

  return (
    <div className="space-y-3">
      {/* Row 1: Summary Stats */}
      <Card className="border-gray-200">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-6" dir="rtl">
            <SummaryStat
              label="סה״כ לקוחות"
              value={formatNumber(kpis.total_clients)}
              icon={Users}
              iconColor="text-blue-600"
            />
            <SummaryStat
              label="נשלחו מכתבים"
              value={formatNumber(clientsSent)}
              icon={FileText}
              iconColor="text-gray-600"
            />
            {totalAmount > 0 && (
              <SummaryStat
                label="סה״כ חיובים"
                value={formatILS(totalAmount)}
                icon={Coins}
                iconColor="text-gray-600"
              />
            )}
            {paidAmount > 0 && (
              <SummaryStat
                label="התקבל"
                value={formatILS(paidAmount)}
                icon={Coins}
                iconColor="text-green-600"
                valueColor="text-green-700"
              />
            )}
            {pendingAmount > 0 && (
              <SummaryStat
                label="ממתין"
                value={formatILS(pendingAmount)}
                icon={Clock}
                iconColor="text-yellow-600"
                valueColor="text-yellow-700"
              />
            )}
            <SummaryStat
              label="אחוז השלמה"
              value={formatPercentage(kpis.completion_percentage)}
              icon={TrendingUp}
              iconColor={kpis.completion_percentage >= 50 ? 'text-green-600' : 'text-orange-600'}
              valueColor={kpis.completion_percentage >= 50 ? 'text-green-700' : 'text-orange-700'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2" dir="rtl">
        <FilterCard
          title="הכל"
          count={kpis.total_clients}
          subtitle="כל הלקוחות"
          icon={Users}
          color="blue"
          isSelected={selectedCard === 'all'}
          onClick={() => onCardClick?.('all')}
        />
        <FilterCard
          title="לא חושב"
          count={kpis.not_calculated}
          subtitle="ללא חישוב"
          icon={XCircle}
          color="red"
          isSelected={selectedCard === 'not_calculated'}
          onClick={() => onCardClick?.('not_calculated')}
        />
        <FilterCard
          title="חושב, לא נשלח"
          count={kpis.calculated_not_sent}
          subtitle="מוכנים לשליחה"
          icon={AlertTriangle}
          color="orange"
          isSelected={selectedCard === 'calculated_not_sent'}
          onClick={() => onCardClick?.('calculated_not_sent')}
        />
        <FilterCard
          title="ממתין לתשלום"
          count={kpis.sent_not_paid}
          subtitle="מכתב נשלח"
          icon={Clock}
          color="yellow"
          isSelected={selectedCard === 'sent_not_paid'}
          onClick={() => onCardClick?.('sent_not_paid')}
        />
        <FilterCard
          title="שולם חלקית"
          count={kpis.partial_paid || 0}
          subtitle="תשלום חלקי"
          icon={Coins}
          color="orange"
          isSelected={selectedCard === 'partial_paid'}
          onClick={() => onCardClick?.('partial_paid')}
        />
        <FilterCard
          title="שולם"
          count={kpis.paid}
          subtitle={`${formatPercentage(kpis.completion_percentage)} השלמה`}
          icon={CheckCircle2}
          color="green"
          isSelected={selectedCard === 'paid'}
          onClick={() => onCardClick?.('paid')}
        />
        <FilterCard
          title="לא משלם"
          count={membersCount}
          subtitle="משולם ע״י אחר"
          icon={UserCheck}
          color="purple"
          isSelected={selectedCard === 'members'}
          onClick={() => onCardClick?.('members')}
        />
      </div>
    </div>
  );
};

FeeTrackingKPICards.displayName = 'FeeTrackingKPICards';
