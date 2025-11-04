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
import { parseTextToHTML as parseMarkdownToHTML, replaceVariables as replaceVarsInText } from '../utils/text-to-html-parser';

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
        .order('created_at', { ascending: false});

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * NEW ARCHITECTURE: Load template component from file system
   * Loads header, footer, payment-section, or body from templates/ directory
   */
  private async loadTemplateFile(filePath: string): Promise<string> {
    try {
      const response = await fetch(`/templates/${filePath}`);
      if (!response.ok) {
        throw new Error(`Failed to load template file: ${filePath}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Error loading template file ${filePath}:`, error);
      return '';
    }
  }

  /**
   * NEW ARCHITECTURE: Check if a template type requires payment section
   * All 11 current templates require payment
   */
  private isPaymentLetter(templateType: LetterTemplateType): boolean {
    const paymentLetters: LetterTemplateType[] = [
      'external_index_only',
      'external_real_change',
      'external_as_agreed',
      'internal_audit_index',
      'internal_audit_real',
      'internal_audit_agreed',
      'retainer_index',
      'retainer_real',
      'internal_bookkeeping_index',
      'internal_bookkeeping_real',
      'internal_bookkeeping_agreed'
    ];

    return paymentLetters.includes(templateType);
  }

  /**
   * NEW ARCHITECTURE: Generate check dates description
   * Creates text like "החל מיום 5.1.2026 ועד ליום 5.8.2026"
   */
  private generateCheckDatesDescription(numChecks: 8 | 12, taxYear: number): string {
    const endMonth = numChecks; // 8 checks = month 8, 12 checks = month 12
    return `החל מיום 5.1.${taxYear} ועד ליום 5.${endMonth}.${taxYear}`;
  }

  /**
   * NEW ARCHITECTURE: Build full HTML letter from 4 components
   * Combines header + body + [optional payment] + footer
   */
  private buildFullHTML(
    header: string,
    body: string,
    paymentSection: string,
    footer: string
  ): string {
    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מכתב - {{company_name}}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&family=David+Libre:wght@400;500;700&display=swap" rel="stylesheet">
    <!--[if mso]>
    <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style type="text/css">
        /* Mobile tagline - two lines */
        @media only screen and (max-width: 600px) {
            .tagline-desktop { display: none !important; }
            .tagline-mobile { display: inline !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; direction: rtl; background-color: #ffffff; font-family: 'Assistant', 'Heebo', Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="800" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; width: 100%; background-color: #ffffff;">
                    ${header}
                    ${body}
                    ${paymentSection}
                    ${footer}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
  }

  /**
   * NEW ARCHITECTURE: Generate letter from new 4-component system
   * Uses files from templates/components/ and templates/bodies/
   */
  async generateLetterFromComponents(
    templateType: LetterTemplateType,
    clientId: string,
    variables: Partial<LetterVariables>,
    feeCalculationId?: string
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Load the 4 components
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Load body based on template type (for now only annual-fee exists)
      const bodyFile = this.getBodyFileName(templateType);
      const body = await this.loadTemplateFile(`bodies/${bodyFile}`);

      // 3. Load payment section if needed
      const needsPayment = this.isPaymentLetter(templateType);
      let paymentSection = '';
      if (needsPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Add automatic variables
      const fullVariables: Partial<LetterVariables> = {
        ...variables,
        letter_date: variables.letter_date || this.formatIsraeliDate(new Date()),
        year: variables.year || new Date().getFullYear(),
        tax_year: variables.tax_year || (new Date().getFullYear() + 1),
        num_checks: variables.num_checks || 8,
        check_dates_description: this.generateCheckDatesDescription(
          (variables.num_checks as 8 | 12) || 8,
          variables.tax_year || (new Date().getFullYear() + 1)
        )
      };

      // 5. Build full HTML
      let fullHtml = this.buildFullHTML(header, body, paymentSection, footer);

      // 6. Replace all variables
      fullHtml = TemplateParser.replaceVariables(fullHtml, fullVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. Save generated letter
      const { data: generatedLetter, error: saveError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          template_id: null, // No template_id for file-based system
          fee_calculation_id: feeCalculationId,
          variables_used: fullVariables,
          generated_content_html: fullHtml,
          generated_content_text: plainText,
          payment_link: fullVariables.payment_link,
          created_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (saveError) throw saveError;

      await this.logAction('generate_letter', generatedLetter.id, {
        template_type: templateType,
        client_id: clientId
      });

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get body file name from template type
   */
  private getBodyFileName(templateType: LetterTemplateType): string {
    // Map template types to body files
    const bodyMap: Record<LetterTemplateType, string> = {
      'external_index_only': 'annual-fee.html',
      'external_real_change': 'annual-fee-real-change.html',
      'external_as_agreed': 'annual-fee-as-agreed.html',
      'internal_audit_index': 'internal-audit-index.html',
      'internal_audit_real': 'internal-audit-real-change.html',
      'internal_audit_agreed': 'internal-audit-as-agreed.html',
      'retainer_index': 'retainer-index.html',
      'retainer_real': 'retainer-real-change.html',
      'internal_bookkeeping_index': 'bookkeeping-index.html',
      'internal_bookkeeping_real': 'bookkeeping-real-change.html',
      'internal_bookkeeping_agreed': 'bookkeeping-as-agreed.html'
    };

    return bodyMap[templateType] || 'annual-fee.html';
  }

  /**
   * Format date in Israeli format (DD/MM/YYYY)
   */
  private formatIsraeliDate(date: Date): string {
    return new Intl.DateTimeFormat('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  /**
   * Convert CID image references to web paths for browser preview
   * CID references work in emails but not in browsers
   */
  private replaceCidWithWebPaths(html: string): string {
    const cidMap: Record<string, string> = {
      'cid:tico_logo': '/brand/tico_logo_240.png',
      'cid:tico_logo_new': '/brand/Tico_logo_png_new.png',
      'cid:bullet_star': '/brand/bullet-star.png',
      'cid:bullet_star_blue': '/brand/Bullet_star_blue.png',
      'cid:franco_logo': '/brand/franco-logo-hires.png',
      'cid:franco_logo_new': '/brand/Tico_franco_co.png',
      'cid:tagline': '/brand/tagline.png'
    };

    let result = html;
    // Sort CIDs by length (longest first) to avoid partial replacements
    // e.g., replace "cid:tico_logo_new" before "cid:tico_logo"
    const sortedEntries = Object.entries(cidMap).sort((a, b) => b[0].length - a[0].length);

    for (const [cid, webPath] of sortedEntries) {
      // Escape special regex characters in CID (the colon)
      const escapedCid = cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Replace CID in src attributes (handles both single and double quotes, with optional spaces)
      result = result.replace(
        new RegExp(`src\\s*=\\s*["']${escapedCid}["']`, 'g'),
        `src="${webPath}"`
      );
    }
    return result;
  }

  /**
   * NEW: Preview letter from file-based system (no DB)
   * Used by LetterBuilder component for live preview
   */
  async previewLetterFromFiles(
    templateType: LetterTemplateType,
    variables: Partial<LetterVariables>
  ): Promise<ServiceResponse<{ html: string }>> {
    try {
      // 1. Load the 4 components
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Load body based on template type
      const bodyFile = this.getBodyFileName(templateType);
      const body = await this.loadTemplateFile(`bodies/${bodyFile}`);

      // 3. Load payment section if needed
      const needsPayment = this.isPaymentLetter(templateType);
      let paymentSection = '';
      if (needsPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const previousYear = currentYear;

      const fullVariables: Partial<LetterVariables> = {
        ...variables,
        letter_date: variables.letter_date || this.formatIsraeliDate(new Date()),
        year: variables.year || nextYear,
        previous_year: variables.previous_year || previousYear,
        tax_year: variables.tax_year || nextYear,
        num_checks: variables.num_checks || 8,
        check_dates_description: this.generateCheckDatesDescription(
          (variables.num_checks as 8 | 12) || 8,
          variables.tax_year || nextYear
        )
      };

      // 5. Build full HTML
      let fullHtml = this.buildFullHTML(header, body, paymentSection, footer);

      // 6. Replace all variables
      fullHtml = TemplateParser.replaceVariables(fullHtml, fullVariables);

      // 7. Convert CID images to web paths for browser preview
      fullHtml = this.replaceCidWithWebPaths(fullHtml);

      return { data: { html: fullHtml }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  // ============================================================================
  // UNIVERSAL LETTER BUILDER - Custom Letter Bodies (Non-fee letters)
  // ============================================================================

  /**
   * Parse plain text with Markdown syntax to HTML
   * Wrapper for text-to-html-parser utility
   */
  parseTextToHTML(plainText: string): string {
    return parseMarkdownToHTML(plainText);
  }

  /**
   * Save custom letter body template
   * Used when user wants to save their custom letter as a reusable template
   */
  async saveCustomBody(params: {
    name: string;
    description?: string;
    plainText: string;
    includesPayment: boolean;
  }): Promise<ServiceResponse<{ id: string; name: string; parsed_html: string }>> {
    try {
      const tenantId = await this.getTenantId();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Parse plain text to HTML
      const parsedHtml = this.parseTextToHTML(params.plainText);

      // Save to database
      const { data, error } = await supabase
        .from('custom_letter_bodies')
        .insert({
          tenant_id: tenantId,
          name: params.name,
          description: params.description || null,
          plain_text: params.plainText,
          parsed_html: parsedHtml,
          includes_payment: params.includesPayment,
          created_by: userId
        })
        .select('id, name, parsed_html')
        .single();

      if (error) throw error;

      await this.logAction('create_custom_letter_body', data.id, {
        name: params.name,
        includes_payment: params.includesPayment
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get all custom letter bodies for tenant
   * Returns list of saved custom templates
   */
  async getCustomBodies(): Promise<ServiceResponse<Array<{
    id: string;
    name: string;
    description: string | null;
    plain_text: string;
    parsed_html: string;
    includes_payment: boolean;
    created_at: string;
    updated_at: string;
  }>>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('custom_letter_bodies')
        .select('id, name, description, plain_text, parsed_html, includes_payment, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get custom letter body by ID
   */
  async getCustomBodyById(bodyId: string): Promise<ServiceResponse<{
    id: string;
    name: string;
    description: string | null;
    plain_text: string;
    parsed_html: string;
    includes_payment: boolean;
  }>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('custom_letter_bodies')
        .select('id, name, description, plain_text, parsed_html, includes_payment')
        .eq('id', bodyId)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Delete custom letter body
   */
  async deleteCustomBody(bodyId: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('custom_letter_bodies')
        .delete()
        .eq('id', bodyId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('delete_custom_letter_body', bodyId);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Generate full letter from custom plain text
   * Combines Header + Custom Body + [Optional Payment] + Footer
   */
  async generateFromCustomText(params: {
    plainText: string;
    clientId: string;
    variables: Record<string, string | number>;
    includesPayment: boolean;
    saveAsTemplate?: {
      name: string;
      description?: string;
    };
  }): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Load header and footer components
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Parse custom text to HTML
      const bodyHtml = this.parseTextToHTML(params.plainText);

      // 3. Load payment section if needed
      let paymentSection = '';
      if (params.includesPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const fullVariables: Record<string, string | number> = {
        ...params.variables,
        letter_date: params.variables.letter_date || this.formatIsraeliDate(new Date()),
        year: params.variables.year || nextYear,
        tax_year: params.variables.tax_year || nextYear
      };

      // 5. Build full HTML
      let fullHtml = this.buildFullHTML(header, bodyHtml, paymentSection, footer);

      // 6. Replace variables in full HTML
      fullHtml = replaceVarsInText(fullHtml, fullVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. Save as custom template if requested
      if (params.saveAsTemplate) {
        await this.saveCustomBody({
          name: params.saveAsTemplate.name,
          description: params.saveAsTemplate.description,
          plainText: params.plainText,
          includesPayment: params.includesPayment
        });
      }

      // 8. Save generated letter
      const { data: generatedLetter, error: saveError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: params.clientId,
          template_id: null, // No template_id for custom letters
          fee_calculation_id: null,
          variables_used: fullVariables,
          generated_content_html: fullHtml,
          generated_content_text: plainText,
          payment_link: fullVariables.payment_link as string | undefined,
          created_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (saveError) throw saveError;

      await this.logAction('generate_custom_letter', generatedLetter.id, {
        client_id: params.clientId,
        includes_payment: params.includesPayment,
        saved_as_template: !!params.saveAsTemplate
      });

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Preview custom letter from plain text (without saving)
   * Used for live preview in UniversalLetterBuilder
   */
  async previewCustomLetter(params: {
    plainText: string;
    variables: Record<string, string | number>;
    includesPayment: boolean;
  }): Promise<ServiceResponse<{ html: string }>> {
    try {
      // 1. Load header and footer
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Parse custom text to HTML
      const bodyHtml = this.parseTextToHTML(params.plainText);

      // 3. Load payment section if needed
      let paymentSection = '';
      if (params.includesPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const fullVariables: Record<string, string | number> = {
        ...params.variables,
        letter_date: params.variables.letter_date || this.formatIsraeliDate(new Date()),
        year: params.variables.year || nextYear,
        tax_year: params.variables.tax_year || nextYear
      };

      // 5. Build full HTML
      let fullHtml = this.buildFullHTML(header, bodyHtml, paymentSection, footer);

      // 6. Replace variables
      fullHtml = replaceVarsInText(fullHtml, fullVariables);

      // 7. Convert CID images to web paths for browser preview
      fullHtml = this.replaceCidWithWebPaths(fullHtml);

      return { data: { html: fullHtml }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }
}