/**
 * Capital Declaration Types (הצהרות הון)
 * Types for the capital declaration feature including document categories,
 * status tracking, and form interfaces.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/** Document categories for capital declaration */
export type CapitalDeclarationCategory =
  | 'bank'           // בנק
  | 'real_estate'    // נדל"ן
  | 'insurance'      // קופות גמל וביטוח
  | 'vehicles'       // רכבים
  | 'abroad'         // נכסים בחו"ל
  | 'other'          // נכסים/חובות נוספים
  | 'general';       // מסמכים כלליים

/** Declaration workflow status */
export type CapitalDeclarationStatus =
  | 'draft'              // טיוטה
  | 'sent'               // נשלח
  | 'in_progress'        // הלקוח התחיל
  | 'waiting_documents'  // ממתין למסמכים
  | 'reviewing'          // בבדיקה
  | 'in_preparation'     // בהכנה
  | 'pending_approval'   // ממתין לאישור
  | 'submitted'          // הוגש (הסטטוס הסופי)
  | 'waiting';           // ממתין (בהמתנה - לקוח ביקש לדחות או אין זמן לטפל)

/** Declaration priority levels */
export type DeclarationPriority = 'normal' | 'urgent' | 'critical';

/** Communication types for tracking */
export type DeclarationCommunicationType = 'letter' | 'phone_call' | 'whatsapp' | 'note';

/** Communication direction */
export type CommunicationDirection = 'outbound' | 'inbound';

/** Category configuration for UI */
export interface CategoryConfig {
  key: CapitalDeclarationCategory;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
}

/** All category configurations */
export const DECLARATION_CATEGORIES: CategoryConfig[] = [
  {
    key: 'bank',
    label: 'בנק',
    description: 'דפי בנק, תדפיסי יתרות מכל חשבונות הבנק',
    icon: 'Building2',
    color: 'blue'
  },
  {
    key: 'real_estate',
    label: 'נדל"ן',
    description: 'נסחי טאבו, הסכמי רכישה/מכירה, שומות מקרקעין',
    icon: 'Home',
    color: 'green'
  },
  {
    key: 'insurance',
    label: 'קופות גמל וביטוח',
    description: 'דוחות שנתיים מקופות פנסיה, ביטוח מנהלים, קרנות השתלמות',
    icon: 'Shield',
    color: 'yellow'
  },
  {
    key: 'vehicles',
    label: 'רכבים',
    description: 'רישיון רכב, חוזי ליסינג/מימון, אישורי בעלות',
    icon: 'Car',
    color: 'purple'
  },
  {
    key: 'abroad',
    label: 'נכסים בחו"ל',
    description: 'חשבונות בנק בחו"ל, נדל"ן, השקעות וניירות ערך',
    icon: 'Globe',
    color: 'cyan'
  },
  {
    key: 'other',
    label: 'נכסים/חובות נוספים',
    description: 'הלוואות, מניות, קרנות נאמנות, נכסים דיגיטליים ואחרים',
    icon: 'FolderOpen',
    color: 'pink'
  },
  {
    key: 'general',
    label: 'מסמכים כלליים',
    description: 'מסמכים כלליים שאינם מסווגים בקטגוריות אחרות',
    icon: 'FileText',
    color: 'gray'
  }
];

/** Category map for quick lookup */
export const CATEGORY_MAP = Object.fromEntries(
  DECLARATION_CATEGORIES.map(cat => [cat.key, cat])
) as Record<CapitalDeclarationCategory, CategoryConfig>;

/** Status labels in Hebrew */
export const DECLARATION_STATUS_LABELS: Record<CapitalDeclarationStatus, string> = {
  draft: 'טיוטה',
  sent: 'נשלח',
  in_progress: 'הלקוח התחיל',
  waiting_documents: 'ממתין למסמכים',
  reviewing: 'בבדיקה',
  in_preparation: 'בהכנה',
  pending_approval: 'ממתין לאישור',
  submitted: 'הוגש',
  waiting: 'ממתין'
};

