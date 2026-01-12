/**
 * Resend Letter Dialog Component
 * Allows resending a letter to original recipients or new email addresses
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Mail, Loader2, Plus, X } from 'lucide-react';
import { letterHistoryService } from '@/services/letter-history.service';
import { Badge } from '@/components/ui/badge';

export interface ResendLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterId: string | null;
  originalRecipients: string[];
  onSuccess?: () => void;
}

export function ResendLetterDialog({
  open,
  onOpenChange,
  letterId,
  originalRecipients,
  onSuccess,
}: ResendLetterDialogProps) {
  const [sendMode, setSendMode] = useState<'original' | 'new'>('original');
  const [newEmails, setNewEmails] = useState<string[]>(['']);
  const [isSending, setIsSending] = useState(false);

  /**
   * Add new email input field
   */
  const addEmailField = () => {
    setNewEmails([...newEmails, '']);
  };

  /**
   * Remove email input field
   */
  const removeEmailField = (index: number) => {
    setNewEmails(newEmails.filter((_, i) => i !== index));
  };

  /**
   * Update email at specific index
   */
  const updateEmail = (index: number, value: string) => {
    const updated = [...newEmails];
    updated[index] = value;
    setNewEmails(updated);
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  /**
   * Handle send
   */
  const handleSend = async () => {
    if (!letterId) return;

    try {
      setIsSending(true);

      let result;

      if (sendMode === 'original') {
        // Resend to original recipients
        result = await letterHistoryService.resendLetter(letterId);
      } else {
        // Send to new recipients
        const validEmails = newEmails.filter(email => email.trim() && isValidEmail(email));

        if (validEmails.length === 0) {
          toast.error('נא להזין לפחות כתובת אימייל אחת תקינה');
          return;
        }

        result = await letterHistoryService.sendToNewRecipients(letterId, validEmails);
      }

      if (result.error) {
        throw result.error;
      }

      toast.success(
        sendMode === 'original'
          ? 'המכתב נשלח מחדש בהצלחה לנמענים המקוריים'
          : `המכתב נשלח בהצלחה ל-${newEmails.filter(e => e.trim()).length} נמענים`
      );

      onSuccess?.();
      onOpenChange(false);

      // Reset state
      setSendMode('original');
      setNewEmails(['']);
    } catch (error) {
      console.error('Error sending letter:', error);
      toast.error('שגיאה בשליחת המכתב');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rtl:text-right ltr:text-left">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="rtl:text-right ltr:text-left">שליחה מחדש של מכתב</DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            בחר אם לשלוח מחדש לנמענים המקוריים או להזין כתובות אימייל חדשות
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup value={sendMode} onValueChange={(value) => setSendMode(value as 'original' | 'new')}>
            {/* Original Recipients */}
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <RadioGroupItem value="original" id="original" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="original" className="text-base cursor-pointer">
                  שלח לנמענים המקוריים
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {originalRecipients.map((email, index) => (
                    <Badge key={index} variant="secondary">
                      {email}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* New Recipients */}
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <RadioGroupItem value="new" id="new" className="mt-1" />
              <div className="flex-1 space-y-3">
                <Label htmlFor="new" className="text-base cursor-pointer">
                  שלח לכתובות אימייל חדשות
                </Label>

                {sendMode === 'new' && (
                  <>
                    {newEmails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="כתובת אימייל"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          className="flex-1"
                          dir="ltr"
                        />
                        {newEmails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeEmailField(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEmailField}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      הוסף כתובת נוספת
                    </Button>
                  </>
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="rtl:flex-row-reverse ltr:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            ביטול
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                שלח מכתב
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
