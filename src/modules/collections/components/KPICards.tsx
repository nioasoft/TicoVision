/**
 * KPI Cards Component
 * Displays 8 key collection metrics in a compact, clickable grid
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import type { CollectionKPIs } from '@/types/collection.types';
import { formatILSInteger, formatPercentage, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export type KPICardFilter = 'all' | 'pending' | 'paid' | 'alerts';

interface KPICardsProps {
  kpis: CollectionKPIs;
  loading?: boolean;
  selectedCard?: KPICardFilter;
  onCardClick?: (filter: KPICardFilter) => void;
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  borderColor: string;
  valueColor: string;
  isClickable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * Compact, clickable KPI Card component (matching FeeTrackingPage style)
 */
const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  borderColor,
  valueColor,
  isClickable = false,
  isSelected = false,
  onClick,
}) => {
  return (
    <Card
      className={cn(
        'transition-all border-2',
        borderColor,
        isClickable && 'cursor-pointer hover:shadow-md',
        isSelected && 'ring-2 ring-offset-1',
        isSelected && borderColor.replace('border-', 'ring-').replace('-200', '-500'),
        isSelected && borderColor.replace('border-', 'bg-').replace('-200', '-50')
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between rtl:flex-row-reverse">
          <span className="flex items-center gap-1">
            <Icon className={cn('h-3.5 w-3.5', iconColor)} />
            {title}
          </span>
          <span className={cn('text-lg font-bold', valueColor)}>
            {value}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <p className="text-[10px] text-gray-500 rtl:text-right ltr:text-left">{subtitle}</p>
      </CardContent>
    </Card>
  );
};

/**
 * KPI Cards Grid Component - Compact & Clickable
 */
export const KPICards: React.FC<KPICardsProps> = ({
  kpis,
  loading = false,
  selectedCard = 'all',
  onCardClick,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-2">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-1">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalAlerts =
    kpis.alerts_unopened +
    kpis.alerts_no_selection +
    kpis.alerts_abandoned +
    kpis.alerts_disputes;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-2">
      {/* All / Total */}
      <KPICard
        title="הכל"
        value={formatNumber(kpis.clients_sent)}
        subtitle="מכתבים שנשלחו"
        icon={FileText}
        iconColor="text-blue-600"
        borderColor="border-blue-200"
        valueColor="text-blue-700"
        isClickable={!!onCardClick}
        isSelected={selectedCard === 'all'}
        onClick={() => onCardClick?.('all')}
      />

      {/* Total Expected */}
      <KPICard
        title="סה״כ חיובים"
        value={formatILSInteger(kpis.total_expected)}
        subtitle="ששלחנו"
        icon={DollarSign}
        iconColor="text-gray-600"
        borderColor="border-gray-200"
        valueColor="text-gray-900"
        isClickable={false}
      />

      {/* Total Received */}
      <KPICard
        title="סה״כ הכנסות"
        value={formatILSInteger(kpis.total_received)}
        subtitle={formatPercentage(kpis.collection_rate) + ' מהצפוי'}
        icon={DollarSign}
        iconColor="text-green-600"
        borderColor="border-green-200"
        valueColor="text-green-700"
        isClickable={false}
      />

      {/* Total Pending */}
      <KPICard
        title="ממתינים"
        value={formatILSInteger(kpis.total_pending)}
        subtitle="לתשלום"
        icon={Clock}
        iconColor="text-yellow-600"
        borderColor="border-yellow-200"
        valueColor="text-yellow-700"
        isClickable={!!onCardClick}
        isSelected={selectedCard === 'pending'}
        onClick={() => onCardClick?.('pending')}
      />

      {/* Collection Rate */}
      <KPICard
        title="אחוז גבייה"
        value={formatPercentage(kpis.collection_rate)}
        subtitle={kpis.collection_rate >= 80 ? 'מצוין' : 'דורש שיפור'}
        icon={TrendingUp}
        iconColor={kpis.collection_rate >= 80 ? 'text-green-600' : 'text-orange-600'}
        borderColor={kpis.collection_rate >= 80 ? 'border-green-200' : 'border-orange-200'}
        valueColor={kpis.collection_rate >= 80 ? 'text-green-700' : 'text-orange-700'}
        isClickable={false}
      />

      {/* Paid Clients */}
      <KPICard
        title="שולם"
        value={formatNumber(kpis.clients_paid)}
        subtitle={`מתוך ${kpis.clients_sent}`}
        icon={CheckCircle2}
        iconColor="text-green-600"
        borderColor="border-green-200"
        valueColor="text-green-700"
        isClickable={!!onCardClick}
        isSelected={selectedCard === 'paid'}
        onClick={() => onCardClick?.('paid')}
      />

      {/* Pending Clients */}
      <KPICard
        title="לא בחרו"
        value={formatNumber(kpis.clients_pending)}
        subtitle="ממתינים לבחירה"
        icon={Users}
        iconColor="text-orange-600"
        borderColor="border-orange-200"
        valueColor="text-orange-700"
        isClickable={false}
      />

      {/* Active Alerts */}
      <KPICard
        title="התראות"
        value={formatNumber(totalAlerts)}
        subtitle={totalAlerts > 0 ? 'פעילות' : 'אין התראות'}
        icon={AlertCircle}
        iconColor={totalAlerts > 10 ? 'text-red-600' : totalAlerts > 5 ? 'text-orange-600' : 'text-gray-600'}
        borderColor={totalAlerts > 10 ? 'border-red-200' : totalAlerts > 5 ? 'border-orange-200' : 'border-gray-200'}
        valueColor={totalAlerts > 10 ? 'text-red-700' : totalAlerts > 5 ? 'text-orange-700' : 'text-gray-900'}
        isClickable={!!onCardClick}
        isSelected={selectedCard === 'alerts'}
        onClick={() => onCardClick?.('alerts')}
      />
    </div>
  );
};

KPICards.displayName = 'KPICards';
