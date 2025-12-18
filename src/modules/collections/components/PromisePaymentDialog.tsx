/**
 * Promise Payment Dialog Component
 * Allows recording of payment promises from clients
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { collectionService } from '@/services/collection.service';
import type { CollectionRow } from '@/types/collection.types';
import { formatILS } from '@/lib/formatters';

interface PromisePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

export const PromisePaymentDialog: React.FC<PromisePaymentDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [promiseDate, setPromiseDate] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      // Set default date to next week
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setPromiseDate(nextWeek.toISOString().split('T')[0]);
      setNote('');
    }
  }, [open]);

  if (!row) return null;

  const handleSubmit = async () => {
    if (!promiseDate) {
      toast.error('יש לבחור תאריך הבטחה');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await collectionService.recordPaymentPromise(
        row.fee_calculation_id,
        new Date(promiseDate),
        note || undefined
      );

      if (result.error) {
        toast.error('שגיאה בשמירת ההבטחה', { description: result.error.message });
        return;
      }

      toast.success('הבטחת התשלום נשמרה בהצלחה');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error('שגיאה בשמירת ההבטחה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right flex items-center gap-2 rtl:flex-row-reverse">
            <Calendar className="h-5 w-5" />
            <span>רישום הבטחת תשלום</span>
          </DialogTitle>
          <DialogDescription className="rtl:text-right">
            רישום מועד שבו הלקוח הבטיח לשלם
          </DialogDescription>
        </DialogHeader>

        {/* Client Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between rtl:flex-row-reverse">
            <span className="text-sm text-gray-500">לקוח:</span>
            <span className="font-medium">{row.company_name_hebrew || row.client_name}</span>
          </div>
          <div className="flex justify-between rtl:flex-row-reverse">
            <span className="text-sm text-gray-500">סכום לגביה:</span>
            <span className="font-medium">{formatILS(row.amount_after_discount || row.amount_original)}</span>
          </div>
          <div className="flex justify-between rtl:flex-row-reverse">
            <span className="text-sm text-gray-500">ימים מאז שליחה:</span>
            <span className="font-medium">{row.days_since_sent} ימים</span>
          </div>
        </div>

        {/* Promise Date Input */}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="promise-date" className="rtl:text-right block">
              תאריך הבטחה לתשלום *
            </Label>
            <Input
              id="promise-date"
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              className="rtl:text-right"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="promise-note" className="rtl:text-right block">
              הערה (אופציונלי)
            </Label>
            <Textarea
              id="promise-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="למשל: הלקוח אמר שיעביר בהעברה בנקאית..."
              className="min-h-[80px] rtl:text-right"
              dir="rtl"
            />
          </div>
        </div>

        <DialogFooter className="rtl:flex-row-reverse gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !promiseDate}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                שומר...
              </>
            ) : (
              'שמור הבטחה'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

PromisePaymentDialog.displayName = 'PromisePaymentDialog';
