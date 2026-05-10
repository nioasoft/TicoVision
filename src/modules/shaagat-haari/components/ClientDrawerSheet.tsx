/**
 * ClientDrawerSheet
 *
 * Side drawer that opens when the user clicks a client name on the unified
 * dashboard. Read-only consolidated view of everything the firm knows about
 * the client's Shaagat HaAri lifecycle, with deep-link buttons to the existing
 * wizard pages.
 *
 * Sections:
 *   1. Header        — name, tax_id, fee chips
 *   2. Current stage — stage label + primary action button
 *   3. Fees          — annual retainer + Shaagat service fee status
 *   4. Eligibility   — date, result, decline %, track type
 *   5. Calculation   — current step, requested amount
 *   6. Submission    — number, date, deadlines, received amount
 *   7. Links         — full history page + general client card
 *
 * MVP scope: read-only. Editing happens in the existing wizard pages. The
 * drawer's purpose is to surface the full picture without forcing the user
 * to navigate.
 */

import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Eye,
  History,
  Send,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatILSInteger, formatPercentage } from '@/lib/formatters';
import type { InitialFilterRow } from '../services/shaagat.service';
import {
  deriveStage,
  type StageActionKind,
} from '../lib/stage-derivation';
import { FeeChip, type FeeChipStatus } from './FeeChip';
import { NextDeadlineBadge } from './NextDeadlineBadge';

interface ClientDrawerSheetProps {
  row: InitialFilterRow | null;
  open: boolean;
  onClose: () => void;
  onPrimaryAction: (kind: StageActionKind, row: InitialFilterRow) => void;
}

const ELIGIBILITY_STATUS_LABEL: Record<string, string> = {
  ELIGIBLE: 'זכאי',
  NOT_ELIGIBLE: 'לא זכאי',
  GRAY_AREA: 'אזור אפור',
};

const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'שודר',
  IN_REVIEW: 'בבדיקה',
  OBJECTIONS: 'השגה',
  PARTIAL_PAYMENT: 'תשלום חלקי',
  FULL_PAYMENT: 'תשלום מלא',
  CLOSED: 'סגור',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

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

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

function FieldRow({ label, value, className }: FieldRowProps) {
  return (
    <div className={cn('flex items-center justify-between text-sm', className)}>
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value ?? '—'}</span>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <section className="space-y-2">
      <header className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <span className="text-gray-400">{icon}</span>
        {title}
      </header>
      <div className="space-y-1.5 ps-6">{children}</div>
    </section>
  );
}

