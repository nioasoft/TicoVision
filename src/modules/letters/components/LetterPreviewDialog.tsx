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
import type { LetterVariables, LetterTemplateType } from '../types/letter.types';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { selectLetterTemplate, type LetterSelectionResult } from '../utils/letter-selector';

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
  const [letterSelection, setLetterSelection] = useState<LetterSelectionResult | null>(null);
  const [currentLetterStage, setCurrentLetterStage] = useState<'primary' | 'secondary'>('primary');

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

      // Determine which letter template(s) to use
      const selection = selectLetterTemplate({
        clientType: client.internal_external,
        isRetainer: client.is_retainer,
        applyInflation: fee.apply_inflation_index,
        hasRealAdjustment: (fee.real_adjustments?.amount || 0) > 0,
        bookkeepingApplyInflation: fee.bookkeeping_calculation?.apply_inflation_index,
        bookkeepingHasRealAdjustment: (fee.bookkeeping_calculation?.real_adjustment || 0) > 0,
      });

      setLetterSelection(selection);

      // Determine which template to use based on current stage
      const templateType: LetterTemplateType =
        currentLetterStage === 'primary'
          ? selection.primaryTemplate
          : selection.secondaryTemplate!;

      const numChecks =
        currentLetterStage === 'primary'
          ? selection.primaryNumChecks
          : selection.secondaryNumChecks!;

      // Use primary or bookkeeping amounts based on stage
      const isBookkeeping = currentLetterStage === 'secondary';
      const amountOriginal = isBookkeeping
        ? (fee.bookkeeping_calculation?.total_with_vat || 0)
        : (fee.total_amount || 0);

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
        num_checks: numChecks.toString(),
        check_dates_description: `החל מיום 5.1.${nextYear} ועד ליום 5.${numChecks}.${nextYear}`,

        // Client ID for tracking
        client_id: clientId,

        // Template-specific
        inflation_rate: isBookkeeping
          ? (fee.bookkeeping_calculation?.inflation_rate || 0) + '%'
          : (fee.inflation_rate || 0) + '%',
      };

      setVariables(letterVariables);

      // Generate preview
      const { data, error } = await templateService.previewLetterFromFiles(
        templateType,
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
    if (!variables || !feeId || !clientId || !letterSelection) {
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

      // Determine current template type
      const templateType: LetterTemplateType =
        currentLetterStage === 'primary'
          ? letterSelection.primaryTemplate
          : letterSelection.secondaryTemplate!;

      console.log(`📧 Sending ${currentLetterStage} letter (${templateType}) via Edge Function...`);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmail,
          recipientName: variables.company_name || 'לקוח יקר',
          templateType,
          variables,
          clientId,
          feeCalculationId: feeId,
        },
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email sent successfully:', data);

      // Update fee_calculations status to 'sent' (only after all letters sent)
      if (currentLetterStage === 'secondary' || !letterSelection.secondaryTemplate) {
        const { error: statusError } = await supabase
          .from('fee_calculations')
          .update({ status: 'sent' })
          .eq('id', feeId);

        if (statusError) {
          console.error('Error updating fee status:', statusError);
          toast.error('המייל נשלח אך הסטטוס לא עודכן');
          return;
        }
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

      const letterName = currentLetterStage === 'primary' ? 'ראשון' : 'שני';
      toast.success(`מכתב ${letterName} נשלח בהצלחה ל-${recipientEmail}`);

      // Check if there's a secondary letter to send
      if (currentLetterStage === 'primary' && letterSelection.secondaryTemplate) {
        // Move to secondary letter
        setCurrentLetterStage('secondary');
        toast.info('מעבר למכתב השני (הנהלת חשבונות)...');
        // Reload preview will happen via useEffect
      } else {
        // All letters sent, close dialog
        onEmailSent?.();
        onOpenChange(false);
      }

    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת מייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  /**
   * Load preview when dialog opens or stage changes
   */
  useEffect(() => {
    if (open && feeId && clientId) {
      loadFeeAndGenerateVariables();
    }
  }, [open, feeId, clientId, currentLetterStage]);

  /**
   * Reset stage when dialog opens
   */
  useEffect(() => {
    if (open) {
      setCurrentLetterStage('primary');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rtl:text-right ltr:text-left" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">
            {currentLetterStage === 'primary' ? 'תצוגה מקדימה - מכתב ראשי' : 'תצוגה מקדימה - מכתב הנהלת חשבונות'}
            {letterSelection?.secondaryTemplate && (
              <span className="text-sm text-gray-500 mr-2">
                ({currentLetterStage === 'primary' ? 'מכתב 1 מתוך 2' : 'מכתב 2 מתוך 2'})
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {currentLetterStage === 'primary'
              ? `המכתב הראשי עם ${letterSelection?.primaryNumChecks} המחאות`
              : `מכתב הנהלת חשבונות עם ${letterSelection?.secondaryNumChecks} המחאות`
            }
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
                {currentLetterStage === 'primary' && letterSelection?.secondaryTemplate
                  ? 'שלח מכתב ראשון'
                  : currentLetterStage === 'secondary'
                  ? 'שלח מכתב שני'
                  : 'שלח למייל'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
