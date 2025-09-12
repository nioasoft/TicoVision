/**
 * Letter Template Types
 * Based on the 11 templates from Shani & Tiko
 */

export type LetterTemplateType = 
  | 'external_index_only'        // A - חיצוניים - שינוי מדד
  | 'external_real_change'       // B - חיצוניים - שינוי ריאלי
  | 'external_as_agreed'         // C - חיצוניים - כמוסכם
  | 'internal_audit_index'       // D1 - פנימי ראיית חשבון - שינוי מדד
  | 'internal_audit_real'        // D2 - פנימי ראיית חשבון - שינוי ריאלי
  | 'internal_audit_agreed'      // D3 - פנימי ראיית חשבון - כמוסכם
  | 'retainer_index'             // E1 - ריטיינר - שינוי מדד
  | 'retainer_real'              // E2 - ריטיינר - שינוי ריאלי
  | 'internal_bookkeeping_index' // F1 - פנימי הנהלת חשבונות - שינוי מדד
  | 'internal_bookkeeping_real'  // F2 - פנימי הנהלת חשבונות - שינוי ריאלי
  | 'internal_bookkeeping_agreed'; // F3 - פנימי הנהלת חשבונות - כמוסכם

export interface LetterTemplate {
  id: string;
  tenant_id: string;
  template_type: LetterTemplateType;
  name: string;
  name_hebrew: string;
  description?: string;
  language: 'he' | 'en';
  subject: string;
  content_html: string;
  content_text?: string;
  variables_schema: LetterVariableSchema;
  selection_rules?: SelectionRules;
  header_template_id?: string;
  footer_template_id?: string;
  is_active: boolean;
  is_editable: boolean;
  version: number;
  original_file_path?: string;
  created_at: Date;
  updated_at: Date;
}

export interface LetterVariables {
  // Client Information
  client_name: string;
  company_name: string;
  company_name_hebrew?: string;
  tax_id: string;
  group_name?: string;
  contact_name?: string;
  
  // Date and Time
  date: string; // Current date
  year: number; // Current year (e.g., 2025)
  
  // Payment Information
  amount: number; // Base amount
  amount_with_vat: number; // Amount including VAT
  monthly_amount?: number; // For installments
  discount_percentage?: number;
  discount_amount?: number;
  amount_after_discount?: number;
  amount_after_discount_with_vat?: number;
  
  // Previous Year Data
  previous_year_amount?: number;
  previous_year_discount?: number;
  
  // Adjustments
  inflation_rate?: number; // e.g., 4%
  real_adjustment_percentage?: number;
  real_adjustment_reason?: string;
  
  // Payment Terms
  payment_terms?: number; // Days (e.g., 30)
  due_date?: string;
  payment_installments?: number; // Number of installments (e.g., 8)
  payment_dates?: string[]; // List of payment dates
  
  // Payment Methods
  payment_link?: string; // Cardcom payment link
  bank_name?: string;
  bank_branch?: string;
  bank_account?: string;
  bank_account_name?: string;
  
  // Contact Information
  contact_email?: string;
  contact_phone?: string;
  
  // Notification
  notification_type?: 'email' | 'mail' | 'במייל' | 'בדואר';
  
  // Company Information (for footer/header)
  sender_name?: string;
  sender_title?: string;
  sender_company?: string;
  sender_address?: string;
  sender_phone?: string;
  sender_email?: string;
}

export interface LetterVariableSchema {
  required: string[];
  optional: string[];
  conditional?: {
    [key: string]: {
      condition: string;
      required: string[];
    };
  };
}

export interface SelectionRules {
  client_type?: 'internal' | 'external';
  service_type?: 'audit' | 'bookkeeping' | 'retainer';
  fee_change_type?: 'index' | 'real' | 'agreed';
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
    value: any;
  }>;
}

export interface LetterComponent {
  id: string;
  tenant_id: string;
  type: 'header' | 'footer';
  name: string;
  content_html: string;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GeneratedLetter {
  id: string;
  tenant_id: string;
  client_id: string;
  template_id: string;
  fee_calculation_id?: string;
  variables_used: LetterVariables;
  generated_content_html: string;
  generated_content_text?: string;
  payment_link?: string;
  sent_at?: Date;
  sent_via?: 'email' | 'print' | 'download';
  opened_at?: Date;
  clicked_at?: Date;
  created_at: Date;
  created_by: string;
}

export interface LetterPreviewRequest {
  template_id: string;
  variables: Partial<LetterVariables>;
  include_header?: boolean;
  include_footer?: boolean;
}

export interface LetterSendRequest {
  letter_id: string;
  send_method: 'email' | 'print';
  recipient_email?: string;
  cc_emails?: string[];
  bcc_emails?: string[];
  attach_invoice?: boolean;
}

// Template categories for UI organization
export interface TemplateCategory {
  id: string;
  name: string;
  name_hebrew: string;
  description?: string;
  templates: LetterTemplateType[];
  icon?: string;
  order: number;
}

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'external',
    name: 'External Clients',
    name_hebrew: 'לקוחות חיצוניים',
    description: 'Templates for external client communications',
    templates: ['external_index_only', 'external_real_change', 'external_as_agreed'],
    icon: 'Users',
    order: 1
  },
  {
    id: 'internal_audit',
    name: 'Internal Audit',
    name_hebrew: 'פנימי - ראיית חשבון',
    description: 'Templates for internal audit services',
    templates: ['internal_audit_index', 'internal_audit_real', 'internal_audit_agreed'],
    icon: 'FileText',
    order: 2
  },
  {
    id: 'retainer',
    name: 'Retainer',
    name_hebrew: 'ריטיינר',
    description: 'Templates for retainer agreements',
    templates: ['retainer_index', 'retainer_real'],
    icon: 'Calendar',
    order: 3
  },
  {
    id: 'internal_bookkeeping',
    name: 'Internal Bookkeeping',
    name_hebrew: 'פנימי - הנהלת חשבונות',
    description: 'Templates for internal bookkeeping services',
    templates: ['internal_bookkeeping_index', 'internal_bookkeeping_real', 'internal_bookkeeping_agreed'],
    icon: 'Calculator',
    order: 4
  }
];