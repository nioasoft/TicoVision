/**
 * BudgetWithActualsCard Component
 * Display budget standard vs. actual payments with completion rate
 * Shows budget breakdown with clickable sections for client drill-down
 */

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpLeft, Banknote, ChevronLeft, Target } from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { formatILS } from '@/lib/payment-utils';
import { AmountDisplay } from '@/components/payments/AmountDisplay';
import { DashboardSectionShell } from './DashboardSectionShell';

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
      <DashboardSectionShell title="תמונת גבייה שנתית" description={`שנת מס ${year}`}>
        <div className="space-y-6">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        </div>
      </DashboardSectionShell>
    );
  }

  if (!data) {
    return (
      <DashboardSectionShell
        title="תמונת גבייה שנתית"
        description={`שנת מס ${year}`}
      >
        <p className="py-8 text-right text-sm text-slate-500">אין נתונים להצגה</p>
      </DashboardSectionShell>
    );
  }

  return (
    <DashboardSectionShell
      title="תמונת גבייה שנתית"
      description={`תקציב, גבייה בפועל ויתרה לשנת המס ${year}`}
      actions={
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
          {data.completionRate.toFixed(1)}% ביצוע
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-500">קצב עמידה בתקציב</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950 tabular-nums">
                {formatILS(data.actualPayments.beforeVat)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500">מתוך תקציב תקן</p>
              <p className="mt-1 text-lg font-medium text-slate-700 tabular-nums">
                {formatILS(data.budgetStandard.beforeVat)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={data.completionRate} className="h-2.5 flex-1" />
            <span className="min-w-14 text-left text-sm font-semibold text-slate-700 tabular-nums">
              {data.completionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            className="group rounded-2xl border border-slate-200 bg-white p-5 text-right transition-all hover:border-slate-300 hover:shadow-md"
            onClick={() => onClientListClick?.('standard')}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <ArrowUpLeft className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-slate-400 transition-transform group-hover:-translate-x-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-500">תקציב תקן</h3>
              <AmountDisplay
                beforeVat={data.budgetStandard.beforeVat}
                withVat={data.budgetStandard.withVat}
                size="lg"
                variant="stacked"
              />
              <p className="text-xs text-slate-500">סך התחזית השנתית לפני הנחות</p>
            </div>
          </button>

          <button
            type="button"
            className="group rounded-2xl border border-blue-200 bg-blue-50/50 p-5 text-right transition-all hover:border-blue-300 hover:shadow-md"
            onClick={() => onClientListClick?.('actuals')}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Banknote className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-blue-400 transition-transform group-hover:-translate-x-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-500">גבייה בפועל</h3>
              <AmountDisplay
                beforeVat={data.actualPayments.beforeVat}
                withVat={data.actualPayments.withVat}
                size="lg"
                variant="stacked"
              />
              <p className="text-xs text-slate-500">הסכום שנגבה בפועל עד כה</p>
            </div>
          </button>

          <button
            type="button"
            className="group rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-right transition-all hover:border-amber-300 hover:shadow-md"
            onClick={() => onClientListClick?.('remaining')}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Target className="h-5 w-5" />
              </span>
              <ChevronLeft className="h-4 w-4 text-amber-400 transition-transform group-hover:-translate-x-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-500">יתרה לגבייה</h3>
              <AmountDisplay
                beforeVat={data.remaining.beforeVat}
                withVat={data.remaining.withVat}
                size="lg"
                variant="stacked"
              />
              <p className="text-xs text-slate-500">
                {(100 - data.completionRate).toFixed(1)}% מהתקציב עדיין פתוח
              </p>
            </div>
          </button>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
          <div className="text-right">
            <div className="text-sm text-slate-500">תקציב חודשי ממוצע</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
              {formatILS(data.budgetStandard.beforeVat / 12)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">גבייה חודשית ממוצעת</div>
            <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
              {formatILS(data.actualPayments.beforeVat / 12)}
            </div>
          </div>
        </div>
      </div>
    </DashboardSectionShell>
  );
}
