import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type Tenant = Tables['tenants']['Row'];
type TenantSettings = Tables['tenant_settings']['Row'];
type TenantSubscription = Tables['tenant_subscriptions']['Row'];
type UserTenantAccess = Tables['user_tenant_access']['Row'];
type TenantActivityLog = Tables['tenant_activity_logs']['Row'];
type TenantUsageStats = Tables['tenant_usage_stats']['Row'];

export interface TenantWithDetails extends Tenant {
  settings?: TenantSettings;
  subscription?: TenantSubscription;
  userCount?: number;
  clientCount?: number;
}

export interface TenantStats {
  totalUsers: number;
  totalClients: number;
  activeUsers: number;
  revenue: number;
  storageUsed: number;
  lastActivity?: Date;
}

export interface CreateTenantDto {
  name: string;
  nameEnglish?: string;
  email: string;
  phone?: string;
  address?: any;
  billingPlan?: string;
  ownerEmail: string;
}

export interface UpdateTenantDto {
  name?: string;
  nameEnglish?: string;
  settings?: Partial<TenantSettings>;
  subscription?: Partial<TenantSubscription>;
}

export interface GlobalStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalClients: number;
  totalRevenue: number;
  averageRevenuePerTenant: number;
}

export class SuperAdminService extends BaseService {
  constructor() {
    super('super_admins');
  }

  /**
   * Check if current user is a super admin
   */
  async isSuperAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('super_admins')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(); // Returns null if no row found (not super admin)

