import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import { logger } from '@/lib/logger';

type Tables = Database['public']['Tables'];
type TenantSettings = Tables['tenant_settings']['Row'];
type TenantSubscription = Tables['tenant_subscriptions']['Row'];
type UserTenantAccess = Tables['user_tenant_access']['Row'];
type TenantActivityLog = Tables['tenant_activity_logs']['Row'];
type TenantUsageStats = Tables['tenant_usage_stats']['Row'];
type Client = Tables['clients']['Row'];

export interface TenantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customDomain?: string;
}

export interface TenantLimits {
  maxUsers?: number;
  maxClients?: number;
  maxStorageGb?: number;
  maxApiCallsPerDay?: number;
  maxEmailPerMonth?: number;
}

export interface TenantFeatures {
  feeManagement?: boolean;
  letterTemplates?: boolean;
  paymentIntegration?: boolean;
  clientPortal?: boolean;
  apiAccess?: boolean;
  whiteLabel?: boolean;
  customDomain?: boolean;
}

// User permissions structure
export interface UserPermissions {
  canManageUsers?: boolean;
  canManageClients?: boolean;
  canManageFees?: boolean;
  canSendLetters?: boolean;
  canViewReports?: boolean;
  canManageSettings?: boolean;
  [key: string]: boolean | undefined;
}

// Tenant usage metrics
export interface TenantUsageMetrics {
  userCount?: number;
  clientCount?: number;
  storageUsed?: number;
  apiCallsToday?: number;
  emailsThisMonth?: number;
  [key: string]: number | undefined;
}

export interface UserAccess {
  userId: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  isPrimary: boolean;
  isActive: boolean;
  grantedAt: Date;
  lastAccessedAt?: Date;
}

export interface ActivityLogFilter {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  userId?: string;
  resourceType?: string;
  status?: string;
  limit?: number;
}

export interface UsageMetrics {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  activeUsers: number;
  totalClients: number;
  newClients: number;
  totalLogins: number;
  lettersSent: number;
  paymentsProcessed: number;
  apiCalls: number;
  revenueCollected: number;
  storageUsedMb: number;
}

export class TenantManagementService extends BaseService {
  constructor() {
    super('tenant_settings');
  }

