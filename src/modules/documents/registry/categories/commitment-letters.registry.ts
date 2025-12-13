import type { DocumentCategory, DocumentType } from '../../types';

export const commitmentLettersCategory: DocumentCategory = {
  id: 'commitment-letters',
  name: 'מכתבי התחייבות',
  nameEnglish: 'Commitment Letters',
  description: 'מכתבי התחייבות וערבויות',
  icon: 'FileSignature',
  order: 4,
  permissions: {
    defaultRoles: ['admin', 'accountant', 'bookkeeper'],
    requiresOverride: true,
  },
  documentTypes: [
    'commitment-letters:general-commitment',
    'commitment-letters:payment-commitment',
  ],
};

export const commitmentLettersTypes: DocumentType[] = [
  {
    id: 'commitment-letters:general-commitment',
    categoryId: 'commitment-letters',
    name: 'מכתב התחייבות כללי',
    nameEnglish: 'General Commitment',
    description: 'מכתב התחייבות כללי של רואה חשבון',
    templatePath: 'commitment-letters/general-commitment.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'recipient_name', label: 'שם הנמען', type: 'text', required: true },
        { key: 'recipient_address', label: 'כתובת הנמען', type: 'textarea', required: false },
        { key: 'subject', label: 'נושא ההתחייבות', type: 'text', required: true },
        { key: 'commitment_text', label: 'תוכן ההתחייבות', type: 'textarea', required: true },
        { key: 'valid_until', label: 'תוקף עד', type: 'date', required: false },
      ],
    },
    formComponent: 'GeneralCommitmentForm',
    hasPaymentSection: false,
    order: 0,
  },
  {
    id: 'commitment-letters:payment-commitment',
    categoryId: 'commitment-letters',
    name: 'התחייבות תשלום',
    nameEnglish: 'Payment Commitment',
    description: 'מכתב התחייבות לתשלום',
    templatePath: 'commitment-letters/payment-commitment.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date', 'accountant_name', 'accountant_license'],
      specific: [
        { key: 'creditor_name', label: 'שם הנושה', type: 'text', required: true },
        { key: 'debt_amount', label: 'סכום החוב', type: 'currency', required: true },
        { key: 'payment_schedule', label: 'לוח תשלומים', type: 'textarea', required: true },
        { key: 'first_payment_date', label: 'תאריך תשלום ראשון', type: 'date', required: true },
        { key: 'guarantor_details', label: 'פרטי ערב (אם יש)', type: 'textarea', required: false },
      ],
    },
    formComponent: 'PaymentCommitmentForm',
    hasPaymentSection: false,
    order: 1,
  },
];
