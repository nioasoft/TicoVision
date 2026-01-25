/**
 * Mark as Paid Dialog
 *
 * UPDATED 2025-12-21: Now uses ActualPaymentService to create proper payment records
 * with VAT breakdown and deviation tracking. This ensures data consistency between
 * fee_calculations status and actual_payments table.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { actualPaymentService } from '@/services/actual-payment.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import type { PaymentMethod } from '@/types/payment.types';
import { formatILS } from '@/lib/formatters';

interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'העברה בנקאית' },
  { value: 'checks', label: "צ'קים" },
  { value: 'credit_card', label: 'כרטיס אשראי' },
  { value: 'cash', label: 'מזומן' },
];

export const MarkAsPaidDialog: React.FC<MarkAsPaidDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;

    setLoading(true);

    // Use ActualPaymentService to create proper payment record
    // This ensures: actual_payments record, deviation calculation, VAT breakdown
    const amountPaid = row.amount_after_discount || row.amount_original;

    const result = await actualPaymentService.recordPayment({
      clientId: row.client_id,
      feeCalculationId: row.fee_calculation_id,
      amountPaid: amountPaid,
      paymentDate: new Date(paymentDate),
      paymentMethod: paymentMethod,
      paymentReference: paymentReference || undefined,
    });

    setLoading(false);

    if (result.error) {
      toast.error('שגיאה', { description: result.error.message });
      return;
    }

    toast.success('התשלום נרשם בהצלחה', {
      description: 'נוצרה רשומת תשלום מלאה עם חישוב מע"מ וסטיות',
    });
    onSuccess();
    onOpenChange(false);
    setPaymentReference('');
    setPaymentMethod('bank_transfer');
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
              {formatILS(row.amount_after_discount || row.amount_original)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-method" className="rtl:text-right ltr:text-left">אמצעי תשלום</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger className="rtl:text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="payment-ref" className="rtl:text-right ltr:text-left">אסמכתא / מספר עסקה</Label>
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
