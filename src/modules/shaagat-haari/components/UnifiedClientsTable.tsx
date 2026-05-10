/**
 * UnifiedClientsTable
 *
 * The single client list that powers the unified Shaagat HaAri dashboard.
 * Each row represents one active client with their current pipeline Stage,
 * a context-aware "details" cell, a smart primary action button, and a "..."
 * menu for secondary actions.
 *
 * Column order (RTL):
 *   לקוח | שלב | פעולה | מידע | % ירידה | סטטוס שידור | מענק מבוקש | מענק מאושר | ⋯
 *
 * The client cell is clickable — opens the side drawer with full details.
 * Annual + Shaagat fee statuses live as small chips inside the client cell.
 *
 * Row density: compact (py-1.5) so 14–16 rows fit on a 1080p screen.
 */

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
import type {
  InitialFilterRow,
  SubmissionStatus,
} from '../services/shaagat.service';
import {
  deriveStage,
  type StageActionKind,
  type StageInfo,
} from '../lib/stage-derivation';
import { StageDetailsCell } from './StageDetailsCell';
import { FeeChip, type FeeChipStatus } from './FeeChip';
import { daysUntil } from './NextDeadlineBadge';
import { Clock } from 'lucide-react';

export interface UnifiedClientsTableActions {
  onPrimaryAction: (kind: StageActionKind, row: InitialFilterRow) => void;
  onOpenDeepWizard: (row: InitialFilterRow) => void;
  onViewHistory: (row: InitialFilterRow) => void;
  onToggleRelevance: (row: InitialFilterRow) => void;
  onClientClick: (row: InitialFilterRow) => void;
}

interface UnifiedClientsTableProps {
  rows: InitialFilterRow[];
  loading: boolean;
  actions: UnifiedClientsTableActions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cells
// ─────────────────────────────────────────────────────────────────────────────

function shaagatChipStatus(row: InitialFilterRow): FeeChipStatus | null {
  if (!row.eligibility_check_id) return null;
  switch (row.shaagat_fee_payment_status) {
    case 'PAID':
      return 'paid';
    case 'EXEMPT':
      return 'exempt';
    case 'UNPAID':
    default:
      return 'unpaid';
  }
}

function ClientCell({
  row,
  onClick,
}: {
  row: InitialFilterRow;
  onClick: () => void;
}) {
  const display = row.company_name_hebrew || row.company_name || '—';
  const annualStatus: FeeChipStatus = row.has_unpaid_annual_retainer
    ? 'unpaid'
    : row.has_any_current_year_fee
      ? 'paid'
      : 'exempt';
  const shaagatStatus = shaagatChipStatus(row);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-0 text-right w-full group focus:outline-none"
    >
      <div className="flex items-center gap-1 font-medium text-gray-900 text-sm leading-tight group-hover:text-blue-700 group-hover:underline underline-offset-2">
        <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="truncate">{display}</span>
      </div>
      <div className="flex items-center gap-1.5 ms-4 mt-0.5 flex-wrap">
        <span
          className="text-[11px] text-gray-500 font-mono leading-tight"
          dir="ltr"
        >
          {row.tax_id}
        </span>
        <FeeChip kind="annual" status={annualStatus} />
        {shaagatStatus && <FeeChip kind="shaagat" status={shaagatStatus} />}
      </div>
    </button>
  );
}

function StageBadge({ stageInfo }: { stageInfo: StageInfo }) {
  return (
    <Badge
      className={cn(
        'gap-1 text-[11px] px-2 py-0.5 font-medium',
        stageInfo.badgeClassName
      )}
    >
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

function nextDeadline(row: InitialFilterRow): {
  label: string;
  days: number;
} | null {
  const candidates = [
    {
      label: 'מקדמה',
      date: row.advance_due_date,
      done: !!row.advance_received,
    },
    { label: 'זכאות', date: row.determination_due_date, done: false },
    { label: 'תשלום', date: row.full_payment_due_date, done: false },
  ].filter((c) => !c.done && c.date);

  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) =>
      new Date(a.date as string).getTime() -
      new Date(b.date as string).getTime()
  );
  const days = daysUntil(candidates[0].date as string);
  if (days === null) return null;
  return { label: candidates[0].label, days };
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

  // Stages 10–11: replace "פתח שידור" / "פרטים" with deadline-as-action.
  // The action still routes to the submission page, but the label tells the
  // accountant the most urgent deadline at a glance.
  if (stageInfo.stage === 'submitted' || stageInfo.stage === 'paid_out') {
    const deadline = nextDeadline(row);
    if (deadline) {
      const colorClass =
        deadline.days < 0 || deadline.days <= 7
          ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
          : deadline.days <= 21
            ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50';
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onClick(action.kind, row)}
          className={cn(
            'h-7 w-full justify-center gap-1 text-xs px-2.5 tabular-nums',
            colorClass
          )}
        >
          <Clock className="h-3 w-3" />
          {deadline.label}: {deadline.days < 0 ? 'פג' : `${deadline.days}י׳`}
        </Button>
      );
    }
  }

  return (
    <Button
      size="sm"
      variant={action.variant ?? 'default'}
      onClick={() => onClick(action.kind, row)}
      className="h-7 w-full justify-center gap-1 text-xs px-2.5"
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
        <DropdownMenuItem onClick={() => actions.onClientClick(row)}>
          <Eye className="ms-2 h-4 w-4" />
          פרטים מלאים
        </DropdownMenuItem>
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
      <TableCell className="py-1.5"><Skeleton className="h-8 w-44" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-7 w-24" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell className="py-1.5"><Skeleton className="h-7 w-7" /></TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const TD_DIVIDER =
  '[&>td]:border-l [&>td]:border-l-gray-100 [&>td:last-child]:border-l-0 ' +
  '[&>th]:border-l [&>th]:border-l-gray-100 [&>th:last-child]:border-l-0';

export function UnifiedClientsTable({
  rows,
  loading,
  actions,
}: UnifiedClientsTableProps) {
  return (
    <div className="rounded-md border bg-white" dir="rtl">
      <Table>
        <TableHeader>
          <TableRow className={TD_DIVIDER}>
            <TableHead className="text-right w-[220px]">לקוח</TableHead>
            <TableHead className="text-right w-[110px]">שלב</TableHead>
            <TableHead className="text-right w-[150px]">פעולה</TableHead>
            <TableHead className="text-right w-[160px]">מידע</TableHead>
            <TableHead className="text-right w-[70px]">% ירידה</TableHead>
            <TableHead className="text-right w-[110px]">סטטוס שידור</TableHead>
            <TableHead className="text-right w-[110px]">מענק מבוקש</TableHead>
            <TableHead className="text-right w-[110px]">מענק מאושר</TableHead>
            <TableHead className="text-right w-[50px]"></TableHead>
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
                className={cn(
                  TD_DIVIDER,
                  row.is_relevant === false && 'opacity-50'
                )}
              >
                <TableCell className="py-1.5">
                  <ClientCell
                    row={row}
                    onClick={() => actions.onClientClick(row)}
                  />
                </TableCell>
                <TableCell className="py-1.5">
                  <StageBadge stageInfo={stageInfo} />
                </TableCell>
                <TableCell className="py-1.5">
                  <PrimaryActionButton
                    stageInfo={stageInfo}
                    row={row}
                    onClick={actions.onPrimaryAction}
                  />
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
                  <RowActionsMenu row={row} actions={actions} />
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
