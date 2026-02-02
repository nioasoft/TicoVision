/**
 * Billing Letter Preview Dialog
 * Shows preview of billing letter with options to send, print, and download PDF
 *
 * Supports two modes:
 * 1. Create mode (formData): For new billing letters - record is created only on send/PDF
 * 2. View mode (billingLetter): For existing billing letters
 *
 * SECURITY NOTE: HTML content is generated server-side from trusted templates and sanitized
 * variables only. No user-generated HTML is rendered directly.
 */

import { useState, useEffect, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Mail, Loader2, Printer, Download, CheckCircle2, X } from 'lucide-react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesIndicator } from '@/components/ui/unsaved-changes-indicator';
import { ExitConfirmationDialog } from '@/components/ui/exit-confirmation-dialog';
import { TemplateService } from '@/modules/letters/services/template.service';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { TenantContactService } from '@/services/tenant-contact.service';
import { FileUploadService } from '@/services/file-upload.service';
import type { AssignedContact } from '@/types/tenant-contact.types';
import type { BillingLetterWithClient, BillingLetter } from '../types/billing.types';
import { calculateBillingAmounts } from '../types/billing.types';
import { billingLetterService } from '../services/billing-letter.service';
import type { Client } from '@/services/client.service';

const templateService = new TemplateService();
const fileUploadService = new FileUploadService();

// Helper function to get contact type label in Hebrew
const getContactTypeLabel = (contactType: string): string => {
  const labels: Record<string, string> = {
    owner: 'בעלים',
    accountant_manager: 'מנהלת חשבונות',
    secretary: 'מזכירה',
    cfo: 'סמנכ"ל כספים',
    board_member: 'חבר דירקטוריון',
    legal_counsel: 'יועץ משפטי',
    other: 'אחר',
  };
  return labels[contactType] || contactType;
};

/**
 * Form data for creating a new billing letter (create mode)
 */
export interface BillingLetterFormData {
  client: Client;
  billing_subject: string;
  service_description: string;
  amount_before_vat: number;
  bank_discount_percentage: number;
  due_date?: string;
  notes?: string;
  // New fields for billing letter improvements
  opening_text: string;           // בפתח הדברים (required)
  additional_recipient?: string;  // לכבוד נוסף (optional)
  additional_subject?: string;    // נדון נוסף (optional)
}

export interface BillingLetterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Create mode - form data (no ID yet)
  formData?: BillingLetterFormData;
  // View mode - existing billing letter
  billingLetter?: BillingLetterWithClient;
  // Callback after billing letter is created (create mode)
  onCreated?: (billingLetterId: string) => void;
  // Callback after email is sent (view mode)
  onEmailSent?: () => void;
  // Reminder mode - shows "תזכורת" badge in letter
  isReminder?: boolean;
}

