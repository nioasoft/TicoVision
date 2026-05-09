/**
 * UnifiedClientsTable
 *
 * The single client list that powers the unified Shaagat HaAri dashboard.
 * Each row represents one active client with their current pipeline Stage,
 * a context-aware "details" cell, a smart primary action button, and a "..."
 * menu for secondary actions.
 *
 * Column order (RTL):
 *   לקוח | שלב | מידע הקשר לשלב | % ירידה | שכ"ט שנתי | פעולות
 *
 * Row density: compact (py-1.5) so 14–16 rows fit on a 1080p screen.
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertOctagon,
  Building2,
  Calculator,
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  MoreHorizontal,
  Send,
  Settings2,
  ShieldOff,
} from 'lucide-react';
import { formatILSInteger, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { InitialFilterRow } from '../services/shaagat.service';
import type { SubmissionStatus } from '../services/shaagat.service';
import {
  deriveStage,
  type StageActionKind,
  type StageInfo,
} from '../lib/stage-derivation';
import { StageDetailsCell } from './StageDetailsCell';

export interface UnifiedClientsTableActions {
  onPrimaryAction: (kind: StageActionKind, row: InitialFilterRow) => void;
  onOpenDeepWizard: (row: InitialFilterRow) => void;
  onViewHistory: (row: InitialFilterRow) => void;
  onToggleRelevance: (row: InitialFilterRow) => void;
}

interface UnifiedClientsTableProps {
  rows: InitialFilterRow[];
  loading: boolean;
  actions: UnifiedClientsTableActions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cells
// ─────────────────────────────────────────────────────────────────────────────

function ClientCell({ row }: { row: InitialFilterRow }) {
  const display = row.company_name_hebrew || row.company_name || '—';
  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-1 font-medium text-gray-900 text-sm leading-tight">
        <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="truncate">{display}</span>
      </div>
      <span
        className="text-[11px] text-gray-500 font-mono ltr:inline leading-tight ms-4"
        dir="ltr"
      >
        {row.tax_id}
      </span>
    </div>
  );
}

function RetainerIcon({ row }: { row: InitialFilterRow }) {
  if (!row.has_unpaid_annual_retainer) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center rounded-full bg-amber-50 border border-amber-300 h-6 w-6">
            <AlertOctagon className="h-3.5 w-3.5 text-amber-700" />
          </span>
        </TooltipTrigger>
        <TooltipContent dir="rtl" side="top">
          שכ&quot;ט שנתי לא שולם — הסדר תשלום במשרד
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StageBadge({ stageInfo }: { stageInfo: StageInfo }) {
  return (
    <Badge className={cn('gap-1 text-[11px] px-2 py-0.5 font-medium', stageInfo.badgeClassName)}>
      {stageInfo.label}
    </Badge>
  );
}

function DeclineCell({ row }: { row: InitialFilterRow }) {
  if (row.decline_percentage === null || row.decline_percentage === undefined) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  return (
    <span className="font-mono tabular-nums text-xs">
      {formatPercentage(row.decline_percentage)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Submission-related cells (always present, may show empty placeholders)
// ─────────────────────────────────────────────────────────────────────────────

const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  SUBMITTED: 'שודר',
  IN_REVIEW: 'בבדיקה',
  OBJECTIONS: 'השגה',
  PARTIAL_PAYMENT: 'תשלום חלקי',
  FULL_PAYMENT: 'תשלום מלא',
  CLOSED: 'סגור',
};

const SUBMISSION_STATUS_BADGE: Record<SubmissionStatus, string> = {
  SUBMITTED: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  IN_REVIEW: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  OBJECTIONS: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  PARTIAL_PAYMENT: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  FULL_PAYMENT: 'bg-green-200 text-green-900 hover:bg-green-200',
  CLOSED: 'bg-gray-200 text-gray-700 hover:bg-gray-200',
};

function SubmissionStatusCell({ row }: { row: InitialFilterRow }) {
  if (!row.submission_id || !row.submission_status) {
    return (
      <Badge
        variant="outline"
        className="text-[11px] px-2 py-0.5 font-normal text-gray-500 border-gray-200 bg-gray-50"
      >
        טרם הוגש
      </Badge>
    );
  }
  return (
    <Badge
      className={cn(
        'text-[11px] px-2 py-0.5 font-medium',
        SUBMISSION_STATUS_BADGE[row.submission_status]
      )}
    >
      {SUBMISSION_STATUS_LABEL[row.submission_status]}
    </Badge>
  );
}

/**
 * "מענק מבוקש" — the amount we're claiming. Comes from `expected_amount` once a
 * submission exists; falls back to the calculated `final_grant_amount` while
 * still in the calculation/approval stage.
 */
function RequestedGrantCell({ row }: { row: InitialFilterRow }) {
  const amount =
    row.expected_amount !== null && row.expected_amount !== undefined
      ? row.expected_amount
      : row.final_grant_amount;
  if (amount === null || amount === undefined || amount === 0) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  return (
    <span className="font-mono tabular-nums text-xs text-gray-800">
      ₪{formatILSInteger(amount)}
    </span>
  );
}

