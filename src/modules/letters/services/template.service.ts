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
  LivingBusinessVariables,
  TurnoverApprovalVariables,
  SalaryReportVariables,
  MonthlyTurnover,
  MonthlyWorkers,
  WorkerData
} from '@/types/foreign-workers.types';
import type {
  TzlulTemplateType,
  TzlulVariables,
  ViolationCorrectionVariables,
  SummerBonusVariables,
  ExcellenceBonusVariables,
  EmployeePaymentsVariables,
  TransferredAmountsVariables,
  GoingConcernVariables,
  HealthBenefitsVariables,
  HealthBenefitsInvoice,
  EmployeePaymentRow,
  SalaryPaymentConfirmationVariables
} from '@/types/tzlul-approvals.types';
import { TZLUL_CLIENT_NAME, TZLUL_TAX_ID } from '@/types/tzlul-approvals.types';
import type {
  CompanyOnboardingTemplateType,
  CompanyOnboardingVariables,
  VatRegistrationVariables,
  PriceQuoteVariables,
  PreviousAccountantRequestVariables
} from '@/types/company-onboarding.types';
import type {
  AutoLetterTemplateType,
  CutoffDateVariables,
  MeetingReminderVariables,
  GeneralDeadlineVariables,
  FinancialStatementsMeetingVariables,
  MissingDocumentsVariables
} from '@/types/auto-letters.types';
import { TemplateParser } from '../utils/template-parser';
import { parseTextToHTML as parseMarkdownToHTML, replaceVariables as replaceVarsInText } from '../utils/text-to-html-parser';

// Label mappings for email subjects - used when saving generated letters
const FOREIGN_WORKER_LABELS: Record<ForeignWorkerTemplateType, string> = {
  'foreign_worker_accountant_turnover': 'דוח מחזורים רו"ח',
  'foreign_worker_israeli_workers': 'דוח עובדים ישראליים',
  'foreign_worker_living_business': 'עסק חי',
  'foreign_worker_turnover_approval': 'אישור מחזור/עלויות',
  'foreign_worker_salary_report': 'דוח שכר'
};

