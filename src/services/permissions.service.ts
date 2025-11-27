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
  hiddenMenus: string[];    // Menu keys to hide
  hiddenRoutes: string[];   // Routes to block
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
  { menu: 'clients:groups', route: '/client-groups', label: 'ניהול קבוצות', parent: 'clients' },
  { menu: 'fees', route: '/fees/tracking', label: 'שכר טרחה' },
  { menu: 'fees:tracking', route: '/fees/tracking', label: 'מעקב שכר טרחה', parent: 'fees' },
  { menu: 'fees:calculate', route: '/fees/calculate', label: 'חישוב שכר טרחה', parent: 'fees' },
  { menu: 'fees:collections', route: '/collections', label: 'גביית תשלומים', parent: 'fees' },
  { menu: 'letters', route: '/letter-templates', label: 'מכתבים' },
  { menu: 'letters:templates', route: '/letter-templates', label: 'כתיבת מכתבים', parent: 'letters' },
  { menu: 'letters:simulator', route: '/component-simulator', label: 'סימולציית מכתבים', parent: 'letters' },
  { menu: 'letters:history', route: '/letter-history', label: 'היסטוריית מכתבים', parent: 'letters' },
  { menu: 'foreign-workers', route: '/foreign-workers', label: 'אישורי עובדים זרים' },
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
    'clients', 'clients:list', 'clients:groups',
    'fees', 'fees:tracking', 'fees:calculate', 'fees:collections',
    'letters', 'letters:templates', 'letters:simulator', 'letters:history',
    'foreign-workers',
    'files',
    'users',
    'settings',
  ],
  accountant: [
    'foreign-workers',
  ],
  bookkeeper: [
    'clients', 'clients:list',
    'foreign-workers',
    'files',
  ],
  client: [
    'clients', 'clients:list',
  ],
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

      const result: RolePermissions = {
        role,
        hiddenMenus,
        hiddenRoutes,
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

    // Check default permissions first
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (!defaultPermissions.includes(menuKey)) {
      return false; // Not in defaults = never visible
    }

    // Check DB overrides
    const { data: permissions } = await this.getRolePermissions(role);
    if (permissions?.hiddenMenus.includes(menuKey)) {
      return false; // Hidden by DB override
    }

    return true;
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

    // Check default permissions
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[role] || [];
    if (!defaultPermissions.includes(permission.menu)) {
      return false;
    }

    // Check DB overrides
    const { data: permissions } = await this.getRolePermissions(role);
    if (permissions?.hiddenRoutes.includes(route)) {
      return false;
    }

    return true;
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

        for (const perm of ALL_PERMISSIONS) {
          // Permission is enabled if:
          // 1. It's in the default permissions for this role
          // 2. It's not in the hidden_menus override
          const isDefault = defaultPerms.includes(perm.menu);
          const isHidden = hiddenMenus.includes(perm.menu);
          matrix[role][perm.menu] = isDefault && !isHidden;
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
    hiddenMenus: string[]
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

      // Merge new overrides
      const currentFeatures = settings?.features || {};
      const roleOverrides = currentFeatures.role_overrides || {};

      // Calculate hidden routes from hidden menus
      const hiddenRoutes = ALL_PERMISSIONS
        .filter(p => hiddenMenus.includes(p.menu))
        .map(p => p.route);

      roleOverrides[role] = {
        hidden_menus: hiddenMenus,
        hidden_routes: hiddenRoutes,
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
        hidden_menus: hiddenMenus,
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
