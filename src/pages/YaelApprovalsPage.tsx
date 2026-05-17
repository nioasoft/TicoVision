/**
 * YaelApprovalsPage - Approvals page for Yael Software Systems
 * אישורים לחברת יעל תכנה ומערכות
 *
 * Mirrors TzlulApprovalsPage structure (Tabs: Approvals + Signature for Identification,
 * shared data card, letter type selector, per-letter form switch, preview, generate, share).
 *
 * Uses the generic auto-letter infrastructure (templateService.generateAutoLetterDocument)
 * rather than a dedicated method. Adding new Yael letters = adding to AutoLetterTemplateType,
 * a body HTML, a form component, and an entry in YAEL_LETTER_TYPES.
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Eye, Download, Loader2, ShieldAlert, PenTool } from 'lucide-react';
import { YaelLetterTypeSelector } from '@/components/yael-approvals/YaelLetterTypeSelector';
import { CpaApprovalForm } from '@/components/yael-approvals/forms/CpaApprovalForm';
import { OverheadRateComplianceForm } from '@/components/yael-approvals/forms/OverheadRateComplianceForm';
import { SignatureIdentificationTab } from '@/components/shared/SignatureIdentificationTab';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { userClientAssignmentService } from '@/services/user-client-assignment.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  YAEL_CLIENT_NAME,
  YAEL_CLIENT_ID,
  YAEL_LETTER_TYPES,
  createInitialYaelFormState,
  validateCpaApproval,
  validateOverheadRateCompliance,
  type YaelFormState,
} from '@/types/yael-approvals.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();

export function YaelApprovalsPage() {
  // Auth and access control
  const { user, role, isRestrictedUser } = useAuth();
  const { isMenuVisible, loading: permissionsLoading } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [yaelClientId, setYaelClientId] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Form state
  const [formState, setFormState] = useState<YaelFormState>(createInitialYaelFormState());

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

  // Check access to Yael client on mount
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);

      try {
        // Restricted users have access enforced by ProtectedRoute
        if (isRestrictedUser) {
          const { data: clients } = await supabase
            .from('clients')
            .select('id')
            .eq('company_name', YAEL_CLIENT_NAME)
            .maybeSingle();

          setYaelClientId(clients?.id || YAEL_CLIENT_ID);
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // 1. Find Yael client by name
        const { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('company_name', YAEL_CLIENT_NAME)
          .single();

        if (clientError || !clients) {
          setYaelClientId(YAEL_CLIENT_ID);
        } else {
          setYaelClientId(clients.id);
        }

        const clientId = clients?.id || YAEL_CLIENT_ID;

        // 2. Check if user has access
        if (role === 'admin') {
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // Wait for permissions to load (extra_menus + role overrides)
        if (permissionsLoading) {
          return;
        }

        if (!isMenuVisible('documents:yael-approvals')) {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        const { data: assignments } = await userClientAssignmentService.getAssignmentsForUser(user?.id || '');
        const hasClientAccess = assignments?.some(a => a.client_id === clientId) || false;

        setHasAccess(hasClientAccess);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user, role, isRestrictedUser, permissionsLoading, isMenuVisible]);

  // Get current document data based on selected letter type
  const getDocumentData = () => {
    switch (formState.selectedLetterType) {
      case 0:
        return formState.documentData.cpaApproval ?? {};
      case 1:
        return formState.documentData.overheadRateCompliance ?? {};
      default:
        return {};
    }
  };

  // Validate current document data
  const isCurrentDocumentValid = (): boolean => {
    const letterType = YAEL_LETTER_TYPES[formState.selectedLetterType];
    const mergedData = {
      ...formState.sharedData,
      ...getDocumentData(),
    };

    switch (letterType.templateType) {
      case 'yael_cpa_national_insurance_approval':
        return validateCpaApproval(mergedData);
      case 'yael_overhead_rate_compliance':
        return validateOverheadRateCompliance(mergedData);
      default:
        return false;
    }
  };

  // Build the variables payload sent to generateAutoLetterDocument
  const buildVariables = (): Record<string, unknown> => {
    const letterType = YAEL_LETTER_TYPES[formState.selectedLetterType];
    const documentData = getDocumentData();

    const base: Record<string, unknown> = {
      ...formState.sharedData,
      ...documentData,
      subject: letterType.defaultSubject,
    };

    // CPA approval: header "לכבוד" should display the editable recipient_name
    if (letterType.templateType === 'yael_cpa_national_insurance_approval') {
      const cpa = documentData as { recipient_name?: string; period_end_date?: string };
      base.company_name = cpa.recipient_name?.trim() || YAEL_CLIENT_NAME;
    }

    // Overhead Rate Compliance: header "לכבוד" displays the ordering office name
    if (letterType.templateType === 'yael_overhead_rate_compliance') {
      const orc = documentData as {
        recipient_office_name?: string;
        supplier_name?: string;
        tender_number?: string;
      };
      base.company_name = orc.recipient_office_name?.trim() || '';
    }

    return base;
  };

  const canGenerate = !!formState.sharedData.document_date && isCurrentDocumentValid();

  // Generate document and PDF
  const executeGenerateDocument = async (existingLetterId?: string) => {
    if (!yaelClientId) return;

    setGenerating(true);

    try {
      const letterType = YAEL_LETTER_TYPES[formState.selectedLetterType];
      const variables = buildVariables();

      const result = await templateService.generateAutoLetterDocument(
        letterType.templateType,
        yaelClientId,
        null,
        variables,
        { existingLetterId }
      );

      if (result.error) {
        throw result.error;
      }

      const actionText = existingLetterId ? 'עודכן' : 'נוצר';
      toast.success(`המסמך "${letterType.label}" ${actionText} בהצלחה!`);

      if (!result.data?.id || result.data.id === 'preview') {
        throw new Error('Missing letter ID');
      }

      setGeneratedLetterId(result.data.id);
      setGeneratedHtmlContent(result.data.generated_content_html || '');
      setGeneratedSubject(result.data.subject || letterType.defaultSubject);

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: { letterId: result.data.id },
      });

      if (pdfError || !pdfData?.success) {
        console.error('PDF generation error:', pdfError);
        toast.error('המסמך נשמר אבל הייתה שגיאה ביצירת PDF');
        return;
      }

      // Save PDF reference to File Manager under "general" (letters) category
      const pdfFileName = `${letterType.label}_יעל_${formState.sharedData.document_date}.pdf`;
      const storagePath = `letter-pdfs/${result.data.id}.pdf`;
      const description = `${letterType.label} - ${formState.sharedData.document_date}`;

      const saveResult = await fileUploadService.savePdfReference(
        yaelClientId,
        storagePath,
        pdfFileName,
        'general',
        description
      );

      if (saveResult.error) {
        console.warn('Failed to save PDF reference to File Manager:', saveResult.error);
      }

      setGeneratedPdfUrl(pdfData.pdfUrl);
      setGeneratedPdfName(pdfFileName);
      setShowSharePanel(true);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('שגיאה ביצירת המסמך');
    } finally {
      setGenerating(false);
    }
  };

  // Generate document - checks for existing letter first
  const handleGenerateDocument = async () => {
    if (!canGenerate || !yaelClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const letterType = YAEL_LETTER_TYPES[formState.selectedLetterType];

      const existingResult = await templateService.checkExistingAutoLetter(
        letterType.templateType,
        yaelClientId,
        null
      );

      if (existingResult.data) {
        setGenerating(false);
        setExistingLetterDialog({
          open: true,
          existingLetterId: existingResult.data.id,
          existingLetterDate: existingResult.data.created_at,
        });
        return;
      }

      await executeGenerateDocument();
    } catch (error) {
      console.error('Error checking existing letter:', error);
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

  // Generate preview (without saving to DB)
  const handlePreview = async () => {
    if (!canGenerate || !yaelClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const letterType = YAEL_LETTER_TYPES[formState.selectedLetterType];
      const variables = buildVariables();

      const result = await templateService.generateAutoLetterDocument(
        letterType.templateType,
        yaelClientId,
        null,
        variables,
        { previewOnly: true }
      );

      if (result.error || !result.data) {
        throw result.error || new Error('Failed to generate preview');
      }

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

  // Render loading state
  if (isCheckingAccess) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex items-center justify-center min-h-[400px]" dir="rtl">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg">בודק הרשאות...</span>
        </div>
      </div>
    );
  }

  // Render no access state
  if (!hasAccess) {
    return (
      <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle className="text-right">אין הרשאה</AlertTitle>
          <AlertDescription className="text-right">
            אין לך הרשאה לגשת לדף זה. יש לפנות למנהל המערכת אם אתה סבור שמדובר בשגיאה.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render form for selected letter type
  const renderSelectedForm = () => {
    switch (formState.selectedLetterType) {
      case 0:
        return (
          <CpaApprovalForm
            value={formState.documentData.cpaApproval ?? {}}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  cpaApproval: data,
                },
              })
            }
            disabled={generating}
          />
        );
      case 1:
        return (
          <OverheadRateComplianceForm
            value={formState.documentData.overheadRateCompliance ?? {}}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  overheadRateCompliance: data,
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

  return (
    <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-right">אישורים לחברת יעל תכנה ומערכות</h1>
        </div>
        <p className="text-gray-600 text-right">
          מערכת ליצירת אישורים עבור חברת יעל תכנה ומערכות בע"מ וגופים קשורים
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="approvals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            אישורים
          </TabsTrigger>
          <TabsTrigger value="signature" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            חתימה לשם זיהוי
          </TabsTrigger>
        </TabsList>

        {/* Approvals Tab */}
        <TabsContent value="approvals">
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
                  <p className="text-sm text-gray-500 text-right">
                    התאריך שיופיע בכותרת המכתב
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-right block">לקוח</Label>
                  <Input
                    value={YAEL_CLIENT_NAME}
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
              <CardTitle className="text-right">סוג המסמך</CardTitle>
              <CardDescription className="text-right">
                בחר את סוג האישור שברצונך ליצור
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YaelLetterTypeSelector
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

          {/* Share PDF Panel - inline after generating */}
          <SharePdfPanel
            show={showSharePanel}
            onHide={() => setShowSharePanel(false)}
            pdfUrl={generatedPdfUrl || ''}
            pdfName={generatedPdfName}
            clientName={YAEL_CLIENT_NAME}
            clientId={yaelClientId || undefined}
            htmlContent={generatedHtmlContent}
            letterId={generatedLetterId || undefined}
            defaultSubject={generatedSubject || YAEL_LETTER_TYPES[formState.selectedLetterType].defaultSubject}
            fileCategory="letters"
          />

          {/* Instructions */}
          {!formState.sharedData.document_date && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2 text-right">הוראות:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 text-right">
                <li>בחר תאריך למסמך</li>
                <li>בחר את סוג האישור מהרשימה</li>
                <li>מלא את השדות הנדרשים בטופס</li>
                <li>לחץ על "תצוגה מקדימה" לצפייה במסמך</li>
                <li>לחץ על "הפק מסמך PDF" ליצירת המסמך הסופי</li>
              </ol>
            </div>
          )}
        </TabsContent>

        {/* Signature Tab */}
        <TabsContent value="signature">
          <SignatureIdentificationTab />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog - using iframe srcDoc for safe rendering of full HTML document */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              תצוגה מקדימה - {YAEL_LETTER_TYPES[formState.selectedLetterType].label}
            </DialogTitle>
            <DialogDescription className="text-right text-sm text-muted-foreground">
              צפייה מקדימה במכתב לפני הפקה
            </DialogDescription>
          </DialogHeader>
          <iframe
            title="Letter preview"
            srcDoc={previewHtml}
            sandbox="allow-same-origin"
            className="w-full border rounded-md bg-white"
            style={{ height: '70vh' }}
          />
        </DialogContent>
      </Dialog>

      {/* Existing Letter Dialog */}
      <AlertDialog
        open={existingLetterDialog.open}
        onOpenChange={(open) =>
          !open && setExistingLetterDialog({ open: false, existingLetterId: null, existingLetterDate: null })
        }
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">קיים מכתב קודם</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              קיים כבר מכתב מסוג זה מתאריך{' '}
              {existingLetterDialog.existingLetterDate
                ? new Date(existingLetterDialog.existingLetterDate).toLocaleDateString('he-IL')
                : ''}
              .
              <br />
              האם לעדכן את המכתב הקיים או ליצור מכתב חדש?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={() => handleExistingLetterChoice('update')}>
              עדכן קיים
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleExistingLetterChoice('new')}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              צור חדש
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
