/**
 * ProtocolBuilder
 * Form for creating and editing meeting protocols
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  RESPONSIBILITY_TYPES,
  CONTENT_SECTION_TYPES,
  getResponsibilityTypeInfo,
  getContentSectionTypeInfo,
} from '../types/protocol.types';
import type { AttendeeSourceType, ContentSectionType } from '../types/protocol.types';
import {
  Save,
  Lock,
  ArrowRight,
  CalendarDays,
  FileText,
  Eye,
  FileDown,
  Loader2,
  Download,
  FolderPlus,
  Check,
  Users,
  ListTodo,
  Building2,
  User as UserIcon,
  Calculator,
  Users as UsersIcon,
  AlertTriangle,
  Megaphone,
  BookOpen,
  Lightbulb,
  Briefcase,
} from 'lucide-react';
import { AttendeeSelector } from './AttendeeSelector';
import { DecisionsList } from './DecisionsList';
import { ContentSectionEditor } from './ContentSectionEditor';
import { protocolService } from '../services/protocol.service';
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
  const [locking, setLocking] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [savingToFileManager, setSavingToFileManager] = useState(false);
  const [savedToFileManager, setSavedToFileManager] = useState(false);
  const [savedProtocolId, setSavedProtocolId] = useState<string | null>(protocol?.id || null);
  const [formState, setFormState] = useState<ProtocolFormState>({
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
    title: '',
    attendees: [],
    decisions: [],
    content_sections: [],
  });

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
          responsibility_type: d.responsibility_type,
          assigned_employee_id: d.assigned_employee_id,
          assigned_other_name: d.assigned_other_name,
          audit_report_year: d.audit_report_year,
          sort_order: d.sort_order,
        })),
        content_sections: protocol.content_sections.map((s) => ({
          section_type: s.section_type,
          content: s.content,
          sort_order: s.sort_order,
        })),
      });
    }
  }, [protocol]);

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
      const { error } = await protocolService.saveProtocolForm(
        protocol?.id || null,
        clientId,
        groupId,
        formState
      );

      if (error) {
        console.error('Failed to save protocol:', error);
        return;
      }

      onSave();
    } finally {
      setSaving(false);
    }
  };

  // Lock the protocol
  const handleLock = async () => {
    if (!protocol?.id) return;

    setLocking(true);
    try {
      // First save any pending changes
      const { data: savedProtocol, error: saveError } = await protocolService.saveProtocolForm(
        protocol.id,
        clientId,
        groupId,
        formState
      );

      if (saveError || !savedProtocol) {
        console.error('Failed to save before locking:', saveError);
        return;
      }

      // Then lock
      const { error: lockError } = await protocolService.lockProtocol(savedProtocol.id);

      if (lockError) {
        console.error('Failed to lock protocol:', lockError);
        return;
      }

      onSave();
    } finally {
      setLocking(false);
      setLockDialogOpen(false);
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
    } catch {
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

  // Helper functions for preview icons
  const getSourceIcon = (type: AttendeeSourceType) => {
    switch (type) {
      case 'contact':
        return <UserIcon className="h-3 w-3" />;
      case 'employee':
        return <Building2 className="h-3 w-3" />;
      case 'external':
        return <Briefcase className="h-3 w-3" />;
    }
  };

  const getResponsibilityIcon = (type: string) => {
    switch (type) {
      case 'office':
        return <Building2 className="h-4 w-4" />;
      case 'client':
        return <UserIcon className="h-4 w-4" />;
      case 'bookkeeper':
        return <Calculator className="h-4 w-4" />;
      case 'other':
        return <UsersIcon className="h-4 w-4" />;
    }
  };

  const getSectionIcon = (type: ContentSectionType) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'background_story':
        return <BookOpen className="h-4 w-4" />;
      case 'recommendation':
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  // Group decisions by responsibility type for preview
  const groupedDecisions = RESPONSIBILITY_TYPES.map((typeInfo) => ({
    ...typeInfo,
    decisions: formState.decisions.filter((d) => d.responsibility_type === typeInfo.type),
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
          <div className="flex items-center justify-between flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse">
              <Button
                onClick={handlePreview}
                variant="secondary"
                className="flex items-center gap-2 flex-row-reverse"
              >
                <Eye className="h-4 w-4" />
                תצוגה מקדימה
              </Button>
              {!isNew && (
                <Button
                  onClick={() => setLockDialogOpen(true)}
                  disabled={saving || locking}
                  variant="outline"
                  className="flex items-center gap-2 flex-row-reverse"
                >
                  <Lock className="h-4 w-4" />
                  שמור ונעל
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 flex-row-reverse"
              >
                <Save className="h-4 w-4" />
                {saving ? 'שומר...' : 'שמירה'}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                ביטול
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-row-reverse">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <CardTitle>
                  {isNew ? 'פרוטוקול חדש' : 'עריכת פרוטוקול'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {recipientName}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-left flex items-center gap-2" dir="rtl">
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
                  כותרת (אופציונלי)
                </Label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="תאר את נושא הפגישה"
                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Attendees Section */}
          <AttendeeSelector
            clientId={clientId}
            groupId={groupId}
            attendees={formState.attendees}
            onChange={handleAttendeesChange}
          />

          <Separator />

          {/* Decisions Section */}
          <DecisionsList
            decisions={formState.decisions}
            onChange={handleDecisionsChange}
          />

          <Separator />

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

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-start gap-2 flex-row-reverse pt-4">
            <Button
              onClick={handlePreview}
              variant="secondary"
              className="flex items-center gap-2 flex-row-reverse"
            >
              <Eye className="h-4 w-4" />
              תצוגה מקדימה
            </Button>
            {!isNew && (
              <Button
                onClick={() => setLockDialogOpen(true)}
                disabled={saving || locking}
                variant="outline"
                className="flex items-center gap-2 flex-row-reverse"
              >
                <Lock className="h-4 w-4" />
                שמור ונעל
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 flex-row-reverse"
            >
              <Save className="h-4 w-4" />
              {saving ? 'שומר...' : 'שמירה'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">נעילת פרוטוקול</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              לאחר נעילת הפרוטוקול לא ניתן יהיה לערוך אותו. האם ברצונך להמשיך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <AlertDialogAction onClick={handleLock} disabled={locking}>
              {locking ? 'נועל...' : 'שמור ונעל'}
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog - Document Style (like PDF) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0" dir="rtl">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-right flex items-center gap-2 flex-row-reverse">
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
                                <li key={idx} className="leading-relaxed text-right">
                                  {decision.content}
                                  {decision.urgency === 'urgent' && (
                                    <span className="text-red-600 font-bold mr-2">(דחוף)</span>
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
                                <p className="whitespace-pre-wrap text-right">{section.content}</p>
                              </div>
                            ))}
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

                {/* Signature Lines */}
                {(formState.attendees.length > 0 || formState.decisions.length > 0 || formState.content_sections.length > 0) && (
                  <div className="mt-12 pt-6 border-t">
                    <div className="flex justify-between flex-row-reverse">
                      <div className="text-center w-2/5">
                        <p className="text-gray-500 text-sm mb-10">חתימת נציג המשרד:</p>
                        <div className="border-b border-black w-32 mx-auto"></div>
                      </div>
                      <div className="text-center w-2/5">
                        <p className="text-gray-500 text-sm mb-10">חתימת הלקוח:</p>
                        <div className="border-b border-black w-32 mx-auto"></div>
                      </div>
                    </div>
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
            <DialogTitle className="text-right flex items-center gap-2 flex-row-reverse">
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
              className="w-full flex items-center justify-center gap-2 flex-row-reverse"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4" />
              הורד למחשב
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 flex-row-reverse"
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
          </div>
          <DialogFooter className="flex gap-2 flex-row-reverse justify-start">
            <Button onClick={onSave}>
              סיום
            </Button>
            <Button variant="ghost" onClick={handleClosePdfDialog}>
              חזרה לעריכה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