export function ClientDrawerSheet({
  row,
  open,
  onClose,
  onPrimaryAction,
}: ClientDrawerSheetProps) {
  const navigate = useNavigate();

  if (!row) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          dir="rtl"
          className="w-[480px] sm:max-w-[480px] [&>button.absolute]:hidden"
        />
      </Sheet>
    );
  }

  const stageInfo = deriveStage(row);
  const annualStatus: FeeChipStatus = row.has_unpaid_annual_retainer
    ? 'unpaid'
    : row.has_any_current_year_fee
      ? 'paid'
      : 'exempt';
  const shaagatStatus = shaagatChipStatus(row);
  const display = row.company_name_hebrew || row.company_name || '—';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        dir="rtl"
        className="w-[480px] sm:max-w-[480px] overflow-y-auto [&>button.absolute]:hidden p-0"
      >
        {/* Custom close button — left side, away from RTL title */}
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 pt-12">
        {/* Header */}
        <SheetHeader className="text-right space-y-2">
          <SheetTitle className="flex items-center gap-2 text-right">
            <Building2 className="h-5 w-5 text-gray-400" />
            <span>{display}</span>
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-[12px] font-mono text-gray-500"
              dir="ltr"
            >
              {row.tax_id}
            </span>
            <Badge
              className={cn('text-[11px] font-medium', stageInfo.badgeClassName)}
            >
              {stageInfo.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <FeeChip kind="annual" status={annualStatus} />
            {shaagatStatus && (
              <FeeChip kind="shaagat" status={shaagatStatus} />
            )}
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Section: Current stage + primary action */}
        <Section
          title="פעולה נוכחית"
          icon={<ClipboardCheck className="h-4 w-4" />}
        >
          <p className="text-xs text-gray-500 leading-relaxed">
            על בסיס הנתונים הקיימים ללקוח, השלב הנוכחי הוא:
            <span className="text-gray-800 font-medium"> {stageInfo.label}</span>
          </p>
          <Button
            size="sm"
            variant={stageInfo.primaryAction.variant ?? 'default'}
            className="w-full justify-center gap-1.5 h-9"
            onClick={() => {
              onPrimaryAction(stageInfo.primaryAction.kind, row);
              onClose();
            }}
          >
            <Send className="h-3.5 w-3.5" />
            {stageInfo.primaryAction.label}
          </Button>
        </Section>

        <Separator className="my-4" />

        {/* Section: Fees */}
        <Section title="שכר טרחה" icon={<Wallet className="h-4 w-4" />}>
          <FieldRow
            label="שכ&quot;ט שנתי"
            value={
              row.has_unpaid_annual_retainer ? (
                <span className="text-amber-700">לא שולם</span>
              ) : row.has_any_current_year_fee ? (
                <span className="text-green-700">שולם</span>
              ) : (
                <span className="text-gray-400">—</span>
              )
            }
          />
          <FieldRow
            label="שכ&quot;ט הגשה"
            value={
              !row.eligibility_check_id ? (
                <span className="text-gray-400">—</span>
              ) : row.shaagat_fee_payment_status === 'PAID' ? (
                <span className="text-green-700">שולם</span>
              ) : row.shaagat_fee_payment_status === 'EXEMPT' ? (
                <span className="text-gray-500">פטור</span>
              ) : (
                <span className="text-red-700">
                  לא שולם · 1,350 ₪ + מע&quot;מ
                </span>
              )
            }
          />
        </Section>

        <Separator className="my-4" />

        {/* Section: Eligibility */}
        <Section
          title="בדיקת זכאות"
          icon={<CheckCircle2 className="h-4 w-4" />}
        >
          <FieldRow label="תאריך" value={formatDate(row.check_created_at)} />
          <FieldRow
            label="תוצאה"
            value={
              row.eligibility_status
                ? ELIGIBILITY_STATUS_LABEL[row.eligibility_status] ??
                  row.eligibility_status
                : '—'
            }
          />
          <FieldRow
            label="% ירידה"
            value={
              row.decline_percentage !== null &&
              row.decline_percentage !== undefined ? (
                <span className="font-mono tabular-nums">
                  {formatPercentage(row.decline_percentage)}
                </span>
              ) : (
                '—'
              )
            }
          />
          <FieldRow label="מסלול" value={row.track_type ?? '—'} />
        </Section>

        <Separator className="my-4" />

        {/* Section: Calculation */}
        <Section title="חישוב מפורט" icon={<Calculator className="h-4 w-4" />}>
          <FieldRow
            label="שלב"
            value={
              row.calculation_step !== null && row.calculation_step !== undefined
                ? `${row.calculation_step}/4`
                : '—'
            }
          />
          <FieldRow
            label="הושלם"
            value={
              row.calculation_completed === true ? (
                <span className="text-green-700">כן</span>
              ) : row.calculation_completed === false ? (
                <span className="text-amber-700">לא</span>
              ) : (
                '—'
              )
            }
          />
          <FieldRow
            label="אישור הלקוח"
            value={
              row.client_approved === true ? (
                <span className="text-green-700">
                  {formatDate(row.client_approved_at)}
                </span>
              ) : (
                '—'
              )
            }
          />
          <FieldRow
            label="סכום מחושב"
            value={
              row.final_grant_amount ? (
                <span className="font-mono tabular-nums">
                  ₪{formatILSInteger(row.final_grant_amount)}
                </span>
              ) : (
                '—'
              )
            }
          />
          {row.eligibility_check_id && (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center gap-1.5 mt-1"
              onClick={() => {
                navigate(
                  `/shaagat-haari/calculation/${row.eligibility_check_id}`
                );
                onClose();
              }}
            >
              <ExternalLink className="h-3 w-3" />
              פתח חישוב
            </Button>
          )}
        </Section>

        <Separator className="my-4" />

        {/* Section: Submission */}
        <Section title="שידור לרשות המסים" icon={<Send className="h-4 w-4" />}>
          <FieldRow
            label="מספר שידור"
            value={row.submission_number ?? '—'}
          />
          <FieldRow
            label="תאריך שידור"
            value={formatDate(row.submission_date)}
          />
          <FieldRow
            label="סטטוס"
            value={
              row.submission_status
                ? SUBMISSION_STATUS_LABEL[row.submission_status] ??
                  row.submission_status
                : '—'
            }
          />
          <FieldRow
            label="מענק מבוקש"
            value={
              row.expected_amount ? (
                <span className="font-mono tabular-nums">
                  ₪{formatILSInteger(row.expected_amount)}
                </span>
              ) : (
                '—'
              )
            }
          />
          <FieldRow
            label="מענק מאושר"
            value={
              row.received_amount ? (
                <span className="font-mono tabular-nums text-green-700">
                  ₪{formatILSInteger(row.received_amount)}
                </span>
              ) : (
                '—'
              )
            }
          />
          {row.submission_id && (
            <div className="pt-1">
              <NextDeadlineBadge data={row} size="md" />
            </div>
          )}
          {row.submission_id && (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center gap-1.5 mt-1"
              onClick={() => {
                navigate(
                  `/shaagat-haari/submissions?clientId=${row.client_id}`
                );
                onClose();
              }}
            >
              <ExternalLink className="h-3 w-3" />
              פתח שידור
            </Button>
          )}
        </Section>

        <Separator className="my-4" />

        {/* Section: Links */}
        <Section title="קישורים" icon={<History className="h-4 w-4" />}>
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-center gap-1.5"
            onClick={() => {
              navigate(`/shaagat-haari/client/${row.client_id}/history`);
              onClose();
            }}
          >
            <History className="h-3 w-3" />
            היסטוריה מלאה
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-center gap-1.5"
            onClick={() => {
              navigate(`/shaagat-haari/eligibility/${row.client_id}`);
              onClose();
            }}
          >
            <Eye className="h-3 w-3" />
            סיווג מסלול אחר
          </Button>
        </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ClientDrawerSheet;
