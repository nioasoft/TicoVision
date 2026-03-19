/**
 * Grant Table
 * Main data table for Shaagat HaAri — displays client grant applications
 * Columns: שם | ח.פ. | מסלול | סטטוס זכאות | % ירידה | שכ"ט | חישוב | שודר | פעולות
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MoreVertical,
  ClipboardList,
  Calculator,
  Send,
  History,
  EyeOff,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { formatILSInteger, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { TrackType, ReportingType } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Row type (view-based — matches shaagat_dashboard_view)
// ─────────────────────────────────────────────────────────────────────────────

export interface GrantTableRow {
  eligibility_check_id: string;
  client_id: string;
  company_name: string;
  tax_id: string;
  track_type: TrackType;
  reporting_type: ReportingType;
  eligibility_status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'GRAY_AREA' | null;
  decline_percentage: number | null;
  payment_status: 'UNPAID' | 'PAID' | 'EXEMPT' | null;
  email_sent: boolean;
  // Calculation
  calculation_id: string | null;
  calculation_completed: boolean | null;
  final_grant_amount: number | null;
  client_approved: boolean | null;
  calculation_step: number | null;
  // Submission
  submission_id: string | null;
  submission_status: string | null;
  submission_number: string | null;
  // Relevance
  is_relevant: boolean;
}

export interface GrantTableActions {
  onEligibilityCheck?: (row: GrantTableRow) => void;
  onCalculate?: (row: GrantTableRow) => void;
  onSendEmail?: (row: GrantTableRow) => void;
  onViewHistory?: (row: GrantTableRow) => void;
  onToggleRelevance?: (row: GrantTableRow) => void;
}

interface GrantTableProps {
  rows: GrantTableRow[];
  loading?: boolean;
  actions?: GrantTableActions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label / badge helpers
// ─────────────────────────────────────────────────────────────────────────────

const TRACK_LABELS: Record<TrackType, string> = {
  standard: 'רגיל',
  small: 'קטנים',
  cash_basis: 'מזומן',
  new_business: 'עסק חדש',
  northern: 'צפון',
  contractor: 'קבלנים',
};

const TRACK_COLORS: Record<TrackType, string> = {
  standard: 'bg-blue-100 text-blue-700',
  small: 'bg-purple-100 text-purple-700',
  cash_basis: 'bg-cyan-100 text-cyan-700',
  new_business: 'bg-amber-100 text-amber-700',
  northern: 'bg-red-100 text-red-700',
  contractor: 'bg-orange-100 text-orange-700',
};

function EligibilityBadge({ status }: { status: GrantTableRow['eligibility_status'] }) {
  if (!status) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const config = {
    ELIGIBLE:     { icon: CheckCircle2, label: 'זכאי',    className: 'bg-green-100 text-green-700' },
    NOT_ELIGIBLE: { icon: XCircle,      label: 'לא זכאי', className: 'bg-red-100 text-red-700' },
    GRAY_AREA:    { icon: AlertCircle,  label: 'אפור',     className: 'bg-yellow-100 text-yellow-700' },
  }[status];
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: GrantTableRow['payment_status'] }) {
  if (!status || status === 'UNPAID') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
        <Clock className="h-3 w-3" />
        לא שולם
      </span>
    );
  }
  if (status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        שולם
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700">
      פטור
    </span>
  );
}

function CalculationCell({
  row,
}: {
  row: GrantTableRow;
}) {
  if (!row.calculation_id) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  if (!row.calculation_completed) {
    return (
      <span className="text-xs text-gray-500">
        שלב {row.calculation_step ?? 1}/4
      </span>
    );
  }
  return (
    <span className="text-sm font-medium text-gray-800">
      {row.final_grant_amount != null ? formatILSInteger(row.final_grant_amount) : '—'}
    </span>
  );
}

function SubmissionCell({ row }: { row: GrantTableRow }) {
  if (!row.submission_id) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  const statusLabel: Record<string, string> = {
    SUBMITTED: 'הוגש',
    IN_REVIEW: 'בבדיקה',
    OBJECTIONS: 'השגות',
    PARTIAL_PAYMENT: 'מקדמה',
    FULL_PAYMENT: 'שולם',
    CLOSED: 'סגור',
  };
  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant="outline" className="text-xs w-fit">
        {statusLabel[row.submission_status ?? ''] ?? row.submission_status}
      </Badge>
      {row.submission_number && (
        <span className="text-xs text-gray-400 font-mono">{row.submission_number}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

const TableSkeleton: React.FC = () => (
  <div className="space-y-1 p-2">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex gap-3 py-2">
        <Skeleton className="h-4 flex-[2]" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-8" />
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const GrantTable: React.FC<GrantTableProps> = ({ rows, loading = false, actions = {} }) => {
  if (loading) return <TableSkeleton />;

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500" dir="rtl">
        <Loader2 className="h-8 w-8 mx-auto mb-3 text-gray-300 animate-spin" />
        <p className="text-sm">לא נמצאו רשומות</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto" dir="rtl">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="text-right font-semibold text-gray-700 ps-4">שם חברה</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">ח.פ.</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">מסלול</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">סטטוס זכאות</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">% ירידה</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">שכ״ט</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">חישוב / מענק</TableHead>
              <TableHead className="text-right font-semibold text-gray-700">שידור</TableHead>
              <TableHead className="text-center font-semibold text-gray-700 pe-4">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.eligibility_check_id}
                className={cn(
                  'hover:bg-gray-50 transition-colors',
                  !row.is_relevant && 'opacity-50',
                )}
              >
                {/* Company name */}
                <TableCell className="ps-4 font-medium text-gray-900 max-w-[180px] truncate">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">{row.company_name}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" dir="rtl">
                      {row.company_name}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                {/* Tax ID */}
                <TableCell className="font-mono text-sm text-gray-600 tabular-nums">
                  {row.tax_id}
                </TableCell>

                {/* Track */}
                <TableCell>
                  <span className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                    TRACK_COLORS[row.track_type],
                  )}>
                    {TRACK_LABELS[row.track_type]}
                  </span>
                </TableCell>

                {/* Eligibility status */}
                <TableCell>
                  <EligibilityBadge status={row.eligibility_status} />
                </TableCell>

                {/* Decline % */}
                <TableCell className="tabular-nums text-sm">
                  {row.decline_percentage != null ? (
                    <span className={cn(
                      'font-medium',
                      row.decline_percentage >= 25 ? 'text-green-700' : 'text-red-600',
                    )}>
                      {formatPercentage(row.decline_percentage)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>

                {/* Service fee */}
                <TableCell>
                  <PaymentStatusBadge status={row.payment_status} />
                </TableCell>

                {/* Calculation */}
                <TableCell>
                  <CalculationCell row={row} />
                </TableCell>

                {/* Submission */}
                <TableCell>
                  <SubmissionCell row={row} />
                </TableCell>

                {/* Actions */}
                <TableCell className="pe-4 text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" dir="rtl" className="w-48">
                      {actions.onEligibilityCheck && (
                        <DropdownMenuItem
                          onClick={() => actions.onEligibilityCheck!(row)}
                          className="gap-2"
                        >
                          <ClipboardList className="h-4 w-4" />
                          בדיקת זכאות
                        </DropdownMenuItem>
                      )}
                      {actions.onCalculate && row.eligibility_status === 'ELIGIBLE' && (
                        <DropdownMenuItem
                          onClick={() => actions.onCalculate!(row)}
                          className="gap-2"
                        >
                          <Calculator className="h-4 w-4" />
                          חישוב מענק
                        </DropdownMenuItem>
                      )}
                      {actions.onSendEmail && (
                        <DropdownMenuItem
                          onClick={() => actions.onSendEmail!(row)}
                          className="gap-2"
                        >
                          <Send className="h-4 w-4" />
                          שליחת מייל
                        </DropdownMenuItem>
                      )}
                      {actions.onViewHistory && (
                        <DropdownMenuItem
                          onClick={() => actions.onViewHistory!(row)}
                          className="gap-2"
                        >
                          <History className="h-4 w-4" />
                          היסטוריה
                        </DropdownMenuItem>
                      )}
                      {actions.onToggleRelevance && (
                        <DropdownMenuItem
                          onClick={() => actions.onToggleRelevance!(row)}
                          className="gap-2"
                        >
                          {row.is_relevant ? (
                            <>
                              <EyeOff className="h-4 w-4" />
                              סמן כלא רלוונטי
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4" />
                              סמן כרלוונטי
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};

GrantTable.displayName = 'GrantTable';
