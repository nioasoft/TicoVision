/**
 * Convert to Final Payment Dialog
 * Allows converting a partial_paid fee to final payment
 * by closing out the remaining balance with manual approval
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { collectionService } from '@/services/collection.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import { formatILS } from '@/lib/formatters';

interface ConvertToFinalPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

export const ConvertToFinalPaymentDialog: React.FC<ConvertToFinalPaymentDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!row) return null;

  const totalExpected = row.amount_after_discount || row.amount_original;
  const amountPaid = row.amount_paid || 0;
  const amountRemaining = row.amount_remaining || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!approvalNotes.trim()) {
      toast.error('יש להזין הערת אישור');
      return;
    }

    if (!row.fee_calculation_id) {
      toast.error('חסר מזהה חישוב שכר טרחה');
      return;
    }

    setLoading(true);
    const result = await collectionService.convertPartialToFinal(
      row.fee_calculation_id,
      approvalNotes.trim()
    );
    setLoading(false);

    if (result.error) {
      toast.error('שגיאה בהמרה', { description: result.error.message });
      return;
    }

    toast.success('התשלום אושר כתשלום סופי');
    onSuccess();
    onOpenChange(false);
    setApprovalNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left flex items-center gap-2 rtl:flex-row-reverse">
            <CheckCircle className="h-5 w-5 text-green-600" />
            סגירת יתרה - אישור כתשלום סופי
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {row.company_name_hebrew || row.client_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">סכום צפוי</div>
              <div className="font-semibold rtl:text-right ltr:text-left">{formatILS(totalExpected)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">שולם</div>
              <div className="font-semibold text-green-600 rtl:text-right ltr:text-left">{formatILS(amountPaid)}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">יתרה</div>
              <div className="font-semibold text-red-600 rtl:text-right ltr:text-left">{formatILS(amountRemaining)}</div>
            </div>
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="rtl:text-right ltr:text-left">
              לאחר אישור, היתרה של {formatILS(amountRemaining)} תיסגר ולא ניתן יהיה לגבות אותה.
              הפעולה תירשם כ&quot;מאושר ידנית&quot;.
            </AlertDescription>
          </Alert>

          {/* Approval Notes */}
          <div className="space-y-2">
            <Label htmlFor="approvalNotes" className="rtl:text-right ltr:text-left block">
              סיבת האישור <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="approvalNotes"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="למשל: הלקוח שילם בדרך אחרת, הסכום מעוגל, ויתור על היתרה..."
              rows={3}
              className="rtl:text-right ltr:text-left"
              required
            />
          </div>

          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button
              type="submit"
              disabled={loading || !approvalNotes.trim()}
              className="bg-green-600 hover:bg-green-700 gap-2 rtl:flex-row-reverse"
            >
              <CheckCircle className="h-4 w-4" />
              {loading ? 'שומר...' : 'אשר כתשלום סופי'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