/** Status colors for badges */
export const DECLARATION_STATUS_COLORS: Record<CapitalDeclarationStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_documents: 'bg-orange-100 text-orange-800',
  reviewing: 'bg-purple-100 text-purple-800',
  in_preparation: 'bg-indigo-100 text-indigo-800',
  pending_approval: 'bg-amber-100 text-amber-800',
  submitted: 'bg-green-100 text-green-800',
  waiting: 'bg-slate-100 text-slate-800'
};

/** Priority labels in Hebrew */
export const PRIORITY_LABELS: Record<DeclarationPriority, string> = {
  normal: 'רגיל',
  urgent: 'דחוף',
  critical: 'בהול'
};

/** Priority colors for badges */
export const PRIORITY_COLORS: Record<DeclarationPriority, string> = {
  normal: '',  // No special color
  urgent: 'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300'
};

/** Priority row background colors */
export const PRIORITY_ROW_COLORS: Record<DeclarationPriority, string> = {
  normal: '',
  urgent: 'bg-orange-50',
  critical: 'bg-red-50'
};

/** Communication type labels in Hebrew */
export const COMMUNICATION_TYPE_LABELS: Record<DeclarationCommunicationType, string> = {
  letter: 'מכתב',
  phone_call: 'שיחת טלפון',
  whatsapp: 'WhatsApp',
  note: 'הערה'
};

/** Communication type icons (Lucide icon names) */
export const COMMUNICATION_TYPE_ICONS: Record<DeclarationCommunicationType, string> = {
  letter: 'Mail',
  phone_call: 'Phone',
  whatsapp: 'MessageCircle',
  note: 'FileText'
};

// ============================================================================
// DATABASE ENTITIES
// ============================================================================

/** Main capital declaration entity */
export interface CapitalDeclaration {
  id: string;
  tenant_id: string;

  // Contact info
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_phone_secondary: string | null;
  contact_id: string | null;

  // Client/Group (optional)
  client_id: string | null;
  group_id: string | null;

  // Details
  tax_year: number;
  declaration_date: string; // ISO date string
  subject: string;
  google_drive_link: string | null;
  notes: string | null;

  // Status & Priority
  status: CapitalDeclarationStatus;
  priority: DeclarationPriority;

  // Assignment
  assigned_to: string | null;
  assigned_at: string | null;

  // Due Dates
  tax_authority_due_date: string | null;        // Official deadline from tax authority
  tax_authority_due_date_document_path: string | null;  // Screenshot of request
  internal_due_date: string | null;             // Internal deadline set by manager

  // Portal
  public_token: string;
  portal_accessed_at: string | null;
  portal_access_count: number;

  // Letter
  letter_id: string | null;