const TZLUL_LABELS: Record<TzlulTemplateType, string> = {
  'tzlul_violation_correction': 'מכתב תיקון הפרות',
  'tzlul_summer_bonus': 'חוות דעת מענק קיץ',
  'tzlul_excellence_bonus': 'חוות דעת מענק מצויינות',
  'tzlul_employee_payments': 'אישור תשלומים לעובדים',
  'tzlul_transferred_amounts': 'אישור העברת סכומים',
  'tzlul_going_concern': 'הוכחת עמידה בתנאי עסק חי',
  'tzlul_health_benefits': 'חוות דעת הבראה/מחלה/ותק',
  'tzlul_salary_payment_confirmation': 'אישור רו"ח בדבר תשלום השכר'
};

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
      'internal_bookkeeping_agreed',
      'billing_letter'
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
                    ${body}
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
        // IMPORTANT: Check billing_letter FIRST - it has its own dedicated simple template
        if (templateType === 'billing_letter') {
          // Billing letters use dedicated billing payment section (no fee/tax year text)
          paymentSection = await this.loadTemplateFile('components/payment-section-billing.html');
        } else if (variables.bank_transfer_only) {
          // Bank transfer only mode for other letter types
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
        tax_year: variables.tax_year || new Date().getFullYear(),
        num_checks: variables.num_checks || 8,
        check_dates_description: this.generateCheckDatesDescription(
          (variables.num_checks as 8 | 12) || 8,
          variables.tax_year || new Date().getFullYear()
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
      'internal_bookkeeping_agreed': 'bookkeeping-as-agreed.html',
      'billing_letter': 'billing-letter.html'
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
                <td style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 19px; line-height: 1.2; text-align: right; color: #09090b;">
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
      'cid:bullet_star_darkred': '/brand/Bullet_star_darkred.png',
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
        // IMPORTANT: Check billing_letter FIRST - it has its own dedicated simple template
        if (templateType === 'billing_letter') {
          // Billing letters use dedicated billing payment section (no fee/tax year text)
          paymentSection = await this.loadTemplateFile('components/payment-section-billing.html');
        } else if (variables.bank_transfer_only) {
          // Bank transfer only mode for other letter types
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
        year: variables.year || currentYear,
        previous_year: variables.previous_year || previousYear,
        tax_year: variables.tax_year || currentYear,
        num_checks: variables.num_checks || 8,
        check_dates_description: this.generateCheckDatesDescription(
          (variables.num_checks as 8 | 12) || 8,
          variables.tax_year || currentYear
        ),
        // Preserve fee_id and client_id if provided in variables (for preview with payment links)
        fee_id: feeCalculationId || variables.fee_id,
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
      // IMPORTANT: class="letter-body-content" is required for CSS table styling to work!
      html = `<tr><td class="letter-body-content" style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.2; text-align: right; direction: rtl; padding: 20px 0;">${html}</td></tr>`;
    } else {
      // Otherwise parse Markdown to HTML (legacy support)
      html = parseMarkdownToHTML(text);

      // Also wrap Markdown output in table row/cell with David Libre font
      // IMPORTANT: class="letter-body-content" is required for CSS table styling to work!
      html = `<tr><td class="letter-body-content" style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.2; text-align: right; direction: rtl; padding: 20px 0;">${html}</td></tr>`;
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
    name?: string; // ⭐ User-defined letter name for easy identification
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
        name: params.name || null, // ⭐ User-defined letter name
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
        body_content_html: params.plainText, // ✅ Save RAW HTML from Tiptap (not wrapped) for clean editing
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
    name?: string; // ⭐ User-defined letter name for easy identification
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
          body_content_html: params.plainText, // ✅ Save RAW HTML from Tiptap (not wrapped) for clean editing
          variables_used: fullVariables,
          group_id: params.groupId || null, // Update group_id if provided
          pdf_url: null, // ✅ CRITICAL: Clear old PDF to force regeneration
          ...(params.name !== undefined && { name: params.name }) // ⭐ Update letter name if provided
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
        newBodyHtml = params.updates.plainText; // ✅ Save RAW HTML (not wrapped) for clean editing

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
          body_content_html: newBodyHtml || originalLetter.body_content_html, // ✅ RAW HTML for clean editing
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
      // Special case: Letter C (up_to_3 scenario) uses different template
      let bodyFile = this.getForeignWorkerBodyFileName(templateType);
      if (templateType === 'foreign_worker_turnover_approval' &&
          (variables as TurnoverApprovalVariables).scenario === 'up_to_3') {
        bodyFile = 'turnover-approval-setup-costs.html';
      }
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
          subject: templateType === 'foreign_worker_living_business'
            ? `עסק חי ${processedVariables.certificate_year}`
            : FOREIGN_WORKER_LABELS[templateType],
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

    // letter_date = TODAY's date (for header)
    processed.letter_date = this.formatIsraeliDate(new Date());

    // document_date = User's date input (for body)
    if (!processed.document_date) {
      processed.document_date = this.formatIsraeliDate(new Date());
    } else if (typeof processed.document_date === 'string') {
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
        // For Letter C (up_to_3), format the estimated_annual_costs for the template
        const turnoverVars = variables as TurnoverApprovalVariables;
        if (turnoverVars.scenario === 'up_to_3' && turnoverVars.scenario_up_to_3) {
          processed.estimated_annual_costs = turnoverVars.scenario_up_to_3.estimated_annual_costs.toLocaleString('he-IL');
        }
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

      case 'foreign_worker_living_business': {
        const livingVars = variables as LivingBusinessVariables;
        const certYear = livingVars.certificate_year || new Date().getFullYear();
        processed.certificate_year = certYear;
        processed.previous_year = certYear - 1;
        break;
      }
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
      // Letter C uses a dedicated template (turnover-approval-setup-costs.html)
      // that includes the cost amount directly. This content is just the footer text about attachments.
      return `
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 16px; line-height: 1.4; color: #09090b; text-align: justify; margin-top: 30px;">
          לאישור זה מצורפים: טופס פחת מפורט, ליום הוצאת האישור, הכולל את פירוט עלויות הקמת העסק.
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

  // ============================================================================
  // TZLUL APPROVALS DOCUMENTS (אישורים חברת צלול)
  // ============================================================================

  /**
   * Check if a Tzlul letter already exists for this client
   */
  async checkExistingTzlulLetter(
    templateType: TzlulTemplateType,
    clientId: string
  ): Promise<ServiceResponse<GeneratedLetter | null>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Generate Tzlul Approval Document
   * Creates approval documents for Tzlul Cleaning company
   * NO payment sections - these are informational documents
   * @param options.previewOnly - If true, only generate HTML without saving to DB
   * @param options.existingLetterId - If provided, update existing letter instead of creating new
   */
  async generateTzlulDocument(
    templateType: TzlulTemplateType,
    clientId: string,
    variables: TzlulVariables,
    options?: { previewOnly?: boolean; existingLetterId?: string }
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();
      const { previewOnly = false, existingLetterId } = options || {};

      // 1. Load header (using foreign workers header - same format)
      const header = await this.loadTemplateFile('components/foreign-workers-header.html');

      // 2. Load body based on template type
      const bodyFile = this.getTzlulBodyFileName(templateType);
      const body = await this.loadTemplateFile(`bodies/tzlul/${bodyFile}`);

      // 3. Load footer (same as regular letters - compact PDF footer)
      const footer = await this.loadTemplateFile('components/footer.html');

      // 4. Build dynamic content
      const processedVariables = await this.processTzlulVariables(templateType, variables);

      // 5. Build full HTML
      let fullHtml = this.buildTzlulHTML(header, body, footer);

      // 6. Replace all variables - WHITELIST HTML VARIABLES
      const htmlVariables = [
        'recipient',                   // Recipient address (with <b>, <u> tags)
        'employee_payments_rows',      // Employee payments table rows
        'invoice_numbers_text',        // Formatted invoice numbers text (summer bonus)
        'invoices_text'                // Formatted invoices with amounts (health benefits)
      ];
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables, htmlVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. If preview only, return without saving
      if (previewOnly) {
        return {
          data: {
            id: 'preview',
            tenant_id: tenantId,
            client_id: clientId,
            group_calculation_id: null,
            template_id: null,
            template_type: templateType,
            fee_calculation_id: null,
            variables_used: processedVariables,
            generated_content_html: fullHtml,
            generated_content_text: plainText,
            payment_link: null,
            subject: TZLUL_LABELS[templateType], // Email subject from label
            status: 'draft',
            created_at: new Date().toISOString(),
            created_by: null,
            created_by_name: null
          } as GeneratedLetter,
          error: null
        };
      }

      const user = await supabase.auth.getUser();
      const letterData = {
        tenant_id: tenantId,
        client_id: clientId,
        template_id: null,
        template_type: templateType,
        fee_calculation_id: null,
        variables_used: processedVariables,
        generated_content_html: fullHtml,
        generated_content_text: plainText,
        payment_link: null,
        subject: TZLUL_LABELS[templateType], // Email subject from label
        status: 'saved' as const,
        created_by: user.data.user?.id,
        created_by_name: user.data.user?.user_metadata?.full_name || user.data.user?.email
      };

      let generatedLetter: GeneratedLetter;

      // 8. Update existing or insert new
      if (existingLetterId) {
        // Update existing letter
        const { data, error: updateError } = await supabase
          .from('generated_letters')
          .update(letterData)
          .eq('id', existingLetterId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) throw updateError;
        generatedLetter = data;

        await this.logAction('update_tzlul_document', generatedLetter.id, {
          template_type: templateType,
          client_id: clientId
        });
      } else {
        // Insert new letter
        const { data, error: saveError } = await supabase
          .from('generated_letters')
          .insert({
            ...letterData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) throw saveError;
        generatedLetter = data;

        await this.logAction('generate_tzlul_document', generatedLetter.id, {
          template_type: templateType,
          client_id: clientId
        });
      }

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get body file name from Tzlul template type
   */
  private getTzlulBodyFileName(templateType: TzlulTemplateType): string {
    const bodyMap: Record<TzlulTemplateType, string> = {
      'tzlul_violation_correction': 'violation-correction.html',
      'tzlul_summer_bonus': 'summer-bonus.html',
      'tzlul_excellence_bonus': 'excellence-bonus.html',
      'tzlul_employee_payments': 'employee-payments.html',
      'tzlul_transferred_amounts': 'transferred-amounts.html',
      'tzlul_going_concern': 'going-concern.html',
      'tzlul_health_benefits': 'health-benefits.html',
      'tzlul_salary_payment_confirmation': 'salary-payment-confirmation.html'
    };

    return bodyMap[templateType];
  }

  /**
   * Build full HTML for Tzlul document
   */
  private buildTzlulHTML(header: string, body: string, footer: string): string {
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>אישורים חברת צלול</title>
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
   * Process Tzlul variables - build dynamic content
   */
  private async processTzlulVariables(
    templateType: TzlulTemplateType,
    variables: TzlulVariables
  ): Promise<Record<string, unknown>> {
    const processed: Record<string, unknown> = { ...variables };

    // letter_date = TODAY's date (for header)
    processed.letter_date = this.formatIsraeliDate(new Date());

    // document_date = User's declaration date (for body only)
    if (!processed.document_date) {
      processed.document_date = this.formatIsraeliDate(new Date());
    } else if (typeof processed.document_date === 'string') {
      processed.document_date = this.formatIsraeliDate(new Date(processed.document_date));
    }

    // Build recipient based on template type and variables
    processed.recipient = this.getTzlulRecipient(templateType, variables);

    // Build dynamic content based on template type
    switch (templateType) {
      case 'tzlul_summer_bonus': {
        const summerVars = variables as SummerBonusVariables;
        // Build invoice numbers text
        if (summerVars.invoice_numbers && summerVars.invoice_numbers.length > 0) {
          const invoiceTexts = summerVars.invoice_numbers.map((num, idx) =>
            `בחשבונית מספר ${num}`
          );
          processed.invoice_numbers_text = invoiceTexts.join(' ו');
        }
        // Format total amount
        if (typeof summerVars.total_amount === 'number') {
          processed.total_amount = summerVars.total_amount.toLocaleString('he-IL');
        }
        break;
      }

      case 'tzlul_employee_payments': {
        const empVars = variables as EmployeePaymentsVariables;
        if (empVars.employees_table && empVars.employees_table.length > 0) {
          processed.employee_payments_rows = this.buildEmployeePaymentsRows(empVars.employees_table);
        }
        break;
      }

      case 'tzlul_violation_correction': {
        const violationVars = variables as ViolationCorrectionVariables;
        // Format violations date if it's a date string
        if (violationVars.violations_date) {
          // Keep as is if already formatted, or format if it's an ISO date
          if (violationVars.violations_date.includes('-')) {
            processed.violations_date = this.formatIsraeliDate(new Date(violationVars.violations_date));
          }
        }
        break;
      }

      case 'tzlul_excellence_bonus': {
        const excellenceVars = variables as ExcellenceBonusVariables;
        // Format statement date if needed
        if (excellenceVars.statement_date && excellenceVars.statement_date.includes('-')) {
          processed.statement_date = this.formatIsraeliDate(new Date(excellenceVars.statement_date));
        }
        break;
      }

      case 'tzlul_transferred_amounts': {
        const transferVars = variables as TransferredAmountsVariables;
        // Format dates if needed (they might already be in DD/MM/YY format)
        // Keep as is since user enters them in the expected format
        break;
      }

      case 'tzlul_going_concern': {
        const goingConcernVars = variables as GoingConcernVariables;

        // Format dates if they are ISO format
        if (goingConcernVars.last_audited_report_date && goingConcernVars.last_audited_report_date.includes('-')) {
          processed.last_audited_report_date = this.formatIsraeliDate(new Date(goingConcernVars.last_audited_report_date));
        }
        if (goingConcernVars.audit_opinion_date && goingConcernVars.audit_opinion_date.includes('-')) {
          processed.audit_opinion_date = this.formatIsraeliDate(new Date(goingConcernVars.audit_opinion_date));
        }

        // Build the reviewed statements paragraph based on selected option
        if (goingConcernVars.reviewed_statements_option === 'option_a') {
          processed.reviewed_statements_paragraph =
            'כל הדוחות הכספיים הסקורים של המשתתף שנערכו לאחר הדוח הכספי המבוקר האחרון של המשתתף ונסקרו על ידינו, אינם כוללים הערה בדבר ספקות ממשיים לגבי המשך קיומו של המשתתף "כעסק חי" (*) או כל הערה דומה המעלה ספק בדבר יכולת המשתתף להמשיך ולהתקיים "כעסק חי".';
        } else if (goingConcernVars.reviewed_statements_option === 'option_b') {
          processed.reviewed_statements_paragraph =
            'אין למשתתף דוחות כספיים סקורים שנערכו לאחר הדוח הכספי המבוקר האחרון של המשתתף.';
        }
        break;
      }

      case 'tzlul_health_benefits': {
        const healthVars = variables as HealthBenefitsVariables;
        // Build invoices text with amounts - format: "X ש"ח הכלולים בחשבונית מספר Y ו-Z ש"ח הכלולים בחשבונית מספר W"
        if (healthVars.invoices && healthVars.invoices.length > 0) {
          const validInvoices = healthVars.invoices.filter(
            (inv: HealthBenefitsInvoice) => inv.invoice_number.trim() !== '' && inv.amount > 0
          );
          if (validInvoices.length > 0) {
            const invoiceTexts = validInvoices.map((inv: HealthBenefitsInvoice) =>
              `<b>${inv.amount.toLocaleString('he-IL')}</b> ש"ח בחשבונית מספר ${inv.invoice_number}`
            );
            processed.invoices_text = invoiceTexts.join(' ו-');
            // Calculate total for display if needed
            processed.total_amount = validInvoices.reduce((sum: number, inv: HealthBenefitsInvoice) => sum + inv.amount, 0).toLocaleString('he-IL');
          }
        }
        break;
      }

      case 'tzlul_salary_payment_confirmation': {
        // No special processing needed - variables are used directly
        // local_authority, tender_number, period_start, period_end are all simple strings
        break;
      }
    }

    return processed;
  }

  /**
   * Get recipient HTML for Tzlul documents
   */
  private getTzlulRecipient(templateType: TzlulTemplateType, variables: TzlulVariables): string {
    // For documents with custom recipient lines
    if (templateType === 'tzlul_violation_correction') {
      const vars = variables as ViolationCorrectionVariables;
      if (vars.recipient_lines && vars.recipient_lines.length > 0) {
        const lines = vars.recipient_lines
          .filter(line => line.trim())
          .map(line => `<b>${line}</b>`)
          .join('<br/>');
        return `<b>לכבוד</b><br/>${lines}`;
      }
    }

    if (templateType === 'tzlul_employee_payments') {
      const vars = variables as EmployeePaymentsVariables;
      if (vars.recipient_lines && vars.recipient_lines.length > 0) {
        const lines = vars.recipient_lines
          .filter(line => line.trim())
          .map(line => `<b>${line}</b>`)
          .join('<br/>');
        return `<b>לכבוד</b><br/>${lines}`;
      }
    }

    // Default recipients by template type
    switch (templateType) {
      case 'tzlul_summer_bonus':
        return `<b>לכבוד</b><br/><b>צלול ניקיון ואחזקה בע"מ</b><br/><b>אור יהודה</b><br/><br/><b>א.ג.נ,</b>`;

      case 'tzlul_excellence_bonus':
        return `<b>לכבוד,</b><br/><b>חברת צלול ניקיון ואחזקה בע"מ</b><br/><br/><b>א.ג.נ.,</b>`;

      case 'tzlul_transferred_amounts':
        return `<b>לכבוד</b><br/><b>החברה למשק וכלכלה של השלטון המקומי בע"מ</b><br/><b>היחידה לאכיפת זכויות עובדים</b>`;

      case 'tzlul_going_concern':
        return `<b>לכבוד</b><br/><b>חברת צלול ניקיון ואחזקה בע"מ ח.פ. 514327642</b>`;

      case 'tzlul_health_benefits':
        return `<b>לכבוד</b><br/><b>צלול ניקיון ואחזקה בע"מ</b><br/><b>אור יהודה</b><br/><br/><b>א.ג.נ,</b>`;

      case 'tzlul_salary_payment_confirmation':
        return `<b>לכבוד</b><br/><b>החברה למשק וכלכלה של השלטון המקומי בע"מ</b><br/><b>היחידה לאכיפת זכויות עובדים</b><br/>בפקס מס': 03-5010922<br/>טל' לאישור 03-5046070<br/><br/><b>א.ג.נ,</b>`;

      default:
        return `<b>לכבוד</b><br/><br/><b>א.ג.נ,</b>`;
    }
  }

  /**
   * Build employee payments table rows HTML
   */
  private buildEmployeePaymentsRows(employees: EmployeePaymentRow[]): string {
    return employees.map(emp => `
      <tr>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${emp.name}
        </td>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${emp.id_number}
        </td>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${emp.month}
        </td>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ₪ ${typeof emp.amount === 'number' ? emp.amount.toLocaleString('he-IL', { minimumFractionDigits: 2 }) : emp.amount}
        </td>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${emp.payment_date}
        </td>
      </tr>
    `).join('');
  }

  /**
   * Build HTML table rows for income confirmation letter
   */
  private buildIncomeTableRows(entries: Array<{ month: string; year: number; amount: number }>): string {
    if (!entries || entries.length === 0) {
      return '';
    }

    return entries.map(entry => `
      <tr>
        <td style="border: 1px solid #000000; padding: 10px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${entry.month} ${entry.year}
        </td>
        <td style="border: 1px solid #000000; padding: 10px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;" dir="ltr">
          ${typeof entry.amount === 'number' ? entry.amount.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : entry.amount} ₪
        </td>
      </tr>
    `).join('');
  }

  /**
   * Build HTML table rows for shareholders in mortgage income confirmation letter
   */
  private buildShareholdersTableRows(shareholders: Array<{ name: string; id_number: string; holding_percentage: number }>): string {
    if (!shareholders || shareholders.length === 0) {
      return '';
    }

    return shareholders.map(sh => `
      <tr>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${sh.name}
        </td>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${sh.id_number}
        </td>
        <td style="border: 1px solid #000000; padding: 8px; font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 14px; text-align: center;">
          ${sh.holding_percentage}%
        </td>
      </tr>
    `).join('');
  }

  // ============================================================================
  // COMPANY ONBOARDING DOCUMENTS
  // ============================================================================

  /**
   * Check if a Company Onboarding letter already exists for this client/group
   */
  async checkExistingCompanyOnboardingLetter(
    templateType: CompanyOnboardingTemplateType,
    clientId: string | null,
    groupId: string | null
  ): Promise<ServiceResponse<GeneratedLetter | null>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('generated_letters')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (groupId) {
        query = query.eq('group_calculation_id', groupId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      return { data: data || null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Generate Company Onboarding document (VAT Registration, etc.)
   * Supports both client and group recipients
   * @param options.previewOnly - If true, only generate HTML without saving to DB
   * @param options.existingLetterId - If provided, update existing letter instead of creating new
   */
  async generateCompanyOnboardingDocument(
    templateType: CompanyOnboardingTemplateType,
    clientId: string | null,
    groupId: string | null,
    variables: CompanyOnboardingVariables,
    options?: { previewOnly?: boolean; existingLetterId?: string }
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();
      const { previewOnly = false, existingLetterId } = options || {};

      // 1. Load header (using standard letter header)
      const header = await this.loadTemplateFile('components/header.html');

      // 2. Load body based on template type
      const bodyFile = this.getCompanyOnboardingBodyFileName(templateType);
      let body = await this.loadTemplateFile(`bodies/company-onboarding/${bodyFile}`);

      // 3. Handle conditional sections based on template type
      if (templateType === 'company_onboarding_vat_registration') {
        const vatVars = variables as VatRegistrationVariables;
        if (vatVars.show_wolt_section) {
          // Load and insert WOLT section
          const woltSection = await this.loadTemplateFile('bodies/company-onboarding/wolt-section.html');
          body = body.replace('{{wolt_section}}', woltSection);
        } else {
          // Remove WOLT placeholder
          body = body.replace('{{wolt_section}}', '');
        }
      }

      // Handle VAT file opened template conditionals
      if (templateType === 'company_onboarding_vat_file_opened') {
        const vatFileVars = variables as { certificate_link?: string };
        if (vatFileVars.certificate_link && vatFileVars.certificate_link.trim()) {
          const certificateSectionHtml = `
                <tr>
                    <td style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.7; color: #09090b; text-align: right; padding-bottom: 8px;">
                        <span style="color: #cc0000; font-size: 18px; margin-left: 5px;">◆</span>
                        <span>תעודת עוסק מורשה: </span>
                        <a href="${vatFileVars.certificate_link}" target="_blank" style="color: #395BF7; text-decoration: underline;">לצפייה בתעודה</a>
                    </td>
                </tr>`;
          body = body.replace('{{certificate_section}}', certificateSectionHtml);
        } else {
          body = body.replace('{{certificate_section}}', '');
        }
      }

      // Handle price quote template conditionals (both small company and restaurant)
      if (templateType === 'company_onboarding_price_quote_small' || templateType === 'company_onboarding_price_quote_restaurant') {
        const priceVars = variables as PriceQuoteVariables;

        // Handle transfer section - use appropriate file based on template type
        if (priceVars.show_transfer_section) {
          const transferFile = templateType === 'company_onboarding_price_quote_restaurant'
            ? 'bodies/company-onboarding/transfer-section-restaurant.html'
            : 'bodies/company-onboarding/transfer-section.html';
          const transferSection = await this.loadTemplateFile(transferFile);
          body = body.replace('{{transfer_section}}', transferSection);
        } else {
          body = body.replace('{{transfer_section}}', '');
        }

        // Handle additional notes section
        if (priceVars.additional_notes && priceVars.additional_notes.trim()) {
          const additionalNotesHtml = `
<tr>
    <td style="padding-top: 15px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.7; color: #09090b; text-align: right;">
            ${priceVars.additional_notes.replace(/\n/g, '<br>')}
        </div>
    </td>
</tr>`;
          body = body.replace('{{additional_notes_section}}', additionalNotesHtml);
        } else {
          body = body.replace('{{additional_notes_section}}', '');
        }
      }

      // 4. Load footer (same as regular letters)
      const footer = await this.loadTemplateFile('components/footer.html');

      // 5. Process variables
      const processedVariables = this.processCompanyOnboardingVariables(templateType, variables);

      // 6. Build full HTML
      let fullHtml = this.buildCompanyOnboardingHTML(header, body, footer);

      // 7. Replace all variables - WHITELIST HTML VARIABLES for recipient line and subjects
      const htmlVariables = ['custom_header_lines', 'subjects_section'];
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables, htmlVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 8. If preview only, return without saving
      if (previewOnly) {
        return {
          data: {
            id: 'preview',
            tenant_id: tenantId,
            client_id: clientId,
            group_id: groupId,
            group_calculation_id: null,
            template_id: null,
            template_type: templateType,
            fee_calculation_id: null,
            variables_used: processedVariables,
            generated_content_html: fullHtml,
            generated_content_text: plainText,
            payment_link: null,
            subject: (variables as { subject?: string }).subject || 'מסמך קליטת חברה',
            status: 'draft',
            created_at: new Date().toISOString(),
            created_by: null,
            created_by_name: null
          } as GeneratedLetter,
          error: null
        };
      }

      const user = await supabase.auth.getUser();
      const letterData = {
        tenant_id: tenantId,
        client_id: clientId,
        group_id: groupId,
        group_calculation_id: null,
        template_id: null,
        template_type: templateType,
        fee_calculation_id: null,
        variables_used: processedVariables,
        generated_content_html: fullHtml,
        generated_content_text: plainText,
        payment_link: null,
        subject: (variables as { subject?: string }).subject || 'מסמך קליטת חברה',
        status: 'saved' as const,
        created_by: user.data.user?.id,
        created_by_name: user.data.user?.user_metadata?.full_name || user.data.user?.email
      };

      let generatedLetter: GeneratedLetter;

      // 9. Update existing or insert new
      if (existingLetterId) {
        // Update existing letter
        const { data, error: updateError } = await supabase
          .from('generated_letters')
          .update(letterData)
          .eq('id', existingLetterId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) throw updateError;
        generatedLetter = data;

        await this.logAction('update_company_onboarding_document', generatedLetter.id, {
          template_type: templateType,
          client_id: clientId,
          group_id: groupId
        });
      } else {
        // Insert new letter
        const { data, error: saveError } = await supabase
          .from('generated_letters')
          .insert({
            ...letterData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) throw saveError;
        generatedLetter = data;

        await this.logAction('generate_company_onboarding_document', generatedLetter.id, {
          template_type: templateType,
          client_id: clientId,
          group_id: groupId
        });
      }

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get body file name from Company Onboarding template type
   */
  private getCompanyOnboardingBodyFileName(templateType: CompanyOnboardingTemplateType): string {
    const bodyMap: Record<CompanyOnboardingTemplateType, string> = {
      'company_onboarding_vat_registration': 'vat-registration.html',
      'company_onboarding_vat_file_opened': 'vat-file-opened.html',
      'company_onboarding_price_quote_small': 'price-quote-small.html',
      'company_onboarding_price_quote_restaurant': 'price-quote-restaurant.html',
      'company_onboarding_previous_accountant': 'previous-accountant-request.html'
    };

    return bodyMap[templateType];
  }

  /**
   * Build full HTML for Company Onboarding document
   */
  private buildCompanyOnboardingHTML(header: string, body: string, footer: string): string {
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מכתב קליטת חברה</title>
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
   * Process Company Onboarding variables - build dynamic content
   */
  private processCompanyOnboardingVariables(
    templateType: CompanyOnboardingTemplateType,
    variables: CompanyOnboardingVariables
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = { ...variables };

    // Format document date to Israeli format
    if (!processed.document_date) {
      processed.letter_date = this.formatIsraeliDate(new Date());
    } else if (typeof processed.document_date === 'string') {
      processed.letter_date = this.formatIsraeliDate(new Date(processed.document_date as string));
    }

    // Build custom header lines for recipient line (contact person + title)
    // font-size: 20px to match the main recipient section in header.html
    if (variables.recipient_line && variables.recipient_line.trim()) {
      processed.custom_header_lines = `
        <tr>
          <td colspan="2" style="padding-top: 5px;">
            <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 20px; line-height: 1.1; font-weight: 700; color: #000000; text-align: right;">
              ${variables.recipient_line}
            </div>
          </td>
        </tr>
      `;
    } else {
      processed.custom_header_lines = '';
    }

    // Clear group_name if not applicable (when using client)
    if (!processed.group_name) {
      processed.group_name = '';
    }

    // Handle price quote specific formatting (both small company and restaurant)
    if (templateType === 'company_onboarding_price_quote_small' || templateType === 'company_onboarding_price_quote_restaurant') {
      const priceVars = variables as PriceQuoteVariables;

      // Format fee amount with thousands separator
      if (priceVars.fee_amount && priceVars.fee_amount > 0) {
        processed.fee_amount_formatted = priceVars.fee_amount.toLocaleString('he-IL');
      } else {
        processed.fee_amount_formatted = '0';
      }
    }

    // Handle previous accountant request - build subjects_section from subjects array
    // Format: הנדון: חברה א
    //                חברה ב  (indented to align under first subject)
    if (templateType === 'company_onboarding_previous_accountant') {
      const subjects = (variables as { subjects?: string[] }).subjects;
      if (Array.isArray(subjects) && subjects.length > 0) {
        if (subjects.length === 1) {
          processed.subjects_section = `הנדון: ${subjects[0]}`;
        } else {
          // First subject with "הנדון:" prefix
          const firstLine = `הנדון: ${subjects[0]}`;
          // Subsequent subjects indented to align (using padding-right in RTL)
          const otherLines = subjects.slice(1).map(subject =>
            `<div style="padding-right: 65px;">${subject}</div>`
          ).join('');
          processed.subjects_section = firstLine + otherLines;
        }
      } else {
        processed.subjects_section = 'הנדון: ';
      }
    }

    // Handle VAT file opened - format the first report date from YYYY-MM-DD to DD/MM/YYYY
    if (templateType === 'company_onboarding_vat_file_opened') {
      const vatFirstReportDate = (variables as { vat_first_report_date?: string }).vat_first_report_date;
      if (vatFirstReportDate && typeof vatFirstReportDate === 'string') {
        // Convert from YYYY-MM-DD to DD/MM/YYYY
        const dateParts = vatFirstReportDate.split('-');
        if (dateParts.length === 3) {
          processed.vat_first_report_date = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
        }
      }
    }

    return processed;
  }

  // ============================================================================
  // CAPITAL DECLARATION DOCUMENTS
  // ============================================================================

  /**
   * Generate Capital Declaration document (הצהרת הון)
   * @param clientId - Optional client ID for linking to history
   * @param groupId - Optional group ID for linking to history
   * @param variables - Template variables including portal_link
   * @param options.previewOnly - If true, only generate HTML without saving to DB
   */
  async generateCapitalDeclarationDocument(
    clientId: string | null,
    groupId: string | null,
    variables: Record<string, unknown>,
    options?: { previewOnly?: boolean }
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const { previewOnly = false } = options || {};
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Load header
      const header = await this.loadTemplateFile('components/header.html');

      // 2. Load capital declaration body
      const body = await this.loadTemplateFile('bodies/capital-declaration/capital-declaration.html');

      // 3. Load footer
      const footer = await this.loadTemplateFile('components/footer.html');

      // 4. Process variables
      const processedVariables: Record<string, unknown> = {
        ...variables,
        letter_date: this.formatIsraeliDate(new Date()),
        custom_header_lines: '',
        group_name: variables.group_name || '', // Default to empty if no group
      };

      // 5. Build full HTML
      let fullHtml = this.buildCapitalDeclarationHTML(header, body, footer);

      // 6. Replace all variables
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. If preview only, return without saving to DB
      if (previewOnly) {
        return {
          data: {
            id: 'preview',
            generated_content_html: fullHtml,
            generated_content_text: plainText,
            variables_used: processedVariables,
            subject: (variables.subject as string) || 'הצהרת הון',
          } as GeneratedLetter,
          error: null,
        };
      }

      // 8. Get user name for created_by_name (using email)
      const createdByName = user?.email || 'Unknown';

      // 9. Save to database
      const letterData = {
        tenant_id: tenantId,
        template_type: 'capital_declaration',
        client_id: clientId,
        group_calculation_id: groupId,
        variables_used: processedVariables,
        generated_content_html: fullHtml,
        generated_content_text: plainText,
        subject: (variables.subject as string) || 'הצהרת הון',
        status: 'saved',
        created_by: user?.id,
        created_by_name: createdByName,
      };

      const { data, error } = await supabase
        .from('generated_letters')
        .insert(letterData)
        .select()
        .single();

      if (error) throw error;

      return { data: data as GeneratedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Preview capital declaration template (without saving to DB)
   * Used for previewing reminder letters and other capital declaration templates
   */
  async previewCapitalDeclarationTemplate(
    templateName: string,
    variables: Record<string, unknown>
  ): Promise<ServiceResponse<string>> {
    try {
      // 1. Load header
      const header = await this.loadTemplateFile('components/header.html');

      // 2. Load body based on template name
      const body = await this.loadTemplateFile(`bodies/capital-declaration/${templateName}.html`);

      // 3. Load footer
      const footer = await this.loadTemplateFile('components/footer.html');

      // 4. Process variables - include header variables
      const processedVariables: Record<string, unknown> = {
        ...variables,
        letter_date: variables.letter_date || this.formatIsraeliDate(new Date()),
        // Header variables - use contact_name as company_name for personal letters
        company_name: variables.company_name || variables.contact_name || '',
        group_name: variables.group_name || '',
        custom_header_lines: variables.custom_header_lines || '',
      };

      // 5. Build full HTML
      let fullHtml = this.buildCapitalDeclarationHTML(header, body, footer);

      // 6. Replace all variables
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables);

      // 7. Replace CID images with web paths for browser preview
      fullHtml = this.replaceCidWithWebPaths(fullHtml);

      return { data: fullHtml, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Generate capital declaration document from template name (with saving to DB)
   */
  async generateCapitalDeclarationFromTemplate(
    templateName: string,
    variables: Record<string, unknown>,
    options?: {
      clientId?: string;
      groupId?: string;
      letterName?: string;
    }
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Load header
      const header = await this.loadTemplateFile('components/header.html');

      // 2. Load body based on template name
      const body = await this.loadTemplateFile(`bodies/capital-declaration/${templateName}.html`);

      // 3. Load footer
      const footer = await this.loadTemplateFile('components/footer.html');

      // 4. Process variables - include header variables
      const processedVariables: Record<string, unknown> = {
        ...variables,
        letter_date: variables.letter_date || this.formatIsraeliDate(new Date()),
        // Header variables - use contact_name as company_name for personal letters
        company_name: variables.company_name || variables.contact_name || '',
        group_name: variables.group_name || '',
        custom_header_lines: variables.custom_header_lines || '',
      };

      // 5. Build full HTML
      let fullHtml = this.buildCapitalDeclarationHTML(header, body, footer);

      // 6. Replace all variables
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. Get user name for created_by_name (using email)
      const createdByName = user?.email || 'Unknown';

      // 8. Save to database
      const letterData = {
        tenant_id: tenantId,
        template_type: `capital_declaration_${templateName}`,
        client_id: options?.clientId || null,
        group_calculation_id: options?.groupId || null,
        variables_used: processedVariables,
        generated_content_html: fullHtml,
        generated_content_text: plainText,
        subject: options?.letterName || `הצהרת הון - ${templateName}`,
        status: 'saved',
        created_by: user?.id,
        created_by_name: createdByName,
      };

      const { data, error } = await supabase
        .from('generated_letters')
        .insert(letterData)
        .select()
        .single();

      if (error) throw error;

      return { data: data as GeneratedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Build full HTML for Capital Declaration document
   */
  private buildCapitalDeclarationHTML(header: string, body: string, footer: string): string {
    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>הצהרת הון</title>
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

  // ============================================================================
  // AUTO LETTERS - SETTING DATES & MISSING DOCUMENTS
  // ============================================================================

  /**
   * Generate Auto Letter document (Setting Dates, Missing Documents)
   * Uses same header/footer as other letters with specific body templates
   * @param templateType - The template type (setting_dates_* or missing_documents_*)
   * @param clientId - Optional client ID
   * @param groupId - Optional group ID
   * @param variables - Template variables
   * @param options.previewOnly - If true, only generate HTML without saving to DB
   * @param options.existingLetterId - If provided, update existing letter instead of creating new
   */
  async generateAutoLetterDocument(
    templateType: AutoLetterTemplateType,
    clientId: string | null,
    groupId: string | null,
    variables: Record<string, unknown>,
    options?: { previewOnly?: boolean; existingLetterId?: string }
  ): Promise<ServiceResponse<GeneratedLetter>> {
    try {
      const tenantId = await this.getTenantId();
      const { previewOnly = false, existingLetterId } = options || {};

      // Check if this is a standalone template (no header/footer)
      const isStandaloneTemplate = templateType.startsWith('protocols_');

      // 1. Load header (skip for standalone templates)
      const header = isStandaloneTemplate ? '' : await this.loadTemplateFile('components/header.html');

      // 2. Load body based on template type
      const bodyFile = this.getAutoLetterBodyFileName(templateType);
      if (!bodyFile) {
        throw new Error(`Unknown template type: ${templateType}`);
      }
      const body = await this.loadTemplateFile(bodyFile);

      // 3. Load footer (skip for standalone templates)
      const footer = isStandaloneTemplate ? '' : await this.loadTemplateFile('components/footer.html');

      // 4. Process variables
      const processedVariables = this.processAutoLetterVariables(templateType, variables);

      // 5. Build full HTML
      let fullHtml = this.buildAutoLetterHTML(header, body, footer, templateType);

      // 5.1. Process Mustache conditional sections (e.g., {{#has_dividend}}...{{/has_dividend}})
      fullHtml = this.processMustacheSections(fullHtml, processedVariables);

      // 6. Replace all variables - WHITELIST HTML VARIABLES for recipient line
      const htmlVariables = ['custom_header_lines', 'missing_documents_html', 'deadline_section', 'additional_notes_section', 'google_drive_section', 'income_table_rows', 'shareholders_table', 'subjects_section', 'attendees_list', 'paragraph2_section', 'days_text', 'strong_text_section', 'urgent_banner_section', 'closing_text', 'group_name'];
      fullHtml = TemplateParser.replaceVariables(fullHtml, processedVariables, htmlVariables);
      const plainText = TemplateParser.htmlToText(fullHtml);

      // 7. If preview only, return without saving
      if (previewOnly) {
        return {
          data: {
            id: 'preview',
            tenant_id: tenantId,
            client_id: clientId,
            group_calculation_id: groupId,
            template_id: null,
            template_type: templateType,
            fee_calculation_id: null,
            variables_used: processedVariables,
            generated_content_html: fullHtml,
            generated_content_text: plainText,
            payment_link: null,
            subject: (variables.subject as string) || this.getAutoLetterDefaultSubject(templateType),
            status: 'draft',
            created_at: new Date().toISOString(),
            created_by: null,
            created_by_name: null
          } as GeneratedLetter,
          error: null
        };
      }

      const user = await supabase.auth.getUser();
      const letterData = {
        tenant_id: tenantId,
        client_id: clientId,
        group_calculation_id: groupId,
        template_id: null,
        template_type: templateType,
        fee_calculation_id: null,
        variables_used: processedVariables,
        generated_content_html: fullHtml,
        generated_content_text: plainText,
        payment_link: null,
        subject: (variables.subject as string) || this.getAutoLetterDefaultSubject(templateType),
        status: 'saved' as const,
        created_by: user.data.user?.id,
        created_by_name: user.data.user?.user_metadata?.full_name || user.data.user?.email
      };

      let generatedLetter: GeneratedLetter;

      // 8. Update existing or insert new
      if (existingLetterId) {
        const { data, error: updateError } = await supabase
          .from('generated_letters')
          .update(letterData)
          .eq('id', existingLetterId)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError) throw updateError;
        generatedLetter = data;

        await this.logAction('update_auto_letter_document', generatedLetter.id, {
          template_type: templateType,
          client_id: clientId,
          group_id: groupId
        });
      } else {
        const { data, error: saveError } = await supabase
          .from('generated_letters')
          .insert({
            ...letterData,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (saveError) throw saveError;
        generatedLetter = data;

        await this.logAction('generate_auto_letter_document', generatedLetter.id, {
          template_type: templateType,
          client_id: clientId,
          group_id: groupId
        });
      }

      return { data: generatedLetter, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Check for existing auto letter for a client/group
   */
  async checkExistingAutoLetter(
    templateType: AutoLetterTemplateType,
    clientId: string | null,
    groupId: string | null
  ): Promise<ServiceResponse<GeneratedLetter | null>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from('generated_letters')
        .select('id, created_at')
        .eq('tenant_id', tenantId)
        .eq('template_type', templateType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else if (groupId) {
        query = query.eq('group_calculation_id', groupId);
      } else {
        return { data: null, error: null };
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      return { data: data as GeneratedLetter | null, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get body file path from auto letter template type
   */
  private getAutoLetterBodyFileName(templateType: AutoLetterTemplateType): string | null {
    const bodyMap: Record<AutoLetterTemplateType, string> = {
      'company_onboarding_vat_registration': 'bodies/company-onboarding/vat-registration.html',
      'company_onboarding_previous_accountant': 'bodies/company-onboarding/previous-accountant-request.html',
      'setting_dates_cutoff': 'bodies/setting-dates/cutoff-date.html',
      'setting_dates_meeting_reminder': 'bodies/setting-dates/meeting-reminder.html',
      'setting_dates_general_deadline': 'bodies/setting-dates/general-deadline.html',
      'setting_dates_financial_statements': 'bodies/setting-dates/financial-statements.html',
      'missing_documents_general': 'bodies/missing-documents/general-missing.html',
      'reminder_letters_personal_report': 'bodies/reminder-letters/personal-report-reminder.html',
      'reminder_letters_bookkeeper_balance': 'bodies/reminder-letters/bookkeeper-balance-reminder.html',
      'bank_approvals_income_confirmation': 'bodies/bank-approvals/income-confirmation.html',
      // Mortgage Approvals
      'mortgage_approvals_audited_company': 'bodies/mortgage-approvals/audited-company.html',
      'mortgage_approvals_unaudited_company': 'bodies/mortgage-approvals/unaudited-company.html',
      'mortgage_approvals_osek_submitted': 'bodies/mortgage-approvals/osek-submitted.html',
      'mortgage_approvals_osek_unsubmitted': 'bodies/mortgage-approvals/osek-unsubmitted.html',
      'tax_notices_payment_notice': 'bodies/tax-notices/tax-payment-notice.html',
      'company_registrar_annual_fee': 'bodies/tax-notices/annual-fee-notice.html',
      // Audit Completion
      'audit_completion_general': 'bodies/audit-completion/general.html',
      // Protocols
      'protocols_accountant_appointment': 'bodies/protocols/accountant-appointment.html',
      // Tax Advances
      'tax_advances_rate_notification': 'bodies/tax-advances/rate-notification.html',
      // Tax Refund
      'tax_refund_request': 'bodies/tax-refund/request.html'
    };

    return bodyMap[templateType] || null;
  }

  /**
   * Get default subject for auto letter type
   */
  private getAutoLetterDefaultSubject(templateType: AutoLetterTemplateType): string {
    const subjectMap: Record<AutoLetterTemplateType, string> = {
      'company_onboarding_vat_registration': 'הנחיות לפתיחת תיק במע"מ',
      'company_onboarding_previous_accountant': 'פנייה לרואה חשבון קודם למשיכת תיקים',
      'setting_dates_cutoff': 'קביעת מועד חיתוך לדו"חות',
      'setting_dates_meeting_reminder': 'תזכורת לפגישה',
      'setting_dates_general_deadline': 'הודעה על דדליין',
      'setting_dates_financial_statements': 'הזמנה לישיבה על מאזנים',
      'missing_documents_general': 'בקשה להמצאת מסמכים חסרים',
      'reminder_letters_personal_report': 'השלמות לדוח האישי',
      'reminder_letters_bookkeeper_balance': 'סיכום פרטיכל מישיבה',
      'bank_approvals_income_confirmation': 'אישור הכנסות',
      // Mortgage Approvals
      'mortgage_approvals_audited_company': 'אישור רו"ח למשכנתא - בעל שליטה (דוחות מבוקרים)',
      'mortgage_approvals_unaudited_company': 'אישור רו"ח למשכנתא - בעל שליטה (דוחות בלתי מבוקרים)',
      'mortgage_approvals_osek_submitted': 'אישור רו"ח למשכנתא - עוסק (דוח הוגש)',
      'mortgage_approvals_osek_unsubmitted': 'אישור רו"ח למשכנתא - עוסק (דוח בלתי מבוקר)',
      'tax_notices_payment_notice': 'יתרת מס לתשלום בגין שנת המס',
      'company_registrar_annual_fee': 'חיוב אגרה שנתית לרשם החברות',
      // Audit Completion
      'audit_completion_general': 'סיום ביקורת ועריכת דוח כספי',
      // Protocols
      'protocols_accountant_appointment': 'פרוטוקול מאסיפת בעלי המניות',
      // Tax Advances
      'tax_advances_rate_notification': 'הודעה על שיעור מקדמות מס',
      // Tax Refund
      'tax_refund_request': 'בקשה להחזר מס'
    };

    return subjectMap[templateType] || 'מכתב';
  }

  /**
   * Build full HTML for auto letter document
   */
  private buildAutoLetterHTML(
    header: string,
    body: string,
    footer: string,
    templateType: AutoLetterTemplateType
  ): string {
    const titleMap: Record<AutoLetterTemplateType, string> = {
      'company_onboarding_vat_registration': 'מכתב קליטת חברה',
      'company_onboarding_previous_accountant': 'פנייה לרואה חשבון קודם',
      'setting_dates_cutoff': 'קביעת מועד חיתוך',
      'setting_dates_meeting_reminder': 'תזכורת לפגישה',
      'setting_dates_general_deadline': 'הודעה על דדליין',
      'setting_dates_financial_statements': 'ישיבה על מאזנים',
      'missing_documents_general': 'בקשה למסמכים חסרים',
      'reminder_letters_personal_report': 'תזכורת למסמכים',
      'reminder_letters_bookkeeper_balance': 'זירוז מנה"ח',
      'bank_approvals_income_confirmation': 'אישור הכנסות',
      // Mortgage Approvals
      'mortgage_approvals_audited_company': 'אישור משכנתא - בעל שליטה מבוקר',
      'mortgage_approvals_unaudited_company': 'אישור משכנתא - בעל שליטה',
      'mortgage_approvals_osek_submitted': 'אישור משכנתא - עוסק',
      'mortgage_approvals_osek_unsubmitted': 'אישור משכנתא - עוסק',
      'tax_notices_payment_notice': 'הודעה על יתרת מס לתשלום',
      'company_registrar_annual_fee': 'אגרה שנתית לרשם החברות',
      // Audit Completion
      'audit_completion_general': 'סיום ביקורת דוחות כספיים',
      // Protocols
      'protocols_accountant_appointment': 'פרוטוקול מאסיפת בעלי המניות',
      // Tax Advances
      'tax_advances_rate_notification': 'הודעה על שיעור מקדמות מס',
      // Tax Refund
      'tax_refund_request': 'בקשה להחזר מס'
    };

    const title = titleMap[templateType] || 'מכתב';

    return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
   * Process auto letter variables - build dynamic content
   */
  private processAutoLetterVariables(
    templateType: AutoLetterTemplateType,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const processed: Record<string, unknown> = { ...variables };

    // Format document date to Israeli format
    if (!processed.document_date) {
      processed.letter_date = this.formatIsraeliDate(new Date());
    } else if (typeof processed.document_date === 'string') {
      processed.letter_date = this.formatIsraeliDate(new Date(processed.document_date as string));
    }

    // Build custom header lines for recipient line
    if (variables.recipient_line && (variables.recipient_line as string).trim()) {
      processed.custom_header_lines = `
        <tr>
          <td colspan="2" style="padding-top: 5px;">
            <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 20px; line-height: 1.1; font-weight: 700; color: #000000; text-align: right;">
              ${variables.recipient_line}
            </div>
          </td>
        </tr>
      `;
    } else {
      processed.custom_header_lines = '';
    }

    // Clear group_name if not applicable
    if (!processed.group_name) {
      processed.group_name = '';
    }

    // Process specific template variables
    switch (templateType) {
      case 'setting_dates_cutoff':
        // Format cutoff_date to Israeli format
        if (processed.cutoff_date && typeof processed.cutoff_date === 'string') {
          processed.cutoff_date_formatted = this.formatIsraeliDate(new Date(processed.cutoff_date as string));
        }
        break;

      case 'setting_dates_meeting_reminder':
        // Format meeting_date to Israeli format
        if (processed.meeting_date && typeof processed.meeting_date === 'string') {
          processed.meeting_date_formatted = this.formatIsraeliDate(new Date(processed.meeting_date as string));
        }
        // Format time (HH:MM)
        if (processed.meeting_time && typeof processed.meeting_time === 'string') {
          processed.meeting_time_formatted = processed.meeting_time;
        }
        break;

      case 'setting_dates_general_deadline':
        // Format deadline_date to Israeli format
        if (processed.deadline_date && typeof processed.deadline_date === 'string') {
          processed.deadline_date_formatted = this.formatIsraeliDate(new Date(processed.deadline_date as string));
        }
        break;

      case 'setting_dates_financial_statements':
        // Format meeting_date to Israeli format
        if (processed.meeting_date && typeof processed.meeting_date === 'string') {
          processed.meeting_date_formatted = this.formatIsraeliDate(new Date(processed.meeting_date as string));
        }
        // Format time
        if (processed.meeting_time && typeof processed.meeting_time === 'string') {
          processed.meeting_time_formatted = processed.meeting_time;
        }
        break;

      case 'missing_documents_general':
        // Format deadline_date if provided
        if (processed.deadline_date && typeof processed.deadline_date === 'string') {
          processed.deadline_date_formatted = this.formatIsraeliDate(new Date(processed.deadline_date as string));
          processed.has_deadline = true;
          // Generate deadline section HTML
          processed.deadline_section = `
<tr>
    <td style="padding-top: 20px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.7; color: #09090b; text-align: justify;">
            <strong>מועד אחרון להמצאת המסמכים: ${processed.deadline_date_formatted}</strong>
        </div>
    </td>
</tr>`;
        } else {
          processed.has_deadline = false;
          processed.deadline_date_formatted = '';
          processed.deadline_section = '';
        }
        // Convert missing_documents_list text to HTML (preserve line breaks)
        if (processed.missing_documents_list && typeof processed.missing_documents_list === 'string') {
          const lines = (processed.missing_documents_list as string).split('\n').filter(l => l.trim());
          processed.missing_documents_html = lines.map(line =>
            `<li style="margin-bottom: 5px;">${line.trim()}</li>`
          ).join('\n');
        } else {
          processed.missing_documents_html = '';
        }
        break;

      case 'reminder_letters_personal_report':
        // Generate google_drive_section if link provided
        if (processed.google_drive_link && typeof processed.google_drive_link === 'string' && processed.google_drive_link.trim()) {
          processed.google_drive_section = `
<tr>
    <td style="padding-top: 15px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.7; color: #09090b; text-align: justify;">
            לשרותך לינק להעברת מסמכים למחיצה בגוגל דרייב שהקמנו עבורך.
        </div>
    </td>
</tr>`;
        } else {
          processed.google_drive_section = '';
        }
        break;

      case 'reminder_letters_bookkeeper_balance':
        // Format meeting_date to Israeli format
        if (processed.meeting_date && typeof processed.meeting_date === 'string') {
          processed.meeting_date_formatted = this.formatIsraeliDate(new Date(processed.meeting_date as string));
        }
        // Calculate next fiscal year
        if (processed.fiscal_year && typeof processed.fiscal_year === 'string') {
          processed.next_fiscal_year = String(Number(processed.fiscal_year) + 1);
        }
        break;

      case 'bank_approvals_income_confirmation':
        // For Income Confirmation, the header's "לכבוד" should show the bank (recipient_name)
        // Save the original company_name for use in the body template
        processed.confirmed_company_name = processed.company_name;
        processed.confirmed_company_id = processed.company_id;
        // Swap: header will show recipient (bank), body uses confirmed_company_name
        processed.company_name = processed.recipient_name;
        // group_name should be empty for bank letters (no client group hierarchy)
        processed.group_name = (processed.applicant_name as string) || '';

        // Build income table rows
        if (Array.isArray(processed.income_entries)) {
          processed.income_table_rows = this.buildIncomeTableRows(
            processed.income_entries as Array<{ month: string; year: number; amount: number }>
          );
        } else {
          processed.income_table_rows = '';
        }
        break;

      case 'mortgage_approvals_audited_company':
        // Save original company_name for body template's "הנדון"
        processed.entity_name = processed.company_name;
        processed.entity_id = processed.company_id;
        // Header "לכבוד" shows entity_name (company/client name)
        // If hide_recipient_header is true (adhoc recipient is the applicant), clear company_name
        if (processed.hide_recipient_header) {
          processed.company_name = '';
        }
        processed.group_name = (processed.applicant_name as string) || '';

        // Compute previous_year from audited_year
        if (processed.audited_year && typeof processed.audited_year === 'number') {
          processed.previous_year = (processed.audited_year as number) - 1;
        }

        // Format audit_date to Israeli format
        if (processed.audit_date && typeof processed.audit_date === 'string') {
          processed.audit_date = this.formatIsraeliDate(new Date(processed.audit_date as string));
        }

        // Format registrar_report_date to Israeli format
        if (processed.registrar_report_date && typeof processed.registrar_report_date === 'string') {
          processed.registrar_report_date = this.formatIsraeliDate(new Date(processed.registrar_report_date as string));
        }

        // Format dividend_date to Israeli format (if exists)
        if (processed.dividend_date && typeof processed.dividend_date === 'string') {
          processed.dividend_date = this.formatIsraeliDate(new Date(processed.dividend_date as string));
        }

        // Format currency values
        if (typeof processed.revenue_turnover === 'number') {
          processed.revenue_turnover = processed.revenue_turnover.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.net_profit_current === 'number') {
          processed.net_profit_current = processed.net_profit_current.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.net_profit_previous === 'number') {
          processed.net_profit_previous = processed.net_profit_previous.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.retained_earnings === 'number') {
          processed.retained_earnings = processed.retained_earnings.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }

        // Build shareholders table rows
        if (Array.isArray(processed.shareholders)) {
          processed.shareholders_table = this.buildShareholdersTableRows(
            processed.shareholders as Array<{ name: string; id_number: string; holding_percentage: number }>
          );
        } else {
          processed.shareholders_table = '';
        }
        break;

      case 'mortgage_approvals_unaudited_company':
        // Save original company_name for body template's "הנדון"
        processed.entity_name = processed.company_name;
        processed.entity_id = processed.company_id;
        // Header "לכבוד" shows entity_name (company/client name)
        // If hide_recipient_header is true (adhoc recipient is the applicant), clear company_name
        if (processed.hide_recipient_header) {
          processed.company_name = '';
        }
        processed.group_name = (processed.applicant_name as string) || '';

        // Format period_end_date to Israeli format
        if (processed.period_end_date && typeof processed.period_end_date === 'string') {
          processed.period_end_date = this.formatIsraeliDate(new Date(processed.period_end_date as string));
        }

        // Format registrar_report_date to Israeli format
        if (processed.registrar_report_date && typeof processed.registrar_report_date === 'string') {
          processed.registrar_report_date = this.formatIsraeliDate(new Date(processed.registrar_report_date as string));
        }

        // Format dividend_date to Israeli format (if exists)
        if (processed.dividend_date && typeof processed.dividend_date === 'string') {
          processed.dividend_date = this.formatIsraeliDate(new Date(processed.dividend_date as string));
        }

        // Format currency values
        if (typeof processed.revenue_turnover === 'number') {
          processed.revenue_turnover = processed.revenue_turnover.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.salary_expenses === 'number') {
          processed.salary_expenses = processed.salary_expenses.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.applicant_salary === 'number') {
          processed.applicant_salary = processed.applicant_salary.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.estimated_profit === 'number') {
          processed.estimated_profit = processed.estimated_profit.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.ebitda_adjusted === 'number') {
          processed.ebitda_adjusted = processed.ebitda_adjusted.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }

        // Build shareholders table rows
        if (Array.isArray(processed.shareholders)) {
          processed.shareholders_table = this.buildShareholdersTableRows(
            processed.shareholders as Array<{ name: string; id_number: string; holding_percentage: number }>
          );
        } else {
          processed.shareholders_table = '';
        }
        break;

      case 'mortgage_approvals_osek_submitted':
        // Save original company_name for body template's "הנדון"
        processed.entity_name = processed.company_name;
        processed.entity_id = processed.company_id;
        // Header "לכבוד" shows entity_name (company/client name)
        // If hide_recipient_header is true (adhoc recipient is the applicant), clear company_name
        if (processed.hide_recipient_header) {
          processed.company_name = '';
        }
        processed.group_name = (processed.applicant_name as string) || '';

        // Format submission_date to Israeli format
        if (processed.submission_date && typeof processed.submission_date === 'string') {
          processed.submission_date = this.formatIsraeliDate(new Date(processed.submission_date as string));
        }

        // Format currency values
        if (typeof processed.revenue_turnover === 'number') {
          processed.revenue_turnover = processed.revenue_turnover.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.taxable_income === 'number') {
          processed.taxable_income = processed.taxable_income.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.income_tax === 'number') {
          processed.income_tax = processed.income_tax.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        break;

      case 'mortgage_approvals_osek_unsubmitted':
        // Save original company_name for body template's "הנדון"
        processed.entity_name = processed.company_name;
        processed.entity_id = processed.company_id;
        // Header "לכבוד" shows entity_name (company/client name)
        // If hide_recipient_header is true (adhoc recipient is the applicant), clear company_name
        if (processed.hide_recipient_header) {
          processed.company_name = '';
        }
        processed.group_name = (processed.applicant_name as string) || '';

        // Format period_end_date to Israeli format
        if (processed.period_end_date && typeof processed.period_end_date === 'string') {
          processed.period_end_date = this.formatIsraeliDate(new Date(processed.period_end_date as string));
        }

        // Format last_submission_date to Israeli format
        if (processed.last_submission_date && typeof processed.last_submission_date === 'string') {
          processed.last_submission_date = this.formatIsraeliDate(new Date(processed.last_submission_date as string));
        }

        // Format currency values
        if (typeof processed.revenue_turnover === 'number') {
          processed.revenue_turnover = processed.revenue_turnover.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        if (typeof processed.estimated_profit === 'number') {
          processed.estimated_profit = processed.estimated_profit.toLocaleString('he-IL', { minimumFractionDigits: 0 });
        }
        break;

      case 'company_onboarding_previous_accountant':
        // Build subjects section from subjects array (multiple company names)
        if (Array.isArray(processed.subjects)) {
          const subjectsArray = processed.subjects as string[];
          if (subjectsArray.length === 1) {
            // Single subject line
            processed.subjects_section = `הנדון: ${subjectsArray[0]}`;
          } else {
            // Multiple subjects - each on its own line
            processed.subjects_section = subjectsArray
              .map((subject, index) => `הנדון ${index + 1}: ${subject}`)
              .join('<br>');
          }
        } else {
          processed.subjects_section = 'הנדון: ';
        }
        break;

      case 'tax_notices_payment_notice':
        // Format tax_amount to currency format
        if (processed.tax_amount !== undefined && typeof processed.tax_amount === 'number') {
          processed.tax_amount_formatted = new Intl.NumberFormat('he-IL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(processed.tax_amount as number) + ' ₪';
        } else {
          processed.tax_amount_formatted = '';
        }
        // Build dual subject section - two lines
        // Line 1: הודעה על יתרת מס שנותרה לתשלום בגין שנת המס {{tax_year}}
        // Line 2: company name (indented, no "הנדון:" prefix)
        const taxYear = processed.tax_year || '';
        const companyName = processed.company_name || '';
        processed.subjects_section = `הנדון: הודעה על יתרת מס שנותרה לתשלום בגין שנת המס ${taxYear}<div style="padding-right: 55px;">${companyName}</div>`;
        break;

      case 'company_registrar_annual_fee':
        // Format fee_amount to currency format
        if (processed.fee_amount !== undefined && typeof processed.fee_amount === 'number') {
          processed.fee_amount_formatted = new Intl.NumberFormat('he-IL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(processed.fee_amount as number) + ' ₪';
        } else {
          processed.fee_amount_formatted = '';
        }
        // Build subject section with fee year only (no company name)
        const feeYear = processed.fee_year || '';
        processed.subjects_section = `הנדון: חיוב אגרה שנתית לרשם החברות לשנת ${feeYear}`;
        break;

      case 'audit_completion_general':
        // Format completion_date to Israeli format (e.g., "31.01.2026")
        if (processed.completion_date && typeof processed.completion_date === 'string') {
          processed.completion_date = this.formatIsraeliDate(new Date(processed.completion_date as string));
        }
        // For Audit Completion, the header's "לכבוד" shows the addressee (bank/authority)
        // Save the original company_name for use in the body template's "הנדון"
        processed.client_name = processed.company_name;
        processed.client_id = processed.company_id;
        // Swap: header will show addressee lines, body uses client_name/client_id
        processed.company_name = processed.addressee_line1 || '';
        processed.group_name = processed.addressee_line2 || '';
        break;

      case 'protocols_accountant_appointment':
        // Format meeting_date to Hebrew date format
        if (processed.meeting_date && typeof processed.meeting_date === 'string') {
          processed.meeting_date_formatted = this.formatIsraeliDate(new Date(processed.meeting_date as string));
        }
        // Build attendees list HTML (each attendee on a new line)
        if (processed.attendees && Array.isArray(processed.attendees)) {
          processed.attendees_list = (processed.attendees as Array<{ name: string; is_chairman: boolean }>)
            .map(a => a.name?.trim())
            .filter(Boolean)
            .join('<br>');
        } else {
          processed.attendees_list = '';
        }
        // Ensure new_firm has default value
        if (!processed.new_firm) {
          processed.new_firm = "פרנקו ושות' - רואי חשבון";
        }
        break;

      case 'tax_advances_rate_notification':
        // Calculate previous_year and next_year from tax_year
        if (processed.tax_year && typeof processed.tax_year === 'number') {
          processed.previous_year = processed.tax_year - 1;
          processed.next_year = processed.tax_year + 1;
        }
        // Ensure meeting_type has default value
        if (!processed.meeting_type) {
          processed.meeting_type = 'רבעונית';
        }
        // Build subject section
        processed.subjects_section = `
<tr>
    <td style="padding-top: 15px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 26px; line-height: 1.2; font-weight: 700; color: #395BF7; text-align: right; letter-spacing: -0.3px; border-bottom: 1px solid #000000; padding-bottom: 20px;">הנדון: הודעה על שיעור מקדמות מס חברות לשנת ${processed.tax_year}</div>
    </td>
</tr>`;
        // Build paragraph2_section based on rate_is_different toggle
        if (processed.rate_is_different && processed.decided_rate) {
          processed.paragraph2_section = `
<tr>
    <td style="padding-top: 15px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.8; color: #09090b; text-align: right;">
            <strong>2.</strong> מבדיקה שערכנו עולה כי שיעור זה אינו מוצדק ולפיכך החלטנו על שיעור מקדמה של <strong>${processed.decided_rate}%</strong>.
        </div>
    </td>
</tr>`;
        } else {
          processed.paragraph2_section = `
<tr>
    <td style="padding-top: 15px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.8; color: #09090b; text-align: right;">
            <strong>2.</strong> מבדיקה שערכנו עולה כי שיעור זה מוצדק.
        </div>
    </td>
</tr>`;
        }
        break;

      case 'tax_refund_request':
        // Format refund_amount to Israeli currency
        if (processed.refund_amount !== undefined && typeof processed.refund_amount === 'number') {
          processed.refund_amount_formatted = new Intl.NumberFormat('he-IL', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(processed.refund_amount as number) + ' ₪';
        } else {
          processed.refund_amount_formatted = '';
        }
        // Format filing_date to Israeli format
        if (processed.filing_date && typeof processed.filing_date === 'string') {
          processed.filing_date_formatted = this.formatIsraeliDate(new Date(processed.filing_date as string));
        }
        // Addressee swap: header shows tax office, body shows client
        processed.client_name = processed.company_name;
        processed.client_id = processed.company_id;
        processed.company_name = processed.tax_office_name || '';
        {
          const addressee = processed.tax_office_address || '';
          processed.group_name = addressee ? `<span style="font-size: 16px; font-weight: 400;">לידי: ${addressee} מס הכנסה מחלקת דוחות שנתיים בירורים על דוח שהוגש</span>` : '';
        }
        // Days text - dynamic based on days_since_filing
        {
          const days = processed.days_since_filing || 30;
          const daysContent = `נכון למועד איגרת זו חלפו ${days} יום (כאמור בסעיף 159א' לפקודת מס הכנסה) מיום הגשת הדוח.`;
          processed.days_text = processed.show_strong_text
            ? `<strong style="color: #991b1b;">${daysContent}</strong>`
            : daysContent;
        }
        // Urgent banner (conditional)
        if (processed.is_urgent) {
          processed.urgent_banner_section = `
<tr>
    <td style="padding-top: 6px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 22px; font-weight: 700; color: #dc2626; text-align: center; padding: 4px 0; border: 2px solid #dc2626; border-radius: 4px; background-color: #fef2f2;">
            הודעה דחופה
        </div>
    </td>
</tr>`;
        } else {
          processed.urgent_banner_section = '';
        }
        // Strong text section (conditional) + closing text
        if (processed.show_strong_text) {
          processed.strong_text_section = `<li style="margin-bottom: 1px;">
                    ולמרות פניות חוזרות ונשנות טרם התקבל ההחזר.
                </li>`;
          processed.closing_text = '<strong><u>ולאחר שמיצינו את כל הפניות מצידנו, נבקשכם בתוקף לזרז את החזר המס המגיע לחברה ולהעבירו ללא דיחוי נוסף.</u></strong>';
        } else {
          processed.strong_text_section = '';
          processed.closing_text = '<u>נבקשכם לזרז את החזר המס המגיע לחברה ולהעבירו בהקדם האפשרי.</u>';
        }
        // Build subjects_section with client name, ח.פ., and tax year
        {
          const clientName = processed.client_name || '';
          const clientId = processed.client_id || '';
          const taxYear = processed.tax_year || '';
          processed.subjects_section = `
<tr>
    <td style="padding-top: 6px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 26px; line-height: 1.15; font-weight: 700; color: #395BF7; text-align: right; letter-spacing: -0.3px; border-bottom: 1px solid #000000; padding-bottom: 8px;"><span>הנדון: ${clientName} ח.פ. ${clientId}:</span><br/><span style="opacity: 0;">הנדון: </span><span>בקשה להחזר מס בגין שנת ${taxYear}</span></div>
    </td>
</tr>`;
        }
        break;
    }

    // Generate additional_notes_section for all auto letters
    if (processed.additional_notes && typeof processed.additional_notes === 'string' && processed.additional_notes.trim()) {
      processed.additional_notes_section = `
<tr>
    <td style="padding-top: 20px;">
        <div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 15px; line-height: 1.7; color: #09090b; text-align: justify;">
            <strong>הערות נוספות:</strong><br>
            ${processed.additional_notes}
        </div>
    </td>
</tr>`;
    } else {
      processed.additional_notes_section = '';
    }

    return processed;
  }

  /**
   * Process Mustache-style conditional sections in templates
   * Handles {{#variable}}...{{/variable}} patterns
   * If variable is truthy, keeps content; if falsy, removes it
   */
  private processMustacheSections(template: string, variables: Record<string, unknown>): string {
    let result = template;

    // Match {{#variable}}...{{/variable}} patterns (with newlines)
    const sectionPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

    result = result.replace(sectionPattern, (match, variableName, content) => {
      const value = variables[variableName];
      // If variable is truthy, keep the content; otherwise remove it
      if (value) {
        return content;
      }
      return '';
    });

    return result;
  }
}

// Export singleton instance
export const templateService = new TemplateService();
