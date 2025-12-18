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
} from '@/components/capital-declarations';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type {
  DeclarationWithCounts,
  CapitalDeclarationDocument,
  CapitalDeclarationStatus,
  CapitalDeclarationCategory,
  DeclarationPriority,
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
};

// Category colors for cards
const CATEGORY_CARD_COLORS: Record<string, string> = {
  bank: 'border-blue-200 bg-blue-50',
  real_estate: 'border-green-200 bg-green-50',
  insurance: 'border-yellow-200 bg-yellow-50',
  vehicles: 'border-purple-200 bg-purple-50',
  abroad: 'border-cyan-200 bg-cyan-50',
  other: 'border-pink-200 bg-pink-50',
};

// Category icon colors
const CATEGORY_ICON_COLORS: Record<string, string> = {
  bank: 'text-blue-600',
  real_estate: 'text-green-600',
  insurance: 'text-yellow-600',
  vehicles: 'text-purple-600',
  abroad: 'text-cyan-600',
  other: 'text-pink-600',
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
   * Update declaration status
   */
  const handleStatusChange = async (newStatus: CapitalDeclarationStatus) => {
    if (!declaration) return;

    setUpdatingStatus(true);
    try {
      const { error } = await capitalDeclarationService.updateStatus(declaration.id, newStatus);
      if (error) throw error;

      setDeclaration({ ...declaration, status: newStatus });
      toast.success('הסטטוס עודכן בהצלחה');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    } finally {
      setUpdatingStatus(false);
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

      {/* Info Cards Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right flex items-center gap-2">
              <User className="h-4 w-4" />
              פרטי איש קשר
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 rtl:text-right">
            <div className="font-medium">{declaration.contact_name}</div>
            {declaration.contact_email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {declaration.contact_email}
              </div>
            )}
            {declaration.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {declaration.contact_phone}
              </div>
            )}
            {declaration.client_name && (
              <div className="flex items-center gap-2 text-sm mt-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{declaration.client_name}</span>
              </div>
            )}
            {declaration.group_name && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{declaration.group_name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Declaration Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              פרטי ההצהרה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 rtl:text-right">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">שנת מס:</span>
              <span className="font-medium">{declaration.tax_year}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">תאריך הצהרה:</span>
              <span className="font-medium">
                {formatDeclarationDate(declaration.declaration_date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">נושא:</span>
              <span className="font-medium">{declaration.subject}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">נוצר:</span>
              <span className="text-sm">
                {new Date(declaration.created_at).toLocaleDateString('he-IL')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Status & Assignment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right flex items-center gap-2">
              <Clock className="h-4 w-4" />
              סטטוס ושיוך
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 rtl:text-right">
            <div>
              <label className="text-sm text-muted-foreground block mb-2">סטטוס נוכחי</label>
              <Select
                value={declaration.status}
                onValueChange={(value) => handleStatusChange(value as CapitalDeclarationStatus)}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <Badge className={DECLARATION_STATUS_COLORS[declaration.status]}>
                      {DECLARATION_STATUS_LABELS[declaration.status]}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rtl:text-right">
                  {Object.entries(DECLARATION_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <Badge className={DECLARATION_STATUS_COLORS[value as CapitalDeclarationStatus]}>
                        {label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <div>
                <label className="text-sm text-muted-foreground block mb-2">רו"ח מטפל</label>
                <AssignAccountantSelect
                  value={declaration.assigned_to}
                  onChange={handleAssignmentChange}
                  placeholder="בחר רו&quot;ח"
                />
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">גישה לפורטל:</span>
                {declaration.portal_accessed_at ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">{declaration.portal_access_count} פעמים</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">טרם נצפה</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Due Dates Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              תאריכי יעד
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 rtl:text-right">
            {/* Tax Authority Due Date */}
            <div className="space-y-2">
              <Label htmlFor="taxAuthorityDueDate" className="text-sm font-medium">
                תאריך יעד רשות המיסים
              </Label>
              <Input
                id="taxAuthorityDueDate"
                type="date"
                value={declaration.tax_authority_due_date || ''}
                onChange={(e) => handleTaxAuthorityDueDateChange(e.target.value)}
                disabled={updatingDueDate}
                dir="ltr"
              />

              {/* Document upload */}
              <div className="pt-1">
                <span className="text-xs text-muted-foreground">מסמך בקשה</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleTaxAuthorityDocumentUpload}
                  className="hidden"
                />
                {dueDateDocumentUrl ? (
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={dueDateDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Image className="h-3 w-3" />
                      צפה
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingDocument}
                      className="h-6 px-2 text-xs"
                    >
                      {uploadingDocument ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'החלף'
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingDocument}
                    className="h-6 px-2 text-xs mt-1"
                  >
                    {uploadingDocument ? (
                      <Loader2 className="h-3 w-3 animate-spin rtl:ml-1 ltr:mr-1" />
                    ) : (
                      <Upload className="h-3 w-3 rtl:ml-1 ltr:mr-1" />
                    )}
                    העלה מסמך
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t pt-3">
              {/* Internal Due Date */}
              <Label htmlFor="internalDueDate" className="text-sm font-medium">
                תאריך יעד פנימי
              </Label>
              <Input
                id="internalDueDate"
                type="date"
                value={declaration.internal_due_date || ''}
                onChange={(e) => handleInternalDueDateChange(e.target.value)}
                disabled={updatingDueDate}
                className="mt-1"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">תאריך שקבע המנהל לסיום העבודה</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Communication History & Notes Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Communication History */}
        <CommunicationHistoryCard
          declarationId={declaration.id}
          onAddCommunication={() => setLogCommunicationOpen(true)}
        />

        {/* Notes & Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right">התקדמות ומסמכים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">קטגוריות הושלמו:</span>
              <div className="flex items-center gap-2">
                <CheckCircle
                  className={`h-4 w-4 ${
                    declaration.categories_complete === 6
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                />
                <span className="font-medium">{declaration.categories_complete}/6</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">סה"כ מסמכים:</span>
              <span className="font-medium">{declaration.total_documents}</span>
            </div>

            {declaration.notes && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">הערות:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {declaration.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents by Category */}
      <div>
        <h2 className="text-xl font-semibold mb-4 rtl:text-right">מסמכים לפי קטגוריה</h2>
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
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate rtl:text-right">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(doc.file_size)}
                              </p>
                            </div>
                          </div>
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
    </div>
  );
}
