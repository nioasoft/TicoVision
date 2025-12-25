/**
 * Capital Declaration Portal (פורטל הצהרת הון)
 * Public portal for clients to upload documents - no authentication required
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  RefreshCw,
  Building2,
  Home,
  Shield,
  Car,
  Globe,
  FolderOpen,
  X,
  Download,
  AlertCircle,
} from 'lucide-react';
import { capitalDeclarationPublicService } from '@/services/capital-declaration-public.service';
import type {
  PublicDeclarationData,
  CapitalDeclarationDocument,
  CapitalDeclarationCategory,
} from '@/types/capital-declaration.types';
import {
  DECLARATION_CATEGORIES,
  formatDeclarationDate,
  getCategoryProgress,
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
  bank: 'border-blue-300 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100',
  real_estate: 'border-green-300 hover:border-green-400 bg-gradient-to-br from-green-50 to-green-100',
  insurance: 'border-yellow-300 hover:border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100',
  vehicles: 'border-purple-300 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100',
  abroad: 'border-cyan-300 hover:border-cyan-400 bg-gradient-to-br from-cyan-50 to-cyan-100',
  other: 'border-pink-300 hover:border-pink-400 bg-gradient-to-br from-pink-50 to-pink-100',
  general: 'border-gray-300 hover:border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100',
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

// Category bg colors for icons
const CATEGORY_ICON_BG: Record<string, string> = {
  bank: 'bg-blue-100',
  real_estate: 'bg-green-100',
  insurance: 'bg-yellow-100',
  vehicles: 'bg-purple-100',
  abroad: 'bg-cyan-100',
  other: 'bg-pink-100',
  general: 'bg-gray-100',
};

export function CapitalDeclarationPortal() {
  const { token } = useParams<{ token: string }>();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [declaration, setDeclaration] = useState<PublicDeclarationData | null>(null);
  const [uploading, setUploading] = useState<CapitalDeclarationCategory | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // File input refs for each category
  const fileInputRefs = useRef<Record<CapitalDeclarationCategory, HTMLInputElement | null>>({
    bank: null,
    real_estate: null,
    insurance: null,
    vehicles: null,
    abroad: null,
    other: null,
    general: null,
  });

  /**
   * Load declaration data
   */
  const loadData = useCallback(async () => {
    if (!token) {
      setError('לינק לא תקין');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await capitalDeclarationPublicService.getByToken(token);
      if (!data) {
        setError('ההצהרה לא נמצאה או שפג תוקף הלינק');
        return;
      }
      setDeclaration(data);
      setError(null);
    } catch (err) {
      console.error('Error loading declaration:', err);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Handle file selection
   */
  const handleFileSelect = async (category: CapitalDeclarationCategory, files: FileList | null) => {
    if (!files || files.length === 0 || !token) return;

    setUploading(category);

    for (const file of Array.from(files)) {
      try {
        const result = await capitalDeclarationPublicService.uploadDocument(token, file, category);

        if (!result.success) {
          toast.error(result.error || 'שגיאה בהעלאת הקובץ');
          continue;
        }

        toast.success(`הקובץ "${file.name}" הועלה בהצלחה`);
      } catch (err) {
        console.error('Upload error:', err);
        toast.error(`שגיאה בהעלאת "${file.name}"`);
      }
    }

    // Reload data to show new documents
    await loadData();
    setUploading(null);

    // Clear file input
    const inputRef = fileInputRefs.current[category];
    if (inputRef) inputRef.value = '';
  };

  /**
   * Handle file drop
   */
  const handleDrop = (category: CapitalDeclarationCategory, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(category, e.dataTransfer.files);
  };

  /**
   * Delete document
   */
  const handleDeleteDocument = async (document: CapitalDeclarationDocument) => {
    if (!token) return;

    setDeletingDoc(document.id);
    try {
      const result = await capitalDeclarationPublicService.deleteDocument(token, document.id);

      if (!result.success) {
        toast.error(result.error || 'שגיאה במחיקת הקובץ');
        return;
      }

      toast.success('הקובץ נמחק בהצלחה');
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('שגיאה במחיקת הקובץ');
    } finally {
      setDeletingDoc(null);
    }
  };

  /**
   * Preview/download document
   */
  const handlePreviewDocument = async (document: CapitalDeclarationDocument) => {
    if (!token) return;

    try {
      const result = await capitalDeclarationPublicService.getDocumentUrl(token, document.id);
      if (!result.success || !result.url) {
        toast.error(result.error || 'שגיאה בפתיחת הקובץ');
        return;
      }
      window.open(result.url, '_blank');
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('שגיאה בפתיחת הקובץ');
    }
  };

  /**
   * Get documents by category
   */
  const getDocumentsByCategory = (category: CapitalDeclarationCategory): CapitalDeclarationDocument[] => {
    return declaration?.documents.filter(doc => doc.category === category) || [];
  };

  /**
   * Mark declaration as complete (client finished uploading)
   */
  const handleMarkComplete = async () => {
    if (!token || !confirmComplete) return;

    setSubmitting(true);
    try {
      const result = await capitalDeclarationPublicService.markComplete(token);
      if (result.success) {
        toast.success('תודה! הסטטוס עודכן והתיק יטופל בהקדם');
        await loadData();
      } else {
        toast.error(result.error || 'שגיאה בעדכון הסטטוס');
      }
    } catch (err) {
      console.error('Mark complete error:', err);
      toast.error('שגיאה בעדכון הסטטוס');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Calculate progress
   */
  const progress = declaration ? getCategoryProgress(declaration.category_counts) : 0;
  const categoriesComplete = declaration?.category_counts.filter(c => c.count > 0).length || 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">טוען נתונים...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !declaration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h1>
            <p className="text-gray-600 mb-6">{error || 'ההצהרה לא נמצאה'}</p>
            <Button onClick={loadData} variant="outline">
              <RefreshCw className="h-4 w-4 ml-2" />
              נסה שוב
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {declaration.tenant_name}
            </h1>
            <p className="text-sm text-gray-600">
              פורטל העלאת מסמכים - הצהרת הון
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Welcome Card */}
        <Card className="mb-5 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  שלום, {declaration.contact_name}
                </h2>
                <p className="text-sm text-gray-600">
                  הצהרת הון לשנת {declaration.tax_year} • תאריך הצהרה: {formatDeclarationDate(declaration.declaration_date)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <RefreshCw className="h-3 w-3" />
                <span>עודכן: {declaration.portal_accessed_at ? new Date(declaration.portal_accessed_at).toLocaleDateString('he-IL') : 'היום'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="mb-5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">התקדמות העלאת מסמכים</h3>
              <div className="flex items-center gap-1.5">
                <CheckCircle className={`h-4 w-4 ${categoriesComplete === DECLARATION_CATEGORIES.length ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm">{categoriesComplete}/{DECLARATION_CATEGORIES.length} קטגוריות</span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-1.5 text-center">
              {progress === 100 ? 'כל הקטגוריות הושלמו!' : `${progress}% הושלם`}
            </p>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-5 border-amber-200 bg-amber-50">
          <CardContent className="py-3">
            <p className="text-amber-800 text-xs">
              <strong>שימו לב:</strong> יש להעלות מסמכים לכל קטגוריה רלוונטית. פורמטים: PDF, JPG, PNG (עד 15MB)
            </p>
          </CardContent>
        </Card>

        {/* Category Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {DECLARATION_CATEGORIES.map((category) => {
            const IconComponent = CATEGORY_ICON_COMPONENTS[category.key];
            const categoryDocs = getDocumentsByCategory(category.key);
            const isUploading = uploading === category.key;
            const hasDocuments = categoryDocs.length > 0;

            return (
              <Card
                key={category.key}
                className={`${CATEGORY_CARD_COLORS[category.key]} transition-all duration-200`}
              >
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-md ${CATEGORY_ICON_BG[category.key]}`}>
                      <IconComponent className={`h-4 w-4 ${CATEGORY_ICON_COLORS[category.key]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {category.label}
                        {hasDocuments && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${CATEGORY_ICON_BG[category.key]} ${CATEGORY_ICON_COLORS[category.key]}`}>
                            {categoryDocs.length}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs truncate">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-4 pb-3 pt-0">
                  {/* Upload Area */}
                  <div
                    className={`border border-dashed rounded p-3 text-center transition-colors cursor-pointer
                      ${isUploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white/50'}`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => handleDrop(category.key, e)}
                    onClick={() => fileInputRefs.current[category.key]?.click()}
                  >
                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[category.key] = el; }}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={(e) => handleFileSelect(category.key, e.target.files)}
                    />

                    {isUploading ? (
                      <div className="py-1">
                        <RefreshCw className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-blue-600">מעלה...</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-600">
                          גרור או לחץ להעלאה
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Documents */}
                  {categoryDocs.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {categoryDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-white rounded p-2 shadow-sm border"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">
                                {doc.file_name}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handlePreviewDocument(doc); }}
                              title="הורדה"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }}
                              disabled={deletingDoc === doc.id}
                              title="מחיקה"
                            >
                              {deletingDoc === doc.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
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

        {/* Completion Section */}
        <Card className="mt-5 border-green-200 bg-green-50">
          <CardContent className="py-4">
            <h3 className="font-medium text-sm mb-3">סיימתי להעלות מסמכים</h3>

            <div className="flex items-start gap-2 mb-3">
              <Checkbox
                id="confirm-complete"
                checked={confirmComplete}
                onCheckedChange={(checked) => setConfirmComplete(checked === true)}
                disabled={declaration.status === 'documents_received'}
                className="mt-0.5"
              />
              <label htmlFor="confirm-complete" className="text-xs text-gray-700 leading-relaxed cursor-pointer">
                סיימתי להעלות את כל המסמכים. אנא התחילו לטפל בהגשה.
              </label>
            </div>

            <Button
              onClick={handleMarkComplete}
              disabled={!confirmComplete || submitting || declaration.status === 'documents_received'}
              size="sm"
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3 w-3 ml-1.5 animate-spin" />
                  שולח...
                </>
              ) : declaration.status === 'documents_received' ? (
                <>
                  <CheckCircle className="h-3 w-3 ml-1.5" />
                  הסטטוס עודכן
                </>
              ) : (
                'סיימתי'
              )}
            </Button>

            {declaration.status === 'documents_received' && (
              <p className="text-xs text-green-700 mt-2">
                תודה! נטפל בהגשה בהקדם.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            לשאלות ניתן לפנות למשרד {declaration.tenant_name}
          </p>
          <p className="mt-1">
            &copy; {new Date().getFullYear()} כל הזכויות שמורות
          </p>
        </div>
      </div>
    </div>
  );
}
