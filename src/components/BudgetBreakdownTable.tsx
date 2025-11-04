import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ClientBudgetRow } from '@/services/dashboard.service';
import { formatILS } from '@/lib/formatters';

interface BudgetBreakdownTableProps {
  data: ClientBudgetRow[];
  type: 'audit' | 'bookkeeping';
  isLoading?: boolean;
}

/**
 * טבלת פירוט תקציב לפי לקוחות
 * מציגה רשימת לקוחות עם סכומי שכר טרחה או הנהלת חשבונות
 */
export function BudgetBreakdownTable({ data, type, isLoading }: BudgetBreakdownTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">טוען נתונים...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          {type === 'audit' ? 'אין חישובי שכר טרחה' : 'אין חישובי הנהלת חשבונות'}
        </p>
      </div>
    );
  }

  // Calculate totals
  const totalBeforeVat = data.reduce((sum, row) => sum + row.amount_before_vat, 0);
  const totalWithVat = data.reduce((sum, row) => sum + row.amount_with_vat, 0);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="rtl:text-right ltr:text-left">שם לקוח</TableHead>
            <TableHead className="rtl:text-right ltr:text-left">לפני מע"מ</TableHead>
            <TableHead className="rtl:text-right ltr:text-left">כולל מע"מ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.client_id}>
              <TableCell className="font-medium rtl:text-right ltr:text-left">
                {row.client_name}
              </TableCell>
              <TableCell className="rtl:text-right ltr:text-left">
                {formatILS(row.amount_before_vat)}
              </TableCell>
              <TableCell className="font-semibold rtl:text-right ltr:text-left">
                {formatILS(row.amount_with_vat)}
              </TableCell>
            </TableRow>
          ))}
          {/* Total Row */}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell className="rtl:text-right ltr:text-left">סה"כ</TableCell>
            <TableCell className="rtl:text-right ltr:text-left">
              {formatILS(totalBeforeVat)}
            </TableCell>
            <TableCell className="text-blue-700 rtl:text-right ltr:text-left">
              {formatILS(totalWithVat)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Summary */}
      <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">
        <p>
          מציג {data.length} לקוחות עם {type === 'audit' ? 'שכר טרחה' : 'הנהלת חשבונות'}
        </p>
      </div>
    </div>
  );
}
