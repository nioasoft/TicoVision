/**
 * UpdateStatusDialog - Generic status transition dialog with optional note
 * Reusable for steps 4-7 (in_progress, work_completed, office_approved, report_transmitted)
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, ArrowRight, AlertTriangle } from 'lucide-react';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { BALANCE_STATUSES, BALANCE_STATUS_CONFIG, getNextStatus } from '../types/annual-balance.types';
import { updateStatusSchema } from '../types/validation';
import type { AnnualBalanceSheetWithClient, BalanceStatus } from '../types/annual-balance.types';

interface UpdateStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
  targetStatus?: BalanceStatus;
  isAdmin?: boolean;
}

export const UpdateStatusDialog: React.FC<UpdateStatusDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
  targetStatus,
  isAdmin = false,
}) => {
  const [note, setNote] = useState('');
  const [selectedJumpStatus, setSelectedJumpStatus] = useState<BalanceStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanceWarning, setShowAdvanceWarning] = useState(false);
  const { refreshData, optimisticUpdateStatus } = useAnnualBalanceStore();

  // Admin jump mode: admin opened dialog with a pre-selected target (from BalanceTable dropdown)
  const isJumpMode = isAdmin && !!targetStatus;

  const nextStatus = targetStatus || (balanceCase ? getNextStatus(balanceCase.status) : null);

  // Effective target: in jump mode allow changing via dropdown, otherwise use computed nextStatus
  const effectiveTarget = isJumpMode
    ? (selectedJumpStatus || nextStatus)
    : nextStatus;

  // Detect revert mode: target status is before current status
  const isRevert = balanceCase && effectiveTarget
    ? BALANCE_STATUSES.indexOf(effectiveTarget) < BALANCE_STATUSES.indexOf(balanceCase.status)
    : false;

  // Available statuses for jump mode (exclude current + office_approved)
  const jumpStatuses = balanceCase
    ? BALANCE_STATUSES.filter((s) => s !== balanceCase.status && s !== 'office_approved')
    : [];

  const handleSubmit = async () => {
    if (!balanceCase || !effectiveTarget) return;

    // In jump mode, always require a note for accountability
    if (isJumpMode && !note.trim()) {
      setError('יש להזין הערה בעת קפיצה לשלב');
      return;
    }

    // Require note for reverts (accountability)
    if (isRevert && !note.trim()) {
      setError('יש להזין הערה בעת החזרת סטטוס');
      return;
    }

    // Guard: block in_progress if auditor not confirmed (skip for admin)
    if (effectiveTarget === 'in_progress' && !balanceCase.auditor_confirmed && !isAdmin) {
      setError('יש לאשר קבלת תיק לפני תחילת עבודה');
      return;
    }

    // Guard: warn when advancing to report_transmitted with advance rate alert
    if (effectiveTarget === 'report_transmitted' && balanceCase.advance_rate_alert && !showAdvanceWarning) {
      setShowAdvanceWarning(true);
      return;
    }

    // Zod validation
    const validation = updateStatusSchema.safeParse({
      targetStatus: effectiveTarget,
      note: note || undefined,
    });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Optimistic update - show result immediately
      optimisticUpdateStatus(balanceCase.id, effectiveTarget);
      onOpenChange(false);
      setNote('');
      setSelectedJumpStatus('');

      const result = await annualBalanceService.updateStatus(
        balanceCase.id,
        effectiveTarget,
        note || undefined,
        isAdmin
      );

      if (result.error) {
        // Revert on error by refreshing
        setError(result.error.message);
        await refreshData();
        setSubmitting(false);
        return;
      }

      // Confirm with full server data
      await refreshData();
    } catch {
      setError('שגיאה בעדכון סטטוס');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setNote('');
    setSelectedJumpStatus('');
    setError(null);
    setShowAdvanceWarning(false);
  };

  if (!balanceCase || !effectiveTarget) return null;

  const dialogTitle = isJumpMode ? 'קפיצה לשלב' : isRevert ? 'החזרת סטטוס' : 'עדכון סטטוס';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {balanceCase.client?.company_name} ({balanceCase.client?.tax_id})
          </div>

          {/* Jump mode: status selector */}
          {isJumpMode && (
            <div className="space-y-2">
              <label className="text-sm font-medium">שלב יעד:</label>
              <Select
                value={effectiveTarget}
                onValueChange={(v) => setSelectedJumpStatus(v as BalanceStatus)}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {jumpStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {BALANCE_STATUS_CONFIG[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Revert warning banner */}
          {isRevert && !isJumpMode && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">החזרת סטטוס</p>
              </div>
              <p className="text-xs text-amber-700">
                פעולה זו תחזיר את הסטטוס אחורה ותאפס חותמות זמן של השלבים שבוטלו
              </p>
            </div>
          )}

          {/* Status transition display */}
          <div className="flex items-center gap-3 justify-center py-2">
            <BalanceStatusBadge status={balanceCase.status} />
            {isRevert ? (
              <ArrowRight className="h-4 w-4 text-amber-500" />
            ) : (
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            )}
            <BalanceStatusBadge status={effectiveTarget} />
          </div>

          {/* Note - required for jump mode and reverts, optional for forward */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isJumpMode || isRevert ? 'הערה (חובה):' : 'הערה (אופציונלי):'}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isJumpMode
                  ? 'נא לציין סיבה לקפיצת שלב...'
                  : isRevert
                    ? 'נא לציין סיבת ההחזרה...'
                    : 'הוסף הערה...'
              }
              className="rtl:text-right resize-none"
              rows={3}
            />
          </div>

          {/* Advance rate warning */}
          {showAdvanceWarning && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-800">שיעור מקדמה מחושב גבוה מהנוכחי</p>
              </div>
              <p className="text-xs text-yellow-700">האם להמשיך בכל זאת?</p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            ביטול
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant={isRevert ? 'destructive' : 'default'}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {showAdvanceWarning
              ? 'המשך בכל זאת'
              : isJumpMode
                ? 'קפוץ לשלב'
                : isRevert
                  ? 'החזר סטטוס'
                  : 'עדכן סטטוס'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
