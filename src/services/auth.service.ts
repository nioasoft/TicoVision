import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type UserRole = 'admin' | 'accountant' | 'bookkeeper' | 'client' | 'super_admin';

// Tenant types from database
type Tenant = Tables['tenants']['Row'];
type TenantSettings = Tables['tenant_settings']['Row'];

// Tenant with settings for join queries
export interface TenantWithSettings extends Tenant {
  tenant_settings?: TenantSettings[];
}

// Activity log details
export interface ActivityLogDetails {
  action?: string;
  resource?: string;
  ip_address?: string;
  [key: string]: unknown;
}

export interface AuthUser extends User {
  role?: UserRole;
  tenantId?: string;
  isSuperAdmin?: boolean;
  selectedTenantId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends LoginCredentials {
  fullName: string;
  phone?: string;
  tenantId?: string;
  role?: UserRole;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  }

  /**
   * Get current user with extended info
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Check if super admin
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(); // Returns null if no row found (not super admin)

      // Get tenant access
      const { data: tenantAccess } = await supabase
        .from('user_tenant_access')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_primary', true)
        .single();

      const authUser: AuthUser = {
        ...user,
        role: superAdmin ? 'super_admin' : (tenantAccess?.role as UserRole),
        tenantId: tenantAccess?.tenant_id,
        isSuperAdmin: !!superAdmin,
        selectedTenantId: user.user_metadata?.selected_tenant_id
      };

      return authUser;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Login with email and password
   */
  async login({ email, password }: LoginCredentials): Promise<{
    user: AuthUser | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Log the login action
      if (data.user) {
        await this.logActivity('user_login', {
          user_id: data.user.id,
          email: data.user.email
        });
      }

      const user = await this.getCurrentUser();
      return { user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Sign up new user
   */
  async signUp(data: SignUpData): Promise<{
    user: User | null;
    error: Error | null;
  }> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone
          }
        }
      });

      if (authError) throw authError;

      // If tenant ID provided, create tenant access
      if (authData.user && data.tenantId) {
        const { error: accessError } = await supabase
          .from('user_tenant_access')
          .insert({
            user_id: authData.user.id,
            tenant_id: data.tenantId,
            role: data.role || 'bookkeeper',
            is_primary: true
          });

        if (accessError) {
          console.error('Error creating tenant access:', accessError);
        }
      }

      // Log the signup
      await this.logActivity('user_signup', {
        user_id: authData.user?.id,
        email: data.email
      });

      return { user: authData.user, error: null };
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      const user = await this.getCurrentUser();
      if (user) {
        await this.logActivity('user_logout', {
          user_id: user.id,
          email: user.email
        });
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  }

  /**
   * Reset password request
   */
  async resetPassword(email: string): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/set-password`
      });

      if (error) throw error;

      await this.logActivity('password_reset_request', { email });

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      await this.logActivity('password_updated');

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(data: {
    fullName?: string;
    phone?: string;
  }): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: data.fullName,
          phone: data.phone
        }
      });

      if (error) throw error;

      await this.logActivity('profile_updated', data);

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Get user's tenant information
   */
  async getUserTenant(): Promise<{
    tenant: TenantWithSettings | null;
    error: Error | null;
  }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // If super admin with selected tenant
      if (user.isSuperAdmin && user.selectedTenantId) {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            tenant_settings!left(*)
          `)
          .eq('id', user.selectedTenantId)
          .single();

        if (error) throw error;
        return { tenant: data, error: null };
      }

      // Regular user - get primary tenant
      if (user.tenantId) {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            tenant_settings!left(*)
          `)
          .eq('id', user.tenantId)
          .single();

        if (error) throw error;
        return { tenant: data, error: null };
      }

      return { tenant: null, error: new Error('No tenant associated') };
    } catch (error) {
      return { tenant: null, error: error as Error };
    }
  }

  /**
   * Get user's accessible tenants
   */
  async getUserTenants(): Promise<{
    tenants: TenantWithSettings[];
    error: Error | null;
  }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // If super admin, get all tenants
      if (user.isSuperAdmin) {
        const { data, error } = await supabase
          .from('tenants')
          .select(`
            *,
            tenant_settings!left(*)
          `)
          .order('name');

        if (error) throw error;
        return { tenants: data || [], error: null };
      }

      // Regular user - get accessible tenants
      const { data, error } = await supabase
        .from('user_tenant_access')
        .select(`
          tenant_id,
          role,
          is_primary,
          tenants!inner(
            *,
            tenant_settings!left(*)
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const tenants = (data || []).map(access => ({
        ...access.tenants,
        userRole: access.role,
        isPrimary: access.is_primary
      }));

      return { tenants, error: null };
    } catch (error) {
      return { tenants: [], error: error as Error };
    }
  }

  /**
   * Switch to a different tenant (for users with access to multiple tenants)
   */
  async switchTenant(tenantId: string): Promise<{
    success: boolean;
    error: Error | null;
  }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Verify user has access to this tenant
      if (!user.isSuperAdmin) {
        const { data: access } = await supabase
          .from('user_tenant_access')
          .select('id')
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .single();

        if (!access) {
          throw new Error('No access to this tenant');
        }
      }

      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { selected_tenant_id: tenantId }
      });

      if (error) throw error;

      // Update last accessed
      await supabase
        .from('user_tenant_access')
        .update({ last_accessed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId);

      await this.logActivity('tenant_switched', {
        from_tenant: user.tenantId,
        to_tenant: tenantId
      });

      // Reload to apply new context
      window.location.reload();

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      if (!user) return false;

      // Super admin has all permissions
      if (user.isSuperAdmin) return true;

      // Check role-based permissions
      const rolePermissions: Record<UserRole, string[]> = {
        admin: ['all'],
        accountant: ['view', 'edit', 'create', 'delete'],
        bookkeeper: ['view', 'edit', 'create'],
        client: ['view'],
        super_admin: ['all']
      };

      const userPermissions = rolePermissions[user.role || 'client'];
      return userPermissions.includes('all') || userPermissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.isSuperAdmin || false;
  }

  /**
   * Log activity
   */
  private async logActivity(action: string, details: ActivityLogDetails = {}): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get tenant ID
      const { data: tenantAccess } = await supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      await supabase.from('tenant_activity_logs').insert({
        tenant_id: tenantAccess?.tenant_id || user.user_metadata?.selected_tenant_id,
        user_id: user.id,
        user_email: user.email,
        action,
        action_category: 'auth',
        details
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = AuthService.getInstance();