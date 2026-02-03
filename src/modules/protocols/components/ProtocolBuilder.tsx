/**
 * ProtocolBuilder
 * Form for creating and editing meeting protocols
 */

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  RESPONSIBILITY_TYPES,
  CONTENT_SECTION_TYPES,
  getContentSectionTypeInfo,
  type SaveStatusInfo,
} from '../types/protocol.types';
import {
  Save,
  ArrowRight,
  CalendarDays,
  FileText,
  Eye,
  FileDown,
  Loader2,
  Download,
  FolderPlus,
  Check,
  Mail,
} from 'lucide-react';
import { AttendeeSelector } from './AttendeeSelector';
import { DecisionsList } from './DecisionsList';
import { ContentSectionEditor } from './ContentSectionEditor';
import { getContentClasses, getContentStyle } from './StyleToolbar';
import { SendProtocolEmailDialog } from './SendProtocolEmailDialog';
import { SaveStatusIndicator } from './SaveStatusIndicator';
import { useProtocolAutoSave } from '../hooks/useProtocolAutoSave';
import { protocolService } from '../services/protocol.service';
import { userService } from '@/services/user.service';
import type { User } from '@/services/user.service';
import type {
  ProtocolWithRelations,
  ProtocolFormState,
  CreateAttendeeDto,
  CreateDecisionDto,
  CreateContentSectionDto,
} from '../types/protocol.types';

interface ProtocolBuilderProps {
  protocol: ProtocolWithRelations | null;
  clientId: string | null;
  groupId: string | null;
  recipientName: string;
  onSave: () => void;
  onCancel: () => void;
}

