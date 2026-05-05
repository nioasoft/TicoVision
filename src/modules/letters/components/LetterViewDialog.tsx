/**
 * Letter View Dialog Component
 * Displays a letter that was previously sent/generated
 * Shows HTML preview with actions to resend, print, etc.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Mail, Printer, Loader2, Download, BellRing } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { buildReminderHtml } from '@/lib/letter-reminder';

export interface LetterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterId: string | null;
  onResend?: (recipients: string[]) => void;
  /** Show the letter as a reminder preview (red banner + today's date). */
  reminderMode?: boolean;
  /** Tax year shown in the reminder banner (e.g. 2026). */
  reminderTaxYear?: number;
  /** Called when the user confirms sending the reminder. */
  onConfirmReminder?: (letterId: string, recipients: string[]) => Promise<void> | void;
}

interface GeneratedLetter {
  id: string;
  client_id: string;
  template_type: string | null;
  subject: string | null;
  generated_content_html: string;
  recipient_emails: string[];
  sent_at: string | null;
  status: string;
  opened_at: string | null;
  open_count: number;
}

export function LetterViewDialog({
  open,
  onOpenChange,
  letterId,
  onResend,
  reminderMode = false,
  reminderTaxYear,
  onConfirmReminder,
}: LetterViewDialogProps) {
  const [letter, setLetter] = useState<GeneratedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  /**
   * Load letter from database
   */
  useEffect(() => {
    if (open && letterId) {
      loadLetter();
    }
  }, [open, letterId]);

  const loadLetter = async () => {
    if (!letterId) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;

      setLetter(data);
      setPdfUrl(data.pdf_url || null);
    } catch (error) {
      console.error('Error loading letter:', error);
      toast.error('שגיאה בטעינת המכתב');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Convert CID images to Supabase Storage URLs for browser display
   */
  const convertHtmlForDisplay = (html: string): string => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL.replace('/rest/v1', '');
    const bucket = 'letter-assets-v2';

    const imageMap: Record<string, string> = {
      'cid:tico_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_logo_png_new.png`,
      'cid:franco_logo_new': `${baseUrl}/storage/v1/object/public/${bucket}/Tico_franco_co.png`,
      'cid:tagline': `${baseUrl}/storage/v1/object/public/${bucket}/tagline.png`,
      'cid:tico_logo': `${baseUrl}/storage/v1/object/public/${bucket}/tico_logo_240.png`,
      'cid:franco_logo': `${baseUrl}/storage/v1/object/public/${bucket}/franco-logo-hires.png`,
      'cid:bullet_star': `${baseUrl}/storage/v1/object/public/${bucket}/bullet-star.png`,
      'cid:bullet_star_blue': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_blue.png`,
      'cid:bullet_star_darkred': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_darkred.png`,
      'cid:tico_signature': `${baseUrl}/storage/v1/object/public/${bucket}/tico_signature.png`,
      'cid:icon_star': `${baseUrl}/storage/v1/object/public/${bucket}/icon-star.png`,
      'cid:icon_building': `${baseUrl}/storage/v1/object/public/${bucket}/icon-building.png`,
      'cid:icon_phone': `${baseUrl}/storage/v1/object/public/${bucket}/icon-phone.png`,
      'cid:icon_email': `${baseUrl}/storage/v1/object/public/${bucket}/icon-email.png`,
    };

    let result = html;

    for (const [cid, url] of Object.entries(imageMap)) {
      result = result.replace(new RegExp(cid, 'g'), url);
    }

    return result;
  };

  /**
   * Print letter
   */
  const handlePrint = () => {
    if (!letter) return;

    setIsPrinting(true);

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const sourceHtml = reminderMode
      ? buildReminderHtml(letter.generated_content_html, { taxYear: reminderTaxYear })
      : letter.generated_content_html;
    const displayHtml = convertHtmlForDisplay(sourceHtml);

    iframe.contentDocument?.open();
    iframe.contentDocument?.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${displayHtml}
      </body>
      </html>
    `);
    iframe.contentDocument?.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsPrinting(false);
      }, 100);
    };
  };

  /**
   * Generate PDF using Browserless API
   */
  const handleDownloadPdf = async () => {
    if (!letterId) return;

    try {
      setGeneratingPdf(true);

      // Call generate-pdf Edge Function
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { letterId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'PDF generation failed');

      setPdfUrl(data.pdfUrl);
      toast.success('PDF נוצר בהצלחה');

      // Open PDF in new tab
      window.open(data.pdfUrl, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה ביצירת PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!letter && !isLoading) {
    return null;
  }

  const displayedHtml = letter
    ? convertHtmlForDisplay(
        reminderMode
          ? buildReminderHtml(letter.generated_content_html, { taxYear: reminderTaxYear })
          : letter.generated_content_html
      )
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col rtl:text-right ltr:text-left">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="rtl:text-right ltr:text-left">
            {reminderMode ? `תזכורת: ${letter?.subject || 'מכתב שכר טרחה'}` : (letter?.subject || 'צפייה במכתב')}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {reminderMode ? (
              <span>תצוגה מקדימה לתזכורת — נמענים: {letter?.recipient_emails.join(', ')}</span>
            ) : letter?.sent_at ? (
              <span>
                נשלח ב-{new Date(letter.sent_at).toLocaleString('he-IL')}
                {' • '}
                נמענים: {letter.recipient_emails.join(', ')}
                {letter.open_count > 0 && ` • נפתח ${letter.open_count} ${letter.open_count === 1 ? 'פעם' : 'פעמים'}`}
              </span>
            ) : (
              'טיוטה - לא נשלח'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-md bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : letter ? (
            <div
              dangerouslySetInnerHTML={{ __html: displayedHtml }}
              className="select-text p-4"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          ) : null}
        </div>

        <DialogFooter className="rtl:flex-row-reverse ltr:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rtl:ml-auto ltr:mr-auto"
          >
            סגור
          </Button>

          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isPrinting || !letter}
          >
            {isPrinting ? (
              <>
                <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                מדפיס...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                הדפסה
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={!letter || generatingPdf}
          >
            {generatingPdf ? (
              <>
                <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                יוצר PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                {pdfUrl ? 'הורד PDF' : 'צור PDF'}
              </>
            )}
          </Button>

          {reminderMode ? (
            <Button
              onClick={async () => {
                if (!letter || !letterId) return;
                setIsResending(true);
                try {
                  await onConfirmReminder?.(letterId, letter.recipient_emails ?? []);
                  onOpenChange(false);
                } finally {
                  setIsResending(false);
                }
              }}
              disabled={!letter || isResending || !onConfirmReminder}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                  שולח תזכורת...
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                  שלח תזכורת
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={async () => {
                if (!letter) return;
                setIsResending(true);
                try {
                  onResend?.(letter.recipient_emails ?? []);
                  await new Promise(resolve => setTimeout(resolve, 300));
                  onOpenChange(false);
                } finally {
                  setIsResending(false);
                }
              }}
              disabled={!letter || isResending || !onResend}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                  שלח מחדש
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
