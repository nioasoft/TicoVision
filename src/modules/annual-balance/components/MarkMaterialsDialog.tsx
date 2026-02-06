/**
 * MarkMaterialsDialog - Date picker + confirm for marking materials received
 * Available to all roles (bookkeeper uses RPC, accountant/admin use direct update)
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsraeliDate } from '@/lib/formatters';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { markMaterialsSchema } from '../types/validation';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface MarkMaterialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
  userRole: string;
}

export const MarkMaterialsDialog: React.FC<MarkMaterialsDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
  userRole,
}) => {
  const [date, setDate] = useState<Date>(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData, optimisticUpdateStatus } = useAnnualBalanceStore();

  const handleSubmit = async () => {
    if (!balanceCase) return;

    // Zod validation
    const validation = markMaterialsSchema.safeParse({ receivedAt: date });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let result;
      if (userRole === 'bookkeeper') {
        result = await annualBalanceService.markMaterialsReceived(
          balanceCase.id,
          date.toISOString()
        );
      } else {
        result = await annualBalanceService.updateStatus(
          balanceCase.id,
          'materials_received'
        );
      }

      if (result.error) {
        setError(result.error.message);
        setSubmitting(false);
        return;
      }

      // Optimistic update
      optimisticUpdateStatus(balanceCase.id, 'materials_received');
      onOpenChange(false);
      await refreshData();
    } catch {
      setError('שגיאה בעדכון סטטוס');
    }
    setSubmitting(false);
  };

  if (!balanceCase) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">סימון הגעת חומר</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {balanceCase.client?.company_name} ({balanceCase.client?.tax_id})
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">תאריך קבלה:</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-[200px] justify-start text-right font-normal',
                    !date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="ml-2 h-4 w-4" />
                  {formatIsraeliDate(date)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
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
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            אישור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
