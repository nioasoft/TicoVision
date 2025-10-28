/**
 * Letter Preview Dialog Component
 * Shows preview of letter generated from fee calculation
 * Allows user to send letter via email and updates database
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';
import { TemplateService } from '../services/template.service';
import type { LetterVariables } from '../types/letter.types';
import { supabase, getCurrentTenantId } from '@/lib/supabase';

const templateService = new TemplateService();

export interface LetterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeId: string | null;
  clientId: string | null;
  onEmailSent?: () => void;
}

export function LetterPreviewDialog({
  open,
  onOpenChange,
  feeId,
  clientId,
  onEmailSent,
}: LetterPreviewDialogProps) {
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [variables, setVariables] = useState<Partial<LetterVariables> | null>(null);

  /**
   * Load fee and client data, then generate variables
   */
  const loadFeeAndGenerateVariables = async () => {
    if (!feeId || !clientId) return null;

    try {
      setIsLoadingPreview(true);

      // Fetch fee calculation
      const { data: fee, error: feeError } = await supabase
        .from('fee_calculations')
        .select('*')
        .eq('id', feeId)
        .single();

      if (feeError) throw feeError;

      // Fetch client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Set recipient email from client
      setRecipientEmail(client.contact_email || client.email || '');

      // Calculate amounts (from fee.total_with_vat)
      const amountOriginal = fee.total_with_vat || 0;
      const formatNumber = (num: number): string => {
        return Math.round(num).toLocaleString('he-IL');
      };

      // Calculate discounts
      const amountAfterBank = Math.round(amountOriginal * 0.91);     // 9% discount
      const amountAfterSingle = Math.round(amountOriginal * 0.92);   // 8% discount
      const amountAfterPayments = Math.round(amountOriginal * 0.96); // 4% discount

      // Build variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const letterVariables: Partial<LetterVariables> = {
        // Auto-generated
        letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),
        year: nextYear.toString(),
        previous_year: currentYear.toString(),
        tax_year: nextYear.toString(),

        // Client info
        company_name: client.company_name_hebrew || client.company_name,
        group_name: client.group_name || '',

        // Amounts (formatted as strings with commas)
        amount_original: formatNumber(amountOriginal),
        amount_after_bank: formatNumber(amountAfterBank),
        amount_after_single: formatNumber(amountAfterSingle),
        amount_after_payments: formatNumber(amountAfterPayments),

        // Payment links (TODO: Cardcom integration)
        payment_link_single: `http://localhost:5173/payment?fee_id=${feeId}&method=single`,
        payment_link_4_payments: `http://localhost:5173/payment?fee_id=${feeId}&method=installments`,

        // Checks
        num_checks: '8',
        check_dates_description: `החל מיום 5.1.${nextYear} ועד ליום 5.8.${nextYear}`,

        // Client ID for tracking
        client_id: clientId,

        // Template-specific
        inflation_rate: ((fee.inflation_rate || 0) * 100).toFixed(1) + '%',
      };

      setVariables(letterVariables);

      // Generate preview
      const { data, error } = await templateService.previewLetterFromFiles(
        'external_index_only', // Default to annual fee template
        letterVariables
      );

      if (error) throw error;
      if (data) {
        setPreviewHtml(data.html);
      }
    } catch (error) {
      console.error('Error loading fee and generating variables:', error);
      toast.error('שגיאה בטעינת תצוגה מקדימה');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Send email via Supabase Edge Function
   */
  const handleSendEmail = async () => {
    if (!variables || !feeId || !clientId) {
      toast.error('חסרים נתונים לשליחת המכתב');
      return;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      toast.error('נא להזין כתובת מייל תקינה');
      return;
    }

    setIsSendingEmail(true);
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        toast.error('לא נמצא מזהה ארגון');
        return;
      }

      console.log('📧 Sending letter via Edge Function...');

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmail,
          recipientName: variables.company_name || 'לקוח יקר',
          templateType: 'external_index_only',
          variables,
          clientId,
          feeCalculationId: feeId,
        },
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email sent successfully:', data);

      // Update fee_calculations status to 'sent'
      const { error: statusError } = await supabase
        .from('fee_calculations')
        .update({ status: 'sent' })
        .eq('id', feeId);

      if (statusError) {
        console.error('Error updating fee status:', statusError);
        toast.error('המייל נשלח אך הסטטוס לא עודכן');
        return;
      }

      // Save to generated_letters
      const { error: letterError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          fee_calculation_id: feeId,
          template_id: null, // File-based templates don't have DB template_id
          variables_used: variables,
          generated_content_html: previewHtml,
          payment_link: variables.payment_link_single,
          sent_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (letterError) {
        console.error('Error saving generated letter:', letterError);
        toast.error('המייל נשלח אך לא נשמר ברשומות');
        return;
      }

      toast.success(`מכתב נשלח בהצלחה ל-${recipientEmail}`);

      // Call success callback
      onEmailSent?.();

    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת מייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  /**
   * Load preview when dialog opens
   */
  useEffect(() => {
    if (open && feeId && clientId) {
      loadFeeAndGenerateVariables();
    }
  }, [open, feeId, clientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rtl:text-right ltr:text-left" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">
            תצוגה מקדימה - מכתב שכר טרחה שנתי
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            המכתב המלא כולל: Header, Body, Payment Section, Footer
          </DialogDescription>
        </DialogHeader>

        {/* Preview */}
        {isLoadingPreview ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mr-3 rtl:text-right ltr:text-left">טוען תצוגה מקדימה...</span>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-white" style={{ minHeight: '400px' }}>
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              className="select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="recipient_email" className="rtl:text-right ltr:text-left block">
            מייל נמען
          </Label>
          <Input
            id="recipient_email"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="example@email.com"
            dir="ltr"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 rtl:flex-row-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={isSendingEmail || !recipientEmail || isLoadingPreview}
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 ml-2" />
                שלח למייל
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
