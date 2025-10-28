/**
 * KPI Cards Component
 * Displays 8 key collection metrics in a responsive grid
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Users, FileText, AlertCircle } from 'lucide-react';
import type { CollectionKPIs } from '@/types/collection.types';
import { formatILSInteger, formatPercentage, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  kpis: CollectionKPIs;
  loading?: boolean;
}

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

/**
 * Single KPI Card component
 */
const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend = 'neutral',
  trendValue,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50/50',
    warning: 'border-yellow-200 bg-yellow-50/50',
    danger: 'border-red-200 bg-red-50/50',
  };

  const iconColorStyles = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 rtl:space-x-reverse">
        <CardTitle className="text-sm font-medium text-muted-foreground rtl:text-right ltr:text-left">
          {title}
        </CardTitle>
        <div className={cn('h-8 w-8', iconColorStyles[variant])}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold rtl:text-right ltr:text-left">{value}</div>
        {trendValue && (
          <div className="flex items-center gap-1 mt-1 text-xs rtl:flex-row-reverse">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
            <span
              className={cn(
                'rtl:text-right ltr:text-left',
                trend === 'up' && 'text-green-600',
                trend === 'down' && 'text-red-600',
                trend === 'neutral' && 'text-gray-600'
              )}
            >
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * KPI Cards Grid Component
 */
export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading = false }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate collection rate variant
  const collectionRateVariant =
    kpis.collection_rate >= 90
      ? 'success'
      : kpis.collection_rate >= 70
      ? 'warning'
      : 'danger';

  // Calculate alert variant
  const totalAlerts =
    kpis.alerts_unopened +
    kpis.alerts_no_selection +
    kpis.alerts_abandoned +
    kpis.alerts_disputes;
  const alertVariant = totalAlerts > 10 ? 'danger' : totalAlerts > 5 ? 'warning' : 'default';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Expected */}
      <KPICard
        title="סה״כ חיובים ששלחנו"
        value={formatILSInteger(kpis.total_expected)}
        icon={<DollarSign className="h-full w-full" />}
        variant="default"
      />

      {/* Total Received */}
      <KPICard
        title="סה״כ הכנסות"
        value={formatILSInteger(kpis.total_received)}
        icon={<DollarSign className="h-full w-full" />}
        variant="success"
        trend="up"
        trendValue={formatPercentage(kpis.collection_rate)}
      />

      {/* Total Pending */}
      <KPICard
        title="סה״כ ממתין לתשלום"
        value={formatILSInteger(kpis.total_pending)}
        icon={<DollarSign className="h-full w-full" />}
        variant={kpis.total_pending > kpis.total_expected * 0.3 ? 'warning' : 'default'}
      />

      {/* Collection Rate */}
      <KPICard
        title="אחוז גבייה"
        value={formatPercentage(kpis.collection_rate)}
        icon={<TrendingUp className="h-full w-full" />}
        variant={collectionRateVariant}
        trend={kpis.collection_rate >= 80 ? 'up' : 'down'}
      />

      {/* Letters Sent */}
      <KPICard
        title="מכתבים שנשלחו"
        value={formatNumber(kpis.clients_sent)}
        icon={<FileText className="h-full w-full" />}
        variant="default"
      />

      {/* Paid Clients */}
      <KPICard
        title="שילמו במלואן"
        value={formatNumber(kpis.clients_paid)}
        icon={<Users className="h-full w-full" />}
        variant="success"
        trendValue={`${kpis.clients_paid} מתוך ${kpis.clients_sent}`}
      />

      {/* Pending Clients */}
      <KPICard
        title="ממתינים לבחירה"
        value={formatNumber(kpis.clients_pending)}
        icon={<Users className="h-full w-full" />}
        variant={kpis.clients_pending > kpis.clients_sent * 0.3 ? 'warning' : 'default'}
      />

      {/* Active Alerts */}
      <KPICard
        title="התראות פעילות"
        value={formatNumber(totalAlerts)}
        icon={<AlertCircle className="h-full w-full" />}
        variant={alertVariant}
        trendValue={
          totalAlerts > 0
            ? `${kpis.alerts_unopened} לא נפתחו, ${kpis.alerts_no_selection} לא בחרו`
            : 'אין התראות'
        }
      />
    </div>
  );
};

KPICards.displayName = 'KPICards';
