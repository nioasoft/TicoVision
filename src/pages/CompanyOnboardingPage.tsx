/**
 * CompanyOnboardingPage - Company Onboarding Letters
 *
 * Purpose: Generate various company onboarding letters (VAT registration, etc.)
 * URL: /company-onboarding
 * Features:
 * - Select client or group as recipient
 * - Multiple letter types (currently: VAT Registration)
 * - Preview and PDF generation
 * - Save to File Manager
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
import { Building2, Eye, Download, Loader2, Users, User } from 'lucide-react';
import { CompanyOnboardingTypeSelector } from '@/components/company-onboarding/CompanyOnboardingTypeSelector';
import { VatRegistrationForm } from '@/components/company-onboarding/forms/VatRegistrationForm';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { Combobox } from '@/components/ui/combobox';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { clientService } from '@/services';
import { groupFeeService, type ClientGroup } from '@/services/group-fee.service';
import {
  COMPANY_ONBOARDING_LETTER_TYPES,
  createInitialCompanyOnboardingFormState,
  validateVatRegistration,
  type CompanyOnboardingFormState,
  type CompanyOnboardingVariables,
} from '@/types/company-onboarding.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/services/client.service';

const templateService = new TemplateService();

export function CompanyOnboardingPage() {
  // Form state
  const [formState, setFormState] = useState<CompanyOnboardingFormState>(createInitialCompanyOnboardingFormState());

  // Client/Group data
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);

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

  // Update company_name when client/group changes
  useEffect(() => {
    if (formState.recipientMode === 'client' && selectedClient) {
      setFormState(prev => ({
        ...prev,
        sharedData: {
          ...prev.sharedData,
          company_name: selectedClient.company_name,
        },
        selectedClientId: selectedClient.id,
        selectedGroupId: null,
      }));
    } else if (formState.recipientMode === 'group' && selectedGroup) {
      setFormState(prev => ({
        ...prev,
        sharedData: {
          ...prev.sharedData,
          company_name: selectedGroup.group_name_hebrew || selectedGroup.group_name || '',
        },
        selectedClientId: null,
        selectedGroupId: selectedGroup.id,
      }));
    }
  }, [selectedClient, selectedGroup, formState.recipientMode]);

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

  // Get current document data based on selected letter type
  const getDocumentData = () => {
    switch (formState.selectedLetterType) {
      case 0:
        return formState.documentData.vatRegistration;
      default:
        return {};
    }
  };

  // Validate current document data
  const isCurrentDocumentValid = (): boolean => {
    const letterType = COMPANY_ONBOARDING_LETTER_TYPES[formState.selectedLetterType];

    // Merge shared data with document-specific data for validation
    const mergedData = {
      ...formState.sharedData,
      ...getDocumentData(),
    };

    switch (letterType.templateType) {
      case 'company_onboarding_vat_registration':
        return validateVatRegistration(mergedData);
      default:
        return false;
    }
  };

  // Check if can generate (has recipient, date and document data)
  const hasRecipient = (formState.recipientMode === 'client' && selectedClient) ||
                       (formState.recipientMode === 'group' && selectedGroup);
  const canGenerate = hasRecipient && formState.sharedData.document_date && isCurrentDocumentValid();

  // Generate document and PDF - main logic
  const executeGenerateDocument = async (existingLetterId?: string) => {
    setGenerating(true);

    try {
      const letterType = COMPANY_ONBOARDING_LETTER_TYPES[formState.selectedLetterType];

      // Merge shared data with document-specific data
      const variables: CompanyOnboardingVariables = {
        ...formState.sharedData,
        ...getDocumentData(),
      } as CompanyOnboardingVariables;

      // Generate document (with optional existing letter ID for update)
      const result = await templateService.generateCompanyOnboardingDocument(
        letterType.templateType,
        formState.selectedClientId,
        formState.selectedGroupId,
        variables,
        { existingLetterId }
      );

      if (result.error) {
        throw result.error;
      }

      const actionText = existingLetterId ? 'עודכן' : 'נוצר';
      toast.success(`המסמך "${letterType.label}" ${actionText} בהצלחה!`);

      // Generate PDF using Edge Function
      if (!result.data?.id || result.data.id === 'preview') {
        throw new Error('Missing letter ID');
      }

      setGeneratedLetterId(result.data.id);
      // Save HTML content for email sending
      setGeneratedHtmlContent(result.data.generated_content_html || '');
      // Save subject for email
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
      const subject = (getDocumentData() as { subject?: string }).subject || letterType.label;

      // Set PDF info for sharing
      const pdfFileName = `${subject} - ${recipientName}.pdf`;
      setGeneratedPdfUrl(pdfData.pdfUrl);
      setGeneratedPdfName(pdfFileName);
      setShowSharePanel(true);

      // Auto-save PDF reference to File Manager
      if (formState.selectedClientId) {
        const storagePath = `letter-pdfs/${result.data.id}.pdf`;
        const description = `מכתב קליטת חברה - ${recipientName}`;

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
      const letterType = COMPANY_ONBOARDING_LETTER_TYPES[formState.selectedLetterType];

      // Check if letter already exists for this client/group
      const existingResult = await templateService.checkExistingCompanyOnboardingLetter(
        letterType.templateType,
        formState.selectedClientId,
        formState.selectedGroupId
      );

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
      const letterType = COMPANY_ONBOARDING_LETTER_TYPES[formState.selectedLetterType];

      // Merge shared data with document-specific data
      const variables: CompanyOnboardingVariables = {
        ...formState.sharedData,
        ...getDocumentData(),
      } as CompanyOnboardingVariables;

      // Generate preview HTML (without saving to DB)
      const result = await templateService.generateCompanyOnboardingDocument(
        letterType.templateType,
        formState.selectedClientId,
        formState.selectedGroupId,
        variables,
        { previewOnly: true }
      );

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

  // Handle recipient mode change
  const handleRecipientModeChange = (mode: 'client' | 'group') => {
    setFormState(prev => ({
      ...prev,
      recipientMode: mode,
      selectedClientId: null,
      selectedGroupId: null,
      sharedData: {
        ...prev.sharedData,
        company_name: '',
      },
    }));
    setSelectedClient(null);
    setSelectedGroup(null);
  };

  // Render form for selected letter type
  const renderSelectedForm = () => {
    switch (formState.selectedLetterType) {
      case 0:
        return (
          <VatRegistrationForm
            value={formState.documentData.vatRegistration}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  vatRegistration: data,
                },
              })
            }
            disabled={generating}
          />
        );
      default:
        return null;
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

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-right">מכתבי קליטת חברה</h1>
        </div>
        <p className="text-gray-600 text-right">
          מערכת ליצירת מכתבי קליטת חברה - פתיחת תיקים במע"מ, מס הכנסה ועוד
        </p>
      </div>

      {/* Recipient Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-right">בחירת נמען</CardTitle>
          <CardDescription className="text-right">
            בחר לקוח או קבוצה לשליחת המכתב
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Mode Toggle */}
          <RadioGroup
            value={formState.recipientMode}
            onValueChange={(value) => handleRecipientModeChange(value as 'client' | 'group')}
            className="flex gap-6"
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
          </RadioGroup>

          {/* Client Selector */}
          {formState.recipientMode === 'client' && (
            <div className="space-y-2">
              <Label className="text-right block">
                בחר לקוח 
              </Label>
              <Combobox
                options={clientOptions}
                value={selectedClient?.id || ''}
                onValueChange={(value) => {
                  const client = clients.find((c) => c.id === value);
                  setSelectedClient(client || null);
                }}

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
                בחר קבוצה 
              </Label>
              <Combobox
                options={groupOptions}
                value={selectedGroup?.id || ''}
                onValueChange={(value) => {
                  const group = groups.find((g) => g.id === value);
                  setSelectedGroup(group || null);
                }}

                emptyText="לא נמצאו קבוצות"
                disabled={isLoadingGroups || generating}
                className="text-right"
              />
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
                תאריך המסמך 
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

      {/* Letter Type Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-right">סוג המכתב</CardTitle>
          <CardDescription className="text-right">
            בחר את סוג המכתב שברצונך ליצור
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyOnboardingTypeSelector
            value={formState.selectedLetterType}
            onChange={(index) =>
              setFormState({
                ...formState,
                selectedLetterType: index,
              })
            }
            disabled={generating}
          />
        </CardContent>
      </Card>

      {/* Document-Specific Form */}
      <div className="mb-8">{renderSelectedForm()}</div>

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
        defaultSubject={generatedSubject || formState.documentData.vatRegistration.subject || COMPANY_ONBOARDING_LETTER_TYPES[formState.selectedLetterType].label}
      />

      {/* Instructions */}
      {!hasRecipient && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2 text-right">הוראות:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 text-right">
            <li>בחר לקוח או קבוצה מהרשימה</li>
            <li>הוסף שורת נמען נוספת (אופציונלי)</li>
            <li>בחר תאריך למסמך</li>
            <li>בחר את סוג המכתב מהרשימה</li>
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
              תצוגה מקדימה - {COMPANY_ONBOARDING_LETTER_TYPES[formState.selectedLetterType].label}
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

export default CompanyOnboardingPage;