export function ProtocolBuilder({
  protocol,
  clientId,
  groupId,
  recipientName,
  onSave,
  onCancel,
}: ProtocolBuilderProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [savingToFileManager, setSavingToFileManager] = useState(false);
  const [savedToFileManager, setSavedToFileManager] = useState(false);
  const [savedProtocolId, setSavedProtocolId] = useState<string | null>(protocol?.id || null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);
  const [formState, setFormState] = useState<ProtocolFormState>({
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
    title: '',
    attendees: [],
    decisions: [],
    content_sections: [],
  });

  // Auto-save hook
  const { saveStatus, triggerSave, resetStatus } = useProtocolAutoSave({
    protocolId: savedProtocolId,
    clientId,
    groupId,
    formState,
    debounceDelay: 2000,
    onProtocolIdChange: (newId) => {
      setSavedProtocolId(newId);
    },
  });

  // Load employees for displaying assigned employee names
  useEffect(() => {
    const loadEmployees = async () => {
      const { data } = await userService.getUsers();
      if (data) {
        setEmployees(data.users.filter((u) => u.is_active));
      }
    };
    loadEmployees();
  }, []);

  // Create employee map for quick lookup
  const employeeMap = employees.reduce<Record<string, User>>((acc, emp) => {
    acc[emp.id] = emp;
    return acc;
  }, {});

  // Track if protocol has been loaded (to reset auto-save after loading)
  const protocolLoadedRef = useRef(false);

  // Initialize form state from existing protocol
  useEffect(() => {
    if (protocol) {
      setFormState({
        meeting_date: protocol.meeting_date,
        title: protocol.title || '',
        attendees: protocol.attendees.map((a) => ({
          source_type: a.source_type,
          contact_id: a.contact_id,
          user_id: a.user_id,
          display_name: a.display_name,
          role_title: a.role_title,
        })),
        decisions: protocol.decisions.map((d) => ({
          content: d.content,
          urgency: d.urgency,
          responsibility_types: d.responsibility_types || ['office'],
          assigned_employee_id: d.assigned_employee_id,
          assigned_other_name: d.assigned_other_name,
          audit_report_year: d.audit_report_year,
          sort_order: d.sort_order,
          style: d.style || {},
        })),
        content_sections: protocol.content_sections.map((s) => ({
          section_type: s.section_type,
          content: s.content,
          sort_order: s.sort_order,
          style: s.style || {},
        })),
      });
      // Mark that we need to reset auto-save status after form state updates
      protocolLoadedRef.current = true;
    }
  }, [protocol]);

  // Reset auto-save status after protocol data is loaded into form
  // This prevents auto-save from thinking the loaded data is "dirty"
  useEffect(() => {
    if (protocolLoadedRef.current && protocol) {
      // Use setTimeout to ensure form state has been applied
      const timer = setTimeout(() => {
        resetStatus();
        protocolLoadedRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [protocol, resetStatus]);

  // Handle form field changes
  const handleFieldChange = (field: keyof ProtocolFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Handle attendee changes
  const handleAttendeesChange = (attendees: CreateAttendeeDto[]) => {
    setFormState((prev) => ({ ...prev, attendees }));
  };

  // Handle decision changes
  const handleDecisionsChange = (decisions: CreateDecisionDto[]) => {
    setFormState((prev) => ({ ...prev, decisions }));
  };

  // Handle content section changes
  const handleContentSectionsChange = (content_sections: CreateContentSectionDto[]) => {
    setFormState((prev) => ({ ...prev, content_sections }));
  };

  // Save the protocol
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await protocolService.saveProtocolForm(
        savedProtocolId,
        clientId,
        groupId,
        formState
      );

      if (error) {
        console.error('Failed to save protocol:', error);
        return;
      }

      // Update saved protocol ID if new
      if (data?.id && !savedProtocolId) {
        setSavedProtocolId(data.id);
      }

      // Reset auto-save status since we just saved
      resetStatus();

      onSave();
    } finally {
      setSaving(false);
    }
  };

  const isNew = !protocol;

  // Handle preview
  const handlePreview = () => {
    setPreviewOpen(true);
  };

  // Save and generate PDF from preview
  const handleSaveAndGeneratePdf = async () => {
    setSaving(true);
    setGeneratingPdf(true);
    try {
      // First save the protocol
      const { data: savedProtocol, error: saveError } = await protocolService.saveProtocolForm(
        savedProtocolId,
        clientId,
        groupId,
        formState
      );

      if (saveError || !savedProtocol) {
        console.error('Failed to save protocol:', saveError);
        toast({
          title: 'שגיאה',
          description: 'שמירת הפרוטוקול נכשלה',
          variant: 'destructive',
        });
        return;
      }

      // Update saved protocol ID for future saves
      setSavedProtocolId(savedProtocol.id);

      // Then generate PDF
      const { data: pdfData, error: pdfError } = await protocolService.generateProtocolPdf(savedProtocol.id);
      if (pdfError || !pdfData) {
        toast({
          title: 'שגיאה',
          description: pdfError?.message || 'יצירת PDF נכשלה',
          variant: 'destructive',
        });
        return;
      }

      setPdfUrl(pdfData.pdfUrl);
      setPdfFileName(pdfData.fileName);
      setSavedToFileManager(false);
      setPreviewOpen(false);
      setPdfDialogOpen(true);
    } finally {
      setSaving(false);
      setGeneratingPdf(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = pdfFileName || 'protocol.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save to file manager
  const handleSaveToFileManager = async () => {
    if (!pdfUrl || !savedProtocolId) return;
    setSavingToFileManager(true);
    try {
      const { error } = await protocolService.saveProtocolToFileManager(
        savedProtocolId,
        pdfUrl,
        clientId,
        groupId
      );
      if (error) {
        console.error('Save to file manager failed:', {
          protocolId: savedProtocolId,
          clientId,
          groupId,
          error,
        });
        toast({
          title: 'שגיאה',
          description: error.message || 'שמירה למנהל הקבצים נכשלה',
          variant: 'destructive',
        });
        return;
      }
      setSavedToFileManager(true);
      toast({
        title: 'הצלחה',
        description: 'הפרוטוקול נשמר למנהל הקבצים',
      });
    } catch (err) {
      console.error('Save to file manager exception:', err);
      toast({
        title: 'שגיאה',
        description: 'שמירה למנהל הקבצים נכשלה',
        variant: 'destructive',
      });
    } finally {
      setSavingToFileManager(false);
    }
  };

  // Close PDF dialog and go back to editing
  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
  };

  // Save from preview and close
  const handleSaveFromPreview = async () => {
    setSaving(true);
    try {
      const { data: savedProtocol, error } = await protocolService.saveProtocolForm(
        savedProtocolId,
        clientId,
        groupId,
        formState
      );

      if (error || !savedProtocol) {
        console.error('Failed to save protocol:', error);
        toast({
          title: 'שגיאה',
          description: 'שמירת הפרוטוקול נכשלה',
          variant: 'destructive',
        });
        return;
      }

      setSavedProtocolId(savedProtocol.id);
      setPreviewOpen(false);
      onSave();
    } finally {
      setSaving(false);
    }
  };

  // Group decisions by responsibility type for preview (decisions with multiple types appear in multiple groups)
  const groupedDecisions = RESPONSIBILITY_TYPES.map((typeInfo) => ({
    ...typeInfo,
    decisions: formState.decisions.filter((d) => d.responsibility_types.includes(typeInfo.type)),
  })).filter((g) => g.decisions.length > 0);

  // Group content sections by type for preview
  const groupedSections = CONTENT_SECTION_TYPES.map((typeInfo) => ({
    ...typeInfo,
    sections: formState.content_sections.filter((s) => s.section_type === typeInfo.type),
  })).filter((g) => g.sections.length > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between" dir="rtl">
            {/* Right side - Back button and title */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <div className="flex items-center gap-3">
                  <CardTitle>
                    {isNew ? 'פרוטוקול חדש' : 'עריכת פרוטוקול'}
                  </CardTitle>
                  <SaveStatusIndicator
                    saveStatus={saveStatus}
                    onRetry={triggerSave}
                  />
                </div>
                <CardDescription className="mt-1">
                  {recipientName}
                </CardDescription>
              </div>
            </div>
            {/* Left side - Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'שומר...' : 'שמירה'}
              </Button>
              <Button
                onClick={handlePreview}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                תצוגה מקדימה
              </Button>
              <Button
                onClick={handleSaveAndGeneratePdf}
                disabled={generatingPdf || saving}
                variant="outline"
                className="flex items-center gap-2"
              >
                {generatingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {generatingPdf ? 'יוצר PDF...' : 'ייצוא PDF'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold rtl:text-right ltr:text-left flex items-center gap-2 flex-row justify-end" dir="ltr">
              <CalendarDays className="h-5 w-5" />
              פרטי הפגישה
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting_date" className="text-right block">
                  תאריך פגישה
                </Label>
                <Input
                  id="meeting_date"
                  type="date"
                  value={formState.meeting_date}
                  onChange={(e) => handleFieldChange('meeting_date', e.target.value)}
                  className="text-right"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-right block">
                  כותרת
                </Label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}

                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Attendees Section */}
          <AttendeeSelector
            clientId={clientId}
            groupId={groupId}
            attendees={formState.attendees}
            onChange={handleAttendeesChange}
          />

          {/* Content Sections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-left flex items-center gap-2" dir="rtl">
              <FileText className="h-5 w-5" />
              תוכן נוסף
            </h3>
            <ContentSectionEditor
              sections={formState.content_sections}
              onChange={handleContentSectionsChange}
            />
          </div>

          <Separator />

          {/* Decisions Section */}
          <DecisionsList
            decisions={formState.decisions}
            onChange={handleDecisionsChange}
          />
        </CardContent>
      </Card>

      {/* Preview Dialog - Document Style (like PDF) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-right flex items-center gap-2">
              <Eye className="h-5 w-5" />
              תצוגה מקדימה
            </DialogTitle>
            <DialogDescription className="text-right">
              כך יראה המסמך לאחר ייצוא ל-PDF
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] overflow-auto">
            {/* Document Container - styled like A4 paper */}
            <div className="mx-6 mb-4 bg-white border border-gray-300 shadow-sm rounded" dir="rtl">
              <div className="p-8 font-serif text-right" style={{ fontFamily: "'David Libre', 'Heebo', serif" }}>
                {/* Document Header - Centered */}
                <div className="text-center mb-8 border-b pb-6">
                  <h1 className="text-2xl font-bold mb-2">פרוטוקול פגישה</h1>
                  <p className="text-lg text-gray-700">{recipientName}</p>
                </div>

                {/* Meeting Details Box */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
                  <p className="mb-1">
                    <strong>תאריך פגישה:</strong>{' '}
                    {format(new Date(formState.meeting_date), 'EEEE, dd בMMMM yyyy', { locale: he })}
                  </p>
                  {formState.title && (
                    <p className="mt-2">
                      <strong>נושא:</strong> {formState.title}
                    </p>
                  )}
                </div>

                {/* Attendees - Simple bullet list like PDF */}
                {formState.attendees.length > 0 && (
                  <div className="mb-6 text-right">
                    <h2 className="text-base font-bold mb-3 border-b pb-2 text-right">משתתפים</h2>
                    <ul className="space-y-1 pr-5" style={{ listStyleType: 'disc', listStylePosition: 'inside' }}>
                      {formState.attendees.map((attendee, idx) => (
                        <li key={idx}>{attendee.display_name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Content Sections */}
                {formState.content_sections.length > 0 && (
                  <div className="mb-6 text-right">
                    <h2 className="text-base font-bold mb-3 border-b pb-2 text-right">תוכן נוסף</h2>
                    <div className="space-y-4">
                      {groupedSections.map((group) => {
                        const typeInfo = getContentSectionTypeInfo(group.type);
                        return (
                          <div key={group.type} className="text-right">
                            <h3 className="font-bold mb-2 text-right">{typeInfo.labelPlural}</h3>
                            {group.sections.map((section, idx) => (
                              <div
                                key={idx}
                                className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-2 text-right"
                              >
                                <p className={cn('whitespace-pre-wrap text-right', getContentClasses(section.style))} style={getContentStyle(section.style)}>{section.content}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Decisions - Grouped by responsibility with colored boxes like PDF */}
                {formState.decisions.length > 0 && (
                  <div className="mb-6 text-right">
                    <h2 className="text-base font-bold mb-3 border-b pb-2 text-right">החלטות</h2>
                    <div className="space-y-4">
                      {groupedDecisions.map((group) => {
                        const bgColor = group.type === 'office' ? 'bg-red-50' :
                                       group.type === 'client' ? 'bg-yellow-50' :
                                       group.type === 'bookkeeper' ? 'bg-green-50' : 'bg-gray-50';
                        const borderColor = group.type === 'office' ? 'border-red-200' :
                                           group.type === 'client' ? 'border-yellow-200' :
                                           group.type === 'bookkeeper' ? 'border-green-200' : 'border-gray-200';
                        return (
                          <div
                            key={group.type}
                            className={cn('rounded-lg border-2 p-4 text-right', bgColor, borderColor)}
                          >
                            <h3 className="font-bold mb-3 text-right">{group.label}</h3>
                            <ol className="space-y-2 pr-5" style={{ listStyleType: 'decimal', listStylePosition: 'inside' }}>
                              {group.decisions.map((decision, idx) => (
                                <li key={idx} className={cn('leading-relaxed text-right', getContentClasses(decision.style))} style={getContentStyle(decision.style)}>
                                  {decision.content}
                                  {decision.urgency === 'urgent' && (
                                    <span className="text-red-600 font-bold mr-2">(דחוף)</span>
                                  )}
                                  {decision.assigned_employee_id && (
                                    <span className="text-blue-600 text-sm mr-2">
                                      - אחראי: {employeeMap[decision.assigned_employee_id]?.full_name || 'עובד'}
                                    </span>
                                  )}
                                  {decision.assigned_other_name && (
                                    <span className="text-gray-500 text-sm mr-2">
                                      - {decision.assigned_other_name}
                                    </span>
                                  )}
                                  {decision.audit_report_year && (
                                    <span className="text-gray-500 text-sm mr-2">
                                      (דוח {decision.audit_report_year})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {formState.attendees.length === 0 &&
                  formState.decisions.length === 0 &&
                  formState.content_sections.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">הפרוטוקול ריק</p>
                    <p className="text-sm">הוסף משתתפים, החלטות או תוכן</p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 pb-6 flex gap-2 flex-row-reverse justify-start">
            <Button
              onClick={handleSaveAndGeneratePdf}
              disabled={saving || generatingPdf}
              className="flex items-center gap-2 flex-row-reverse"
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {generatingPdf ? 'יוצר PDF...' : 'שמור וייצא PDF'}
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveFromPreview}
              disabled={saving}
              className="flex items-center gap-2 flex-row-reverse"
            >
              <Save className="h-4 w-4" />
              {saving ? 'שומר...' : 'שמירה'}
            </Button>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              חזרה לעריכה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Options Dialog */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              PDF נוצר בהצלחה
            </DialogTitle>
            <DialogDescription className="text-right">
              בחר מה לעשות עם קובץ ה-PDF
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4" />
              הורד למחשב
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={handleSaveToFileManager}
              disabled={savingToFileManager || savedToFileManager}
            >
              {savingToFileManager ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedToFileManager ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              {savingToFileManager
                ? 'שומר...'
                : savedToFileManager
                ? 'נשמר למנהל קבצים'
                : 'שמור למנהל קבצים'}
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                setPdfDialogOpen(false);
                setEmailDialogOpen(true);
              }}
            >
              <Mail className="h-4 w-4" />
              שלח במייל
            </Button>
          </div>
          <DialogFooter className="flex gap-2 justify-start">
            <Button onClick={onSave}>
              סיום
            </Button>
            <Button variant="ghost" onClick={handleClosePdfDialog}>
              חזרה לעריכה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Success Dialog - Show after protocol is locked */}
      <Dialog open={lockSuccessDialogOpen} onOpenChange={setLockSuccessDialogOpen}>
        <DialogContent className="text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              הפרוטוקול ננעל בהצלחה
            </DialogTitle>
            <DialogDescription className="text-right">
              הפרוטוקול נשמר ונעול. מה תרצה לעשות עכשיו?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={handleGeneratePdfAfterLock}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {generatingPdf ? 'יוצר PDF...' : 'ייצא PDF'}
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => {
                setLockSuccessDialogOpen(false);
                onSave();
              }}
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לרשימה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <SendProtocolEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        protocolId={savedProtocolId}
        clientId={clientId}
        groupId={groupId}
        recipientName={recipientName}
        onSuccess={() => {
          toast({
            title: 'הצלחה',
            description: 'הפרוטוקול נשלח בהצלחה',
          });
        }}
      />
    </>
  );
}
