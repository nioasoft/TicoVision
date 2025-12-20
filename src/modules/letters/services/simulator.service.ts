/**
 * Simulator Service
 * Handles component-based letter building and saved combinations management
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import { clientService } from '@/services/client.service';
import { TemplateService } from './template.service';
import type { SavedCombination, ComponentSelection } from '../types/simulator.types';
import type { LetterVariables } from '../types/letter.types';
import {
  loadComponent,
  buildFullHTML,
  replaceVariables,
  calculateDiscounts,
  formatIsraeliDate,
  generateCheckDatesDescription,
  mapBodyToTemplateType,
} from '../utils/component-loader';

export class SimulatorService extends BaseService {
  constructor() {
    super('letter_component_combinations');
  }

  /**
   * Get all saved combinations for current tenant
   */
  async getSavedCombinations(): Promise<ServiceResponse<SavedCombination[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('letter_component_combinations')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;

      return { data: data as SavedCombination[], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Save a new combination
   */
  async saveCombination(
    name: string,
    selection: ComponentSelection
  ): Promise<ServiceResponse<SavedCombination>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('letter_component_combinations')
        .insert({
          tenant_id: tenantId,
          name,
          body_template: selection.body,
          payment_template: selection.payment,
          default_amount: selection.amount,
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('create_letter_combination', data.id, {
        name,
        body: selection.body,
        payment: selection.payment,
      });

      return { data: data as SavedCombination, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a saved combination
   */
  async deleteCombination(id: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('letter_component_combinations')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('delete_letter_combination', id);

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Build letter from 4 components (header, body, payment, footer)
   */
  async buildLetterFromComponents(
    clientId: string,
    bodyTemplate: string,
    paymentTemplate: string,
    amount: number
  ): Promise<ServiceResponse<{ html: string; variables: LetterVariables }>> {
    try {
      // Load 4 components
      const [header, body, payment, footer] = await Promise.all([
        loadComponent('components/header.html'),
        loadComponent(`bodies/${bodyTemplate}`),
        loadComponent(`components/${paymentTemplate}`),
        loadComponent('components/footer.html'),
      ]);

      // Get client details
      const { data: client } = await clientService.getById(clientId);

      if (!client) {
        throw new Error('לקוח לא נמצא');
      }

      // Get group name if exists
      let groupName = '';
      if (client.group_id) {
        const { data: group } = await clientService.getGroupById(client.group_id);
        groupName = group?.group_name_hebrew || '';
      }

      // Calculate variables
      const currentDate = new Date();
      const nextYear = currentDate.getFullYear() + 1;

      const variables: LetterVariables = {
        letter_date: formatIsraeliDate(currentDate),
        year: nextYear,
        tax_year: nextYear,
        company_name: client.company_name,
        group_name: groupName,
        amount_original: amount,
        ...calculateDiscounts(amount),
        num_checks: 8,
        check_amount: Math.round(Math.round(amount * 1.18) / 8),
        check_dates_description: generateCheckDatesDescription(8, nextYear),
        client_id: clientId,
        // Optional fields
        inflation_rate: '4',
        previous_year: currentDate.getFullYear(),
      };

      // Build full HTML
      const fullHtml = buildFullHTML(header, body, payment, footer);

      // Replace variables
      const finalHtml = replaceVariables(fullHtml, variables);

      // Convert CID images to web paths for browser preview
      const templateService = new TemplateService();
      const previewHtml = templateService.replaceCidWithWebPaths(finalHtml);

      return { data: { html: previewHtml, variables }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Save generated letter to database
   */
  async saveGeneratedLetter(
    clientId: string,
    bodyTemplate: string,
    html: string,
    variables: LetterVariables
  ): Promise<ServiceResponse<string>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          template_type: mapBodyToTemplateType(bodyTemplate),
          generated_content_html: html,
          variables: variables,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      await this.logAction('save_letter_from_simulator', data.id, {
        clientId,
        bodyTemplate,
      });

      return { data: data.id, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send letter via email (invokes Edge Function)
   */
  async sendLetter(letterId: string): Promise<ServiceResponse<void>> {
    try {
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: { letter_id: letterId },
      });

      if (error) throw error;

      await this.logAction('send_letter_from_simulator', letterId);

      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export default new SimulatorService();