  /**
   * Get tenant details including settings and subscription
   */
  async getTenantDetails(tenantId: string): Promise<{
    settings?: TenantSettings;
    subscription?: TenantSubscription;
    usageStats?: TenantUsageStats;
  }> {
    try {
      // Get tenant settings
      const { data: settings, error: settingsError } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      // Get subscription
      const { data: subscription, error: subError } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;

      // Get latest usage stats
      const { data: usageStats, error: statsError } = await supabase
        .from('tenant_usage_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('period_start', { ascending: false })
        .limit(1)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      return {
        settings: settings || undefined,
        subscription: subscription || undefined,
        usageStats: usageStats || undefined
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tenant branding settings
   */
  async updateTenantBranding(tenantId: string, branding: TenantBranding): Promise<void> {
    try {
      const updates: Partial<TenantSettings> = {
        logo_url: branding.logoUrl,
        favicon_url: branding.faviconUrl,
        primary_color: branding.primaryColor,
        secondary_color: branding.secondaryColor,
        accent_color: branding.accentColor,
        custom_domain: branding.customDomain,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tenant_settings')
        .update(updates)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('update_branding', tenantId, { branding });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tenant feature flags
   */
  async updateTenantFeatures(tenantId: string, features: TenantFeatures): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          features,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('update_features', tenantId, { features });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tenant usage limits
   */
  async updateTenantLimits(tenantId: string, limits: TenantLimits): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          limits,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('update_limits', tenantId, { limits });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get all users with access to a tenant
   */
  async getTenantUsers(tenantId: string): Promise<UserAccess[]> {
    try {
      const { data, error } = await supabase
        .from('user_tenant_access')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('granted_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((access: UserTenantAccess) => ({
        userId: access.user_id,
        email: '', // Email will need to be fetched separately if needed
        role: access.role,
        permissions: access.permissions,
        isPrimary: access.is_primary,
        isActive: access.is_active,
        grantedAt: new Date(access.granted_at),
        lastAccessedAt: access.last_accessed_at ? new Date(access.last_accessed_at) : undefined
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Grant user access to tenant
   */
  async grantUserAccess(
    tenantId: string,
    userId: string,
    role: string,
    permissions?: UserPermissions
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_tenant_access')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          role,
          permissions: permissions || {},
          granted_by: user?.id
        });

      if (error) throw error;

      await this.logAction('grant_user_access', tenantId, {
        user_id: userId,
        role,
        permissions
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update user access role or permissions
   */
  async updateUserAccess(
    tenantId: string,
    userId: string,
    updates: {
      role?: string;
      permissions?: UserPermissions;
      isActive?: boolean;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_tenant_access')
        .update(updates)
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) throw error;

      await this.logAction('update_user_access', tenantId, {
        user_id: userId,
        updates
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Revoke user access to tenant
   */
  async revokeUserAccess(tenantId: string, userId: string, reason?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('user_tenant_access')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
          revoke_reason: reason
        })
        .eq('tenant_id', tenantId)
        .eq('user_id', userId);

      if (error) throw error;

      await this.logAction('revoke_user_access', tenantId, {
        user_id: userId,
        reason
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get tenant activity logs
   */
  async getTenantActivityLogs(
    tenantId: string,
    filter?: ActivityLogFilter
  ): Promise<TenantActivityLog[]> {
    try {
      let query = supabase
        .from('tenant_activity_logs')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filter?.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString());
      }
      if (filter?.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString());
      }
      if (filter?.action) {
        query = query.eq('action', filter.action);
      }
      if (filter?.userId) {
        query = query.eq('user_id', filter.userId);
      }
      if (filter?.resourceType) {
        query = query.eq('resource_type', filter.resourceType);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      query = query.order('created_at', { ascending: false });

      if (filter?.limit) {
        query = query.limit(filter.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get tenant usage metrics
   */
  async getTenantUsageMetrics(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly',
    startDate: Date,
    endDate: Date
  ): Promise<UsageMetrics[]> {
    try {
      const { data, error } = await supabase
        .from('tenant_usage_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('period_type', period)
        .gte('period_start', startDate.toISOString())
        .lte('period_end', endDate.toISOString())
        .order('period_start');

      if (error) throw error;

      return (data || []).map(stat => ({
        period,
        startDate: new Date(stat.period_start),
        endDate: new Date(stat.period_end),
        activeUsers: stat.active_users,
        totalClients: stat.total_clients,
        newClients: stat.new_clients,
        totalLogins: stat.total_logins,
        lettersSent: stat.letters_sent,
        paymentsProcessed: stat.payments_processed,
        apiCalls: stat.api_calls,
        revenueCollected: stat.revenue_collected,
        storageUsedMb: stat.storage_used_mb
      }));
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tenant subscription
   */
  async updateTenantSubscription(
    tenantId: string,
    subscription: Partial<TenantSubscription>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({
          ...subscription,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('update_subscription', tenantId, { subscription });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Check if tenant has exceeded limits
   */
  async checkTenantLimits(tenantId: string): Promise<{
    withinLimits: boolean;
    exceeded: string[];
    usage: TenantUsageMetrics;
  }> {
    try {
      // Get tenant settings with limits
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('limits')
        .eq('tenant_id', tenantId)
        .single();

      if (!settings?.limits) {
        return { withinLimits: true, exceeded: [], usage: {} };
      }

      const limits = settings.limits as TenantLimits;
      const exceeded: string[] = [];
      const usage: TenantUsageMetrics = {};

      // Check user limit
      if (limits.maxUsers) {
        const { count } = await supabase
          .from('user_tenant_access')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('is_active', true);

        usage.users = count || 0;
        if (usage.users >= limits.maxUsers) {
          exceeded.push('users');
        }
      }

      // Check client limit
      if (limits.maxClients) {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);

        usage.clients = count || 0;
        if (usage.clients >= limits.maxClients) {
          exceeded.push('clients');
        }
      }

      // Get current usage from stats
      const { data: stats } = await supabase
        .from('tenant_usage_stats')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (stats) {
        // Check storage limit
        if (limits.maxStorageGb) {
          usage.storageGb = (stats.storage_used_mb || 0) / 1024;
          if (usage.storageGb >= limits.maxStorageGb) {
            exceeded.push('storage');
          }
        }

        // Check API calls limit
        if (limits.maxApiCallsPerDay) {
          usage.apiCalls = stats.api_calls || 0;
          if (usage.apiCalls >= limits.maxApiCallsPerDay) {
            exceeded.push('apiCalls');
          }
        }
      }

      return {
        withinLimits: exceeded.length === 0,
        exceeded,
        usage
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Export tenant data
   */
  async exportTenantData(tenantId: string): Promise<{
    settings: TenantSettings | null;
    users: UserAccess[];
    clients: Client[];
    activity: TenantActivityLog[];
  }> {
    try {
      // Get settings
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      // Get users
      const users = await this.getTenantUsers(tenantId);

      // Get clients
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenantId);

      // Get recent activity
      const activity = await this.getTenantActivityLogs(tenantId, { limit: 1000 });

      return {
        settings,
        users,
        clients: clients || [],
        activity
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Verify custom domain
   */
  async verifyCustomDomain(tenantId: string, domain: string): Promise<boolean> {
    try {
      // TODO: Implement domain verification logic
      // This would typically involve DNS record checks

      const { error } = await supabase
        .from('tenant_settings')
        .update({
          custom_domain: domain,
          custom_domain_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('verify_custom_domain', tenantId, { domain });
      return true;
    } catch (error) {
      logger.error('Error verifying custom domain:', error);
      return false;
    }
  }
}