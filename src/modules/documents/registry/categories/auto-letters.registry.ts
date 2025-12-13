import type { DocumentCategory, DocumentType } from '../../types';

export const autoLettersCategory: DocumentCategory = {
  id: 'auto-letters',
  name: 'מכתבים אוטומטיים',
  nameEnglish: 'Automatic Letters',
  description: 'מכתבים אוטומטיים לתזכורות ואישורים',
  icon: 'MailPlus',
  order: 6,
  permissions: {
    defaultRoles: ['admin'],
    requiresOverride: false,
  },
  documentTypes: [
    'auto-letters:fee-reminder',
    'auto-letters:payment-confirmation',
  ],
};

export const autoLettersTypes: DocumentType[] = [
  {
    id: 'auto-letters:fee-reminder',
    categoryId: 'auto-letters',
    name: 'תזכורת שכר טרחה',
    nameEnglish: 'Fee Reminder',
    description: 'מכתב תזכורת אוטומטי לתשלום שכר טרחה',
    templatePath: 'auto-letters/fee-reminder.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date'],
      specific: [
        { key: 'fee_year', label: 'שנת שכ"ט', type: 'text', required: true },
        { key: 'amount_due', label: 'סכום לתשלום', type: 'currency', required: true },
        { key: 'due_date', label: 'תאריך יעד', type: 'date', required: true },
      ],
    },
    formComponent: 'FeeReminderForm',
    hasPaymentSection: true,
    order: 0,
  },
  {
    id: 'auto-letters:payment-confirmation',
    categoryId: 'auto-letters',
    name: 'אישור תשלום',
    nameEnglish: 'Payment Confirmation',
    description: 'מכתב אישור קבלת תשלום',
    templatePath: 'auto-letters/payment-confirmation.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date'],
      specific: [
        { key: 'payment_date', label: 'תאריך תשלום', type: 'date', required: true },
        { key: 'amount_paid', label: 'סכום ששולם', type: 'currency', required: true },
        { key: 'payment_method', label: 'אמצעי תשלום', type: 'select', required: true, options: [
          { value: 'bank_transfer', label: 'העברה בנקאית' },
          { value: 'credit_card', label: 'כרטיס אשראי' },
          { value: 'check', label: 'צ\'ק' },
        ]},
      ],
    },
    formComponent: 'PaymentConfirmationForm',
    hasPaymentSection: false,
    order: 1,
  },
];
