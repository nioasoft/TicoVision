import { supabase } from '@/lib/supabase';

interface SendEmailRequest {
  letterId: string;
  recipientEmails: string[];
  subject?: string;
  ccEmails?: string[];
  bccEmails?: string[];
}

interface SendEmailResponse {
  success: boolean;
  letterId?: string;
  recipientCount?: number;
  message?: string;
  error?: string;
}

export class EmailServiceV2 {
  /**
   * Send letter via email using V2 system
   */
  async sendLetter(request: SendEmailRequest): Promise<SendEmailResponse> {
    // Get fresh session token for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('לא מחובר - אנא התחבר מחדש');
    }

    const { data, error } = await supabase.functions.invoke('send-letter-v2', {
      body: request,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return data;
  }
}

export const emailServiceV2 = new EmailServiceV2();
