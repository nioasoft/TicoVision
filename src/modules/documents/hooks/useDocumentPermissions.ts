import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { documentPermissionsService } from '../services';
import { documentRegistry } from '../registry/document-registry';
import type { DocumentCategoryId, DocumentTypeId, DocumentPermissionResult, DocumentCategory } from '../types';

/**
 * Hook to check document permissions for the current user
 */
export function useDocumentPermissions() {
  const { role: userRole } = useAuth();
  const [accessibleCategories, setAccessibleCategories] = useState<DocumentCategoryId[]>([]);
  const [accessibleDocumentTypes, setAccessibleDocumentTypes] = useState<DocumentTypeId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!userRole) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [categories, documentTypes] = await Promise.all([
          documentPermissionsService.getAccessibleCategories(userRole),
          documentPermissionsService.getAccessibleDocumentTypes(userRole),
        ]);

        setAccessibleCategories(categories);
        setAccessibleDocumentTypes(documentTypes);
      } catch (error) {
        console.error('Error fetching document permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [userRole]);

  const canAccessCategory = useCallback(
    async (categoryId: DocumentCategoryId): Promise<DocumentPermissionResult> => {
      if (!userRole) {
        return { canAccess: false, reason: 'default', effectiveRoles: [] };
      }
      return documentPermissionsService.canAccessCategory(categoryId, userRole);
    },
    [userRole]
  );

  const canAccessDocumentType = useCallback(
    async (documentTypeId: DocumentTypeId): Promise<DocumentPermissionResult> => {
      if (!userRole) {
        return { canAccess: false, reason: 'default', effectiveRoles: [] };
      }
      return documentPermissionsService.canAccessDocumentType(documentTypeId, userRole);
    },
    [userRole]
  );

  const getAccessibleCategoriesData = useCallback((): DocumentCategory[] => {
    return accessibleCategories
      .map((id) => documentRegistry.getCategory(id))
      .filter((cat): cat is DocumentCategory => cat !== undefined);
  }, [accessibleCategories]);

  const isCategoryAccessible = useCallback(
    (categoryId: DocumentCategoryId): boolean => {
      return accessibleCategories.includes(categoryId);
    },
    [accessibleCategories]
  );

  const isDocumentTypeAccessible = useCallback(
    (documentTypeId: DocumentTypeId): boolean => {
      return accessibleDocumentTypes.includes(documentTypeId);
    },
    [accessibleDocumentTypes]
  );

  return {
    loading,
    accessibleCategories,
    accessibleDocumentTypes,
    canAccessCategory,
    canAccessDocumentType,
    getAccessibleCategoriesData,
    isCategoryAccessible,
    isDocumentTypeAccessible,
  };
}
