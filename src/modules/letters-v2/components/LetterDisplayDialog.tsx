import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Printer,
  Download,
  Send,
  MessageCircle,
  Save,
  Edit,
  X,
  Loader2
} from 'lucide-react';
import { letterRenderingService, emailServiceV2 } from '../services';
import { pdfGenerationService } from '../services/pdf-generation.service';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  letterId?: string;        // For viewing saved letter
  previewHtml?: string;     // For preview mode (not saved yet)
  mode: 'preview' | 'view';
  letterType?: 'fee' | 'universal';
  onSave?: (letterId: string) => void;
  onEdit?: (letterId: string) => void;
}

export function LetterDisplayDialog({
  open,
  onClose,
  letterId,
  previewHtml,
  mode,
  letterType = 'fee',
  onSave,
  onEdit
}: Props) {
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    loadLetterContent();
  }, [open, letterId, previewHtml]);

  const loadLetterContent = async () => {
    setLoading(true);

    try {
      if (mode === 'preview' && previewHtml) {
        // Preview mode - HTML provided directly
        setHtml(previewHtml);
      } else if (mode === 'view' && letterId) {
        // View mode - load from DB and render for browser
        const renderedHtml = await letterRenderingService.renderForBrowser(letterId);
        setHtml(renderedHtml);

        // Check if PDF already exists
        const existingPdfUrl = await pdfGenerationService.getPDFUrl(letterId);
        setPdfUrl(existingPdfUrl);
      }
    } catch (error) {
      console.error('Error loading letter:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לטעון את המכתב',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);

    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';

      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        setIsPrinting(false);
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              direction: rtl;
              padding: 20mm;
            }
            @page { size: A4; margin: 0; }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `);
      doc.close();

      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          setIsPrinting(false);
        }, 100);
      };
    } catch (error) {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!letterId) {
      toast({
        title: 'שגיאה',
        description: 'יש לשמור את המכתב לפני יצירת PDF',
        variant: 'destructive'
      });
      return;
    }

    setGeneratingPdf(true);

    try {
      const url = await pdfGenerationService.generatePDF(letterId);
      setPdfUrl(url);

      // Open PDF in new tab
      window.open(url, '_blank');

      toast({
        title: 'הצלחה!',
        description: 'ה-PDF נוצר בהצלחה'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו ליצור PDF',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!letterId) {
      toast({
        title: 'שגיאה',
        description: 'יש לשמור את המכתב לפני שליחה במייל',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // TODO: Open dialog to select recipients
      // For now, just show placeholder
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async

      toast({
        title: 'בקרוב',
        description: 'דיאלוג לבחירת נמענים יתווסף בקרוב'
      });

      // Example usage (uncomment when recipients dialog is ready):
      /*
      const result = await emailServiceV2.sendLetter({
        letterId,
        recipientEmails: ['recipient@example.com'],
        subject: 'מכתב שכר טרחה 2026'
      });

      toast({
        title: 'הצלחה!',
        description: `המייל נשלח ל-${result.recipientCount} נמענים`
      });
      */
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לשלוח את המייל',
        variant: 'destructive'
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!letterId) {
      toast({
        title: 'שגיאה',
        description: 'יש לשמור את המכתב לפני שליחה בוואטסאפ',
        variant: 'destructive'
      });
      return;
    }

    setIsSendingWhatsApp(true);

    try {
      const publicUrl = `${window.location.origin}/letters-v2/view/${letterId}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`צפה במכתב: ${publicUrl}`)}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: 'נפתח',
        description: 'חלון וואטסאפ נפתח בטאב חדש'
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לפתוח את וואטסאפ',
        variant: 'destructive'
      });
    } finally {
      // Reset after a short delay so user sees the loading state
      setTimeout(() => setIsSendingWhatsApp(false), 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-right">
              {mode === 'preview' ? 'תצוגה מקדימה' : 'צפייה במכתב'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Letter Content */}
        <div className="flex-1 overflow-auto border rounded-md p-6 bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">טוען מכתב...</p>
              </div>
            </div>
          ) : (
            <div
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: html }}
              className="letter-content"
            />
          )}
        </div>

        {/* Actions */}
        <DialogFooter className="flex-row justify-between gap-2">
          <div className="flex gap-2">
            {/* Left side - Save/Edit */}
            {mode === 'preview' && onSave && (
              <Button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await onSave(letterId!);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                variant="default"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    שמור מכתב
                  </>
                )}
              </Button>
            )}

            {mode === 'view' && onEdit && (
              <Button onClick={() => onEdit(letterId!)} variant="outline">
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Right side - Actions */}
            <Button onClick={handlePrint} variant="outline" size="sm" disabled={isPrinting}>
              {isPrinting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  מדפיס...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 ml-2" />
                  הדפס
                </>
              )}
            </Button>

            {mode === 'view' && (
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                size="sm"
                disabled={generatingPdf}
              >
                {generatingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    יוצר PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 ml-2" />
                    {pdfUrl ? 'הורד PDF' : 'צור PDF'}
                  </>
                )}
              </Button>
            )}

            <Button onClick={handleSendEmail} variant="outline" size="sm" disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  שולח במייל...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 ml-2" />
                  שלח במייל
                </>
              )}
            </Button>

            {mode === 'view' && (
              <Button onClick={handleSendWhatsApp} variant="outline" size="sm" disabled={isSendingWhatsApp}>
                {isSendingWhatsApp ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    שולח...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 ml-2" />
                    וואטסאפ
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
