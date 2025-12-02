/**
 * Email Template Service
 * Generates HTML email templates for payment reminders
 *
 * Features:
 * - Template variable replacement
 * - SendGrid integration
 * - Reminder history logging
 * - Multi-reminder type support
 */

import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';

export type ReminderType = 'no_open' | 'no_selection' | 'abandoned_cart' | 'checks_overdue';

interface ReminderEmailData {
  company_name: string;
  group_name?: string;
  amount_original: number;
  amount_after_discount?: number;
  days_since_sent: number;
  days_since_opened?: number;
  days_since_selection?: number;
  letter_link: string;
  payment_link_bank?: string;
  payment_link_cc_single?: string;
  payment_link_cc_installments?: string;
  payment_link_checks?: string;
  contact_sigal_phone?: string;
  contact_sigal_email?: string;
}

interface ReminderEmail {
  html: string;
  subject: string;
  templateId: string;
}

export class EmailTemplateService extends BaseService {
  private readonly SENDGRID_API_KEY: string;
  private readonly FROM_EMAIL = 'sigal@franco.co.il';
  private readonly FROM_NAME = 'סיגל נגר - פרנקו ושות׳';

  // SendGrid template IDs (to be created in SendGrid)
  private readonly TEMPLATE_IDS: Record<ReminderType, string> = {
    no_open: 'reminder_no_open_7d',
    no_selection: 'reminder_no_selection_14d',
    abandoned_cart: 'reminder_abandoned_cart_2d',
    checks_overdue: 'reminder_checks_overdue_30d',
  };

  constructor() {
    super('generated_letters');
    this.SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY || '';
  }

