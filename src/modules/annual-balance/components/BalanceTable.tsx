/**
 * BalanceTable - Main data table for annual balance sheets
 * Shows client cases with merged company/tax_id, step indicator, avatar auditor,
 * visible quick actions on hover, and page pills pagination
 *
 * Column order (code order = LEFT to RIGHT visually in RTL):
 * פעולה הבאה | עדכון | פגישה | מבקר | סטטוס | חברה (rightmost = primary)
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronLeft, FileSearch } from 'lucide-react';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { formatIsraeliDate, formatIsraeliDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getNextStatus, hasBalancePermission, BALANCE_STATUSES, BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';
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

/** Quick action label for a given status */
function getQuickActionLabel(status: BalanceStatus): string | null {
  const labels: Partial<Record<BalanceStatus, string>> = {
    waiting_for_materials: 'סמן הגיע חומר',
    materials_received: 'שייך מבקר',
    assigned_to_auditor: 'התחל עבודה',
    in_progress: 'סיים עבודה',
    work_completed: 'סמן שודר',
    report_transmitted: 'עדכן מקדמות',
  };
  return labels[status] ?? null;
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

/** Get step number from status (1-7 excluding office_approved for display) */
function getStepNumber(status: BalanceStatus): number {
  const visibleStatuses = BALANCE_STATUSES.filter((s) => s !== 'office_approved');
  const idx = visibleStatuses.indexOf(status);
  return idx >= 0 ? idx + 1 : BALANCE_STATUSES.indexOf(status) + 1;
}

/** Extract initials from email */
function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Extract username from email */
function getUsername(email: string): string {
  return email.split('@')[0];
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

const TOTAL_VISIBLE_STEPS = 7;

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
              <TableHead className="text-right w-[120px]"><span className="text-xs font-semibold text-muted-foreground">פגישה</span></TableHead>
              <TableHead className="text-right w-[140px]"><span className="text-xs font-semibold text-muted-foreground">מבקר</span></TableHead>
              <TableHead className="text-right w-[160px]"><span className="text-xs font-semibold text-muted-foreground">סטטוס</span></TableHead>
              <TableHead className="text-right w-[250px]"><span className="text-xs font-semibold text-muted-foreground">חברה</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell className="py-3 px-3"><Skeleton className="h-7 w-24" /></TableCell>
                <TableCell className="py-3 px-3"><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell className="py-3 px-3"><Skeleton className="h-4 w-20" /></TableCell>
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
            <TableHead className="text-right w-[120px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">פגישה</span>
            </TableHead>
            <TableHead className="text-right w-[140px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">מבקר</span>
            </TableHead>
            <TableHead className="text-right w-[160px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">סטטוס</span>
            </TableHead>
            <TableHead className="text-right w-[250px] py-3 px-3">
              <span className="text-xs font-semibold text-muted-foreground">חברה</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((row) => {
            const nextStatus = getNextStatus(row.status);
            const actionLabel = getQuickActionLabel(row.status);
            const canAdvance = nextStatus && (
              row.status === 'waiting_for_materials'
                ? hasBalancePermission(userRole, 'mark_materials')
                : hasBalancePermission(userRole, 'change_status')
            );
            const stepNum = getStepNumber(row.status);
            const auditorEmail = row.auditor_id ? (row as Record<string, unknown>).auditor_email as string : null;

            return (
              <TableRow
                key={row.id}
                className="group cursor-pointer hover:bg-muted/40"
                onClick={() => onRowClick(row)}
              >
                {/* Quick action (visible on row hover) - LEFTMOST */}
                <TableCell className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  {canAdvance && actionLabel ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity',
                        nextStatus && BALANCE_STATUS_CONFIG[nextStatus].color
                      )}
                      onClick={() => onQuickAction(row, row.status)}
                    >
                      {actionLabel}
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground/40">--</span>
                  )}
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

                {/* Meeting date */}
                <TableCell className="py-3 px-3">
                  <span className="text-sm text-muted-foreground">
                    {row.meeting_date ? formatIsraeliDate(row.meeting_date) : (
                      <span className="text-muted-foreground/40">--</span>
                    )}
                  </span>
                </TableCell>

                {/* Auditor: avatar + username */}
                <TableCell className="py-3 px-3">
                  {auditorEmail ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 justify-end">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                              {getInitials(auditorEmail)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                            {getUsername(auditorEmail)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {auditorEmail}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-sm text-muted-foreground/40">--</span>
                  )}
                </TableCell>

                {/* Status: step indicator + badge */}
                <TableCell className="py-3 px-3">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {stepNum}/{TOTAL_VISIBLE_STEPS}
                    </span>
                    <BalanceStatusBadge status={row.status} />
                  </div>
                </TableCell>

                {/* Company (two-line: name + tax_id) - RIGHTMOST (primary) */}
                <TableCell className="py-3 px-3">
                  <div className="text-right">
                    <div className="font-medium text-sm leading-tight truncate">
                      {row.client?.company_name || '--'}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {row.client?.tax_id || '--'}
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
