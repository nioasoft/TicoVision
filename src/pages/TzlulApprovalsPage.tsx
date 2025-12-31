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
import { FileText, Eye, Download, Loader2, AlertTriangle, ShieldAlert, PenTool } from 'lucide-react';
import { TzlulLetterTypeSelector } from '@/components/tzlul-approvals/TzlulLetterTypeSelector';
import { ViolationCorrectionForm } from '@/components/tzlul-approvals/forms/ViolationCorrectionForm';
import { SummerBonusForm } from '@/components/tzlul-approvals/forms/SummerBonusForm';
import { ExcellenceBonusForm } from '@/components/tzlul-approvals/forms/ExcellenceBonusForm';
import { EmployeePaymentsForm } from '@/components/tzlul-approvals/forms/EmployeePaymentsForm';
import { TransferredAmountsForm } from '@/components/tzlul-approvals/forms/TransferredAmountsForm';
import { GoingConcernForm } from '@/components/tzlul-approvals/forms/GoingConcernForm';
import { SignatureIdentificationTab } from '@/components/tzlul-approvals/SignatureIdentificationTab';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { permissionsService } from '@/services/permissions.service';
import { userClientAssignmentService } from '@/services/user-client-assignment.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  TZLUL_CLIENT_NAME,
  TZLUL_CLIENT_ID,
  TZLUL_LETTER_TYPES,
  createInitialTzlulFormState,
  validateViolationCorrection,
  validateSummerBonus,
  validateExcellenceBonus,
  validateEmployeePayments,
  validateTransferredAmounts,
  validateGoingConcern,
  type TzlulFormState,
  type TzlulVariables,
} from '@/types/tzlul-approvals.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();

