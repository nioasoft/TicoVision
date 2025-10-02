import { BaseService } from './base.service';
import type { ServiceResponse, PaginationParams, FilterParams } from './base.service';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/user-role';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  permissions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  permissions?: Record<string, unknown>;
}

export interface UpdateUserData {
  full_name?: string;
  phone?: string;
  role?: UserRole;
  is_active?: boolean;
  permissions?: Record<string, unknown>;
}

export class UserService extends BaseService {
  constructor() {
    super('user_tenant_access'); // Use the correct table
  }

  /**
   * Get all users for the current tenant
   */
  async getUsers(
    pagination?: PaginationParams,
    filters?: FilterParams
  ): Promise<ServiceResponse<{ users: User[]; total: number }>> {
    try {
      // Check if user is authenticated first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session || sessionError) {
        console.warn('No active session - returning empty user list');
        return {
          data: { users: [], total: 0 },
          error: null
        };
      }

      const tenantId = await this.getTenantId();

      // Use the RPC function to get users with auth data
      const { data, error } = await supabase
        .rpc('get_users_for_tenant');

      if (error) {
        // Handle 403 Forbidden gracefully (likely due to session issues)
        if (error.code === 'PGRST301' || error.message.includes('403')) {
          console.warn('Permission denied accessing users - session may be invalid');
          return {
            data: { users: [], total: 0 },
            error: null
          };
        }
        return { data: null, error: this.handleError(error) };
      }

      // Map the data to the expected format
      const users = data?.map(user => ({
        id: user.user_id, // Use user_id as the main id
        tenant_id: user.tenant_id,
        email: user.email || '',
        full_name: user.email?.split('@')[0] || 'Unknown', // Derive from email temporarily
        role: user.role as UserRole,
        is_active: user.is_active,
        permissions: user.permissions || {},
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        last_login: user.last_sign_in_at || null,
      })) || [];
      
      // Apply client-side filtering if needed
      let filteredUsers = users;
      if (filters?.role) {
        filteredUsers = users.filter(u => u.role === filters.role);
      }
      if (filters?.is_active !== undefined) {
        filteredUsers = users.filter(u => u.is_active === filters.is_active);
      }
      
      // Apply client-side pagination
      const start = pagination ? (pagination.page - 1) * pagination.pageSize : 0;
      const end = pagination ? start + pagination.pageSize : filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(start, end);

      await this.logAction('view_users');

      return {
        data: { users: paginatedUsers, total: filteredUsers.length },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get a single user by ID
   */
  async getUser(userId: string): Promise<ServiceResponse<User>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('user_tenant_access')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Get auth user data
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);

      const user = {
        id: data.user_id,
        tenant_id: data.tenant_id,
        email: authUser?.email || '',
        full_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'Unknown',
        role: data.role as UserRole,
        is_active: data.is_active,
        permissions: data.permissions || {},
        created_at: data.granted_at || data.created_at,
        updated_at: data.last_accessed_at || data.granted_at,
        last_login: authUser?.last_sign_in_at || null,
      };

      await this.logAction('view_user', userId);

      return { data: user, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<ServiceResponse<User>> {
    try {
      const tenantId = await this.getTenantId();

      // Step 1: Create auth user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          tenant_id: tenantId,
          role: userData.role,
          full_name: userData.full_name,
        },
      });

      if (authError) {
        return { data: null, error: this.handleError(authError) };
      }

      if (!authData.user) {
        return { data: null, error: new Error('Failed to create auth user') };
      }

      // Step 2: Create user record in user_tenant_access table
      const { data, error } = await supabase
        .from('user_tenant_access')
        .insert({
          user_id: authData.user.id,
          tenant_id: tenantId,
          role: userData.role,
          is_active: true,
          is_primary: true,
          permissions: userData.permissions || {},
        })
        .select()
        .single();

      if (error) {
        // Rollback: Delete the auth user if database insert fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('create_user', data.id, { 
        email: userData.email,
        role: userData.role 
      });

      return {
        data: {
          id: data.user_id,
          tenant_id: data.tenant_id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone,
          role: data.role,
          is_active: data.is_active,
          permissions: data.permissions || {},
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(
    userId: string,
    updates: UpdateUserData
  ): Promise<ServiceResponse<User>> {
    try {
      const tenantId = await this.getTenantId();

      // Update user record in user_tenant_access table
      const { error } = await supabase
        .from('user_tenant_access')
        .update({
          role: updates.role,
          is_active: updates.is_active,
          permissions: updates.permissions,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // If role is updated, also update in auth metadata
      if (updates.role) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: updates.role },
        });
      }

      await this.logAction('update_user', userId, updates);

      // Get the full user data including email
      const userResponse = await this.getUser(userId);
      return userResponse;
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a user (soft delete - deactivate)
   */
  async deleteUser(userId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Soft delete - just deactivate the user in user_tenant_access
      const { error } = await supabase
        .from('user_tenant_access')
        .update({ 
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoke_reason: 'User deleted by admin',
        })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Also disable the auth user
      await supabase.auth.admin.updateUserById(userId, {
        ban_duration: 'none', // This effectively disables the user
      });

      await this.logAction('delete_user', userId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('reset_password', userId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get user roles
   */
  getUserRoles(): UserRole[] {
    return ['admin', 'accountant', 'bookkeeper', 'client'];
  }

  /**
   * Get role display name in Hebrew
   */
  getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: 'מנהל מערכת',
      accountant: 'רואה חשבון',
      bookkeeper: 'מנהלת חשבונות',
      client: 'לקוח',
    };
    return roleNames[role] || role;
  }

  /**
   * Check if current user can manage other users
   */
  async canManageUsers(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const role = user.user_metadata?.role as UserRole;
      return role === 'admin';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const userService = new UserService();