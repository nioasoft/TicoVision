import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Eye, Download, Loader2 } from 'lucide-react';
import { SharedDataForm } from '@/components/foreign-workers/SharedDataForm';
import { LivingBusinessTab } from '@/components/foreign-workers/tabs/LivingBusinessTab';
import { AccountantTurnoverTab } from '@/components/foreign-workers/tabs/AccountantTurnoverTab';
import { IsraeliWorkersTab } from '@/components/foreign-workers/tabs/IsraeliWorkersTab';
import { TurnoverApprovalTab } from '@/components/foreign-workers/tabs/TurnoverApprovalTab';
import { SalaryReportTab } from '@/components/foreign-workers/tabs/SalaryReportTab';
import { SharePdfDialog } from '@/components/foreign-workers/SharePdfDialog';
import { MonthDeletionDialog, MonthLimitBadge, MonthRangeInitializer } from '@/components/foreign-workers/shared';
import { MonthRangeProvider, useMonthRange } from '@/contexts/MonthRangeContext';
import { FOREIGN_WORKER_TABS, type ForeignWorkerFormState } from '@/types/foreign-workers.types';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();

// Wrapper component that provides MonthRangeContext
export function ForeignWorkersPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <MonthRangeProvider initialClientId={selectedClientId || undefined}>
      <ForeignWorkersPageContent
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
      />
    </MonthRangeProvider>
  );
}

// Inner component that uses the MonthRangeContext
interface ForeignWorkersPageContentProps {
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
}

