/**
 * Permissions Service
 * Manages role-based permissions with database overrides
 *
 * Default permissions are hardcoded (security baseline)
 * DB overrides can ONLY restrict, not expand access
 */

import { BaseService, type ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import { authService } from './auth.service';
import type { UserRole } from '@/types/user-role';

// ============================================
// Types
// ============================================

export interface PermissionConfig {
  menu: string;           // Menu key (e.g., 'dashboard', 'clients')
  route: string;          // Route path (e.g., '/dashboard', '/clients')
  label: string;          // Hebrew label for display
  parent?: string;        // Parent menu key for submenus
}

export interface RolePermissions {
  role: UserRole;
  hiddenMenus: string[];    // Menu keys to hide (removed from default)
  hiddenRoutes: string[];   // Routes to block (removed from default)
  addedMenus: string[];     // Menu keys to add (not in default)
  addedRoutes: string[];    // Routes to allow (not in default)
}

export interface PermissionsMatrix {
  [role: string]: {
    [menuKey: string]: boolean;
  };
}

// ============================================
// Default Permissions (Hardcoded)
// ============================================

/**
 * All available permissions in the system
 * This defines what CAN be configured
 */
export const ALL_PERMISSIONS: PermissionConfig[] = [
  // Top-level menus
  { menu: 'dashboard', route: '/dashboard', label: 'לוח בקרה' },
  { menu: 'clients', route: '/clients', label: 'לקוחות' },
  { menu: 'clients:list', route: '/clients', label: 'רשימת לקוחות', parent: 'clients' },
  { menu: 'clients:create', route: '/clients', label: 'הוספת לקוח', parent: 'clients' },
  { menu: 'clients:edit', route: '/clients', label: 'עריכת לקוח', parent: 'clients' },
  { menu: 'clients:delete', route: '/clients', label: 'מחיקת לקוח', parent: 'clients' },
  { menu: 'clients:groups', route: '/client-groups', label: 'ניהול קבוצות', parent: 'clients' },
  { menu: 'contacts', route: '/contacts', label: 'אנשי קשר', parent: 'clients' },
  { menu: 'contacts:create', route: '/contacts', label: 'הוספת איש קשר', parent: 'contacts' },
  { menu: 'contacts:edit', route: '/contacts', label: 'עריכת איש קשר', parent: 'contacts' },
  { menu: 'contacts:delete', route: '/contacts', label: 'מחיקת איש קשר', parent: 'contacts' },
  { menu: 'fees', route: '/fees/tracking', label: 'שכר טרחה' },
  { menu: 'fees:tracking', route: '/fees/tracking', label: 'מעקב שכר טרחה', parent: 'fees' },
  { menu: 'fees:calculate', route: '/fees/calculate', label: 'חישוב שכר טרחה', parent: 'fees' },
  { menu: 'fees:collections', route: '/collections', label: 'גביית תשלומים', parent: 'fees' },
  { menu: 'letters', route: '/letter-templates', label: 'מכתבים' },
  { menu: 'letters:templates', route: '/letter-templates', label: 'כתיבת מכתבים', parent: 'letters' },
  { menu: 'letters:simulator', route: '/component-simulator', label: 'סימולציית מכתבים', parent: 'letters' },
  { menu: 'letters:history', route: '/letter-history', label: 'היסטוריית מכתבים', parent: 'letters' },
  // Documents System (מכתבים ואישורים)
  { menu: 'documents', route: '/documents', label: 'מכתבים ואישורים' },
  { menu: 'documents:foreign-workers', route: '/foreign-workers', label: 'אישורי עובדים זרים', parent: 'documents' },
  { menu: 'documents:tzlul-approvals', route: '/tzlul-approvals', label: 'אישורים חברת צלול', parent: 'documents' },
  { menu: 'documents:tax-approvals', route: '/documents/tax-approvals', label: 'אישורי מס', parent: 'documents' },
  { menu: 'documents:bank-approvals', route: '/documents/bank-approvals', label: 'אישורים לבנקים/מוסדות', parent: 'documents' },
  { menu: 'documents:commitment-letters', route: '/documents/commitment-letters', label: 'מכתבי התחייבות', parent: 'documents' },
  { menu: 'documents:tax-advances', route: '/tax-advances-2026', label: 'מקדמות מ"ה שוטפות 2026', parent: 'documents' },
  { menu: 'documents:auto-letters', route: '/auto-letters', label: 'מכתבים אוטומטיים', parent: 'documents' },
  { menu: 'documents:follow-ups', route: '/follow-ups', label: 'פניות/זירוז/דחיפה', parent: 'documents' },
  // Legacy route for backward compatibility
  { menu: 'foreign-workers', route: '/foreign-workers', label: 'אישורי עובדים זרים (ישן)' },
  // Capital Declaration System (הצהרת הון)
  { menu: 'capital-declaration', route: '/capital-declaration', label: 'הצהרת הון' },
  { menu: 'capital-declaration:create', route: '/capital-declaration', label: 'יצירת הצהרה', parent: 'capital-declaration' },
  { menu: 'capital-declaration:manage', route: '/capital-declarations', label: 'ניהול הצהרות', parent: 'capital-declaration' },
  { menu: 'files', route: '/files', label: 'מנהל הקבצים' },
  { menu: 'users', route: '/users', label: 'משתמשים' },
  { menu: 'settings', route: '/settings', label: 'הגדרות' },
];

/**
 * Default permissions per role (hardcoded baseline)
 * These are the MAXIMUM permissions each role can have
 * DB overrides can only REMOVE from this list
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'dashboard',
    'clients', 'clients:list', 'clients:create', 'clients:edit', 'clients:delete', 'clients:groups',
    'contacts', 'contacts:create', 'contacts:edit', 'contacts:delete',
    'fees', 'fees:tracking', 'fees:calculate', 'fees:collections',
    'letters', 'letters:templates', 'letters:simulator', 'letters:history',
    // Documents System
    'documents', 'documents:foreign-workers', 'documents:tzlul-approvals', 'documents:tax-approvals', 'documents:bank-approvals', 'documents:commitment-letters',
    'documents:tax-advances', 'documents:auto-letters', 'documents:follow-ups',
    'foreign-workers', // Legacy
    // Capital Declaration System
    'capital-declaration', 'capital-declaration:create', 'capital-declaration:manage',
    'files',
    'users',
    'settings',
  ],
  accountant: [
    // Documents System
    'documents', 'documents:foreign-workers', 'documents:tzlul-approvals', 'documents:tax-approvals', 'documents:bank-approvals',
    'documents:auto-letters',
    'foreign-workers', // Legacy
    // Capital Declaration System
    'capital-declaration', 'capital-declaration:create', 'capital-declaration:manage',
  ],
  bookkeeper: [
    'clients', 'clients:list', 'clients:create', 'clients:edit',
    // Documents System
    'documents', 'documents:foreign-workers', 'documents:commitment-letters',
    'foreign-workers', // Legacy
    'files',
  ],
  client: [
    'clients', 'clients:list',
  ],
  restricted: [], // Restricted users have NO default permissions - controlled by user_tenant_access.permissions JSON
};

// ============================================
// Service Class
// ============================================

class PermissionsService extends BaseService {
  private cache: Map<string, RolePermissions> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super('tenant_settings');
  }

  /**
   * Get permissions for a specific role
   * Combines default permissions with DB overrides
   */
  async getRolePermissions(role: UserRole): Promise<ServiceResponse<RolePermissions>> {
    try {
      // Check cache
      const now = Date.now();
      if (this.cacheExpiry > now && this.cache.has(role)) {
        return { data: this.cache.get(role)!, error: null };
      }

      const tenantId = await this.getTenantId();

      // Load DB overrides from tenant_settings
      const { data: settings, error } = await supabase
        .from('tenant_settings')
        .select('features')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      // Extract role overrides from features JSON
      const roleOverrides = settings?.features?.role_overrides?.[role] || {};
      const hiddenMenus: string[] = roleOverrides.hidden_menus || [];
      const hiddenRoutes: string[] = roleOverrides.hidden_routes || [];
      const addedMenus: string[] = roleOverrides.added_menus || [];
      const addedRoutes: string[] = roleOverrides.added_routes || [];

      const result: RolePermissions = {
        role,
        hiddenMenus,
        hiddenRoutes,
        addedMenus,
        addedRoutes,
      };

      // Update cache
      this.cache.set(role, result);
      this.cacheExpiry = now + this.CACHE_DURATION;

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Check if a menu item is visible for a role
   */
  async isMenuVisible(role: UserRole, menuKey: string): Promise<boolean> {
    // Super admin sees everything
    if (await authService.isSuperAdmin()) {
      return true;
    }

    // Get permissions (cached)
    const { data: permissions } = await this.getRolePermissions(role);
    if (!permissions) return false;

    // 1. Check if explicitly added
    if (permissions.addedMenus.includes(menuKey)) {
      return true;
    }

    // 2. Check if explicitly hidden
    if (permissions.hiddenMenus.includes(menuKey)) {
      return false;
    }

    // 3. Check default permissions
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    return defaultPermissions.includes(menuKey);
  }

  /**
   * Check if a route is accessible for a role
   */
  async isRouteAccessible(role: UserRole, route: string): Promise<boolean> {
    // Super admin can access everything
    if (await authService.isSuperAdmin()) {
      return true;
    }

    // Find the menu key for this route
    const permission = ALL_PERMISSIONS.find(p => p.route === route);
    if (!permission) {
      return true; // Unknown route, allow by default
    }

    // Get permissions (cached)
    const { data: permissions } = await this.getRolePermissions(role);
    if (!permissions) return false;

    // 1. Check if explicitly added
    if (permissions.addedRoutes.includes(route)) {
      return true;
    }

    // 2. Check if explicitly hidden
    if (permissions.hiddenRoutes.includes(route)) {
      return false;
    }

    // 3. Check default permissions
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    return defaultPermissions.includes(permission.menu);
  }

  /**
   * Get full permissions matrix for admin UI
   */
  async getPermissionsMatrix(): Promise<ServiceResponse<PermissionsMatrix>> {
    try {
      const tenantId = await this.getTenantId();

      // Load DB overrides
      const { data: settings, error } = await supabase
        .from('tenant_settings')
        .select('features')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      const roleOverrides = settings?.features?.role_overrides || {};

      // Build matrix
      const matrix: PermissionsMatrix = {};
      const roles: UserRole[] = ['admin', 'accountant', 'bookkeeper', 'client'];

      for (const role of roles) {
        matrix[role] = {};
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role];
        const hiddenMenus: string[] = roleOverrides[role]?.hidden_menus || [];
        const addedMenus: string[] = roleOverrides[role]?.added_menus || [];

        for (const perm of ALL_PERMISSIONS) {
          // Permission is enabled if:
          // 1. It is explicitly added OR
          // 2. It is in defaults AND NOT hidden
          const isDefault = defaultPerms.includes(perm.menu);
          const isHidden = hiddenMenus.includes(perm.menu);
          const isAdded = addedMenus.includes(perm.menu);
          
          matrix[role][perm.menu] = isAdded || (isDefault && !isHidden);
        }
      }

      return { data: matrix, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update permissions for a role (Super Admin only)
   */
  async updateRolePermissions(
    role: UserRole,
    enabledMenus: string[]
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Verify super admin
      const isSuperAdmin = await authService.isSuperAdmin();
      if (!isSuperAdmin) {
        throw new Error('Only Super Admin can modify permissions');
      }

      // Cannot modify admin permissions
      if (role === 'admin') {
        throw new Error('Cannot modify admin permissions');
      }

      const tenantId = await this.getTenantId();

      // Load current settings
      const { data: settings, error: fetchError } = await supabase
        .from('tenant_settings')
        .select('features')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Calculate hidden and added lists based on defaults
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      
      // Hidden: Present in default, but NOT in enabled
      const hiddenMenus = defaultPerms.filter(p => !enabledMenus.includes(p));
      
      // Added: NOT in default, but present in enabled
      const addedMenus = enabledMenus.filter(p => !defaultPerms.includes(p));

      // Calculate corresponding routes
      const hiddenRoutes = ALL_PERMISSIONS
        .filter(p => hiddenMenus.includes(p.menu))
        .map(p => p.route);
        
      const addedRoutes = ALL_PERMISSIONS
        .filter(p => addedMenus.includes(p.menu))
        .map(p => p.route);

      // Merge new overrides
      const currentFeatures = settings?.features || {};
      const roleOverrides = currentFeatures.role_overrides || {};

      roleOverrides[role] = {
        hidden_menus: hiddenMenus,
        hidden_routes: hiddenRoutes,
        added_menus: addedMenus,
        added_routes: addedRoutes,
      };

      const updatedFeatures = {
        ...currentFeatures,
        role_overrides: roleOverrides,
      };

      // Update or insert
      if (settings) {
        const { error: updateError } = await supabase
          .from('tenant_settings')
          .update({ features: updatedFeatures })
          .eq('tenant_id', tenantId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('tenant_settings')
          .insert({
            tenant_id: tenantId,
            features: updatedFeatures,
          });

        if (insertError) throw insertError;
      }

      // Clear cache
      this.cache.delete(role);

      // Log action
      await this.logAction('update_permissions', role, {
        enabled_count: enabledMenus.length,
        hidden_count: hiddenMenus.length,
        added_count: addedMenus.length
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Reset permissions for a role to defaults
   */
  async resetRolePermissions(role: UserRole): Promise<ServiceResponse<boolean>> {
    try {
      const isSuperAdmin = await authService.isSuperAdmin();
      if (!isSuperAdmin) {
        throw new Error('Only Super Admin can reset permissions');
      }

      const tenantId = await this.getTenantId();

      // Load current settings
      const { data: settings, error: fetchError } = await supabase
        .from('tenant_settings')
        .select('features')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (settings?.features?.role_overrides?.[role]) {
        const updatedFeatures = { ...settings.features };
        delete updatedFeatures.role_overrides[role];

        const { error: updateError } = await supabase
          .from('tenant_settings')
          .update({ features: updatedFeatures })
          .eq('tenant_id', tenantId);

        if (updateError) throw updateError;
      }

      // Clear cache
      this.cache.delete(role);

      await this.logAction('reset_permissions', role);

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Clear all cached permissions
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry = 0;
  }
}

export const permissionsService = new PermissionsService();
