import type { DocumentCategory, DocumentType } from '../../types';

export const taxAdvancesCategory: DocumentCategory = {
  id: 'tax-advances-2026',
  name: 'מקדמות מ"ה שוטפות 2026',
  nameEnglish: 'Tax Advances 2026',
  description: 'ניהול מקדמות מס הכנסה שוטפות לשנת 2026',
  icon: 'Receipt',
  order: 5,
  permissions: {
    defaultRoles: ['admin'],
    requiresOverride: false,
  },
  documentTypes: [
    'tax-advances-2026:monthly-advance',
    'tax-advances-2026:quarterly-advance',
  ],
};

export const taxAdvancesTypes: DocumentType[] = [
  {
    id: 'tax-advances-2026:monthly-advance',
    categoryId: 'tax-advances-2026',
    name: 'מקדמה חודשית',
    nameEnglish: 'Monthly Advance',
    description: 'אישור מקדמה חודשית למס הכנסה',
    templatePath: 'tax-advances/monthly-advance.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date'],
      specific: [
        { key: 'month', label: 'חודש', type: 'text', required: true },
        { key: 'amount', label: 'סכום מקדמה', type: 'currency', required: true },
      ],
    },
    formComponent: 'MonthlyAdvanceForm',
    hasPaymentSection: false,
    order: 0,
  },
  {
    id: 'tax-advances-2026:quarterly-advance',
    categoryId: 'tax-advances-2026',
    name: 'מקדמה רבעונית',
    nameEnglish: 'Quarterly Advance',
    description: 'אישור מקדמה רבעונית למס הכנסה',
    templatePath: 'tax-advances/quarterly-advance.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date'],
      specific: [
        { key: 'quarter', label: 'רבעון', type: 'select', required: true, options: [
          { value: 'Q1', label: 'רבעון 1' },
          { value: 'Q2', label: 'רבעון 2' },
          { value: 'Q3', label: 'רבעון 3' },
          { value: 'Q4', label: 'רבעון 4' },
        ]},
        { key: 'amount', label: 'סכום מקדמה', type: 'currency', required: true },
      ],
    },
    formComponent: 'QuarterlyAdvanceForm',
    hasPaymentSection: false,
    order: 1,
  },
];
