/**
 * BalanceSheetsCard - Table of annual balance sheets for this client
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { BalanceStatusBadge } from '@/modules/annual-balance/components/BalanceStatusBadge';
import { formatILS } from '@/lib/formatters';
import type { AnnualBalanceSheet } from '@/modules/annual-balance/types/annual-balance.types';

interface BalanceSheetsCardProps {
  balanceSheets: AnnualBalanceSheet[];
}

export function BalanceSheetsCard({ balanceSheets }: BalanceSheetsCardProps) {
  const sorted = [...balanceSheets].sort((a, b) => b.year - a.year);

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          מאזנים שנתיים
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">אין מאזנים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-right pb-2 pe-3 font-medium">שנה</th>
                  <th className="text-right pb-2 pe-3 font-medium">סטטוס</th>
                  <th className="text-right pb-2 pe-3 font-medium">מחזור</th>
                  <th className="text-right pb-2 pe-3 font-medium">מס</th>
                  <th className="text-right pb-2 pe-3 font-medium">שיעור מקדמה</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((bs) => (
                  <tr key={bs.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 pe-3 font-medium">{bs.year}</td>
                    <td className="py-2.5 pe-3">
                      <BalanceStatusBadge status={bs.status} />
                    </td>
                    <td className="py-2.5 pe-3 tabular-nums" dir="ltr">
                      {bs.turnover ? formatILS(bs.turnover) : '—'}
                    </td>
                    <td className="py-2.5 pe-3 tabular-nums" dir="ltr">
                      {bs.tax_amount ? formatILS(bs.tax_amount) : '—'}
                    </td>
                    <td className="py-2.5 pe-3">
                      <div className="flex items-center gap-1">
                        {bs.current_advance_rate != null ? (
                          <span className="tabular-nums" dir="ltr">
                            {bs.current_advance_rate}%
                          </span>
                        ) : (
                          '—'
                        )}
                        {bs.advance_rate_alert && (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
