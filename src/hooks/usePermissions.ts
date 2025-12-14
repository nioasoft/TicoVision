/**
 * usePermissions Hook
 * React hook for checking permissions in components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  permissionsService,
  type RolePermissions,
  type PermissionsMatrix,
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSIONS,
} from '@/services/permissions.service';
import { authService } from '@/services/auth.service';
import type { UserRole } from '@/types/user-role';

interface UsePermissionsReturn {
  loading: boolean;
  permissions: RolePermissions | null;
  matrix: PermissionsMatrix | null;
  isSuperAdmin: boolean;

  // Check functions
  isMenuVisible: (menuKey: string) => boolean;
  isRouteAccessible: (route: string) => boolean;

  // Admin functions
  loadMatrix: () => Promise<void>;
  updatePermissions: (role: UserRole, enabledMenus: string[]) => Promise<boolean>;
  resetPermissions: (role: UserRole) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [matrix, setMatrix] = useState<PermissionsMatrix | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  /**
   * Load permissions for current user's role
   */
  const loadPermissions = useCallback(async () => {
    if (!role) {
      console.log('🔐 [Permissions] No role set, skipping permission load');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [permResult, superAdminResult] = await Promise.all([
        permissionsService.getRolePermissions(role),
        authService.isSuperAdmin(),
      ]);

      console.log('🔐 [Permissions] Loaded:', {
        role,
        isSuperAdmin: superAdminResult,
        hiddenMenus: permResult.data?.hiddenMenus,
        addedMenus: permResult.data?.addedMenus,
      });

      if (permResult.data) {
        setPermissions(permResult.data);
      }
      setIsSuperAdmin(superAdminResult);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [role]);

  /**
   * Load full permissions matrix (for admin UI)
   */
  const loadMatrix = useCallback(async () => {
    try {
      const result = await permissionsService.getPermissionsMatrix();
      if (result.data) {
        setMatrix(result.data);
      }
    } catch (error) {
      console.error('Error loading permissions matrix:', error);
    }
  }, []);

  /**
   * Check if menu item is visible for current user
   */
  const isMenuVisible = useCallback(
    (menuKey: string): boolean => {
      // Super admin sees everything
      if (isSuperAdmin) return true;

      // No role = no access
      if (!role) {
        console.log(`🔐 [Menu] ${menuKey} HIDDEN - no role`);
        return false;
      }

      // 1. Check if explicitly added (DB override to EXPAND)
      if (permissions?.addedMenus.includes(menuKey)) {
        return true;
      }

      // 2. Check if explicitly hidden (DB override to RESTRICT)
      if (permissions?.hiddenMenus.includes(menuKey)) {
        console.log(`🔐 [Menu] ${menuKey} HIDDEN - in hiddenMenus`);
        return false;
      }

      // 3. Check default permissions
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      const visible = defaultPerms.includes(menuKey);
      if (!visible && menuKey === 'documents') {
        console.log(`🔐 [Menu] ${menuKey} HIDDEN - not in defaultPerms for role ${role}`);
      }
      return visible;
    },
    [role, permissions, isSuperAdmin]
  );

  /**
   * Check if route is accessible for current user
   */
  const isRouteAccessible = useCallback(
    (route: string): boolean => {
      // Super admin can access everything
      if (isSuperAdmin) return true;

      // No role = no access
      if (!role) return false;

      // Find menu key for this route
      const permission = ALL_PERMISSIONS.find(p => p.route === route);
      if (!permission) return true; // Unknown route, allow

      // 1. Check if explicitly added (DB override to EXPAND)
      if (permissions?.addedRoutes.includes(route)) {
        return true;
      }

      // 2. Check if explicitly hidden (DB override to RESTRICT)
      if (permissions?.hiddenRoutes.includes(route)) {
        return false;
      }

      // 3. Check default permissions
      const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      return defaultPerms.includes(permission.menu);
    },
    [role, permissions, isSuperAdmin]
  );

  /**
   * Update permissions for a role (admin only)
   */
  const updatePermissions = useCallback(
    async (targetRole: UserRole, enabledMenus: string[]): Promise<boolean> => {
      const result = await permissionsService.updateRolePermissions(targetRole, enabledMenus);
      if (result.data) {
        // Reload matrix after update
        await loadMatrix();
        // Reload permissions if we updated current user's role
        if (targetRole === role) {
          await loadPermissions();
        }
        return true;
      }
      return false;
    },
    [role, loadMatrix, loadPermissions]
  );

  /**
   * Reset permissions for a role (admin only)
   */
  const resetPermissions = useCallback(
    async (targetRole: UserRole): Promise<boolean> => {
      const result = await permissionsService.resetRolePermissions(targetRole);
      if (result.data) {
        await loadMatrix();
        if (targetRole === role) {
          await loadPermissions();
        }
        return true;
      }
      return false;
    },
    [role, loadMatrix, loadPermissions]
  );

  /**
   * Refresh all permission data
   */
  const refresh = useCallback(async () => {
    permissionsService.clearCache();
    await loadPermissions();
    await loadMatrix();
  }, [loadPermissions, loadMatrix]);

  // Load on mount and when role changes
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  return {
    loading,
    permissions,
    matrix,
    isSuperAdmin,
    isMenuVisible,
    isRouteAccessible,
    loadMatrix,
    updatePermissions,
    resetPermissions,
    refresh,
  };
}

/**
 * Hook specifically for permissions admin page
 */
export function usePermissionsAdmin() {
  const { matrix, loadMatrix, updatePermissions, resetPermissions, isSuperAdmin } =
    usePermissions();
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<string>>>(new Map());

  // Load matrix on mount
  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  /**
   * Toggle a permission in pending changes
   */
  const togglePermission = useCallback(
    (role: UserRole, menuKey: string, currentValue: boolean) => {
      setPendingChanges(prev => {
        const newChanges = new Map(prev);
        const roleChanges = new Set(newChanges.get(role) || []);

        if (roleChanges.has(menuKey)) {
          roleChanges.delete(menuKey);
        } else {
          roleChanges.add(menuKey);
        }

        if (roleChanges.size === 0) {
          newChanges.delete(role);
        } else {
          newChanges.set(role, roleChanges);
        }

        return newChanges;
      });
    },
    []
  );

  /**
   * Save all pending changes
   */
  const saveChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return true;

    setSaving(true);
    try {
      for (const [role, changes] of pendingChanges) {
        // Calculate new enabled state for ALL permissions
        const newEnabledMenus: string[] = [];
        
        for (const perm of ALL_PERMISSIONS) {
          const menuKey = perm.menu;
          // Current state from matrix (default + overrides)
          const currentlyEnabled = matrix?.[role]?.[menuKey] ?? false;
          // Is it toggled in pending changes?
          const isToggled = changes.has(menuKey);
          
          // Final state: if toggled, flip current. Else keep current.
          const finalState = isToggled ? !currentlyEnabled : currentlyEnabled;
          
          if (finalState) {
            newEnabledMenus.push(menuKey);
          }
        }

        await updatePermissions(role as UserRole, newEnabledMenus);
      }

      setPendingChanges(new Map());
      return true;
    } catch (error) {
      console.error('Error saving permissions:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [pendingChanges, matrix, updatePermissions]);

  /**
   * Discard all pending changes
   */
  const discardChanges = useCallback(() => {
    setPendingChanges(new Map());
  }, []);

  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = pendingChanges.size > 0;

  /**
   * Get effective permission value (considering pending changes)
   */
  const getEffectiveValue = useCallback(
    (role: UserRole, menuKey: string): boolean => {
      const baseValue = matrix?.[role]?.[menuKey] ?? false;
      const hasChange = pendingChanges.get(role)?.has(menuKey);
      return hasChange ? !baseValue : baseValue;
    },
    [matrix, pendingChanges]
  );

  return {
    matrix,
    isSuperAdmin,
    saving,
    hasUnsavedChanges,
    pendingChanges,
    togglePermission,
    saveChanges,
    discardChanges,
    resetPermissions,
    getEffectiveValue,
    refresh: loadMatrix,
  };
}
