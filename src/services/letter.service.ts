import { BaseService } from './base.service';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';

export type LetterTemplateType = 
  | 'annual_fee_notification'
  | 'fee_increase_inflation'
  | 'fee_increase_real'
  | 'payment_reminder_gentle'
  | 'payment_reminder_firm'
  | 'payment_overdue'
  | 'service_suspension_warning'
  | 'payment_confirmation'
  | 'new_client_welcome'
  | 'service_completion'
  | 'custom_consultation';

export interface LetterTemplate {
  id: string;
  tenant_id: string;
  type: LetterTemplateType;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LetterHistory {
  id: string;
  tenant_id: string;
  template_id: string;
  client_id: string;
  fee_calculation_id?: string;
  subject: string;
  body_html: string;
  body_text: string;
  sent_to: string;
  sent_at: string;
  status: 'draft' | 'sent' | 'failed';
  error_message?: string;
  payment_link?: string;
  created_at: string;
}

export interface LetterVariables {
  client_name: string;
  client_name_hebrew?: string;
  company_name: string;
  company_name_hebrew?: string;
  tax_id: string;
  contact_name: string;
  contact_email?: string;
  amount: string;
  amount_text?: string; // Amount in words (Hebrew)
  due_date: string;
  period_start?: string;
  period_end?: string;
  previous_amount?: string;
  adjustment_reason?: string;
  payment_link?: string;
  office_name?: string;
  office_phone?: string;
  office_email?: string;
  office_address?: string;
  current_date: string;
  [key: string]: string | undefined;
}

export interface SendLetterDto {
  template_id: string;
  client_id: string;
  fee_calculation_id?: string;
  variables: LetterVariables;
  send_immediately?: boolean;
}

class LetterService extends BaseService {
  constructor() {
    super('letter_templates');
  }

