/**
 * NextDeadlineBadge
 *
 * Compact pill that surfaces the nearest upcoming submission deadline (advance,
 * documents, determination, or full payment) with color-coded urgency:
 *   • Red   — overdue or ≤ 7 days
 *   • Orange — ≤ 21 days
 *   • Gray  — > 21 days
 *
 * Originally implemented inline inside `TaxSubmissionsPage`; extracted so the
 * unified dashboard's StageDetailsCell can show the same widget for clients in
 * the "submitted" stage.
 */

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeadlineCandidates {
  advance_due_date?: string | null;
  advance_received?: boolean | null;
  documents_due_date?: string | null;
  determination_due_date?: string | null;
  full_payment_due_date?: string | null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

interface NextDeadlineBadgeProps {
  data: DeadlineCandidates;
  /** Smaller variant for tight rows (default `'md'`). */
  size?: 'xs' | 'md';
}

export function NextDeadlineBadge({ data, size = 'md' }: NextDeadlineBadgeProps) {
  const candidates = [
    { label: 'מקדמה', date: data.advance_due_date, done: !!data.advance_received },
    { label: 'מסמכים', date: data.documents_due_date, done: false },
    { label: 'זכאות', date: data.determination_due_date, done: false },
    { label: 'תשלום', date: data.full_payment_due_date, done: false },
  ].filter((c) => !c.done && c.date);

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
  );
  const next = candidates[0];
  const days = daysUntil(next.date);
  if (days === null) return null;

  const color =
    days < 0
      ? 'text-red-600 bg-red-50'
      : days <= 7
      ? 'text-red-600 bg-red-50'
      : days <= 21
      ? 'text-orange-600 bg-orange-50'
      : 'text-gray-500 bg-gray-50';

  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-1 py-0.5 gap-0.5'
      : 'text-xs px-1.5 py-0.5 gap-1';
  const iconSize = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <span
      className={cn('inline-flex items-center rounded', sizeClasses, color)}
      title={`דדליין ${next.label} בעוד ${days} ימים`}
    >
      <Clock className={iconSize} />
      {next.label}: {days < 0 ? 'פג' : `${days}י׳`}
    </span>
  );
}

export default NextDeadlineBadge;
