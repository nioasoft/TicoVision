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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft } from 'lucide-react';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { getNextStatus } from '../types/annual-balance.types';
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData, optimisticUpdateStatus } = useAnnualBalanceStore();

  const nextStatus = targetStatus || (balanceCase ? getNextStatus(balanceCase.status) : null);

  const handleSubmit = async () => {
    if (!balanceCase || !nextStatus) return;

    // Zod validation
    const validation = updateStatusSchema.safeParse({
      targetStatus: nextStatus,
      note: note || undefined,
    });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Optimistic update - show result immediately
      optimisticUpdateStatus(balanceCase.id, nextStatus);
      onOpenChange(false);
      setNote('');

      const result = await annualBalanceService.updateStatus(
        balanceCase.id,
        nextStatus,
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
    setError(null);
  };

  if (!balanceCase || !nextStatus) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">עדכון סטטוס</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {balanceCase.client?.company_name} ({balanceCase.client?.tax_id})
          </div>

          {/* Status transition display */}
          <div className="flex items-center gap-3 justify-center py-2">
            <BalanceStatusBadge status={balanceCase.status} />
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <BalanceStatusBadge status={nextStatus} />
          </div>

          {/* Optional note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">הערה (אופציונלי):</label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="הוסף הערה..."
              className="rtl:text-right resize-none"
              rows={3}
            />
          </div>

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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            עדכן סטטוס
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
