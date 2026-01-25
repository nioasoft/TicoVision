/**
 * Capital Declaration Detail Page (פרטי הצהרת הון)
 * View and manage a single capital declaration with documents, communications, and due dates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import {
  ArrowRight,
  RefreshCw,
  Copy,
  ExternalLink,
  Download,
  Trash2,
  FileText,
  Clock,
  Mail,
  Phone,
  Building2,
  Home,
  Shield,
  Car,
  Globe,
  FolderOpen,
  Users,
  Calendar,
  Eye,
  CheckCircle,
  User,
  Upload,
  Image,
  Loader2,
  MessageCircle,
  History,
  Edit,
} from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { supabase } from '@/lib/supabase';
import {
  PriorityBadge,
  AssignAccountantSelect,
  WhatsAppReminderButton,
  CommunicationHistoryCard,
  LogCommunicationDialog,
  SendReminderDialog,
  StatusChangeDialog,
  PenaltyManagementCard,
  LateSubmissionIndicator,
  SubmissionScreenshotLink,
} from '@/components/capital-declarations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type {
  DeclarationWithCounts,
  CapitalDeclarationDocument,
  CapitalDeclarationStatus,
  CapitalDeclarationCategory,
  DeclarationPriority,
  StatusHistoryEntry,
  SubmitDeclarationData,
  CapitalDeclaration,
} from '@/types/capital-declaration.types';
import {
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_COLORS,
  DECLARATION_CATEGORIES,
  formatDeclarationDate,
  PRIORITY_LABELS,
} from '@/types/capital-declaration.types';

// Category icons mapping with React components
const CATEGORY_ICON_COMPONENTS: Record<string, React.ElementType> = {
  bank: Building2,
  real_estate: Home,
  insurance: Shield,
  vehicles: Car,
  abroad: Globe,
  other: FolderOpen,
  general: FileText,
};

// Category colors for cards
const CATEGORY_CARD_COLORS: Record<string, string> = {
  bank: 'border-blue-200 bg-blue-50',
  real_estate: 'border-green-200 bg-green-50',
  insurance: 'border-yellow-200 bg-yellow-50',
  vehicles: 'border-purple-200 bg-purple-50',
  abroad: 'border-cyan-200 bg-cyan-50',
  other: 'border-pink-200 bg-pink-50',
  general: 'border-gray-200 bg-gray-50',
};

// Category icon colors
const CATEGORY_ICON_COLORS: Record<string, string> = {
  bank: 'text-blue-600',
  real_estate: 'text-green-600',
  insurance: 'text-yellow-600',
  vehicles: 'text-purple-600',
  abroad: 'text-cyan-600',
  other: 'text-pink-600',
  general: 'text-gray-600',
};

export function CapitalDeclarationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [declaration, setDeclaration] = useState<DeclarationWithCounts | null>(null);
  const [documents, setDocuments] = useState<CapitalDeclarationDocument[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingDueDate, setUpdatingDueDate] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [dueDateDocumentUrl, setDueDateDocumentUrl] = useState<string | null>(null);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<CapitalDeclarationDocument | null>(null);

  // Communication dialogs
  const [logCommunicationOpen, setLogCommunicationOpen] = useState(false);
  const [sendReminderOpen, setSendReminderOpen] = useState(false);

  // Status change dialog and history
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);

  // Tenant info for WhatsApp (loaded from tenant_settings.company_name)
  const [tenantName, setTenantName] = useState<string>('');

  /**
   * Load declaration data
   */
  const loadData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Load declaration
      const { data: declData, error: declError } = await capitalDeclarationService.getById(id);
      if (declError) throw declError;
      setDeclaration(declData);

      // Load documents
      const { data: docsData, error: docsError } = await capitalDeclarationService.getDocuments(id);
      if (docsError) throw docsError;
      setDocuments(docsData || []);

      // Load status history
      const { data: historyData } = await capitalDeclarationService.getStatusHistory(id);
      setStatusHistory(historyData || []);

      // Load tax authority due date document URL if exists
      if (declData?.tax_authority_due_date_document_path) {
        const { data: url } = await capitalDeclarationService.getDueDateDocumentUrl(
          declData.tax_authority_due_date_document_path
        );
        setDueDateDocumentUrl(url || null);
      }
    } catch (error) {
      console.error('Error loading declaration:', error);
      toast.error('שגיאה בטעינת ההצהרה');
      navigate('/capital-declarations');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load tenant name for WhatsApp message from tenant_settings
  useEffect(() => {
    const loadTenantInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const tenantId = user.user_metadata?.tenant_id;
          if (tenantId) {
            // Load company_name from tenant_settings (editable in /settings)
            const { data: settings } = await supabase
              .from('tenant_settings')
              .select('company_name')
              .eq('tenant_id', tenantId)
              .single();
            if (settings?.company_name) {
              setTenantName(settings.company_name);
            }
          }
        }
      } catch (error) {
        console.error('Error loading tenant info:', error);
      }
    };
    loadTenantInfo();
  }, []);

  /**
   * Update declaration status with history tracking
   */
  const handleStatusChange = async (newStatus: CapitalDeclarationStatus, notes?: string) => {
    if (!declaration) return;

    setUpdatingStatus(true);
    try {
      const { error } = await capitalDeclarationService.updateStatusWithHistory(
        declaration.id,
        newStatus,
        notes
      );
      if (error) throw error;

      setDeclaration({ ...declaration, status: newStatus });

      // Reload status history
      const { data: historyData } = await capitalDeclarationService.getStatusHistory(declaration.id);
      setStatusHistory(historyData || []);

      toast.success('הסטטוס עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * Submit declaration with screenshot and late flag
   */
  const handleSubmitDeclaration = async (data: SubmitDeclarationData, notes?: string) => {
    if (!declaration) return;

    setUpdatingStatus(true);
    try {
      const { data: updated, error } = await capitalDeclarationService.submitDeclaration(
        declaration.id,
        data,
        notes
      );
      if (error) throw error;

      if (updated) {
        setDeclaration({
          ...declaration,
          ...updated,
          status: 'submitted',
        });
      }

      // Reload status history
      const { data: historyData } = await capitalDeclarationService.getStatusHistory(declaration.id);
      setStatusHistory(historyData || []);

      toast.success('ההצהרה הוגשה בהצלחה');
    } catch (error) {
      console.error('Error submitting declaration:', error);
      toast.error('שגיאה בהגשת ההצהרה');
    } finally {
      setUpdatingStatus(false);
    }
  };

  /**
   * Handle penalty update from PenaltyManagementCard
   */
  const handlePenaltyUpdate = (updated: CapitalDeclaration) => {
    if (declaration) {
      setDeclaration({
        ...declaration,
        penalty_status: updated.penalty_status,
        penalty_amount: updated.penalty_amount,
        penalty_received_date: updated.penalty_received_date,
        penalty_notes: updated.penalty_notes,
        appeal_date: updated.appeal_date,
        appeal_notes: updated.appeal_notes,
        penalty_paid_date: updated.penalty_paid_date,
        penalty_paid_amount: updated.penalty_paid_amount,
        penalty_paid_by: updated.penalty_paid_by,
      });
    }
  };

  /**
   * Update priority
   */
  const handlePriorityChange = async (priority: DeclarationPriority) => {
    if (!declaration) return;

    const { error } = await capitalDeclarationService.updatePriority(declaration.id, priority);
    if (error) {
      toast.error('שגיאה בעדכון דחיפות');
      return;
    }
    setDeclaration({ ...declaration, priority });
    toast.success('הדחיפות עודכנה');
  };

  /**
   * Update assignment
   */
  const handleAssignmentChange = async (userId: string | null) => {
    if (!declaration) return;

    const { error } = await capitalDeclarationService.updateAssignment(declaration.id, userId);
    if (error) {
      toast.error('שגיאה בעדכון שיוך');
      return;
    }
    setDeclaration({ ...declaration, assigned_to: userId });
    toast.success('השיוך עודכן');
  };

  /**
   * Update tax authority due date (official deadline)
   */
  const handleTaxAuthorityDueDateChange = async (date: string) => {
    if (!declaration) return;

    setUpdatingDueDate(true);
    try {
      const { error } = await capitalDeclarationService.updateTaxAuthorityDueDate(
        declaration.id,
        date || null
      );
      if (error) throw error;

      setDeclaration({ ...declaration, tax_authority_due_date: date || null });
      toast.success('תאריך יעד רשות המיסים עודכן');
    } catch (error) {
      console.error('Error updating tax authority due date:', error);
      toast.error('שגיאה בעדכון תאריך יעד');
    } finally {
      setUpdatingDueDate(false);
    }
  };

  /**
   * Update internal due date (manager set)
   */
  const handleInternalDueDateChange = async (date: string) => {
    if (!declaration) return;

    setUpdatingDueDate(true);
    try {
      const { error } = await capitalDeclarationService.updateInternalDueDate(
        declaration.id,
        date || null
      );
      if (error) throw error;

      setDeclaration({ ...declaration, internal_due_date: date || null });
      toast.success('תאריך יעד פנימי עודכן');
    } catch (error) {
      console.error('Error updating internal due date:', error);
      toast.error('שגיאה בעדכון תאריך יעד');
    } finally {
      setUpdatingDueDate(false);
    }
  };

  /**
   * Upload tax authority due date document
   */
  const handleTaxAuthorityDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !declaration) return;

    setUploadingDocument(true);
    try {
      const { data: path, error } = await capitalDeclarationService.uploadTaxAuthorityDueDateDocument(
        declaration.id,
        file
      );
      if (error) throw error;

      // Get URL for display
      if (path) {
        const { data: url } = await capitalDeclarationService.getDueDateDocumentUrl(path);
        setDueDateDocumentUrl(url || null);
        setDeclaration({ ...declaration, tax_authority_due_date_document_path: path });
      }

      toast.success('המסמך הועלה בהצלחה');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('שגיאה בהעלאת המסמך');
    } finally {
      setUploadingDocument(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Copy portal link
   */
  const handleCopyLink = async () => {
    if (!declaration) return;

    const link = capitalDeclarationService.getPortalLink(declaration.public_token);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('הלינק הועתק ללוח');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('שגיאה בהעתקת הלינק');
    }
  };

  /**
   * Open portal in new tab
   */
  const handleOpenPortal = () => {
    if (!declaration) return;
    const link = capitalDeclarationService.getPortalLink(declaration.public_token);
    window.open(link, '_blank');
  };

  /**
   * Download document
   */
  const handleDownloadDocument = async (document: CapitalDeclarationDocument) => {
    try {
      const { data, error } = await capitalDeclarationService.getDocumentUrl(document.storage_path);
      if (error) throw error;
      if (data) {
        window.open(data, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('שגיאה בהורדת המסמך');
    }
  };

  /**
   * Delete document
   */
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;

    try {
      const { error } = await capitalDeclarationService.deleteDocument(documentToDelete.id);
      if (error) throw error;

      toast.success('המסמך נמחק בהצלחה');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('שגיאה במחיקת המסמך');
    }
  };

  /**
   * Get documents for a category
   */
  const getDocumentsByCategory = (category: CapitalDeclarationCategory) => {
    return documents.filter((doc) => doc.category === category);
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!declaration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg text-muted-foreground">ההצהרה לא נמצאה</p>
        <Button onClick={() => navigate('/capital-declarations')} className="mt-4">
          חזרה לרשימה
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/capital-declarations')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight rtl:text-right">
                הצהרת הון - {declaration.tax_year}
              </h1>
              <PriorityBadge
                priority={declaration.priority}
                editable={isAdmin}
                onPriorityChange={handlePriorityChange}
              />
            </div>
            <p className="text-muted-foreground rtl:text-right">{declaration.contact_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppReminderButton
            declaration={declaration}
            variant="outline"
            showLabel={true}
            tenantName={tenantName}
            onCommunicationLogged={loadData}
          />
          <Button
            variant="outline"
            onClick={() => setLogCommunicationOpen(true)}
          >
            <Phone className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            תעד תקשורת
          </Button>
          <Button
            variant="outline"
            onClick={() => setSendReminderOpen(true)}
          >
            <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            שלח תזכורת
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            העתק לינק
          </Button>
          <Button variant="outline" onClick={handleOpenPortal}>
            <ExternalLink className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            פתח פורטל
          </Button>
          <Button onClick={loadData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info Cards Row 1 - Compact 4 columns */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Contact Info */}
        <Card className="py-0">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium rtl:text-right flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              פרטי איש קשר
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 rtl:text-right px-4 pb-3">
            <div className="font-medium text-sm">{declaration.contact_name}</div>
            {declaration.contact_email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3" />
                {declaration.contact_email}
              </div>
            )}
            {declaration.contact_phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {declaration.contact_phone}
              </div>
            )}
            {declaration.client_name && (
              <div className="flex items-center gap-1.5 text-xs mt-1.5 pt-1.5 border-t">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{declaration.client_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Declaration Info */}
        <Card className="py-0">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium rtl:text-right flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              פרטי ההצהרה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 rtl:text-right px-4 pb-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">שנת מס:</span>
              <span className="font-medium">{declaration.tax_year}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">תאריך:</span>
              <span className="font-medium text-xs">
                {formatDeclarationDate(declaration.declaration_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">נוצר:</span>
              <span className="text-xs">
                {new Date(declaration.created_at).toLocaleDateString('he-IL')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status & Assignment */}
        <Card className="py-0">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium rtl:text-right flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              סטטוס ושיוך
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 rtl:text-right px-4 pb-3">
            <div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between h-8"
                onClick={() => setStatusChangeDialogOpen(true)}
                disabled={updatingStatus}
              >
                <Badge className={cn('text-xs', DECLARATION_STATUS_COLORS[declaration.status])}>
                  {DECLARATION_STATUS_LABELS[declaration.status]}
                </Badge>
                <Edit className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>

            {isAdmin && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">רו"ח מטפל</label>
                <AssignAccountantSelect
                  value={declaration.assigned_to}
                  onChange={handleAssignmentChange}

                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">פורטל:</span>
              {declaration.portal_accessed_at ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Eye className="h-3 w-3" />
                  <span>{declaration.portal_access_count}x</span>
                </div>
              ) : (
                <span className="text-muted-foreground">טרם נצפה</span>
              )}
            </div>

            {/* Submission info */}
            {declaration.status === 'submitted' && (
              <div className="flex items-center justify-between text-xs pt-1 border-t">
                <div className="flex items-center gap-2">
                  <LateSubmissionIndicator
                    wasSubmittedLate={declaration.was_submitted_late || false}
                    penaltyStatus={declaration.penalty_status}
                    size="sm"
                  />
                  <SubmissionScreenshotLink
                    storagePath={declaration.submission_screenshot_path || null}
                    variant="icon"
                    size="sm"
                  />
                </div>
                {declaration.submitted_at && (
                  <span className="text-muted-foreground">
                    {new Date(declaration.submitted_at).toLocaleDateString('he-IL')}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Due Dates Card */}
        <Card className="py-0">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium rtl:text-right flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              תאריכי יעד
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 rtl:text-right px-4 pb-3">
            {/* Tax Authority Due Date */}
            <div className="space-y-1">
              <Label htmlFor="taxAuthorityDueDate" className="text-xs">
                רשות המיסים
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id="taxAuthorityDueDate"
                  type="date"
                  value={declaration.tax_authority_due_date || ''}
                  onChange={(e) => handleTaxAuthorityDueDateChange(e.target.value)}
                  disabled={updatingDueDate}
                  dir="ltr"
                  className="h-7 text-xs flex-1"
                />
                {dueDateDocumentUrl ? (
                  <a
                    href={dueDateDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700"
                    title="צפה במסמך"
                  >
                    <Image className="h-4 w-4" />
                  </a>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDocument}
                    className="h-7 w-7 p-0"
                    title="העלה מסמך"
                  >
                    {uploadingDocument ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleTaxAuthorityDocumentUpload}
                className="hidden"
              />
            </div>

            {/* Internal Due Date */}
            <div className="space-y-1 pt-1 border-t">
              <Label htmlFor="internalDueDate" className="text-xs">
                יעד פנימי
              </Label>
              <Input
                id="internalDueDate"
                type="date"
                value={declaration.internal_due_date || ''}
                onChange={(e) => handleInternalDueDateChange(e.target.value)}
                disabled={updatingDueDate}
                dir="ltr"
                className="h-7 text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Status History & Communication History */}
      <div className={cn(
        "grid gap-4",
        statusHistory.length > 0 ? "md:grid-cols-2" : ""
      )}>
        {/* Status History - only show if there's history */}
        {statusHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium rtl:text-right flex items-center gap-2">
                <History className="h-4 w-4" />
                היסטוריית סטטוסים
              </CardTitle>
            </CardHeader>
            <CardContent className="rtl:text-right">
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {statusHistory.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "relative pr-5 pb-2",
                      index !== statusHistory.length - 1 && "border-r-2 border-muted"
                    )}
                  >
                    {/* Timeline dot */}
                    <div className="absolute right-0 top-1 w-2 h-2 rounded-full bg-primary -translate-x-[3px]" />

                    <div className="space-y-0.5">
                      {/* Date and user */}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>
                          {new Date(entry.changed_at).toLocaleDateString('he-IL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>•</span>
                        <span>{entry.changed_by_name || 'משתמש'}</span>
                      </div>

                      {/* Status change */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {entry.from_status && (
                          <>
                            <Badge className={cn('text-[10px] px-1.5 py-0', DECLARATION_STATUS_COLORS[entry.from_status as CapitalDeclarationStatus])}>
                              {DECLARATION_STATUS_LABELS[entry.from_status as CapitalDeclarationStatus]}
                            </Badge>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          </>
                        )}
                        <Badge className={cn('text-[10px] px-1.5 py-0', DECLARATION_STATUS_COLORS[entry.to_status as CapitalDeclarationStatus])}>
                          {DECLARATION_STATUS_LABELS[entry.to_status as CapitalDeclarationStatus]}
                        </Badge>
                      </div>

                      {/* Notes */}
                      {entry.notes && (
                        <p className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded mt-1">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Communication History */}
        <CommunicationHistoryCard
          declarationId={declaration.id}
          onAddCommunication={() => setLogCommunicationOpen(true)}
        />
      </div>

      {/* Penalty Management - show for submitted declarations */}
      {declaration.status === 'submitted' && (
        <div className="grid gap-4 md:grid-cols-2">
          <PenaltyManagementCard
            declaration={declaration as CapitalDeclaration}
            onUpdate={handlePenaltyUpdate}
          />
        </div>
      )}

      {/* Documents by Category */}
      <div>
        {/* Header with progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold rtl:text-right">מסמכים לפי קטגוריה</h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle
                className={cn(
                  "h-4 w-4",
                  declaration.categories_complete === 6 ? 'text-green-600' : 'text-muted-foreground'
                )}
              />
              <span>{declaration.categories_complete}/6 קטגוריות</span>
              <span className="mx-1">•</span>
              <span>{declaration.total_documents} מסמכים</span>
            </div>
          </div>
        </div>

        {/* Notes - show if exists */}
        {declaration.notes && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground mb-1">הערות:</p>
            <p className="text-sm whitespace-pre-wrap">{declaration.notes}</p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {DECLARATION_CATEGORIES.map((category) => {
            const categoryDocs = getDocumentsByCategory(category.key);
            const IconComponent = CATEGORY_ICON_COMPONENTS[category.key];

            return (
              <Card
                key={category.key}
                className={`${CATEGORY_CARD_COLORS[category.key]} transition-all`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium rtl:text-right flex items-center gap-2">
                    <IconComponent className={`h-5 w-5 ${CATEGORY_ICON_COLORS[category.key]}`} />
                    {category.label}
                    <Badge variant="secondary" className="mr-auto">
                      {categoryDocs.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="rtl:text-right text-xs">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categoryDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      אין מסמכים בקטגוריה זו
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {categoryDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-white rounded-lg p-2 shadow-sm"
                        >
                          <button
                            className="flex items-center gap-2 min-w-0 flex-1 text-right hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                            onClick={() => handleDownloadDocument(doc)}
                            title="לחץ להורדה"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate rtl:text-right text-blue-600 hover:text-blue-700 hover:underline">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.file_size)}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDownloadDocument(doc)}
                              title="הורדה"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setDocumentToDelete(doc);
                                setDeleteDialogOpen(true);
                              }}
                              title="מחיקה"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Delete Document Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rtl:text-right">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">מחיקת מסמך</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              האם אתה בטוח שברצונך למחוק את המסמך "{documentToDelete?.file_name}"? פעולה זו לא
              ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:flex-row-reverse rtl:gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDocument} className="bg-red-600 hover:bg-red-700">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Log Communication Dialog */}
      <LogCommunicationDialog
        open={logCommunicationOpen}
        onOpenChange={setLogCommunicationOpen}
        declarationId={declaration.id}
        onSuccess={loadData}
      />

      {/* Send Reminder Dialog */}
      <SendReminderDialog
        open={sendReminderOpen}
        onOpenChange={setSendReminderOpen}
        declaration={declaration}
        onSuccess={loadData}
      />

      {/* Status Change Dialog */}
      <StatusChangeDialog
        open={statusChangeDialogOpen}
        onOpenChange={setStatusChangeDialogOpen}
        currentStatus={declaration.status}
        onConfirm={handleStatusChange}
        onSubmit={handleSubmitDeclaration}
      />
    </div>
  );
}