export function BillingLetterPreviewDialog({
  open,
  onOpenChange,
  formData,
  billingLetter,
  onCreated,
  onEmailSent,
  isReminder = false,
}: BillingLetterPreviewDialogProps) {
  // Determine mode
  const isCreateMode = !!formData && !billingLetter;

  // State
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [contactsDetails, setContactsDetails] = useState<AssignedContact[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Letter saving state (for view mode only)
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Created billing letter (for create mode - after first send/PDF)
  const [createdBillingLetter, setCreatedBillingLetter] = useState<BillingLetter | null>(null);

  // Recipient management
  const [enabledEmails, setEnabledEmails] = useState<Set<string>>(new Set());
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [newManualEmail, setNewManualEmail] = useState('');

  // Send to Sigal for review (default: true)
  const [sendToReviewers, setSendToReviewers] = useState(true);

  // Unsaved changes protection
  const {
    hasUnsavedChanges,
    showExitConfirm,
    markDirty,
    reset: resetUnsavedChanges,
    handleCloseAttempt,
    confirmExit,
    cancelExit,
  } = useUnsavedChanges();

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
      'cid:bullet_star_blue': `${baseUrl}/storage/v1/object/public/${bucket}/Bullet_star_blue.png`,
      'cid:tico_logo': `${baseUrl}/storage/v1/object/public/${bucket}/tico_logo_240.png`,
      'cid:franco_logo': `${baseUrl}/storage/v1/object/public/${bucket}/franco-logo-hires.png`,
    };

    let result = html;
    for (const [cid, url] of Object.entries(imageMap)) {
      result = result.replace(new RegExp(cid, 'g'), url);
    }
    return result;
  };

  /**
   * Get the effective data source (either formData or billingLetter)
   */
  const getEffectiveData = () => {
    if (formData) {
      return {
        clientId: formData.client.id,
        companyName: formData.client.company_name_hebrew || formData.client.company_name,
        billingSubject: formData.billing_subject,
        serviceDescription: formData.service_description,
        amountBeforeVat: formData.amount_before_vat,
        bankDiscountPercentage: formData.bank_discount_percentage,
        dueDate: formData.due_date,
        notes: formData.notes,
        // New fields for billing letter improvements
        openingText: formData.opening_text,
        additionalRecipient: formData.additional_recipient,
        additionalSubject: formData.additional_subject,
      };
    }
    if (billingLetter) {
      return {
        clientId: billingLetter.client_id,
        companyName: billingLetter.client.company_name_hebrew || billingLetter.client.company_name,
        billingSubject: billingLetter.billing_subject || '',
        serviceDescription: billingLetter.service_description,
        amountBeforeVat: billingLetter.amount_before_vat,
        bankDiscountPercentage: billingLetter.bank_discount_percentage || 0,
        dueDate: billingLetter.due_date || undefined,
        notes: billingLetter.notes || undefined,
        // For existing billing letters, use empty values (these fields are only in formData)
        openingText: '',
        additionalRecipient: undefined,
        additionalSubject: undefined,
      };
    }
    return null;
  };

  /**
   * Load contacts and generate preview
   */
  const loadPreview = async () => {
    const effectiveData = getEffectiveData();
    if (!effectiveData) return;

    try {
      setIsLoadingPreview(true);

      // Load contacts for this client
      const emails = await TenantContactService.getClientEmails(
        effectiveData.clientId,
        'important'
      );
      setEnabledEmails(new Set(emails));

      const contacts = await TenantContactService.getClientContacts(
        effectiveData.clientId
      );
      const eligibleContacts = contacts.filter((c) => emails.includes(c.email!));
      setContactsDetails(eligibleContacts);

      // Calculate amounts for template variables
      const amounts = calculateBillingAmounts(
        effectiveData.amountBeforeVat,
        effectiveData.bankDiscountPercentage
      );

      const formatNumber = (num: number): string => {
        return Math.round(num).toLocaleString('he-IL');
      };

      // Build variables for template
      const variables: Record<string, unknown> = {
        company_name: effectiveData.companyName,
        billing_subject: effectiveData.billingSubject,
        billing_body: effectiveData.serviceDescription,
        tax_year: new Date().getFullYear().toString(),
        letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),

        // New fields for billing letter improvements
        opening_text: effectiveData.openingText || '',
        group_name: effectiveData.additionalRecipient || '', // לכבוד נוסף (uses same variable as header)
        additional_subject: effectiveData.additionalSubject || '',

        // Payment section variables - no discount for billing letters
        amount_with_vat: formatNumber(amounts.totalAmount), // Full amount with VAT (no discount)
        client_id: effectiveData.clientId,
        // billing_letter_id and letter_id will be set after creation (or 'pending' for preview)
        billing_letter_id: createdBillingLetter?.id || billingLetter?.id || 'pending',
        letter_id: savedLetterId || 'pending',

        // Legacy variables (kept for backward compatibility)
        bank_transfer_only: true,
        bank_discount: effectiveData.bankDiscountPercentage.toString(),
        amount_before_discount_no_vat: formatNumber(amounts.amountBeforeVat),
        amount_after_discount_no_vat: formatNumber(amounts.amountAfterDiscount),
        amount_after_discount_with_vat: formatNumber(
          amounts.amountAfterDiscountWithVat
        ),
        service_description: effectiveData.billingSubject || 'חיוב',

        // Reminder mode - shows red "תזכורת" badge at top of letter
        is_reminder: isReminder ? 'true' : '',
      };

      // Generate preview using template service
      const { data, error } = await templateService.previewLetterFromFiles(
        'billing_letter',
        variables
      );

      if (error) throw error;
      if (data) {
        setPreviewHtml(data.html);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('שגיאה בטעינת תצוגה מקדימה');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Get final recipients list
   */
  const getFinalRecipients = () => {
    const enabled = Array.from(enabledEmails);
    const reviewers = sendToReviewers ? ['sigal@franco.co.il'] : [];
    const allRecipients = [...enabled, ...manualEmails, ...reviewers];
    return [...new Set(allRecipients)];
  };

  /**
   * Toggle contact email
   */
  const handleToggleEmail = (email: string, checked: boolean) => {
    const current = new Set(enabledEmails);
    if (checked) {
      current.add(email);
    } else {
      current.delete(email);
    }
    setEnabledEmails(current);
    markDirty();
  };

  /**
   * Add manual email
   */
  const handleAddManualEmail = () => {
    const email = newManualEmail.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('כתובת מייל לא תקינה');
      return;
    }

    if (manualEmails.includes(email) || enabledEmails.has(email)) {
      toast.error('כתובת מייל זו כבר קיימת ברשימה');
      return;
    }

    setManualEmails([...manualEmails, email]);
    setNewManualEmail('');
    markDirty();
    toast.success('מייל נוסף בהצלחה');
  };

  /**
   * Remove manual email
   */
  const handleRemoveManualEmail = (index: number) => {
    setManualEmails(manualEmails.filter((_, i) => i !== index));
    markDirty();
  };

  /**
   * Create billing letter from form data (create mode only)
   * Returns the created billing letter or null on error
   */
  const createBillingLetterFromFormData = async (): Promise<BillingLetter | null> => {
    if (!formData || createdBillingLetter) return createdBillingLetter;

    try {
      const { data, error } = await billingLetterService.create({
        client_id: formData.client.id,
        billing_subject: formData.billing_subject,
        service_description: formData.service_description,
        amount_before_vat: formData.amount_before_vat,
        bank_discount_percentage: formData.bank_discount_percentage,
        due_date: formData.due_date,
        notes: formData.notes,
      });

      if (error) throw error;
      if (data) {
        setCreatedBillingLetter(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error creating billing letter:', error);
      toast.error('שגיאה ביצירת מכתב החיוב');
      return null;
    }
  };

  /**
   * Save letter as draft to generated_letters
   * In create mode, first creates the billing letter
   * Returns both letter ID and billing letter ID to avoid React state timing issues
   */
  const saveLetterAsDraft = async (): Promise<{ letterId: string; billingLetterId: string } | null> => {
    if (savedLetterId) {
      const existingBillingLetterId = isCreateMode ? createdBillingLetter?.id : billingLetter?.id;
      if (existingBillingLetterId) {
        return { letterId: savedLetterId, billingLetterId: existingBillingLetterId };
      }
    }

    const effectiveData = getEffectiveData();
    if (!effectiveData || !previewHtml) return null;

    try {
      setIsSaving(true);

      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        toast.error('לא נמצא מזהה ארגון');
        return null;
      }

      // Get or create the billing letter
      let billingLetterId: string;
      let amounts;

      if (isCreateMode) {
        // Create mode: create billing letter first
        const created = await createBillingLetterFromFormData();
        if (!created) return null;
        billingLetterId = created.id;
        amounts = calculateBillingAmounts(effectiveData.amountBeforeVat, effectiveData.bankDiscountPercentage);
      } else if (billingLetter) {
        // View mode: use existing billing letter
        billingLetterId = billingLetter.id;
        amounts = calculateBillingAmounts(billingLetter.amount_before_vat, billingLetter.bank_discount_percentage || 0);

        // Check if letter already exists for this billing letter
        const { data: existingLetter } = await supabase
          .from('generated_letters')
          .select('id')
          .eq('billing_letter_id', billingLetterId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingLetter) {
          setSavedLetterId(existingLetter.id);
          return { letterId: existingLetter.id, billingLetterId };
        }
      } else {
        return null;
      }

      const finalRecipients = getFinalRecipients();

      // Replace pending billing_letter_id with real ID in HTML before saving
      let htmlToSave = previewHtml;
      if (billingLetterId) {
        htmlToSave = htmlToSave.replace(/billing_letter_id=pending/g, `billing_letter_id=${billingLetterId}`);
      }

      const { data, error } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: effectiveData.clientId,
          billing_letter_id: billingLetterId,
          template_type: 'billing_letter',
          subject: `הודעת חיוב - ${effectiveData.billingSubject || 'מכתב חיוב'}`,
          variables_used: {
            company_name: effectiveData.companyName,
            billing_subject: effectiveData.billingSubject,
            amount: amounts?.amountAfterDiscountWithVat || effectiveData.amountBeforeVat,
          },
          generated_content_html: htmlToSave,
          recipient_emails: finalRecipients.length > 0 ? finalRecipients : null,
          status: 'draft',
          rendering_engine: 'legacy',
          system_version: 'v1',
          is_latest: true,
          version_number: 1,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving letter as draft:', error);
        toast.error('שגיאה בשמירת המכתב');
        return null;
      }

      // Now update the HTML with the real letter_id (we didn't have it before INSERT)
      const finalHtmlWithIds = htmlToSave.replace(/letter_id=pending/g, `letter_id=${data.id}`);
      if (finalHtmlWithIds !== htmlToSave) {
        await supabase
          .from('generated_letters')
          .update({ generated_content_html: finalHtmlWithIds })
          .eq('id', data.id);
      }

      setSavedLetterId(data.id);

      // Link billing letter to generated letter
      await billingLetterService.linkToGeneratedLetter(
        billingLetterId,
        data.id
      );

      return { letterId: data.id, billingLetterId };
    } catch (error) {
      console.error('Error in saveLetterAsDraft:', error);
      toast.error('שגיאה בשמירת המכתב');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Print letter
   */
  const handlePrint = () => {
    if (!previewHtml) return;

    setIsPrinting(true);

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    const displayHtml = convertHtmlForDisplay(previewHtml);

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

    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsPrinting(false);
      }, 100);
    };
  };

  /**
   * Save PDF to File Manager
   */
  const savePdfToFileManager = async (letterId: string): Promise<boolean> => {
    const effectiveData = getEffectiveData();
    if (!effectiveData) return false;

    try {
      const { data, error: pdfError } = await supabase.functions.invoke<{
        success: boolean;
        pdfUrl: string;
        letterId: string;
      }>('generate-pdf', {
        body: { letterId },
      });

      if (pdfError || !data?.success) {
        console.error('PDF generation error:', pdfError);
        throw new Error('שגיאה ביצירת PDF');
      }

      const pdfResponse = await fetch(data.pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await pdfResponse.blob();

      const clientName = effectiveData.companyName?.replace(/[^\u0590-\u05FF\w\s-]/g, '') || 'client';
      const fileName = `מכתב_חיוב_${effectiveData.billingSubject || 'כללי'}_${clientName}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      const description = `מכתב חיוב - ${effectiveData.billingSubject || ''} - ${new Intl.DateTimeFormat('he-IL').format(new Date())}`;

      const { error: uploadError } = await fileUploadService.uploadFileToCategory(
        pdfFile,
        effectiveData.clientId,
        'quote_invoice',
        description
      );

      if (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error('שגיאה בהעלאת PDF למנהל קבצים');
      }

      toast.success('PDF נשמר בהצלחה בתיקיית הלקוח');
      return true;
    } catch (error) {
      console.error('Error in savePdfToFileManager:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשמירת PDF');
      return false;
    }
  };

  /**
   * Generate PDF and save
   */
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const result = savedLetterId
        ? { letterId: savedLetterId, billingLetterId: isCreateMode ? createdBillingLetter?.id : billingLetter?.id }
        : await saveLetterAsDraft();

      if (result?.letterId) {
        await savePdfToFileManager(result.letterId);

        // In create mode, navigate to the billing letter view page
        if (isCreateMode && result.billingLetterId) {
          resetUnsavedChanges();
          onCreated?.(result.billingLetterId);
          onOpenChange(false);
        }
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /**
   * Send email
   */
  const handleSendEmail = async () => {
    const effectiveData = getEffectiveData();
    if (!effectiveData) return;

    const finalRecipients = getFinalRecipients();
    if (finalRecipients.length === 0) {
      toast.error('לא נבחרו נמענים. יש לבחור לפחות מייל אחד.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        toast.error('לא נמצא מזהה ארגון');
        return;
      }

      // Save letter first if not saved (this also creates billing letter in create mode)
      // We get both IDs directly from the result to avoid React state timing issues
      const result = savedLetterId
        ? { letterId: savedLetterId, billingLetterId: isCreateMode ? createdBillingLetter?.id : billingLetter?.id }
        : await saveLetterAsDraft();

      const letterId = result?.letterId;
      const billingLetterId = result?.billingLetterId;

      if (!billingLetterId) {
        toast.error('שגיאה ביצירת מכתב החיוב');
        return;
      }

      // Get session for authorization
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      // Replace pending IDs with real IDs in the HTML before sending
      let finalHtml = previewHtml;
      if (billingLetterId) {
        finalHtml = finalHtml.replace(/billing_letter_id=pending/g, `billing_letter_id=${billingLetterId}`);
      }
      if (letterId) {
        finalHtml = finalHtml.replace(/letter_id=pending/g, `letter_id=${letterId}`);
      }

      // Call send-letter Edge Function with the pre-generated HTML
      // We send the HTML directly (customText + isHtml) instead of templateType
      // to ensure the exact preview content is sent, not a regenerated version
      const { error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: finalRecipients,
          customText: finalHtml,
          isHtml: true,
          clientId: effectiveData.clientId,
          letterId,
          subject: `הודעת חיוב - ${effectiveData.billingSubject || 'מכתב חיוב'}`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      // Update billing letter status
      if (isReminder) {
        // Reminder mode: increment reminder count
        await billingLetterService.incrementReminderCount(billingLetterId);
      } else {
        // First send: mark as sent via email
        await billingLetterService.markAsSentViaEmail(
          billingLetterId,
          letterId || ''
        );
      }

      // Update generated letter status
      if (letterId) {
        await supabase
          .from('generated_letters')
          .update({
            status: 'sent_email',
            sent_at: new Date().toISOString(),
            recipient_emails: finalRecipients,
          })
          .eq('id', letterId);

        // Save PDF to file manager
        await savePdfToFileManager(letterId);
      }

      toast.success(
        isReminder
          ? `תזכורת נשלחה בהצלחה ל-${finalRecipients.length} נמענים`
          : `מכתב החיוב נשלח בהצלחה ל-${finalRecipients.length} נמענים`
      );
      resetUnsavedChanges();

      // In create mode, call onCreated to navigate; in view mode, call onEmailSent
      if (isCreateMode && billingLetterId) {
        onCreated?.(billingLetterId);
      } else {
        onEmailSent?.();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת מייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Load preview when dialog opens or reminder mode changes
  useEffect(() => {
    if (open && (billingLetter || formData)) {
      loadPreview();
      markDirty();
    }
  }, [open, billingLetter, formData, isReminder]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setEnabledEmails(new Set());
      setManualEmails([]);
      setNewManualEmail('');
      setSendToReviewers(true);
      setSavedLetterId(null);
      setCreatedBillingLetter(null);
    }
  }, [open]);

  // In view mode only: Auto-save letter when preview is ready
  // In create mode, we don't auto-save - user must click send/PDF
  useEffect(() => {
    if (!isCreateMode && previewHtml && !savedLetterId && !isLoadingPreview) {
      saveLetterAsDraft();
    }
  }, [previewHtml, savedLetterId, isLoadingPreview, isCreateMode]);

  const handleClose = useCallback(() => {
    handleCloseAttempt(() => onOpenChange(false));
  }, [handleCloseAttempt, onOpenChange]);

  // Render preview content - HTML is generated from trusted server-side templates only
  const renderPreviewContent = () => {
    if (isLoadingPreview) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-3 rtl:text-right ltr:text-left">
            טוען תצוגה מקדימה...
          </span>
        </div>
      );
    }

    // Content is from trusted template service only - no user HTML input
    return (
      <div
        className="border rounded-lg p-4 bg-white"
        style={{ minHeight: '400px' }}
        dir="rtl"
      >
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: convertHtmlForDisplay(previewHtml),
          }}
          className="select-text"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        />
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto rtl:text-right ltr:text-left"
          dir="rtl"
        >
          <UnsavedChangesIndicator show={hasUnsavedChanges} />
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">
              {isReminder ? 'שליחת תזכורת - מכתב חיוב' : 'תצוגה מקדימה - מכתב חיוב'}
            </DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              {isReminder && billingLetter && (
                <span className="text-orange-600 font-medium ml-2">
                  (תזכורת #{(billingLetter.reminder_count || 0) + 1})
                </span>
              )}
              {getEffectiveData()?.billingSubject || 'מכתב חיוב כללי'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Preview */}
            {renderPreviewContent()}

            {/* Recipients Management */}
            <div className="space-y-4">
              {/* Contact List */}
              <div className="space-y-2">
                <Label className="rtl:text-right block">
                  אנשי קשר של הלקוח ({Array.from(enabledEmails).length} מתוך{' '}
                  {contactsDetails.length} נבחרו)
                </Label>
                {contactsDetails.length > 0 ? (
                  <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-60 overflow-y-auto">
                    {contactsDetails.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-2 bg-white rounded border hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={enabledEmails.has(contact.email!)}
                          onCheckedChange={(checked) =>
                            handleToggleEmail(contact.email!, checked as boolean)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate rtl:text-right">
                            {contact.full_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate dir-ltr rtl:text-right">
                            {contact.email}
                          </div>
                          <div className="text-xs text-blue-600 rtl:text-right">
                            {getContactTypeLabel(contact.contact_type)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 rtl:text-right">
                    לא נמצאו אנשי קשר עם מייל פעיל
                  </p>
                )}
              </div>

              {/* Manual Email Input */}
              <div className="space-y-2">
                <Label className="rtl:text-right block">
                  הוסף מייל נוסף (לא מרשימת אנשי הקשר)
                </Label>
                <div className="flex gap-2 rtl:flex-row-reverse">
                  <Input
                    type="email"
                    value={newManualEmail}
                    onChange={(e) => setNewManualEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddManualEmail();
                      }
                    }}
                    className="flex-1"
                    dir="ltr"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddManualEmail}
                    disabled={!newManualEmail.trim()}
                  >
                    הוסף
                  </Button>
                </div>

                {manualEmails.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600 rtl:text-right">
                      מיילים נוספים:
                    </Label>
                    {manualEmails.map((email, index) => (
                      <div
                        key={email}
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded rtl:flex-row-reverse"
                      >
                        <Mail className="h-4 w-4 text-blue-600" />
                        <span className="text-sm flex-1 dir-ltr rtl:text-right">
                          {email}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManualEmail(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recipients Summary */}
              {getFinalRecipients().length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-center gap-2 text-green-900 font-semibold rtl:flex-row-reverse">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="rtl:text-right">
                      המכתב יישלח ל-{getFinalRecipients().length} נמענים
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Send to Reviewers Checkbox */}
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded rtl:flex-row-reverse">
              <Checkbox
                checked={sendToReviewers}
                onCheckedChange={(checked) => {
                  setSendToReviewers(checked as boolean);
                  markDirty();
                }}
                id="send-to-reviewers"
              />
              <Label
                htmlFor="send-to-reviewers"
                className="cursor-pointer rtl:text-right flex-1"
              >
                שלח לסיגל לבדיקה (sigal@franco.co.il)
              </Label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 rtl:flex-row-reverse flex-wrap pt-4 border-t">
              {/* Save as Draft - only in view mode */}
              {!isCreateMode && (
                <Button
                  variant="secondary"
                  onClick={saveLetterAsDraft}
                  disabled={isSaving || isLoadingPreview || !previewHtml || !!savedLetterId}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      שומר...
                    </>
                  ) : savedLetterId ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />
                      נשמר
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 ml-2" />
                      שמור כטיוטה
                    </>
                  )}
                </Button>
              )}

              {/* Generate PDF */}
              <Button
                variant="outline"
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf || isSaving || isLoadingPreview || !previewHtml}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    מייצר PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 ml-2" />
                    צור PDF ושמור בתיקייה
                  </>
                )}
              </Button>

              {/* Print */}
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={isPrinting || isLoadingPreview || !previewHtml}
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    מכין להדפסה...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 ml-2" />
                    הדפסה
                  </>
                )}
              </Button>

              {/* Send Email */}
              <Button
                onClick={handleSendEmail}
                disabled={
                  isSendingEmail ||
                  isSaving ||
                  getFinalRecipients().length === 0 ||
                  isLoadingPreview
                }
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

            {/* Close button */}
            <div className="flex justify-start gap-2 rtl:flex-row-reverse">
              <Button variant="outline" onClick={handleClose}>
                סגור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExitConfirmationDialog
        open={showExitConfirm}
        onClose={cancelExit}
        onConfirm={() => confirmExit(() => onOpenChange(false))}
      />
    </>
  );
}

BillingLetterPreviewDialog.displayName = 'BillingLetterPreviewDialog';
