/**
 * Partial Payment Dialog
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { collectionService } from '@/services/collection.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import { formatILS } from '@/lib/formatters';

interface PartialPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

export const PartialPaymentDialog: React.FC<PartialPaymentDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;

    if (amount === '' || amount <= 0) {
      toast.error('סכום לא תקין');
      return;
    }

    if (amount > row.amount_remaining) {
      toast.error('הסכום גבוה מהיתרה הנותרת');
      return;
    }

    setLoading(true);
    const result = await collectionService.markPartialPayment(
      row.fee_calculation_id,
      amount,
      notes || undefined
    );

    setLoading(false);

    if (result.error) {
      toast.error('שגיאה', { description: result.error.message });
      return;
    }

    toast.success('התשלום החלקי נרשם בהצלחה');
    onSuccess();
    onOpenChange(false);
    setAmount('');
    setNotes('');
  };

  if (!row) return null;

  const newRemaining = row.amount_remaining - (typeof amount === 'number' ? amount : 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rtl:text-right ltr:text-left">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">רישום תשלום חלקי</DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            לקוח: {row.company_name_hebrew || row.client_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
            <div>
              <div className="text-sm text-gray-500 rtl:text-right ltr:text-left">סכום כולל</div>
              <div className="font-medium rtl:text-right ltr:text-left">{formatILS(row.amount_after_discount)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 rtl:text-right ltr:text-left">יתרה נותרת</div>
              <div className="font-medium text-orange-600 rtl:text-right ltr:text-left">
                {formatILS(row.amount_remaining)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="rtl:text-right ltr:text-left">סכום ששולם כעת</Label>
            <MoneyInput
              value={amount}
              onChange={(value) => setAmount(value)}
              className="rtl:text-right ltr:text-left"
            />
          </div>

          {amount && newRemaining >= 0 && (
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-sm text-gray-600 rtl:text-right ltr:text-left">יתרה לאחר תשלום זה:</div>
              <div className="text-xl font-bold text-blue-600 rtl:text-right ltr:text-left">
                {formatILS(newRemaining)}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="rtl:text-right ltr:text-left">הערות (אופציונלי)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות על התשלום, מספר אסמכתא, וכו'"
              rows={3}
              className="rtl:text-right ltr:text-left"
            />
          </div>

          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button type="submit" disabled={loading || !amount}>
              {loading ? 'שומר...' : 'רישום תשלום'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
