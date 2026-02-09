/**
 * BalanceTable - Main data table for annual balance sheets
 * Shows client cases with merged company/tax_id, step indicator, avatar auditor,
 * advances amount, visible quick actions on hover, and page pills pagination
 *
 * Column order (code order = LEFT to RIGHT visually in RTL):
 * פעולה הבאה | עדכון | מקדמות | מבקר | סטטוס | חברה (rightmost = primary)
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, FileSearch, ExternalLink, AlertTriangle } from 'lucide-react';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { formatIsraeliDate, formatIsraeliDateTime, formatILSInteger } from '@/lib/formatters';
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

/** Quick action label for a given status - auditor confirmation aware */
function getQuickActionLabel(status: BalanceStatus, auditorConfirmed?: boolean): string | null {
  if (status === 'assigned_to_auditor') {
    return auditorConfirmed ? 'התחל עבודה' : 'אשר קבלת תיק';
  }
  const labels: Partial<Record<BalanceStatus, string>> = {
    waiting_for_materials: 'סמן הגיע חומר',
    materials_received: 'שייך מבקר',
    in_progress: 'העבר לאישור',
    work_completed: 'סמן שודר',
    report_transmitted: 'עדכן מקדמות',
  };
  return labels[status] ?? null;
}

/** Get the action type for quick action dispatch */
function getQuickActionType(status: BalanceStatus, auditorConfirmed?: boolean): string {
  if (status === 'assigned_to_auditor' && !auditorConfirmed) {
    return 'confirm_assignment';
  }
  return status;
}

/** Format relative time for "last updated" display */
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

/** Get step number from status (1-6, skipping office_approved and assigned_to_auditor) */
function getStepNumber(status: BalanceStatus): number {
  const stepMap: Record<BalanceStatus, number> = {
    waiting_for_materials: 1,
    materials_received: 2,
    assigned_to_auditor: 3,
    in_progress: 3,
    work_completed: 4,
    office_approved: 5,
    report_transmitted: 5,
    advances_updated: 6,
  };
  return stepMap[status];
}

/** Get the timestamp when the current status was entered */
function getStatusDate(row: AnnualBalanceSheetWithClient): string | null {
  switch (row.status) {
    case 'materials_received':
      return row.materials_received_at;
    case 'assigned_to_auditor':
      return row.meeting_date;
    case 'in_progress':
      return row.work_started_at;
    case 'work_completed':
      return row.work_completed_at;
    case 'report_transmitted':
      return row.report_transmitted_at;
    case 'advances_updated':
      return row.advances_updated_at;
    default:
      return null;
  }
}

/** Generate page numbers with ellipsis logic (max 5 visible) */
function generatePageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}

/** Get subtle row background color by status */
function getRowBgClass(status: BalanceStatus): string {
  switch (status) {
    case 'in_progress':
      return 'bg-orange-50/30';
    case 'work_completed':
      return 'bg-yellow-50/30';
    case 'report_transmitted':
      return 'bg-green-50/50';
    case 'advances_updated':
      return 'bg-emerald-50/50';
    default:
      return '';
  }
}

