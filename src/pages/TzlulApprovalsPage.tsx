import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, Eye, Download, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { TzlulLetterTypeSelector } from '@/components/tzlul-approvals/TzlulLetterTypeSelector';
import { ViolationCorrectionForm } from '@/components/tzlul-approvals/forms/ViolationCorrectionForm';
import { SummerBonusForm } from '@/components/tzlul-approvals/forms/SummerBonusForm';
import { ExcellenceBonusForm } from '@/components/tzlul-approvals/forms/ExcellenceBonusForm';
import { EmployeePaymentsForm } from '@/components/tzlul-approvals/forms/EmployeePaymentsForm';
import { TransferredAmountsForm } from '@/components/tzlul-approvals/forms/TransferredAmountsForm';
import { SharePdfDialog } from '@/components/foreign-workers/SharePdfDialog';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { permissionsService } from '@/services/permissions.service';
import { userClientAssignmentService } from '@/services/user-client-assignment.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  TZLUL_CLIENT_NAME,
  TZLUL_LETTER_TYPES,
  createInitialTzlulFormState,
  validateViolationCorrection,
  validateSummerBonus,
  validateExcellenceBonus,
  validateEmployeePayments,
  validateTransferredAmounts,
  type TzlulFormState,
  type TzlulVariables,
} from '@/types/tzlul-approvals.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();

export function TzlulApprovalsPage() {
  // Auth and access control
  const { user, role } = useAuth();
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');

  // Check access to Tzlul client on mount
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);

      try {
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
  }, [user, role]);

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
      default:
        return {};
    }
  };

  // Check if can generate (has date and document data)
  const canGenerate = formState.sharedData.document_date && isCurrentDocumentValid();

  // Generate document and PDF
  const handleGenerateDocument = async () => {
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

      // Generate document
      const result = await templateService.generateTzlulDocument(
        letterType.templateType,
        tzlulClientId,
        variables
      );

      if (result.error) {
        throw result.error;
      }

      toast.success(`המסמך "${letterType.label}" נוצר בהצלחה!`);

      // Generate PDF using Edge Function
      if (!result.data?.id) {
        throw new Error('Missing letter ID');
      }

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
      setShowShareDialog(true);
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('שגיאה ביצירת המסמך');
    } finally {
      setGenerating(false);
    }
  };

  // Generate preview
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

      // Generate preview HTML
      const result = await templateService.generateTzlulDocument(
        letterType.templateType,
        tzlulClientId,
        variables
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
          מערכת ליצירת 5 סוגי אישורים עבור חברת צלול ניקיון ואחזקה בע"מ
        </p>
      </div>

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

      {/* Share PDF Dialog */}
      <SharePdfDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        pdfUrl={generatedPdfUrl || ''}
        pdfName={generatedPdfName}
        clientName={TZLUL_CLIENT_NAME}
        clientId={tzlulClientId || undefined}
      />
    </div>
  );
}
