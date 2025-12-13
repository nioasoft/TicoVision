import type { DocumentCategory, DocumentType } from '../../types';

export const followUpsCategory: DocumentCategory = {
  id: 'follow-ups',
  name: 'פניות/זירוז/דחיפה',
  nameEnglish: 'Follow-ups',
  description: 'מכתבי מעקב, זירוז ודחיפה ללקוחות',
  icon: 'MessageSquarePlus',
  order: 7,
  permissions: {
    defaultRoles: ['admin'],
    requiresOverride: false,
  },
  documentTypes: [
    'follow-ups:urgent-reminder',
    'follow-ups:collection-notice',
  ],
};

export const followUpsTypes: DocumentType[] = [
  {
    id: 'follow-ups:urgent-reminder',
    categoryId: 'follow-ups',
    name: 'תזכורת דחופה',
    nameEnglish: 'Urgent Reminder',
    description: 'מכתב תזכורת דחופה לטיפול',
    templatePath: 'follow-ups/urgent-reminder.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date'],
      specific: [
        { key: 'subject', label: 'נושא הפנייה', type: 'text', required: true },
        { key: 'deadline', label: 'תאריך יעד', type: 'date', required: true },
        { key: 'urgency_level', label: 'רמת דחיפות', type: 'select', required: true, options: [
          { value: 'high', label: 'גבוהה' },
          { value: 'medium', label: 'בינונית' },
          { value: 'low', label: 'נמוכה' },
        ]},
        { key: 'details', label: 'פרטים', type: 'textarea', required: false },
      ],
    },
    formComponent: 'UrgentReminderForm',
    hasPaymentSection: false,
    order: 0,
  },
  {
    id: 'follow-ups:collection-notice',
    categoryId: 'follow-ups',
    name: 'הודעת גבייה',
    nameEnglish: 'Collection Notice',
    description: 'מכתב גבייה רשמי',
    templatePath: 'follow-ups/collection-notice.html',
    requiresClient: true,
    requiresBranch: false,
    requiresMonthlyData: false,
    variablesSchema: {
      shared: ['company_name', 'tax_id', 'document_date'],
      specific: [
        { key: 'debt_amount', label: 'סכום חוב', type: 'currency', required: true },
        { key: 'debt_period', label: 'תקופת החוב', type: 'text', required: true },
        { key: 'payment_deadline', label: 'מועד אחרון לתשלום', type: 'date', required: true },
        { key: 'legal_warning', label: 'אזהרה משפטית', type: 'textarea', required: false },
      ],
    },
    formComponent: 'CollectionNoticeForm',
    hasPaymentSection: true,
    order: 1,
  },
];
