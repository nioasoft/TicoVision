/**
 * GroupSummaryStrip - 3 KPI cards: latest fee, member count, payment status
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Users, CreditCard } from 'lucide-react';
import { formatILS } from '@/lib/formatters';
import type { Client } from '@/services';
import type { GroupFeeCalculationRow } from '../types/group-profile.types';

interface GroupSummaryStripProps {
  feeCalculations: GroupFeeCalculationRow[];
  members: Client[];
}

const FEE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'טיוטה', color: 'text-gray-500' },
  sent: { label: 'נשלח', color: 'text-blue-600' },
  paid: { label: 'שולם', color: 'text-green-600' },
  partial_paid: { label: 'שולם חלקית', color: 'text-amber-600' },
  overdue: { label: 'באיחור', color: 'text-red-600' },
  cancelled: { label: 'בוטל', color: 'text-gray-400' },
};

const PAYMENT_ROLE_LABELS: Record<string, string> = {
  independent: 'עצמאי',
  member: 'חבר קבוצה',
  primary_payer: 'משלם ראשי',
};

export function GroupSummaryStrip({ feeCalculations, members }: GroupSummaryStripProps) {
  const latestFee = feeCalculations[0];
  const totalAmount = latestFee?.total_final_amount_with_vat ?? 0;
  const amountPaid = latestFee?.amount_paid ?? 0;
  const balance = totalAmount - amountPaid;

  const statusConfig = latestFee ? FEE_STATUS_CONFIG[latestFee.status] : null;
  const statusLabel = statusConfig?.label || 'לא חושב';
  const statusColor = statusConfig?.color || 'text-gray-400';

  const activeMembers = members.filter((m) => m.status === 'active');
  const primaryPayer = members.find((m) => m.payment_role === 'primary_payer');

  // Count by payment_role
  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    const role = m.payment_role || 'independent';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Card 1: Latest Group Fee */}
      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">שכ&quot;ט קבוצתי</span>
            </div>
            {latestFee && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                {latestFee.year}
              </Badge>
            )}
          </div>
          <div className={`text-xs font-medium mb-2 ${statusColor}`}>
            {statusLabel}
          </div>
          <div className="space-y-1 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">סכום כולל מע&quot;מ</span>
              <span className="text-sm font-medium tabular-nums" dir="ltr">
                {latestFee ? formatILS(totalAmount) : 'לא חושב'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">שולם</span>
              <span
                className={`text-sm tabular-nums ${amountPaid > 0 ? 'text-green-700 font-medium' : ''}`}
                dir="ltr"
              >
                {latestFee ? formatILS(amountPaid) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">יתרה</span>
              <span
                className={`text-sm font-medium tabular-nums ${
                  !latestFee ? '' : balance > 0 ? 'text-red-600' : balance === 0 ? 'text-green-600' : ''
                }`}
                dir="ltr"
              >
                {latestFee ? formatILS(balance) : '—'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Members */}
      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">חברי קבוצה</span>
          </div>
          <div className="text-2xl font-bold">{members.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {activeMembers.length} פעילים
          </div>
          <div className="space-y-0.5 border-t pt-2 mt-2">
            {Object.entries(roleCounts).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{PAYMENT_ROLE_LABELS[role] || role}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Primary Payer */}
      <Card className="rounded-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">משלם ראשי</span>
          </div>
          {primaryPayer ? (
            <>
              <div className="text-sm font-medium">{primaryPayer.company_name}</div>
              <div className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">
                ח.פ. {primaryPayer.tax_id}
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">לא הוגדר</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
