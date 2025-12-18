/**
 * Send WhatsApp Dialog Component
 * Dialog for sending WhatsApp reminders to clients
 */

import React, { useState, useMemo } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { collectionService } from '@/services/collection.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import { formatILS } from '@/lib/formatters';
import { MessageCircle, ExternalLink, Copy, AlertTriangle } from 'lucide-react';

interface SendWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

/**
 * WhatsApp message templates
 */
const WHATSAPP_TEMPLATES = [
  {
    id: 'gentle_reminder',
    label: 'תזכורת עדינה',
    getMessage: (clientName: string, amount: number, tenantName: string) =>
      `שלום ${clientName},

זוהי תזכורת ידידותית בנוגע למכתב שכר הטרחה ששלחנו אליך.

סכום לתשלום: ${formatILS(amount)}

נשמח לעמוד לרשותך לכל שאלה.

${tenantName}`,
  },
  {
    id: 'payment_selection',
    label: 'בקשה לבחירת אמצעי תשלום',
    getMessage: (clientName: string, amount: number, tenantName: string) =>
      `שלום ${clientName},

שמנו לב שטרם בחרת אמצעי תשלום עבור מכתב שכר הטרחה.

סכום לתשלום: ${formatILS(amount)}

אנא היכנס/י לקישור במייל ובחר/י את אמצעי התשלום המועדף עליך.

${tenantName}`,
  },
  {
    id: 'payment_request',
    label: 'בקשת תשלום',
    getMessage: (clientName: string, amount: number, tenantName: string) =>
      `שלום ${clientName},

תזכורת בנוגע לתשלום שכר הטרחה שטרם התקבל.

סכום לתשלום: ${formatILS(amount)}

נודה לביצוע התשלום בהקדם האפשרי.

${tenantName}`,
  },
  {
    id: 'urgent',
    label: 'תזכורת דחופה',
    getMessage: (clientName: string, amount: number, tenantName: string) =>
      `שלום ${clientName},

פנייה דחופה בנוגע לתשלום שכר טרחה שטרם התקבל.

סכום לתשלום: ${formatILS(amount)}

נבקש לטפל בנושא בהקדם.

${tenantName}`,
  },
] as const;

/**
 * Format phone number for WhatsApp (Israeli format)
 */
function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle Israeli numbers
  if (digits.startsWith('0')) {
    // Convert 05X to 9725X
    digits = '972' + digits.substring(1);
  } else if (!digits.startsWith('972')) {
    // Add Israeli prefix if missing
    digits = '972' + digits;
  }

  return digits;
}

export const SendWhatsAppDialog: React.FC<SendWhatsAppDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [templateId, setTemplateId] = useState<string>('gentle_reminder');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get the selected template
  const selectedTemplate = useMemo(() => {
    return WHATSAPP_TEMPLATES.find((t) => t.id === templateId) || WHATSAPP_TEMPLATES[0];
  }, [templateId]);

  // Generate the message
  const message = useMemo(() => {
    if (!row) return '';
    if (useCustom) return customMessage;

    const clientName = row.company_name_hebrew || row.client_name;
    const amount = row.amount_after_discount || row.amount_original;
    // TODO: Get actual tenant name from context
    const tenantName = 'משרד רואי החשבון';

    return selectedTemplate.getMessage(clientName, amount, tenantName);
  }, [row, useCustom, customMessage, selectedTemplate]);

  // Generate WhatsApp link
  const whatsappLink = useMemo(() => {
    if (!row?.contact_phone) return null;
    const formattedPhone = formatPhoneForWhatsApp(row.contact_phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }, [row?.contact_phone, message]);

  // Handle sending
  const handleSend = async () => {
    if (!row || !whatsappLink) return;

    setLoading(true);

    try {
      // Log the interaction
      const result = await collectionService.logInteraction({
        client_id: row.client_id,
        fee_id: row.fee_calculation_id,
        interaction_type: 'whatsapp',
        direction: 'outbound',
        subject: `תזכורת WhatsApp - ${selectedTemplate.label}`,
        content: message,
      });

      if (result.error) {
        toast.error('שגיאה ברישום האינטראקציה', { description: result.error.message });
      }

      // Open WhatsApp in new tab
      window.open(whatsappLink, '_blank');

      toast.success('הודעת WhatsApp הוכנה', {
        description: 'WhatsApp נפתח בחלון חדש. שלח/י את ההודעה כדי להשלים.',
      });

      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('שגיאה בפתיחת WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // Copy message to clipboard
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('ההודעה הועתקה ללוח');
    } catch {
      toast.error('שגיאה בהעתקת ההודעה');
    }
  };

  if (!row) return null;

  const hasPhone = !!row.contact_phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rtl:text-right ltr:text-left max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left flex items-center gap-2 rtl:flex-row-reverse">
            <MessageCircle className="h-5 w-5 text-green-600" />
            שליחת הודעת WhatsApp
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            לקוח: <span className="font-medium">{row.company_name_hebrew || row.client_name}</span>
            <br />
            סכום: <span className="font-medium">{formatILS(row.amount_after_discount || row.amount_original)}</span>
            {row.contact_phone && (
              <>
                <br />
                טלפון: <span className="font-medium ltr" dir="ltr">{row.contact_phone}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {!hasPhone ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 rtl:flex-row-reverse">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="rtl:text-right">
              <div className="font-medium text-amber-800">אין מספר טלפון</div>
              <div className="text-sm text-amber-700 mt-1">
                לא נמצא מספר טלפון עבור לקוח זה. יש להוסיף מספר טלפון בכרטיס הלקוח.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template" className="rtl:text-right ltr:text-left">
                תבנית הודעה
              </Label>
              <Select
                value={useCustom ? 'custom' : templateId}
                onValueChange={(value) => {
                  if (value === 'custom') {
                    setUseCustom(true);
                    setCustomMessage(message);
                  } else {
                    setUseCustom(false);
                    setTemplateId(value);
                  }
                }}
              >
                <SelectTrigger id="template" className="rtl:text-right ltr:text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rtl:text-right ltr:text-left">
                  {WHATSAPP_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">הודעה מותאמת אישית</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message Preview/Edit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="message" className="rtl:text-right ltr:text-left">
                  {useCustom ? 'הודעה' : 'תצוגה מקדימה'}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyMessage}
                  className="h-7 text-xs gap-1"
                >
                  <Copy className="h-3 w-3" />
                  העתק
                </Button>
              </div>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => {
                  if (useCustom) {
                    setCustomMessage(e.target.value);
                  }
                }}
                readOnly={!useCustom}
                className={`min-h-[180px] rtl:text-right ${!useCustom ? 'bg-muted/50' : ''}`}
                dir="rtl"
              />
            </div>

            {/* Reminder Statistics */}
            <div className="bg-blue-50 p-3 rounded-lg text-sm rtl:text-right ltr:text-left">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ימים מאז שליחת המכתב:</span>
                <span className="font-medium">{row.days_since_sent} ימים</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-600">תזכורות שנשלחו:</span>
                <span className="font-medium">{row.reminder_count}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="rtl:flex-row-reverse gap-2">
          <Button
            type="button"
            onClick={handleSend}
            disabled={loading || !hasPhone}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="h-4 w-4" />
            {loading ? 'פותח WhatsApp...' : 'פתח ב-WhatsApp'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

SendWhatsAppDialog.displayName = 'SendWhatsAppDialog';
