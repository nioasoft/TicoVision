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
import type {
  ForeignWorkerTemplateType,
  ForeignWorkerVariables,
  AccountantTurnoverVariables,
  IsraeliWorkersVariables,
  TurnoverApprovalVariables,
  SalaryReportVariables,
  MonthlyTurnover,
  MonthlyWorkers,
  WorkerData
} from '@/types/foreign-workers.types';
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
          created_by: (await supabase.auth.getUser()).data.user?.id,
          created_by_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || (await supabase.auth.getUser()).data.user?.email
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
      throw error; // Re-throw the error to be caught by the calling function
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
   * Combines header + body + [optional payment] + footer + subject lines
   */
  private buildFullHTML(
    header: string,
    body: string,
    paymentSection: string,
    footer: string,
    customHeaderLinesHtml?: string,
    subjectLinesHtml?: string
  ): string {
    // Debug logging
    console.log('🔍 [Build] אורך HTML שורות מותאמות:', customHeaderLinesHtml?.length || 0);
    console.log('🔍 [Build] אורך HTML שורות הנדון:', subjectLinesHtml?.length || 0);
    console.log('🔍 [Build] יש placeholder בheader?', header.includes('{{custom_header_lines}}'));

    // Replace {{custom_header_lines}} placeholder in header
    const headerWithCustomLines = header.replace('{{custom_header_lines}}', customHeaderLinesHtml || '');

    console.log('🔍 [Build] האם placeholder הוחלף?', !headerWithCustomLines.includes('{{custom_header_lines}}'));

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

        /* Specific styles for User Generated Tables (inside letter body) */
        .letter-body-content table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-bottom: 1em !important;
        }
        .letter-body-content table td, 
        .letter-body-content table th {
            border: 1px solid black !important;
            padding: 5px !important;
            vertical-align: top !important;
        }
        /* Header cells in user tables */
        .letter-body-content table th {
            background-color: #f3f4f6 !important; /* Light gray for headers */
            font-weight: bold !important;
        }
    </style>
