/**
 * File Attachment Types
 * Types for file upload system - client documents, business certificates, etc.
 */

export type FileType = 'image/jpeg' | 'image/jpg' | 'application/pdf';

export type UploadContext = 'client_form' | 'fee_calculation' | 'bookkeeping';

export interface ClientAttachment {
  id: string;
  tenant_id: string;
  client_id: string;

  // File metadata
  file_name: string;
  file_type: FileType;
  file_size: number;
  storage_path: string;

  // Upload context
  upload_context: UploadContext;
  year_context?: number;

  // Category system
  file_category: FileCategory;
  description: string | null;

  // Version tracking
  version: number;
  is_latest: boolean;
  replaces_attachment_id?: string;

  // Metadata
  uploaded_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FileUploadOptions {
  clientId: string;
  uploadContext: UploadContext;
  yearContext?: number;
  notes?: string;
}

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface FileValidation {
  valid: boolean;
  error?: string;
}

export interface FilePreviewData {
  id: string;
  name: string;
  type: FileType;
  url: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface FileVersionInfo {
  version: number;
  file_name: string;
  file_size: number;
  uploaded_by?: string;
  created_at: string;
  is_current: boolean;
}

// Constants
export const ALLOWED_FILE_TYPES: FileType[] = [
  'image/jpeg',
  'image/jpg',
  'application/pdf'
];

export const MAX_FILE_SIZE = 1024 * 1024; // 1MB in bytes

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  'image/jpeg': 'תמונה (JPG)',
  'image/jpg': 'תמונה (JPG)',
  'application/pdf': 'מסמך PDF'
};

export const UPLOAD_CONTEXT_LABELS: Record<UploadContext, string> = {
  'client_form': 'טופס לקוח',
  'fee_calculation': 'מחשבון שכר טרחה',
  'bookkeeping': 'הנהלת חשבונות'
};

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidation {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as FileType)) {
    return {
      valid: false,
      error: `סוג קובץ לא נתמך. יש להעלות רק JPG או PDF`
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `הקובץ גדול מדי (${sizeMB}MB). גודל מקסימלי: 1MB`
    };
  }

  return { valid: true };
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.'));
}

/**
 * Generate unique filename with timestamp
 * Cleans problematic characters for Supabase Storage (non-Latin chars, special chars)
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const extension = getFileExtension(originalName);
  let nameWithoutExt = originalName.slice(0, originalName.lastIndexOf('.'));

  // Remove all non-Latin characters (Hebrew, Arabic, etc.) - Supabase Storage only accepts Latin + numbers + - _ .
  nameWithoutExt = nameWithoutExt.replace(/[^\x00-\x7F]/g, ''); // Remove all non-ASCII

  // Remove leading/trailing underscores, spaces, and hyphens
  nameWithoutExt = nameWithoutExt.replace(/^[_\s-]+|[_\s-]+$/g, '');

  // Replace spaces and special characters with hyphens
  nameWithoutExt = nameWithoutExt.replace(/[^a-zA-Z0-9]+/g, '-');

  // Remove consecutive hyphens
  nameWithoutExt = nameWithoutExt.replace(/-+/g, '-');

  // Remove leading/trailing hyphens again after replacements
  nameWithoutExt = nameWithoutExt.replace(/^-+|-+$/g, '');

  // If name is empty after cleaning, use a default
  if (!nameWithoutExt) {
    nameWithoutExt = 'file';
  }

  return `${nameWithoutExt}-${timestamp}${extension}`;
}

// ===================================
// File Categories (8 Fixed Categories)
// ===================================

export type FileCategory =
  | 'company_registry'          // רשם החברות
  | 'financial_report'          // דוחות כספיים
  | 'bookkeeping_card'          // כרטיסי הנה"ח
  | 'quote_invoice'             // הצעות מחיר / תעודות חיוב
  | 'payment_proof_2026'        // אסמכתאות תשלום 2026
  | 'holdings_presentation'     // מצגת החזקות
  | 'general'                   // כללי
  | 'foreign_worker_docs';      // אישורי עובדים זרים

export interface CategoryConfig {
  key: FileCategory;
  label: string;
  description: string;
  icon?: string;
}

export const FILE_CATEGORIES: Record<FileCategory, CategoryConfig> = {
  company_registry: {
    key: 'company_registry',
    label: 'רשם החברות',
    description: 'תעודת רישום חברה, תקנון, פרוטוקולים מאסיפות',
  },
  financial_report: {
    key: 'financial_report',
    label: 'דוחות כספיים',
    description: 'דוח ביקורת שנתי, דוחות כספיים מבוקרים',
  },
  bookkeeping_card: {
    key: 'bookkeeping_card',
    label: 'כרטיסי הנה"ח',
    description: 'כרטיסי הנהלת חשבונות מפורטים לפי שנת מס',
  },
  quote_invoice: {
    key: 'quote_invoice',
    label: 'הצעות מחיר / תעודות חיוב',
    description: 'הצעות מחיר, תעודות חיוב, חשבוניות רלוונטיות',
  },
  payment_proof_2026: {
    key: 'payment_proof_2026',
    label: 'אסמכתאות תשלום 2026',
    description: 'אישורי העברה בנקאית, קבלות אשראי, צילומי המחאות',
  },
  holdings_presentation: {
    key: 'holdings_presentation',
    label: 'מצגת החזקות',
    description: 'מצגות להחזקות, תרשימי מבנה ארגוני, דיאגרמות',
  },
  general: {
    key: 'general',
    label: 'כללי',
    description: 'מסמכים נוספים שאינם משויכים לקטגוריה ספציפית',
  },
  foreign_worker_docs: {
    key: 'foreign_worker_docs',
    label: 'אישורי עובדים זרים',
    description: 'אישורי מחזור, עובדים ישראלים, דו"ח שכר ומסמכים נוספים לרשות האוכלוסין',
  },
};

export const getCategoryLabel = (category: FileCategory): string => {
  return FILE_CATEGORIES[category]?.label || category;
};

export const getCategoryDescription = (category: FileCategory): string => {
  return FILE_CATEGORIES[category]?.description || '';
};

export const getAllCategories = (): CategoryConfig[] => {
  return Object.values(FILE_CATEGORIES);
};
