/**
 * Email Service - SendGrid Integration
 * Handles all email sending functionality for TicoVision
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY || import.meta.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.warn('⚠️ SendGrid API key not found. Email sending will fail.');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email using SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  try {
    if (!SENDGRID_API_KEY) {
      throw new Error('SendGrid API key is not configured');
    }

    const msg = {
      to: options.to,
      from: options.from || 'shani@franco.co.il',
      replyTo: options.replyTo || 'sigal@franco.co.il',
      subject: options.subject,
      html: options.html,
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.attachments && { attachments: options.attachments }),
    };

    const [response] = await sgMail.send(msg);

    console.log('✅ Email sent successfully:', {
      to: options.to,
      subject: options.subject,
      statusCode: response.statusCode,
      messageId: response.headers['x-message-id'],
    });

    return {
      success: true,
      messageId: response.headers['x-message-id'] as string,
    };
  } catch (error) {
    console.error('❌ Failed to send email:', error);

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred while sending email',
    };
  }
}

/**
 * Send letter email to client
 */
export async function sendLetterEmail(
  clientEmail: string,
  clientName: string,
  letterSubject: string,
  letterHtml: string
): Promise<EmailResponse> {
  return sendEmail({
    to: clientEmail,
    subject: letterSubject,
    html: letterHtml,
    from: 'shani@franco.co.il',
    replyTo: 'sigal@franco.co.il',
  });
}

/**
 * Send test email
 */
export async function sendTestEmail(
  to: string,
  subject: string,
  html: string
): Promise<EmailResponse> {
  return sendEmail({
    to,
    subject: `[TEST] ${subject}`,
    html,
  });
}
