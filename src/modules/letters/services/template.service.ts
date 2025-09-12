/**
 * Letter Template Service
 * Manages letter templates and generation
 */

import { BaseService, type ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type { 
  LetterTemplate, 
  LetterTemplateType,
  LetterVariables,
  GeneratedLetter,
  LetterComponent,
  LetterPreviewRequest
} from '../types/letter.types';
import { TemplateParser } from '../utils/template-parser';

export class TemplateService extends BaseService {
  constructor() {
    super('letter_templates');
  }

  /**
   * Get all letter templates
   */
  async getTemplates(): Promise<ServiceResponse<LetterTemplate[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('template_type', { ascending: true });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get template by type
   */
  async getTemplateByType(
    templateType: LetterTemplateType
  ): Promise<ServiceResponse<LetterTemplate>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<ServiceResponse<LetterTemplate>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('letter_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Create or update a letter template
   */
  async saveTemplate(
    template: Partial<LetterTemplate>
  ): Promise<ServiceResponse<LetterTemplate>> {
    try {
      const tenantId = await this.getTenantId();

      // Extract variables from content
      const extractedVars = TemplateParser.extractVariables(template.content_html || '');
      
      // Build variables schema
      const variablesSchema = {
        required: this.getRequiredVariables(template.template_type),
        optional: extractedVars.filter(v => 
          !this.getRequiredVariables(template.template_type).includes(v)
        )
      };

      const templateData = {
        ...template,
        tenant_id: tenantId,
        variables_schema: variablesSchema,
        updated_at: new Date().toISOString()
      };

      if (template.id) {
        // Update existing template
        const { data, error } = await supabase
          .from('letter_templates')
          .update(templateData)
          .eq('id', template.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;

        await this.logAction('update_template', template.id, { 
          template_type: template.template_type 
        });

        return { data, error: null };
      } else {
        // Create new template
        const { data, error } = await supabase
          .from('letter_templates')
          .insert({
            ...templateData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        await this.logAction('create_template', data.id, { 
          template_type: template.template_type 
        });

        return { data, error: null };
      }
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Generate letter from template
   */
  async generateLetter(
    templateId: string,
    clientId: string,
    variables: Partial<LetterVariables>,
    feeCalculationId?: string
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // Get template
      const { data: template, error: templateError } = await this.getTemplateById(templateId);
      if (templateError) throw templateError;
      if (!template) throw new Error('Template not found');

      // Validate required variables
      const validation = TemplateParser.validateVariables(
        template.content_html,
        variables,
        template.variables_schema.required
      );

      if (!validation.valid) {
        throw new Error(`Missing required variables: ${validation.missing.join(', ')}`);
      }

      // Get header and footer if specified
      let header = '';
      let footer = '';

      if (template.header_template_id) {
        const { data: headerComponent } = await this.getComponentById(template.header_template_id);
        if (headerComponent) {
          header = TemplateParser.replaceVariables(headerComponent.content_html, variables);
        }
      }

      if (template.footer_template_id) {
        const { data: footerComponent } = await this.getComponentById(template.footer_template_id);
        if (footerComponent) {
          footer = TemplateParser.replaceVariables(footerComponent.content_html, variables);
        }
      }

      // Replace variables in template
      const bodyContent = TemplateParser.replaceVariables(template.content_html, variables);
      
      // Merge components
      const fullHtml = TemplateParser.mergeLetterComponents(bodyContent, header, footer);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // Save generated letter
      const { data: generatedLetter, error: saveError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          template_id: templateId,
          fee_calculation_id: feeCalculationId,
          variables_used: variables,
          generated_content_html: fullHtml,
          generated_content_text: plainText,
          payment_link: variables.payment_link,
          created_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (saveError) throw saveError;

      await this.logAction('generate_letter', generatedLetter.id, {
        template_id: templateId,
        client_id: clientId
      });

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Preview letter without saving
   */
  async previewLetter(
    request: LetterPreviewRequest
  ): Promise<ServiceResponse<{ html: string; text: string }>> {
    try {
      // Get template
      const { data: template, error: templateError } = await this.getTemplateById(
        request.template_id
      );
      if (templateError) throw templateError;
      if (!template) throw new Error('Template not found');

      // Get header and footer if requested
      let header = '';
      let footer = '';

      if (request.include_header && template.header_template_id) {
        const { data: headerComponent } = await this.getComponentById(template.header_template_id);
        if (headerComponent) {
          header = TemplateParser.replaceVariables(headerComponent.content_html, request.variables);
        }
      }

      if (request.include_footer && template.footer_template_id) {
        const { data: footerComponent } = await this.getComponentById(template.footer_template_id);
        if (footerComponent) {
          footer = TemplateParser.replaceVariables(footerComponent.content_html, request.variables);
        }
      }

      // Replace variables
      const bodyContent = TemplateParser.replaceVariables(template.content_html, request.variables);
      
      // Merge components
      const html = TemplateParser.mergeLetterComponents(bodyContent, header, footer);
      const text = TemplateParser.htmlToText(html);

      return { data: { html, text }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get header/footer component by ID
   */
  private async getComponentById(componentId: string): Promise<ServiceResponse<LetterComponent>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('letter_components')
        .select('*')
        .eq('id', componentId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get tenant's header/footer component
   */
  async getComponent(tenantId: string): Promise<ServiceResponse<LetterComponent>> {
    try {
      const { data, error } = await supabase
        .from('letter_components')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('component_type', 'both')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Save header/footer component
   */
  async saveComponent(
    component: Partial<LetterComponent>
  ): Promise<ServiceResponse<LetterComponent>> {
    try {
      const tenantId = await this.getTenantId();

      const componentData = {
        ...component,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      };

      if (component.id) {
        // Update existing
        const { data, error } = await supabase
          .from('letter_components')
          .update(componentData)
          .eq('id', component.id)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      } else {
        // Create new
        const { data, error } = await supabase
          .from('letter_components')
          .insert({
            ...componentData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        return { data, error: null };
      }
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get required variables for template type
   */
  private getRequiredVariables(templateType?: LetterTemplateType): string[] {
    // Common required variables for all templates
    const common = ['client_name', 'company_name', 'date', 'year', 'amount'];

    // Additional required variables by type
    const typeSpecific: Record<string, string[]> = {
      'external_index_only': ['inflation_rate'],
      'external_real_change': ['inflation_rate', 'real_adjustment_reason'],
      'internal_audit_index': ['inflation_rate'],
      'internal_audit_real': ['inflation_rate', 'real_adjustment_reason'],
      'retainer_index': ['inflation_rate', 'monthly_amount'],
      'retainer_real': ['inflation_rate', 'real_adjustment_reason', 'monthly_amount'],
      'internal_bookkeeping_index': ['inflation_rate'],
      'internal_bookkeeping_real': ['inflation_rate', 'real_adjustment_reason']
    };

    if (templateType && typeSpecific[templateType]) {
      return [...common, ...typeSpecific[templateType]];
    }

    return common;
  }

  /**
   * Get generated letters for a client
   */
  async getClientLetters(clientId: string): Promise<ServiceResponse<GeneratedLetter[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('generated_letters')
        .select(`
          *,
          letter_templates (
            name,
            template_type,
            subject
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }
}