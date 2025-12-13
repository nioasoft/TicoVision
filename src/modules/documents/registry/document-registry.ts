import type {
  DocumentCategory,
  DocumentType,
  DocumentCategoryId,
  DocumentTypeId,
  LEGACY_TEMPLATE_TYPE_MAP,
  DOCUMENT_TYPE_TO_LEGACY,
} from '../types';
import {
  foreignWorkersCategory,
  foreignWorkersTypes,
  taxApprovalsCategory,
  taxApprovalsTypes,
  bankApprovalsCategory,
  bankApprovalsTypes,
  commitmentLettersCategory,
  commitmentLettersTypes,
  taxAdvancesCategory,
  taxAdvancesTypes,
  autoLettersCategory,
  autoLettersTypes,
  followUpsCategory,
  followUpsTypes,
} from './categories';

/**
 * Central Document Registry
 * Single source of truth for all document definitions
 */
class DocumentRegistry {
  private categories: Map<DocumentCategoryId, DocumentCategory> = new Map();
  private documentTypes: Map<DocumentTypeId, DocumentType> = new Map();

  constructor() {
    this.registerCategory(foreignWorkersCategory, foreignWorkersTypes);
    this.registerCategory(taxApprovalsCategory, taxApprovalsTypes);
    this.registerCategory(bankApprovalsCategory, bankApprovalsTypes);
    this.registerCategory(commitmentLettersCategory, commitmentLettersTypes);
    this.registerCategory(taxAdvancesCategory, taxAdvancesTypes);
    this.registerCategory(autoLettersCategory, autoLettersTypes);
    this.registerCategory(followUpsCategory, followUpsTypes);
  }

  private registerCategory(category: DocumentCategory, types: DocumentType[]): void {
    this.categories.set(category.id, category);
    types.forEach((type) => {
      this.documentTypes.set(type.id, type);
    });
  }

  /**
   * Get all categories sorted by order
   */
  getAllCategories(): DocumentCategory[] {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * Get a category by ID
   */
  getCategory(id: DocumentCategoryId): DocumentCategory | undefined {
    return this.categories.get(id);
  }

  /**
   * Get a document type by ID
   */
  getDocumentType(id: DocumentTypeId): DocumentType | undefined {
    return this.documentTypes.get(id);
  }

  /**
   * Get all document types for a category
   */
  getDocumentTypesForCategory(categoryId: DocumentCategoryId): DocumentType[] {
    return Array.from(this.documentTypes.values())
      .filter((type) => type.categoryId === categoryId)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Get all document types
   */
  getAllDocumentTypes(): DocumentType[] {
    return Array.from(this.documentTypes.values());
  }

  /**
   * Convert legacy template type to new document type ID
   */
  fromLegacyTemplateType(legacyType: string): DocumentTypeId | undefined {
    const mapping: Record<string, DocumentTypeId> = {
      foreign_worker_accountant_turnover: 'foreign-workers:accountant-turnover',
      foreign_worker_israeli_workers: 'foreign-workers:israeli-workers',
      foreign_worker_living_business: 'foreign-workers:living-business',
      foreign_worker_turnover_approval: 'foreign-workers:turnover-approval',
      foreign_worker_salary_report: 'foreign-workers:salary-report',
    };
    return mapping[legacyType];
  }

  /**
   * Convert new document type ID to legacy template type
   */
  toLegacyTemplateType(id: DocumentTypeId): string {
    const mapping: Record<DocumentTypeId, string> = {
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
    return mapping[id] || id;
  }

  /**
   * Check if a category exists
   */
  hasCategory(id: string): id is DocumentCategoryId {
    return this.categories.has(id as DocumentCategoryId);
  }

  /**
   * Check if a document type exists
   */
  hasDocumentType(id: string): id is DocumentTypeId {
    return this.documentTypes.has(id as DocumentTypeId);
  }

  /**
   * Get category by document type ID
   */
  getCategoryByDocumentType(documentTypeId: DocumentTypeId): DocumentCategory | undefined {
    const docType = this.getDocumentType(documentTypeId);
    if (!docType) return undefined;
    return this.getCategory(docType.categoryId);
  }
}

// Singleton export
export const documentRegistry = new DocumentRegistry();