  /**
   * Generate reminder email HTML and subject
   */
  async generateReminderEmail(
    feeId: string,
    reminderType: ReminderType
  ): Promise<ServiceResponse<ReminderEmail>> {
    try {
      const tenantId = await this.getTenantId();

      // Fetch fee data with client info
      const { data: fee, error: feeError } = await supabase
        .from('fee_calculations')
        .select(`
          *,
          client:clients (
            company_name,
            company_name_hebrew,
            contact_email,
            contact_phone,
            group:client_groups (
              group_name_hebrew
            )
          ),
          generated_letter:generated_letters (
            id,
            sent_at,
            opened_at
          )
        `)
        .eq('id', feeId)
        .eq('tenant_id', tenantId)
        .single();

      if (feeError || !fee) {
        return {
          data: null,
          error: new Error('Fee calculation not found'),
        };
      }

      // Calculate days since various events
      const now = new Date();
      const sentDate = fee.generated_letter?.sent_at ? new Date(fee.generated_letter.sent_at) : null;
      const openedDate = fee.generated_letter?.opened_at ? new Date(fee.generated_letter.opened_at) : null;
      const selectedDate = fee.payment_method_selected_at ? new Date(fee.payment_method_selected_at) : null;

      const daysSinceSent = sentDate
        ? Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const daysSinceOpened = openedDate
        ? Math.floor((now.getTime() - openedDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const daysSinceSelection = selectedDate
        ? Math.floor((now.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Prepare template data
      const emailData: ReminderEmailData = {
        company_name: fee.client.company_name_hebrew || fee.client.company_name,
        group_name: fee.client.group?.group_name_hebrew,
        amount_original: fee.total_amount,
        amount_after_discount: fee.amount_after_selected_discount || fee.total_amount,
        days_since_sent: daysSinceSent,
        days_since_opened: daysSinceOpened,
        days_since_selection: daysSinceSelection,
        letter_link: `${window.location.origin}/letter/${fee.generated_letter?.id || ''}`,
        payment_link_bank: `${window.location.origin}/payment/bank/${feeId}`,
        payment_link_cc_single: `${window.location.origin}/payment/cc-single/${feeId}`,
        payment_link_cc_installments: `${window.location.origin}/payment/cc-installments/${feeId}`,
        payment_link_checks: `${window.location.origin}/payment/checks/${feeId}`,
        contact_sigal_phone: '03-1234567',
        contact_sigal_email: 'sigal@franco.co.il',
      };

      // Select template and generate subject based on reminder type
      const templateId = this.TEMPLATE_IDS[reminderType];
      const subject = this.getSubject(reminderType, emailData);
      const html = this.generateHTML(reminderType, emailData);

      return {
        data: {
          html,
          subject,
          templateId,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error),
      };
    }
  }

  /**
   * Send reminder email via SendGrid
   */
  async sendReminderEmail(
    feeId: string,
    reminderType: ReminderType
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Generate email content
      const emailResult = await this.generateReminderEmail(feeId, reminderType);
      if (emailResult.error || !emailResult.data) {
        return { data: null, error: emailResult.error };
      }

      // Get client email
      const { data: fee, error: feeError } = await supabase
        .from('fee_calculations')
        .select(`
          client_id,
          client:clients (
            contact_email,
            company_name_hebrew
          )
        `)
        .eq('id', feeId)
        .eq('tenant_id', tenantId)
        .single();

      if (feeError || !fee) {
        return { data: null, error: new Error('Fee not found') };
      }

      const toEmail = fee.client.contact_email;
      if (!toEmail) {
        return { data: null, error: new Error('Client email not found') };
      }

      // Send via SendGrid
      const sendResult = await this.sendViaSendGrid(
        toEmail,
        emailResult.data.subject,
        emailResult.data.html,
        emailResult.data.templateId
      );

      if (!sendResult) {
        return { data: null, error: new Error('Failed to send email') };
      }

      // Log reminder in payment_reminders table
      const { error: insertError } = await supabase
        .from('payment_reminders')
        .insert({
          tenant_id: tenantId,
          client_id: fee.client_id,
          fee_calculation_id: feeId,
          reminder_type: reminderType,
          sent_via: 'email',
          template_used: emailResult.data.templateId,
          email_opened: false,
        });

      if (insertError) {
        console.error('Failed to log reminder:', insertError);
      }

      // Update fee reminder count
      const { error: updateError } = await supabase
        .from('fee_calculations')
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: supabase.raw('COALESCE(reminder_count, 0) + 1'),
        })
        .eq('id', feeId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('Failed to update reminder count:', updateError);
      }

      // Log action
      await this.logAction('send_reminder', feeId, {
        reminder_type: reminderType,
        to_email: toEmail,
      });

      return { data: true, error: null };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error),
      };
    }
  }

  /**
   * Send email via SendGrid API
   */
  private async sendViaSendGrid(
    toEmail: string,
    subject: string,
    html: string,
    templateId: string
  ): Promise<boolean> {
    try {
      if (!this.SENDGRID_API_KEY) {
        console.error('SendGrid API key not configured');
        return false;
      }

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: toEmail }],
            subject,
          }],
          from: {
            email: this.FROM_EMAIL,
            name: this.FROM_NAME,
          },
          content: [{
            type: 'text/html',
            value: html,
          }],
          // If using SendGrid template, use template_id instead of content
          // template_id: templateId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SendGrid error:', response.status, errorText);
        return false;
      }

      console.log(`Email sent to ${toEmail} using template ${templateId}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Generate email subject based on reminder type
   */
  private getSubject(reminderType: ReminderType, data: ReminderEmailData): string {
    switch (reminderType) {
      case 'no_open':
        return `תזכורת - מכתב שכר טרחה מ-${data.company_name}`;
      case 'no_selection':
        return `תזכורת - בחירת אופן תשלום עבור ${data.company_name}`;
      case 'abandoned_cart':
        return `תזכורת - השלמת תשלום עבור ${data.company_name}`;
      case 'checks_overdue':
        return `תזכורת - המחאות באיחור עבור ${data.company_name}`;
      default:
        return `תזכורת - שכר טרחה ${data.company_name}`;
    }
  }

  /**
   * Generate HTML email content
   * Note: In production, use SendGrid templates instead
   */
  private generateHTML(reminderType: ReminderType, data: ReminderEmailData): string {
    const commonHeader = `
      <div dir="rtl" style="font-family: Assistant, Heebo, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #1a1a1a; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">פרנקו ושות' - רואי חשבון</h1>
        </div>
        <div style="padding: 30px;">
    `;

    const commonFooter = `
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            לשאלות ובירורים: ${data.contact_sigal_email} | ${data.contact_sigal_phone}
          </p>
          <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">
            פרנקו ושות' רואי חשבון | DARE TO THINK · COMMIT TO DELIVER
          </p>
        </div>
      </div>
    `;

    let bodyHTML = '';

    switch (reminderType) {
      case 'no_open':
        bodyHTML = `
          <h2 style="color: #333; text-align: right;">שלום,</h2>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            שלחנו לכם לפני <strong>${data.days_since_sent} ימים</strong> מכתב שכר טרחה שנתי עבור ${data.company_name}.
          </p>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            לצפייה במכתב ובחירת אופן תשלום:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.letter_link}" style="background: #0066cc; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 18px;">
              לצפייה במכתב
            </a>
          </div>
          <p style="font-size: 14px; color: #666; text-align: right;">
            <strong>חלה טעות?</strong> אם שילמתם כבר,
            <a href="${window.location.origin}/payment-dispute?fee_id=${data.letter_link.split('/').pop()}" style="color: #0066cc;">לחצו כאן</a>.
          </p>
        `;
        break;

      case 'no_selection':
        bodyHTML = `
          <h2 style="color: #333; text-align: right;">שלום,</h2>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            פתחתם את מכתב שכר הטרחה עבור ${data.company_name}, אך עדיין לא בחרתם אופן תשלום.
          </p>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            אנא בחרו את אופן התשלום המועדף עליכם:
          </p>
          <div style="margin: 30px 0;">
            <div style="margin: 15px 0;">
              <a href="${data.payment_link_bank}" style="background: #28a745; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; width: 80%;">
                העברה בנקאית (9% הנחה) - ₪${Math.ceil((data.amount_with_vat || Math.round((data.amount_original || 0) * 1.18)) * 0.91).toLocaleString('he-IL')}
              </a>
            </div>
            <div style="margin: 15px 0;">
              <a href="${data.payment_link_cc_single}" style="background: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; width: 80%;">
                כרטיס אשראי תשלום אחד (8% הנחה) - ₪${Math.ceil((data.amount_with_vat || Math.round((data.amount_original || 0) * 1.18)) * 0.92).toLocaleString('he-IL')}
              </a>
            </div>
            <div style="margin: 15px 0;">
              <a href="${data.payment_link_cc_installments}" style="background: #17a2b8; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; width: 80%;">
                כרטיס אשראי 4 תשלומים (4% הנחה) - ₪${Math.ceil((data.amount_with_vat || Math.round((data.amount_original || 0) * 1.18)) * 0.96).toLocaleString('he-IL')}
              </a>
            </div>
            <div style="margin: 15px 0;">
              <a href="${data.payment_link_checks}" style="background: #6c757d; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; width: 80%;">
                8 המחאות - ₪${Math.ceil(data.amount_with_vat || Math.round((data.amount_original || 0) * 1.18)).toLocaleString('he-IL')}
              </a>
            </div>
          </div>
          <p style="font-size: 14px; color: #666; text-align: right;">
            <strong>חלה טעות?</strong> אם שילמתם כבר,
            <a href="${window.location.origin}/payment-dispute?fee_id=${data.letter_link.split('/').pop()}" style="color: #0066cc;">לחצו כאן</a>.
          </p>
        `;
        break;

      case 'abandoned_cart':
        bodyHTML = `
          <h2 style="color: #333; text-align: right;">כמעט סיימתם!</h2>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            התחלתם תהליך תשלום בכרטיס אשראי עבור ${data.company_name}, אך לא השלמתם אותו.
          </p>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            סכום לתשלום: <strong>₪${(data.amount_after_discount || 0).toLocaleString('he-IL')}</strong>
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.payment_link_cc_single}" style="background: #dc3545; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 18px;">
              להשלמת התשלום
            </a>
          </div>
        `;
        break;

      case 'checks_overdue':
        bodyHTML = `
          <h2 style="color: #333; text-align: right;">שלום,</h2>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            בחרתם לשלם בהמחאות עבור ${data.company_name}, אך ההמחאות עדיין לא הגיעו אלינו.
          </p>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            עברו <strong>${data.days_since_selection} ימים</strong> מאז בחירת אופן התשלום.
          </p>
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; text-align: right;"><strong>כתובת למשלוח המחאות:</strong></p>
            <p style="margin: 5px 0; text-align: right;">
              פרנקו ושות' רואי חשבון<br/>
              רח' הרצל 123, תל אביב<br/>
              מיקוד: 6777801
            </p>
          </div>
          <p style="font-size: 16px; line-height: 1.6; text-align: right;">
            <strong>רוצים לשנות לאופן תשלום אחר?</strong>
            <a href="${data.letter_link}" style="color: #0066cc;">לחצו כאן</a>
          </p>
          <p style="font-size: 14px; color: #666; text-align: right;">
            <strong>חלה טעות?</strong> אם שלחתם את ההמחאות,
            <a href="${window.location.origin}/payment-dispute?fee_id=${data.letter_link.split('/').pop()}" style="color: #0066cc;">לחצו כאן</a>.
          </p>
        `;
        break;
    }

    return commonHeader + bodyHTML + commonFooter;
  }
}
