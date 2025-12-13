import { BaseService, type ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { documentRegistry } from '../registry/document-registry';
import type { UserRole } from '@/types/user-role';
import type {
  DocumentCategoryId,
  DocumentTypeId,
  DocumentPermissionResult,
} from '../types';

interface PermissionOverride {
  allowed_roles: UserRole[];
  denied_roles: UserRole[];
}

interface PermissionRecord {
  permission_scope: 'category' | 'document_type';
  scope_id: string;
  allowed_roles: UserRole[];
  denied_roles: UserRole[];
}

// Cache for permission overrides (shared across all service instances)
let permissionsCache: {
  tenantId: string | null;
  data: PermissionRecord[];
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Service for managing document-level permissions
 * Handles both category-level and document type-level permission overrides
 */
export class DocumentPermissionsService extends BaseService {
  constructor() {
    super('document_permissions');
  }

  /**
   * Fetch all permission overrides for tenant (single query, cached)
   */
  private async getAllPermissionOverrides(): Promise<PermissionRecord[]> {
    const tenantId = await this.getTenantId();
    const now = Date.now();

    // Return cached data if valid
    if (
      permissionsCache &&
      permissionsCache.tenantId === tenantId &&
      now - permissionsCache.timestamp < CACHE_TTL_MS
    ) {
      return permissionsCache.data;
    }

    // Fetch all permissions in single query
    const { data, error } = await supabase
      .from('document_permissions')
      .select('permission_scope, scope_id, allowed_roles, denied_roles')
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error fetching permission overrides:', error);
      return [];
    }

    const permissions = (data || []) as PermissionRecord[];

    // Update cache
    permissionsCache = {
      tenantId,
      data: permissions,
      timestamp: now,
    };

    return permissions;
  }

  /**
   * Invalidate the permissions cache (call after permission changes)
   */
  invalidateCache(): void {
    permissionsCache = null;
  }

  /**
   * Check document type access using pre-fetched permissions (no DB queries)
   */
  private checkDocumentTypeAccessLocally(
    documentTypeId: DocumentTypeId,
    userRole: UserRole,
    permissions: PermissionRecord[]
  ): DocumentPermissionResult {
    const docType = documentRegistry.getDocumentType(documentTypeId);
    if (!docType) {
      return { canAccess: false, reason: 'default', effectiveRoles: [] };
    }

    // Check document type-level override first (most specific)
    const typeOverride = permissions.find(
      (p) => p.permission_scope === 'document_type' && p.scope_id === documentTypeId
    );

    if (typeOverride) {
      if (typeOverride.denied_roles?.includes(userRole)) {
        return {
          canAccess: false,
          reason: 'type-override',
          effectiveRoles: typeOverride.allowed_roles,
        };
      }
      if (typeOverride.allowed_roles?.includes(userRole)) {
        return {
          canAccess: true,
          reason: 'type-override',
          effectiveRoles: typeOverride.allowed_roles,
        };
      }
    }

    // Check category-level override
    const categoryOverride = permissions.find(
      (p) => p.permission_scope === 'category' && p.scope_id === docType.categoryId
    );

    if (categoryOverride) {
      if (categoryOverride.denied_roles?.includes(userRole)) {
        return {
          canAccess: false,
          reason: 'category-override',
          effectiveRoles: categoryOverride.allowed_roles,
        };
      }
      if (categoryOverride.allowed_roles?.includes(userRole)) {
        return {
          canAccess: true,
          reason: 'category-override',
          effectiveRoles: categoryOverride.allowed_roles,
        };
      }
    }

    // Fall back to defaults from registry
    const category = documentRegistry.getCategory(docType.categoryId);
    const defaultRoles =
      docType.permissions?.defaultRoles ||
      category?.permissions.defaultRoles ||
      [];
    const canAccess = defaultRoles.includes(userRole);

    return { canAccess, reason: 'default', effectiveRoles: defaultRoles };
  }

  /**
   * Check category access using pre-fetched permissions (no DB queries)
   */
  private checkCategoryAccessLocally(
    categoryId: DocumentCategoryId,
    userRole: UserRole,
    permissions: PermissionRecord[]
  ): DocumentPermissionResult {
    const category = documentRegistry.getCategory(categoryId);
    if (!category) {
      return { canAccess: false, reason: 'default', effectiveRoles: [] };
    }

    // Check category-level override
    const categoryOverride = permissions.find(
      (p) => p.permission_scope === 'category' && p.scope_id === categoryId
    );

    if (categoryOverride) {
      if (categoryOverride.denied_roles?.includes(userRole)) {
        return {
          canAccess: false,
          reason: 'category-override',
          effectiveRoles: categoryOverride.allowed_roles,
        };
      }
      if (categoryOverride.allowed_roles?.includes(userRole)) {
        return {
          canAccess: true,
          reason: 'category-override',
          effectiveRoles: categoryOverride.allowed_roles,
        };
      }
    }

    // Fall back to defaults
    const defaultRoles = category.permissions.defaultRoles;
    const canAccess = defaultRoles.includes(userRole);

    return { canAccess, reason: 'default', effectiveRoles: defaultRoles };
  }

  /**
   * Check if user can access a document type
   * Priority: 1. Super Admin, 2. Type Override, 3. Category Override, 4. Default
   */
  async canAccessDocumentType(
    documentTypeId: DocumentTypeId,
    userRole: UserRole
  ): Promise<DocumentPermissionResult> {
    // Super admin bypasses all checks
    const isSuper = await authService.isSuperAdmin();
    if (isSuper) {
      return {
        canAccess: true,
        reason: 'super-admin',
        effectiveRoles: ['admin', 'accountant', 'bookkeeper', 'client'],
      };
    }

    const tenantId = await this.getTenantId();
    const docType = documentRegistry.getDocumentType(documentTypeId);

    if (!docType) {
      return { canAccess: false, reason: 'default', effectiveRoles: [] };
    }

    // Check document type-level override first (most specific)
    const { data: typeOverride } = await supabase
      .from('document_permissions')
      .select('allowed_roles, denied_roles')
      .eq('tenant_id', tenantId)
      .eq('permission_scope', 'document_type')
      .eq('scope_id', documentTypeId)
      .maybeSingle();

    if (typeOverride) {
      const override = typeOverride as PermissionOverride;
      if (override.denied_roles?.includes(userRole)) {
        return {
          canAccess: false,
          reason: 'type-override',
          effectiveRoles: override.allowed_roles,
        };
      }
      if (override.allowed_roles?.includes(userRole)) {
        return {
          canAccess: true,
          reason: 'type-override',
          effectiveRoles: override.allowed_roles,
        };
      }
    }

    // Check category-level override
    const { data: categoryOverride } = await supabase
      .from('document_permissions')
      .select('allowed_roles, denied_roles')
      .eq('tenant_id', tenantId)
      .eq('permission_scope', 'category')
      .eq('scope_id', docType.categoryId)
      .maybeSingle();

    if (categoryOverride) {
      const override = categoryOverride as PermissionOverride;
      if (override.denied_roles?.includes(userRole)) {
        return {
          canAccess: false,
          reason: 'category-override',
          effectiveRoles: override.allowed_roles,
        };
      }
      if (override.allowed_roles?.includes(userRole)) {
        return {
          canAccess: true,
          reason: 'category-override',
          effectiveRoles: override.allowed_roles,
        };
      }
    }

    // Fall back to defaults from registry
    const category = documentRegistry.getCategory(docType.categoryId);
    const defaultRoles =
      docType.permissions?.defaultRoles ||
      category?.permissions.defaultRoles ||
      [];
    const canAccess = defaultRoles.includes(userRole);

    return { canAccess, reason: 'default', effectiveRoles: defaultRoles };
  }

  /**
   * Check if user can access a category
   */
  async canAccessCategory(
    categoryId: DocumentCategoryId,
    userRole: UserRole
  ): Promise<DocumentPermissionResult> {
    // Super admin bypasses all checks
    const isSuper = await authService.isSuperAdmin();
    if (isSuper) {
      return {
        canAccess: true,
        reason: 'super-admin',
        effectiveRoles: ['admin', 'accountant', 'bookkeeper', 'client'],
      };
    }

    const tenantId = await this.getTenantId();
    const category = documentRegistry.getCategory(categoryId);

    if (!category) {
      return { canAccess: false, reason: 'default', effectiveRoles: [] };
    }

    // Check category-level override
    const { data: categoryOverride } = await supabase
      .from('document_permissions')
      .select('allowed_roles, denied_roles')
      .eq('tenant_id', tenantId)
      .eq('permission_scope', 'category')
      .eq('scope_id', categoryId)
      .maybeSingle();

    if (categoryOverride) {
      const override = categoryOverride as PermissionOverride;
      if (override.denied_roles?.includes(userRole)) {
        return {
          canAccess: false,
          reason: 'category-override',
          effectiveRoles: override.allowed_roles,
        };
      }
      if (override.allowed_roles?.includes(userRole)) {
        return {
          canAccess: true,
          reason: 'category-override',
          effectiveRoles: override.allowed_roles,
        };
      }
    }

    // Fall back to defaults
    const defaultRoles = category.permissions.defaultRoles;
    const canAccess = defaultRoles.includes(userRole);

    return { canAccess, reason: 'default', effectiveRoles: defaultRoles };
  }

  /**
   * Get all accessible document types for a user (OPTIMIZED: single query)
   */
  async getAccessibleDocumentTypes(userRole: UserRole): Promise<DocumentTypeId[]> {
    // Super admin has access to all
    const isSuper = await authService.isSuperAdmin();
    if (isSuper) {
      return documentRegistry.getAllDocumentTypes().map((dt) => dt.id);
    }

    // Fetch all permissions in single query
    const permissions = await this.getAllPermissionOverrides();
    const allTypes = documentRegistry.getAllDocumentTypes();

    // Check access locally (no additional DB queries)
    return allTypes
      .filter((docType) => {
        const result = this.checkDocumentTypeAccessLocally(docType.id, userRole, permissions);
        return result.canAccess;
      })
      .map((docType) => docType.id);
  }

  /**
   * Get all accessible categories for a user (OPTIMIZED: single query)
   */
  async getAccessibleCategories(userRole: UserRole): Promise<DocumentCategoryId[]> {
    // Super admin has access to all
    const isSuper = await authService.isSuperAdmin();
    if (isSuper) {
      return documentRegistry.getAllCategories().map((c) => c.id);
    }

    // Fetch all permissions in single query
    const permissions = await this.getAllPermissionOverrides();
    const allCategories = documentRegistry.getAllCategories();

    // Check access locally (no additional DB queries)
    return allCategories
      .filter((category) => {
        const result = this.checkCategoryAccessLocally(category.id, userRole, permissions);
        return result.canAccess;
      })
      .map((category) => category.id);
  }

  /**
   * Set permission override for a category
   */
  async setCategoryPermission(
    categoryId: DocumentCategoryId,
    allowedRoles: UserRole[],
    deniedRoles: UserRole[] = []
  ): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from('document_permissions').upsert(
        {
          tenant_id: tenantId,
          permission_scope: 'category',
          scope_id: categoryId,
          allowed_roles: allowedRoles,
          denied_roles: deniedRoles,
          updated_by: user?.user?.id,
        },
        {
          onConflict: 'tenant_id,permission_scope,scope_id',
        }
      );

      if (error) throw error;

      // Invalidate cache after permission change
      this.invalidateCache();

      await this.logAction('set_category_permission', categoryId, {
        allowed_roles: allowedRoles,
        denied_roles: deniedRoles,
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Set permission override for a document type
   */
  async setDocumentTypePermission(
    documentTypeId: DocumentTypeId,
    allowedRoles: UserRole[],
    deniedRoles: UserRole[] = []
  ): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from('document_permissions').upsert(
        {
          tenant_id: tenantId,
          permission_scope: 'document_type',
          scope_id: documentTypeId,
          allowed_roles: allowedRoles,
          denied_roles: deniedRoles,
          updated_by: user?.user?.id,
        },
        {
          onConflict: 'tenant_id,permission_scope,scope_id',
        }
      );

      if (error) throw error;

      // Invalidate cache after permission change
      this.invalidateCache();

      await this.logAction('set_document_type_permission', documentTypeId, {
        allowed_roles: allowedRoles,
        denied_roles: deniedRoles,
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Remove permission override
   */
  async removePermissionOverride(
    scope: 'category' | 'document_type',
    scopeId: string
  ): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('permission_scope', scope)
        .eq('scope_id', scopeId);

      if (error) throw error;

      // Invalidate cache after permission change
      this.invalidateCache();

      await this.logAction('remove_permission_override', scopeId, { scope });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all permission overrides for the tenant
   */
  async getAllOverrides(): Promise<
    ServiceResponse<Array<{
      scope: 'category' | 'document_type';
      scopeId: string;
      allowedRoles: UserRole[];
      deniedRoles: UserRole[];
    }>>
  > {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('document_permissions')
        .select('permission_scope, scope_id, allowed_roles, denied_roles')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const overrides = (data || []).map((row) => ({
        scope: row.permission_scope as 'category' | 'document_type',
        scopeId: row.scope_id,
        allowedRoles: row.allowed_roles as UserRole[],
        deniedRoles: row.denied_roles as UserRole[],
      }));

      return { data: overrides, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const documentPermissionsService = new DocumentPermissionsService();
