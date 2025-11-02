/**
 * Collection Table Component
 * Main data table for collection dashboard with sorting, pagination, and row actions
 */

import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowUpDown,
  MoreHorizontal,
  CheckCircle,
  DollarSign,
  Mail,
  MessageSquare,
  History,
  AlertTriangle,
} from 'lucide-react';
import type { CollectionRow, CollectionSort } from '@/types/collection.types';
import {
  formatILS,
  formatIsraeliDate,
  getPaymentMethodShortLabel,
  getStatusLabel,
  getStatusVariant,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CollectionTableProps {
  rows: CollectionRow[];
  selectedRows: string[];
  loading?: boolean;
  sort: CollectionSort;
  onSort: (sort: CollectionSort) => void;
  onSelectAll: () => void;
  onToggleSelect: (feeId: string) => void;
  onMarkAsPaid: (row: CollectionRow) => void;
  onMarkPartialPayment: (row: CollectionRow) => void;
  onSendReminder: (row: CollectionRow) => void;
  onLogInteraction: (row: CollectionRow) => void;
  onViewHistory: (row: CollectionRow) => void;
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
      className="h-8 rtl:flex-row-reverse gap-1 -mx-2"
      onClick={() => onSort({ column, order: nextOrder })}
    >
      <span className="rtl:text-right ltr:text-left">{children}</span>
      <ArrowUpDown className={cn('h-3 w-3', isActive && 'text-primary')} />
    </Button>
  );
};

/**
 * Collection Table Row Component
 */