/**
 * "מענק מאושר/התקבל" — what the tax authority actually paid. Stays empty until
 * the first advance / final payment lands in `received_amount`.
 */
function ApprovedGrantCell({ row }: { row: InitialFilterRow }) {
  const amount = row.received_amount;
  if (amount === null || amount === undefined || amount === 0) {
    return <span className="text-gray-300 text-xs">—</span>;
  }
  return (
    <span className="font-mono tabular-nums text-xs font-semibold text-green-800">
      ₪{formatILSInteger(amount)}
    </span>
  );
}

function PrimaryActionButton({
  stageInfo,
  row,
  onClick,
}: {
  stageInfo: StageInfo;
  row: InitialFilterRow;
  onClick: (kind: StageActionKind, row: InitialFilterRow) => void;
}) {
  const action = stageInfo.primaryAction;
  return (
    <Button
      size="sm"
      variant={action.variant ?? 'default'}
      onClick={() => onClick(action.kind, row)}
      className="h-7 gap-1 text-xs px-2.5"
    >
      <ActionIcon kind={action.kind} />
      {action.label}
    </Button>
  );
}

function ActionIcon({ kind }: { kind: StageActionKind }) {
  const cls = 'h-3 w-3';
  switch (kind) {
    case 'check_eligibility':
    case 'recheck':
    case 'open_calculation':
      return <Calculator className={cls} />;
    case 'send_salary_form':
    case 'send_form_reminder':
    case 'send_payment_reminder':
    case 'send_for_client_approval':
    case 'submit_to_tax_authority':
      return <Send className={cls} />;
    case 'open_submission':
    case 'view_details':
      return <Eye className={cls} />;
    default:
      return <CheckCircle2 className={cls} />;
  }
}

function RowActionsMenu({
  row,
  actions,
}: {
  row: InitialFilterRow;
  actions: UnifiedClientsTableActions;
}) {
  const isRelevant = row.is_relevant !== false;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">פעולות נוספות</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" dir="rtl">
        <DropdownMenuItem onClick={() => actions.onOpenDeepWizard(row)}>
          <Settings2 className="ms-2 h-4 w-4" />
          סיווג מסלול אחר
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onViewHistory(row)}>
          <History className="ms-2 h-4 w-4" />
          היסטוריה
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.onToggleRelevance(row)}>
          {isRelevant ? (
            <>
              <EyeOff className="ms-2 h-4 w-4" />
              סמן כלא רלוונטי
            </>
          ) : (
            <>
              <Eye className="ms-2 h-4 w-4" />
              החזר רלוונטיות
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LoadingRow() {
  return (
    <TableRow>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-40" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-6" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-7 w-32" /></TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export function UnifiedClientsTable({
  rows,
  loading,
  actions,
}: UnifiedClientsTableProps) {
  return (
    <div className="rounded-md border bg-white" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right w-[200px]">לקוח</TableHead>
            <TableHead className="text-right w-[140px]">שלב</TableHead>
            <TableHead className="text-right w-[170px]">מידע</TableHead>
            <TableHead className="text-right w-[70px]">% ירידה</TableHead>
            <TableHead className="text-right w-[110px]">סטטוס שידור</TableHead>
            <TableHead className="text-right w-[100px]">מענק מבוקש</TableHead>
            <TableHead className="text-right w-[100px]">מענק מאושר</TableHead>
            <TableHead className="text-right w-[80px]">שכ&quot;ט שנתי</TableHead>
            <TableHead className="text-right w-[200px]">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && rows.length === 0 && (
            <>
              <LoadingRow />
              <LoadingRow />
              <LoadingRow />
            </>
          )}

          {!loading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                <div className="flex flex-col items-center gap-2">
                  <ShieldOff className="h-6 w-6 text-gray-300" />
                  אין לקוחות התואמים את הסינון.
                </div>
              </TableCell>
            </TableRow>
          )}

          {rows.map((row) => {
            const stageInfo = deriveStage(row);
            return (
              <TableRow
                key={row.client_id}
                className={cn(row.is_relevant === false && 'opacity-50')}
              >
                <TableCell className="py-1.5">
                  <ClientCell row={row} />
                </TableCell>
                <TableCell className="py-1.5">
                  <StageBadge stageInfo={stageInfo} />
                </TableCell>
                <TableCell className="py-1.5">
                  <StageDetailsCell row={row} />
                </TableCell>
                <TableCell className="py-1.5">
                  <DeclineCell row={row} />
                </TableCell>
                <TableCell className="py-1.5">
                  <SubmissionStatusCell row={row} />
                </TableCell>
                <TableCell className="py-1.5">
                  <RequestedGrantCell row={row} />
                </TableCell>
                <TableCell className="py-1.5">
                  <ApprovedGrantCell row={row} />
                </TableCell>
                <TableCell className="py-1.5 text-center">
                  <RetainerIcon row={row} />
                </TableCell>
                <TableCell className="py-1.5">
                  <div className="flex items-center gap-1.5 rtl:flex-row-reverse">
                    <PrimaryActionButton
                      stageInfo={stageInfo}
                      row={row}
                      onClick={actions.onPrimaryAction}
                    />
                    <RowActionsMenu row={row} actions={actions} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default UnifiedClientsTable;