export function TzlulApprovalsPage() {
  // Auth and access control
  const { user, role, isRestrictedUser } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [tzlulClientId, setTzlulClientId] = useState<string | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Form state
  const [formState, setFormState] = useState<TzlulFormState>(createInitialTzlulFormState());

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

  // Check access to Tzlul client on mount
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);

      try {
        // Restricted users have access enforced by ProtectedRoute - no need for client lookup
        if (isRestrictedUser) {
          // Try to find client ID, but use fallback if RLS blocks access
          const { data: clients } = await supabase
            .from('clients')
            .select('id')
            .eq('company_name', TZLUL_CLIENT_NAME)
            .maybeSingle();

          // Use queried ID or fallback to constant
          setTzlulClientId(clients?.id || TZLUL_CLIENT_ID);
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // 1. Find Tzlul client by name
        const { data: clients, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('company_name', TZLUL_CLIENT_NAME)
          .single();

        if (clientError || !clients) {
          console.error('Tzlul client not found:', clientError);
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        const clientId = clients.id;
        setTzlulClientId(clientId);

        // 2. Check if user has access
        // Admin always has access
        if (role === 'admin') {
          setHasAccess(true);
          setIsCheckingAccess(false);
          return;
        }

        // Check permission
        const hasPermission = await permissionsService.hasPermission('documents:tzlul-approvals');
        if (!hasPermission) {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        // Check client assignment for non-admin users
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
  }, [user, role, isRestrictedUser]);

  // Validate current document data
  const isCurrentDocumentValid = (): boolean => {
    const letterType = TZLUL_LETTER_TYPES[formState.selectedLetterType];

    // Merge shared data with document-specific data for validation
    const mergedData = {
      ...formState.sharedData,
      ...getDocumentData(),
    };

    switch (letterType.templateType) {
      case 'tzlul_violation_correction':
        return validateViolationCorrection(mergedData);
      case 'tzlul_summer_bonus':
        return validateSummerBonus(mergedData);
      case 'tzlul_excellence_bonus':
        return validateExcellenceBonus(mergedData);
      case 'tzlul_employee_payments':
        return validateEmployeePayments(mergedData);
      case 'tzlul_transferred_amounts':
        return validateTransferredAmounts(mergedData);
      case 'tzlul_going_concern':
        return validateGoingConcern(mergedData);
      default:
        return false;
    }
  };

  // Get current document data based on selected letter type
  const getDocumentData = () => {
    switch (formState.selectedLetterType) {
      case 0:
        return formState.documentData.violationCorrection;
      case 1:
        return formState.documentData.summerBonus;
      case 2:
        return formState.documentData.excellenceBonus;
      case 3:
        return formState.documentData.employeePayments;
      case 4:
        return formState.documentData.transferredAmounts;
      case 5:
        return formState.documentData.goingConcern;
      default:
        return {};
    }
  };

  // Check if can generate (has date and document data)
  const canGenerate = formState.sharedData.document_date && isCurrentDocumentValid();

  // Generate document and PDF - main logic
  const executeGenerateDocument = async (existingLetterId?: string) => {
    if (!tzlulClientId) return;

    setGenerating(true);

    try {
      const letterType = TZLUL_LETTER_TYPES[formState.selectedLetterType];

      // Merge shared data with document-specific data
      const variables: TzlulVariables = {
        ...formState.sharedData,
        ...getDocumentData(),
      } as TzlulVariables;

      // Generate document (with optional existing letter ID for update)
      const result = await templateService.generateTzlulDocument(
        letterType.templateType,
        tzlulClientId,
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

      // Save letter ID, HTML content and subject for email sending
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

      // Save PDF reference to File Manager under "letters" category
      const pdfFileName = `${letterType.label}_צלול_${formState.sharedData.document_date}.pdf`;
      const storagePath = `letter-pdfs/${result.data.id}.pdf`;
      const description = `${letterType.label} - ${formState.sharedData.document_date}`;

      const saveResult = await fileUploadService.savePdfReference(
        tzlulClientId,
        storagePath,
        pdfFileName,
        'general', // letters category
        description
      );

      if (saveResult.error) {
        console.warn('Failed to save PDF reference to File Manager:', saveResult.error);
      }

      // Open share dialog
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
    if (!canGenerate || !tzlulClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const letterType = TZLUL_LETTER_TYPES[formState.selectedLetterType];

      // Check if letter already exists for this client
      const existingResult = await templateService.checkExistingTzlulLetter(
        letterType.templateType,
        tzlulClientId
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

  // Generate preview (without saving to DB)
  const handlePreview = async () => {
    if (!canGenerate || !tzlulClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const letterType = TZLUL_LETTER_TYPES[formState.selectedLetterType];

      // Merge shared data with document-specific data
      const variables: TzlulVariables = {
        ...formState.sharedData,
        ...getDocumentData(),
      } as TzlulVariables;

      // Generate preview HTML (without saving to DB)
      const result = await templateService.generateTzlulDocument(
        letterType.templateType,
        tzlulClientId,
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
          <ViolationCorrectionForm
            value={formState.documentData.violationCorrection}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  violationCorrection: data,
                },
              })
            }
            disabled={generating}
          />
        );
      case 1:
        return (
          <SummerBonusForm
            value={formState.documentData.summerBonus}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  summerBonus: data,
                },
              })
            }
            disabled={generating}
          />
        );
      case 2:
        return (
          <ExcellenceBonusForm
            value={formState.documentData.excellenceBonus}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  excellenceBonus: data,
                },
              })
            }
            disabled={generating}
          />
        );
      case 3:
        return (
          <EmployeePaymentsForm
            value={formState.documentData.employeePayments}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  employeePayments: data,
                },
              })
            }
            disabled={generating}
          />
        );
      case 4:
        return (
          <TransferredAmountsForm
            value={formState.documentData.transferredAmounts}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  transferredAmounts: data,
                },
              })
            }
            disabled={generating}
          />
        );
      case 5:
        return (
          <GoingConcernForm
            value={formState.documentData.goingConcern}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  goingConcern: data,
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
          <h1 className="text-3xl font-bold text-right">אישורים חברת צלול</h1>
        </div>
        <p className="text-gray-600 text-right">
          מערכת ליצירת אישורים עבור חברת צלול ניקיון ואחזקה בע"מ
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
                תאריך ההצהרה <span className="text-red-500">*</span>
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
                "בהצהרה מיום X" - התאריך הראשון בכותרת המכתב
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-right block">לקוח</Label>
              <Input
                value={TZLUL_CLIENT_NAME}
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
          <TzlulLetterTypeSelector
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
        clientName={TZLUL_CLIENT_NAME}
        clientId={tzlulClientId || undefined}
        htmlContent={generatedHtmlContent}
        letterId={generatedLetterId || undefined}
        defaultSubject={generatedSubject || TZLUL_LETTER_TYPES[formState.selectedLetterType].label}
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

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              תצוגה מקדימה - {TZLUL_LETTER_TYPES[formState.selectedLetterType].label}
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
              קיים כבר מכתב מסוג זה מתאריך{' '}
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
