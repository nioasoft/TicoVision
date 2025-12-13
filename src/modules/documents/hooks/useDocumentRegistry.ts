import { useMemo } from 'react';
import { documentRegistry } from '../registry/document-registry';
import type { DocumentCategory, DocumentType, DocumentCategoryId, DocumentTypeId } from '../types';

/**
 * Hook to access the document registry
 */
export function useDocumentRegistry() {
  const categories = useMemo(() => documentRegistry.getAllCategories(), []);

  const getCategory = (id: DocumentCategoryId): DocumentCategory | undefined => {
    return documentRegistry.getCategory(id);
  };

  const getDocumentType = (id: DocumentTypeId): DocumentType | undefined => {
    return documentRegistry.getDocumentType(id);
  };

  const getDocumentTypesForCategory = (categoryId: DocumentCategoryId): DocumentType[] => {
    return documentRegistry.getDocumentTypesForCategory(categoryId);
  };

  const getCategoryByDocumentType = (documentTypeId: DocumentTypeId): DocumentCategory | undefined => {
    return documentRegistry.getCategoryByDocumentType(documentTypeId);
  };

  const hasCategory = (id: string): id is DocumentCategoryId => {
    return documentRegistry.hasCategory(id);
  };

  const hasDocumentType = (id: string): id is DocumentTypeId => {
    return documentRegistry.hasDocumentType(id);
  };

  return {
    categories,
    getCategory,
    getDocumentType,
    getDocumentTypesForCategory,
    getCategoryByDocumentType,
    hasCategory,
    hasDocumentType,
  };
}
