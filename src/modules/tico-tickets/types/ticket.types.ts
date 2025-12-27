import type { Database } from '@/types/supabase';

// Base types from database
export type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];
export type SupportTicketInsert = Database['public']['Tables']['support_tickets']['Insert'];
export type SupportTicketUpdate = Database['public']['Tables']['support_tickets']['Update'];

export type SupportTicketCategory = Database['public']['Tables']['support_ticket_categories']['Row'];
export type SupportTicketStatus = Database['public']['Tables']['support_ticket_statuses']['Row'];
export type SupportTicketReply = Database['public']['Tables']['support_ticket_replies']['Row'];
export type SupportTicketAttachment = Database['public']['Tables']['support_ticket_attachments']['Row'];
export type SupportTicketHistory = Database['public']['Tables']['support_ticket_history']['Row'];

// Priority levels
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

// Source types
export type TicketSource = 'public_form' | 'internal' | 'email' | 'phone';

// Match types
export type MatchedBy = 'auto_email' | 'auto_phone' | 'auto_tax_id' | 'manual' | null;

// Extended ticket with joined data
export interface TicketWithDetails extends SupportTicket {
  category: SupportTicketCategory;
  subcategory: SupportTicketCategory | null;
  status: SupportTicketStatus;
  assigned_user?: {
    id: string;
    email: string;
    raw_user_meta_data: {
      name?: string;
      avatar_url?: string;
    } | null;
  } | null;
  matched_client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  reply_count?: number;
  attachment_count?: number;
}

// Category with subcategories
export interface CategoryWithSubcategories extends SupportTicketCategory {
  subcategories?: SupportTicketCategory[];
}

// Kanban column structure
export interface KanbanColumn {
  id: string;
  key: string;
  name: string;
  name_hebrew: string;
  color: string;
  icon: string | null;
  column_order: number;
  tickets: TicketWithDetails[];
  ticket_count: number;
}

// Dashboard data structure
export interface TicketDashboardData {
  columns: KanbanColumn[];
  kpis: TicketKPIs;
}

// KPIs for dashboard
export interface TicketKPIs {
  total_open: number;
  total_today: number;
  avg_response_time_hours: number | null;
  unassigned_count: number;
  urgent_count: number;
}

// Filter parameters
export interface TicketFilters {
  status_id?: string;
  category_id?: string;
  assigned_to?: string | null;
  priority?: TicketPriority;
  is_new_lead?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}

// Sort parameters
export interface TicketSort {
  field: 'created_at' | 'updated_at' | 'priority' | 'ticket_number';
  order: 'asc' | 'desc';
}

// Create ticket DTO
export interface CreateTicketDto {
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  submitter_company_name?: string;
  submitter_tax_id?: string;
  category_id: string;
  subcategory_id?: string;
  subject: string;
  description: string;
  priority?: TicketPriority;
  source?: TicketSource;
  assigned_to?: string;
  due_date?: string;
}

// Public ticket submission
export interface PublicTicketSubmission {
  tenant_slug?: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  submitter_company_name?: string;
  submitter_tax_id?: string;
  category_id: string;
  subcategory_id?: string;
  subject: string;
  description: string;
}

// Public ticket view (limited data)
export interface PublicTicketView {
  id: string;
  ticket_number: number;
  subject: string;
  description: string;
  status_key: string;
  status_name: string;
  status_color: string;
  priority: string;
  category_name: string;
  subcategory_name: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  tenant_name: string;
  replies: PublicReplyView[];
}

// Public reply view
export interface PublicReplyView {
  id: string;
  content: string;
  is_from_client: boolean;
  sender_name: string;
  created_at: string;
}

// Reply DTO
export interface CreateReplyDto {
  content: string;
  is_internal?: boolean;
}

// Assignable user for dropdown
export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

// Submission result
export interface TicketSubmissionResult {
  success: boolean;
  ticket_number?: number;
  tracking_url?: string;
  error?: string;
}

// History action types
export type TicketHistoryAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'priority_changed'
  | 'replied'
  | 'internal_note'
  | 'client_linked'
  | 'attachment_added'
  | 'due_date_set';
