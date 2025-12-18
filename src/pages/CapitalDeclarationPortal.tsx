/**
 * Capital Declaration Portal (פורטל הצהרת הון)
 * Public portal for clients to upload documents - no authentication required
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
};

// Category colors for cards
const CATEGORY_CARD_COLORS: Record<string, string> = {
  bank: 'border-blue-300 hover:border-blue-400 bg-gradient-to-br from-blue-50 to-blue-100',
  real_estate: 'border-green-300 hover:border-green-400 bg-gradient-to-br from-green-50 to-green-100',
  insurance: 'border-yellow-300 hover:border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100',
  vehicles: 'border-purple-300 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100',
  abroad: 'border-cyan-300 hover:border-cyan-400 bg-gradient-to-br from-cyan-50 to-cyan-100',
  other: 'border-pink-300 hover:border-pink-400 bg-gradient-to-br from-pink-50 to-pink-100',
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

// Category bg colors for icons
const CATEGORY_ICON_BG: Record<string, string> = {
  bank: 'bg-blue-100',
  real_estate: 'bg-green-100',
  insurance: 'bg-yellow-100',
  vehicles: 'bg-purple-100',
  abroad: 'bg-cyan-100',
  other: 'bg-pink-100',
};

export function CapitalDeclarationPortal() {
  const { token } = useParams<{ token: string }>();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [declaration, setDeclaration] = useState<PublicDeclarationData | null>(null);
  const [uploading, setUploading] = useState<CapitalDeclarationCategory | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);

  // File input refs for each category
  const fileInputRefs = useRef<Record<CapitalDeclarationCategory, HTMLInputElement | null>>({
    bank: null,
    real_estate: null,
    insurance: null,
    vehicles: null,
    abroad: null,
    other: null,
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {declaration.tenant_name}
            </h1>
            <p className="text-lg text-gray-600">
              פורטל העלאת מסמכים - הצהרת הון
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Welcome Card */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  שלום, {declaration.contact_name}
                </h2>
                <p className="text-gray-600">
                  הצהרת הון לשנת {declaration.tax_year} • תאריך הצהרה: {formatDeclarationDate(declaration.declaration_date)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="h-4 w-4" />
                <span>עודכן לאחרונה: {declaration.portal_accessed_at ? new Date(declaration.portal_accessed_at).toLocaleDateString('he-IL') : 'היום'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">התקדמות העלאת מסמכים</h3>
              <div className="flex items-center gap-2">
                <CheckCircle className={`h-5 w-5 ${categoriesComplete === 6 ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="font-medium">{categoriesComplete}/6 קטגוריות</span>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-gray-500 mt-2 text-center">
              {progress === 100 ? 'כל הקטגוריות הושלמו! תודה רבה.' : `${progress}% הושלם - המשיכו להעלות מסמכים לקטגוריות החסרות`}
            </p>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <p className="text-amber-800 text-sm">
              <strong>שימו לב:</strong> יש להעלות מסמכים לכל קטגוריה רלוונטית. ניתן להעלות מספר קבצים לכל קטגוריה.
              פורמטים נתמכים: PDF, JPG, PNG (עד 15MB לקובץ)
            </p>
          </CardContent>
        </Card>

        {/* Category Cards */}
        <div className="grid gap-6 md:grid-cols-2">
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
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${CATEGORY_ICON_BG[category.key]}`}>
                      <IconComponent className={`h-6 w-6 ${CATEGORY_ICON_COLORS[category.key]}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category.label}
                        {hasDocuments && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_ICON_BG[category.key]} ${CATEGORY_ICON_COLORS[category.key]}`}>
                            {categoryDocs.length} קבצים
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
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
                      <div className="py-2">
                        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-sm text-blue-600">מעלה קבצים...</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">
                          גרור קבצים לכאן או לחץ לבחירה
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          PDF, JPG, PNG • עד 15MB
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Documents */}
                  {categoryDocs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {categoryDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm border"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString('he-IL')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); handlePreviewDocument(doc); }}
                              title="הורדה"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }}
                              disabled={deletingDoc === doc.id}
                              title="מחיקה"
                            >
                              {deletingDoc === doc.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
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

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            לשאלות ובירורים ניתן לפנות למשרד {declaration.tenant_name}
          </p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} כל הזכויות שמורות
          </p>
        </div>
      </div>
    </div>
  );
}
