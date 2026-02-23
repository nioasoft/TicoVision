import { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Eye, Download, Loader2, AlertTriangle } from 'lucide-react';
import { SharedDataForm } from '@/components/foreign-workers/SharedDataForm';
import { LivingBusinessTab } from '@/components/foreign-workers/tabs/LivingBusinessTab';
import { AccountantTurnoverTab, type AccountantTurnoverTabRef } from '@/components/foreign-workers/tabs/AccountantTurnoverTab';
import { IsraeliWorkersTab, type IsraeliWorkersTabRef } from '@/components/foreign-workers/tabs/IsraeliWorkersTab';
import { TurnoverApprovalTab } from '@/components/foreign-workers/tabs/TurnoverApprovalTab';
import { SalaryReportTab, type SalaryReportTabRef } from '@/components/foreign-workers/tabs/SalaryReportTab';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { MonthDeletionDialog, MonthLimitBadge, MonthRangeInitializer } from '@/components/foreign-workers/shared';
import { MonthRangeProvider, useMonthRange } from '@/contexts/MonthRangeContext';
import { MonthlyDataService } from '@/services/monthly-data.service';
import { FOREIGN_WORKER_TABS, type ForeignWorkerFormState } from '@/types/foreign-workers.types';
import { TemplateService } from '@/modules/letters/services/template.service';
import { fileUploadService } from '@/services/file-upload.service';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();

// Wrapper component that provides MonthRangeContext
export function ForeignWorkersPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  return (
    <MonthRangeProvider
      initialBranchId={selectedBranchId || undefined}
      initialClientId={selectedClientId || undefined}
    >
      <ForeignWorkersPageContent
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        selectedBranchId={selectedBranchId}
        setSelectedBranchId={setSelectedBranchId}
      />
    </MonthRangeProvider>
  );
}

// Inner component that uses the MonthRangeContext
interface ForeignWorkersPageContentProps {
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
  selectedBranchId: string | null;
  setSelectedBranchId: (id: string | null) => void;
}