</head>
<body style="margin: 0; padding: 0; direction: rtl; background-color: #ffffff; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="800" cellpadding="0" cellspacing="0" border="0" style="max-width: 800px; width: 100%; background-color: #ffffff;">
                    <!-- HEADER START -->
                    ${headerWithCustomLines}
                    <!-- HEADER END -->
                    
                    <!-- SUBJECT LINES START -->
                    ${subjectLinesHtml || ''}
                    <!-- SUBJECT LINES END -->

                    <!-- BODY START -->
                    <tr>
                        <td class="letter-body-content" style="padding: 10px 0; font-size: 16px; line-height: 1.5;">
                            ${body}
                        </td>
                    </tr>
                    <!-- BODY END -->

                    <!-- PAYMENT START -->
                    ${paymentSection}
                    <!-- PAYMENT END -->

                    <!-- FOOTER START -->
                    ${footer}
                    <!-- FOOTER END -->
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

      // 3. Load payment section if needed (select correct version based on template type)
      const needsPayment = this.isPaymentLetter(templateType);
      let paymentSection = '';
      if (needsPayment) {
        // Check if bank transfer only mode is enabled
        if (variables.bank_transfer_only) {
          paymentSection = await this.loadTemplateFile('components/payment-section-bank-only.html');

          // Hide all discount-related lines when discount is 0%
          if (variables.bank_discount === '0' || Number(variables.bank_discount) === 0) {
            // Remove "Amount before discount" line
            paymentSection = paymentSection.replace(
              /<!-- Amount before discount -->[\s\S]*?<\/div>\s*\n/,
              ''
            );
            // Remove "Discount info" line
            paymentSection = paymentSection.replace(
              /<!-- Discount info -->[\s\S]*?<\/div>\s*\n/,
              ''
            );
            // Remove "Amount after discount" line
            paymentSection = paymentSection.replace(
              /<!-- Amount after discount \(no VAT\) -->[\s\S]*?<\/div>\s*\n/,
              ''
            );
            // Change "סכום לתשלום כולל מע"מ כולל הנחה" to "סכום לתשלום כולל מע"מ"
            paymentSection = paymentSection.replace(
              'סכום לתשלום כולל מע"מ כולל הנחה',
              'סכום לתשלום כולל מע"מ'
            );
          }
        } else {
          let paymentSectionFile = 'components/payment-section.html'; // fallback
          if (templateType.includes('external_') || templateType.includes('internal_audit_')) {
            paymentSectionFile = 'components/payment-section-audit.html';
          } else if (templateType.includes('bookkeeping')) {
            paymentSectionFile = 'components/payment-section-bookkeeping.html';
          } else if (templateType.includes('retainer')) {
            paymentSectionFile = 'components/payment-section-retainer.html';
          }
          paymentSection = await this.loadTemplateFile(paymentSectionFile);
        }
      }

      // 4. Check if client requested adjustment exists (for red header) and get custom payment text
      let hasClientAdjustment = false;
      let customPaymentTextHtml = '';
      console.log('🔍 [Red Header] Checking for client adjustment...', { feeCalculationId });
      if (feeCalculationId) {
        const { data: feeCalculation, error } = await supabase
          .from('fee_calculations')
          .select('client_requested_adjustment, custom_payment_text')
          .eq('id', feeCalculationId)
          .eq('tenant_id', tenantId)
          .single();

        console.log('🔍 [Red Header] Query result:', { feeCalculation, error });
        hasClientAdjustment = feeCalculation && (feeCalculation.client_requested_adjustment || 0) < 0;
        console.log('🔍 [Red Header] hasClientAdjustment:', hasClientAdjustment);

        // Wrap custom payment text in HTML if provided
        if (feeCalculation?.custom_payment_text) {
          customPaymentTextHtml = this.wrapCustomPaymentText(feeCalculation.custom_payment_text);
          console.log('🔍 [Custom Text] Custom payment text found, wrapped length:', customPaymentTextHtml.length);
        }
      }

      // 5. Detect service type automatically
      let serviceDescription = '';
      if (templateType.includes('external_') || templateType.includes('internal_audit_')) {
        serviceDescription = 'שירותי ראיית החשבון';
      } else if (templateType.includes('bookkeeping')) {
        serviceDescription = 'שירותי הנהלת החשבונות';
      } else if (templateType.includes('retainer')) {
        serviceDescription = 'שירותי ראיית החשבון, הנהלת החשבונות וחשבות השכר';
      }

      // 6. Calculate monthly amount (for bookkeeping & retainer only)
      let monthlyAmount: number | undefined;
      if (templateType.includes('bookkeeping') || templateType.includes('retainer')) {
        monthlyAmount = variables.monthly_amount ||
                        (variables.amount_original ? Math.round(variables.amount_original / 12) : undefined);
      }

      // 7. Add automatic variables
      const fullVariables: Partial<LetterVariables> = {
        ...variables,
        service_description: variables.service_description || serviceDescription,
        monthly_amount: monthlyAmount,
        letter_date: variables.letter_date || this.formatIsraeliDate(new Date()),
        year: variables.year || new Date().getFullYear(),
        tax_year: variables.tax_year || (new Date().getFullYear() + 1),
        num_checks: variables.num_checks || 8,
        check_dates_description: this.generateCheckDatesDescription(
          (variables.num_checks as 8 | 12) || 8,
          variables.tax_year || (new Date().getFullYear() + 1)
        ),
        // Add fee_id and client_id for payment tracking links
        fee_id: feeCalculationId || variables.fee_id,
        client_id: clientId || variables.client_id,
        // Custom payment text (HTML) - appears above payment section
        custom_payment_text: customPaymentTextHtml
      };

      // 7. Build full HTML with custom header if client requested adjustment exists
      const customHeaderHtml = hasClientAdjustment ? this.buildCorrectionHeader() : '';
      console.log('🔍 [Red Header] customHeaderHtml length:', customHeaderHtml.length);
      console.log('🔍 [Red Header] customHeaderHtml preview:', customHeaderHtml.substring(0, 100));
      let fullHtml = this.buildFullHTML(header, body, paymentSection, footer, customHeaderHtml);

      // 8. Replace all variables
      // Allow HTML in custom_payment_text (already sanitized/wrapped by wrapCustomPaymentText)
      fullHtml = TemplateParser.replaceVariables(fullHtml, fullVariables, ['custom_payment_text']);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 8. Save generated letter
      const { data: generatedLetter, error: saveError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          template_id: null, // No template_id for file-based system
          template_type: templateType, // Save template type for filtering/editing
          fee_calculation_id: feeCalculationId,
          status: 'draft', // Default status for new letters
          variables_used: fullVariables,
          generated_content_html: fullHtml,
          generated_content_text: plainText,
          body_content_html: body, // Save body separately for editing (without Header/Footer)
          payment_link: fullVariables.payment_link,
          created_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
          created_by_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || (await supabase.auth.getUser()).data.user?.email
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
   * Format date in Israeli format (DD.MM.YYYY)
   */
  private formatIsraeliDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Wrap custom payment text (from TipTap editor) in HTML for email template
   * The text appears above the "אשר על כן..." line in the payment section
   */
  private wrapCustomPaymentText(html: string): string {
    if (!html || html.trim() === '' || html === '<p></p>') {
      return '';
    }

    return `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
            <tr>
                <td style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 19px; line-height: 1.6; text-align: right; color: #09090b;">
                    ${html}
                </td>
            </tr>
        </table>
    `;
  }

  /**
   * Convert CID image references to web paths for browser preview
   * CID references work in emails but not in browsers
   */
  public replaceCidWithWebPaths(html: string): string {
    const cidMap: Record<string, string> = {
      'cid:tico_logo': '/brand/tico_logo_240.png',
      'cid:tico_logo_new': '/brand/Tico_logo_png_new.png',
      'cid:bullet_star': '/brand/bullet-star.png',
      'cid:bullet_star_blue': '/brand/Bullet_star_blue.png',
      'cid:franco_logo': '/brand/franco-logo-hires.png',
      'cid:franco_logo_new': '/brand/Tico_franco_co.png',
      'cid:tagline': '/brand/tagline.png',
      'cid:tico_signature': '/brand/tico_signature.png'
    };

    let result = html;
    // Sort CIDs by length (longest first) to avoid partial replacements
    // e.g., replace "cid:tico_logo_new" before "cid:tico_logo"
    const sortedEntries = Object.entries(cidMap).sort((a, b) => b[0].length - a[0].length);

    for (const [cid, webPath] of sortedEntries) {
      // Escape special regex characters in CID (the colon)
      const escapedCid = cid.replace(/[.*+?^${}()|[\\]/g, '\\$&');
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
    variables: Partial<LetterVariables>,
    feeCalculationId?: string
  ): Promise<ServiceResponse<{ html: string }>> {
    try {
      // 1. Load the 4 components
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Load body based on template type
      const bodyFile = this.getBodyFileName(templateType);
      const body = await this.loadTemplateFile(`bodies/${bodyFile}`);

      // 3. Load payment section if needed (select correct version based on template type)
      const needsPayment = this.isPaymentLetter(templateType);
      let paymentSection = '';
      if (needsPayment) {
        // Check if bank transfer only mode is enabled
        if (variables.bank_transfer_only) {
          paymentSection = await this.loadTemplateFile('components/payment-section-bank-only.html');

          // Hide all discount-related lines when discount is 0%
          if (variables.bank_discount === '0' || Number(variables.bank_discount) === 0) {
            // Remove "Amount before discount" line
            paymentSection = paymentSection.replace(
              /<!-- Amount before discount -->[\s\S]*?<\/div>\s*\n/,
              ''
            );
            // Remove "Discount info" line
            paymentSection = paymentSection.replace(
              /<!-- Discount info -->[\s\S]*?<\/div>\s*\n/,
              ''
            );
            // Remove "Amount after discount" line
            paymentSection = paymentSection.replace(
              /<!-- Amount after discount \(no VAT\) -->[\s\S]*?<\/div>\s*\n/,
              ''
            );
            // Change "סכום לתשלום כולל מע"מ כולל הנחה" to "סכום לתשלום כולל מע"מ"
            paymentSection = paymentSection.replace(
              'סכום לתשלום כולל מע"מ כולל הנחה',
              'סכום לתשלום כולל מע"מ'
            );
          }
        } else {
          let paymentSectionFile = 'components/payment-section.html'; // fallback
          if (templateType.includes('external_') || templateType.includes('internal_audit_')) {
            paymentSectionFile = 'components/payment-section-audit.html';
          } else if (templateType.includes('bookkeeping')) {
            paymentSectionFile = 'components/payment-section-bookkeeping.html';
          } else if (templateType.includes('retainer')) {
            paymentSectionFile = 'components/payment-section-retainer.html';
          }
          paymentSection = await this.loadTemplateFile(paymentSectionFile);
        }
      }

      // 4. Detect service type automatically
      let serviceDescription = '';
      if (templateType.includes('external_') || templateType.includes('internal_audit_')) {
        serviceDescription = 'שירותי ראיית החשבון';
      } else if (templateType.includes('bookkeeping')) {
        serviceDescription = 'שירותי הנהלת החשבונות';
      } else if (templateType.includes('retainer')) {
        serviceDescription = 'שירותי ראיית החשבון, הנהלת החשבונות וחשבות השכר';
      }

      // 5. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      const previousYear = currentYear;

      const fullVariables: Partial<LetterVariables> = {
        ...variables,
        service_description: variables.service_description || serviceDescription,
        letter_date: variables.letter_date || this.formatIsraeliDate(new Date()),
        year: variables.year || nextYear,
        previous_year: variables.previous_year || previousYear,
        tax_year: variables.tax_year || nextYear,
        num_checks: variables.num_checks || 8,
        check_dates_description: this.generateCheckDatesDescription(
          (variables.num_checks as 8 | 12) || 8,
          variables.tax_year || nextYear
        ),
        // Preserve fee_id and client_id if provided in variables (for preview with payment links)
        fee_id: variables.fee_id,
        client_id: variables.client_id
      };

      // 6.5. Check if client requested adjustment exists (for red header) and get custom payment text
      let hasClientAdjustment = false;
      let customPaymentTextHtml = '';
      if (feeCalculationId) {
        try {
          const tenantId = await this.getTenantId();
          // Try fetching from individual fee calculations first
          const { data: feeCalculation, error } = await supabase
            .from('fee_calculations')
            .select('client_requested_adjustment, custom_payment_text')
            .eq('id', feeCalculationId)
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (!error && feeCalculation) {
            hasClientAdjustment = (feeCalculation.client_requested_adjustment || 0) < 0;
            // Wrap custom payment text if exists
            if (feeCalculation.custom_payment_text) {
              customPaymentTextHtml = this.wrapCustomPaymentText(feeCalculation.custom_payment_text);
            }
          } else {
            // If not found or error (e.g. 406 because ID is UUID but table expects something else, or ID not found),
            // Try fetching from GROUP fee calculations
            const { data: groupCalculation, error: groupError } = await supabase
              .from('group_fee_calculations')
              .select('client_requested_adjustment, custom_payment_text')
              .eq('id', feeCalculationId)
              .eq('tenant_id', tenantId)
              .maybeSingle();

            if (!groupError && groupCalculation) {
               hasClientAdjustment = (groupCalculation.client_requested_adjustment || 0) < 0;
               // Wrap custom payment text if exists
               if (groupCalculation.custom_payment_text) {
                 customPaymentTextHtml = this.wrapCustomPaymentText(groupCalculation.custom_payment_text);
               }
            }
          }
          console.log('🔍 [Preview] Fee/Group ID:', feeCalculationId, 'Has adjustment:', hasClientAdjustment, 'Custom text:', !!customPaymentTextHtml);
        } catch (err) {
          console.warn('⚠️ [Preview] Failed to check for client adjustment (ignoring):', err);
        }
      }

      // Add custom payment text to variables
      // Use custom_payment_text from variables if provided, otherwise from DB, otherwise empty string
      if (variables.custom_payment_text) {
        fullVariables.custom_payment_text = this.wrapCustomPaymentText(variables.custom_payment_text as string);
      } else if (customPaymentTextHtml) {
        fullVariables.custom_payment_text = customPaymentTextHtml;
      } else {
        fullVariables.custom_payment_text = ''; // Empty string to remove placeholder
      }

      // 7. Build full HTML with custom header if client requested adjustment exists
      const customHeaderHtml = hasClientAdjustment ? this.buildCorrectionHeader() : '';
      let fullHtml = this.buildFullHTML(header, body, paymentSection, footer, customHeaderHtml);

      // 8. Replace all variables
      // Allow HTML in custom_payment_text (already sanitized/wrapped by wrapCustomPaymentText)
      fullHtml = TemplateParser.replaceVariables(fullHtml, fullVariables, ['custom_payment_text']);

      // 9. Keep CID references in HTML (for email + PDF generation)
      // convertHtmlForDisplay will convert CID → Supabase URLs for browser display
      // generate-pdf Edge Function will convert CID → Supabase URLs for PDF

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
   *
   * @param text - The content to process
   * @param isHtml - If true, assumes text is already HTML from Tiptap (bypasses parsing)
   * @returns HTML string
   */
  parseTextToHTML(text: string, isHtml: boolean = false): string {
    let html: string;

    // If already HTML from Tiptap, sanitize and normalize it
    if (isHtml) {
      html = text;

      // Remove Tiptap editor-specific classes (prose, prose-sm, etc.)
      html = html.replace(/class="[^"]*prose[^"]*"/g, '');
      html = html.replace(/class="[^"]*max-w-none[^"]*"/g, '');
      html = html.replace(/class=""/g, ''); // Remove empty class attributes

      // Wrap in table row/cell with David Libre font (CRITICAL: Must be <tr><td> to fit in table structure)
      html = `<tr><td style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.6; text-align: right; direction: rtl; padding: 20px 0;">${html}</td></tr>`;
    } else {
      // Otherwise parse Markdown to HTML (legacy support)
      html = parseMarkdownToHTML(text);

      // Also wrap Markdown output in table row/cell with David Libre font
      html = `<tr><td style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.6; text-align: right; direction: rtl; padding: 20px 0;">${html}</td></tr>`;
    }

    return html;
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
    subject?: string; // Email subject line
    isHtml?: boolean; // If true, plainText is already HTML from Tiptap
  }): Promise<ServiceResponse<{ id: string; name: string; parsed_html: string }>> {
    try {
      const tenantId = await this.getTenantId();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Parse plain text to HTML (or use as-is if already HTML)
      const parsedHtml = this.parseTextToHTML(params.plainText, params.isHtml);

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
          subject: params.subject || null,
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
    subject: string | null;
    created_at: string;
    updated_at: string;
  }>>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('custom_letter_bodies')
        .select('id, name, description, plain_text, parsed_html, includes_payment, subject, created_at, updated_at')
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
    subject: string | null;
  }>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('custom_letter_bodies')
        .select('id, name, description, plain_text, parsed_html, includes_payment, subject')
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
    clientId: string | null;
    groupId?: string | null; // Group ID when sending to a group
    recipientEmails?: string[]; // Recipient email addresses (for manual recipients)
    variables: Record<string, string | number>;
    includesPayment: boolean;
    customHeaderLines?: import('../types/letter.types').CustomHeaderLine[];
    subjectLines?: import('../types/letter.types').SubjectLine[]; // Subject lines for "הנדון" section
    subject?: string; // Email subject / letter title
    saveAsTemplate?: {
      name: string;
      description?: string;
      subject?: string;
    };
    isHtml?: boolean; // If true, plainText is already HTML from Tiptap
    saveWithStatus?: import('../types/letter.types').LetterStatus; // Save with specific status (draft/saved)
  }): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Load header and footer components
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Parse custom text to HTML (or use as-is if already HTML)
      const bodyHtml = this.parseTextToHTML(params.plainText, params.isHtml);

      // 3. Load payment section if needed
      let paymentSection = '';
      if (params.includesPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Generate custom header lines HTML if provided
      let customHeaderLinesHtml = '';
      if (params.customHeaderLines && params.customHeaderLines.length > 0) {
        console.log('🔍 [Service] מייצר שורות מותאמות:', params.customHeaderLines);
        customHeaderLinesHtml = this.generateCustomHeaderLinesHtml(params.customHeaderLines);
        console.log('🔍 [Service] HTML שנוצר (200 תווים):', customHeaderLinesHtml.substring(0, 200));
        console.log('🔍 [Service] אורך HTML מלא:', customHeaderLinesHtml.length);
      } else {
        console.log('🔍 [Service] אין שורות מותאמות');
      }

      // 5. Generate subject lines HTML if provided
      let subjectLinesHtml = '';
      if (params.subjectLines && params.subjectLines.length > 0) {
        console.log('🔍 [Service] מייצר שורות הנדון:', params.subjectLines);
        subjectLinesHtml = this.buildSubjectLinesHTML(params.subjectLines);
        console.log('🔍 [Service] HTML שורות הנדון נוצר:', subjectLinesHtml.length, 'תווים');
      } else {
        console.log('🔍 [Service] אין שורות הנדון');
      }

      // 6. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const fullVariables: Record<string, string | number | unknown[]> = {
        ...params.variables,
        letter_date: params.variables.letter_date || this.formatIsraeliDate(new Date()),
        year: params.variables.year || nextYear,
        tax_year: params.variables.tax_year || nextYear,
        // Add client_id and fee_id for payment tracking links
        client_id: params.clientId || params.variables.client_id,
        fee_id: params.variables.fee_id, // If provided in variables
        // Save subjectLines and customHeaderLines for editing
        subjectLines: params.subjectLines || [],
        customHeaderLines: params.customHeaderLines || []
      };

      // 6. Build full HTML with custom header lines and subject lines
      let fullHtml = this.buildFullHTML(header, bodyHtml, paymentSection, footer, customHeaderLinesHtml, subjectLinesHtml);

      // DEBUG: Check if comment markers are present before variable replacement
      console.log('🔍 [Before replaceVars] Has HEADER STATIC START?', fullHtml.includes('<!-- HEADER STATIC START -->'));
      console.log('🔍 [Before replaceVars] Has HEADER STATIC END?', fullHtml.includes('<!-- HEADER STATIC END -->'));

      // 6. Replace variables in full HTML
      fullHtml = replaceVarsInText(fullHtml, fullVariables);

      // DEBUG: Check if comment markers survived variable replacement
      console.log('🔍 [After replaceVars] Has HEADER STATIC START?', fullHtml.includes('<!-- HEADER STATIC START -->'));
      console.log('🔍 [After replaceVars] Has HEADER STATIC END?', fullHtml.includes('<!-- HEADER STATIC END -->'));
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. Save as custom template if requested
      if (params.saveAsTemplate) {
        await this.saveCustomBody({
          name: params.saveAsTemplate.name,
          description: params.saveAsTemplate.description,
          plainText: params.plainText,
          includesPayment: params.includesPayment,
          subject: params.saveAsTemplate.subject,
          isHtml: params.isHtml
        });
      }

      // 8. Save generated letter (client_id is now optional for general letters)
      const insertData = {
        tenant_id: tenantId,
        client_id: params.clientId || null, // Nullable for general/manual recipient letters
        group_id: params.groupId || null, // Group ID when sending to a group
        recipient_emails: params.recipientEmails || null, // Recipients for edit restoration
        template_id: null, // No template_id for custom letters
        template_type: 'custom_text', // Required when template_id is null (CHECK constraint)
        fee_calculation_id: null,
        subject: params.subject || 'מכתב חדש', // Email subject / letter title
        status: params.saveWithStatus || 'draft', // Use provided status or default to draft
        rendering_engine: 'legacy', // CHECK constraint: 'legacy' | 'unified'
        system_version: 'v1', // CHECK constraint: 'v1' | 'v2'
        is_latest: true, // This is the latest version of this letter
        version_number: 1, // First version
        parent_letter_id: null, // No parent letter (not a new version)
        variables_used: fullVariables,
        generated_content_html: fullHtml,
        generated_content_text: plainText,
        body_content_html: bodyHtml, // ✅ NEW: Save body separately for editing (without Header/Footer)
        payment_link: fullVariables.payment_link as string | undefined,
        created_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id,
        created_by_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || (await supabase.auth.getUser()).data.user?.email
      };

      console.log('🔍 [DB Insert] Inserting to generated_letters:', {
        tenant_id: insertData.tenant_id,
        client_id: insertData.client_id,
        template_type: insertData.template_type,
        subject: insertData.subject,
        status: insertData.status,
        rendering_engine: insertData.rendering_engine,
        system_version: insertData.system_version,
        html_length: insertData.generated_content_html?.length,
        text_length: insertData.generated_content_text?.length
      });

      const { data: generatedLetter, error: saveError } = await supabase
        .from('generated_letters')
        .insert(insertData)
        .select()
        .single();

      if (saveError) {
        console.error('🔴 [DB Error] Failed to insert:', saveError);
        throw saveError;
      }

      console.log('✅ [DB Insert] Success! Letter ID:', generatedLetter?.id);

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
   * Update existing letter content
   * Used when editing a letter and regenerating PDF
   *
   * CRITICAL: This updates generated_content_html with fresh content
   * and clears pdf_url to force PDF regeneration
   */
  async updateLetterContent(params: {
    letterId: string;
    plainText: string;
    groupId?: string | null; // Group ID when updating a group letter
    subjectLines?: import('../types/letter.types').SubjectLine[];
    customHeaderLines?: import('../types/letter.types').CustomHeaderLine[];
    variables: Record<string, string | number>;
    includesPayment: boolean;
    isHtml?: boolean;
  }): Promise<ServiceResponse<{ id: string; html: string }>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Load header and footer components
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Parse custom text to HTML (or use as-is if already HTML)
      const bodyHtml = this.parseTextToHTML(params.plainText, params.isHtml);

      // 3. Load payment section if needed
      let paymentSection = '';
      if (params.includesPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Generate custom header lines HTML if provided
      let customHeaderLinesHtml = '';
      if (params.customHeaderLines && params.customHeaderLines.length > 0) {
        customHeaderLinesHtml = this.generateCustomHeaderLinesHtml(params.customHeaderLines);
      }

      // 5. Generate subject lines HTML if provided
      let subjectLinesHtml = '';
      if (params.subjectLines && params.subjectLines.length > 0) {
        subjectLinesHtml = this.buildSubjectLinesHTML(params.subjectLines);
      }

      // 6. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const fullVariables: Record<string, string | number | unknown[]> = {
        ...params.variables,
        letter_date: params.variables.letter_date || this.formatIsraeliDate(new Date()),
        year: params.variables.year || nextYear,
        tax_year: params.variables.tax_year || nextYear,
        client_id: params.variables.client_id,
        fee_id: params.variables.fee_id,
        // Save subjectLines and customHeaderLines for editing
        subjectLines: params.subjectLines || [],
        customHeaderLines: params.customHeaderLines || []
      };

      // 7. Build full HTML with custom header lines and subject lines
      let fullHtml = this.buildFullHTML(header, bodyHtml, paymentSection, footer, customHeaderLinesHtml, subjectLinesHtml);

      // 8. Replace variables in full HTML
      fullHtml = replaceVarsInText(fullHtml, fullVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 9. Update database - CRITICAL: Update HTML and clear PDF URL
      const { data: updatedLetter, error: updateError } = await supabase
        .from('generated_letters')
        .update({
          generated_content_html: fullHtml,
          generated_content_text: plainText,
          body_content_html: bodyHtml, // ✅ NEW: Update body separately for editing
          variables_used: fullVariables,
          group_id: params.groupId || null, // Update group_id if provided
          pdf_url: null // ✅ CRITICAL: Clear old PDF to force regeneration
        })
        .eq('id', params.letterId)
        .eq('tenant_id', tenantId)
        .select('id')
        .single();

      if (updateError) throw updateError;

      await this.logAction('update_letter_content', params.letterId, {
        includes_payment: params.includesPayment
      });

      return {
        data: {
          id: updatedLetter.id,
          html: fullHtml
        },
        error: null
      };
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
    customHeaderLines?: import('../types/letter.types').CustomHeaderLine[];
    subjectLines?: import('../types/letter.types').SubjectLine[];
    isHtml?: boolean; // If true, plainText is already HTML from Tiptap
  }): Promise<ServiceResponse<{ html: string }>> {
    try {
      // 1. Load header and footer
      const header = await this.loadTemplateFile('components/header.html');
      const footer = await this.loadTemplateFile('components/footer.html');

      // 2. Parse custom text to HTML (or use as-is if already HTML)
      const bodyHtml = this.parseTextToHTML(params.plainText, params.isHtml);

      // 3. Load payment section if needed
      let paymentSection = '';
      if (params.includesPayment) {
        paymentSection = await this.loadTemplateFile('components/payment-section.html');
      }

      // 4. Generate custom header lines HTML if provided
      let customHeaderLinesHtml = '';
      if (params.customHeaderLines && params.customHeaderLines.length > 0) {
        console.log('🔍 [Service] מייצר שורות מותאמות:', params.customHeaderLines);
        customHeaderLinesHtml = this.generateCustomHeaderLinesHtml(params.customHeaderLines);
        console.log('🔍 [Service] HTML שנוצר (200 תווים):', customHeaderLinesHtml.substring(0, 200));
        console.log('🔍 [Service] אורך HTML מלא:', customHeaderLinesHtml.length);
      } else {
        console.log('🔍 [Service] אין שורות מותאמות');
      }

      // 5. Generate subject lines HTML if provided
      let subjectLinesHtml = '';
      if (params.subjectLines && params.subjectLines.length > 0) {
        console.log('🔍 [Service] מייצר שורות הנדון:', params.subjectLines);
        subjectLinesHtml = this.buildSubjectLinesHTML(params.subjectLines);
        console.log('🔍 [Service] HTML שורות הנדון נוצר:', subjectLinesHtml.length, 'תווים');
      }

      // 6. Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const fullVariables: Record<string, string | number> = {
        ...params.variables,
        letter_date: params.variables.letter_date || this.formatIsraeliDate(new Date()),
        year: params.variables.year || nextYear,
        tax_year: params.variables.tax_year || nextYear,
        // Add client_id and fee_id for payment tracking links
        client_id: params.clientId || params.variables.client_id,
        fee_id: params.variables.fee_id // If provided in variables
      };

      // 7. Build full HTML with custom header lines and subject lines
      let fullHtml = this.buildFullHTML(header, bodyHtml, paymentSection, footer, customHeaderLinesHtml, subjectLinesHtml);

      // 8. Replace variables
      fullHtml = replaceVarsInText(fullHtml, fullVariables);

      // 9. Convert CID images to web paths for browser preview
      fullHtml = this.replaceCidWithWebPaths(fullHtml);

      return { data: { html: fullHtml }, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Build HTML for subject lines (הנדון)
   * Converts SubjectLine[] to styled HTML with selectable colors (red/blue/black), 26px font, and borders
   */
  buildSubjectLinesHTML(lines: import('../types/letter.types').SubjectLine[]): string {
    if (!lines || lines.length === 0) {
      return '';
    }

    // Helper to get color hex value
    const getColorHex = (color: 'red' | 'blue' | 'black' | undefined): string => {
      switch (color) {
        case 'red': return '#FF0000';
        case 'black': return '#000000';
        case 'blue':
        default: return '#395BF7';
      }
    };

    // Sort by order
    const sortedLines = [...lines].sort((a, b) => a.order - b.order);

    const linesHtml = sortedLines.map((line, index) => {
      const isFirstLine = index === 0;
      const color = getColorHex(line.formatting?.color);

      // Build inline styles for each line
      const styles: string[] = [`color: ${color}`];

      if (line.formatting?.bold) {
        styles.push('font-weight: 700');
      }

      if (line.formatting?.underline) {
        styles.push('text-decoration: underline');
      }

      const styleStr = styles.join('; ');

      // שורה ראשונה: "הנדון: {טקסט}"
      if (isFirstLine) {
        return `<span style="${styleStr}">הנדון: ${line.content || ''}</span>`;
      }

      // שורות נוספות: <br/> + רווח invisible + טקסט (ליישור מושלם)
      return `<br/><span style="opacity: 0;">הנדון: </span><span style="${styleStr}">${line.content || ''}</span>`;
    }).join(''); // NO NEWLINES - join with empty string for Puppeteer compatibility

    // Return complete subject lines section with borders
    // מבנה זהה ל-annual-fee.html (שורות 8-15)
    // CRITICAL: linesHtml must be on same line as <div> for Puppeteer PDF rendering
    return `<!-- Subject Lines (הנדון) -->
<tr>
    <td style="padding-top: 10px;">
        <!-- Top border above subject -->
        <div style="border-top: 1px solid #000000; margin-bottom: 10px;"></div>
        <!-- Subject line -->
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 20px; line-height: 1.1; text-align: right; letter-spacing: -0.3px; border-bottom: 1px solid #000000; padding-bottom: 10px;">${linesHtml}</div>
    </td>
</tr>`;
  }

  /**
   * Generate HTML for custom header lines (for Universal Builder)
   * Converts CustomHeaderLine[] to HTML to be inserted after company name in header table
   */
  generateCustomHeaderLinesHtml(lines: import('../types/letter.types').CustomHeaderLine[]): string {
    if (!lines || lines.length === 0) {
      return '';
    }

    // Sort by order
    const sortedLines = [...lines].sort((a, b) => a.order - b.order);

    return sortedLines.map(line => {
      if (line.type === 'line') {
        // Separator line - thin black line (1px solid) in table row
        return `
<tr>
    <td style="padding: 0;">
        <div style="border-top: 1px solid #000000; margin: 3px 0;"></div>
    </td>
</tr>`;
      }

      // Text line with formatting in table row
      // Default to bold unless explicitly set to false
      const isBold = line.formatting?.bold !== false;
      const color = line.formatting?.color || 'black';
      const isUnderline = line.formatting?.underline || false;

      const styles: string[] = [
        'font-family: \'David Libre\', \'Heebo\', \'Assistant\', sans-serif',
        'font-size: 20px', // Match company_name font size in header.html
        'line-height: 1.1',
        'text-align: right',
        'direction: rtl',
        'margin: 0',
        'padding: 0'
      ];

      // Bold by default
      styles.push(isBold ? 'font-weight: 700' : 'font-weight: 400');

      // Color
      switch (color) {
        case 'red':
          styles.push('color: #FF0000');
          break;
        case 'blue':
          styles.push('color: #395BF7');
          break;
        default:
          styles.push('color: #000000');
      }

      if (isUnderline) {
        styles.push('text-decoration: underline');
      }

      return `
<tr>
    <td style="padding: 1px 0; text-align: right;">
        <div style="${styles.join('; ')}">${line.content || ''}</div>
    </td>
</tr>`;
    }).join('');
  }

  /**
   * Create a new version of an existing letter
   * Used when editing a letter from history
   */
  async createLetterVersion(params: {
    originalLetterId: string;
    updates: {
      plainText?: string;
      companyName?: string;
      customHeaderLines?: import('../types/letter.types').CustomHeaderLine[];
      includesPayment?: boolean;
      amount?: number;
      emailSubject?: string;
    };
  }): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Fetch original letter
      const { data: originalLetter, error: fetchError } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('id', params.originalLetterId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;
      if (!originalLetter) throw new Error('Original letter not found');

      // 2. Calculate next version number
      const parentId = originalLetter.parent_letter_id || originalLetter.id;

      const { data: versions, error: versionsError } = await supabase
        .from('generated_letters')
        .select('version_number')
        .or(`id.eq.${parentId},parent_letter_id.eq.${parentId}`)
        .eq('tenant_id', tenantId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionsError) throw versionsError;

      const nextVersion = versions && versions.length > 0
        ? (versions[0].version_number || 1) + 1
        : 2; // If this is first edit, it's version 2

      // 3. Merge updates with original data
      const variables = originalLetter.variables_used || {};
      if (params.updates.companyName) variables.company_name = params.updates.companyName;
      if (params.updates.customHeaderLines) variables.customHeaderLines = params.updates.customHeaderLines;

      // 4. Generate new letter HTML if content changed
      let generatedHtml = originalLetter.generated_content_html;
      let newBodyHtml: string | undefined;

      if (params.updates.plainText) {
        const header = await this.loadTemplateFile('components/header.html');
        const footer = await this.loadTemplateFile('components/footer.html');
        const bodyHtml = this.parseTextToHTML(params.updates.plainText);
        newBodyHtml = bodyHtml; // Save for body_content_html

        let paymentSection = '';
        if (params.updates.includesPayment !== undefined ? params.updates.includesPayment : originalLetter.variables_used?.includesPayment) {
          paymentSection = await this.loadTemplateFile('components/payment-section.html');
        }

        generatedHtml = this.buildFullHTML(header, bodyHtml, paymentSection, footer);
        generatedHtml = replaceVarsInText(generatedHtml, variables);
      }

      // 5. Create new letter as a version
      const { data: newLetter, error: createError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: originalLetter.client_id,
          template_id: originalLetter.template_id,
          template_type: originalLetter.template_type || 'custom',
          fee_calculation_id: originalLetter.fee_calculation_id,
          parent_letter_id: parentId, // Link to original
          version_number: nextVersion,
          variables_used: variables,
          generated_content_html: generatedHtml,
          generated_content_text: params.updates.plainText || originalLetter.generated_content_text,
          body_content_html: newBodyHtml || originalLetter.body_content_html, // ✅ NEW: Save body separately
          subject: params.updates.emailSubject || originalLetter.subject,
          recipient_emails: originalLetter.recipient_emails,
          status: 'draft',
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          created_by_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || (await supabase.auth.getUser()).data.user?.email
        })
        .select()
        .single();

      if (createError) throw createError;

      await this.logAction('create_letter_version', newLetter.id, {
        original_letter_id: params.originalLetterId,
        version_number: nextVersion,
        parent_letter_id: parentId
      });

      return { data: newLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get all versions of a letter (including original)
   * Returns versions sorted by version_number
   */
  async getLetterVersions(letterId: string): Promise<ServiceResponse<GeneratedLetter[]>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Get the letter to find parent ID
      const { data: letter, error: fetchError } = await supabase
        .from('generated_letters')
        .select('id, parent_letter_id')
        .eq('id', letterId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError) throw fetchError;
      if (!letter) throw new Error('Letter not found');

      // 2. Determine parent ID (if this letter is a version, use parent_letter_id, otherwise use its own id)
      const parentId = letter.parent_letter_id || letter.id;

      // 3. Get all versions (original + all edits)
      const { data: versions, error: versionsError } = await supabase
        .from('generated_letters')
        .select('*')
        .or(`id.eq.${parentId},parent_letter_id.eq.${parentId}`)
        .eq('tenant_id', tenantId)
        .order('version_number', { ascending: true });

      if (versionsError) throw versionsError;

      return { data: versions || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get the latest version of a letter
   */
  async getLatestVersion(letterId: string): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const versionsResponse = await this.getLetterVersions(letterId);

      if (versionsResponse.error || !versionsResponse.data || versionsResponse.data.length === 0) {
        throw new Error('No versions found');
      }

      // Return last version (highest version_number)
      const latestVersion = versionsResponse.data[versionsResponse.data.length - 1];

      return { data: latestVersion, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  // ============================================================================
  // FOREIGN WORKERS DOCUMENTS SECTION
  // ============================================================================

  /**
   * Generate Foreign Worker Document
   * Creates approval documents for foreign worker permits
   * NO payment sections - these are informational documents
   */
  async generateForeignWorkerDocument(
    templateType: ForeignWorkerTemplateType,
    clientId: string,
    variables: ForeignWorkerVariables
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();

      // 1. Load header (foreign workers specific header)
      const header = await this.loadTemplateFile('components/foreign-workers-header.html');

      // 2. Load body based on template type
      const bodyFile = this.getForeignWorkerBodyFileName(templateType);
      const body = await this.loadTemplateFile(`bodies/foreign-workers/${bodyFile}`);

      // 3. Load footer (same as regular letters - compact PDF footer)
      const footer = await this.loadTemplateFile('components/footer.html');

      // 4. Build dynamic content (tables, scenario content)
      const processedVariables = await this.processForeignWorkerVariables(templateType, variables);

      // 5. Build full HTML (no payment section for foreign worker documents)
      let fullHtml = this.buildForeignWorkerHTML(header, body, footer);

      // 6. Replace all variables - WHITELIST HTML VARIABLES
      // Foreign worker documents contain HTML tables as variable values
      // These must be whitelisted to prevent HTML escaping while still sanitizing with DOMPurify
      const htmlVariables = [
        'monthly_turnover_rows',      // Accountant turnover table
        'israeli_workers_rows',        // Israeli workers table
        'scenario_content',            // Turnover approval scenarios
        'workers_data_rows',           // Salary report table
        'recipient',                   // Recipient address (with <b>, <u> tags)
        'senior_manager_signature_display',   // Senior manager signature image
        'finance_manager_signature_display',  // Finance manager signature image
        'company_stamp_display'               // Company stamp signature image
      ];
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables, htmlVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. Save generated letter
      const { data: generatedLetter, error: saveError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          template_id: null, // No template_id for file-based system
          template_type: templateType, // Save the foreign worker template type
          fee_calculation_id: null, // Foreign worker docs are not linked to fees
          variables_used: processedVariables,
          generated_content_html: fullHtml,
          generated_content_text: plainText,
          payment_link: null, // No payment links for informational documents
          created_at: new Date().toISOString(),
          created_by: (await supabase.auth.getUser()).data.user?.id,
          created_by_name: (await supabase.auth.getUser()).data.user?.user_metadata?.full_name || (await supabase.auth.getUser()).data.user?.email
        })
        .select()
        .single();

      if (saveError) throw saveError;

      await this.logAction('generate_foreign_worker_document', generatedLetter.id, {
        template_type: templateType,
        client_id: clientId
      });

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get body file name from foreign worker template type
   */
  private getForeignWorkerBodyFileName(templateType: ForeignWorkerTemplateType): string {
    const bodyMap: Record<ForeignWorkerTemplateType, string> = {
      'foreign_worker_accountant_turnover': 'accountant-turnover.html',
      'foreign_worker_israeli_workers': 'israeli-workers.html',
      'foreign_worker_living_business': 'living-business.html',
      'foreign_worker_turnover_approval': 'turnover-approval.html',
      'foreign_worker_salary_report': 'salary-report.html'
    };

    return bodyMap[templateType];
  }

  /**
   * Build full HTML for foreign worker document
   * Structure: Email wrapper + table container + header + body + footer
   */
  private buildForeignWorkerHTML(header: string, body: string, footer: string): string {
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אישור עובדים זרים</title>
    <link href="https://fonts.googleapis.com/css2?family=David+Libre:wght@400;500;700&family=Heebo:wght@400;500;600;700&family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; direction: rtl;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="750" cellpadding="0" cellspacing="0" border="0" style="max-width: 750px; width: 100%; background-color: #ffffff;">
                    ${header}
                    ${body}
                    ${footer}
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
  }

  /**
   * Process foreign worker variables - build dynamic content
   */
  private async processForeignWorkerVariables(
    templateType: ForeignWorkerTemplateType,
    variables: ForeignWorkerVariables
  ): Promise<Record<string, unknown>> {
    const processed: Record<string, unknown> = { ...variables };

    // Add auto-generated date if not provided
    if (!processed.document_date) {
      // Auto-generate today's date if not provided
      processed.document_date = this.formatIsraeliDate(new Date());
    } else if (typeof processed.document_date === 'string') {
      // Format user-provided date (from HTML date input: YYYY-MM-DD)
      processed.document_date = this.formatIsraeliDate(new Date(processed.document_date));
    }

    // Build recipient based on template type
    processed.recipient = this.getForeignWorkerRecipient(templateType);

    // Build dynamic content based on template type
    switch (templateType) {
      case 'foreign_worker_accountant_turnover':
        processed.monthly_turnover_rows = this.buildMonthlyTurnoverRows(
          (variables as AccountantTurnoverVariables).monthly_turnover
        );
        break;

      case 'foreign_worker_israeli_workers':
        processed.israeli_workers_rows = this.buildIsraeliWorkersRows(
          (variables as IsraeliWorkersVariables).israeli_workers
        );
        break;

      case 'foreign_worker_turnover_approval':
        processed.scenario_content = this.buildScenarioContent(
          variables as TurnoverApprovalVariables
        );
        break;

      case 'foreign_worker_salary_report':
        processed.workers_data_rows = this.buildWorkersDataRows(
          (variables as SalaryReportVariables).workers_data
        );
        // Process signature display HTML - show image if exists, empty space if not
        // Use max-height to preserve aspect ratio, width:auto to scale proportionally
        // max-width set to 100% to fit container, or use larger value for flexibility
        const salaryVars = variables as SalaryReportVariables;
        processed.senior_manager_signature_display = salaryVars.senior_manager_signature
          ? `<img src="${salaryVars.senior_manager_signature}" style="max-height: 50px; max-width: 100%; width: auto; height: auto;" alt="חתימה" />`
          : '';
        processed.finance_manager_signature_display = salaryVars.finance_manager_signature
          ? `<img src="${salaryVars.finance_manager_signature}" style="max-height: 50px; max-width: 100%; width: auto; height: auto;" alt="חתימה" />`
          : '';
        processed.company_stamp_display = salaryVars.company_stamp_signature
          ? `<img src="${salaryVars.company_stamp_signature}" style="max-height: 60px; max-width: 100%; width: auto; height: auto;" alt="חותמת" />`
          : '';
        break;

      // living_business doesn't need dynamic content
      case 'foreign_worker_living_business':
      default:
        break;
    }

    return processed;
  }

  /**
   * Get recipient address for foreign worker document
   */
  private getForeignWorkerRecipient(templateType: ForeignWorkerTemplateType): string {
    // Most documents go to Ministry of Interior
    const ministryOfInterior = `
      <b>לכבוד</b><br>
      <b>משרד הפנים - רשות האוכלוסין ההגירה ומעברי גבול</b><br>
      <b>יחידת ההיתרים</b><br>
      רח' אגריפס 42<br>
      <u>ירושלים</u>
    `.trim();

    // For now, all documents use the same recipient
    // Can be customized per template type if needed
    return ministryOfInterior;
  }

  /**
   * Build monthly turnover table rows with total footer
   */
  private buildMonthlyTurnoverRows(turnoverData: MonthlyTurnover[]): string {
    // Calculate total
    const total = turnoverData.reduce((sum, row) => sum + row.amount, 0);

    // Build data rows
    const dataRows = turnoverData
      .map(
        (row) => `
            <tr>
                <td width="40%" style="border: 2px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; border-left: 2px solid #000000; border-right: 2px solid #000000; padding: 5px; background-color: #ffffff;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; font-weight: 600; color: #000000; text-align: center;">
                        ${row.amount.toLocaleString('he-IL')}
                    </div>
                </td>
                <td width="60%" style="border: 2px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; border-left: 2px solid #000000; border-right: 2px solid #000000; padding: 5px; background-color: #ffffff;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; color: #000000; text-align: right;">
                        ${row.month}
                    </div>
                </td>
            </tr>
        `
      )
      .join('\n');

    // Add total row with highlighted background
    const totalRow = `
            <tr>
                <td width="40%" style="border: 2px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; border-left: 2px solid #000000; border-right: 2px solid #000000; padding: 5px; background-color: #d9d9d9;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; font-weight: 700; color: #000000; text-align: center;">
                        ${total.toLocaleString('he-IL')}
                    </div>
                </td>
                <td width="60%" style="border: 2px solid #000000; border-top: 2px solid #000000; border-bottom: 2px solid #000000; border-left: 2px solid #000000; border-right: 2px solid #000000; padding: 5px; background-color: #d9d9d9;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; font-weight: 700; color: #000000; text-align: right;">
                        סה"כ
                    </div>
                </td>
            </tr>
        `;

    return dataRows + totalRow;
  }

  /**
   * Build Israeli workers table rows
   */
  private buildIsraeliWorkersRows(workersData: MonthlyWorkers[]): string {
    return workersData
      .map(
        (row) => `
            <tr>
                <td width="50%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; color: #09090b; text-align: center;">
                        ${row.employee_count}
                    </div>
                </td>
                <td width="50%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; color: #09090b; text-align: center;">
                        ${row.month}
                    </div>
                </td>
            </tr>
        `
      )
      .join('\n');
  }

  /**
   * Build workers salary data table rows (RTL order - matches template header)
   * Order: full_name, passport, month, nationality, salary, supplement
   */
  private buildWorkersDataRows(workersData: WorkerData[]): string {
    return workersData
      .map(
        (row) => `
            <tr>
                <td width="17%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 13px; color: #09090b; text-align: right;">
                        ${row.full_name}
                    </div>
                </td>
                <td width="17%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 13px; color: #09090b; text-align: center;">
                        ${row.passport_number}
                    </div>
                </td>
                <td width="17%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 13px; color: #09090b; text-align: center;">
                        ${row.month}
                    </div>
                </td>
                <td width="17%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 13px; color: #09090b; text-align: center;">
                        ${row.nationality || '-'}
                    </div>
                </td>
                <td width="16%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 13px; color: #09090b; text-align: center;">
                        ₪${row.salary.toLocaleString('he-IL')}
                    </div>
                </td>
                <td width="16%" style="border: 1px solid #000000; padding: 6px;">
                    <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 13px; color: #09090b; text-align: center;">
                        ${row.supplement ? '₪' + row.supplement.toLocaleString('he-IL') : '-'}
                    </div>
                </td>
            </tr>
        `
      )
      .join('\n');
  }

  /**
   * Build scenario content for turnover/costs approval
   */
  private buildScenarioContent(variables: TurnoverApprovalVariables): string {
    const { scenario } = variables;

    if (scenario === '12_plus' && variables.scenario_12_plus) {
      const s = variables.scenario_12_plus;
      return `
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.4; color: #09090b; text-align: justify; margin-bottom: 20px;">
          מחזור העסקאות מפעילות אסייתית ל-12 חודשי הפעילות האחרונים אשר קדמו ליום אישור זה,
          המתחילים בחודש <u>${s.period_start}</u> ומסתיימים בחודש <u>${s.period_end}</u>,
          הינו בסך של <u><b>${s.total_turnover.toLocaleString('he-IL')}</b></u> ש"ח.
        </div>
      `;
    }

    if (scenario === '4_to_11' && variables.scenario_4_to_11) {
      const s = variables.scenario_4_to_11;
      return `
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.4; color: #09090b; text-align: justify; margin-bottom: 20px;">
          מחזור העסקאות החודשי הממוצע מפעילות אסייתית ל-<u>${s.months_count}</u> חודשי הפעילות האחרונים אשר
          קדמו ליום אישור זה, המתחילים בחודש <u>${s.period_start}</u> ומסתיימים בחודש <u>${s.period_end}</u>,
          הינו בסך של <u><b>${s.total_turnover.toLocaleString('he-IL')}</b></u> ש"ח.
        </div>
      `;
    }

    if (scenario === 'up_to_3' && variables.scenario_up_to_3) {
      const s = variables.scenario_up_to_3;
      return `
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.4; color: #09090b; text-align: justify; margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            עלות הקמת העסק בספרי החברה הינו <u><b>${s.estimated_annual_costs.toLocaleString('he-IL')}</b></u> ש"ח.
          </div>
          <div style="font-size: 14px; color: #666666; margin-bottom: 30px;">
            (בהתבסס על: ${s.estimate_basis})
          </div>
          <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.4; color: #09090b; text-align: justify;">
            <b>לאישור זה מצורפים, בחתימה לשם זיהוי, פירוט המחזור הכספי מפעילות אסייתית כמופיע בספרי החברה לחודשים הרלוונטיים / טופס פחת מפורט, ליום הוצאת האישור, הכולל את פירוט עלויות הקמת העסק.</b>
          </div>
        </div>
      `;
    }

    return '';
  }

  /**
   * Build red correction header HTML for client requested adjustments
   * Returns HTML string to be inserted before "הנדון:" in letter body
   */
  private buildCorrectionHeader(): string {
    return `
      <tr>
        <td colspan="2" style="padding: 10px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="text-align: center; padding: 10px 0;">
                <div style="
                  font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif;
                  font-size: 24px;
                  font-weight: 700;
                  color: #FF0000;
                  text-align: center;
                  border-bottom: 2px solid #FF0000;
                  padding: 10px 0;
                ">
                  ** תיקון שכר טרחה לבקשתך **
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }
}