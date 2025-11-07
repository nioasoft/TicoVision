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
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const extension = getFileExtension(originalName);
  const nameWithoutExt = originalName.slice(0, originalName.lastIndexOf('.'));

  return `${nameWithoutExt}-${timestamp}${extension}`;
}
