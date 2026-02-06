/**
 * UpdateAdvancesDialog - Update tax advances amount and optional letter link
 * Available to accountant and admin roles
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { updateAdvancesSchema } from '../types/validation';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface UpdateAdvancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
}

export const UpdateAdvancesDialog: React.FC<UpdateAdvancesDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
}) => {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData } = useAnnualBalanceStore();

  useEffect(() => {
    if (open && balanceCase?.new_advances_amount) {
      setAmount(String(balanceCase.new_advances_amount));
    }
  }, [open, balanceCase]);

  const handleSubmit = async () => {
    if (!balanceCase) return;

    const numAmount = parseFloat(amount);

    // Zod validation
    const validation = updateAdvancesSchema.safeParse({ amount: numAmount });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await annualBalanceService.updateAdvances(
        balanceCase.id,
        numAmount
      );

      if (result.error) {
        setError(result.error.message);
        setSubmitting(false);
        return;
      }

      // Also advance status to advances_updated if at report_transmitted
      if (balanceCase.status === 'report_transmitted') {
        await annualBalanceService.updateStatus(balanceCase.id, 'advances_updated');
      }

      await refreshData();
      onOpenChange(false);
    } catch {
      setError('שגיאה בעדכון מקדמות');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setAmount('');
    setError(null);
  };

  if (!balanceCase) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">עדכון מקדמות</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {balanceCase.client?.company_name} ({balanceCase.client?.tax_id})
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">סכום מקדמות חדש (₪):</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="rtl:text-right"
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
          <Button onClick={handleSubmit} disabled={submitting || !amount}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            עדכן מקדמות
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
