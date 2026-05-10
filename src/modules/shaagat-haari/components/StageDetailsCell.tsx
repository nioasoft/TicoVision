/**
 * StageDetailsCell
 *
 * "Soft" progress hint per row on the unified dashboard. Shows a short, stage-
 * specific bit of context that does NOT duplicate the dedicated columns
 * (`% ירידה`, `סטטוס שידור`, `מענק מבוקש`, `מענק מאושר`).
 *
 * Pure function of the row's derived stage. Returns just enough text to
 * answer "what's the next thing happening with this client?".
 */

import type { InitialFilterRow } from '../services/shaagat.service';
import { deriveStage } from '../lib/stage-derivation';
import { NextDeadlineBadge } from './NextDeadlineBadge';

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

interface StageDetailsCellProps {
  row: InitialFilterRow;
}

export function StageDetailsCell({ row }: StageDetailsCellProps) {
  const { stage } = deriveStage(row);

  switch (stage) {
    case 'not_checked':
      return <span className="text-gray-400">—</span>;

    case 'not_eligible':
      return <span className="text-xs text-red-700">מתחת לסף</span>;

    case 'gray_area':
      return <span className="text-xs text-orange-700">בתחום אפור</span>;

    case 'eligible_pending_email':
      return <span className="text-xs text-emerald-700">מחכה לשליחת מייל</span>;

    case 'eligible_pending_form': {
      const days = daysSince(row.check_created_at);
      return (
        <span className="text-xs text-blue-700">
          {days !== null ? `מייל נשלח לפני ${days} ימים` : 'מייל נשלח'}
        </span>
      );
    }

    case 'pending_payment':
      return (
        <span className="text-xs text-yellow-800">
          טופס מולא • ממתין שכ&quot;ט הגשה
        </span>
      );

    case 'in_calculation':
      return (
        <span className="text-xs text-indigo-700 tabular-nums">
          חישוב — שלב {row.calculation_step ?? 1}/4
        </span>
      );

    case 'awaiting_approval':
      return (
        <span className="text-xs text-purple-700">ממתין לאישור הלקוח</span>
      );

    case 'approved_pending_submission':
      return <span className="text-xs text-teal-700">מוכן לשידור</span>;

    case 'submitted':
      // Deadline only — submission # + status + amounts are in their own columns.
      return <NextDeadlineBadge data={row} size="xs" />;

    case 'paid_out':
      return <span className="text-xs text-green-800">תיק סגור</span>;

    default:
      return <span className="text-gray-400">—</span>;
  }
}

export default StageDetailsCell;
