import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ReceiptText,
  UserRound,
} from 'lucide-react';
import { formatILS, formatNumber } from '@/lib/formatters';
import type { BudgetByCategory } from '@/types/dashboard.types';
import { DashboardSectionShell } from '@/components/dashboard/DashboardSectionShell';
import { cn } from '@/lib/utils';

interface Props {
  breakdown: BudgetByCategory;
  taxYear: number;
}

type CategoryKey = 'audit' | 'bookkeeping' | 'billing' | 'freelancers';

interface DetailItem {
  label: string;
  count: number;
  beforeVat: number;
  actualBeforeVat: number;
  withVat: number;
}

interface CategoryConfig {
  key: CategoryKey;
  title: string;
  subtitle: string;
  countLabel: string;
  totalWithVat: number;
  totalBeforeVat: number;
  totalActualBeforeVat: number;
  tone: {
    border: string;
    bg: string;
    iconWrap: string;
    icon: string;
    text: string;
  };
  icon: React.ElementType;
  details: DetailItem[];
}

export function BudgetBreakdownSection({ breakdown, taxYear }: Props) {
  const [expandedColumn, setExpandedColumn] = useState<CategoryKey | null>(null);
  const [showStandard, setShowStandard] = useState(false);

  const toggleExpand = (column: CategoryKey) => {
    setExpandedColumn(expandedColumn === column ? null : column);
  };

  const auditActualBeforeVat =
    breakdown.audit_external.actual_before_vat +
    breakdown.audit_internal.actual_before_vat +
    breakdown.audit_retainer.actual_before_vat;

  const bookkeepingActualBeforeVat =
    breakdown.bookkeeping_internal.actual_before_vat +
    breakdown.bookkeeping_retainer.actual_before_vat;

  const billingLettersActualBeforeVat = breakdown.billing_letters?.actual_before_vat || 0;

  const grandTotalActualBeforeVat =
    auditActualBeforeVat +
    bookkeepingActualBeforeVat +
    breakdown.freelancers.actual_before_vat +
    billingLettersActualBeforeVat +
    breakdown.exceptions.actual_before_vat;

  const auditBeforeVat =
    breakdown.audit_external.before_vat +
    breakdown.audit_internal.before_vat +
    breakdown.audit_retainer.before_vat;

  const bookkeepingBeforeVat =
    breakdown.bookkeeping_internal.before_vat +
    breakdown.bookkeeping_retainer.before_vat;

  const billingLettersBeforeVat = breakdown.billing_letters?.before_vat || 0;

  const grandTotalBeforeVat =
    auditBeforeVat +
    bookkeepingBeforeVat +
    breakdown.freelancers.before_vat +
    billingLettersBeforeVat +
    breakdown.exceptions.before_vat;

  const totalTrackedEntities =
    breakdown.audit_external.client_count +
    breakdown.audit_internal.client_count +
    breakdown.audit_retainer.client_count +
    breakdown.bookkeeping_internal.client_count +
    breakdown.bookkeeping_retainer.client_count +
    (breakdown.billing_letters?.client_count || 0) +
    breakdown.freelancers.client_count;

  const categories: CategoryConfig[] = [
    {
      key: 'audit',
      title: 'ראיית חשבון',
      subtitle: 'חיצוניים, פנימיים וריטיינר',
      countLabel: `${formatNumber(
        breakdown.audit_external.client_count +
          breakdown.audit_internal.client_count +
          breakdown.audit_retainer.client_count
      )} לקוחות`,
      totalWithVat: breakdown.audit_total,
      totalBeforeVat: auditBeforeVat,
      totalActualBeforeVat: auditActualBeforeVat,
      icon: BarChart3,
      tone: {
        border: 'border-blue-200',
        bg: 'bg-blue-50/60',
        iconWrap: 'bg-blue-100',
        icon: 'text-blue-700',
        text: 'text-blue-700',
      },
      details: [
        {
          label: 'לקוחות חיצוניים',
          count: breakdown.audit_external.client_count,
          beforeVat: breakdown.audit_external.before_vat,
          actualBeforeVat: breakdown.audit_external.actual_before_vat,
          withVat: breakdown.audit_external.with_vat,
        },
        {
          label: 'לקוחות פנימיים',
          count: breakdown.audit_internal.client_count,
          beforeVat: breakdown.audit_internal.before_vat,
          actualBeforeVat: breakdown.audit_internal.actual_before_vat,
          withVat: breakdown.audit_internal.with_vat,
        },
        {
          label: 'ריטיינר (1/3)',
          count: breakdown.audit_retainer.client_count,
          beforeVat: breakdown.audit_retainer.before_vat,
          actualBeforeVat: breakdown.audit_retainer.actual_before_vat,
          withVat: breakdown.audit_retainer.with_vat,
        },
      ],
    },
    {
      key: 'bookkeeping',
      title: 'הנהלת חשבונות',
      subtitle: 'פנימיים וריטיינר',
      countLabel: `${formatNumber(
        breakdown.bookkeeping_internal.client_count +
          breakdown.bookkeeping_retainer.client_count
      )} לקוחות`,
      totalWithVat: breakdown.bookkeeping_total,
      totalBeforeVat: bookkeepingBeforeVat,
      totalActualBeforeVat: bookkeepingActualBeforeVat,
      icon: BriefcaseBusiness,
      tone: {
        border: 'border-violet-200',
        bg: 'bg-violet-50/60',
        iconWrap: 'bg-violet-100',
        icon: 'text-violet-700',
        text: 'text-violet-700',
      },
      details: [
        {
          label: 'לקוחות פנימיים',
          count: breakdown.bookkeeping_internal.client_count,
          beforeVat: breakdown.bookkeeping_internal.before_vat,
          actualBeforeVat: breakdown.bookkeeping_internal.actual_before_vat,
          withVat: breakdown.bookkeeping_internal.with_vat,
        },
        {
          label: 'ריטיינר (2/3)',
          count: breakdown.bookkeeping_retainer.client_count,
          beforeVat: breakdown.bookkeeping_retainer.before_vat,
          actualBeforeVat: breakdown.bookkeeping_retainer.actual_before_vat,
          withVat: breakdown.bookkeeping_retainer.with_vat,
        },
      ],
    },
    {
      key: 'billing',
      title: 'הכנסה חריגה',
      subtitle: 'מכתבי חיוב כלליים',
      countLabel: `${formatNumber(breakdown.billing_letters?.client_count || 0)} מכתבי חיוב`,
      totalWithVat: breakdown.billing_letters?.with_vat || 0,
      totalBeforeVat: billingLettersBeforeVat,
      totalActualBeforeVat: billingLettersActualBeforeVat,
      icon: ReceiptText,
      tone: {
        border: 'border-amber-200',
        bg: 'bg-amber-50/60',
        iconWrap: 'bg-amber-100',
        icon: 'text-amber-700',
        text: 'text-amber-700',
      },
      details: [
        {
          label: 'מכתבי חיוב כלליים',
          count: breakdown.billing_letters?.client_count || 0,
          beforeVat: billingLettersBeforeVat,
          actualBeforeVat: billingLettersActualBeforeVat,
          withVat: breakdown.billing_letters?.with_vat || 0,
        },
      ],
    },
    {
      key: 'freelancers',
      title: 'עצמאים',
      subtitle: 'כולל ראיית חשבון והנהלת חשבונות',
      countLabel: `${formatNumber(breakdown.freelancers.client_count)} לקוחות`,
      totalWithVat: breakdown.freelancers.with_vat,
      totalBeforeVat: breakdown.freelancers.before_vat,
      totalActualBeforeVat: breakdown.freelancers.actual_before_vat,
      icon: UserRound,
      tone: {
        border: 'border-emerald-200',
        bg: 'bg-emerald-50/60',
        iconWrap: 'bg-emerald-100',
        icon: 'text-emerald-700',
        text: 'text-emerald-700',
      },
      details: [
        {
          label: 'הכנסות עצמאים',
          count: breakdown.freelancers.client_count,
          beforeVat: breakdown.freelancers.before_vat,
          actualBeforeVat: breakdown.freelancers.actual_before_vat,
          withVat: breakdown.freelancers.with_vat,
        },
      ],
    },
  ];

  return (
    <DashboardSectionShell
      title={`פירוט תקציב לשנת ${taxYear}`}
      description="חלוקה לפי סוגי שירותים, מודל חיוב וסוג לקוח"
      actions={
        <button
          type="button"
          onClick={() => setShowStandard((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {showStandard ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showStandard ? 'תצוגת תקן' : 'תצוגת בפועל'}
        </button>
      }
      contentClassName="space-y-6"
    >
      <Card className="rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm" dir="rtl">
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                סך תקציב מוצג
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
                {formatILS(showStandard ? grandTotalBeforeVat : grandTotalActualBeforeVat)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                כולל מע"מ
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                {formatILS(breakdown.grand_total)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                יחידות פעילות
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                {formatNumber(totalTrackedEntities)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                מצב תצוגה
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {showStandard ? 'תקן' : 'בפועל'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const isExpanded = expandedColumn === category.key;
          const primaryAmount = showStandard
            ? category.totalBeforeVat
            : category.totalActualBeforeVat;
          const secondaryAmount = showStandard
            ? category.totalActualBeforeVat
            : category.totalBeforeVat;
          const shareOfTotal = (primaryAmount / Math.max(showStandard ? grandTotalBeforeVat : grandTotalActualBeforeVat, 1)) * 100;

          return (
            <Card
              key={category.key}
              className={cn(
                'rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md',
                category.tone.border
              )}
              dir="rtl"
            >
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="space-y-1 text-right">
                    <h3 className="text-[15px] font-semibold text-slate-900">{category.title}</h3>
                    <p className="text-xs text-slate-500">{category.subtitle}</p>
                  </div>
                  <div
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-xl',
                      category.tone.iconWrap
                    )}
                  >
                    <Icon className={cn('h-4 w-4', category.tone.icon)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {showStandard ? 'תקן לפני מע"מ' : 'בפועל לפני מע"מ'}
                  </div>
                  <div className={cn('text-[28px] font-semibold tabular-nums leading-none', category.tone.text)}>
                    {formatILS(primaryAmount)}
                  </div>
                  <div className="text-sm text-slate-500">
                    {showStandard ? 'בפועל' : 'תקן'}:{' '}
                    <span className="font-medium text-slate-700 tabular-nums">
                      {formatILS(secondaryAmount)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    כולל מע"מ: <span className="tabular-nums">{formatILS(category.totalWithVat)}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{category.countLabel}</span>
                    <span className="tabular-nums">{shareOfTotal.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn('h-full rounded-full', category.tone.iconWrap)}
                      style={{ width: `${Math.min(shareOfTotal, 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(category.key)}
                  className="mt-4 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <span>{isExpanded ? 'הסתר פירוט' : 'הצג פירוט'}</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                    {category.details.map((detail) => (
                      <div key={detail.label} className={cn('rounded-xl border p-3', category.tone.bg, category.tone.border)}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-800">{detail.label}</span>
                          <span className={cn('font-semibold tabular-nums text-sm', category.tone.text)}>
                            {formatILS(showStandard ? detail.beforeVat : detail.actualBeforeVat)}
                          </span>
                        </div>
                        <div className="grid gap-1 text-xs text-slate-500">
                          <div className="flex items-center justify-between">
                            <span>כמות</span>
                            <span className="tabular-nums">{formatNumber(detail.count)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>כולל מע"מ</span>
                            <span className="tabular-nums">{formatILS(detail.withVat)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardSectionShell>
  );
}
