import type { DocumentCategory, DocumentType } from '../../types';

export const taxApprovalsCategory: DocumentCategory = {
  id: 'tax-approvals',
  name: 'אישורי מס',
  nameEnglish: 'Tax Approvals',
  description: 'מכתבים ואישורים הקשורים לרשויות המס',
  icon: 'Receipt',
  order: 2,
  permissions: {
    defaultRoles: ['admin', 'accountant'],
    requiresOverride: true,
  },
  documentTypes: [
    'tax-approvals:vat-approval',
    'tax-approvals:income-tax-approval',
    'tax-approvals:withholding-tax-approval',
  ],
};

export const taxApprovalsTypes: DocumentType[] = [
  {
    id: 'tax-approvals:vat-approval',
    categoryId: 'tax-approvals',
    name: 'אישור מע"מ',
    nameEnglish: 'VAT Approval',
    description: 'אישור על תשלומי מע"מ ומחזורים',
    templatePath: 'tax-approvals/vat-approval.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'vat_period', label: 'תקופת דיווח', type: 'text', required: true },
        { key: 'vat_amount', label: 'סכום מע"מ', type: 'currency', required: true },
        { key: 'turnover_amount', label: 'מחזור לתקופה', type: 'currency', required: true },
        { key: 'confirmation_text', label: 'נוסח האישור', type: 'textarea', required: false },
      ],
    },
    formComponent: 'VATApprovalForm',
    hasPaymentSection: false,
    order: 0,
  },
  {
    id: 'tax-approvals:income-tax-approval',
    categoryId: 'tax-approvals',
    name: 'אישור מס הכנסה',
    nameEnglish: 'Income Tax Approval',
    description: 'אישור על דיווחי מס הכנסה',
    templatePath: 'tax-approvals/income-tax-approval.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'tax_year', label: 'שנת מס', type: 'text', required: true },
        { key: 'taxable_income', label: 'הכנסה חייבת', type: 'currency', required: true },
        { key: 'tax_paid', label: 'מס ששולם', type: 'currency', required: true },
        { key: 'filing_status', label: 'סטטוס דיווח', type: 'select', required: true, options: [
          { value: 'filed', label: 'הוגש' },
          { value: 'pending', label: 'ממתין' },
          { value: 'extension', label: 'בהארכה' },
        ]},
      ],
    },
    formComponent: 'IncomeTaxApprovalForm',
    hasPaymentSection: false,
    order: 1,
  },
  {
    id: 'tax-approvals:withholding-tax-approval',
    categoryId: 'tax-approvals',
    name: 'אישור ניכוי מס במקור',
    nameEnglish: 'Withholding Tax Approval',
    description: 'אישור על ניכוי מס במקור לספקים',
    templatePath: 'tax-approvals/withholding-tax-approval.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'withholding_rate', label: 'שיעור ניכוי', type: 'number', required: true },
        { key: 'valid_from', label: 'תוקף מתאריך', type: 'date', required: true },
        { key: 'valid_until', label: 'תוקף עד תאריך', type: 'date', required: true },
        { key: 'certificate_number', label: 'מספר אישור', type: 'text', required: false },
      ],
    },
    formComponent: 'WithholdingTaxApprovalForm',
    hasPaymentSection: false,
    order: 2,
  },
];
