import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Mail, Copy, Share2, Loader2, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SharePdfDialogProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  pdfName: string;
  clientName: string;
}

export function SharePdfDialog({
  open,
  onClose,
  pdfUrl,
  pdfName,
  clientName,
}: SharePdfDialogProps) {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if Web Share API is available
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('הקובץ הורד בהצלחה!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pdfUrl);
      setCopied(true);
      toast.success('הלינק הועתק ללוח!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('שגיאה בהעתקת הלינק');
    }
  };

  const handleShare = async () => {
    if (!canShare) return;

    try {
      await navigator.share({
        title: `מסמך - ${clientName}`,
        text: `מסמך עובדים זרים עבור ${clientName}`,
        url: pdfUrl,
      });
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('שגיאה בשיתוף');
      }
    }
  };

  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('נא להזין כתובת מייל תקינה');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-pdf-email', {
        body: {
          to: email,
          subject: `מסמך עובדים זרים - ${clientName}`,
          pdfUrl,
          pdfName,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send email');

      toast.success('המייל נשלח בהצלחה!');
      setShowEmailInput(false);
      setEmail('');
    } catch (error) {
      console.error('Send email error:', error);
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setShowEmailInput(false);
    setEmail('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">
            <Check className="inline-block ml-2 h-5 w-5 text-green-600" />
            המסמך מוכן!
          </DialogTitle>
          <DialogDescription className="text-right">
            {clientName} - {pdfName}
          </DialogDescription>
        </DialogHeader>

        {!showEmailInput ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Download */}
            <Button
              onClick={handleDownload}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Download className="h-6 w-6" />
              <span>הורד למחשב</span>
            </Button>

            {/* Email */}
            <Button
              onClick={() => setShowEmailInput(true)}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Mail className="h-6 w-6" />
              <span>שלח למייל</span>
            </Button>

            {/* Copy Link */}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              {copied ? (
                <Check className="h-6 w-6 text-green-600" />
              ) : (
                <Copy className="h-6 w-6" />
              )}
              <span>{copied ? 'הועתק!' : 'העתק לינק'}</span>
            </Button>

            {/* Share (if available) */}
            {canShare && (
              <Button
                onClick={handleShare}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <Share2 className="h-6 w-6" />
                <span>שתף</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailInput(false)}
              className="mb-2"
            >
              <ArrowRight className="ml-1 h-4 w-4" />
              חזור
            </Button>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-right block">
                כתובת מייל
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                className="text-left"
                disabled={sending}
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={sending || !email}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Mail className="ml-2 h-4 w-4" />
                  שלח מייל
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
