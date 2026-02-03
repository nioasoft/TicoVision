/**
 * ProtocolPreview
 * Read-only view of a locked protocol with print/PDF capability
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight,
  Copy,
  Printer,
  FileDown,
  CalendarDays,
  Users,
  ListTodo,
  FileText,
  Building2,
  User as UserIcon,
  Calculator,
  Users as UsersIcon,
  AlertTriangle,
  Megaphone,
  BookOpen,
  Lightbulb,
  Briefcase,
  Download,
  FolderPlus,
  Loader2,
  Check,
  MoreHorizontal,
  Pencil,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { protocolService } from '../services/protocol.service';
import { userService } from '@/services/user.service';
import type { User } from '@/services/user.service';
import {
  RESPONSIBILITY_TYPES,
  CONTENT_SECTION_TYPES,
  getResponsibilityTypeInfo,
  getContentSectionTypeInfo,
} from '../types/protocol.types';
import type { ProtocolWithRelations, AttendeeSourceType, ContentSectionType } from '../types/protocol.types';
import { getContentClasses, getContentStyle } from './StyleToolbar';
import { SendProtocolEmailDialog } from './SendProtocolEmailDialog';

interface ProtocolPreviewProps {
  protocol: ProtocolWithRelations;
  onBack: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

export function ProtocolPreview({
  protocol,
  onBack,
  onEdit,
  onDuplicate,
}: ProtocolPreviewProps) {
  const { toast } = useToast();
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [savingToFileManager, setSavingToFileManager] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [savedToFileManager, setSavedToFileManager] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);

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
  const employeeMap = employees.reduce<Record<string, string>>((acc, emp) => {
    acc[emp.id] = emp.full_name;
    return acc;
  }, {});

  const recipientName = protocol.client
    ? protocol.client.company_name_hebrew || protocol.client.company_name
    : protocol.group
    ? protocol.group.group_name_hebrew || ''
    : '';

  // Generate PDF
  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    setSavedToFileManager(false);
    try {
      const { data, error } = await protocolService.generateProtocolPdf(protocol.id);
      if (error || !data) {
        toast({
          title: 'שגיאה',
          description: error?.message || 'יצירת PDF נכשלה',
          variant: 'destructive',
        });
        return;
      }
      setPdfUrl(data.pdfUrl);
      setPdfFileName(data.fileName);
      setPdfDialogOpen(true);
    } catch {
      toast({
        title: 'שגיאה',
        description: 'יצירת PDF נכשלה',
        variant: 'destructive',
      });
    } finally {
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
    if (!pdfUrl) return;
    setSavingToFileManager(true);
    try {
      const { error } = await protocolService.saveProtocolToFileManager(
        protocol.id,
        pdfUrl,
        protocol.client_id,
        protocol.group_id
      );
      if (error) {
        console.error('Save to file manager failed:', {
          protocolId: protocol.id,
          clientId: protocol.client_id,
          groupId: protocol.group_id,
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

  // Get icon for source type
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

  // Get icon for responsibility type
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

  // Get icon for section type
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

  // Group decisions by responsibility type
  const groupedDecisions = RESPONSIBILITY_TYPES.map((typeInfo) => ({
    ...typeInfo,
    decisions: protocol.decisions.filter((d) => d.responsibility_type === typeInfo.type),
  })).filter((g) => g.decisions.length > 0);

  // Group content sections by type
  const groupedSections = CONTENT_SECTION_TYPES.map((typeInfo) => ({
    ...typeInfo,
    sections: protocol.content_sections.filter((s) => s.section_type === typeInfo.type),
  })).filter((g) => g.sections.length > 0);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardHeader className="rtl:text-right print:pb-2">
        <div className="flex items-center justify-between print:hidden" dir="rtl">
          {/* Right side - Back button and title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="text-right">
              <CardTitle className="flex items-center gap-2">
                פרוטוקול
              </CardTitle>
              <CardDescription className="mt-1">
                {recipientName}
              </CardDescription>
            </div>
          </div>
          {/* Left side - Actions */}
          <div className="flex items-center gap-2">
            {/* Primary action: Export PDF */}
            <Button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="flex items-center gap-2"
            >
              {generatingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {generatingPdf ? 'יוצר PDF...' : 'ייצוא PDF'}
            </Button>
            {/* More actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" dir="rtl">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 ml-2" />
                  שכפול
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 ml-2" />
                  הדפסה
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 ml-2" />
                  עריכה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold rtl:text-right">פרוטוקול פגישה</h1>
          <p className="text-lg rtl:text-right">{recipientName}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 print:space-y-4">
        {/* Meeting Details */}
        <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:p-3">
          <div className="flex items-center gap-2 rtl:flex-row-reverse mb-3">
            <CalendarDays className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold">פרטי הפגישה</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 rtl:text-right">
            <div>
              <p className="text-sm text-gray-500">תאריך פגישה</p>
              <p className="font-medium">
                {format(new Date(protocol.meeting_date), 'EEEE, dd בMMMM yyyy', { locale: he })}
              </p>
            </div>
            {protocol.title && (
              <div>
                <p className="text-sm text-gray-500">כותרת</p>
                <p className="font-medium">{protocol.title}</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendees */}
        {protocol.attendees.length > 0 && (
          <>
            <Separator className="print:my-2" />
            <div className="bg-blue-50/50 rounded-lg p-4 print:bg-white print:p-3">
              <div className="flex items-center gap-2 mb-3" dir="rtl">
                <Users className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">משתתפים</h3>
                <Badge variant="secondary">{protocol.attendees.length}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3">
                {protocol.attendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="bg-white rounded-lg p-3 border print:p-2"
                  >
                    <div className="flex items-center gap-2 mb-1" dir="rtl">
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getSourceIcon(attendee.source_type)}
                      </Badge>
                      <span className="font-medium text-sm">{attendee.display_name}</span>
                    </div>
                    {attendee.role_title && (
                      <p className="text-xs text-gray-500 text-right">{attendee.role_title}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Content Sections */}
        {protocol.content_sections.length > 0 && (
          <>
            <Separator className="print:my-2" />
            <div>
              <div className="flex items-center gap-2 rtl:flex-row-reverse mb-3">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold">תוכן נוסף</h3>
              </div>
              <div className="space-y-4 print:space-y-3">
                {groupedSections.map((group) => {
                  const typeInfo = getContentSectionTypeInfo(group.type);
                  return (
                    <div key={group.type} className="print:break-inside-avoid">
                      <div className="flex items-center gap-2 rtl:flex-row-reverse mb-2">
                        {getSectionIcon(group.type)}
                        <span className="font-medium">{typeInfo.labelPlural}</span>
                        <Badge variant="secondary">{group.sections.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {group.sections.map((section) => (
                          <div
                            key={section.id}
                            className="bg-gray-50 rounded-lg p-4 border print:bg-white print:p-3"
                          >
                            <p
                              className={cn('text-sm rtl:text-right whitespace-pre-wrap', getContentClasses(section.style))}
                              style={getContentStyle(section.style)}
                            >
                              {section.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Decisions */}
        {protocol.decisions.length > 0 && (
          <>
            <Separator className="print:my-2" />
            <div>
              <div className="flex items-center gap-2 rtl:flex-row-reverse mb-3">
                <ListTodo className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold">החלטות</h3>
                <Badge variant="secondary">{protocol.decisions.length}</Badge>
              </div>
              <div className="space-y-4 print:space-y-3">
                {groupedDecisions.map((group) => {
                  const typeInfo = getResponsibilityTypeInfo(group.type);
                  return (
                    <div
                      key={group.type}
                      className={cn(
                        'rounded-lg border-2 p-4 print:p-3 print:break-inside-avoid',
                        typeInfo.borderColor,
                        typeInfo.bgColor
                      )}
                    >
                      <div className="flex items-center gap-2 rtl:flex-row-reverse mb-3">
                        {getResponsibilityIcon(group.type)}
                        <span className={cn('font-semibold', typeInfo.color)}>
                          {group.label}
                        </span>
                        <Badge variant="secondary">{group.decisions.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {group.decisions.map((decision, idx) => (
                          <div
                            key={decision.id}
                            className="bg-white rounded-lg p-3 border print:p-2"
                          >
                            <div className="flex items-start gap-2 rtl:flex-row-reverse">
                              <span className="font-medium text-gray-400 mt-0.5">
                                {idx + 1}.
                              </span>
                              <div className="flex-1 rtl:text-right">
                                <p
                                  className={cn('text-sm', getContentClasses(decision.style))}
                                  style={getContentStyle(decision.style)}
                                >
                                  {decision.content}
                                </p>
                                <div className="flex items-center gap-2 mt-2 rtl:flex-row-reverse flex-wrap">
                                  {decision.urgency === 'urgent' && (
                                    <Badge variant="destructive" className="flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      דחוף
                                    </Badge>
                                  )}
                                  {decision.assigned_employee_id && (
                                    <Badge variant="outline" className="text-xs text-blue-600">
                                      אחראי: {employeeMap[decision.assigned_employee_id] || 'עובד'}
                                    </Badge>
                                  )}
                                  {decision.assigned_other_name && (
                                    <Badge variant="outline" className="text-xs">
                                      {decision.assigned_other_name}
                                    </Badge>
                                  )}
                                  {decision.audit_report_year && (
                                    <Badge variant="secondary" className="text-xs">
                                      דוח {decision.audit_report_year}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <Separator className="print:my-2" />
        <div className="flex items-center justify-between text-sm text-gray-500 rtl:flex-row-reverse print:text-xs">
          <span>
            נוצר:{' '}
            {format(new Date(protocol.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
          </span>
        </div>

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
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPdfDialogOpen(false)}>
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send Email Dialog */}
        <SendProtocolEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          protocolId={protocol.id}
          clientId={protocol.client_id}
          groupId={protocol.group_id}
          recipientName={recipientName}
          onSuccess={() => {
            toast({
              title: 'הצלחה',
              description: 'הפרוטוקול נשלח בהצלחה',
            });
          }}
        />
      </CardContent>
    </Card>
  );
}
