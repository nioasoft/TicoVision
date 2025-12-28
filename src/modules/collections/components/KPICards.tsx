/**
 * KPI Cards Component
 * Displays collection metrics and filter cards in two rows
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  Coins,
  Users,
  FileText,
  CheckCircle2,
  Clock,
  MailX,
  MousePointerClick,
  ShoppingCart,
  MessageSquareWarning
} from 'lucide-react';
import type { CollectionKPIs } from '@/types/collection.types';
import { formatILSInteger, formatPercentage, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export type KPICardFilter =
  | 'all'
  | 'pending'
  | 'paid'
  | 'not_selected'
  | 'alert_unopened'
  | 'alert_no_selection'
  | 'alert_abandoned'
  | 'alert_disputes';

interface KPICardsProps {
  kpis: CollectionKPIs;
  loading?: boolean;
  selectedCard?: KPICardFilter;
  onCardClick?: (filter: KPICardFilter) => void;
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
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple';
  isSelected: boolean;
  onClick: () => void;
}> = ({ title, count, icon: Icon, color, isSelected, onClick }) => {
  const colorClasses = {
    blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', ring: 'ring-blue-500' },
    green: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', ring: 'ring-green-500' },
    yellow: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-600', ring: 'ring-yellow-500' },
    orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-600', ring: 'ring-orange-500' },
    red: { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', ring: 'ring-red-500' },
    purple: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-600', ring: 'ring-purple-500' },
  };

  const c = colorClasses[color];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all border-2 hover:shadow-md',
        c.border,
        isSelected && `ring-2 ring-offset-1 ${c.ring} ${c.bg}`
      )}
      onClick={onClick}
    >
      <CardContent className="py-2 px-3 flex items-center gap-2" dir="rtl">
        <span className={cn('text-xl font-bold', c.text)}>{formatNumber(count)}</span>
        <span className="text-sm font-medium text-gray-700 flex-1">{title}</span>
        <Icon className={cn('h-5 w-5 flex-shrink-0', c.icon)} />
      </CardContent>
    </Card>
  );
};

/**
 * KPI Cards Component
 */
export const KPICards: React.FC<KPICardsProps> = ({
  kpis,
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[...Array(8)].map((_, i) => (
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

  return (
    <div className="space-y-3">
      {/* Row 1: Summary Stats */}
      <Card className="border-gray-200">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-6" dir="rtl">
            <SummaryStat
              label="נשלחו"
              value={formatNumber(kpis.clients_sent)}
              icon={FileText}
              iconColor="text-blue-600"
            />
            <SummaryStat
              label="סה״כ חיובים"
              value={formatILSInteger(kpis.total_expected)}
              icon={Coins}
              iconColor="text-gray-600"
            />
            <SummaryStat
              label="התקבל"
              value={formatILSInteger(kpis.total_received)}
              icon={Coins}
              iconColor="text-green-600"
              valueColor="text-green-700"
            />
            <SummaryStat
              label="ממתין"
              value={formatILSInteger(kpis.total_pending)}
              icon={Clock}
              iconColor="text-yellow-600"
              valueColor="text-yellow-700"
            />
            <SummaryStat
              label="אחוז גבייה"
              value={formatPercentage(kpis.collection_rate)}
              icon={TrendingUp}
              iconColor={kpis.collection_rate >= 80 ? 'text-green-600' : 'text-orange-600'}
              valueColor={kpis.collection_rate >= 80 ? 'text-green-700' : 'text-orange-700'}
            />
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2" dir="rtl">
        <FilterCard
          title="הכל"
          count={kpis.clients_sent}
          icon={FileText}
          color="blue"
          isSelected={selectedCard === 'all'}
          onClick={() => onCardClick?.('all')}
        />
        <FilterCard
          title="שולם"
          count={kpis.clients_paid}
          icon={CheckCircle2}
          color="green"
          isSelected={selectedCard === 'paid'}
          onClick={() => onCardClick?.('paid')}
        />
        <FilterCard
          title="ממתין"
          count={kpis.clients_pending}
          icon={Clock}
          color="yellow"
          isSelected={selectedCard === 'pending'}
          onClick={() => onCardClick?.('pending')}
        />
        <FilterCard
          title="לא בחרו"
          count={kpis.clients_not_selected}
          icon={Users}
          color="orange"
          isSelected={selectedCard === 'not_selected'}
          onClick={() => onCardClick?.('not_selected')}
        />
        <FilterCard
          title="לא נפתח 7+"
          count={kpis.alerts_unopened}
          icon={MailX}
          color="red"
          isSelected={selectedCard === 'alert_unopened'}
          onClick={() => onCardClick?.('alert_unopened')}
        />
        <FilterCard
          title="לא בחר 14+"
          count={kpis.alerts_no_selection}
          icon={MousePointerClick}
          color="orange"
          isSelected={selectedCard === 'alert_no_selection'}
          onClick={() => onCardClick?.('alert_no_selection')}
        />
        <FilterCard
          title="עגלה נטושה"
          count={kpis.alerts_abandoned}
          icon={ShoppingCart}
          color="purple"
          isSelected={selectedCard === 'alert_abandoned'}
          onClick={() => onCardClick?.('alert_abandoned')}
        />
        <FilterCard
          title="מחלוקות"
          count={kpis.alerts_disputes}
          icon={MessageSquareWarning}
          color="red"
          isSelected={selectedCard === 'alert_disputes'}
          onClick={() => onCardClick?.('alert_disputes')}
        />
      </div>
    </div>
  );
};

KPICards.displayName = 'KPICards';