const TOTAL_VISIBLE_STEPS = 6;

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

  // Loading skeleton - matches column order
  if (loading) {
    return (
      <div>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-right w-[130px]"><span className="text-xs font-semibold text-muted-foreground">פעולה הבאה</span></TableHead>
              <TableHead className="text-right w-[110px]"><span className="text-xs font-semibold text-muted-foreground">עדכון</span></TableHead>
              <TableHead className="text-right w-[110px]"><span className="text-xs font-semibold text-muted-foreground">מקדמות</span></TableHead>
              <TableHead className="text-right w-[180px]"><span className="text-xs font-semibold text-muted-foreground">מבקר</span></TableHead>
              <TableHead className="text-right w-[160px]"><span className="text-xs font-semibold text-muted-foreground">סטטוס</span></TableHead>
              <TableHead className="text-right w-[210px]"><span className="text-xs font-semibold text-muted-foreground">חברה</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="py-3 px-3"><Skeleton className="h-7 w-24" /></TableCell>
                <TableCell className="py-3 px-3"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="py-3 px-3"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </TableCell>
                <TableCell className="py-3 px-3"><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="py-3 px-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="rounded-full bg-muted/40 p-4 mb-4">
          <FileSearch className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium">לא נמצאו תיקים</p>
        <p className="mt-1 text-sm">נסה לשנות את הפילטרים או לפתוח שנה חדשה</p>
      </div>
    );
  }

  return (
    <div>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-right w-[130px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">פעולה הבאה</span>
            </TableHead>
            <TableHead className="text-right w-[110px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">עדכון</span>
            </TableHead>
            <TableHead className="text-right w-[110px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">מקדמות</span>
            </TableHead>
            <TableHead className="text-right w-[180px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">מבקר</span>
            </TableHead>
            <TableHead className="text-right w-[160px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">סטטוס</span>
            </TableHead>
            <TableHead className="text-right w-[210px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">חברה</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((row) => {
            const nextStatus = getNextStatus(row.status);
            const actionLabel = getQuickActionLabel(row.status, row.auditor_confirmed);
            const actionType = getQuickActionType(row.status, row.auditor_confirmed);
            const canAdvance = (
              row.status === 'assigned_to_auditor' && !row.auditor_confirmed
                ? hasBalancePermission(userRole, 'confirm_assignment')
                : nextStatus && (
                  row.status === 'waiting_for_materials'
                    ? hasBalancePermission(userRole, 'mark_materials')
                    : hasBalancePermission(userRole, 'change_status')
                )
            );
            const stepNum = getStepNumber(row.status);
            const auditorName = row.auditor_id ? (row as Record<string, unknown>).auditor_name as string : null;

            return (
              <TableRow
                key={row.id}
                className={cn(
                  'group cursor-pointer hover:bg-muted/40',
                  getRowBgClass(row.status),
                  !row.is_active && 'opacity-50'
                )}
                onClick={() => onRowClick(row)}
              >
                {/* Quick action (visible on row hover) - LEFTMOST */}
                <TableCell className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {row.advance_rate_alert && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          שיעור מחושב גבוה מהשיעור הנוכחי
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {canAdvance && actionLabel ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity',
                          nextStatus && BALANCE_STATUS_CONFIG[nextStatus].color
                        )}
                        onClick={() => onQuickAction(row, actionType)}
                      >
                        {actionLabel}
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground/40">--</span>
                    )}
                  </div>
                </TableCell>

                {/* Last updated (relative + tooltip) */}
                <TableCell className="py-3 px-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground cursor-default">
                        {formatRelativeTime(row.updated_at)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {formatIsraeliDateTime(row.updated_at)}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                {/* Advances amount */}
                <TableCell className="py-3 px-3">
                  <span className="text-sm text-muted-foreground">
                    {row.new_advances_amount !== null && row.new_advances_amount !== undefined
                      ? formatILSInteger(row.new_advances_amount)
                      : <span className="text-muted-foreground/40">--</span>
                    }
                  </span>
                </TableCell>

                {/* Auditor: name + assignment date */}
                <TableCell className="py-3 px-3">
                  {auditorName ? (
                    <div className="text-right ms-auto">
                      <span className="text-sm text-muted-foreground truncate block">
                        {auditorName}
                      </span>
                      {row.meeting_date && (
                        <span className="text-[10px] text-muted-foreground/60 block">
                          {formatIsraeliDate(row.meeting_date)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/40">--</span>
                  )}
                </TableCell>

                {/* Status: step indicator + badge + date */}
                <TableCell className="py-3 px-3">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {stepNum}/{TOTAL_VISIBLE_STEPS}
                    </span>
                    <div className="text-right">
                      <BalanceStatusBadge status={row.status} />
                      {getStatusDate(row) && (
                        <span className="text-[10px] text-muted-foreground/60 block mt-0.5">
                          {formatIsraeliDate(getStatusDate(row)!)}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Company (two-line: name + tax_id) + tax_coding badge + inactive badge - RIGHTMOST (primary) */}
                <TableCell className="py-3 px-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="font-medium text-sm leading-tight truncate">
                        {row.client?.company_name || '--'}
                      </div>
                      {(row.tax_coding || row.client?.tax_coding) && (row.tax_coding || row.client?.tax_coding) !== '0' && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0 font-mono">
                          1214: {row.tax_coding || row.client?.tax_coding}
                        </Badge>
                      )}
                      {!row.is_active && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 shrink-0">
                          לא פעיל
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">
                        {row.client?.tax_id || '--'}
                      </span>
                      {row.backup_link && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={row.backup_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-700"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            קישור לגיבוי
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20" dir="rtl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {((pagination.page - 1) * pagination.pageSize) + 1}-{Math.min(pagination.page * pagination.pageSize, pagination.total)} מתוך {pagination.total}
          </span>
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs border-0 bg-transparent">
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
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {generatePageNumbers(pagination.page, totalPages).map((page, i) =>
            page === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
            ) : (
              <Button
                key={page}
                variant={page === pagination.page ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 w-8 p-0 text-xs tabular-nums',
                  page === pagination.page && 'pointer-events-none'
                )}
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="ghost"
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
