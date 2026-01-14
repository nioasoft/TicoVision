/**
 * Capital Declaration Reminder Service
 * Handles settings and banner state for capital declaration reminders
 */

import { supabase } from '@/lib/supabase';
import { BaseService, type ServiceResponse } from './base.service';
import type { Database } from '@/types/supabase';

type ReminderSettings = Database['public']['Tables']['capital_declaration_reminder_settings']['Row'];
type ReminderSettingsInsert = Database['public']['Tables']['capital_declaration_reminder_settings']['Insert'];
type ReminderSettingsUpdate = Database['public']['Tables']['capital_declaration_reminder_settings']['Update'];

export interface UpdateReminderSettingsDto {
  enable_client_reminders?: boolean;
  client_reminder_frequency_days?: number;
  enable_weekly_report?: boolean;
  weekly_report_email?: string | null;
}

export interface BannerStatus {
  showBanner: boolean;
  triggeredAt: string | null;
}

class CapitalDeclarationReminderService extends BaseService {
  constructor() {
    super('capital_declaration_reminder_settings');
  }

  /**
   * Get reminder settings for the current tenant
   * Creates default settings if none exist
   */
  async getSettings(): Promise<ServiceResponse<ReminderSettings>> {
    try {
      const tenantId = await this.getTenantId();

      // Try to get existing settings
      const { data, error } = await supabase
        .from('capital_declaration_reminder_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create defaults
        const { data: newSettings, error: insertError } = await supabase
          .from('capital_declaration_reminder_settings')
          .insert({
            tenant_id: tenantId,
            enable_client_reminders: true,
            client_reminder_frequency_days: 9,
            enable_weekly_report: true,
            show_weekly_banner: false,
          } as ReminderSettingsInsert)
          .select()
          .single();

        if (insertError) {
          return { data: null, error: this.handleError(insertError) };
        }

        return { data: newSettings, error: null };
      }

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Update reminder settings
   */
  async updateSettings(dto: UpdateReminderSettingsDto): Promise<ServiceResponse<ReminderSettings>> {
    try {
      const tenantId = await this.getTenantId();

      const updateData: ReminderSettingsUpdate = {};
      if (dto.enable_client_reminders !== undefined) {
        updateData.enable_client_reminders = dto.enable_client_reminders;
      }
      if (dto.client_reminder_frequency_days !== undefined) {
        updateData.client_reminder_frequency_days = dto.client_reminder_frequency_days;
      }
      if (dto.enable_weekly_report !== undefined) {
        updateData.enable_weekly_report = dto.enable_weekly_report;
      }
      if (dto.weekly_report_email !== undefined) {
        updateData.weekly_report_email = dto.weekly_report_email;
      }

      const { data, error } = await supabase
        .from('capital_declaration_reminder_settings')
        .update(updateData)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('update_reminder_settings', tenantId, dto);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Check if the weekly banner should be shown
   */
  async checkBannerStatus(): Promise<ServiceResponse<BannerStatus>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('capital_declaration_reminder_settings')
        .select('show_weekly_banner, banner_triggered_at, last_banner_dismissed_at')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, banner not shown
        return { data: { showBanner: false, triggeredAt: null }, error: null };
      }

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Determine if banner should show
      let showBanner = false;
      if (data?.show_weekly_banner && data.banner_triggered_at) {
        const triggeredAt = new Date(data.banner_triggered_at);
        const dismissedAt = data.last_banner_dismissed_at
          ? new Date(data.last_banner_dismissed_at)
          : null;

        // Show banner if not dismissed, or dismissed before it was triggered
        showBanner = !dismissedAt || dismissedAt < triggeredAt;
      }

      return {
        data: {
          showBanner,
          triggeredAt: data?.banner_triggered_at || null,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Dismiss the weekly banner
   */
  async dismissBanner(): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('capital_declaration_reminder_settings')
        .update({
          last_banner_dismissed_at: new Date().toISOString(),
          last_banner_dismissed_by: user?.id || null,
        })
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      await this.logAction('dismiss_weekly_banner', tenantId);
      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Get reminders log for a specific declaration
   */
  async getRemindersForDeclaration(declarationId: string): Promise<ServiceResponse<Database['public']['Tables']['capital_declaration_reminders']['Row'][]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('capital_declaration_reminders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('declaration_id', declarationId)
        .order('sent_at', { ascending: false });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }

  /**
   * Trigger sending reminders to all eligible clients manually
   * Calls the capital-declaration-reminder-engine edge function
   */
  async sendRemindersToAll(): Promise<ServiceResponse<{ sent: number; skipped: number }>> {
    try {
      const tenantId = await this.getTenantId();

      // Invoke the edge function
      const { data, error } = await supabase.functions.invoke('capital-declaration-reminder-engine', {
        body: {
          tenant_id: tenantId,
          manual_trigger: true,
        },
      });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('send_reminders_to_all', tenantId, data);
      return { data: data || { sent: 0, skipped: 0 }, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error : new Error('Unknown error') };
    }
  }
}

export const capitalDeclarationReminderService = new CapitalDeclarationReminderService();