      return !error && !!data;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  }

  /**
   * List all tenants with details
   */
  async listAllTenants(): Promise<TenantWithDetails[]> {
    try {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_settings!left(*),
          tenant_subscriptions!left(*),
          user_tenant_access!left(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get client counts for each tenant
      const tenantsWithCounts = await Promise.all(
        (tenants || []).map(async (tenant: any) => {
          const { count: clientCount } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return {
            ...tenant,
            settings: tenant.tenant_settings?.[0],
            subscription: tenant.tenant_subscriptions?.[0],
            userCount: tenant.user_tenant_access?.[0]?.count || 0,
            clientCount: clientCount || 0
          };
        })
      );

      return tenantsWithCounts;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Switch to a different tenant (for super admin)
   */
  async switchTenant(tenantId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Verify super admin status
      const isSuper = await this.isSuperAdmin();
      if (!isSuper) throw new Error('Super admin access required');

      // Update user metadata with selected tenant
      const { error } = await supabase.auth.updateUser({
        data: { selected_tenant_id: tenantId }
      });

      if (error) throw error;

      // Log the action
      await this.logAction('switch_tenant', tenantId, {
        from_tenant: await this.getTenantId(),
        to_tenant: tenantId
      });

      // Reload the page to apply new tenant context
      window.location.reload();
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get detailed stats for a specific tenant
   */
  async getTenantStats(tenantId: string): Promise<TenantStats> {
    try {
      // Get user count
      const { count: userCount } = await supabase
        .from('user_tenant_access')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      // Get client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('user_tenant_access')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('last_accessed_at', thirtyDaysAgo.toISOString());

      // Get revenue (from payment transactions)
      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed');

      const revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      // Get storage usage
      const { data: stats } = await supabase
        .from('tenant_usage_stats')
        .select('storage_used_mb')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get last activity
      const { data: lastLog } = await supabase
        .from('tenant_activity_logs')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        totalUsers: userCount || 0,
        totalClients: clientCount || 0,
        activeUsers: activeUsers || 0,
        revenue,
        storageUsed: stats?.storage_used_mb || 0,
        lastActivity: lastLog?.created_at ? new Date(lastLog.created_at) : undefined
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    try {
      // Start a transaction
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: data.name,
          name_english: data.nameEnglish
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create tenant settings
      const { error: settingsError } = await supabase
        .from('tenant_settings')
        .insert({
          tenant_id: tenant.id,
          company_name: data.name,
          company_name_english: data.nameEnglish,
          company_email: data.email,
          company_phone: data.phone,
          company_address: data.address,
          billing_plan: data.billingPlan || 'starter'
        });

      if (settingsError) throw settingsError;

      // Create subscription
      const { error: subError } = await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenant.id,
          plan_id: data.billingPlan || 'starter',
          plan_name: data.billingPlan || 'Starter Plan',
          status: 'trialing',
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days trial
        });

      if (subError) throw subError;

      // Create owner user if email provided
      if (data.ownerEmail) {
        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', data.ownerEmail)
          .single();

        if (existingUser) {
          // Grant access to existing user
          await supabase
            .from('user_tenant_access')
            .insert({
              user_id: existingUser.id,
              tenant_id: tenant.id,
              role: 'owner',
              is_primary: true
            });
        }
      }

      // Log the action
      await this.logAction('create_tenant', tenant.id, {
        tenant_name: data.name,
        billing_plan: data.billingPlan
      });

      return tenant;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tenant information
   */
  async updateTenant(tenantId: string, data: UpdateTenantDto): Promise<void> {
    try {
      // Update tenant basic info
      if (data.name || data.nameEnglish) {
        const { error } = await supabase
          .from('tenants')
          .update({
            name: data.name,
            name_english: data.nameEnglish
          })
          .eq('id', tenantId);

        if (error) throw error;
      }

      // Update settings
      if (data.settings) {
        const { error } = await supabase
          .from('tenant_settings')
          .update(data.settings)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      }

      // Update subscription
      if (data.subscription) {
        const { error } = await supabase
          .from('tenant_subscriptions')
          .update(data.subscription)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      }

      // Log the action
      await this.logAction('update_tenant', tenantId, {
        changes: data
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Suspend a tenant
   */
  async suspendTenant(tenantId: string, reason?: string): Promise<void> {
    try {
      // Update subscription status
      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Deactivate all users
      await supabase
        .from('user_tenant_access')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoke_reason: reason || 'Tenant suspended'
        })
        .eq('tenant_id', tenantId);

      // Log the action
      await this.logAction('suspend_tenant', tenantId, {
        reason
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Activate a suspended tenant
   */
  async activateTenant(tenantId: string): Promise<void> {
    try {
      // Update subscription status
      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Reactivate users
      await supabase
        .from('user_tenant_access')
        .update({
          is_active: true,
          revoked_at: null,
          revoke_reason: null
        })
        .eq('tenant_id', tenantId);

      // Log the action
      await this.logAction('activate_tenant', tenantId);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete a tenant (soft delete)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      // Mark tenant as deleted
      const { error } = await supabase
        .from('tenants')
        .update({
          deleted_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) throw error;

      // Cancel subscription
      await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      // Log the action
      await this.logAction('delete_tenant', tenantId);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get global statistics across all tenants
   */
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      // Get tenant counts
      const { count: totalTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      const { count: activeTenants } = await supabase
        .from('tenant_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'trialing']);

      // Get user count
      const { count: totalUsers } = await supabase
        .from('user_tenant_access')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get client count
      const { count: totalClients } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Get total revenue
      const { data: payments } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      const averageRevenuePerTenant = totalTenants ? totalRevenue / totalTenants : 0;

      return {
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        totalUsers: totalUsers || 0,
        totalClients: totalClients || 0,
        totalRevenue,
        averageRevenuePerTenant
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get activity logs across all tenants
   */
  async getGlobalActivityLogs(limit = 100): Promise<TenantActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_activity_logs')
        .select(`
          *,
          tenants!left(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Search tenants by name or email
   */
  async searchTenants(query: string): Promise<TenantWithDetails[]> {
    try {
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_settings!left(*)
        `)
        .or(`name.ilike.%${query}%,name_english.ilike.%${query}%`)
        .order('name');

      if (error) throw error;

      return (tenants || []).map((t: any) => ({
        ...t,
        settings: t.tenant_settings?.[0]
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Grant super admin access to a user
   */
  async grantSuperAdminAccess(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('super_admins')
        .insert({
          user_id: userId,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      await this.logAction('grant_super_admin', userId);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Revoke super admin access
   */
  async revokeSuperAdminAccess(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('super_admins')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      await this.logAction('revoke_super_admin', userId);
    } catch (error) {
      return this.handleError(error);
    }
  }
}