function ForeignWorkersPageContent({ selectedClientId, setSelectedClientId }: ForeignWorkersPageContentProps) {
  const { setClientId, range, isLoading: isLoadingRange, initializeRange } = useMonthRange();
  const [activeTab, setActiveTab] = useState(0);

  // Sync client ID with MonthRangeContext
  useEffect(() => {
    setClientId(selectedClientId);
  }, [selectedClientId, setClientId]);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  // PDF sharing state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  const [formState, setFormState] = useState<ForeignWorkerFormState>({
    selectedClientId: null,
    activeTab: 0,
    sharedData: {},
    documentData: {
      accountantTurnover: {},
      israeliWorkers: {},
      livingBusiness: {},
      turnoverApproval: {},
      salaryReport: {}
    }
  });

  // Check if shared data is complete
  const isSharedDataComplete =
    selectedClientId &&
    formState.sharedData.company_name &&
    formState.sharedData.tax_id &&
    formState.sharedData.document_date;

  // Check if current tab data is complete
  const isCurrentTabComplete = () => {
    const tab = FOREIGN_WORKER_TABS[activeTab];

    switch (tab.templateType) {
      case 'foreign_worker_living_business':
        return !!formState.documentData.livingBusiness.foreign_experts_count;

      case 'foreign_worker_accountant_turnover':
        return (
          Array.isArray(formState.documentData.accountantTurnover.monthly_turnover) &&
          formState.documentData.accountantTurnover.monthly_turnover.length > 0
        );

      case 'foreign_worker_israeli_workers':
        return (
          Array.isArray(formState.documentData.israeliWorkers.israeli_workers) &&
          formState.documentData.israeliWorkers.israeli_workers.length > 0
        );

      case 'foreign_worker_turnover_approval':
        return !!formState.documentData.turnoverApproval.scenario;

      case 'foreign_worker_salary_report':
        return (
          !!formState.documentData.salaryReport.period_start &&
          !!formState.documentData.salaryReport.period_end &&
          Array.isArray(formState.documentData.salaryReport.workers_data) &&
          formState.documentData.salaryReport.workers_data.length > 0
        );

      default:
        return false;
    }
  };

  const canGenerateDocument = isSharedDataComplete && isCurrentTabComplete();

  const handleGenerateDocument = async () => {
    if (!canGenerateDocument || !selectedClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const tab = FOREIGN_WORKER_TABS[activeTab];

      // Merge shared data with document-specific data
      let variables: any = { ...formState.sharedData };

      switch (tab.templateType) {
        case 'foreign_worker_living_business':
          variables = { ...variables, ...formState.documentData.livingBusiness };
          break;
        case 'foreign_worker_accountant_turnover':
          variables = { ...variables, ...formState.documentData.accountantTurnover };
          break;
        case 'foreign_worker_israeli_workers':
          variables = { ...variables, ...formState.documentData.israeliWorkers };
          break;
        case 'foreign_worker_turnover_approval':
          variables = { ...variables, ...formState.documentData.turnoverApproval };
          break;
        case 'foreign_worker_salary_report':
          variables = { ...variables, ...formState.documentData.salaryReport };
          break;
      }

      // Generate document
      const result = await templateService.generateForeignWorkerDocument(
        tab.templateType,
        selectedClientId,
        variables
      );

      if (result.error) {
        throw result.error;
      }

      toast.success(`המסמך "${tab.label}" נוצר בהצלחה!`);

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

      // Save PDF reference to File Manager under "אישורי עובדים זרים" category
      const pdfFileName = `${tab.label}_${formState.sharedData.company_name}.pdf`;
      const storagePath = `letter-pdfs/${result.data.id}.pdf`;
      const description = `${tab.label} - ${formState.sharedData.document_date}`;

      const saveResult = await fileUploadService.savePdfReference(
        selectedClientId,
        storagePath,
        pdfFileName,
        'foreign_worker_docs',
        description
      );

      if (saveResult.error) {
        console.warn('Failed to save PDF reference to File Manager:', saveResult.error);
        // Don't block the flow - PDF was generated successfully
      }

      // Open share dialog instead of auto-download
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

  const handlePreview = async () => {
    if (!canGenerateDocument || !selectedClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setGenerating(true);

    try {
      const tab = FOREIGN_WORKER_TABS[activeTab];

      // Merge shared data with document-specific data
      let variables: any = { ...formState.sharedData };

      switch (tab.templateType) {
        case 'foreign_worker_living_business':
          variables = { ...variables, ...formState.documentData.livingBusiness };
          break;
        case 'foreign_worker_accountant_turnover':
          variables = { ...variables, ...formState.documentData.accountantTurnover };
          break;
        case 'foreign_worker_israeli_workers':
          variables = { ...variables, ...formState.documentData.israeliWorkers };
          break;
        case 'foreign_worker_turnover_approval':
          variables = { ...variables, ...formState.documentData.turnoverApproval };
          break;
        case 'foreign_worker_salary_report':
          variables = { ...variables, ...formState.documentData.salaryReport };
          break;
      }

      // Generate preview HTML (with web paths for images)
      const result = await templateService.generateForeignWorkerDocument(
        tab.templateType,
        selectedClientId,
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

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-right">אישורי עובדים זרים</h1>
        </div>
        <p className="text-gray-600 text-right">
          מערכת ליצירת 5 סוגי אישורים למשרד הפנים - רשות האוכלוסין ההגירה ומעברי גבול
        </p>
      </div>

      {/* Shared Data Form */}
      <div className="mb-8">
        <SharedDataForm
          value={formState.sharedData}
          onChange={(data) =>
            setFormState({
              ...formState,
              sharedData: data
            })
          }
          selectedClientId={selectedClientId}
          onClientSelect={setSelectedClientId}
        />
      </div>

      {/* Document Tabs */}
      <Tabs
        value={String(activeTab)}
        onValueChange={(value) => setActiveTab(parseInt(value, 10))}
        dir="rtl"
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-5 rtl:flex-row-reverse">
          {FOREIGN_WORKER_TABS.map((tab) => (
            <TabsTrigger
              key={tab.index}
              value={String(tab.index)}
              disabled={!isSharedDataComplete}
              className="rtl:text-right"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Month Range Badge - shown for monthly data tabs (0, 1, 4) */}
        {isSharedDataComplete && selectedClientId && [0, 1, 4].includes(activeTab) && (
          <div className="flex justify-end mt-4">
            {range ? (
              <MonthLimitBadge />
            ) : (
              !isLoadingRange && (
                <div className="text-sm text-muted-foreground">
                  יש לאתחל טווח חודשים לצפייה ועריכת נתונים חודשיים
                </div>
              )
            )}
          </div>
        )}

        {/* Tab Content */}
        <TabsContent value="0" className="mt-6">
          <AccountantTurnoverTab
            value={formState.documentData.accountantTurnover}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  accountantTurnover: data
                }
              })
            }
            disabled={!isSharedDataComplete}
            clientId={selectedClientId}
          />
        </TabsContent>

        <TabsContent value="1" className="mt-6">
          <IsraeliWorkersTab
            value={formState.documentData.israeliWorkers}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  israeliWorkers: data
                }
              })
            }
            disabled={!isSharedDataComplete}
            clientId={selectedClientId}
          />
        </TabsContent>

        <TabsContent value="2" className="mt-6">
          <LivingBusinessTab
            value={formState.documentData.livingBusiness}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  livingBusiness: data
                }
              })
            }
            disabled={!isSharedDataComplete}
          />
        </TabsContent>

        <TabsContent value="3" className="mt-6">
          <TurnoverApprovalTab
            value={formState.documentData.turnoverApproval}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  turnoverApproval: data
                }
              })
            }
            disabled={!isSharedDataComplete}
            accountantTotalTurnover={formState.documentData.accountantTurnover.total_turnover}
            accountantPeriod={{
              start: formState.documentData.accountantTurnover.period_start,
              end: formState.documentData.accountantTurnover.period_end
            }}
          />
        </TabsContent>

        <TabsContent value="4" className="mt-6">
          <SalaryReportTab
            value={formState.documentData.salaryReport}
            onChange={(data) =>
              setFormState({
                ...formState,
                documentData: {
                  ...formState.documentData,
                  salaryReport: data
                }
              })
            }
            disabled={!isSharedDataComplete}
            clientId={selectedClientId}
          />
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 justify-end rtl:flex-row-reverse">
        <Button
          onClick={handleGenerateDocument}
          disabled={!canGenerateDocument || generating}
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
          disabled={!canGenerateDocument || generating}
          size="lg"
          className="min-w-[200px]"
          onClick={handlePreview}
        >
          <Eye className="ml-2 h-5 w-5" />
          תצוגה מקדימה
        </Button>
      </div>

      {/* Instructions */}
      {!isSharedDataComplete && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2 text-right">הוראות:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 text-right">
            <li>מלא את הנתונים המשותפים למעלה (לקוח, תאריך, שם רואה חשבון)</li>
            <li>בחר טאב של המסמך שברצונך ליצור</li>
            <li>מלא את הנתונים הייחודיים למסמך</li>
            <li>לחץ על "הפק מסמך PDF" ליצירת המסמך הסופי</li>
          </ol>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">תצוגה מקדימה - {FOREIGN_WORKER_TABS[activeTab].label}</DialogTitle>
            <DialogDescription className="text-right text-sm text-muted-foreground">
              צפייה מקדימה במכתב לפני שליחה
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
        clientName={formState.sharedData.company_name || ''}
      />

      {/* Month Range Deletion Confirmation Dialog */}
      <MonthDeletionDialog />
    </div>
  );
}
