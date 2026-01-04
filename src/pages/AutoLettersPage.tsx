/**
 * AutoLettersPage - Unified Auto Letters System
 *
 * Purpose: Generate various automatic letters organized by category
 * URL: /auto-letters
 * Categories:
 * - קליטת חברה (Company Onboarding) - VAT registration, etc.
 * - קביעת מועדים (Setting Dates) - Future
 * - אישורים שנתיים (Annual Approvals) - Future
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileStack, Eye, Download, Loader2, Users, User, Contact, UserPlus } from 'lucide-react';
import { CategorySelector, LetterTypeSelector, FormRenderer } from '@/components/auto-letters';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { Combobox } from '@/components/ui/combobox';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { clientService } from '@/services';
import { groupFeeService, type ClientGroup } from '@/services/group-fee.service';
import { TenantContactService, type TenantContact } from '@/services/tenant-contact.service';
import {
  createInitialAutoLetterFormState,
  getLetterTypeById,
  getTemplateType,
  validateCutoffDate,
  validateMeetingReminder,
  validateGeneralDeadline,
  validateFinancialStatementsMeeting,
  validateMissingDocuments,
  validatePersonalReportReminder,
  validateBookkeeperBalanceReminder,
  validateIncomeConfirmation,
  validateMortgageIncome,
  type AutoLetterCategory,
  type AutoLetterFormState,
  type AutoLetterTemplateType,
} from '@/types/auto-letters.types';
import {
  validateVatRegistration,
  type CompanyOnboardingVariables,
  type CompanyOnboardingTemplateType,
} from '@/types/company-onboarding.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/services/client.service';

const templateService = new TemplateService();

export function AutoLettersPage() {
  // Form state
  const [formState, setFormState] = useState<AutoLetterFormState>(createInitialAutoLetterFormState());

  // Client/Group/Contact data
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [contacts, setContacts] = useState<TenantContact[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [selectedContact, setSelectedContact] = useState<TenantContact | null>(null);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  // PDF sharing state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  const [generatedLetterId, setGeneratedLetterId] = useState<string | null>(null);
  const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string>('');
  const [generatedSubject, setGeneratedSubject] = useState<string>('');

  // Existing letter dialog state
  const [existingLetterDialog, setExistingLetterDialog] = useState<{
    open: boolean;
    existingLetterId: string | null;
    existingLetterDate: string | null;
  }>({ open: false, existingLetterId: null, existingLetterDate: null });

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  // Load groups when mode changes to 'group'
  useEffect(() => {
    if (formState.recipientMode === 'group' && groups.length === 0) {
      loadGroups();
    }
  }, [formState.recipientMode]);

  // Load contacts when mode changes to 'contact'
  useEffect(() => {
    if (formState.recipientMode === 'contact' && contacts.length === 0) {
      loadContacts();
    }
  }, [formState.recipientMode]);

  // Update company_name and company_id when client/group/contact changes
  useEffect(() => {
    if (formState.recipientMode === 'client' && selectedClient) {
      setFormState(prev => ({
        ...prev,
        sharedData: {
          ...prev.sharedData,
          company_name: selectedClient.company_name,
          company_id: selectedClient.tax_id || '',
        },
        selectedClientId: selectedClient.id,
        selectedGroupId: null,
        selectedContactId: null,
        adhocContact: null,
      }));
    } else if (formState.recipientMode === 'group' && selectedGroup) {
      setFormState(prev => ({
        ...prev,
        sharedData: {
          ...prev.sharedData,
          company_name: selectedGroup.group_name_hebrew || selectedGroup.group_name || '',
          company_id: '',
        },
        selectedClientId: null,
        selectedGroupId: selectedGroup.id,
        selectedContactId: null,
        adhocContact: null,
      }));
    } else if (formState.recipientMode === 'contact' && selectedContact) {
      setFormState(prev => ({
        ...prev,
        sharedData: {
          ...prev.sharedData,
          company_name: selectedContact.full_name,
          company_id: '',
        },
        selectedClientId: null,
        selectedGroupId: null,
        selectedContactId: selectedContact.id,
        adhocContact: null,
      }));
    }
  }, [selectedClient, selectedGroup, selectedContact, formState.recipientMode]);

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const { data, error } = await clientService.getLetterRecipients();
      if (error) throw error;
      if (data) {
        // Sort by Hebrew name
        const sorted = data.sort((a, b) =>
          (a.company_name || '').localeCompare(b.company_name || '', 'he')
        );
        setClients(sorted);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('שגיאה בטעינת לקוחות');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await groupFeeService.getAvailableGroups(currentYear);
      if (error) throw error;
      if (data) {
        // Sort by Hebrew name
        const sorted = data.sort((a, b) =>
          (a.group_name_hebrew || '').localeCompare(b.group_name_hebrew || '', 'he')
        );
        setGroups(sorted);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('שגיאה בטעינת קבוצות');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const data = await TenantContactService.getAllContacts();
      if (data && data.length > 0) {
        // Sort by Hebrew name
        const sorted = data.sort((a, b) =>
          (a.full_name || '').localeCompare(b.full_name || '', 'he')
        );
        setContacts(sorted);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('שגיאה בטעינת אנשי קשר');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Get current document data based on category and letter type
  const getDocumentData = (): Record<string, unknown> => {
    const { selectedCategory, selectedLetterTypeId } = formState;

    if (selectedCategory === 'company_onboarding') {
      if (selectedLetterTypeId === 'vat_registration') {
        return formState.documentData.company_onboarding.vatRegistration;
      }
    }

    if (selectedCategory === 'setting_dates') {
      switch (selectedLetterTypeId) {
        case 'cutoff_date':
          return formState.documentData.setting_dates.cutoffDate;
        case 'meeting_reminder':
          return formState.documentData.setting_dates.meetingReminder;
        case 'general_deadline':
          return formState.documentData.setting_dates.generalDeadline;
        case 'financial_statements':
          return formState.documentData.setting_dates.financialStatements;
      }
    }

    if (selectedCategory === 'missing_documents') {
      if (selectedLetterTypeId === 'general_missing') {
        return formState.documentData.missing_documents.generalMissing;
      }
    }

    if (selectedCategory === 'reminder_letters') {
      switch (selectedLetterTypeId) {
        case 'personal_report_reminder':
          return formState.documentData.reminder_letters.personalReportReminder;
        case 'bookkeeper_balance_reminder':
          return formState.documentData.reminder_letters.bookkeeperBalanceReminder;
      }
    }

    if (selectedCategory === 'bank_approvals') {
      if (selectedLetterTypeId === 'income_confirmation') {
        return formState.documentData.bank_approvals.incomeConfirmation;
      }
      if (selectedLetterTypeId === 'mortgage_income') {
        return formState.documentData.bank_approvals.mortgageIncome;
      }
    }

    return {};
  };

  // Validate current document data
  const isCurrentDocumentValid = (): boolean => {
    const { selectedCategory, selectedLetterTypeId, recipientMode } = formState;

    if (!selectedLetterTypeId) return false;

    // Get company_name and company_id based on recipient mode
    let companyName = '';
    let companyId = '';

    if (recipientMode === 'client' && selectedClient) {
      companyName = selectedClient.company_name || '';
      companyId = selectedClient.tax_id || '';
    } else if (recipientMode === 'group' && selectedGroup) {
      companyName = selectedGroup.group_name_hebrew || selectedGroup.group_name || '';
    } else if (recipientMode === 'contact' && selectedContact) {
      companyName = selectedContact.full_name || '';
    } else if (recipientMode === 'adhoc' && formState.adhocContact) {
      companyName = formState.adhocContact.name || '';
    }

    const mergedData = {
      ...formState.sharedData,
      ...getDocumentData(),
      company_name: companyName,
      company_id: companyId,
    };

    if (selectedCategory === 'company_onboarding') {
      if (selectedLetterTypeId === 'vat_registration') {
        return validateVatRegistration(mergedData);
      }
    }

    if (selectedCategory === 'setting_dates') {
      switch (selectedLetterTypeId) {
        case 'cutoff_date':
          return validateCutoffDate(mergedData);
        case 'meeting_reminder':
          return validateMeetingReminder(mergedData);
        case 'general_deadline':
          return validateGeneralDeadline(mergedData);
        case 'financial_statements':
          return validateFinancialStatementsMeeting(mergedData);
      }
    }

    if (selectedCategory === 'missing_documents') {
      if (selectedLetterTypeId === 'general_missing') {
        return validateMissingDocuments(mergedData);
      }
    }

    if (selectedCategory === 'reminder_letters') {
      switch (selectedLetterTypeId) {
        case 'personal_report_reminder':
          return validatePersonalReportReminder(mergedData);
        case 'bookkeeper_balance_reminder':
          return validateBookkeeperBalanceReminder(mergedData);
      }
    }

    if (selectedCategory === 'bank_approvals') {
      if (selectedLetterTypeId === 'income_confirmation') {
        return validateIncomeConfirmation(mergedData);
      }
      if (selectedLetterTypeId === 'mortgage_income') {
        return validateMortgageIncome(mergedData);
      }
    }

    return false;
  };

  // Check if can generate
  const hasRecipient = (formState.recipientMode === 'client' && selectedClient) ||
                       (formState.recipientMode === 'group' && selectedGroup) ||
                       (formState.recipientMode === 'contact' && selectedContact) ||
                       (formState.recipientMode === 'adhoc' && formState.adhocContact?.name?.trim());
  const canGenerate = hasRecipient &&
                      formState.sharedData.document_date &&
                      formState.selectedLetterTypeId &&
                      isCurrentDocumentValid();

  // Get current letter type label
  const getCurrentLetterLabel = (): string => {
    const letterType = getLetterTypeById(formState.selectedCategory, formState.selectedLetterTypeId || '');
    return letterType?.label || 'מכתב';
  };

  // Generate document and PDF - main logic
  const executeGenerateDocument = async (existingLetterId?: string) => {
    setGenerating(true);

    try {
      const templateType = getTemplateType(formState.selectedCategory, formState.selectedLetterTypeId || '');

      if (!templateType) {
        throw new Error('Template type not found');
      }

      // Merge shared data with document-specific data
      const variables = {
        ...formState.sharedData,
        ...getDocumentData(),
      };

      // Generate document based on category
      let result;
      if (formState.selectedCategory === 'company_onboarding') {
        result = await templateService.generateCompanyOnboardingDocument(
          templateType as CompanyOnboardingTemplateType,
          formState.selectedClientId,
          formState.selectedGroupId,
          variables as CompanyOnboardingVariables,
          { existingLetterId }
        );
      } else {
        // Use the new auto letter generation for setting_dates and missing_documents
        result = await templateService.generateAutoLetterDocument(
          templateType as AutoLetterTemplateType,
          formState.selectedClientId,
          formState.selectedGroupId,
          variables,
          { existingLetterId }
        );
      }

      if (result.error) {
        throw result.error;
      }

      const actionText = existingLetterId ? 'עודכן' : 'נוצר';
      toast.success(`המסמך "${getCurrentLetterLabel()}" ${actionText} בהצלחה!`);

      // Generate PDF using Edge Function
      if (!result.data?.id || result.data.id === 'preview') {
        throw new Error('Missing letter ID');
      }

      setGeneratedLetterId(result.data.id);
      setGeneratedHtmlContent(result.data.generated_content_html || '');
      setGeneratedSubject(result.data.subject || '');

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: { letterId: result.data.id },
      });

      if (pdfError || !pdfData?.success) {
        console.error('PDF generation error:', pdfError);
        toast.error('המסמך נשמר אבל הייתה שגיאה ביצירת PDF');
        return;
      }

      // Get recipient name for file naming
      const recipientName = formState.sharedData.company_name || 'לקוח';
      const subject = (getDocumentData() as { subject?: string }).subject || getCurrentLetterLabel();

      // Set PDF info for sharing
      const pdfFileName = `${subject} - ${recipientName}.pdf`;
      setGeneratedPdfUrl(pdfData.pdfUrl);
      setGeneratedPdfName(pdfFileName);
      setShowSharePanel(true);

      // Auto-save PDF reference to File Manager
      if (formState.selectedClientId) {
        const storagePath = `letter-pdfs/${result.data.id}.pdf`;
        const description = `מכתב - ${recipientName}`;

        const saveResult = await fileUploadService.savePdfReference(
          formState.selectedClientId,
          storagePath,
          pdfFileName,
          'general',
          description
        );

        if (saveResult.error) {
          console.warn('Failed to save PDF reference to File Manager:', saveResult.error);
        } else {
          toast.success('הקובץ נשמר במנהל הקבצים');
        }
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('שגיאה ביצירת המסמך');
    } finally {
      setGenerating(false);
    }
  };

  // Generate document - checks for existing letter first
  const handleGenerateDocument = async () => {
    if (!canGenerate) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const templateType = getTemplateType(formState.selectedCategory, formState.selectedLetterTypeId || '');

      if (!templateType) {
        throw new Error('Template type not found');
      }

      // Check if letter already exists for this client/group
      let existingResult;
      if (formState.selectedCategory === 'company_onboarding') {
        existingResult = await templateService.checkExistingCompanyOnboardingLetter(
          templateType as CompanyOnboardingTemplateType,
          formState.selectedClientId,
          formState.selectedGroupId
        );
      } else {
        existingResult = await templateService.checkExistingAutoLetter(
          templateType as AutoLetterTemplateType,
          formState.selectedClientId,
          formState.selectedGroupId
        );
      }

      if (existingResult.data) {
        // Letter exists - ask user what to do
        setGenerating(false);
        setExistingLetterDialog({
          open: true,
          existingLetterId: existingResult.data.id,
          existingLetterDate: existingResult.data.created_at
        });
        return;
      }

      // No existing letter - create new
      await executeGenerateDocument();
    } catch (error) {
      console.error('Error checking existing letter:', error);
      // If check fails, proceed with creating new
      await executeGenerateDocument();
    }
  };

  // Handle user choice from existing letter dialog
  const handleExistingLetterChoice = async (choice: 'update' | 'new') => {
    setExistingLetterDialog({ open: false, existingLetterId: null, existingLetterDate: null });

    if (choice === 'update') {
      await executeGenerateDocument(existingLetterDialog.existingLetterId || undefined);
    } else {
      await executeGenerateDocument();
    }
  };

  // Generate preview
  const handlePreview = async () => {
    if (!canGenerate) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const templateType = getTemplateType(formState.selectedCategory, formState.selectedLetterTypeId || '');

      if (!templateType) {
        throw new Error('Template type not found');
      }

      // Merge shared data with document-specific data
      const variables = {
        ...formState.sharedData,
        ...getDocumentData(),
      };

      // Generate preview HTML (without saving to DB) based on category
      let result;
      if (formState.selectedCategory === 'company_onboarding') {
        result = await templateService.generateCompanyOnboardingDocument(
          templateType as CompanyOnboardingTemplateType,
          formState.selectedClientId,
          formState.selectedGroupId,
          variables as CompanyOnboardingVariables,
          { previewOnly: true }
        );
      } else {
        result = await templateService.generateAutoLetterDocument(
          templateType as AutoLetterTemplateType,
          formState.selectedClientId,
          formState.selectedGroupId,
          variables,
          { previewOnly: true }
        );
      }

      if (result.error || !result.data) {
        throw result.error || new Error('Failed to generate preview');
      }

      // Replace CID with web paths for browser preview
      const htmlForPreview = templateService.replaceCidWithWebPaths(result.data.generated_content_html);

      setPreviewHtml(htmlForPreview);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('שגיאה ביצירת תצוגה מקדימה');
    } finally {
      setGenerating(false);
    }
  };

  // Handle category change - reset letter type
  const handleCategoryChange = (category: AutoLetterCategory) => {
    setFormState(prev => ({
      ...prev,
      selectedCategory: category,
      selectedLetterTypeId: null,
    }));
  };

  // Handle letter type change
  const handleLetterTypeChange = (letterTypeId: string) => {
    setFormState(prev => ({
      ...prev,
      selectedLetterTypeId: letterTypeId,
    }));
  };

  // Handle recipient mode change
  const handleRecipientModeChange = (mode: 'client' | 'group' | 'contact' | 'adhoc') => {
    setFormState(prev => ({
      ...prev,
      recipientMode: mode,
      selectedClientId: null,
      selectedGroupId: null,
      selectedContactId: null,
      adhocContact: mode === 'adhoc' ? { name: '', email: '' } : null,
      sharedData: {
        ...prev.sharedData,
        company_name: '',
      },
    }));
    setSelectedClient(null);
    setSelectedGroup(null);
    setSelectedContact(null);
  };

  // Handle document data change
  const handleDocumentDataChange = (data: Record<string, unknown>) => {
    const { selectedCategory, selectedLetterTypeId } = formState;

    if (selectedCategory === 'company_onboarding' && selectedLetterTypeId === 'vat_registration') {
      setFormState(prev => ({
        ...prev,
        documentData: {
          ...prev.documentData,
          company_onboarding: {
            ...prev.documentData.company_onboarding,
            vatRegistration: data,
          },
        },
      }));
    }

    if (selectedCategory === 'setting_dates') {
      switch (selectedLetterTypeId) {
        case 'cutoff_date':
          setFormState(prev => ({
            ...prev,
            documentData: {
              ...prev.documentData,
              setting_dates: {
                ...prev.documentData.setting_dates,
                cutoffDate: data,
              },
            },
          }));
          break;
        case 'meeting_reminder':
          setFormState(prev => ({
            ...prev,
            documentData: {
              ...prev.documentData,
              setting_dates: {
                ...prev.documentData.setting_dates,
                meetingReminder: data,
              },
            },
          }));
          break;
        case 'general_deadline':
          setFormState(prev => ({
            ...prev,
            documentData: {
              ...prev.documentData,
              setting_dates: {
                ...prev.documentData.setting_dates,
                generalDeadline: data,
              },
            },
          }));
          break;
        case 'financial_statements':
          setFormState(prev => ({
            ...prev,
            documentData: {
              ...prev.documentData,
              setting_dates: {
                ...prev.documentData.setting_dates,
                financialStatements: data,
              },
            },
          }));
          break;
      }
    }

    if (selectedCategory === 'missing_documents' && selectedLetterTypeId === 'general_missing') {
      setFormState(prev => ({
        ...prev,
        documentData: {
          ...prev.documentData,
          missing_documents: {
            ...prev.documentData.missing_documents,
            generalMissing: data,
          },
        },
      }));
    }

    if (selectedCategory === 'reminder_letters') {
      switch (selectedLetterTypeId) {
        case 'personal_report_reminder':
          setFormState(prev => ({
            ...prev,
            documentData: {
              ...prev.documentData,
              reminder_letters: {
                ...prev.documentData.reminder_letters,
                personalReportReminder: data,
              },
            },
          }));
          break;
        case 'bookkeeper_balance_reminder':
          setFormState(prev => ({
            ...prev,
            documentData: {
              ...prev.documentData,
              reminder_letters: {
                ...prev.documentData.reminder_letters,
                bookkeeperBalanceReminder: data,
              },
            },
          }));
          break;
      }
    }

    if (selectedCategory === 'bank_approvals') {
      if (selectedLetterTypeId === 'income_confirmation') {
        setFormState(prev => ({
          ...prev,
          documentData: {
            ...prev.documentData,
            bank_approvals: {
              ...prev.documentData.bank_approvals,
              incomeConfirmation: data,
            },
          },
        }));
      }
      if (selectedLetterTypeId === 'mortgage_income') {
        setFormState(prev => ({
          ...prev,
          documentData: {
            ...prev.documentData,
            bank_approvals: {
              ...prev.documentData.bank_approvals,
              mortgageIncome: data,
            },
          },
        }));
      }
    }
  };

  // Combobox options for clients
  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.company_name,
  }));

  // Combobox options for groups
  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: group.group_name_hebrew || group.group_name || '',
  }));

  // Get default subject for SharePdfPanel
  const getDefaultSubject = (): string => {
    const docData = getDocumentData() as { subject?: string };
    if (docData.subject) return docData.subject;

    const letterType = getLetterTypeById(formState.selectedCategory, formState.selectedLetterTypeId || '');
    return letterType?.label || 'מכתב';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileStack className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-right">מכתבים אוטומטיים</h1>
        </div>
        <p className="text-gray-600 text-right">
          מערכת ליצירת מכתבים אוטומטיים לפי קטגוריות
        </p>
      </div>

      {/* Category Selection */}
      <CategorySelector
        value={formState.selectedCategory}
        onChange={handleCategoryChange}
        disabled={generating}
      />

      {/* Letter Type Selection */}
      <LetterTypeSelector
        category={formState.selectedCategory}
        value={formState.selectedLetterTypeId}
        onChange={handleLetterTypeChange}
        disabled={generating}
      />

      {/* Recipient Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-right">בחירת נמען</CardTitle>
          <CardDescription className="text-right">
            בחר לקוח, קבוצה, איש קשר מהמערכת או הזן פרטי נמען באופן חופשי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Mode Toggle */}
          <RadioGroup
            value={formState.recipientMode}
            onValueChange={(value) => handleRecipientModeChange(value as 'client' | 'group' | 'contact' | 'adhoc')}
            className="flex flex-wrap gap-4"
            dir="rtl"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="client" id="mode-client" />
              <Label htmlFor="mode-client" className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                לקוח בודד
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="group" id="mode-group" />
              <Label htmlFor="mode-group" className="flex items-center gap-2 cursor-pointer">
                <Users className="h-4 w-4" />
                קבוצה
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="contact" id="mode-contact" />
              <Label htmlFor="mode-contact" className="flex items-center gap-2 cursor-pointer">
                <Contact className="h-4 w-4" />
                איש קשר מהמערכת
              </Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="adhoc" id="mode-adhoc" />
              <Label htmlFor="mode-adhoc" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="h-4 w-4" />
                נמען חופשי
              </Label>
            </div>
          </RadioGroup>

          {/* Client Selector */}
          {formState.recipientMode === 'client' && (
            <div className="space-y-2">
              <Label className="text-right block">
                בחר לקוח <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={clientOptions}
                value={selectedClient?.id || ''}
                onValueChange={(value) => {
                  const client = clients.find((c) => c.id === value);
                  setSelectedClient(client || null);
                }}
                placeholder={isLoadingClients ? 'טוען לקוחות...' : 'חפש לקוח...'}
                emptyText="לא נמצאו לקוחות"
                disabled={isLoadingClients || generating}
                className="text-right"
              />
            </div>
          )}

          {/* Group Selector */}
          {formState.recipientMode === 'group' && (
            <div className="space-y-2">
              <Label className="text-right block">
                בחר קבוצה <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={groupOptions}
                value={selectedGroup?.id || ''}
                onValueChange={(value) => {
                  const group = groups.find((g) => g.id === value);
                  setSelectedGroup(group || null);
                }}
                placeholder={isLoadingGroups ? 'טוען קבוצות...' : 'חפש קבוצה...'}
                emptyText="לא נמצאו קבוצות"
                disabled={isLoadingGroups || generating}
                className="text-right"
              />
            </div>
          )}

          {/* Contact Selector */}
          {formState.recipientMode === 'contact' && (
            <div className="space-y-2">
              <Label className="text-right block">
                בחר איש קשר <span className="text-red-500">*</span>
              </Label>
              <Combobox
                options={contacts.map((c) => ({
                  value: c.id,
                  label: `${c.full_name}${c.job_title ? ` - ${c.job_title}` : ''}${c.email ? ` (${c.email})` : ''}`,
                }))}
                value={selectedContact?.id || ''}
                onValueChange={(value) => {
                  const contact = contacts.find((c) => c.id === value);
                  setSelectedContact(contact || null);
                }}
                placeholder={isLoadingContacts ? 'טוען אנשי קשר...' : 'חפש איש קשר...'}
                emptyText="לא נמצאו אנשי קשר"
                disabled={isLoadingContacts || generating}
                className="text-right"
              />
            </div>
          )}

          {/* Adhoc Contact Form */}
          {formState.recipientMode === 'adhoc' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adhoc-name" className="text-right block">
                  שם הנמען <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="adhoc-name"
                  type="text"
                  value={formState.adhocContact?.name || ''}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormState(prev => ({
                      ...prev,
                      adhocContact: {
                        name: newName,
                        email: prev.adhocContact?.email || '',
                      },
                      sharedData: {
                        ...prev.sharedData,
                        company_name: newName,
                      },
                    }));
                  }}
                  disabled={generating}
                  className="text-right"
                  dir="rtl"
                  placeholder="הזן שם נמען..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adhoc-email" className="text-right block">
                  אימייל (אופציונלי)
                </Label>
                <Input
                  id="adhoc-email"
                  type="email"
                  value={formState.adhocContact?.email || ''}
                  onChange={(e) =>
                    setFormState(prev => ({
                      ...prev,
                      adhocContact: {
                        name: prev.adhocContact?.name || '',
                        email: e.target.value,
                      },
                    }))
                  }
                  disabled={generating}
                  className="text-left"
                  dir="ltr"
                  placeholder="example@email.com"
                />
                <p className="text-sm text-gray-500 text-right">
                  האימייל ישמש לשליחת המכתב
                </p>
              </div>
            </div>
          )}

          {/* Additional Recipient Line (optional) */}
          <div className="space-y-2">
            <Label htmlFor="recipient-line" className="text-right block">
              שורת נמען נוספת (אופציונלי)
            </Label>
            <Input
              id="recipient-line"
              type="text"
              value={formState.sharedData.recipient_line || ''}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  sharedData: {
                    ...formState.sharedData,
                    recipient_line: e.target.value,
                  },
                })
              }
              disabled={generating}
              className="text-right"
              dir="rtl"
            />
            <p className="text-sm text-gray-500 text-right">
              שם איש קשר ותפקיד (יופיע מתחת לשם החברה)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shared Data - Document Date */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-right">נתונים משותפים</CardTitle>
          <CardDescription className="text-right">
            נתונים שמופיעים בכל המסמכים
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="document-date" className="text-right block">
                תאריך המסמך <span className="text-red-500">*</span>
              </Label>
              <Input
                id="document-date"
                type="date"
                value={formState.sharedData.document_date || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    sharedData: {
                      ...formState.sharedData,
                      document_date: e.target.value,
                    },
                  })
                }
                disabled={generating}
                className="text-right"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-right block">נמען נבחר</Label>
              <Input
                value={formState.sharedData.company_name || ''}
                disabled
                className="text-right bg-gray-50"
                dir="rtl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document-Specific Form */}
      <div className="mb-8">
        <FormRenderer
          category={formState.selectedCategory}
          letterTypeId={formState.selectedLetterTypeId}
          value={getDocumentData()}
          onChange={handleDocumentDataChange}
          disabled={generating}
          companyName={selectedClient?.company_name}
          companyId={selectedClient?.tax_id}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end rtl:flex-row-reverse">
        <Button
          onClick={handleGenerateDocument}
          disabled={!canGenerate || generating}
          size="lg"
          className="min-w-[200px]"
        >
          {generating ? (
            <>
              <Loader2 className="ml-2 h-5 w-5 animate-spin" />
              יוצר מסמך...
            </>
          ) : (
            <>
              <Download className="ml-2 h-5 w-5" />
              הפק מסמך PDF
            </>
          )}
        </Button>

        <Button
          variant="outline"
          disabled={!canGenerate || generating}
          size="lg"
          className="min-w-[200px]"
          onClick={handlePreview}
        >
          <Eye className="ml-2 h-5 w-5" />
          תצוגה מקדימה
        </Button>
      </div>

      {/* Share PDF Panel - Inline after generating PDF */}
      <SharePdfPanel
        show={showSharePanel}
        onHide={() => setShowSharePanel(false)}
        pdfUrl={generatedPdfUrl || ''}
        pdfName={generatedPdfName}
        clientName={formState.sharedData.company_name || ''}
        clientId={formState.selectedClientId || undefined}
        htmlContent={generatedHtmlContent}
        letterId={generatedLetterId || undefined}
        defaultSubject={generatedSubject || getDefaultSubject()}
      />

      {/* Instructions */}
      {!hasRecipient && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2 text-right">הוראות:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 text-right">
            <li>בחר קטגוריה (לדוגמה: קליטת חברה)</li>
            <li>בחר סוג מכתב</li>
            <li>בחר לקוח או קבוצה מהרשימה</li>
            <li>הוסף שורת נמען נוספת (אופציונלי)</li>
            <li>בחר תאריך למסמך</li>
            <li>מלא את השדות הנדרשים בטופס</li>
            <li>לחץ על "תצוגה מקדימה" לצפייה במסמך</li>
            <li>לחץ על "הפק מסמך PDF" ליצירת המסמך הסופי</li>
          </ol>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              תצוגה מקדימה - {getCurrentLetterLabel()}
            </DialogTitle>
            <DialogDescription className="text-right text-sm text-muted-foreground">
              צפייה מקדימה במכתב לפני הפקה
            </DialogDescription>
          </DialogHeader>
          <div
            className="border rounded-md p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>

      {/* Existing Letter Dialog */}
      <AlertDialog open={existingLetterDialog.open} onOpenChange={(open) => !open && setExistingLetterDialog({ open: false, existingLetterId: null, existingLetterDate: null })}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">קיים מכתב קודם</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              קיים כבר מכתב מסוג זה ללקוח מתאריך{' '}
              {existingLetterDialog.existingLetterDate
                ? new Date(existingLetterDialog.existingLetterDate).toLocaleDateString('he-IL')
                : ''}.
              <br />
              האם לעדכן את המכתב הקיים או ליצור מכתב חדש?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={() => handleExistingLetterChoice('update')}>
              עדכן קיים
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleExistingLetterChoice('new')} className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              צור חדש
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default AutoLettersPage;
