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
        full_name: user.full_name || user.email?.split('@')[0] || 'Unknown',
        phone: user.phone,
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

      // Use the RPC function to get all users, then filter by userId
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_for_tenant');

      if (usersError) {
        return { data: null, error: this.handleError(usersError) };
      }

      // Find the specific user
      const userData = usersData?.find(u => u.user_id === userId);
      if (!userData) {
        return { data: null, error: new Error('User not found') };
      }

      const user = {
        id: userData.user_id,
        tenant_id: userData.tenant_id,
        email: userData.email || '',
        full_name: userData.full_name || userData.email?.split('@')[0] || 'Unknown',
        phone: userData.phone,
        role: userData.role as UserRole,
        is_active: userData.is_active,
        permissions: userData.permissions || {},
        created_at: userData.created_at,
        updated_at: userData.updated_at || userData.created_at,
        last_login: userData.last_sign_in_at || null,
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
      // Use RPC function to create user (handles both auth.users and user_tenant_access)
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('create_user_with_role', {
          p_email: userData.email,
          p_password: userData.password,
          p_full_name: userData.full_name,
          p_phone: userData.phone || null,
          p_role: userData.role,
          p_permissions: userData.permissions || {}
        })
        .single();

      if (rpcError) {
        return { data: null, error: this.handleError(rpcError) };
      }

      if (!rpcData) {
        return { data: null, error: new Error('Failed to create user') };
      }

      await this.logAction('create_user', rpcData.user_id, {
        email: userData.email,
        role: userData.role
      });

      return {
        data: {
          id: rpcData.user_id,
          tenant_id: rpcData.tenant_id,
          email: rpcData.email,
          full_name: rpcData.full_name,
          phone: userData.phone,
          role: rpcData.role,
          is_active: true,
          permissions: userData.permissions || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
      // Use RPC function to update user (handles both user_tenant_access and auth.users)
      const { error: rpcError } = await supabase.rpc('update_user_role_and_metadata', {
        p_user_id: userId,
        p_role: updates.role || null,
        p_full_name: updates.full_name || null,
        p_phone: updates.phone || null,
        p_is_active: updates.is_active ?? null,
        p_permissions: updates.permissions || null
      });

      if (rpcError) {
        return { data: null, error: this.handleError(rpcError) };
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
      // Use RPC function to deactivate user (handles both user_tenant_access and auth.users)
      const { error: rpcError } = await supabase.rpc('deactivate_user_account', {
        p_user_id: userId,
        p_reason: 'User deleted by admin'
      });

      if (rpcError) {
        return { data: null, error: this.handleError(rpcError) };
      }

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
      // Use RPC function to reset password
      const { error: rpcError } = await supabase.rpc('reset_user_password', {
        p_user_id: userId,
        p_new_password: newPassword
      });

      if (rpcError) {
        return { data: null, error: this.handleError(rpcError) };
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