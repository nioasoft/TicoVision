/**
 * Eligibility Check Page — בדיקת זכאות
 * Route: /shaagat-haari/eligibility/:clientId (new) | /shaagat-haari/eligibility (pick client)
 *
 * 3-step flow:
 *   Step 1 — Classify: track type, reporting type, business type
 *   Step 2 — Revenue data: base + comparison revenues + deductions, dynamic period labels
 *   Step 3 — Result: calculated eligibility, compensation rate, next action
 *
 * No email is sent here — client already knows from feasibility form (step 0).
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, CheckCircle2, XCircle, AlertCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyInput } from '@/components/ui/money-input';
import { Combobox } from '@/components/ui/combobox';
import { supabase } from '@/lib/supabase';
import { getCurrentTenantId } from '@/lib/supabase';
import { formatILSInteger, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { calculateEligibility } from '../lib/grant-calculations';
import { GRANT_CONSTANTS } from '../lib/grant-constants';
import { useShaagatStore } from '../store/shaagatStore';
import type { TrackType, BusinessType, ReportingType, EligibilityStatus } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClientOption {
  id: string;
  company_name: string;
  tax_id: string;
}

interface Step1Data {
  trackType: TrackType;
  reportingType: ReportingType;
  businessType: BusinessType;
}

interface Step2Data {
  annualRevenue: number | '';
  annualRevenue2022: number | '';
  revenueBase: number | '';
  revenueComparison: number | '';
  capitalRevenuesBase: number | '';
  capitalRevenuesComparison: number | '';
  selfAccountingRevenuesBase: number | '';
  selfAccountingRevenuesComparison: number | '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Period label helpers — derive dynamic period strings from track + reporting type
// ─────────────────────────────────────────────────────────────────────────────

interface PeriodLabels {
  baseLabel: string;
  comparisonLabel: string;
  inputsLabel: string;
  salaryLabel: string;
}

function getPeriodLabels(track: TrackType, reporting: ReportingType): PeriodLabels {
  const m = reporting === 'monthly';

  switch (track) {
    case 'standard':
      return {
        baseLabel: m ? '03/2025' : '3-4/2025',
        comparisonLabel: m ? '03/2026' : '3-4/2026',
        inputsLabel: 'ממוצע שנתי 2025',
        salaryLabel: '03/2026',
      };
    case 'small':
      return {
        baseLabel: 'מחזור 2022',
        comparisonLabel: m ? '03/2026' : '3-4/2026',
        inputsLabel: '—',
        salaryLabel: '03/2026',
      };
    case 'cash_basis':
      return {
        baseLabel: m ? '04/2025' : '3-4/2025',
        comparisonLabel: m ? '04/2026' : '3-4/2026',
        inputsLabel: 'ממוצע שנתי 2025',
        salaryLabel: '03/2026',
      };
    case 'new_business':
      return {
        baseLabel: 'ממוצע 03/2025–02/2026',
        comparisonLabel: m ? '03/2026' : '3-4/2026',
        inputsLabel: 'ממוצע 03/2025–02/2026',
        salaryLabel: '03/2026',
      };
    case 'northern':
      return {
        baseLabel: m ? '03/2023' : '3-4/2023',
        comparisonLabel: m ? '03/2026' : '3-4/2026',
        inputsLabel: 'ממוצע 09/2022–08/2023',
        salaryLabel: '03/2026',
      };
    case 'contractor':
      return {
        baseLabel: 'ממוצע 07/2025–02/2026',
        comparisonLabel: m ? '04/2026' : '3-4/2026',
        inputsLabel: 'ממוצע שנתי 2025',
        salaryLabel: '04/2026',
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  current: number;
  total: number;
  labels: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ current, total, labels }) => (
  <div className="flex items-center justify-center gap-0" dir="rtl">
    {labels.map((label, i) => {
      const step = i + 1;
      const done = step < current;
      const active = step === current;
      return (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                done && 'bg-green-500 text-white',
                active && 'bg-blue-600 text-white ring-2 ring-blue-200',
                !done && !active && 'bg-gray-200 text-gray-500',
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : step}
            </div>
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                active ? 'text-blue-700 font-medium' : 'text-gray-500',
              )}
            >
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                'h-0.5 flex-1 min-w-[40px] mx-1 mb-5 transition-colors',
                done ? 'bg-green-400' : 'bg-gray-200',
              )}
            />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Classification
// ─────────────────────────────────────────────────────────────────────────────

interface Step1Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
}

const TRACK_OPTIONS: { value: TrackType; label: string; description: string; color: string }[] = [
  { value: 'standard',    label: 'מסלול רגיל',   description: 'מחזור 03/2025 מול 03/2026',          color: 'border-blue-200 bg-blue-50'    },
  { value: 'new_business', label: 'עסק חדש',      description: 'נפתח מ-01/01/2025 — ממוצע תקופתי', color: 'border-amber-200 bg-amber-50'  },
  { value: 'northern',    label: 'צפון (אדום)',   description: 'מחזור 03/2023 מול 03/2026',          color: 'border-red-200 bg-red-50'      },
  { value: 'contractor',  label: 'קבלנים',        description: 'ממוצע 07/2025-02/2026, מכפיל ×0.68', color: 'border-orange-200 bg-orange-50'},
  { value: 'cash_basis',  label: 'בסיס מזומן',    description: 'מחזור 04/2025 מול 04/2026',          color: 'border-cyan-200 bg-cyan-50'    },
  { value: 'small',       label: 'מסלול קטנים',   description: 'מחזור שנתי 2022 עד 300,000 ₪',       color: 'border-purple-200 bg-purple-50'},
];

const Step1Classification: React.FC<Step1Props> = ({ data, onChange, onNext }) => {
  const canProceed = Boolean(data.trackType);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Track type */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900">מסלול חישוב</h3>
          <p className="text-sm text-gray-500 mt-0.5">בחר את המסלול המתאים לפי סוג העסק ותקופת ההשוואה</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TRACK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, trackType: opt.value })}
              className={cn(
                'rounded-lg border-2 p-3 text-right transition-all hover:shadow-sm',
                data.trackType === opt.value
                  ? `${opt.color} border-current`
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <div className="font-medium text-sm text-gray-900">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Reporting type */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">תדירות דיווח למע"מ</h3>
        <RadioGroup
          value={data.reportingType}
          onValueChange={(v) => onChange({ ...data, reportingType: v as ReportingType })}
          className="flex gap-4"
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="monthly" id="monthly" />
            <Label htmlFor="monthly" className="cursor-pointer">חד חודשי</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="bimonthly" id="bimonthly" />
            <Label htmlFor="bimonthly" className="cursor-pointer">דו חודשי</Label>
          </div>
        </RadioGroup>
        {data.reportingType === 'bimonthly' && (
          <Alert className="border-blue-200 bg-blue-50 py-2">
            <AlertDescription className="text-xs text-blue-700">
              דיווח דו-חודשי: הסף המינימלי הוא 12.5% ירידה. אחוז הירידה מוכפל ×2 (עד 100%) לחישוב מענק שכר בלבד.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      {/* Business type */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">סוג עסק</h3>
        <RadioGroup
          value={data.businessType}
          onValueChange={(v) => onChange({ ...data, businessType: v as BusinessType })}
          className="flex gap-4"
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="regular" id="regular" />
            <Label htmlFor="regular" className="cursor-pointer">עסק רגיל (מכפיל 1.25)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="ngo" id="ngo" />
            <Label htmlFor="ngo" className="cursor-pointer">עמותה / מלכ"ר (מכפיל 1.325)</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-start pt-2">
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          המשך לנתוני מחזור
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Revenue data
// ─────────────────────────────────────────────────────────────────────────────

interface Step2Props {
  data: Step2Data;
  step1: Step1Data;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}

interface RevenueFieldProps {
  label: string;
  periodLabel: string;
  value: number | '';
  onChange: (v: number | '') => void;
  hint?: string;
  required?: boolean;
}

const RevenueField: React.FC<RevenueFieldProps> = ({ label, periodLabel, value, onChange, hint, required }) => (
  <div className="space-y-1">
    <div className="flex items-baseline justify-between">
      <Label className="text-sm font-medium text-gray-800">
        {label}
        {required && <span className="text-red-500 ms-0.5">*</span>}
      </Label>
      <span className="text-xs text-gray-400 font-mono">{periodLabel}</span>
    </div>
    <MoneyInput value={value} onChange={onChange} min={0} />
    {hint && <p className="text-xs text-gray-400">{hint}</p>}
  </div>
);

const Step2RevenueData: React.FC<Step2Props> = ({ data, step1, onChange, onNext, onBack }) => {
  const periods = getPeriodLabels(step1.trackType, step1.reportingType);
  const isSmall = step1.trackType === 'small';

  const canProceed =
    typeof data.annualRevenue === 'number' && data.annualRevenue > 0 &&
    typeof data.revenueBase === 'number' && data.revenueBase > 0 &&
    (isSmall || (typeof data.revenueComparison === 'number' && data.revenueComparison >= 0));

  return (
    <div className="space-y-6" dir="rtl">
      {/* Period summary banner */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm" dir="rtl">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <span className="text-gray-500">תקופת בסיס:</span>
          <span className="font-medium text-gray-800">{periods.baseLabel}</span>
          {!isSmall && (
            <>
              <span className="text-gray-500">תקופת השוואה:</span>
              <span className="font-medium text-gray-800">{periods.comparisonLabel}</span>
            </>
          )}
          <span className="text-gray-500">תשומות — ממוצע:</span>
          <span className="font-medium text-gray-800">{periods.inputsLabel}</span>
          <span className="text-gray-500">חודש שכר:</span>
          <span className="font-medium text-gray-800">{periods.salaryLabel}</span>
        </div>
      </div>

      {/* Annual revenue */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">מחזור שנתי</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RevenueField
            label="מחזור שנתי (לפי הצהרה)"
            periodLabel="12,000 – 400,000,000 ₪"
            value={data.annualRevenue}
            onChange={(v) => onChange({ ...data, annualRevenue: v })}
            hint="שימש לבדיקת סף הזכאות ותקרת המענק"
            required
          />
          {(isSmall || (typeof data.annualRevenue === 'number' && data.annualRevenue <= 300_000)) && (
            <RevenueField
              label="מחזור שנתי 2022"
              periodLabel="לטבלת מסלול קטנים"
              value={data.annualRevenue2022}
              onChange={(v) => onChange({ ...data, annualRevenue2022: v })}
              hint="נדרש אם המחזור עד 300,000 ₪ בשנת 2022"
            />
          )}
        </div>
      </div>

      <Separator />

      {/* Revenue periods */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">מחזורי עסקאות</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RevenueField
            label="מחזור תקופת בסיס"
            periodLabel={periods.baseLabel}
            value={data.revenueBase}
            onChange={(v) => onChange({ ...data, revenueBase: v })}
            required
          />
          {!isSmall && (
            <RevenueField
              label="מחזור תקופת השוואה"
              periodLabel={periods.comparisonLabel}
              value={data.revenueComparison}
              onChange={(v) => onChange({ ...data, revenueComparison: v })}
              required
            />
          )}
        </div>
      </div>

      <Separator />

      {/* Revenue deductions (collapsible-style — show only if any are filled) */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">הפחתות מהמחזור</h3>
          <p className="text-xs text-gray-500 mt-0.5">הכנסות הון ועסקאות עצמיות — מנוכות מהמחזור הנקי</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <RevenueField
            label="הכנסות הון — תקופת בסיס"
            periodLabel={periods.baseLabel}
            value={data.capitalRevenuesBase}
            onChange={(v) => onChange({ ...data, capitalRevenuesBase: v })}
          />
          {!isSmall && (
            <RevenueField
              label="הכנסות הון — תקופת השוואה"
              periodLabel={periods.comparisonLabel}
              value={data.capitalRevenuesComparison}
              onChange={(v) => onChange({ ...data, capitalRevenuesComparison: v })}
            />
          )}
          <RevenueField
            label='הכנסות עצמיות — תקופת בסיס'
            periodLabel={periods.baseLabel}
            value={data.selfAccountingRevenuesBase}
            onChange={(v) => onChange({ ...data, selfAccountingRevenuesBase: v })}
          />
          {!isSmall && (
            <RevenueField
              label='הכנסות עצמיות — תקופת השוואה'
              periodLabel={periods.comparisonLabel}
              value={data.selfAccountingRevenuesComparison}
              onChange={(v) => onChange({ ...data, selfAccountingRevenuesComparison: v })}
            />
          )}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowRight className="h-4 w-4" />
          חזרה
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          חשב זכאות
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Result
// ─────────────────────────────────────────────────────────────────────────────

interface EligibilityResultData {
  netRevenueBase: number;
  netRevenueComparison: number;
  declinePercentage: number;
  eligibilityStatus: EligibilityStatus;
  compensationRate: number;
}

interface Step3Props {
  result: EligibilityResultData;
  step1: Step1Data;
  step2: Step2Data;
  clientName: string;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onBack: () => void;
  onGoToCalculation: (eligibilityCheckId: string) => void;
  savedEligibilityId: string | null;
}

const COMPENSATION_TIER_LABELS: Record<number, string> = {
  0: '—',
  7: '7% (ירידה 25-40%)',
  11: '11% (ירידה 40-60%)',
  15: '15% (ירידה 60-80%)',
  22: '22% (ירידה 80-100%)',
};

const Step3Result: React.FC<Step3Props> = ({
  result,
  step1,
  step2,
  clientName,
  saving,
  saved,
  onSave,
  onBack,
  onGoToCalculation,
  savedEligibilityId,
}) => {
  const statusConfig = {
    ELIGIBLE: {
      icon: CheckCircle2,
      label: 'זכאי למענק',
      color: 'text-green-700',
      bg: 'bg-green-50 border-green-200',
      badgeClass: 'bg-green-100 text-green-700',
    },
    NOT_ELIGIBLE: {
      icon: XCircle,
      label: 'לא זכאי למענק',
      color: 'text-red-700',
      bg: 'bg-red-50 border-red-200',
      badgeClass: 'bg-red-100 text-red-700',
    },
    GRAY_AREA: {
      icon: AlertCircle,
      label: 'תחום אפור',
      color: 'text-yellow-700',
      bg: 'bg-yellow-50 border-yellow-200',
      badgeClass: 'bg-yellow-100 text-yellow-700',
    },
  }[result.eligibilityStatus];

  const Icon = statusConfig.icon;

  const thresholds = step1.reportingType === 'monthly'
    ? GRANT_CONSTANTS.MONTHLY_THRESHOLDS
    : GRANT_CONSTANTS.BIMONTHLY_THRESHOLDS;
  const grayAreaMin = thresholds.MIN_THRESHOLD - GRANT_CONSTANTS.GRAY_ZONE_BUFFER_PERCENT;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Status banner */}
      <div className={cn('rounded-xl border p-5 flex items-start gap-4', statusConfig.bg)}>
        <Icon className={cn('h-8 w-8 flex-shrink-0 mt-0.5', statusConfig.color)} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn('text-xl font-bold', statusConfig.color)}>{statusConfig.label}</h3>
            <Badge className={cn('text-xs', statusConfig.badgeClass)}>
              {clientName}
            </Badge>
          </div>

          {result.eligibilityStatus === 'ELIGIBLE' && (
            <p className={cn('text-sm mt-1', statusConfig.color)}>
              מקדם פיצוי: <span className="font-bold">{result.compensationRate}%</span>
              &nbsp;—&nbsp;{COMPENSATION_TIER_LABELS[result.compensationRate]}
            </p>
          )}
          {result.eligibilityStatus === 'GRAY_AREA' && (
            <p className="text-sm text-yellow-600 mt-1">
              ירידה של {formatPercentage(result.declinePercentage)} — בתחום האפור ({formatPercentage(grayAreaMin)} עד {formatPercentage(thresholds.MIN_THRESHOLD)})
            </p>
          )}
          {result.eligibilityStatus === 'NOT_ELIGIBLE' && (
            <p className="text-sm text-red-600 mt-1">
              ירידה של {formatPercentage(result.declinePercentage)} — מתחת לסף המינימלי ({formatPercentage(thresholds.MIN_THRESHOLD)})
            </p>
          )}
        </div>
      </div>

      {/* Calculation breakdown */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base text-gray-800">פירוט חישוב</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pb-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="text-gray-500">מחזור נקי — בסיס</span>
            <span className="font-mono font-medium text-gray-800 text-left ltr">
              {formatILSInteger(result.netRevenueBase)}
            </span>

            <span className="text-gray-500">מחזור נקי — השוואה</span>
            <span className="font-mono font-medium text-gray-800 text-left ltr">
              {formatILSInteger(result.netRevenueComparison)}
            </span>

            <span className="text-gray-500">ירידה מחושבת</span>
            <span className={cn(
              'font-bold text-left ltr',
              result.declinePercentage >= thresholds.MIN_THRESHOLD ? 'text-green-700' : 'text-red-600',
            )}>
              {formatPercentage(result.declinePercentage)}
            </span>

            {result.eligibilityStatus === 'ELIGIBLE' && (
              <>
                <span className="text-gray-500">מקדם פיצוי</span>
                <span className="font-bold text-blue-700 text-left ltr">{result.compensationRate}%</span>
              </>
            )}

            <span className="text-gray-500">מסלול</span>
            <span className="font-medium text-gray-700">
              {step1.trackType === 'standard' ? 'רגיל' :
               step1.trackType === 'northern' ? 'צפון' :
               step1.trackType === 'new_business' ? 'עסק חדש' :
               step1.trackType === 'contractor' ? 'קבלנים' :
               step1.trackType === 'cash_basis' ? 'מזומן' : 'קטנים'}
              {' '}({step1.reportingType === 'monthly' ? 'חד-חודשי' : 'דו-חודשי'})
            </span>
          </div>

          {/* Bimonthly note */}
          {step1.reportingType === 'bimonthly' && result.eligibilityStatus === 'ELIGIBLE' && (
            <Alert className="border-blue-200 bg-blue-50 py-2 mt-3">
              <AlertDescription className="text-xs text-blue-700">
                ירידה אפקטיבית לחישוב שכר: ×2 = {formatPercentage(Math.min(result.declinePercentage * 2, 100))}
              </AlertDescription>
            </Alert>
          )}

          {/* Annual revenue out-of-range warning */}
          {typeof step2.annualRevenue === 'number' && (
            step2.annualRevenue < GRANT_CONSTANTS.ANNUAL_REVENUE.MIN ||
            step2.annualRevenue > GRANT_CONSTANTS.ANNUAL_REVENUE.MAX
          ) && (
            <Alert variant="destructive" className="py-2 mt-3">
              <AlertDescription className="text-xs">
                מחזור שנתי מחוץ לטווח המותר (12,000 ₪ – 400,000,000 ₪)
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="gap-2" disabled={saved}>
            <ArrowRight className="h-4 w-4" />
            ערוך נתונים
          </Button>
          {!saved && (
            <Button
              onClick={onSave}
              disabled={saving}
              className="gap-2"
            >
              {saving ? 'שומר...' : 'שמור בדיקת זכאות'}
            </Button>
          )}
        </div>

        {saved && savedEligibilityId && result.eligibilityStatus === 'ELIGIBLE' && (
          <Button
            onClick={() => onGoToCalculation(savedEligibilityId)}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            המשך לחישוב מענק
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1 self-center">
            <CheckCircle2 className="h-4 w-4" />
            נשמר בהצלחה
          </span>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const STEP_LABELS = ['סיווג עסק', 'נתוני מחזור', 'תוצאת זכאות'];

const EMPTY_STEP1: Step1Data = {
  trackType: 'standard',
  reportingType: 'monthly',
  businessType: 'regular',
};

const EMPTY_STEP2: Step2Data = {
  annualRevenue: '',
  annualRevenue2022: '',
  revenueBase: '',
  revenueComparison: '',
  capitalRevenuesBase: '',
  capitalRevenuesComparison: '',
  selfAccountingRevenuesBase: '',
  selfAccountingRevenuesComparison: '',
};

export const EligibilityCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const { clientId: urlClientId } = useParams<{ clientId?: string }>();

  const { createEligibilityCheck } = useShaagatStore();

  // Client selection (when no clientId in URL)
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(urlClientId ?? '');
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [step1, setStep1] = useState<Step1Data>(EMPTY_STEP1);
  const [step2, setStep2] = useState<Step2Data>(EMPTY_STEP2);
  const [result, setResult] = useState<EligibilityResultData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedEligibilityId, setSavedEligibilityId] = useState<string | null>(null);

  // Load clients for combobox
  useEffect(() => {
    if (urlClientId) return; // client from URL — no need to load list
    setClientsLoading(true);

    const loadClients = async () => {
      try {
        const tenantId = await getCurrentTenantId();
        if (!tenantId) return;

        // Only clients explicitly flagged as 1214-regular are eligible for
        // Shaagat HaAri. 'zero' = no qualifying revenue; NULL = not yet
        // classified, equally unsafe for a revenue-based grant module.
        const { data } = await supabase
          .from('clients')
          .select('id, company_name, tax_id')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .eq('tax_coding_status', 'regular')
          .order('company_name', { ascending: true })
          .limit(500);

        setClientOptions((data ?? []) as ClientOption[]);
      } finally {
        setClientsLoading(false);
      }
    };

    void loadClients();
  }, [urlClientId]);

  // When selectedClientId changes, update selectedClient object
  useEffect(() => {
    if (!selectedClientId) return;
    if (urlClientId) {
      // If URL-based, find from loaded list or fetch directly
      if (clientOptions.length > 0) {
        const found = clientOptions.find((c) => c.id === selectedClientId);
        if (found) setSelectedClient(found);
      } else {
        const fetchClient = async () => {
          const { data } = await supabase
            .from('clients')
            .select('id, company_name, tax_id')
            .eq('id', selectedClientId)
            .single();
          if (data) setSelectedClient(data as ClientOption);
        };
        void fetchClient();
      }
    } else {
      const found = clientOptions.find((c) => c.id === selectedClientId);
      if (found) setSelectedClient(found);
    }
  }, [selectedClientId, clientOptions, urlClientId]);

  const comboboxOptions = useMemo(
    () => clientOptions.map((c) => ({ value: c.id, label: `${c.company_name} — ${c.tax_id}` })),
    [clientOptions],
  );

  // Calculate eligibility from form data
  const runCalculation = useCallback((): EligibilityResultData => {
    const eligResult = calculateEligibility({
      revenueBase: typeof step2.revenueBase === 'number' ? step2.revenueBase : 0,
      revenueComparison: typeof step2.revenueComparison === 'number' ? step2.revenueComparison : 0,
      capitalRevenuesBase: typeof step2.capitalRevenuesBase === 'number' ? step2.capitalRevenuesBase : 0,
      capitalRevenuesComparison: typeof step2.capitalRevenuesComparison === 'number' ? step2.capitalRevenuesComparison : 0,
      selfAccountingRevenuesBase: typeof step2.selfAccountingRevenuesBase === 'number' ? step2.selfAccountingRevenuesBase : 0,
      selfAccountingRevenuesComparison: typeof step2.selfAccountingRevenuesComparison === 'number' ? step2.selfAccountingRevenuesComparison : 0,
      reportingType: step1.reportingType,
      annualRevenue: typeof step2.annualRevenue === 'number' ? step2.annualRevenue : 0,
    });

    return {
      netRevenueBase: eligResult.netRevenueBase,
      netRevenueComparison: eligResult.netRevenueComparison,
      declinePercentage: eligResult.declinePercentage,
      eligibilityStatus: eligResult.eligibilityStatus,
      compensationRate: eligResult.compensationRate,
    };
  }, [step1, step2]);

  const handleStep1Next = useCallback(() => {
    setCurrentStep(2);
    setResult(null);
    setSaved(false);
  }, []);

  const handleStep2Next = useCallback(() => {
    const calc = runCalculation();
    setResult(calc);
    setCurrentStep(3);
  }, [runCalculation]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    setSaved(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!result || !selectedClientId) return;
    setSaving(true);

    try {
      const periods = getPeriodLabels(step1.trackType, step1.reportingType);

      const savedCheck = await createEligibilityCheck({
        client_id: selectedClientId,
        track_type: step1.trackType,
        business_type: step1.businessType,
        reporting_type: step1.reportingType,
        annual_revenue: typeof step2.annualRevenue === 'number' ? step2.annualRevenue : 0,
        annual_revenue_2022: typeof step2.annualRevenue2022 === 'number' ? step2.annualRevenue2022 : undefined,
        revenue_base_period: typeof step2.revenueBase === 'number' ? step2.revenueBase : 0,
        revenue_comparison_period: typeof step2.revenueComparison === 'number' ? step2.revenueComparison : 0,
        revenue_base_period_label: periods.baseLabel,
        revenue_comparison_period_label: periods.comparisonLabel,
        capital_revenues_base: typeof step2.capitalRevenuesBase === 'number' ? step2.capitalRevenuesBase : 0,
        capital_revenues_comparison: typeof step2.capitalRevenuesComparison === 'number' ? step2.capitalRevenuesComparison : 0,
        self_accounting_revenues_base: typeof step2.selfAccountingRevenuesBase === 'number' ? step2.selfAccountingRevenuesBase : 0,
        self_accounting_revenues_comparison: typeof step2.selfAccountingRevenuesComparison === 'number' ? step2.selfAccountingRevenuesComparison : 0,
        // Computed fields
        net_revenue_base: result.netRevenueBase,
        net_revenue_comparison: result.netRevenueComparison,
        decline_percentage: result.declinePercentage,
        eligibility_status: result.eligibilityStatus,
        compensation_rate: result.compensationRate,
      });

      if (!savedCheck) {
        toast.error('שגיאה בשמירת בדיקת הזכאות');
        return;
      }

      setSavedEligibilityId(savedCheck.id);
      setSaved(true);
      toast.success('בדיקת זכאות נשמרה בהצלחה');
    } catch {
      toast.error('שגיאה בשמירת בדיקת הזכאות');
    } finally {
      setSaving(false);
    }
  }, [result, selectedClientId, step1, step2, createEligibilityCheck]);

  const handleGoToCalculation = useCallback(
    (eligibilityCheckId: string) => {
      navigate(`/shaagat-haari/calculation/${eligibilityCheckId}`);
    },
    [navigate],
  );

  // ─── Render ───

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/shaagat-haari')}
            className="gap-1.5 text-gray-500 hover:text-gray-800 -ms-2"
          >
            <ChevronLeft className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">בדיקת זכאות למענק</h1>
          <p className="text-sm text-gray-500 mt-0.5">בדיקת אחוז ירידה ומקדם פיצוי — מענקי שאגת הארי</p>
        </div>

        {/* Client selector (only when no URL clientId) */}
        {!urlClientId && (
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                <Label className="font-medium text-gray-800">
                  בחר לקוח <span className="text-red-500">*</span>
                </Label>
                {clientsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Combobox
                    options={comboboxOptions}
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    emptyText="לא נמצא לקוח"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show client name when selected via URL */}
        {selectedClient && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">לקוח:</span>
            <span className="font-semibold text-gray-900">{selectedClient.company_name}</span>
            <span className="text-gray-400 font-mono">{selectedClient.tax_id}</span>
          </div>
        )}

        {/* Step indicator */}
        {selectedClientId && (
          <StepIndicator current={currentStep} total={3} labels={STEP_LABELS} />
        )}

        {/* Steps */}
        {selectedClientId && (
          <Card className="border-gray-200">
            <CardHeader className="pb-2 pt-5 border-b border-gray-100">
              <CardTitle className="text-base text-gray-800">
                {STEP_LABELS[currentStep - 1]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-5">
              {currentStep === 1 && (
                <Step1Classification
                  data={step1}
                  onChange={setStep1}
                  onNext={handleStep1Next}
                />
              )}

              {currentStep === 2 && (
                <Step2RevenueData
                  data={step2}
                  step1={step1}
                  onChange={setStep2}
                  onNext={handleStep2Next}
                  onBack={handleBack}
                />
              )}

              {currentStep === 3 && result && (
                <Step3Result
                  result={result}
                  step1={step1}
                  step2={step2}
                  clientName={selectedClient?.company_name ?? ''}
                  saving={saving}
                  saved={saved}
                  onSave={handleSave}
                  onBack={handleBack}
                  onGoToCalculation={handleGoToCalculation}
                  savedEligibilityId={savedEligibilityId}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EligibilityCheckPage;
