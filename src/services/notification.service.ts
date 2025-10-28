/**
 * Notification Settings Service
 *
 * Service for managing user notification preferences and alert settings.
 * Used by Sigal to configure when and how she receives collection alerts.
 *
 * @module notification.service
 */

import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  NotificationSettings,
  UpdateNotificationSettingsDto,
} from '@/types/collection.types';

class NotificationService extends BaseService {
  constructor() {
    super('notification_settings');
  }

  /**
   * Get notification settings for the current user
   *
   * If settings don't exist yet, creates them with default values.
   *
   * @param tenantId - Optional tenant ID (uses current tenant if not provided)
   * @returns Notification settings
   */
  async getSettings(tenantId?: string): Promise<ServiceResponse<NotificationSettings>> {
    try {
      const tenant = tenantId || (await this.getTenantId());
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Try to get existing settings
      const { data: existing, error: fetchError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('tenant_id', tenant)
        .eq('user_id', user.id)
        .single();

      // If settings exist, return them
      if (existing) {
        return { data: existing, error: null };
      }

      // If no settings exist (PGRST116 = no rows), create default settings
      if (fetchError && fetchError.code === 'PGRST116') {
        const defaultSettings = await this.createDefaultSettings(tenant, user.id);
        return defaultSettings;
      }

      // Other error
      if (fetchError) {
        return { data: null, error: this.handleError(fetchError) };
      }

      return { data: existing, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update notification settings for the current user
   *
   * @param tenantId - Tenant ID
   * @param settings - Settings to update
   * @returns Updated notification settings
   */
  async updateSettings(
    tenantId: string,
    settings: UpdateNotificationSettingsDto
  ): Promise<ServiceResponse<NotificationSettings>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { data: null, error: new Error('User not authenticated') };
      }

      // Check if settings exist
      const existingResult = await this.getSettings(tenantId);
      if (existingResult.error) {
        return { data: null, error: existingResult.error };
      }

      // Update settings
      const { data, error } = await supabase
        .from('notification_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('update_notification_settings', user.id, {
        changes: Object.keys(settings),
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Check if alerts need to be sent to Sigal based on current settings
   *
   * This method is called by the automated reminder engine to determine
   * which alerts should be sent.
   *
   * @returns Alerts that need to be sent
   */
  async checkAlertsNeeded(): Promise<
    ServiceResponse<{
      unopened_letters: Array<{ fee_id: string; client_name: string; days_since_sent: number }>;
      no_selection: Array<{ fee_id: string; client_name: string; days_since_sent: number }>;
      abandoned_cart: Array<{ fee_id: string; client_name: string; days_since_selection: number }>;
      checks_overdue: Array<{ fee_id: string; client_name: string; days_since_selection: number }>;
      disputes: Array<{ dispute_id: string; client_name: string; claimed_amount: number }>;
    }>
  > {
    try {
      const tenantId = await this.getTenantId();

      // Get current user's settings
      const settingsResult = await this.getSettings(tenantId);
      if (settingsResult.error || !settingsResult.data) {
        return {
          data: {
            unopened_letters: [],
            no_selection: [],
            abandoned_cart: [],
            checks_overdue: [],
            disputes: [],
          },
          error: null,
        };
      }

      const settings = settingsResult.data;
      const now = new Date();

      // Check unopened letters
      const unopenedThreshold = new Date(
        now.getTime() - settings.notify_letter_not_opened_days * 24 * 60 * 60 * 1000
      );

      const { data: unopened } = await supabase
        .from('fee_calculations')
        .select(
          `
          id,
          created_at,
          clients!inner (company_name)
        `
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'sent')
        .is('payment_method_selected', null)
        .lte('created_at', unopenedThreshold.toISOString());

      // Check no selection
      const noSelectionThreshold = new Date(
        now.getTime() - settings.notify_no_selection_days * 24 * 60 * 60 * 1000
      );

      const { data: noSelection } = await supabase
        .from('fee_calculations')
        .select(
          `
          id,
          created_at,
          clients!inner (company_name)
        `
        )
        .eq('tenant_id', tenantId)
        .in('status', ['sent'])
        .is('payment_method_selected', null)
        .lte('created_at', noSelectionThreshold.toISOString());

      // Check abandoned cart
      const abandonedThreshold = new Date(
        now.getTime() - settings.notify_abandoned_cart_days * 24 * 60 * 60 * 1000
      );

      const { data: abandoned } = await supabase
        .from('payment_method_selections')
        .select(
          `
          fee_calculation_id,
          selected_at,
          fee_calculations!inner (
            clients!inner (company_name)
          )
        `
        )
        .eq('tenant_id', tenantId)
        .eq('completed_payment', false)
        .in('selected_method', ['cc_single', 'cc_installments'])
        .lte('selected_at', abandonedThreshold.toISOString());

      // Check checks overdue
      const checksThreshold = new Date(
        now.getTime() - settings.notify_checks_overdue_days * 24 * 60 * 60 * 1000
      );

      const { data: checksOverdue } = await supabase
        .from('fee_calculations')
        .select(
          `
          id,
          payment_method_selected_at,
          clients!inner (company_name)
        `
        )
        .eq('tenant_id', tenantId)
        .eq('payment_method_selected', 'checks')
        .in('status', ['sent'])
        .lte('payment_method_selected_at', checksThreshold.toISOString());

      // Check disputes
      const { data: disputes } = await supabase
        .from('payment_disputes')
        .select(
          `
          id,
          claimed_amount,
          clients!inner (company_name)
        `
        )
        .eq('tenant_id', tenantId)
        .eq('status', 'pending');

      // Transform data for response
      const unopenedLetters = (unopened || []).map((fee: Record<string, unknown>) => {
        const createdAt = new Date(fee.created_at as string);
        const daysSinceSent = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const client = fee.clients as Record<string, unknown>;

        return {
          fee_id: fee.id as string,
          client_name: client.company_name as string,
          days_since_sent: daysSinceSent,
        };
      });

      const noSelectionAlerts = (noSelection || []).map((fee: Record<string, unknown>) => {
        const createdAt = new Date(fee.created_at as string);
        const daysSinceSent = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const client = fee.clients as Record<string, unknown>;

        return {
          fee_id: fee.id as string,
          client_name: client.company_name as string,
          days_since_sent: daysSinceSent,
        };
      });

      const abandonedAlerts = (abandoned || []).map((selection: Record<string, unknown>) => {
        const selectedAt = new Date(selection.selected_at as string);
        const daysSinceSelection = Math.floor(
          (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const feeCalc = selection.fee_calculations as Record<string, unknown>;
        const client = feeCalc.clients as Record<string, unknown>;

        return {
          fee_id: selection.fee_calculation_id as string,
          client_name: client.company_name as string,
          days_since_selection: daysSinceSelection,
        };
      });

      const checksAlerts = (checksOverdue || []).map((fee: Record<string, unknown>) => {
        const selectedAt = new Date(fee.payment_method_selected_at as string);
        const daysSinceSelection = Math.floor(
          (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const client = fee.clients as Record<string, unknown>;

        return {
          fee_id: fee.id as string,
          client_name: client.company_name as string,
          days_since_selection: daysSinceSelection,
        };
      });

      const disputeAlerts = (disputes || []).map((dispute: Record<string, unknown>) => {
        const client = dispute.clients as Record<string, unknown>;

        return {
          dispute_id: dispute.id as string,
          client_name: client.company_name as string,
          claimed_amount: Number(dispute.claimed_amount || 0),
        };
      });

      return {
        data: {
          unopened_letters: unopenedLetters,
          no_selection: noSelectionAlerts,
          abandoned_cart: abandonedAlerts,
          checks_overdue: checksAlerts,
          disputes: disputeAlerts,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Toggle email notifications on/off
   *
   * @param enabled - Whether to enable email notifications
   * @returns Updated settings
   */
  async toggleEmailNotifications(enabled: boolean): Promise<ServiceResponse<NotificationSettings>> {
    try {
      const tenantId = await this.getTenantId();
      return this.updateSettings(tenantId, { enable_email_notifications: enabled });
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Toggle automatic reminders on/off
   *
   * @param enabled - Whether to enable automatic reminders
   * @returns Updated settings
   */
  async toggleAutomaticReminders(enabled: boolean): Promise<ServiceResponse<NotificationSettings>> {
    try {
      const tenantId = await this.getTenantId();
      return this.updateSettings(tenantId, { enable_automatic_reminders: enabled });
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update alert threshold days
   *
   * @param thresholds - New threshold values
   * @returns Updated settings
   */
  async updateAlertThresholds(thresholds: {
    letter_not_opened?: number;
    no_selection?: number;
    abandoned_cart?: number;
    checks_overdue?: number;
  }): Promise<ServiceResponse<NotificationSettings>> {
    try {
      const tenantId = await this.getTenantId();

      const updates: UpdateNotificationSettingsDto = {};

      if (thresholds.letter_not_opened !== undefined) {
        updates.notify_letter_not_opened_days = thresholds.letter_not_opened;
      }
      if (thresholds.no_selection !== undefined) {
        updates.notify_no_selection_days = thresholds.no_selection;
      }
      if (thresholds.abandoned_cart !== undefined) {
        updates.notify_abandoned_cart_days = thresholds.abandoned_cart;
      }
      if (thresholds.checks_overdue !== undefined) {
        updates.notify_checks_overdue_days = thresholds.checks_overdue;
      }

      return this.updateSettings(tenantId, updates);
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update reminder day intervals
   *
   * @param intervals - New reminder intervals
   * @returns Updated settings
   */
  async updateReminderIntervals(intervals: {
    first_reminder?: number;
    second_reminder?: number;
    third_reminder?: number;
  }): Promise<ServiceResponse<NotificationSettings>> {
    try {
      const tenantId = await this.getTenantId();

      const updates: UpdateNotificationSettingsDto = {};

      if (intervals.first_reminder !== undefined) {
        updates.first_reminder_days = intervals.first_reminder;
      }
      if (intervals.second_reminder !== undefined) {
        updates.second_reminder_days = intervals.second_reminder;
      }
      if (intervals.third_reminder !== undefined) {
        updates.third_reminder_days = intervals.third_reminder;
      }

      return this.updateSettings(tenantId, updates);
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Create default notification settings for a new user
   */
  private async createDefaultSettings(
    tenantId: string,
    userId: string
  ): Promise<ServiceResponse<NotificationSettings>> {
    try {
      // Get user email from auth
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('notification_settings')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          notify_letter_not_opened_days: 7,
          notify_no_selection_days: 14,
          notify_abandoned_cart_days: 2,
          notify_checks_overdue_days: 30,
          enable_email_notifications: true,
          notification_email: user?.email || null,
          enable_automatic_reminders: true,
          first_reminder_days: 14,
          second_reminder_days: 30,
          third_reminder_days: 60,
          group_daily_alerts: false,
          daily_alert_time: '09:00',
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('create_notification_settings', userId);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const notificationService = new NotificationService();
