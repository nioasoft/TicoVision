/**
 * Broadcast System Types
 * Used for mass email/letter sending to clients
 */

// ============================================================================
// Distribution Lists
// ============================================================================

export interface DistributionList {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DistributionListMember {
  id: string;
  list_id: string;
  client_id: string;
  added_at: string;
  added_by: string | null;
}

export interface DistributionListWithMembers extends DistributionList {
  members: ListMemberWithDetails[];
  member_count: number;
  email_count: number;
}

export interface ListMemberWithDetails {
  client_id: string;
  company_name: string;
  company_name_hebrew: string | null;
  tax_id: string;
  contact_count: number;
  email_count: number;
  added_at: string;
}

export interface CreateListDto {
  name: string;
  description?: string;
  client_ids?: string[];
}

export interface UpdateListDto {
  name?: string;
  description?: string;
}

// ============================================================================
// Broadcasts
// ============================================================================

export type BroadcastStatus = 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
export type BroadcastListType = 'all' | 'custom';
export type RecipientStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface Broadcast {
  id: string;
  tenant_id: string;
  name: string;
  subject: string;
  template_type: string | null;
  custom_content_html: string | null;
  includes_payment_section: boolean;
  list_type: BroadcastListType;
  list_id: string | null;
  recipient_count: number;
  status: BroadcastStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_emails_sent: number;
  total_emails_failed: number;
  total_emails_opened: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  client_id: string;
  contact_id: string | null;
  email: string;
  recipient_name: string | null;
  status: RecipientStatus;
  error_message: string | null;
  sent_at: string | null;
  opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  generated_letter_id: string | null;
  created_at: string;
}

export interface CreateBroadcastDto {
  name: string;
  subject: string;
  list_type: BroadcastListType;
  list_id?: string;
  template_type?: string;
  custom_content_html?: string;
  includes_payment_section?: boolean;
}

// ============================================================================
// Eligible Clients (from DB function)
// ============================================================================

export interface EligibleClient {
  client_id: string;
  company_name: string;
  company_name_hebrew: string | null;
  tax_id: string;
  contact_count: number;
  email_count: number;
}

export interface ClientBroadcastEmail {
  contact_id: string;
  full_name: string;
  email: string;
  email_preference: string;
}

// ============================================================================
// Resolved Recipients (for preview before sending)
// ============================================================================

export interface ResolvedRecipient {
  client_id: string;
  company_name: string;
  company_name_hebrew: string | null;
  contacts: {
    contact_id: string;
    full_name: string;
    email: string;
  }[];
}

export interface RecipientSummary {
  total_clients: number;
  total_emails: number;
  clients: ResolvedRecipient[];
}

// ============================================================================
// History & Details
// ============================================================================

export interface BroadcastHistoryRow extends Broadcast {
  list_name?: string;  // Joined from distribution_lists
}

export interface BroadcastDetails extends Broadcast {
  list_name?: string;
  recipients: BroadcastRecipient[];
  stats: {
    pending: number;
    sent: number;
    failed: number;
    skipped: number;
    opened: number;
    open_rate: number;
  };
}

// ============================================================================
// Send Progress
// ============================================================================

export interface SendProgress {
  broadcast_id: string;
  status: BroadcastStatus;
  total: number;
  sent: number;
  failed: number;
  progress_percent: number;
}
