/**
 * Send Reminder Dialog Component
 * Dialog to send a reminder letter for capital declaration
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, Eye, ArrowRight } from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { templateService } from '@/modules/letters/services/template.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { DeclarationWithCounts } from '@/types/capital-declaration.types';
import { format } from 'date-fns';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declaration: DeclarationWithCounts;
  onSuccess?: () => void;
}

export function SendReminderDialog({
  open,
  onOpenChange,
  declaration,
  onSuccess,
}: SendReminderDialogProps) {
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // SharePdfPanel state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string | null>(null);
  const [generatedLetterId, setGeneratedLetterId] = useState<string | null>(null);

  const handlePreview = async () => {
    setLoading(true);

    try {
      const portalLink = capitalDeclarationService.getPortalLink(declaration.public_token);
      const letterDate = format(new Date(), 'dd/MM/yyyy');
      const declarationDate = format(new Date(declaration.declaration_date), 'dd/MM/yyyy');

      const variables = {
        contact_name: declaration.contact_name,
        tax_year: String(declaration.tax_year),
        declaration_date: declarationDate,
        portal_link: portalLink,
        letter_date: letterDate,
      };

      const { data: html, error } = await templateService.previewCapitalDeclarationTemplate(
        'reminder',
        variables
      );

      if (error || !html) {
        toast.error('שגיאה בטעינת התצוגה המקדימה');
        return;
      }

      setPreviewHtml(html);
      setShowPreview(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);

    try {
      const portalLink = capitalDeclarationService.getPortalLink(declaration.public_token);
      const letterDate = format(new Date(), 'dd/MM/yyyy');
      const declarationDate = format(new Date(declaration.declaration_date), 'dd/MM/yyyy');

      const variables = {
        contact_name: declaration.contact_name,
        tax_year: String(declaration.tax_year),
        declaration_date: declarationDate,
        portal_link: portalLink,
        letter_date: letterDate,
      };

      // Generate the letter
      const { data: letter, error: generateError } = await templateService.generateCapitalDeclarationFromTemplate(
        'reminder',
        variables,
        {
          clientId: declaration.client_id || undefined,
          groupId: declaration.group_id || undefined,
          letterName: `תזכורת הצהרת הון ${declaration.tax_year} - ${declaration.contact_name}`,
        }
      );

      if (generateError || !letter) {
        toast.error('שגיאה ביצירת המכתב');
        return;
      }

      // Log the communication
      await capitalDeclarationService.logCommunication({
        declaration_id: declaration.id,
        communication_type: 'letter',
        direction: 'outbound',
        subject: `מכתב תזכורת - הצהרת הון ${declaration.tax_year}`,
        letter_id: letter.id,
      });

      // Generate PDF via Edge Function
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: { letterId: letter.id },
      });

      if (pdfError || !pdfData?.success) {
        console.error('PDF generation error:', pdfError || pdfData?.error);
        toast.error('שגיאה ביצירת ה-PDF');
        return;
      }

      // Set up for SharePdfPanel
      const pdfFileName = `תזכורת הצהרת הון ${declaration.tax_year} - ${declaration.contact_name}.pdf`;
      setGeneratedPdfUrl(pdfData.pdfUrl);
      setGeneratedPdfName(pdfFileName);
      setGeneratedHtmlContent(letter.html_content);
      setGeneratedLetterId(letter.id);

      // Show the share panel inline
      setShowSharePanel(true);

      toast.success('המכתב נוצר בהצלחה');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setShowSharePanel(false);
    setGeneratedPdfUrl(null);
    setGeneratedPdfName('');
    setGeneratedHtmlContent(null);
    setGeneratedLetterId(null);
    onOpenChange(false);
    if (showSharePanel) {
      onSuccess?.();
    }
  };

  const handleSharePanelHide = () => {
    setShowSharePanel(false);
  };

  // Preview view with optional SharePdfPanel
  if (showPreview && previewHtml) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">תצוגה מקדימה - מכתב תזכורת</DialogTitle>
          </DialogHeader>

          {!showSharePanel ? (
            <>
              <div className="flex-1 overflow-auto border rounded-lg bg-white">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[50vh]"
                  title="תצוגה מקדימה"
                />
              </div>
              <DialogFooter className="rtl:flex-row-reverse">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  חזרה
                </Button>
                <Button onClick={handleSend} disabled={loading}>
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  צור מכתב
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-auto">
                {/* Collapsed preview */}
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    הצג תצוגה מקדימה של המכתב
                  </summary>
                  <div className="border rounded-lg bg-white mt-2">
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-[30vh]"
                      title="תצוגה מקדימה"
                    />
                  </div>
                </details>

                {/* Share Panel Inline */}
                <SharePdfPanel
                  show={showSharePanel}
                  onHide={handleSharePanelHide}
                  pdfUrl={generatedPdfUrl || ''}
                  pdfName={generatedPdfName}
                  clientName={declaration.contact_name}
                  clientId={declaration.client_id || undefined}
                  htmlContent={generatedHtmlContent || undefined}
                  letterId={generatedLetterId || undefined}
                  defaultSubject={`תזכורת הצהרת הון ${declaration.tax_year} - ${declaration.contact_name}`}
                  defaultEmail={declaration.contact_email || undefined}
                  defaultEmailType="html"
                  onEmailSent={() => {
                    // Log email communication
                    capitalDeclarationService.logCommunication({
                      declaration_id: declaration.id,
                      communication_type: 'letter',
                      direction: 'outbound',
                      subject: `מייל תזכורת - הצהרת הון ${declaration.tax_year}`,
                      letter_id: generatedLetterId || undefined,
                    });
                  }}
                />
              </div>
              <DialogFooter className="rtl:flex-row-reverse">
                <Button variant="outline" onClick={handleClose}>
                  סגור
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Main dialog - with share panel support for direct "Create Letter" flow
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={showSharePanel ? "max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" : "sm:max-w-[450px]"} dir="rtl">
        {showSharePanel ? (
          <>
            <DialogHeader>
              <DialogTitle className="rtl:text-right">שליחת מכתב תזכורת</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <SharePdfPanel
                show={showSharePanel}
                onHide={handleSharePanelHide}
                pdfUrl={generatedPdfUrl || ''}
                pdfName={generatedPdfName}
                clientName={declaration.contact_name}
                clientId={declaration.client_id || undefined}
                htmlContent={generatedHtmlContent || undefined}
                letterId={generatedLetterId || undefined}
                defaultSubject={`תזכורת הצהרת הון ${declaration.tax_year} - ${declaration.contact_name}`}
                defaultEmail={declaration.contact_email || undefined}
                defaultEmailType="html"
                onEmailSent={() => {
                  capitalDeclarationService.logCommunication({
                    declaration_id: declaration.id,
                    communication_type: 'letter',
                    direction: 'outbound',
                    subject: `מייל תזכורת - הצהרת הון ${declaration.tax_year}`,
                    letter_id: generatedLetterId || undefined,
                  });
                }}
              />
            </div>
            <DialogFooter className="rtl:flex-row-reverse">
              <Button variant="outline" onClick={handleClose}>
                סגור
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="rtl:text-right">שליחת מכתב תזכורת</DialogTitle>
              <DialogDescription className="rtl:text-right">
                יצירת מכתב תזכורת עבור הצהרת הון לשנת {declaration.tax_year}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 rtl:text-right">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">נמען:</span>
                  <span className="font-medium">{declaration.contact_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">שנת מס:</span>
                  <span className="font-medium">{declaration.tax_year}</span>
                </div>
                {declaration.contact_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">מייל:</span>
                    <span className="font-medium">{declaration.contact_email}</span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                המכתב יכלול את הלינק לפורטל העלאת המסמכים.
              </p>
            </div>

            <DialogFooter className="rtl:flex-row-reverse gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                ביטול
              </Button>
              <Button variant="outline" onClick={handlePreview} disabled={loading}>
                {loading ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="ml-2 h-4 w-4" />
                )}
                תצוגה מקדימה
              </Button>
              <Button onClick={handleSend} disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                <Mail className="ml-2 h-4 w-4" />
                צור מכתב
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