const CollectionTableRow: React.FC<{
  row: CollectionRow;
  isSelected: boolean;
  onToggleSelect: (feeId: string) => void;
  onMarkAsPaid: (row: CollectionRow) => void;
  onMarkPartialPayment: (row: CollectionRow) => void;
  onSendReminder: (row: CollectionRow) => void;
  onLogInteraction: (row: CollectionRow) => void;
  onViewHistory: (row: CollectionRow) => void;
}> = ({
  row,
  isSelected,
  onToggleSelect,
  onMarkAsPaid,
  onMarkPartialPayment,
  onSendReminder,
  onLogInteraction,
  onViewHistory,
}) => {
  return (
    <TableRow className={cn('hover:bg-gray-50', isSelected && 'bg-blue-50')}>
      {/* Checkbox */}
      <TableCell className="w-12 py-2 px-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(row.fee_calculation_id)}
        />
      </TableCell>

      {/* Client Name */}
      <TableCell className="min-w-[200px] py-2 px-3">
        <div className="rtl:text-right ltr:text-left">
          <div className="font-medium text-sm">{row.company_name_hebrew || row.client_name}</div>
          <div className="text-xs text-gray-500">{row.contact_email}</div>
        </div>
      </TableCell>

      {/* Send Date */}
      <TableCell className="w-28 rtl:text-right ltr:text-left py-2 px-3">
        <div className="text-sm">{formatIsraeliDate(row.letter_sent_date)}</div>
        <div className="text-xs text-gray-500">{row.days_since_sent} ימים</div>
      </TableCell>

      {/* Original Amount */}
      <TableCell className="w-32 rtl:text-right ltr:text-left font-medium py-2 px-3 text-sm">
        {formatILS(row.amount_original)}
      </TableCell>

      {/* Payment Method */}
      <TableCell className="w-40 rtl:text-right ltr:text-left py-2 px-3">
        {row.payment_method_selected ? (
          <Badge variant="outline" className="rtl:text-right ltr:text-left text-[10px] py-0 px-1.5">
            {getPaymentMethodShortLabel(row.payment_method_selected)}
          </Badge>
        ) : (
          <span className="text-gray-400 text-xs">לא בחר</span>
        )}
      </TableCell>

      {/* Amount After Discount */}
      <TableCell className="w-32 rtl:text-right ltr:text-left py-2 px-3">
        {row.payment_method_selected ? (
          <div>
            <div className="font-medium text-sm">{formatILS(row.amount_after_discount)}</div>
            {row.discount_percent > 0 && (
              <div className="text-xs text-green-600">
                ({row.discount_percent}% הנחה)
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="w-32 rtl:text-right ltr:text-left py-2 px-3">
        <Badge variant={getStatusVariant(row.payment_status as any)} className="rtl:text-right ltr:text-left text-[10px] py-0 px-1.5">
          {getStatusLabel(row.payment_status as any)}
        </Badge>
      </TableCell>

      {/* Alerts */}
      <TableCell className="w-24 py-2 px-3">
        {row.has_alert && (
          <div className="flex gap-1 rtl:flex-row-reverse">
            {row.alert_types.map((alert) => (
              <AlertTriangle key={alert} className="h-3.5 w-3.5 text-orange-500" />
            ))}
          </div>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24 rtl:text-right ltr:text-left py-2 px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rtl:text-right ltr:text-left">
            <DropdownMenuLabel className="rtl:text-right ltr:text-left">פעולות</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMarkAsPaid(row)} className="rtl:flex-row-reverse gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="rtl:text-right ltr:text-left">סימון כשולם</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMarkPartialPayment(row)} className="rtl:flex-row-reverse gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="rtl:text-right ltr:text-left">רישום תשלום חלקי</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSendReminder(row)} className="rtl:flex-row-reverse gap-2">
              <Mail className="h-4 w-4" />
              <span className="rtl:text-right ltr:text-left">שליחת תזכורת</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onLogInteraction(row)} className="rtl:flex-row-reverse gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="rtl:text-right ltr:text-left">רישום אינטראקציה</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewHistory(row)} className="rtl:flex-row-reverse gap-2">
              <History className="h-4 w-4" />
              <span className="rtl:text-right ltr:text-left">הצגת היסטוריה</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

/**
 * Main Collection Table Component
 */
export const CollectionTable: React.FC<CollectionTableProps> = ({
  rows,
  selectedRows,
  loading = false,
  sort,
  onSort,
  onSelectAll,
  onToggleSelect,
  onMarkAsPaid,
  onMarkPartialPayment,
  onSendReminder,
  onLogInteraction,
  onViewHistory,
}) => {
  const allSelected = selectedRows.length === rows.length && rows.length > 0;

  if (loading) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-gray-500 rtl:text-right ltr:text-left">טוען נתונים...</div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <div className="text-gray-500 rtl:text-right ltr:text-left">לא נמצאו רשומות</div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table className="text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 py-2 px-3">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="min-w-[200px] rtl:text-right ltr:text-left py-2 px-3">
              <SortableHeader column="client_name" currentSort={sort} onSort={onSort}>
                שם לקוח
              </SortableHeader>
            </TableHead>
            <TableHead className="w-28 rtl:text-right ltr:text-left py-2 px-3">
              <SortableHeader column="days_since_sent" currentSort={sort} onSort={onSort}>
                תאריך משלוח
              </SortableHeader>
            </TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left py-2 px-3">
              <SortableHeader column="amount_original" currentSort={sort} onSort={onSort}>
                סכום מקורי
              </SortableHeader>
            </TableHead>
            <TableHead className="w-40 rtl:text-right ltr:text-left py-2 px-3">שיטת תשלום</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left py-2 px-3">סכום אחרי הנחה</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left py-2 px-3">
              <SortableHeader column="payment_status" currentSort={sort} onSort={onSort}>
                סטטוס
              </SortableHeader>
            </TableHead>
            <TableHead className="w-24 rtl:text-right ltr:text-left py-2 px-3">התראות</TableHead>
            <TableHead className="w-24 rtl:text-right ltr:text-left py-2 px-3">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <CollectionTableRow
              key={row.fee_calculation_id}
              row={row}
              isSelected={selectedRows.includes(row.fee_calculation_id)}
              onToggleSelect={onToggleSelect}
              onMarkAsPaid={onMarkAsPaid}
              onMarkPartialPayment={onMarkPartialPayment}
              onSendReminder={onSendReminder}
              onLogInteraction={onLogInteraction}
              onViewHistory={onViewHistory}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

CollectionTable.displayName = 'CollectionTable';
