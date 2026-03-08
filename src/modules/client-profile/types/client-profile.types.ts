/**
 * Types for the Unified Client Profile page
 */

import type { Client, ClientContact, ClientPhone, FeeCalculation } from '@/services';
import type { AnnualBalanceSheet } from '@/modules/annual-balance/types/annual-balance.types';
import type { ActualPayment } from '@/types/payment.types';

export interface ClientInteraction {
  id: string;
  client_id: string;
  fee_calculation_id?: string;
  tenant_id: string;
  interaction_type: 'phone_call' | 'email_sent' | 'meeting' | 'note' | 'whatsapp' | 'other';
  direction: 'outbound' | 'inbound';
  subject?: string;
  content?: string;
  outcome?: string;
  interacted_at: string;
  created_by?: string;
  created_at: string;
}

export interface LetterSummary {
  id: string;
  client_id: string;
  name?: string;
  subject?: string;
  document_type_id?: string;
  status: string | null;
  created_at: string;
  open_count?: number;
  recipient_emails?: string[];
  fee_calculation_id?: string;
}

export interface ClientProfileData {
  client: Client | null;
  contacts: ClientContact[];
  phones: ClientPhone[];
  balanceSheets: AnnualBalanceSheet[];
  feeCalculations: FeeCalculation[];
  actualPayments: ActualPayment[];
  letters: LetterSummary[];
  interactions: ClientInteraction[];
  loading: boolean;
  error: string | null;
}
