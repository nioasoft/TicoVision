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
  | 'other';         // נכסים/חובות נוספים

/** Declaration workflow status */
export type CapitalDeclarationStatus =
  | 'draft'              // טיוטה
  | 'sent'               // נשלח
  | 'in_progress'        // הלקוח התחיל
  | 'waiting_documents'  // ממתין למסמכים
  | 'reviewing'          // בבדיקה
  | 'completed';         // הושלם

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
  completed: 'הושלם'
};

/** Status colors for badges */
export const DECLARATION_STATUS_COLORS: Record<CapitalDeclarationStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_documents: 'bg-orange-100 text-orange-800',
  reviewing: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800'
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

  // Status
  status: CapitalDeclarationStatus;

  // Portal
  public_token: string;
  portal_accessed_at: string | null;
  portal_access_count: number;

  // Letter
  letter_id: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
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
    group_id: null
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

  if (!form.contact_email && !form.contact_phone) {
    errors.push('יש להזין מייל או טלפון לפחות');
  }

  if (form.contact_email && !isValidEmail(form.contact_email)) {
    errors.push('כתובת מייל לא תקינה');
  }

  if (!form.tax_year || form.tax_year < 2000 || form.tax_year > new Date().getFullYear()) {
    errors.push('שנת מס לא תקינה');
  }

  if (!form.declaration_date) {
    errors.push('תאריך הצהרה הוא שדה חובה');
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
  return Math.round((categoriesWithDocs / 6) * 100);
}
