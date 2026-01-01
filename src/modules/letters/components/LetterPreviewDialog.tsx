/**
 * Letter Preview Dialog Component
 * Shows preview of letter generated from fee calculation
 * Allows user to send letter via email and updates database
 * Now supports: Tabs for multiple letters, PDF download, Print functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Loader2, Printer, Download, CheckCircle2 } from 'lucide-react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesIndicator } from '@/components/ui/unsaved-changes-indicator';
import { ExitConfirmationDialog } from '@/components/ui/exit-confirmation-dialog';
import { TemplateService } from '../services/template.service';
import type { LetterVariables, LetterTemplateType } from '../types/letter.types';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { selectLetterTemplate, type LetterSelectionResult } from '../utils/letter-selector';
import { TenantContactService } from '@/services/tenant-contact.service';
import type { AssignedContact } from '@/types/tenant-contact.types';
import { FileUploadService } from '@/services/file-upload.service';

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

export interface LetterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeId: string | null;
  clientId: string | null;
  // Group mode props (optional - when provided, uses group data instead of client)
  groupId?: string | null;
  groupFeeCalculationId?: string | null;
  onEmailSent?: () => void;
  manualPrimaryOverride?: LetterTemplateType | null;
  manualSecondaryOverride?: LetterTemplateType | null;
}

export function LetterPreviewDialog({
  open,
  onOpenChange,
  feeId,
  clientId,
  groupId,
  groupFeeCalculationId,
  onEmailSent,
  manualPrimaryOverride,
  manualSecondaryOverride,
}: LetterPreviewDialogProps) {
  // Determine if we're in group mode
  const isGroupMode = !!groupId && !!groupFeeCalculationId;
  // Existing state
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [contactsDetails, setContactsDetails] = useState<AssignedContact[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [variables, setVariables] = useState<Partial<LetterVariables> | null>(null);
  const [letterSelection, setLetterSelection] = useState<LetterSelectionResult | null>(null);
  const [currentLetterStage, setCurrentLetterStage] = useState<'primary' | 'secondary'>('primary');

  // New state for tabs and sent tracking
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  const [primarySent, setPrimarySent] = useState(false);
  const [secondarySent, setSecondarySent] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // NEW: Letter saving state
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdfForFile, setIsGeneratingPdfForFile] = useState(false);

  // Recipient management per letter
  const [primaryEnabledEmails, setPrimaryEnabledEmails] = useState<Set<string>>(new Set());
  const [primaryManualEmails, setPrimaryManualEmails] = useState<string[]>([]);
  const [secondaryEnabledEmails, setSecondaryEnabledEmails] = useState<Set<string>>(new Set());
  const [secondaryManualEmails, setSecondaryManualEmails] = useState<string[]>([]);
  const [newManualEmail, setNewManualEmail] = useState('');

  // Send to Sigal and Shani for review
  const [sendToReviewers, setSendToReviewers] = useState(true); // Default: true (always send to them)

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
        .select(`
          *,
          group:client_groups (
            group_name_hebrew
          )
        `)
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // Load all eligible emails for fee letters using centralized function
      const emails = await TenantContactService.getClientEmails(clientId, 'important');
      setRecipientEmails(emails);

      // Initialize ALL emails as enabled by default
      setPrimaryEnabledEmails(new Set(emails));
      // Initialize secondary enabled emails (will be used if there's a secondary letter)
      setSecondaryEnabledEmails(new Set(emails));

      // Load full contact details (not just emails)
      const contacts = await TenantContactService.getClientContacts(clientId);
      const eligibleContacts = contacts.filter(c => emails.includes(c.email!));
      setContactsDetails(eligibleContacts);

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

      // Use manual override if provided, otherwise use auto-selected template
      const effectivePrimaryTemplate = manualPrimaryOverride || selection.primaryTemplate;
      const effectiveSecondaryTemplate = manualSecondaryOverride || selection.secondaryTemplate;

      // Determine which template to use based on current stage
      const templateType: LetterTemplateType =
        currentLetterStage === 'primary'
          ? effectivePrimaryTemplate
          : effectiveSecondaryTemplate!;

      const numChecks =
        currentLetterStage === 'primary'
          ? selection.primaryNumChecks
          : selection.secondaryNumChecks!;

      // Use primary, bookkeeping, or retainer amounts based on stage and client type
      const isBookkeeping = currentLetterStage === 'secondary';
      const isRetainer = client.is_retainer || false;

      const amountOriginal = isRetainer && fee.retainer_calculation
        ? fee.retainer_calculation.final_amount
        : isBookkeeping
        ? (fee.bookkeeping_calculation?.final_amount || 0)
        : (fee.final_amount || 0);

      const formatNumber = (num: number): string => {
        return Math.round(num).toLocaleString('he-IL');
      };

      // Calculate amount with VAT (18%)
      const amountWithVat = Math.round(amountOriginal * 1.18);

      // Calculate discounts on VAT-inclusive amount
      const amountAfterBank = Math.round(amountWithVat * 0.91);     // 9% discount
      const amountAfterSingle = Math.round(amountWithVat * 0.92);   // 8% discount
      const amountAfterPayments = Math.round(amountWithVat * 0.96); // 4% discount

      // Calculate service_description based on template type
      const getServiceDescription = (type: string): string => {
        if (type.includes('external_') || type.includes('internal_audit_')) {
          return 'שירותי ראיית החשבון';
        } else if (type.includes('bookkeeping')) {
          return 'שירותי הנהלת החשבונות';
        } else if (type.includes('retainer')) {
          return 'שירותי ראיית החשבון, הנהלת החשבונות וחשבות השכר';
        }
        return 'שירותי ראיית החשבון';
      };

      // Build variables - use fee.year from the calculation (not current date)
      const taxYear = fee.year;
      const previousYear = taxYear - 1;

      const letterVariables: Partial<LetterVariables> = {
        // Auto-generated
        letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),
        year: taxYear.toString(),
        previous_year: previousYear.toString(),
        tax_year: taxYear.toString(),

        // Client info
        company_name: client.company_name_hebrew || client.company_name,
        group_name: client.group?.group_name_hebrew || '',

        // Amounts (formatted as strings with commas)
        amount_original: formatNumber(amountOriginal),
        amount_with_vat: formatNumber(amountWithVat),
        amount_after_bank: formatNumber(amountAfterBank),
        amount_after_single: formatNumber(amountAfterSingle),
        amount_after_payments: formatNumber(amountAfterPayments),

        // Monthly amount for bookkeeping/retainer letters (before VAT)
        monthly_amount: isRetainer && fee.retainer_calculation
          ? formatNumber(fee.retainer_calculation.final_amount / 12)
          : isBookkeeping && fee.bookkeeping_calculation
          ? formatNumber(fee.bookkeeping_calculation.final_amount / 12)
          : undefined,

        // Payment links (TODO: Cardcom integration)
        payment_link_single: `http://localhost:5173/payment?fee_id=${feeId}&method=single`,
        payment_link_4_payments: `http://localhost:5173/payment?fee_id=${feeId}&method=installments`,

        // Checks
        num_checks: numChecks.toString(),
        check_amount: formatNumber(Math.round(amountWithVat / numChecks)),
        check_dates_description: `החל מיום 5.1.${taxYear} ועד ליום 5.${numChecks}.${taxYear}`,

        // Client ID for tracking
        client_id: clientId,

        // Template-specific
        inflation_rate: isBookkeeping
          ? (fee.bookkeeping_calculation?.inflation_rate || 0).toString()
          : (fee.inflation_rate || 0).toString(),

        // Bank Transfer Only Option
        ...(fee.bank_transfer_only && {
          bank_transfer_only: true,
          bank_discount: fee.bank_transfer_discount_percentage?.toString(),
          amount_before_discount_no_vat: formatNumber(amountOriginal), // Original amount (no VAT)
          amount_after_discount_no_vat: formatNumber(fee.bank_transfer_amount_before_vat || 0),
          amount_after_discount_with_vat: formatNumber(fee.bank_transfer_amount_with_vat || 0),
        }),

        // Service description (for all letter types)
        service_description: getServiceDescription(templateType),

        // Custom payment text (appears above payment section)
        custom_payment_text: fee.custom_payment_text || undefined,
      };

      setVariables(letterVariables);

      // Generate preview
      const { data, error } = await templateService.previewLetterFromFiles(
        templateType,
        letterVariables,
        feeId // Pass feeId for client_requested_adjustment check
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
   * Load GROUP fee calculation and generate variables
   * Used when groupId and groupFeeCalculationId are provided
   */
  const loadGroupFeeAndGenerateVariables = async () => {
    if (!groupId || !groupFeeCalculationId) return null;

    try {
      setIsLoadingPreview(true);

      // Fetch group data
      const { data: group, error: groupError } = await supabase
        .from('client_groups')
        .select(`
          *,
          clients:clients(id, company_name, company_name_hebrew, tax_id, internal_external, status)
        `)
        .eq('id', groupId)
        .single();

      if (groupError) throw groupError;

      // Fetch group fee calculation
      const { data: groupCalc, error: calcError } = await supabase
        .from('group_fee_calculations')
        .select('*')
        .eq('id', groupFeeCalculationId)
        .single();

      if (calcError) throw calcError;

      // Collect emails from all group member clients
      const allEmails: string[] = [];
      const allContacts: AssignedContact[] = [];

      for (const client of (group.clients || [])) {
        const emails = await TenantContactService.getClientEmails(client.id, 'important');
        allEmails.push(...emails);

        const contacts = await TenantContactService.getClientContacts(client.id);
        const eligibleContacts = contacts.filter(c => emails.includes(c.email!));
        allContacts.push(...eligibleContacts);
      }

      // Remove duplicates
      const uniqueEmails = [...new Set(allEmails)];
      setRecipientEmails(uniqueEmails);
      setPrimaryEnabledEmails(new Set(uniqueEmails));
      setSecondaryEnabledEmails(new Set(uniqueEmails));

      // Remove duplicate contacts
      const uniqueContacts = allContacts.filter((contact, index, self) =>
        index === self.findIndex(c => c.email === contact.email)
      );
      setContactsDetails(uniqueContacts);

      // Determine template type based on calculation settings
      const hasRealAdjustment = (groupCalc.audit_real_adjustment || 0) > 0;
      const applyInflation = groupCalc.audit_apply_inflation_index !== false;

      // For groups, we use external templates (group = external client pattern)
      const selection = selectLetterTemplate({
        clientType: 'external',
        isRetainer: false,
        applyInflation: applyInflation,
        hasRealAdjustment: hasRealAdjustment,
        bookkeepingApplyInflation: false,
        bookkeepingHasRealAdjustment: false,
      });

      setLetterSelection(selection);

      const effectivePrimaryTemplate = manualPrimaryOverride || selection.primaryTemplate;
      const templateType = effectivePrimaryTemplate;
      const numChecks = selection.primaryNumChecks;

      // Calculate total amount (audit + bookkeeping)
      const auditFinalAmount = groupCalc.audit_final_amount || 0;
      const bookkeepingFinalAmount = groupCalc.bookkeeping_final_amount || 0;
      const totalAmount = auditFinalAmount + bookkeepingFinalAmount;

      const formatNumber = (num: number): string => {
        return Math.round(num).toLocaleString('he-IL');
      };

      // Calculate amount with VAT (18%)
      const amountWithVat = Math.round(totalAmount * 1.18);

      // Calculate discounts on VAT-inclusive amount
      const amountAfterBank = Math.round(amountWithVat * 0.91);
      const amountAfterSingle = Math.round(amountWithVat * 0.92);
      const amountAfterPayments = Math.round(amountWithVat * 0.96);

      // Use groupCalc.year from the calculation (not current date)
      const taxYear = groupCalc.year;
      const previousYear = taxYear - 1;

      // Build variables - use GROUP NAME as company_name
      const letterVariables: Partial<LetterVariables> = {
        letter_date: new Intl.DateTimeFormat('he-IL').format(new Date()),
        year: taxYear.toString(),
        previous_year: previousYear.toString(),
        tax_year: taxYear.toString(),

        // GROUP NAME instead of client name!
        company_name: group.group_name_hebrew,
        group_name: '', // Empty to prevent duplication in group letters

        // Amounts
        amount_original: formatNumber(totalAmount),
        amount_with_vat: formatNumber(amountWithVat),
        amount_after_bank: formatNumber(amountAfterBank),
        amount_after_single: formatNumber(amountAfterSingle),
        amount_after_payments: formatNumber(amountAfterPayments),

        // Payment links
        payment_link_single: `http://localhost:5173/payment?group_fee_id=${groupFeeCalculationId}&method=single`,
        payment_link_4_payments: `http://localhost:5173/payment?group_fee_id=${groupFeeCalculationId}&method=installments`,

        // Checks
        num_checks: numChecks.toString(),
        check_amount: formatNumber(Math.round(amountWithVat / numChecks)),
        check_dates_description: `החל מיום 5.1.${taxYear} ועד ליום 5.${numChecks}.${taxYear}`,

        // Group ID for tracking
        client_id: groupId,

        inflation_rate: (groupCalc.audit_inflation_rate || 0).toString(),

        // Bank Transfer Only Option
        ...(groupCalc.bank_transfer_only && {
          bank_transfer_only: true,
          bank_discount: groupCalc.bank_transfer_discount_percentage?.toString(),
          amount_before_discount_no_vat: formatNumber(totalAmount),
          amount_after_discount_no_vat: formatNumber(groupCalc.bank_transfer_amount_before_vat || 0),
          amount_after_discount_with_vat: formatNumber(groupCalc.bank_transfer_amount_with_vat || 0),
        }),

        service_description: 'שירותי ראיית החשבון',

        // Custom payment text (appears above payment section)
        custom_payment_text: groupCalc.custom_payment_text || undefined,
      };

      setVariables(letterVariables);

      // Generate preview using the same template system
      const { data, error } = await templateService.previewLetterFromFiles(
        templateType,
        letterVariables,
        groupFeeCalculationId
      );

      if (error) throw error;
      if (data) {
        setPreviewHtml(data.html);
      }
    } catch (error) {
      console.error('Error loading group fee and generating variables:', error);
      toast.error('שגיאה בטעינת תצוגה מקדימה לקבוצה');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Convert CID images to Supabase Storage URLs for browser display and PDF
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
   * Recipient Management Helper Functions
   */
  // Get current enabled/manual emails based on stage
  const getCurrentEnabledEmails = () => {
    return currentLetterStage === 'primary' ? primaryEnabledEmails : secondaryEnabledEmails;
  };

  const getCurrentManualEmails = () => {
    return currentLetterStage === 'primary' ? primaryManualEmails : secondaryManualEmails;
  };

  const setCurrentEnabledEmails = (emails: Set<string>) => {
    if (currentLetterStage === 'primary') {
      setPrimaryEnabledEmails(emails);
    } else {
      setSecondaryEnabledEmails(emails);
    }
  };

  const setCurrentManualEmails = (emails: string[]) => {
    if (currentLetterStage === 'primary') {
      setPrimaryManualEmails(emails);
    } else {
      setSecondaryManualEmails(emails);
    }
  };

  // Get final recipient list for sending
  const getFinalRecipients = () => {
    const enabled = Array.from(getCurrentEnabledEmails());
    const manual = getCurrentManualEmails();
    const reviewers = sendToReviewers ? ['sigal@franco.co.il'] : [];

    // Combine all recipients and remove duplicates
    const allRecipients = [...enabled, ...manual, ...reviewers];
    return [...new Set(allRecipients)]; // Remove duplicates using Set
  };

  // Toggle contact email
  const handleToggleEmail = (email: string, checked: boolean) => {
    const current = new Set(getCurrentEnabledEmails());
    if (checked) {
      current.add(email);
    } else {
      current.delete(email);
    }
    setCurrentEnabledEmails(current);
    markDirty();
  };

  // Add manual email
  const handleAddManualEmail = () => {
    const email = newManualEmail.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('כתובת מייל לא תקינה');
      return;
    }

    // Check if already exists
    const current = getCurrentManualEmails();
    if (current.includes(email) || getCurrentEnabledEmails().has(email)) {
      toast.error('כתובת מייל זו כבר קיימת ברשימה');
      return;
    }

    setCurrentManualEmails([...current, email]);
    setNewManualEmail('');
    markDirty();
    toast.success('מייל נוסף בהצלחה');
  };

  // Remove manual email
  const handleRemoveManualEmail = (index: number) => {
    const current = getCurrentManualEmails();
    setCurrentManualEmails(current.filter((_, i) => i !== index));
    markDirty();
  };

  /**
   * NEW: Save letter as draft to generated_letters
   * Returns the saved letter_id for use in payment tracking
   */
  const saveLetterAsDraft = async (): Promise<string | null> => {
    // If already saved, return existing ID
    if (savedLetterId) {
      console.log('✅ Letter already saved:', savedLetterId);
      return savedLetterId;
    }

    // Check for necessary data (supports both client and group mode)
    const hasClientData = !!feeId && !!clientId;
    const hasGroupData = !!groupId && !!groupFeeCalculationId;

    if (!variables || (!hasClientData && !hasGroupData) || !previewHtml || !letterSelection) {
      console.warn('⚠️ Missing data for saving letter', { variables: !!variables, hasClientData, hasGroupData, previewHtml: !!previewHtml });
      return null;
    }

    try {
      setIsSaving(true);

      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        toast.error('לא נמצא מזהה ארגון');
        return null;
      }

      // Check if a letter already exists for this fee calculation
      // This prevents duplicate letters when dialog is reopened
      const calculationId = feeId || groupFeeCalculationId;
      if (calculationId) {
        const { data: existingLetter } = await supabase
          .from('generated_letters')
          .select('id')
          .eq(feeId ? 'fee_calculation_id' : 'group_calculation_id', calculationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingLetter) {
          console.log('✅ Found existing letter for calculation, using:', existingLetter.id);
          setSavedLetterId(existingLetter.id);
          return existingLetter.id;
        }
      }

      // Determine template type
      const effectivePrimaryTemplate = manualPrimaryOverride || letterSelection.primaryTemplate;
      const effectiveSecondaryTemplate = manualSecondaryOverride || letterSelection.secondaryTemplate;

      const templateType: LetterTemplateType =
        currentLetterStage === 'primary'
          ? effectivePrimaryTemplate
          : effectiveSecondaryTemplate!;

      const finalRecipients = getFinalRecipients();

      // Insert as draft
      // IMPORTANT: Save HTML with CID references (not converted to URLs)
      // This allows generate-pdf to properly convert CID → Supabase Storage URLs
      const { data, error } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId || null,
          group_id: groupId || null, // Link to client_groups for tracking
          fee_calculation_id: feeId || null,
          group_calculation_id: groupFeeCalculationId || null,
          template_id: null,
          template_type: templateType,
          subject: `מכתב שכר טרחה ${variables.tax_year}`,
          variables_used: variables,
          generated_content_html: previewHtml, // Save with CID (not converted)
          payment_link: variables.payment_link_single,
          recipient_emails: finalRecipients.length > 0 ? finalRecipients : null,
          status: 'draft', // DRAFT status
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

      setSavedLetterId(data.id);
      console.log('✅ Letter saved as draft:', data.id);

      // Update variables with letter_id for payment tracking
      const updatedVariables = {
        ...variables,
        letter_id: data.id,
      };
      setVariables(updatedVariables);

      // Regenerate preview with letter_id included
      // calculationId already declared at line ~606
      if (calculationId) {
        const { data: previewData, error: previewError } = await templateService.previewLetterFromFiles(
          templateType,
          updatedVariables,
          calculationId
        );

        if (!previewError && previewData) {
          setPreviewHtml(previewData.html);
        }
      }

      return data.id;
    } catch (error) {
      console.error('Error in saveLetterAsDraft:', error);
      toast.error('שגיאה בשמירת המכתב');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Print letter using browser's native print dialog
   * User can choose "Save as PDF" from the print dialog
   */
  const handlePrint = () => {
    if (!previewHtml) return;

    setIsPrinting(true);

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    // Convert CID images to web URLs for browser display
    const displayHtml = convertHtmlForDisplay(previewHtml);

    // Write HTML to iframe with proper RTL and Hebrew support
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

    // Wait for content to load, then open print dialog
    iframe.onload = () => {
      iframe.contentWindow?.print();
      // Cleanup after print dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
        setIsPrinting(false);
      }, 100);
    };
  };

  /**
   * NEW: Save PDF to File Manager (client_attachments)
   * Calls generate-pdf Edge Function and uploads to client files
   */
  const savePdfToFileManager = async (letterId: string): Promise<boolean> => {
    // Check for necessary data (supports both client and group mode)
    const hasClientData = !!clientId;
    const hasGroupData = !!groupId;

    if ((!hasClientData && !hasGroupData) || !variables) {
      toast.error('חסרים נתונים לשמירת PDF');
      return false;
    }

    try {
      // 1. Call generate-pdf Edge Function (same function used by template-based letters)
      // Universal Builder now uses the same PDF generation as templates
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

      // 2. Download PDF from the public URL
      const pdfResponse = await fetch(data.pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error('Failed to download PDF');
      }
      const blob = await pdfResponse.blob();

      const clientName = variables.company_name?.replace(/[^\u0590-\u05FF\w\s-]/g, '') || 'client';
      const fileName = `מכתב_שכר_טרחה_${variables.tax_year}_${clientName}.pdf`;
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      // 3. Upload to File Manager (Group vs Client)
      const description = `מכתב שכר טרחה ${variables.tax_year} - ${variables.letter_date}`;

      if (isGroupMode && groupId) {
        // Group Mode: Upload to all clients in the group
        const { data: result, error: uploadError } = await fileUploadService.uploadFileToGroupCategory(
          pdfFile,
          groupId,
          'quote_invoice',
          description
        );

        if (uploadError) {
          console.error('Group file upload error:', uploadError);
          throw new Error('שגיאה בהעלאת PDF לקבוצה');
        }

        if (result) {
          toast.success(`PDF נשמר בהצלחה ל-${result.successful} לקוחות (${result.failed} נכשלו)`);
        }
      } else if (clientId) {
        // Client Mode: Upload to single client
        const { error: uploadError } = await fileUploadService.uploadFileToCategory(
          pdfFile,
          clientId,
          'quote_invoice',
          description
        );

        if (uploadError) {
          console.error('File upload error:', uploadError);
          throw new Error('שגיאה בהעלאת PDF למנהל קבצים');
        }
        
        toast.success('PDF נשמר בהצלחה בתיקיית הלקוח');
      }

      return true;

    } catch (error) {
      console.error('Error in savePdfToFileManager:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשמירת PDF');
      return false;
    }
  };

  /**
   * Send email via Supabase Edge Function
   */
  const handleSendEmail = async () => {
    // Check for necessary data (supports both client and group mode)
    const hasClientData = !!feeId && !!clientId;
    const hasGroupData = !!groupId && !!groupFeeCalculationId;

    if (!variables || (!hasClientData && !hasGroupData) || !letterSelection) {
      toast.error('חסרים נתונים לשליחת המכתב');
      return;
    }

    // Get final recipients (enabled contacts + manual emails)
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

      // Use manual override if provided, otherwise use auto-selected template
      const effectivePrimaryTemplate = manualPrimaryOverride || letterSelection.primaryTemplate;
      const effectiveSecondaryTemplate = manualSecondaryOverride || letterSelection.secondaryTemplate;

      // Determine current template type
      const templateType: LetterTemplateType =
        currentLetterStage === 'primary'
          ? effectivePrimaryTemplate
          : effectiveSecondaryTemplate!;

      console.log(`📧 Sending ${currentLetterStage} letter (${templateType}) to ${finalRecipients.length} recipients...`);

      // Get fresh session token for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      // Call Supabase Edge Function
      // Pass letterId to prevent duplicate INSERT in Edge Function
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: finalRecipients,
          recipientName: variables.company_name || 'לקוח יקר',
          templateType,
          variables,
          clientId: clientId || null, // Can be null for group letters
          feeCalculationId: feeId || null, // Can be null for group letters
          groupCalculationId: groupFeeCalculationId || null, // Add group fee ID
          letterId: savedLetterId, // Pass existing letter ID to prevent duplicate
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email sent successfully:', data);

      // Update fee_calculations status to 'sent' (only after all letters sent)
      // Only for individual clients
      if (feeId && (currentLetterStage === 'secondary' || !effectiveSecondaryTemplate)) {
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
      
      // Update group fee calculation status if applicable
      if (groupFeeCalculationId) {
        const { error: statusError } = await supabase
          .from('group_fee_calculations')
          .update({ status: 'sent' })
          .eq('id', groupFeeCalculationId);

          if (statusError) {
            console.error('Error updating group fee status:', statusError);
          }
      }

      // Update or insert to generated_letters
      let letterError = null;

      if (savedLetterId) {
        // UPDATE existing draft to 'sent_email'
        const { error: updateError } = await supabase
          .from('generated_letters')
          .update({
            status: 'sent_email',
            sent_at: new Date().toISOString(),
            recipient_emails: finalRecipients,
            // Update subject with final recipient count
            subject: `שלום רב ${variables.company_name} - הודעת חיוב ${templateType.includes('bookkeeping') ? 'הנהלת חשבונות ' : ''}לשנת המס ${variables.tax_year} כמדי שנה 😊`,
          })
          .eq('id', savedLetterId);

        letterError = updateError;

        if (!updateError) {
          console.log('✅ Updated existing letter to sent:', savedLetterId);

          // Save PDF to file manager after successful email send
          await savePdfToFileManager(savedLetterId);
        }
      } else {
        // INSERT new letter (fallback if auto-save didn't work)
        // IMPORTANT: Save HTML with CID references (not converted to URLs)
        const { data, error: insertError } = await supabase
          .from('generated_letters')
          .insert({
            tenant_id: tenantId,
            client_id: clientId || null,
            group_id: groupId || null,
            fee_calculation_id: feeId || null,
            group_calculation_id: groupFeeCalculationId || null,
            template_id: null,
            template_type: templateType,
            subject: `שלום רב ${variables.company_name} - הודעת חיוב ${templateType.includes('bookkeeping') ? 'הנהלת חשבונות ' : ''}לשנת המס ${variables.tax_year} כמדי שנה 😊`,
            variables_used: variables,
            generated_content_html: previewHtml, // Save with CID (not converted)
            payment_link: variables.payment_link_single,
            recipient_emails: finalRecipients,
            sent_at: new Date().toISOString(),
            created_by: (await supabase.auth.getUser()).data.user?.id,
            status: 'sent_email',
            rendering_engine: 'legacy',
            system_version: 'v1',
            is_latest: true,
            version_number: 1,
          })
          .select()
          .single();

        letterError = insertError;

        if (!insertError && data) {
          console.log('✅ Inserted new letter:', data.id);
          setSavedLetterId(data.id);

          // Save PDF to file manager
          await savePdfToFileManager(data.id);
        }
      }

      if (letterError) {
        console.error('Error saving generated letter:', letterError);
        toast.error('המייל נשלח אך לא נשמר ברשומות');
        return;
      }

      const letterName = currentLetterStage === 'primary' ? 'ראשון' : 'שני';
      toast.success(`מכתב ${letterName} נשלח בהצלחה ל-${finalRecipients.length} נמענים`);

      // Reset unsaved changes after successful send
      resetUnsavedChanges();

      // Mark letter as sent (don't auto-navigate or close)
      if (currentLetterStage === 'primary') {
        setPrimarySent(true);
      } else {
        setSecondarySent(true);
      }

      // If there's no secondary letter, close after primary sent
      if (currentLetterStage === 'primary' && !effectiveSecondaryTemplate) {
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
    if (open) {
      if (isGroupMode) {
        // Group mode - load group fee calculation data
        loadGroupFeeAndGenerateVariables();
      } else if (feeId && clientId) {
        // Client mode - load individual fee calculation
        loadFeeAndGenerateVariables();
      }
    }
  }, [open, feeId, clientId, groupId, groupFeeCalculationId, currentLetterStage, isGroupMode]);

  /**
   * Reset state when dialog opens
   */
  useEffect(() => {
    if (open) {
      setCurrentLetterStage('primary');
      setActiveTab('primary');
      setPrimarySent(false);
      setSecondarySent(false);
      // Reset recipient management
      setPrimaryEnabledEmails(new Set());
      setPrimaryManualEmails([]);
      setSecondaryEnabledEmails(new Set());
      setSecondaryManualEmails([]);
      setNewManualEmail('');
      setSendToReviewers(true); // Default: always send to reviewers
      // Mark as dirty immediately - letter preview should always require confirmation to close
      markDirty();
    }
  }, [open, markDirty]);

  /**
   * Sync currentLetterStage with activeTab changes
   */
  useEffect(() => {
    setCurrentLetterStage(activeTab);
  }, [activeTab]);

  /**
   * NEW: Auto-save letter as draft when preview is ready
   */
  useEffect(() => {
    if (previewHtml && !savedLetterId && !isLoadingPreview) {
      console.log('🔄 Auto-saving letter as draft...');
      saveLetterAsDraft();
    }
  }, [previewHtml, savedLetterId, isLoadingPreview]);

  // Helper to render letter content (preview + recipients + actions)
  const renderLetterContent = (stage: 'primary' | 'secondary', isSent: boolean) => (
    <div className="space-y-4">
      {/* Preview */}
      {isLoadingPreview ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="mr-3 rtl:text-right ltr:text-left">טוען תצוגה מקדימה...</span>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-white" style={{ minHeight: '400px' }} dir="rtl">
          <div
            dangerouslySetInnerHTML={{ __html: convertHtmlForDisplay(previewHtml) }}
            className="select-text"
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          />
        </div>
      )}

      {/* Recipients Management */}
      <div className="space-y-4">
        {/* Contact List with Checkboxes */}
        <div className="space-y-2">
          <Label className="rtl:text-right block">
            אנשי קשר של הלקוח ({Array.from(getCurrentEnabledEmails()).length} מתוך {contactsDetails.length} נבחרו)
          </Label>
          {contactsDetails.length > 0 ? (
            <div className="border rounded-lg p-3 bg-gray-50 space-y-2 max-h-60 overflow-y-auto">
              {contactsDetails.map((contact) => (
                <div key={contact.id} className="flex items-center gap-3 p-2 bg-white rounded border hover:bg-gray-50">
                  <Checkbox
                    checked={getCurrentEnabledEmails().has(contact.email!)}
                    onCheckedChange={(checked) => handleToggleEmail(contact.email!, checked as boolean)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate rtl:text-right">{contact.full_name}</div>
                    <div className="text-xs text-gray-500 truncate dir-ltr rtl:text-right">{contact.email}</div>
                    <div className="text-xs text-blue-600 rtl:text-right">{getContactTypeLabel(contact.contact_type)}</div>
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
          <Label className="rtl:text-right block">הוסף מייל נוסף (לא מרשימת אנשי הקשר)</Label>
          <div className="flex gap-2 rtl:flex-row-reverse">
            <Input
              type="email"
              placeholder="example@company.com"
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

          {/* Display manual emails */}
          {getCurrentManualEmails().length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-gray-600 rtl:text-right">מיילים נוספים:</Label>
              {getCurrentManualEmails().map((email, index) => (
                <div key={email} className="flex items-center gap-2 p-2 bg-blue-50 rounded rtl:flex-row-reverse">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-sm flex-1 dir-ltr rtl:text-right">{email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveManualEmail(index)}
                    className="h-6 w-6 p-0"
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Final Recipients Summary */}
        {getFinalRecipients().length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="flex items-center gap-2 text-green-900 font-semibold rtl:flex-row-reverse">
              <CheckCircle2 className="h-5 w-5" />
              <span className="rtl:text-right">המכתב יישלח ל-{getFinalRecipients().length} נמענים</span>
            </div>
            <div className="text-sm text-green-700 mt-1 rtl:text-right" dir="rtl">
              {(() => {
                const contactCount = Array.from(getCurrentEnabledEmails()).length;
                const manualCount = getCurrentManualEmails().length;
                const parts: string[] = [];

                if (contactCount > 0) parts.push(`${contactCount} מאנשי קשר`);
                if (manualCount > 0) parts.push(`${manualCount} מיילים נוספים`);
                if (sendToReviewers) parts.push('1 (סיגל לבדיקה)');

                return parts.join(' + ');
              })()}
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
        <Label htmlFor="send-to-reviewers" className="cursor-pointer rtl:text-right flex-1">
          שלח לסיגל לבדיקה (sigal@franco.co.il)
        </Label>
      </div>

      {/* Actions for this letter */}
      <div className="flex justify-end gap-2 rtl:flex-row-reverse flex-wrap">
        {/* NEW: Save as Draft button */}
        <Button
          variant="secondary"
          onClick={saveLetterAsDraft}
          disabled={isSaving || isLoadingPreview || !previewHtml || savedLetterId !== null}
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

        {/* NEW: Generate PDF and Save button */}
        <Button
          variant="outline"
          onClick={async () => {
            setIsGeneratingPdfForFile(true);
            try {
              // Save as draft first if not already saved
              const letterId = savedLetterId || await saveLetterAsDraft();
              if (letterId) {
                await savePdfToFileManager(letterId);
              }
            } finally {
              setIsGeneratingPdfForFile(false);
            }
          }}
          disabled={isGeneratingPdfForFile || isSaving || isLoadingPreview || !previewHtml}
        >
          {isGeneratingPdfForFile ? (
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

        {/* Existing: Print button */}
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

        {/* Existing: Send Email button */}
        <Button
          onClick={handleSendEmail}
          disabled={isSendingEmail || isSaving || getFinalRecipients().length === 0 || isLoadingPreview || isSent}
        >
          {isSendingEmail && currentLetterStage === stage ? (
            <>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              שולח...
            </>
          ) : isSent ? (
            <>
              <CheckCircle2 className="h-4 w-4 ml-2 text-green-600" />
              נשלח בהצלחה
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 ml-2" />
              שלח מכתב זה למייל
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Handler for close button and dialog close
  const handleClose = useCallback(() => {
    handleCloseAttempt(() => onOpenChange(false));
  }, [handleCloseAttempt, onOpenChange]);

  return (
    <>
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rtl:text-right ltr:text-left" dir="rtl">
        <UnsavedChangesIndicator show={hasUnsavedChanges} />
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">
            תצוגה מקדימה - מכתבי שכר טרחה
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {letterSelection?.secondaryTemplate
              ? 'לקוח פנימי - שני מכתבים (ביקורת + הנהלת חשבונות)'
              : 'לקוח חיצוני - מכתב אחד'}
          </DialogDescription>
        </DialogHeader>

        {letterSelection?.secondaryTemplate ? (
          /* Multiple letters - show tabs */
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'primary' | 'secondary')} className="mt-4">
            <TabsList className="grid w-full grid-cols-2 rtl:text-right">
              <TabsTrigger value="primary" className="rtl:text-right flex items-center gap-2">
                מכתב ראיית חשבון
                {primarySent && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </TabsTrigger>
              <TabsTrigger value="secondary" className="rtl:text-right flex items-center gap-2">
                מכתב הנהלת חשבונות
                {secondarySent && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="primary" className="mt-4">
              {renderLetterContent('primary', primarySent)}
            </TabsContent>

            <TabsContent value="secondary" className="mt-4">
              {renderLetterContent('secondary', secondarySent)}
            </TabsContent>
          </Tabs>
        ) : (
          /* Single letter - no tabs */
          <div className="mt-4">
            {renderLetterContent('primary', primarySent)}
          </div>
        )}

        {/* Close button at bottom */}
        <div className="flex justify-start gap-2 mt-4 pt-4 border-t rtl:flex-row-reverse">
          <Button variant="outline" onClick={handleClose}>
            סגור
          </Button>
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
