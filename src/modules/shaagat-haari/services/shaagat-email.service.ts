/**
 * Shaagat HaAri Grants — Email Service
 *
 * Sends grant-related emails via the send-letter edge function (simpleMode)
 * and logs each send to shaagat_email_logs + generated_letters.
 *
 * Email types (from PRD section 5):
 *   1. NOT_ELIGIBLE            — client not eligible
 *   2. ELIGIBLE                — client eligible (with payment link)
 *   3. GRAY_AREA               — borderline case
 *   4. DETAILED_CALCULATION    — grant breakdown with approval link
 *   5. SUBMISSION_CONFIRMATION — tax authority submission confirmation
 *   6. ACCOUNTING_FORM_REQUEST — salary data request to accountant
 *   7. SALARY_DATA_REQUEST     — salary data request to client/contact
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import { formatILSInteger } from '@/lib/formatters';
import {
  getNotEligibleEmail,
  getEligibleEmail,
  getGrayAreaEmail,
  getDetailedCalculationEmail,
  getSubmissionConfirmationEmail,
  getAccountingFormRequestEmail,
  getSalaryDataRequestEmail,
  EMAIL_TEMPLATE_MAP,
} from '../lib/grant-email-templates';
import type {
  NotEligibleEmailVariables,
  EligibleEmailVariables,
  DetailedCalculationEmailVariables,
  SubmissionConfirmationEmailVariables,
  AccountingFormRequestEmailVariables,
  SalaryDataRequestEmailVariables,
} from '../lib/grant-email-templates';
import type { EmailLogType } from './shaagat.service';
import type { EligibilityStatus } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SendEmailResult {
  success: boolean;
  recipientEmails: string[];
  emailType: EmailLogType;
}

interface ClientContactEmails {
  emails: string[];
  clientName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class ShaagatEmailService extends BaseService {
  constructor() {
    super('shaagat_email_logs');
  }

  /**
   * Get the app base URL for links in emails.
   */
  private getAppUrl(): string {
    return typeof window !== 'undefined'
      ? window.location.origin
      : 'https://ticovision.vercel.app';
  }

  /**
   * Get the firm name from tenant settings.
   */
  private async getFirmName(): Promise<string> {
    try {
      const tenantId = await this.getTenantId();
      const { data } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenantId)
        .single();
      return data?.name ?? 'המשרד';
    } catch {
      return 'המשרד';
    }
  }

  /**
   * Get all active email addresses for a client via contact assignments.
   */
  private async getClientEmails(clientId: string): Promise<ClientContactEmails> {
    const tenantId = await this.getTenantId();

    // Get client name
    const { data: client } = await supabase
      .from('clients')
      .select('company_name, contact_email')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single();

    const clientName = client?.company_name ?? '';

    // Get emails from contact assignments
    const { data: assignments } = await supabase
      .from('client_contact_assignments')
      .select('contact:tenant_contacts(email)')
      .eq('client_id', clientId)
      .eq('is_active', true);

    const emails: string[] = [];

    // Add contact emails
    if (assignments) {
      for (const assignment of assignments) {
        const contact = assignment.contact as unknown as { email: string | null };
        if (contact?.email) {
          emails.push(contact.email);
        }
      }
    }

    // Add primary client email as fallback
    if (client?.contact_email && !emails.includes(client.contact_email)) {
      emails.push(client.contact_email);
    }

    return { emails, clientName };
  }

  /**
   * Send email via send-letter edge function (simpleMode).
   */
  private async sendViaEdgeFunction(params: {
    recipientEmails: string[];
    recipientName: string;
    subject: string;
    body: string;
    clientId: string;
  }): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await supabase.functions.invoke('send-letter', {
        body: {
          simpleMode: true,
          recipientEmails: params.recipientEmails,
          recipientName: params.recipientName,
          subject: params.subject,
          customText: params.body,
          clientId: params.clientId,
        },
      });

      if (error) throw error;

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Log email to shaagat_email_logs table.
   */
  private async logEmail(params: {
    clientId: string;
    eligibilityCheckId?: string;
    emailType: EmailLogType;
    recipientEmail: string;
    subject: string;
    htmlContent: string;
    status: 'SENT' | 'FAILED';
    errorMessage?: string;
  }): Promise<void> {
    try {
      const tenantId = await this.getTenantId();

      await supabase.from('shaagat_email_logs').insert({
        tenant_id: tenantId,
        client_id: params.clientId,
        eligibility_check_id: params.eligibilityCheckId ?? null,
        email_type: params.emailType,
        recipient_email: params.recipientEmail,
        subject: params.subject,
        html_content: params.htmlContent,
        status: params.status,
        error_message: params.errorMessage ?? null,
      });
    } catch {
      // Non-critical — silently ignore log failures
    }
  }

  /**
   * Save to generated_letters table for letter history.
   */
  private async saveToGeneratedLetters(params: {
    clientId: string;
    subject: string;
    body: string;
    recipientEmails: string[];
    emailType: EmailLogType;
  }): Promise<void> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const name = EMAIL_TEMPLATE_MAP[params.emailType] ?? params.emailType;

      await supabase.from('generated_letters').insert({
        tenant_id: tenantId,
        client_id: params.clientId,
        template_type: `shaagat_${params.emailType.toLowerCase()}`,
        subject: params.subject,
        generated_content_html: params.body,
        generated_content_text: params.body,
        recipient_emails: params.recipientEmails,
        status: 'sent_email',
        name,
        sent_at: new Date().toISOString(),
        sent_via: 'email',
        created_by: user?.id ?? null,
        variables_used: {},
      });
    } catch {
      // Non-critical — silently ignore
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public API — one method per email type
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Send eligibility result email based on status.
   * Dispatches to NOT_ELIGIBLE, ELIGIBLE, or GRAY_AREA template.
   */
  async sendEligibilityEmail(params: {
    clientId: string;
    eligibilityCheckId: string;
    eligibilityStatus: EligibilityStatus;
    declinePercentage: number;
    revenueBase: number;
    revenueComparison: number;
    basePeriodLabel: string;
    comparisonPeriodLabel: string;
    threshold: number;
    reportingType: 'monthly' | 'bimonthly';
    paymentLink?: string;
  }): Promise<ServiceResponse<SendEmailResult>> {
    try {
      const { emails, clientName } = await this.getClientEmails(params.clientId);
      if (emails.length === 0) {
        return { data: null, error: new Error('לא נמצאו כתובות מייל ללקוח') };
      }

      const firmName = await this.getFirmName();
      let emailType: EmailLogType;
      let subject: string;
      let body: string;

      if (params.eligibilityStatus === 'NOT_ELIGIBLE') {
        emailType = 'NOT_ELIGIBLE';
        const vars: NotEligibleEmailVariables = {
          clientName,
          firmName,
          comparisonPeriodLabel: params.comparisonPeriodLabel,
          basePeriodLabel: params.basePeriodLabel,
          threshold: String(params.threshold),
          revenueComparison: formatILSInteger(params.revenueComparison),
          revenueBase: formatILSInteger(params.revenueBase),
          changeDirection: params.declinePercentage > 0 ? 'ירידה' : 'עלייה',
          changeAmount: Math.abs(params.declinePercentage).toFixed(2),
        };
        ({ subject, body } = getNotEligibleEmail(vars));
      } else if (params.eligibilityStatus === 'ELIGIBLE') {
        emailType = 'ELIGIBLE';
        const vars: EligibleEmailVariables = {
          clientName,
          firmName,
          comparisonPeriodLabel: params.comparisonPeriodLabel,
          basePeriodLabel: params.basePeriodLabel,
          threshold: String(params.threshold),
          revenueComparison: formatILSInteger(params.revenueComparison),
          revenueBase: formatILSInteger(params.revenueBase),
          declinePercentage: params.declinePercentage.toFixed(2),
          paymentLink: params.paymentLink ?? `${this.getAppUrl()}/shaagat-haari/payment`,
        };
        ({ subject, body } = getEligibleEmail(vars));
      } else {
        // GRAY_AREA
        emailType = 'GRAY_AREA';
        ({ subject, body } = getGrayAreaEmail({ clientName, firmName }));
      }

      const { error } = await this.sendViaEdgeFunction({
        recipientEmails: emails,
        recipientName: clientName,
        subject,
        body,
        clientId: params.clientId,
      });

      const status = error ? 'FAILED' : 'SENT';

      // Log for each recipient
      for (const email of emails) {
        await this.logEmail({
          clientId: params.clientId,
          eligibilityCheckId: params.eligibilityCheckId,
          emailType,
          recipientEmail: email,
          subject,
          htmlContent: body,
          status,
          errorMessage: error?.message,
        });
      }

      if (!error) {
        await this.saveToGeneratedLetters({
          clientId: params.clientId,
          subject,
          body,
          recipientEmails: emails,
          emailType,
        });
      }

      if (error) throw error;

      return {
        data: { success: true, recipientEmails: emails, emailType },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send detailed calculation email with grant breakdown.
   */
  async sendDetailedCalculationEmail(params: {
    clientId: string;
    eligibilityCheckId?: string;
    fixedExpensesGrant: number;
    salaryGrant: number;
    finalGrantAmount: number;
    approvalToken: string;
  }): Promise<ServiceResponse<SendEmailResult>> {
    try {
      const { emails, clientName } = await this.getClientEmails(params.clientId);
      if (emails.length === 0) {
        return { data: null, error: new Error('לא נמצאו כתובות מייל ללקוח') };
      }

      const firmName = await this.getFirmName();
      const appUrl = this.getAppUrl();

      const vars: DetailedCalculationEmailVariables = {
        clientName,
        firmName,
        fixedExpensesGrant: formatILSInteger(params.fixedExpensesGrant),
        salaryGrant: formatILSInteger(params.salaryGrant),
        finalGrantAmount: formatILSInteger(params.finalGrantAmount),
        approvalUrl: `${appUrl}/shaagat-haari/approval?token=${params.approvalToken}`,
      };

      const { subject, body } = getDetailedCalculationEmail(vars);

      const { error } = await this.sendViaEdgeFunction({
        recipientEmails: emails,
        recipientName: clientName,
        subject,
        body,
        clientId: params.clientId,
      });

      const status = error ? 'FAILED' : 'SENT';

      for (const email of emails) {
        await this.logEmail({
          clientId: params.clientId,
          eligibilityCheckId: params.eligibilityCheckId,
          emailType: 'DETAILED_CALCULATION',
          recipientEmail: email,
          subject,
          htmlContent: body,
          status,
          errorMessage: error?.message,
        });
      }

      if (!error) {
        await this.saveToGeneratedLetters({
          clientId: params.clientId,
          subject,
          body,
          recipientEmails: emails,
          emailType: 'DETAILED_CALCULATION',
        });
      }

      if (error) throw error;

      return {
        data: { success: true, recipientEmails: emails, emailType: 'DETAILED_CALCULATION' },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send submission confirmation email after tax authority submission.
   */
  async sendSubmissionConfirmationEmail(params: {
    clientId: string;
    eligibilityCheckId?: string;
    submissionDate: string;
    grantAmount: number;
    requestNumber: string;
  }): Promise<ServiceResponse<SendEmailResult>> {
    try {
      const { emails, clientName } = await this.getClientEmails(params.clientId);
      if (emails.length === 0) {
        return { data: null, error: new Error('לא נמצאו כתובות מייל ללקוח') };
      }

      const firmName = await this.getFirmName();

      const vars: SubmissionConfirmationEmailVariables = {
        clientName,
        firmName,
        submissionDate: params.submissionDate,
        grantAmount: formatILSInteger(params.grantAmount),
        requestNumber: params.requestNumber,
      };

      const { subject, body } = getSubmissionConfirmationEmail(vars);

      const { error } = await this.sendViaEdgeFunction({
        recipientEmails: emails,
        recipientName: clientName,
        subject,
        body,
        clientId: params.clientId,
      });

      const status = error ? 'FAILED' : 'SENT';

      for (const email of emails) {
        await this.logEmail({
          clientId: params.clientId,
          eligibilityCheckId: params.eligibilityCheckId,
          emailType: 'SUBMISSION_CONFIRMATION',
          recipientEmail: email,
          subject,
          htmlContent: body,
          status,
          errorMessage: error?.message,
        });
      }

      if (!error) {
        await this.saveToGeneratedLetters({
          clientId: params.clientId,
          subject,
          body,
          recipientEmails: emails,
          emailType: 'SUBMISSION_CONFIRMATION',
        });
      }

      if (error) throw error;

      return {
        data: { success: true, recipientEmails: emails, emailType: 'SUBMISSION_CONFIRMATION' },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send salary data request to accountant (form 102 data).
   */
  async sendAccountingFormRequestEmail(params: {
    clientId: string;
    eligibilityCheckId?: string;
    accountantEmail: string;
    submissionToken: string;
    salaryPeriodLabel: string;
  }): Promise<ServiceResponse<SendEmailResult>> {
    try {
      const { clientName } = await this.getClientEmails(params.clientId);
      const firmName = await this.getFirmName();
      const appUrl = this.getAppUrl();

      const vars: AccountingFormRequestEmailVariables = {
        clientName,
        firmName,
        formUrl: `${appUrl}/shaagat-haari/salary-form`,
        submissionToken: params.submissionToken,
        salaryPeriodLabel: params.salaryPeriodLabel,
      };

      const { subject, body } = getAccountingFormRequestEmail(vars);

      const { error } = await this.sendViaEdgeFunction({
        recipientEmails: [params.accountantEmail],
        recipientName: 'רו"ח',
        subject,
        body,
        clientId: params.clientId,
      });

      const status = error ? 'FAILED' : 'SENT';

      await this.logEmail({
        clientId: params.clientId,
        eligibilityCheckId: params.eligibilityCheckId,
        emailType: 'ACCOUNTING_FORM_REQUEST',
        recipientEmail: params.accountantEmail,
        subject,
        htmlContent: body,
        status,
        errorMessage: error?.message,
      });

      if (!error) {
        await this.saveToGeneratedLetters({
          clientId: params.clientId,
          subject,
          body,
          recipientEmails: [params.accountantEmail],
          emailType: 'ACCOUNTING_FORM_REQUEST',
        });
      }

      if (error) throw error;

      return {
        data: { success: true, recipientEmails: [params.accountantEmail], emailType: 'ACCOUNTING_FORM_REQUEST' },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Send salary data request to client / bookkeeper / contact.
   */
  async sendSalaryDataRequestEmail(params: {
    clientId: string;
    eligibilityCheckId?: string;
    recipientEmail: string;
    recipientName: string;
    submissionToken: string;
  }): Promise<ServiceResponse<SendEmailResult>> {
    try {
      const { clientName } = await this.getClientEmails(params.clientId);
      const firmName = await this.getFirmName();
      const appUrl = this.getAppUrl();

      const vars: SalaryDataRequestEmailVariables = {
        clientName,
        firmName,
        recipientName: params.recipientName,
        formUrl: `${appUrl}/shaagat-haari/salary-form`,
        submissionToken: params.submissionToken,
      };

      const { subject, body } = getSalaryDataRequestEmail(vars);

      const { error } = await this.sendViaEdgeFunction({
        recipientEmails: [params.recipientEmail],
        recipientName: params.recipientName,
        subject,
        body,
        clientId: params.clientId,
      });

      const status = error ? 'FAILED' : 'SENT';

      await this.logEmail({
        clientId: params.clientId,
        eligibilityCheckId: params.eligibilityCheckId,
        emailType: 'SALARY_DATA_REQUEST',
        recipientEmail: params.recipientEmail,
        subject,
        htmlContent: body,
        status,
        errorMessage: error?.message,
      });

      if (!error) {
        await this.saveToGeneratedLetters({
          clientId: params.clientId,
          subject,
          body,
          recipientEmails: [params.recipientEmail],
          emailType: 'SALARY_DATA_REQUEST',
        });
      }

      if (error) throw error;

      return {
        data: { success: true, recipientEmails: [params.recipientEmail], emailType: 'SALARY_DATA_REQUEST' },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

// Export singleton instance
export const shaagatEmailService = new ShaagatEmailService();
