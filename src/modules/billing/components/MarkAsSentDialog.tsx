/**
 * Mark As Sent Dialog
 * Dialog for marking a billing letter as sent manually (not via email system)
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Mail, FileText, Hand, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { billingLetterService } from '../services/billing-letter.service';
import type { SentMethod } from '../types/billing.types';

interface MarkAsSentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingLetterId: string;
  clientName: string;
  onSuccess?: () => void;
}

const SENT_METHOD_OPTIONS: { value: Exclude<SentMethod, 'email'>; label: string; icon: React.ReactNode }[] = [
  { value: 'manual_mail', label: 'דואר רגיל', icon: <Mail className="h-4 w-4" /> },
  { value: 'manual_hand', label: 'מסירה ידנית', icon: <Hand className="h-4 w-4" /> },
  { value: 'manual_other', label: 'אחר', icon: <HelpCircle className="h-4 w-4" /> },
];

export function MarkAsSentDialog({
  open,
  onOpenChange,
  billingLetterId,
  clientName,
  onSuccess,
}: MarkAsSentDialogProps) {
  const [sentMethod, setSentMethod] = useState<Exclude<SentMethod, 'email'>>('manual_mail');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { error } = await billingLetterService.markAsSentManually(billingLetterId, {
        sent_method: sentMethod,
        notes: notes.trim() || undefined,
      });

      if (error) throw error;

      toast.success('המכתב סומן כנשלח בהצלחה');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('Error marking as sent:', err);
      toast.error('שגיאה בסימון המכתב כנשלח');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      // Reset form
      setSentMethod('manual_mail');
      setNotes('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right flex items-center gap-2">
            <FileText className="h-5 w-5" />
            סמן כנשלח
          </DialogTitle>
          <DialogDescription className="rtl:text-right">
            סימון מכתב החיוב כנשלח ל{clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning Alert */}
          <Alert variant="warning" className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="rtl:text-right text-amber-800">
              <strong>שים לב:</strong> פעולה זו תסמן את המכתב כנשלח מחוץ למערכת.
              המכתב לא יישלח בפועל דרך המערכת.
            </AlertDescription>
          </Alert>

          {/* Sent Method Selection */}
          <div>
            <Label className="text-right block mb-3">אופן השליחה</Label>
            <RadioGroup
              value={sentMethod}
              onValueChange={(value) => setSentMethod(value as Exclude<SentMethod, 'email'>)}
              className="space-y-2"
            >
              {SENT_METHOD_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer rtl:flex-row-reverse"
                  onClick={() => setSentMethod(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex items-center gap-2 rtl:flex-row-reverse flex-1">
                    {option.icon}
                    <Label htmlFor={option.value} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-right block mb-2">
              הערות
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}

              className="text-right"
              dir="rtl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 rtl:flex-row-reverse">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            סמן כנשלח
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

MarkAsSentDialog.displayName = 'MarkAsSentDialog';
