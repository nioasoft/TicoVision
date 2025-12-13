import type { DocumentCategory, DocumentType } from '../../types';

export const bankApprovalsCategory: DocumentCategory = {
  id: 'bank-approvals',
  name: 'אישורים לבנקים/מוסדות',
  nameEnglish: 'Bank Approvals',
  description: 'אישורים ומכתבים לבנקים ומוסדות פיננסיים',
  icon: 'Building2',
  order: 3,
  permissions: {
    defaultRoles: ['admin', 'accountant'],
    requiresOverride: true,
  },
  documentTypes: [
    'bank-approvals:bank-confirmation',
    'bank-approvals:institution-approval',
  ],
};

export const bankApprovalsTypes: DocumentType[] = [
  {
    id: 'bank-approvals:bank-confirmation',
    categoryId: 'bank-approvals',
    name: 'אישור לבנק',
    nameEnglish: 'Bank Confirmation',
    description: 'אישור רואה חשבון לבנק',
    templatePath: 'bank-approvals/bank-confirmation.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'bank_name', label: 'שם הבנק', type: 'text', required: true },
        { key: 'branch_number', label: 'מספר סניף', type: 'text', required: false },
        { key: 'purpose', label: 'מטרת האישור', type: 'select', required: true, options: [
          { value: 'loan', label: 'הלוואה' },
          { value: 'credit_line', label: 'מסגרת אשראי' },
          { value: 'mortgage', label: 'משכנתא' },
          { value: 'account_opening', label: 'פתיחת חשבון' },
          { value: 'other', label: 'אחר' },
        ]},
        { key: 'annual_turnover', label: 'מחזור שנתי', type: 'currency', required: true },
        { key: 'years_in_business', label: 'שנות פעילות', type: 'number', required: true },
        { key: 'additional_info', label: 'מידע נוסף', type: 'textarea', required: false },
      ],
    },
    formComponent: 'BankConfirmationForm',
    hasPaymentSection: false,
    order: 0,
  },
  {
    id: 'bank-approvals:institution-approval',
    categoryId: 'bank-approvals',
    name: 'אישור למוסד',
    nameEnglish: 'Institution Approval',
    description: 'אישור רואה חשבון למוסד פיננסי או ממשלתי',
    templatePath: 'bank-approvals/institution-approval.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'institution_name', label: 'שם המוסד', type: 'text', required: true },
        { key: 'purpose', label: 'מטרת האישור', type: 'textarea', required: true },
        { key: 'financial_data', label: 'נתונים פיננסיים', type: 'textarea', required: false },
        { key: 'declaration_text', label: 'נוסח הצהרה', type: 'textarea', required: false },
      ],
    },
    formComponent: 'InstitutionApprovalForm',
    hasPaymentSection: false,
    order: 1,
  },
];
