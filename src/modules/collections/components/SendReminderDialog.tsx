/**
 * Send Reminder Dialog
 * Dialog for sending manual payment reminders to clients
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { reminderService } from '@/services/reminder.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import { Mail } from 'lucide-react';

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

/**
 * Email reminder templates
 * These correspond to the reminder templates in the system
 */
const REMINDER_TEMPLATES = [
  { id: 'gentle_reminder', label: 'תזכורת עדינה - מכתב לא נפתח' },
  { id: 'selection_reminder', label: 'תזכורת לבחירת אמצעי תשלום' },
  { id: 'payment_reminder', label: 'תזכורת לביצוע תשלום' },
  { id: 'urgent_reminder', label: 'תזכורת דחופה - חובה מתארכת' },
] as const;

export const SendReminderDialog: React.FC<SendReminderDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [templateId, setTemplateId] = useState<string>('gentle_reminder');
  const [includeMistakeButton, setIncludeMistakeButton] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;

    setLoading(true);
    const result = await reminderService.sendManualReminder({
      fee_id: row.fee_calculation_id,
      template_id: templateId,
      include_mistake_button: includeMistakeButton,
    });

    setLoading(false);

    if (result.error) {
      toast.error('שגיאה בשליחת תזכורת', { description: result.error.message });
      return;
    }

    toast.success('התזכורת נשלחה בהצלחה', {
      description: `התזכורת נשלחה ללקוח ${row.company_name_hebrew || row.client_name}`,
    });
    onSuccess();
    onOpenChange(false);
    setTemplateId('gentle_reminder');
    setIncludeMistakeButton(false);
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rtl:text-right ltr:text-left max-w-md">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            שליחת תזכורת ללקוח
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            לקוח: <span className="font-medium">{row.company_name_hebrew || row.client_name}</span>
            <br />
            סכום מקורי: <span className="font-medium">₪{row.amount_original.toLocaleString()}</span>
            {row.payment_method_selected && (
              <>
                <br />
                אמצעי תשלום שנבחר: <span className="font-medium">{getPaymentMethodLabel(row.payment_method_selected)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template" className="rtl:text-right ltr:text-left">
              סוג תזכורת
            </Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger id="template" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                {REMINDER_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reminder Statistics */}
          <div className="bg-blue-50 p-3 rounded-lg text-sm rtl:text-right ltr:text-left">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ימים מאז שליחת המכתב:</span>
              <span className="font-medium">{row.days_since_sent} ימים</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-600">תזכורות שנשלחו עד כה:</span>
              <span className="font-medium">{row.reminder_count}</span>
            </div>
            {row.last_reminder_sent && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">תזכורת אחרונה:</span>
                <span className="font-medium text-xs">
                  {new Date(row.last_reminder_sent).toLocaleDateString('he-IL')}
                </span>
              </div>
            )}
          </div>

          {/* Include "I Paid" Button */}
          <div className="flex items-center gap-2 rtl:flex-row-reverse">
            <Checkbox
              id="mistake"
              checked={includeMistakeButton}
              onCheckedChange={(checked) => setIncludeMistakeButton(checked as boolean)}
            />
            <Label
              htmlFor="mistake"
              className="rtl:text-right ltr:text-left cursor-pointer text-sm"
            >
              כלול כפתור "שילמתי - טעות במערכת"
            </Label>
          </div>

          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button type="submit" disabled={loading}>
              <Mail className="h-4 w-4 ml-2" />
              {loading ? 'שולח תזכורת...' : 'שלח תזכורת'}
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

/**
 * Get Hebrew label for payment method
 */
function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    bank_transfer: 'העברה בנקאית',
    cc_single: 'כרטיס אשראי - תשלום אחד',
    cc_installments: 'כרטיס אשראי - תשלומים',
    checks: 'המחאות',
  };
  return labels[method] || method;
}
