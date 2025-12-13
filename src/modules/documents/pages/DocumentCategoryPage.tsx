import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocumentRegistry } from '../hooks/useDocumentRegistry';
import { useDocumentPermissions } from '../hooks/useDocumentPermissions';
import { ArrowRight, FileText, Users, Receipt, Building2, FileSignature } from 'lucide-react';
import type { DocumentCategoryId, DocumentType } from '../types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Users,
  Receipt,
  Building2,
  FileSignature,
  FileText,
};

function DocumentTypeCard({
  documentType,
  onClick,
}: {
  documentType: DocumentType;
  onClick: () => void;
}) {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="rtl:text-right">
        <CardTitle className="text-base">{documentType.name}</CardTitle>
        <CardDescription className="text-sm">
          {documentType.description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-5 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DocumentCategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { hasCategory, getCategory, getDocumentTypesForCategory } = useDocumentRegistry();
  const { loading, isCategoryAccessible, isDocumentTypeAccessible } = useDocumentPermissions();

  // Validate category ID
  if (!categoryId || !hasCategory(categoryId)) {
    return <Navigate to="/documents" replace />;
  }

  const category = getCategory(categoryId as DocumentCategoryId);
  const documentTypes = getDocumentTypesForCategory(categoryId as DocumentCategoryId);
  const Icon = iconMap[category?.icon || 'FileText'] || FileText;

  // Check access
  if (!loading && !isCategoryAccessible(categoryId as DocumentCategoryId)) {
    return <Navigate to="/documents" replace />;
  }

  const handleDocumentTypeClick = (documentType: DocumentType) => {
    // For now, redirect to the old foreign workers page if it's a foreign worker document
    if (documentType.categoryId === 'foreign-workers') {
      navigate('/foreign-workers');
    } else {
      // TODO: Implement generic document creation page
      console.log('Selected document type:', documentType.id);
    }
  };

  // Filter accessible document types
  const accessibleDocumentTypes = documentTypes.filter((dt) =>
    isDocumentTypeAccessible(dt.id)
  );

  return (
    <div className="container mx-auto p-6 max-w-7xl" dir="rtl">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-6 gap-2"
        onClick={() => navigate('/documents')}
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        חזרה לקטגוריות
      </Button>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold rtl:text-right">{category?.name}</h1>
              <p className="text-muted-foreground mt-1 rtl:text-right">
                {category?.description}
              </p>
            </div>
          </div>

          {/* Document Types Grid */}
          {accessibleDocumentTypes.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  אין לך הרשאות לצפות בסוגי מסמכים בקטגוריה זו
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accessibleDocumentTypes.map((documentType) => (
                <DocumentTypeCard
                  key={documentType.id}
                  documentType={documentType}
                  onClick={() => handleDocumentTypeClick(documentType)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
