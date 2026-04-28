/**
 * YaelApprovalsPage - Standalone page for Yael Software Systems approvals
 * אישורים לחברת יעל מערכות תוכנה
 *
 * Currently exposes a single letter: CPA National Insurance Approval
 * (אישור רו"ח - דוח תקורות שוטף לביטוח לאומי)
 */

import { useState, useEffect } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Eye, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { CpaApprovalForm } from '@/components/yael-approvals/CpaApprovalForm';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { TemplateService } from '@/modules/letters/services/template.service';
import { permissionsService } from '@/services/permissions.service';
import { useAuth } from '@/contexts/AuthContext';
import {
  YAEL_CPA_APPROVAL_DEFAULT_SUBJECT,
  validateYaelCpaApproval,
  createInitialYaelFormState,
  type YaelCpaApprovalVariables,
} from '@/types/yael-approvals.types';
import type { AutoLetterTemplateType } from '@/types/auto-letters.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();
const TEMPLATE_TYPE: AutoLetterTemplateType = 'yael_cpa_national_insurance_approval';

export function YaelApprovalsPage() {
  const { role } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  const [formData, setFormData] = useState<YaelCpaApprovalVariables>(createInitialYaelFormState());

  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  const [showSharePanel, setShowSharePanel] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string>('');
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  const [generatedLetterId, setGeneratedLetterId] = useState<string | undefined>(undefined);
  const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string>('');
  const [generatedSubject, setGeneratedSubject] = useState<string>('');

  // Permission check
  useEffect(() => {
    const checkAccess = async () => {
      setIsCheckingAccess(true);
      try {
        if (role === 'admin') {
          setHasAccess(true);
          return;
        }
        const allowed = await permissionsService.hasPermission('documents:yael-approvals');
        setHasAccess(allowed);
      } catch (error) {
        console.error('Error checking yael-approvals access:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };
    checkAccess();
  }, [role]);

  const isValid = validateYaelCpaApproval(formData);

  // Build variables payload merged with header fields (company_name = recipient_name for "לכבוד")
  const buildVariables = (): Record<string, unknown> => ({
    document_date: formData.document_date,
    company_name: formData.recipient_name.trim(),
    recipient_name: formData.recipient_name.trim(),
    period_end_date: formData.period_end_date,
    subject: YAEL_CPA_APPROVAL_DEFAULT_SUBJECT,
  });

  const handlePreview = async () => {
    if (!isValid) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }
    setGenerating(true);
    try {
      const result = await templateService.generateAutoLetterDocument(
        TEMPLATE_TYPE,
        null,
        null,
        buildVariables(),
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

  const handleGenerate = async () => {
    if (!isValid) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }
    setGenerating(true);
    try {
      const result = await templateService.generateAutoLetterDocument(
        TEMPLATE_TYPE,
        null,
        null,
        buildVariables()
      );
      if (result.error || !result.data) {
        throw result.error || new Error('Failed to generate document');
      }
      if (!result.data.id || result.data.id === 'preview') {
        throw new Error('Missing letter ID');
      }

      setGeneratedLetterId(result.data.id);
      setGeneratedHtmlContent(result.data.generated_content_html || '');
      setGeneratedSubject(result.data.subject || YAEL_CPA_APPROVAL_DEFAULT_SUBJECT);

      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: { letterId: result.data.id },
      });

      if (pdfError || !pdfData?.success) {
        console.error('PDF generation error:', pdfError);
        toast.error('המסמך נשמר אבל הייתה שגיאה ביצירת PDF');
        return;
      }

      const pdfFileName = `אישור רו"ח דוח תקורות - ${formData.recipient_name.trim()} - ${formData.document_date}.pdf`;
      setGeneratedPdfUrl(pdfData.pdfUrl);
      setGeneratedPdfName(pdfFileName);
      setShowSharePanel(true);
      toast.success('המסמך נוצר בהצלחה!');
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('שגיאה ביצירת המסמך');
    } finally {
      setGenerating(false);
    }
  };

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

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right text-2xl">אישורים לחברת יעל מערכות תוכנה</CardTitle>
          <CardDescription className="text-right">
            הוצאת אישורי רו"ח עבור חברת יעל מערכות תוכנה וגופים קשורים
          </CardDescription>
        </CardHeader>
      </Card>

      <CpaApprovalForm
        value={formData}
        onChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
        disabled={generating}
      />

      <div className="flex gap-3 rtl:flex-row-reverse">
        <Button onClick={handleGenerate} disabled={!isValid || generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          ייצור מסמך ו-PDF
        </Button>
        <Button variant="outline" onClick={handlePreview} disabled={!isValid || generating}>
          <Eye className="h-4 w-4" />
          תצוגה מקדימה
        </Button>
      </div>

      {/* Preview Dialog - using iframe srcDoc for safe rendering of full HTML document */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">תצוגה מקדימה</DialogTitle>
            <DialogDescription className="text-right">
              כך ייראה המכתב לפני ייצור ה-PDF
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

      {/* Share PDF Panel */}
      {showSharePanel && generatedPdfUrl && (
        <SharePdfPanel
          show={showSharePanel}
          onHide={() => setShowSharePanel(false)}
          pdfUrl={generatedPdfUrl}
          pdfName={generatedPdfName}
          clientName={formData.recipient_name.trim()}
          htmlContent={generatedHtmlContent}
          letterId={generatedLetterId}
          defaultSubject={generatedSubject}
        />
      )}
    </div>
  );
}
