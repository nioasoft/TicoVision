/**
 * Reminder Management Service
 *
 * Service for managing payment reminder rules and reminder history.
 * Handles automated reminder configurations and manual reminder sending.
 *
 * @module reminder.service
 */

import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  ReminderRule,
  PaymentReminder,
  UpdateReminderRuleDto,
  SendManualReminderDto,
} from '@/types/collection.types';

class ReminderService extends BaseService {
  constructor() {
    super('reminder_rules');
  }

  /**
   * Get all reminder rules for the current tenant
   *
   * @param tenantId - Tenant ID (optional, will use current tenant if not provided)
   * @returns List of reminder rules ordered by priority
   */
  async getReminderRules(tenantId?: string): Promise<ServiceResponse<ReminderRule[]>> {
    try {
      const tenant = tenantId || (await this.getTenantId());

      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('tenant_id', tenant)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all reminder rules including inactive ones
   *
   * @returns List of all reminder rules
   */
  async getAllReminderRules(): Promise<ServiceResponse<ReminderRule[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('reminder_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: true });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update a reminder rule
   *
   * @param ruleId - Rule ID
   * @param updates - Fields to update
   * @returns Updated reminder rule
   */
  async updateReminderRule(
    ruleId: string,
    updates: UpdateReminderRuleDto
  ): Promise<ServiceResponse<ReminderRule>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('reminder_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ruleId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('update_reminder_rule', ruleId, { updates });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Toggle a reminder rule on/off
   *
   * @param ruleId - Rule ID
   * @param isActive - New active status
   * @returns Updated reminder rule
   */
  async toggleReminderRule(ruleId: string, isActive: boolean): Promise<ServiceResponse<ReminderRule>> {
    return this.updateReminderRule(ruleId, { is_active: isActive });
  }

  /**
   * Get reminder history for a specific fee
   *
   * @param feeId - Fee calculation ID
   * @returns List of reminders sent for this fee
   */
  async getReminderHistory(feeId: string): Promise<ServiceResponse<PaymentReminder[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('fee_calculation_id', feeId)
        .order('sent_at', { ascending: false });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get all reminders for a specific client
   *
   * @param clientId - Client ID
   * @returns List of reminders sent to this client
   */
  async getClientReminderHistory(clientId: string): Promise<ServiceResponse<PaymentReminder[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('sent_at', { ascending: false });

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get fees that need reminders today (based on rules)
   *
   * This method is used by the automated reminder engine.
   * It finds all fees that match active reminder rule conditions.
   *
   * @returns List of fee IDs needing reminders
   */
  async getRemindersNeedingAction(): Promise<
    ServiceResponse<
      Array<{
        fee_id: string;
        client_id: string;
        rule_id: string;
        rule_name: string;
        template: string;
      }>
    >
  > {
    try {
      const tenantId = await this.getTenantId();

      // Get active reminder rules
      const rulesResult = await this.getReminderRules();
      if (rulesResult.error) {
        return { data: null, error: rulesResult.error };
      }

      const rules = rulesResult.data || [];
      const remindersNeeded: Array<{
        fee_id: string;
        client_id: string;
        rule_id: string;
        rule_name: string;
        template: string;
      }> = [];

      const now = new Date();

      // For each rule, find matching fees
      for (const rule of rules) {
        const conditions = rule.trigger_conditions;
        const actions = rule.actions;

        // Build query based on trigger conditions
        let query = supabase
          .from('fee_calculations')
          .select('id, client_id, created_at, payment_method_selected_at')
          .eq('tenant_id', tenantId);

        // Apply payment_status condition
        if (conditions.payment_status) {
          query = query.in('status', conditions.payment_status);
        }

        // Apply payment_method_selected condition
        if (conditions.payment_method_selected !== undefined) {
          if (conditions.payment_method_selected === null) {
            query = query.is('payment_method_selected', null);
          } else if (Array.isArray(conditions.payment_method_selected)) {
            query = query.in('payment_method_selected', conditions.payment_method_selected);
          }
        }

        // Apply opened condition (requires join with generated_letters)
        if (conditions.opened !== undefined) {
          // This would require a more complex query with joins
          // For now, we'll handle this in the reminder engine Edge Function
        }

        const { data: fees, error } = await query;

        if (error) {
          continue; // Skip this rule if query fails
        }

        // Filter fees by days condition
        const matchingFees = (fees || []).filter((fee) => {
          // Check days_since_sent
          if (conditions.days_since_sent) {
            const createdAt = new Date(fee.created_at);
            const daysSinceSent = Math.floor(
              (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceSent < conditions.days_since_sent) {
              return false;
            }
          }

          // Check days_since_selection
          if (conditions.days_since_selection && fee.payment_method_selected_at) {
            const selectedAt = new Date(fee.payment_method_selected_at);
            const daysSinceSelection = Math.floor(
              (now.getTime() - selectedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceSelection < conditions.days_since_selection) {
              return false;
            }
          }

          return true;
        });

        // Add matching fees to reminders list
        for (const fee of matchingFees) {
          remindersNeeded.push({
            fee_id: fee.id,
            client_id: fee.client_id,
            rule_id: rule.id,
            rule_name: rule.name,
            template: actions.email_template || 'default_reminder',
          });
        }
      }

      return { data: remindersNeeded, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send a manual reminder to a client
   *
   * This method is used when Sigal manually sends a reminder from the dashboard.
   * The actual email sending is handled by an Edge Function.
   *
   * @param reminderData - Reminder details
   * @returns Created reminder ID
   */
  async sendManualReminder(
    reminderData: SendManualReminderDto
  ): Promise<ServiceResponse<string>> {
    try {
      const tenantId = await this.getTenantId();

      // Get fee and client details
      const { data: fee, error: feeError } = await supabase
        .from('fee_calculations')
        .select('client_id')
        .eq('id', reminderData.fee_id)
        .eq('tenant_id', tenantId)
        .single();

      if (feeError) {
        return { data: null, error: this.handleError(feeError) };
      }

      // Create reminder record
      const { data: reminder, error: reminderError } = await supabase
        .from('payment_reminders')
        .insert({
          tenant_id: tenantId,
          client_id: fee.client_id,
          fee_calculation_id: reminderData.fee_id,
          reminder_type: 'no_selection', // Default type for manual reminders
          sent_via: 'email',
          template_used: reminderData.template_id,
          sent_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (reminderError) {
        return { data: null, error: this.handleError(reminderError) };
      }

      // Update fee_calculations reminder tracking
      await supabase
        .from('fee_calculations')
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: supabase.rpc('increment', { x: 1 }) as unknown as number,
        })
        .eq('id', reminderData.fee_id)
        .eq('tenant_id', tenantId);

      // Log action
      await this.logAction('send_manual_reminder', reminderData.fee_id, {
        template: reminderData.template_id,
        client_id: fee.client_id,
      });

      // TODO: Call Edge Function to actually send the email
      // await supabase.functions.invoke('send-reminder-email', {
      //   body: { reminder_id: reminder.id, fee_id: reminderData.fee_id }
      // });

      return { data: reminder.id, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get reminder statistics for reporting
   *
   * @returns Reminder statistics
   */
  async getReminderStatistics(): Promise<
    ServiceResponse<{
      total_reminders: number;
      reminders_this_month: number;
      average_reminders_per_client: number;
      most_common_type: string;
    }>
  > {
    try {
      const tenantId = await this.getTenantId();

      // Get total reminders
      const { count: totalCount } = await supabase
        .from('payment_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      // Get reminders this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const { count: thisMonthCount } = await supabase
        .from('payment_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('sent_at', firstDayOfMonth.toISOString());

      // Get reminder type distribution
      const { data: reminders } = await supabase
        .from('payment_reminders')
        .select('reminder_type')
        .eq('tenant_id', tenantId);

      const typeCounts: Record<string, number> = {};
      (reminders || []).forEach((r) => {
        typeCounts[r.reminder_type] = (typeCounts[r.reminder_type] || 0) + 1;
      });

      const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

      // Get unique client count
      const { data: uniqueClients } = await supabase
        .from('payment_reminders')
        .select('client_id')
        .eq('tenant_id', tenantId);

      const uniqueClientIds = new Set(uniqueClients?.map((r) => r.client_id) || []);
      const averagePerClient =
        uniqueClientIds.size > 0 ? (totalCount || 0) / uniqueClientIds.size : 0;

      return {
        data: {
          total_reminders: totalCount || 0,
          reminders_this_month: thisMonthCount || 0,
          average_reminders_per_client: Math.round(averagePerClient * 100) / 100,
          most_common_type: mostCommonType,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a new reminder rule
   *
   * @param rule - Reminder rule data
   * @returns Created reminder rule
   */
  async createReminderRule(
    rule: Omit<ReminderRule, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResponse<ReminderRule>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('reminder_rules')
        .insert({
          ...rule,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('create_reminder_rule', data.id, { name: rule.name });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a reminder rule
   *
   * @param ruleId - Rule ID
   * @returns Success status
   */
  async deleteReminderRule(ruleId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('reminder_rules')
        .delete()
        .eq('id', ruleId)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: false, error: this.handleError(error) };
      }

      // Log action
      await this.logAction('delete_reminder_rule', ruleId);

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }
}

export const reminderService = new ReminderService();
