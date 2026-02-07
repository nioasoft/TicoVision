/**
 * BalanceTable - Main data table for annual balance sheets
 * Shows client cases with status, auditor, dates, and quick actions
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreHorizontal, ChevronRight, ChevronLeft } from 'lucide-react';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { formatIsraeliDate, formatIsraeliDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getNextStatus, hasBalancePermission, BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';
import type { AnnualBalanceSheetWithClient, BalanceStatus } from '../types/annual-balance.types';

interface BalanceTableProps {
  cases: AnnualBalanceSheetWithClient[];
  loading?: boolean;
  pagination: { page: number; pageSize: number; total: number };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (row: AnnualBalanceSheetWithClient) => void;
  onQuickAction: (row: AnnualBalanceSheetWithClient, action: string) => void;
  userRole: string;
}

/**
 * Get the quick action label for a given status
 */
function getQuickActionLabel(status: BalanceStatus): string | null {
  const labels: Partial<Record<BalanceStatus, string>> = {
    waiting_for_materials: 'סמן הגיע חומר',
    materials_received: 'שייך מבקר',
    assigned_to_auditor: 'התחל עבודה',
    in_progress: 'סיים עבודה',
    work_completed: 'סמן שודר', // Skip 'office_approved', go directly to 'report_transmitted'
    report_transmitted: 'עדכן מקדמות',
  };
  return labels[status] ?? null;
}

/**
 * Format relative time for "last updated" display
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'היום';
  if (diffDays === 1) return 'אתמול';
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  if (diffDays < 30) return `לפני ${Math.floor(diffDays / 7)} שבועות`;
  return formatIsraeliDate(dateStr);
}

export const BalanceTable: React.FC<BalanceTableProps> = ({
  cases,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onQuickAction,
  userRole,
}) => {
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-right">שם חברה</TableHead>
              <TableHead className="text-right w-[120px]">ח.פ.</TableHead>
              <TableHead className="text-right w-[150px]">סטטוס</TableHead>
              <TableHead className="text-right w-[150px]">מבקר</TableHead>
              <TableHead className="text-right w-[130px]">פגישה</TableHead>
              <TableHead className="text-right w-[130px]">עדכון אחרון</TableHead>
              <TableHead className="text-right w-[80px]">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(7)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg">לא נמצאו תיקים</p>
        <p className="mt-2 text-sm">נסה לשנות את הפילטרים או לפתוח שנה חדשה</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-right">שם חברה</TableHead>
              <TableHead className="text-right w-[120px]">ח.פ.</TableHead>
              <TableHead className="text-right w-[150px]">סטטוס</TableHead>
              <TableHead className="text-right w-[150px]">מבקר</TableHead>
              <TableHead className="text-right w-[130px]">פגישה</TableHead>
              <TableHead className="text-right w-[130px]">עדכון אחרון</TableHead>
              <TableHead className="text-right w-[80px]">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((row, index) => {
              const isEven = index % 2 === 0;
              const nextStatus = getNextStatus(row.status);
              const actionLabel = getQuickActionLabel(row.status);
              const canAdvance = nextStatus && (
                row.status === 'waiting_for_materials'
                  ? hasBalancePermission(userRole, 'mark_materials')
                  : hasBalancePermission(userRole, 'change_status')
              );

              return (
                <TableRow
                  key={row.id}
                  className={cn(
                    'cursor-pointer hover:bg-slate-100/70',
                    isEven ? 'bg-slate-50/50' : 'bg-white'
                  )}
                  onClick={() => onRowClick(row)}
                >
                  <TableCell className="py-2.5 px-3">
                    <div className="text-right font-medium text-sm">
                      {row.client?.company_name || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <div className="text-right text-sm text-muted-foreground font-mono">
                      {row.client?.tax_id || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <BalanceStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <div className="text-right text-sm text-muted-foreground">
                      {row.auditor_id ? (row as Record<string, unknown>).auditor_email as string || '-' : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <div className="text-right text-sm text-muted-foreground">
                      {row.meeting_date ? formatIsraeliDateTime(row.meeting_date) : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3">
                    <div className="text-right text-xs text-muted-foreground">
                      {formatRelativeTime(row.updated_at)}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rtl:text-right">
                        {canAdvance && actionLabel && (
                          <DropdownMenuItem
                            onClick={() => onQuickAction(row, row.status)}
                          >
                            <span className={cn('ml-2', BALANCE_STATUS_CONFIG[nextStatus].color)}>
                              {actionLabel}
                            </span>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onRowClick(row)}>
                          פרטים
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>מציג {((pagination.page - 1) * pagination.pageSize) + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)} מתוך {pagination.total}</span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>שורות</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            עמוד {pagination.page} מתוך {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={pagination.page >= totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
