/**
 * FinancialSummaryStrip - 3 KPI cards: unified fee card + 2 balance year cards
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, BarChart3 } from 'lucide-react';
import { formatILS } from '@/lib/formatters';
import { BalanceStatusBadge } from '@/modules/annual-balance/components/BalanceStatusBadge';
import type { FeeCalculation } from '@/services';
import type { ActualPayment } from '@/types/payment.types';
import type { AnnualBalanceSheet } from '@/modules/annual-balance/types/annual-balance.types';

interface FinancialSummaryStripProps {
  feeCalculations: FeeCalculation[];
  actualPayments: ActualPayment[];
  balanceSheets: AnnualBalanceSheet[];
  clientType: string;
}

const FEE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'חושב - טיוטה', color: 'text-gray-500' },
  sent: { label: 'נשלח - ממתין לתשלום', color: 'text-primary' },
  paid: { label: 'שולם', color: 'text-primary' },
  partial_paid: { label: 'שולם חלקית', color: 'text-amber-600' },
  overdue: { label: 'באיחור', color: 'text-red-600' },
  cancelled: { label: 'בוטל', color: 'text-gray-400' },
};

export function FinancialSummaryStrip({
  feeCalculations,
  actualPayments,
  balanceSheets,
  clientType,
}: FinancialSummaryStripProps) {
  const latestFee = feeCalculations[0];
  const latestFeeAmount = latestFee?.calculated_with_vat ?? latestFee?.total_amount ?? 0;
  const feeStatus = latestFee?.status;

  const totalPaid = actualPayments
    .filter((p) => latestFee && p.fee_calculation_id === latestFee.id)
    .reduce((sum, p) => sum + (p.amount_paid || 0), 0);

  const balance = latestFee ? latestFeeAmount - totalPaid : 0;

  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1;
  const prevTaxYear = taxYear - 1;
  const currentBalance = balanceSheets.find((b) => b.year === taxYear);
  const prevBalance = balanceSheets.find((b) => b.year === prevTaxYear);
  const showBalance = clientType === 'company' || clientType === 'partnership';

  const statusConfig = feeStatus ? FEE_STATUS_CONFIG[feeStatus] : null;
  const statusLabel = statusConfig?.label || 'לא חושב';
  const statusColor = statusConfig?.color || 'text-gray-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Card 1: Unified Fee Card */}
      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">שכ&quot;ט שנתי</span>
            </div>
            {latestFee && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {latestFee.year}
              </Badge>
            )}
          </div>

          {/* Status line */}
          <div className={`text-xs font-medium mb-2 ${statusColor}`}>
            {statusLabel}
          </div>

          {/* Fee data rows */}
          <div className="space-y-1 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">סכום</span>
              <span className="text-sm font-medium tabular-nums" dir="ltr">
                {latestFee ? formatILS(latestFeeAmount) : 'לא חושב'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">שולם</span>
              <span
                className={`text-sm tabular-nums ${totalPaid > 0 ? 'text-primary font-medium' : ''}`}
                dir="ltr"
              >
                {latestFee ? formatILS(totalPaid) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">יתרה</span>
              <span
                className={`text-sm font-medium tabular-nums ${
                  !latestFee
                    ? ''
                    : balance > 0
                      ? 'text-red-600'
                      : balance === 0
                        ? 'text-primary'
                        : ''
                }`}
                dir="ltr"
              >
                {latestFee ? formatILS(balance) : '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Balance current tax year */}
      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {showBalance ? `מאזן ${taxYear}` : 'סטטוס מכתב'}
            </span>
          </div>
          {showBalance ? (
            currentBalance ? (
              <BalanceStatusBadge status={currentBalance.status} className="text-sm" />
            ) : (
              <span className="text-xs text-muted-foreground">לא קיים</span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">
              {feeStatus ? FEE_STATUS_CONFIG[feeStatus]?.label || feeStatus : 'לא חושב'}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Balance previous tax year */}
      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {showBalance ? `מאזן ${prevTaxYear}` : 'סטטוס קודם'}
            </span>
          </div>
          {showBalance ? (
            prevBalance ? (
              <BalanceStatusBadge status={prevBalance.status} className="text-sm" />
            ) : (
              <span className="text-xs text-muted-foreground">לא קיים</span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
