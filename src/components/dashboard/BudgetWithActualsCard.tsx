/**
 * BudgetWithActualsCard Component
 * Display budget standard vs. actual payments with completion rate
 * Shows budget breakdown with clickable sections for client drill-down
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft } from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { formatILS } from '@/lib/payment-utils';
import { AmountDisplay } from '@/components/payments/AmountDisplay';

interface BudgetWithActualsCardProps {
  year: number;
  onClientListClick?: (type: 'standard' | 'actuals' | 'remaining') => void;
}

interface BudgetWithActuals {
  budgetStandard: { beforeVat: number; withVat: number };
  actualPayments: { beforeVat: number; withVat: number };
  remaining: { beforeVat: number; withVat: number };
  completionRate: number;
}

export function BudgetWithActualsCard({ year, onClientListClick }: BudgetWithActualsCardProps) {
  const [data, setData] = useState<BudgetWithActuals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    const { data: budgetData } = await dashboardService.getBudgetWithActuals(year);
    if (budgetData) {
      setData(budgetData);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-6" dir="rtl">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="space-y-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6" dir="rtl">
        <h2 className="text-2xl font-bold mb-6 text-right">
          תקציב שנתי {year}
        </h2>
        <p className="text-gray-500 text-right">אין נתונים להצגה</p>
      </Card>
    );
  }

  return (
    <Card className="p-6" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-right">
        תקציב שנתי {year}
      </h2>

      <div className="space-y-6">
        {/* Budget Standard */}
        <div
          className="group cursor-pointer hover:bg-muted/50 p-4 rounded-lg transition-colors"
          onClick={() => onClientListClick?.('standard')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground text-right">
              📈 תקציב תקן
            </h3>
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <AmountDisplay
            beforeVat={data.budgetStandard.beforeVat}
            withVat={data.budgetStandard.withVat}
            size="lg"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            סך כל החישובים השנתיים
          </p>
        </div>

        {/* Actual Payments */}
        <div
          className="group cursor-pointer hover:bg-muted/50 p-4 rounded-lg transition-colors"
          onClick={() => onClientListClick?.('actuals')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground text-right">
              💰 גביה בפועל
            </h3>
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <AmountDisplay
            beforeVat={data.actualPayments.beforeVat}
            withVat={data.actualPayments.withVat}
            size="lg"
          />
          <div className="flex items-center gap-2 mt-2">
            <Progress value={data.completionRate} className="flex-1" />
            <span className="text-sm font-medium">{data.completionRate.toFixed(1)}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">
            מהתקציב התקן
          </p>
        </div>

        {/* Remaining */}
        <div
          className="group cursor-pointer hover:bg-muted/50 p-4 rounded-lg transition-colors"
          onClick={() => onClientListClick?.('remaining')}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground text-right">
              🎯 יתרה לגביה
            </h3>
            <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <AmountDisplay
            beforeVat={data.remaining.beforeVat}
            withVat={data.remaining.withVat}
            size="lg"
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {(100 - data.completionRate).toFixed(1)}% מהתקציב
          </p>
        </div>

        {/* Visual separator with stats */}
        <Separator />

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-right">
            <div className="text-muted-foreground">תקציב חודשי ממוצע</div>
            <div className="font-medium">
              {formatILS(data.budgetStandard.beforeVat / 12)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground">גביה חודשית ממוצעת</div>
            <div className="font-medium">
              {formatILS(data.actualPayments.beforeVat / 12)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
