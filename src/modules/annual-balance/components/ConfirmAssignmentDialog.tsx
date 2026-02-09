/**
 * ConfirmAssignmentDialog - Auditor confirms receipt of assigned file
 * Simple confirmation dialog with client details
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
import { Loader2, CheckCircle2 } from 'lucide-react';
import { formatIsraeliDate } from '@/lib/formatters';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface ConfirmAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
}

export const ConfirmAssignmentDialog: React.FC<ConfirmAssignmentDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirmAssignment } = useAnnualBalanceStore();

  const handleConfirm = async () => {
    if (!balanceCase) return;

    setSubmitting(true);
    setError(null);

    const success = await confirmAssignment(balanceCase.id);

    if (!success) {
      setError('שגיאה באישור קבלת התיק');
      setSubmitting(false);
      return;
    }

    onOpenChange(false);
    setSubmitting(false);
  };

  if (!balanceCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">אישור קבלת תיק</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">לקוח:</span>
              <span className="font-medium">{balanceCase.client?.company_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ח.פ / ע.מ:</span>
              <span>{balanceCase.client?.tax_id}</span>
            </div>
            {balanceCase.meeting_date && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">תאריך שיוך:</span>
                <span>{formatIsraeliDate(new Date(balanceCase.meeting_date))}</span>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              בלחיצה על &quot;אישור&quot; אתה מאשר שקיבלת את התיק ואתה מוכן להתחיל בעבודה.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            ביטול
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            אישור קבלת תיק
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