  async getTemplates(): Promise<ServiceResponse<LetterTemplate[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: templates, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('type');

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: templates || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getTemplateByType(type: LetterTemplateType): Promise<ServiceResponse<LetterTemplate>> {
    try {
      const tenantId = await this.getTenantId();

      const { data: template, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', type)
        .eq('is_active', true)
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: template, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async createTemplate(template: Partial<LetterTemplate>): Promise<ServiceResponse<LetterTemplate>> {
    try {
      const tenantId = await this.getTenantId();

      // Extract variables from template body
      const variables = this.extractVariables(template.body_html || '');

      const { data: newTemplate, error } = await supabase
        .from('letter_templates')
        .insert({
          ...template,
          tenant_id: tenantId,
          variables,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('create_letter_template', newTemplate.id, { type: template.type });

      return { data: newTemplate, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async updateTemplate(
    id: string,
    updates: Partial<LetterTemplate>
  ): Promise<ServiceResponse<LetterTemplate>> {
    try {
      const tenantId = await this.getTenantId();

      // Re-extract variables if body changed
      // Type: Partial includes variables field which may be updated during re-extraction
      let updateData: Partial<LetterTemplate> = { ...updates };
      if (updates.body_html) {
        updateData.variables = this.extractVariables(updates.body_html);
      }

      const { data: template, error } = await supabase
        .from('letter_templates')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('update_letter_template', id, { changes: updates });

      return { data: template, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async sendLetter(data: SendLetterDto): Promise<ServiceResponse<LetterHistory>> {
    try {
      const tenantId = await this.getTenantId();

      // Get template
      const { data: template, error: templateError } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('id', data.template_id)
        .eq('tenant_id', tenantId)
        .single();

      if (templateError || !template) {
        return { data: null, error: new Error('Template not found') };
      }

      // Get client details
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', data.client_id)
        .eq('tenant_id', tenantId)
        .single();

      if (clientError || !client) {
        return { data: null, error: new Error('Client not found') };
      }

      // Process template with variables
      const processedSubject = this.processTemplate(template.subject, data.variables);
      const processedBodyHtml = this.processTemplate(template.body_html, data.variables);
      const processedBodyText = this.processTemplate(template.body_text, data.variables);

      // Create letter history record
      const { data: letterHistory, error: historyError } = await supabase
        .from('letter_history')
        .insert({
          tenant_id: tenantId,
          template_id: data.template_id,
          client_id: data.client_id,
          fee_calculation_id: data.fee_calculation_id,
          subject: processedSubject,
          body_html: processedBodyHtml,
          body_text: processedBodyText,
          sent_to: client.contact_email || '',
          sent_at: data.send_immediately ? new Date().toISOString() : null,
          status: data.send_immediately ? 'sent' : 'draft',
          payment_link: data.variables.payment_link,
        })
        .select()
        .single();

      if (historyError) {
        return { data: null, error: this.handleError(historyError) };
      }

      // If send_immediately is true, send the email
      if (data.send_immediately && client.contact_email) {
        // Here you would integrate with SendGrid or another email service
        // For now, we'll just log the action
        await this.logAction('send_letter', letterHistory.id, {
          template_type: template.type,
          client_id: data.client_id,
          sent_to: client.contact_email,
        });
      }

      return { data: letterHistory, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async getLetterHistory(
    clientId?: string,
    limit = 50
  ): Promise<ServiceResponse<LetterHistory[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('letter_history')
        .select(`
          *,
          template:letter_templates(type, name),
          client:clients(company_name, company_name_hebrew)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: history, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: history || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  async resendLetter(letterId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get letter details
      const { data: letter, error: letterError } = await supabase
        .from('letter_history')
        .select('*, client:clients(contact_email)')
        .eq('id', letterId)
        .eq('tenant_id', tenantId)
        .single();

      if (letterError || !letter) {
        return { data: false, error: new Error('Letter not found') };
      }

      if (!letter.client?.contact_email) {
        return { data: false, error: new Error('Client email not found') };
      }

      // Update letter status
      const { error: updateError } = await supabase
        .from('letter_history')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', letterId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        return { data: false, error: this.handleError(updateError) };
      }

      // Here you would resend via SendGrid
      await this.logAction('resend_letter', letterId, {
        sent_to: letter.client.contact_email,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: false, error: this.handleError(error as Error) };
    }
  }

  private processTemplate(template: string, variables: LetterVariables): string {
    let processed = template;

    // Replace all variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, value || '');
    });

    // Format dates to Israeli format (DD/MM/YYYY)
    processed = processed.replace(/{{date:(.+?)}}/g, (match, dateVar) => {
      const date = variables[dateVar];
      if (date) {
        return this.formatDateIsraeli(date);
      }
      return '';
    });

    // Format amounts to Israeli currency format
    processed = processed.replace(/{{amount:(.+?)}}/g, (match, amountVar) => {
      const amount = variables[amountVar];
      if (amount) {
        return this.formatCurrencyIsraeli(amount);
      }
      return '';
    });

    return processed;
  }

  private extractVariables(template: string): string[] {
    const regex = /{{\\s*([^}]+)\\s*}}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(template)) !== null) {
      // Clean up the variable name
      const varName = match[1].trim().split(':')[0];
      variables.add(varName);
    }

    return Array.from(variables);
  }

  private formatDateIsraeli(date: string): string {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatCurrencyIsraeli(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₪${num.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async bulkSendLetters(
    templateType: LetterTemplateType,
    clientIds: string[],
    baseVariables: Partial<LetterVariables>
  ): Promise<ServiceResponse<{ sent: number; failed: number }>> {
    try {
      const tenantId = await this.getTenantId();

      // Get template
      const { data: template } = await this.getTemplateByType(templateType);
      if (!template) {
        return { data: null, error: new Error('Template not found') };
      }

      // Get clients
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
        .eq('tenant_id', tenantId);

      if (!clients || clients.length === 0) {
        return { data: { sent: 0, failed: 0 }, error: null };
      }

      let sent = 0;
      let failed = 0;

      // Send letter to each client
      for (const client of clients) {
        const variables: LetterVariables = {
          ...baseVariables,
          client_name: client.contact_name,
          company_name: client.company_name,
          company_name_hebrew: client.company_name_hebrew || client.company_name,
          tax_id: client.tax_id,
          contact_name: client.contact_name,
          contact_email: client.contact_email,
          current_date: new Date().toISOString(),
        };

        const result = await this.sendLetter({
          template_id: template.id,
          client_id: client.id,
          variables,
          send_immediately: true,
        });

        if (result.error) {
          failed++;
        } else {
          sent++;
        }
      }

      await this.logAction('bulk_send_letters', undefined, {
        template_type: templateType,
        total_clients: clientIds.length,
        sent,
        failed,
      });

      return { data: { sent, failed }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

export const letterService = new LetterService();