import type { UserRole } from '@/types/user-role';
import type { ComponentType } from 'react';

/**
 * Document category identifier
 */
export type DocumentCategoryId =
  | 'foreign-workers'
  | 'tax-approvals'
  | 'bank-approvals'
  | 'commitment-letters'
  | 'tax-advances-2026'
  | 'auto-letters'
  | 'follow-ups';

/**
 * Document type identifier (category:type format for uniqueness)
 */
export type DocumentTypeId =
  // Foreign Workers (existing)
  | 'foreign-workers:accountant-turnover'
  | 'foreign-workers:israeli-workers'
  | 'foreign-workers:living-business'
  | 'foreign-workers:turnover-approval'
  | 'foreign-workers:salary-report'
  // Tax Approvals (new)
  | 'tax-approvals:vat-approval'
  | 'tax-approvals:income-tax-approval'
  | 'tax-approvals:withholding-tax-approval'
  // Bank Approvals (new)
  | 'bank-approvals:bank-confirmation'
  | 'bank-approvals:institution-approval'
  // Commitment Letters (new)
  | 'commitment-letters:general-commitment'
  | 'commitment-letters:payment-commitment'
  // Tax Advances 2026 (placeholder)
  | 'tax-advances-2026:monthly-advance'
  | 'tax-advances-2026:quarterly-advance'
  // Auto Letters (placeholder)
  | 'auto-letters:fee-reminder'
  | 'auto-letters:payment-confirmation'
  // Follow-ups (placeholder)
  | 'follow-ups:urgent-reminder'
  | 'follow-ups:collection-notice';

/**
 * Permission level for documents
 */
export interface DocumentPermissionLevel {
  defaultRoles: UserRole[];
  requiresOverride?: boolean;
  minRole?: UserRole;
}

/**
 * Document category definition
 */
export interface DocumentCategory {
  id: DocumentCategoryId;
  name: string;
  nameEnglish: string;
  description: string;
  icon: string;
  order: number;
  permissions: DocumentPermissionLevel;
  documentTypes: DocumentTypeId[];
}

/**
 * Variable field definition for form generation
 */
export interface VariableField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'table' | 'signature' | 'currency';
  required: boolean;
  defaultValue?: unknown;
  options?: { value: string; label: string }[];
  tableColumns?: VariableField[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

/**
 * Document type definition
 */
export interface DocumentType {
  id: DocumentTypeId;
  categoryId: DocumentCategoryId;
  name: string;
  nameEnglish: string;
  description: string;
  templatePath: string;
  headerPath?: string;
  footerPath?: string;
  permissions?: DocumentPermissionLevel;
  requiresClient: boolean;
  requiresBranch: boolean;
  requiresMonthlyData: boolean;
  variablesSchema: {
    shared: string[];
    specific: VariableField[];
  };
  formComponent: string;
  hasPaymentSection: boolean;
  order: number;
}

/**
 * Shared variables across all document types
 */
export interface SharedDataVariables {
  company_name: string;
  tax_id: string;
  document_date: string;
  client_id?: string;
  branch_id?: string;
  accountant_name?: string;
  accountant_license?: string;
}

/**
 * Category-level permission override
 */
export interface CategoryPermissionOverride {
  categoryId: DocumentCategoryId;
  tenantId: string;
  allowedRoles: UserRole[];
  deniedRoles: UserRole[];
  updatedAt: string;
  updatedBy: string;
}

/**
 * Document type-level permission override
 */
export interface DocumentTypePermissionOverride {
  documentTypeId: DocumentTypeId;
  tenantId: string;
  allowedRoles: UserRole[];
  deniedRoles: UserRole[];
  updatedAt: string;
  updatedBy: string;
}

/**
 * Computed permission result
 */
export interface DocumentPermissionResult {
  canAccess: boolean;
  reason: 'default' | 'category-override' | 'type-override' | 'super-admin';
  effectiveRoles: UserRole[];
}

/**
 * Form component props interface
 */
export interface DocumentFormProps<T = Record<string, unknown>> {
  value: T;
  onChange: (value: T) => void;
  clientId?: string;
  branchId?: string;
  disabled?: boolean;
}

/**
 * Legacy template type mapping
 */
export const LEGACY_TEMPLATE_TYPE_MAP: Record<string, DocumentTypeId> = {
  'foreign_worker_accountant_turnover': 'foreign-workers:accountant-turnover',
  'foreign_worker_israeli_workers': 'foreign-workers:israeli-workers',
  'foreign_worker_living_business': 'foreign-workers:living-business',
  'foreign_worker_turnover_approval': 'foreign-workers:turnover-approval',
  'foreign_worker_salary_report': 'foreign-workers:salary-report',
};

/**
 * New to legacy template type mapping
 */
export const DOCUMENT_TYPE_TO_LEGACY: Record<DocumentTypeId, string> = {
  'foreign-workers:accountant-turnover': 'foreign_worker_accountant_turnover',
  'foreign-workers:israeli-workers': 'foreign_worker_israeli_workers',
  'foreign-workers:living-business': 'foreign_worker_living_business',
  'foreign-workers:turnover-approval': 'foreign_worker_turnover_approval',
  'foreign-workers:salary-report': 'foreign_worker_salary_report',
  'tax-approvals:vat-approval': 'tax_approval_vat',
  'tax-approvals:income-tax-approval': 'tax_approval_income_tax',
  'tax-approvals:withholding-tax-approval': 'tax_approval_withholding',
  'bank-approvals:bank-confirmation': 'bank_approval_confirmation',
  'bank-approvals:institution-approval': 'bank_approval_institution',
  'commitment-letters:general-commitment': 'commitment_general',
  'commitment-letters:payment-commitment': 'commitment_payment',
  'tax-advances-2026:monthly-advance': 'tax_advance_monthly',
  'tax-advances-2026:quarterly-advance': 'tax_advance_quarterly',
  'auto-letters:fee-reminder': 'auto_letter_fee_reminder',
  'auto-letters:payment-confirmation': 'auto_letter_payment_confirm',
  'follow-ups:urgent-reminder': 'followup_urgent',
  'follow-ups:collection-notice': 'followup_collection',
};