function ForeignWorkersPageContent({
  selectedClientId,
  setSelectedClientId,
  selectedBranchId,
  setSelectedBranchId,
}: ForeignWorkersPageContentProps) {
  const { setBranchId, range, displayMonths, displayStartIndex, setDisplayStartIndex, isLoading: isLoadingRange, initializeRange, extendRange } = useMonthRange();
  const [activeTab, setActiveTab] = useState(0);

  // For monthly data tabs, use displayMonths directly (always 12 months or less)
  const printRange = displayMonths
    ? {
        startMonth: displayMonths[0],
        endMonth: displayMonths[displayMonths.length - 1],
        months: displayMonths,
        monthCount: displayMonths.length
      }
    : null;

  // Refs for tab components to enable auto-save
  const accountantTurnoverRef = useRef<AccountantTurnoverTabRef>(null);
  const israeliWorkersRef = useRef<IsraeliWorkersTabRef>(null);
  const salaryReportRef = useRef<SalaryReportTabRef>(null);

  // Sync branch ID with MonthRangeContext
  useEffect(() => {
    setBranchId(selectedBranchId, selectedClientId);
  }, [selectedBranchId, selectedClientId, setBranchId]);

  // Handler for combined client and branch selection
  const handleBranchChange = (branchId: string | null, clientId: string | null, _branchName: string | null, _isDefault: boolean, _isSingleBranch: boolean) => {
    setSelectedBranchId(branchId);
    if (clientId !== selectedClientId) {
      setSelectedClientId(clientId);
    }
  };
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
  const [formState, setFormState] = useState<ForeignWorkerFormState>({
    selectedClientId: null,
    activeTab: 0,
    sharedData: {},
    documentData: {
      accountantTurnover: {},
      israeliWorkers: {},
      livingBusiness: { certificate_year: new Date().getFullYear() },
      turnoverApproval: {},
      salaryReport: {}
    }
  });

  // Client contacts for signature section (salary report)
  const [clientContacts, setClientContacts] = useState<{
    primaryContact: { full_name: string; job_title?: string; role_at_client?: string; signature_path?: string | null } | null;
    accountantManager: { full_name: string; job_title?: string; signature_path?: string | null } | null;
    clientSignaturePath?: string | null;  // Company stamp from clients table
  }>({ primaryContact: null, accountantManager: null, clientSignaturePath: null });

  // Close share panel when switching client, branch, or tab
  useEffect(() => {
    setShowSharePanel(false);
    setGeneratedPdfUrl(null);
    setGeneratedPdfName('');
    setGeneratedLetterId(null);
    setGeneratedHtmlContent('');
    setGeneratedSubject('');
  }, [selectedClientId, selectedBranchId, formState.activeTab]);

  // Fetch client contacts when client changes
  useEffect(() => {
    const fetchClientContacts = async () => {
      if (!selectedClientId) {
        setClientContacts({ primaryContact: null, accountantManager: null, clientSignaturePath: null });
        return;
      }

      try {
        // Fetch contacts and client signature in parallel
        const [contactsResult, clientResult] = await Promise.all([
          supabase.rpc('get_client_contacts_detailed', { p_client_id: selectedClientId }),
          supabase.from('clients').select('signature_path').eq('id', selectedClientId).single()
        ]);

        if (contactsResult.error) {
          console.error('Error fetching client contacts:', contactsResult.error);
        }

        const contacts = contactsResult.data || [];
        const primary = contacts.find((c: { is_primary: boolean }) => c.is_primary);
        const accountant = contacts.find((c: { contact_type: string }) => c.contact_type === 'accountant_manager');

        setClientContacts({
          primaryContact: primary ? {
            full_name: primary.full_name,
            job_title: primary.job_title,
            role_at_client: primary.role_at_client,
            signature_path: primary.signature_path
          } : null,
          accountantManager: accountant ? {
            full_name: accountant.full_name,
            job_title: accountant.job_title,
            signature_path: accountant.signature_path
          } : null,
          clientSignaturePath: clientResult.data?.signature_path || null
        });
      } catch (err) {
        console.error('Error fetching client contacts:', err);
      }
    };

    fetchClientContacts();
  }, [selectedClientId]);

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

  // For monthly data tabs (0, 1, 4), need valid print range (12 months)
  const requiresMonthlyData = [0, 1, 4].includes(activeTab);
  const hasPrintRange = !requiresMonthlyData || (printRange && printRange.monthCount === 12);

  const canGenerateDocument = isSharedDataComplete && isCurrentTabComplete() && hasPrintRange;

  // Helper function to save current tab data before preview/generate
  const saveCurrentTabData = async (): Promise<boolean> => {
    switch (activeTab) {
      case 0:
        return (await accountantTurnoverRef.current?.save()) ?? true;
      case 1:
        return (await israeliWorkersRef.current?.save()) ?? true;
      case 4:
        return (await salaryReportRef.current?.save()) ?? true;
      default:
        // Tabs 2, 3 don't have DB data to save
        return true;
    }
  };

  const handleGenerateDocument = async () => {
    if (!canGenerateDocument || !selectedClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    // Auto-save current tab data before generating
    const saved = await saveCurrentTabData();
    if (!saved) {
      // Error toast already shown by the save function
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
          // Fetch signatures as base64 in parallel
          const [seniorSigResult, financeSigResult, companySigResult] = await Promise.all([
            clientContacts.primaryContact?.signature_path
              ? fileUploadService.getSignatureAsBase64(clientContacts.primaryContact.signature_path)
              : Promise.resolve({ data: null, error: null }),
            clientContacts.accountantManager?.signature_path
              ? fileUploadService.getSignatureAsBase64(clientContacts.accountantManager.signature_path)
              : Promise.resolve({ data: null, error: null }),
            clientContacts.clientSignaturePath
              ? fileUploadService.getSignatureAsBase64(clientContacts.clientSignaturePath)
              : Promise.resolve({ data: null, error: null })
          ]);

          variables = {
            ...variables,
            ...formState.documentData.salaryReport,
            // Add contact info for signature section
            senior_manager_name: clientContacts.primaryContact?.full_name || '______________________',
            senior_manager_title: 'מנהל',
            senior_manager_signature: seniorSigResult.data || '',
            finance_manager_name: clientContacts.accountantManager?.full_name || '______________________',
            finance_manager_title: clientContacts.accountantManager?.job_title || 'מנהלת חשבונות',
            finance_manager_signature: financeSigResult.data || '',
            company_stamp_signature: companySigResult.data || '',
          };
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

      // Save PDF reference to File Manager under "אישורי עובדים זרים" category
      // Include worker name in filename ONLY for salary reports (index 4)
      const workerName = activeTab === 4
        ? formState.documentData.salaryReport?.workers_data?.[0]?.full_name
        : undefined;
      const pdfFileName = workerName
        ? `${tab.label}_${workerName}_${formState.sharedData.company_name}.pdf`
        : `${tab.label}_${formState.sharedData.company_name}.pdf`;
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
      } else {
        // Delete from generated_letters - we don't need drafts for foreign worker docs
        // The PDF is already saved to client's file manager
        await supabase
          .from('generated_letters')
          .delete()
          .eq('id', result.data.id);
      }

      // Open share dialog instead of auto-download
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

  const handlePreview = async () => {
    if (!canGenerateDocument || !selectedClientId) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    // Auto-save current tab data before preview
    const saved = await saveCurrentTabData();
    if (!saved) {
      // Error toast already shown by the save function
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
          // Fetch signatures as base64 in parallel for preview
          const [seniorSigPreview, financeSigPreview, companySigPreview] = await Promise.all([
            clientContacts.primaryContact?.signature_path
              ? fileUploadService.getSignatureAsBase64(clientContacts.primaryContact.signature_path)
              : Promise.resolve({ data: null, error: null }),
            clientContacts.accountantManager?.signature_path
              ? fileUploadService.getSignatureAsBase64(clientContacts.accountantManager.signature_path)
              : Promise.resolve({ data: null, error: null }),
            clientContacts.clientSignaturePath
              ? fileUploadService.getSignatureAsBase64(clientContacts.clientSignaturePath)
              : Promise.resolve({ data: null, error: null })
          ]);

          variables = {
            ...variables,
            ...formState.documentData.salaryReport,
            // Add contact info for signature section
            senior_manager_name: clientContacts.primaryContact?.full_name || '______________________',
            senior_manager_title: 'מנהל',
            senior_manager_signature: seniorSigPreview.data || '',
            finance_manager_name: clientContacts.accountantManager?.full_name || '______________________',
            finance_manager_title: clientContacts.accountantManager?.job_title || 'מנהלת חשבונות',
            finance_manager_signature: financeSigPreview.data || '',
            company_stamp_signature: companySigPreview.data || '',
          };
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

      // Delete the generated_letters record - preview doesn't need to persist
      await supabase
        .from('generated_letters')
        .delete()
        .eq('id', result.data.id);
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
          selectedBranchId={selectedBranchId}
          onBranchChange={handleBranchChange}
        />
      </div>

      {/* Display range selector - always show for selecting which 12 months to view */}
      {range && range.monthCount > 0 && (
        <div className="flex gap-3 mb-6 items-center justify-end">
          <span className="text-sm font-medium">תצוגת חודשים החל מ:</span>
          <Select
            value={String(displayStartIndex)}
            onValueChange={async (v) => {
              const val = Number(v);
              if (val < 0) {
                // Extend range to the past and set start index to 0 (to view the new months)
                const monthsToAdd = Math.abs(val);
                await extendRange('past', monthsToAdd, 0);
              } else {
                // Check if selecting this month would show less than 12 months
                const remainingMonths = range.monthCount - val;
                if (remainingMonths < 12) {
                  // Automatically extend forward to maintain 12 months
                  const monthsToAdd = 12 - remainingMonths;
                  await extendRange('future', monthsToAdd, val);
                } else {
                  setDisplayStartIndex(val);
                }
              }
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Previous 3 months options */}
              {Array.from({ length: 3 }).map((_, i) => {
                const monthsBack = 3 - i; // 3, 2, 1
                const date = new Date(range.startMonth);
                date.setMonth(date.getMonth() - monthsBack);
                return (
                  <SelectItem key={`prev-${monthsBack}`} value={String(-monthsBack)} className="text-muted-foreground italic">
                    Load {MonthlyDataService.dateToHebrew(date)} (+{monthsBack})
                  </SelectItem>
                );
              })}
              
              {/* Existing months options */}
              {range.months.map((month, index) => (
                <SelectItem key={index} value={String(index)}>
                  {MonthlyDataService.dateToHebrew(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            עד: <strong>{displayMonths ? MonthlyDataService.dateToHebrew(displayMonths[displayMonths.length - 1]) : '-'}</strong>
            ({displayMonths ? displayMonths.length : 0} חודשים)
          </span>
        </div>
      )}

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

        {/* Tab Content */}
        <TabsContent value="0" className="mt-6">
          <AccountantTurnoverTab
            key={`${selectedClientId}-${selectedBranchId}` || 'no-client-branch'}
            ref={accountantTurnoverRef}
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
            branchId={selectedBranchId}
          />
        </TabsContent>

        <TabsContent value="1" className="mt-6">
          <IsraeliWorkersTab
            key={`${selectedClientId}-${selectedBranchId}` || 'no-client-branch'}
            ref={israeliWorkersRef}
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
            branchId={selectedBranchId}
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
            key={`${selectedClientId}-${selectedBranchId}` || 'no-client-branch'}
            ref={salaryReportRef}
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
            branchId={selectedBranchId}
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

      {/* Share PDF Panel - Inline after generating PDF */}
      <SharePdfPanel
        show={showSharePanel}
        onHide={() => setShowSharePanel(false)}
        pdfUrl={generatedPdfUrl || ''}
        pdfName={generatedPdfName}
        clientName={formState.sharedData.company_name || ''}
        clientId={selectedClientId || undefined}
        htmlContent={generatedHtmlContent}
        letterId={generatedLetterId || undefined}
        defaultSubject={generatedSubject || FOREIGN_WORKER_TABS[formState.activeTab]?.label || 'מסמך עובדים זרים'}
      />

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


      {/* Month Range Deletion Confirmation Dialog */}
      <MonthDeletionDialog />
    </div>
  );
}
