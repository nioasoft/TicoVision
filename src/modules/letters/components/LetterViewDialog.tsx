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
import { Mail, Printer, Loader2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface LetterViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterId: string | null;
  onResend?: () => void;
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
}: LetterViewDialogProps) {
  const [letter, setLetter] = useState<GeneratedLetter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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
    } catch (error) {
      console.error('Error loading letter:', error);
      toast.error('שגיאה בטעינת המכתב');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Convert CID images to web paths for browser display
   */
  const convertHtmlForDisplay = (html: string): string => {
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://ticovision.vercel.app';

    return html
      .replace(/cid:tico_logo_new/g, `${baseUrl}/brand/Tico_logo_png_new.png`)
      .replace(/cid:tico_logo/g, `${baseUrl}/brand/tico_logo_240.png`)
      .replace(/cid:franco_logo_new/g, `${baseUrl}/brand/Tico_franco_co.png`)
      .replace(/cid:franco_logo/g, `${baseUrl}/brand/franco-logo-hires.png`)
      .replace(/cid:tagline/g, `${baseUrl}/brand/tagline.png`)
      .replace(/cid:bullet_star/g, `${baseUrl}/brand/bullet-star.png`)
      .replace(/cid:bullet_star_blue/g, `${baseUrl}/brand/Bullet_star_blue.png`);
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

    const displayHtml = convertHtmlForDisplay(letter.generated_content_html);

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
   * Download as PDF (opens print dialog with save as PDF option)
   */
  const handleDownloadPdf = () => {
    handlePrint(); // Same as print - user can choose "Save as PDF"
  };

  if (!letter && !isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col rtl:text-right ltr:text-left">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="rtl:text-right ltr:text-left">
            {letter?.subject || 'צפייה במכתב'}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {letter?.sent_at ? (
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
              dangerouslySetInnerHTML={{
                __html: convertHtmlForDisplay(letter.generated_content_html),
              }}
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
            disabled={!letter}
          >
            <Download className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            שמור כ-PDF
          </Button>

          <Button
            onClick={() => {
              onOpenChange(false);
              onResend?.();
            }}
            disabled={!letter}
          >
            <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            שלח מחדש
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
