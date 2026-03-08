/**
 * FeeHistoryCard - Table of all fee calculations for this client
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';
import type { FeeCalculation } from '@/services';

interface FeeHistoryCardProps {
  feeCalculations: FeeCalculation[];
}

const FEE_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'טיוטה', className: 'bg-gray-100 text-gray-700' },
  sent: { label: 'נשלח', className: 'bg-blue-100 text-blue-700' },
  paid: { label: 'שולם', className: 'bg-green-100 text-green-700' },
  partial_paid: { label: 'שולם חלקית', className: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'באיחור', className: 'bg-red-100 text-red-700' },
  cancelled: { label: 'בוטל', className: 'bg-gray-100 text-gray-500' },
};

export function FeeHistoryCard({ feeCalculations }: FeeHistoryCardProps) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          חישובי שכ&quot;ט
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {feeCalculations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין חישובי שכ&quot;ט</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right pb-2 pe-3 font-medium">שנה</th>
                  <th className="text-right pb-2 pe-3 font-medium">סכום בסיס</th>
                  <th className="text-right pb-2 pe-3 font-medium">סה&quot;כ כולל מע&quot;מ</th>
                  <th className="text-right pb-2 pe-3 font-medium">סטטוס</th>
                  <th className="text-right pb-2 pe-3 font-medium">תאריך תשלום</th>
                </tr>
              </thead>
              <tbody>
                {feeCalculations.map((fee) => {
                  const statusConfig = FEE_STATUS_CONFIG[fee.status] || {
                    label: fee.status,
                    className: '',
                  };
                  return (
                    <tr key={fee.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pe-3 font-medium">{fee.year}</td>
                      <td className="py-2 pe-3 tabular-nums" dir="ltr">
                        {formatILS(fee.base_amount)}
                      </td>
                      <td className="py-2 pe-3 tabular-nums font-medium" dir="ltr">
                        {formatILS(fee.calculated_with_vat ?? fee.total_amount)}
                      </td>
                      <td className="py-2 pe-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="py-2 pe-3 text-muted-foreground">
                        {fee.payment_date ? formatIsraeliDate(fee.payment_date) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
