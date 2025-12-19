/**
 * Mark as Paid Dialog
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { collectionService } from '@/services/collection.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';

interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

export const MarkAsPaidDialog: React.FC<MarkAsPaidDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;

    setLoading(true);
    const result = await collectionService.markAsPaid(row.fee_calculation_id, {
      fee_id: row.fee_calculation_id,
      payment_date: paymentDate,
      payment_reference: paymentReference || undefined,
    });

    setLoading(false);

    if (result.error) {
      toast.error('שגיאה', { description: result.error.message });
      return;
    }

    toast.success('התשלום סומן כשולם בהצלחה');
    onSuccess();
    onOpenChange(false);
    setPaymentReference('');
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rtl:text-right ltr:text-left">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">סימון כשולם במלואו</DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            לקוח: {row.company_name_hebrew || row.client_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="rtl:text-right ltr:text-left">סכום לתשלום</Label>
            <div className="text-2xl font-bold rtl:text-right ltr:text-left">
              {formatILS(row.amount_after_discount)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date" className="rtl:text-right ltr:text-left">תאריך תשלום</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="rtl:text-right ltr:text-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-ref" className="rtl:text-right ltr:text-left">אסמכתא / מספר עסקה (אופציונלי)</Label>
            <Input
              id="payment-ref"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="rtl:text-right ltr:text-left"
            />
          </div>

          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button type="submit" disabled={loading} className="rtl:flex-row-reverse gap-2">
              {loading ? 'שומר...' : 'סימון כשולם'}
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
