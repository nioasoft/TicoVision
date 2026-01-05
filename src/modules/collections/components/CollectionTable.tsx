/**
 * Collection Table Component
 * Main data table for collection dashboard with sorting, pagination, and row actions
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import type { CollectionRow, CollectionSort } from '@/types/collection.types';
import {
  formatILS,
  formatIsraeliDate,
  getStatusLabel,
  getStatusVariant,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';

interface CollectionTableProps {
  rows: CollectionRow[];
  loading?: boolean;
  sort: CollectionSort;
  onSort: (sort: CollectionSort) => void;
  onClientClick: (row: CollectionRow) => void;
}

/**
 * Sortable table header
 */
const SortableHeader: React.FC<{
  column: CollectionSort['column'];
  currentSort: CollectionSort;
  onSort: (sort: CollectionSort) => void;
  children: React.ReactNode;
}> = ({ column, currentSort, onSort, children }) => {
  const isActive = currentSort.column === column;
  const nextOrder = isActive && currentSort.order === 'asc' ? 'desc' : 'asc';

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 rtl:flex-row-reverse gap-1 -mx-2 hover:bg-slate-200/50"
      onClick={() => onSort({ column, order: nextOrder })}
    >
      <span className="rtl:text-right ltr:text-left font-semibold">{children}</span>
      <ArrowUpDown className={cn('h-3 w-3', isActive && 'text-primary')} />
    </Button>
  );
};

/**
 * Collection Table Row Component
 */
const CollectionTableRow: React.FC<{
  row: CollectionRow;
  isEven: boolean;
  onClientClick: (row: CollectionRow) => void;
}> = ({
  row,
  isEven,
  onClientClick,
}) => {
  return (
    <TableRow
      className={cn(
        'cursor-pointer transition-colors border-b border-slate-100',
        isEven ? 'bg-slate-50/50' : 'bg-white',
        'hover:bg-slate-100/70'
      )}
      onClick={() => onClientClick(row)}
    >

      {/* Client Name */}
      <TableCell className="py-2.5 px-2 border-l border-slate-100">
        <div className="rtl:text-right ltr:text-left">
          <div className="font-medium text-sm truncate max-w-[140px] text-slate-800">{row.company_name_hebrew || row.client_name}</div>
        </div>
      </TableCell>

      {/* Send Date */}
      <TableCell className="rtl:text-right ltr:text-left py-2.5 px-1 border-l border-slate-100">
        <div className="text-xs text-slate-700">{formatIsraeliDate(row.letter_sent_date)}</div>
        <div className="text-[10px] text-slate-400">{row.days_since_sent} ימים</div>
      </TableCell>

      {/* Accounting Fee - Before VAT */}
      <TableCell className="rtl:text-right ltr:text-left py-2.5 px-1 text-sm text-slate-600 bg-blue-50/30">
        {row.amount_before_vat ? formatILS(row.amount_before_vat) : '-'}
      </TableCell>

      {/* Accounting Fee - With VAT */}
      <TableCell className="rtl:text-right ltr:text-left font-medium py-2.5 px-1 text-sm text-slate-800 bg-blue-50/30 border-l border-slate-100">
        {formatILS(row.amount_original)}
      </TableCell>

      {/* Bookkeeping - Before VAT */}
      <TableCell className="rtl:text-right ltr:text-left py-2.5 px-1 text-sm text-slate-600 bg-emerald-50/30">
        {row.bookkeeping_before_vat ? formatILS(row.bookkeeping_before_vat) : '-'}
      </TableCell>

      {/* Bookkeeping - With VAT */}
      <TableCell className="rtl:text-right ltr:text-left font-medium py-2.5 px-1 text-sm text-slate-800 bg-emerald-50/30 border-l border-slate-100">
        {row.bookkeeping_with_vat ? formatILS(row.bookkeeping_with_vat) : '-'}
      </TableCell>

      {/* Payment Method */}
      <TableCell className="rtl:text-right ltr:text-left py-2.5 px-2 border-l border-slate-100">
        <PaymentMethodBadge method={row.payment_method_selected || null} className="text-sm" />
      </TableCell>

      {/* Status */}
      <TableCell className="rtl:text-right ltr:text-left py-2.5 px-2">
        <Badge variant={getStatusVariant(row.payment_status as Parameters<typeof getStatusVariant>[0])} className="rtl:text-right ltr:text-left text-sm py-0.5 px-2">
          {getStatusLabel(row.payment_status as Parameters<typeof getStatusLabel>[0])}
        </Badge>
      </TableCell>
    </TableRow>
  );
};

/**
 * Main Collection Table Component
 */
export const CollectionTable: React.FC<CollectionTableProps> = ({
  rows,
  loading = false,
  sort,
  onSort,
  onClientClick,
}) => {

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
        <div className="text-slate-500 rtl:text-right ltr:text-left">טוען נתונים...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
        <div className="text-slate-500 rtl:text-right ltr:text-left">לא נמצאו רשומות</div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <Table className="text-sm">
        <TableHeader>
          {/* Row 1 - Group headers */}
          <TableRow className="bg-slate-100 border-b-2 border-slate-200">
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2.5 px-2 align-bottom w-[150px] bg-slate-100 border-l border-slate-200">
              <SortableHeader column="client_name" currentSort={sort} onSort={onSort}>
                שם לקוח
              </SortableHeader>
            </TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2.5 px-1 align-bottom w-20 bg-slate-100 border-l border-slate-200">
              <SortableHeader column="days_since_sent" currentSort={sort} onSort={onSort}>
                תאריך
              </SortableHeader>
            </TableHead>
            <TableHead colSpan={2} className="text-center py-2 px-1 bg-blue-100/70 text-blue-800 text-xs font-semibold border-l border-slate-200">
              שכר טרחה
            </TableHead>
            <TableHead colSpan={2} className="text-center py-2 px-1 bg-emerald-100/70 text-emerald-800 text-xs font-semibold border-l border-slate-200">
              הנה"ח שנתי
            </TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2.5 px-2 align-bottom w-36 bg-slate-100 border-l border-slate-200 font-semibold text-slate-700">
              שיטת תשלום
            </TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2.5 px-2 align-bottom w-28 bg-slate-100">
              <SortableHeader column="payment_status" currentSort={sort} onSort={onSort}>
                סטטוס
              </SortableHeader>
            </TableHead>
          </TableRow>
          {/* Row 2 - Sub-column headers */}
          <TableRow className="bg-slate-50 border-b border-slate-200">
            <TableHead className="rtl:text-right ltr:text-left py-1.5 px-1 text-[10px] bg-blue-50/80 text-blue-700 w-16 font-medium">לפני מע"מ</TableHead>
            <TableHead className="rtl:text-right ltr:text-left py-1.5 px-1 text-[10px] bg-blue-50/80 text-blue-700 w-16 font-medium border-l border-slate-200">כולל מע"מ</TableHead>
            <TableHead className="rtl:text-right ltr:text-left py-1.5 px-1 text-[10px] bg-emerald-50/80 text-emerald-700 w-16 font-medium">לפני מע"מ</TableHead>
            <TableHead className="rtl:text-right ltr:text-left py-1.5 px-1 text-[10px] bg-emerald-50/80 text-emerald-700 w-16 font-medium border-l border-slate-200">כולל מע"מ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <CollectionTableRow
              key={row.fee_calculation_id}
              row={row}
              isEven={index % 2 === 0}
              onClientClick={onClientClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

CollectionTable.displayName = 'CollectionTable';