  // Alternate Recipient
  recipient_mode: 'main' | 'alternate';
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_phone_secondary: string | null;
  recipient_contact_id: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Communication record entity */
export interface DeclarationCommunication {
  id: string;
  tenant_id: string;
  declaration_id: string;
  communication_type: DeclarationCommunicationType;
  direction: CommunicationDirection;
  subject: string | null;
  content: string | null;
  outcome: string | null;
  letter_id: string | null;
  communicated_at: string;
  created_by: string | null;
  created_at: string;
}

/** Communication with user details for display */
export interface CommunicationWithUser extends DeclarationCommunication {
  created_by_name?: string;
}

/** DTO for creating a new communication */
export interface CreateCommunicationDto {
  declaration_id: string;
  communication_type: DeclarationCommunicationType;
  direction?: CommunicationDirection;
  subject?: string;
  content?: string;
  outcome?: string;
  letter_id?: string;
  communicated_at?: string; // ISO string, defaults to now
}

/** Uploaded document entity */
export interface CapitalDeclarationDocument {
  id: string;
  tenant_id: string;
  declaration_id: string;
  category: CapitalDeclarationCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  notes: string | null;
  uploaded_at: string;
  uploaded_by_ip: string | null;
}

// ============================================================================
// FORM & UI TYPES
// ============================================================================

/** Form state for creating a new declaration */
export interface CreateDeclarationForm {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_phone_secondary: string;
  tax_year: number;
  declaration_date: string;
  subject: string;
  google_drive_link: string;
  notes: string;
  client_id: string | null;
  group_id: string | null;
  // Alternate Recipient
  recipient_mode: 'main' | 'alternate';
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  recipient_phone_secondary: string;
}

/** Create initial form state */
export function createInitialDeclarationForm(): CreateDeclarationForm {
  const currentYear = new Date().getFullYear();
  return {
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contact_phone_secondary: '',
    tax_year: currentYear - 1, // Default to previous year
    declaration_date: `${currentYear - 1}-12-31`,
    subject: 'הצהרת הון',
    google_drive_link: '',
    notes: '',
    client_id: null,
    group_id: null,
    // Alternate Recipient defaults
    recipient_mode: 'main',
    recipient_name: '',
    recipient_email: '',
    recipient_phone: '',
    recipient_phone_secondary: ''
  };
}

/** Document count per category */
export interface CategoryDocumentCount {
  category: CapitalDeclarationCategory;
  count: number;
}

/** Declaration with additional computed fields for list view */
export interface DeclarationWithCounts extends CapitalDeclaration {
  document_counts: CategoryDocumentCount[];
  total_documents: number;
  categories_complete: number;
  client_name?: string;
  group_name?: string;
  // Dashboard fields
  assigned_to_name?: string;
  last_communication_at?: string | null;
  communication_count?: number;
}

// ============================================================================
// PUBLIC PORTAL TYPES
// ============================================================================

/** Public portal data (returned by token lookup) */
export interface PublicDeclarationData {
  id: string;
  tenant_id: string;
  contact_name: string;
  tax_year: number;
  declaration_date: string;
  status: CapitalDeclarationStatus;
  portal_accessed_at: string | null;
  tenant_name: string;
  documents: CapitalDeclarationDocument[];
  category_counts: CategoryDocumentCount[];
}

// ============================================================================
// LETTER TEMPLATE TYPES
// ============================================================================

/** Variables for the capital declaration letter template */
export interface CapitalDeclarationLetterVariables {
  contact_name: string;
  tax_year: string;
  declaration_date: string; // Formatted as DD/MM/YYYY
  portal_link: string;
  letter_date: string; // Formatted as DD/MM/YYYY
}

// ============================================================================
// VALIDATION
// ============================================================================

/** Validate declaration form */
export function validateDeclarationForm(form: CreateDeclarationForm): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!form.contact_name.trim()) {
    errors.push('שם איש קשר הוא שדה חובה');
  }

  // Email/phone are optional for main contact - only validate format if provided
  if (form.contact_email && !isValidEmail(form.contact_email)) {
    errors.push('כתובת מייל לא תקינה');
  }

  if (!form.tax_year || form.tax_year < 2000 || form.tax_year > new Date().getFullYear()) {
    errors.push('שנת מס לא תקינה');
  }

  if (!form.declaration_date) {
    errors.push('תאריך הצהרה הוא שדה חובה');
  }

  // Validate alternate recipient if mode is 'alternate'
  if (form.recipient_mode === 'alternate') {
    if (!form.recipient_name.trim()) {
      errors.push('שם נמען חלופי הוא שדה חובה');
    }
    if (!form.recipient_email && !form.recipient_phone) {
      errors.push('יש להזין מייל או טלפון לנמען החלופי');
    }
    if (form.recipient_email && !isValidEmail(form.recipient_email)) {
      errors.push('כתובת מייל של נמען חלופי לא תקינה');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/** Simple email validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Get available tax years for dropdown */
export function getAvailableTaxYears(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= currentYear - 5; year--) {
    years.push(year);
  }
  return years;
}

/** Format declaration date for display */
export function formatDeclarationDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/** Get category progress percentage */
export function getCategoryProgress(counts: CategoryDocumentCount[]): number {
  const categoriesWithDocs = counts.filter(c => c.count > 0).length;
  return Math.round((categoriesWithDocs / DECLARATION_CATEGORIES.length) * 100);
}

// ============================================================================
// STATUS HISTORY
// ============================================================================

/** Status history entry for tracking status changes */
export interface StatusHistoryEntry {
  id: string;
  tenant_id: string;
  declaration_id: string;
  from_status: CapitalDeclarationStatus | null;
  to_status: CapitalDeclarationStatus;
  notes: string | null;
  changed_by: string;
  changed_by_name?: string;  // for display (joined from auth.users)
  changed_at: string;
  created_at: string;
}
