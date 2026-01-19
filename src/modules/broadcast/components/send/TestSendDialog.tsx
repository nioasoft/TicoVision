/**
 * Test Send Dialog - Send test emails before broadcast
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
import { Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { useBroadcastStore } from '../../store/broadcastStore';
import { toast } from 'sonner';

interface TestSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  content: string;
}

const DEFAULT_TEST_EMAILS = 'asaf@franco.co.il, tico@franco.co.il';

export const TestSendDialog: React.FC<TestSendDialogProps> = ({
  open,
  onOpenChange,
  subject,
  content,
}) => {
  const { sendTestEmail } = useBroadcastStore();

  const [testEmails, setTestEmails] = useState(DEFAULT_TEST_EMAILS);
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const handleSend = async () => {
    // Validation
    if (!testEmails.trim()) {
      toast.error('נא להזין כתובות מייל לבדיקה');
      return;
    }
    if (!subject.trim()) {
      toast.error('נא למלא נושא למייל לפני שליחת בדיקה');
      return;
    }
    if (!content.trim()) {
      toast.error('נא למלא תוכן למייל לפני שליחת בדיקה');
      return;
    }

    // Parse emails
    const emails = testEmails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      toast.error('נא להזין לפחות כתובת מייל אחת');
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const sendResult = await sendTestEmail({
        subject,
        content,
        testEmails: emails,
      });

      if (sendResult) {
        setResult(sendResult);
        if (sendResult.sent > 0 && sendResult.failed === 0) {
          toast.success(`נשלחו ${sendResult.sent} מיילי בדיקה בהצלחה!`);
        } else if (sendResult.sent > 0) {
          toast.warning(`נשלחו ${sendResult.sent}, נכשלו ${sendResult.failed}`);
        } else {
          toast.error('כל המיילים נכשלו');
        }
      } else {
        toast.error('שגיאה בשליחת בדיקה');
      }
    } catch {
      toast.error('שגיאה בשליחת בדיקה');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right">שליחת בדיקה</DialogTitle>
          <DialogDescription className="rtl:text-right">
            שלח את תוכן ההפצה למיילים ספציפיים לפני שליחה לכל הנמענים
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="testEmails" className="rtl:text-right">
              כתובות מייל לבדיקה
            </Label>
            <Input
              id="testEmails"
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              placeholder="כתובות מופרדות בפסיק"
              className="rtl:text-right font-mono text-sm"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground rtl:text-right">
              הפרד מספר כתובות בפסיק
            </p>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg rtl:text-right">
            <p className="font-medium text-foreground mb-1">נושא המייל:</p>
            <p className="font-mono">[TEST] {subject || '(לא הוגדר)'}</p>
          </div>

          {/* Result display */}
          {result && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{result.sent} נשלחו</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">{result.failed} נכשלו</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="rtl:flex-row-reverse">
          <Button variant="outline" onClick={handleClose}>
            סגור
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 ml-2" />
                שלח בדיקה
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
