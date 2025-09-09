/**
 * Global Business Rules Configuration
 * All business rules and constants should be defined here for easy customization
 */

export const BUSINESS_RULES = {
  // Fee Management Rules
  fees: {
    defaultInflationRate: 3.5, // Percentage
    maxDiscountPercentage: 20,
    lateFeePercentage: 1.5,
    gracePeriodDays: 7,
    reminderIntervalDays: 30,
    escalationStages: [
      { days: 30, template: 'payment_reminder_gentle' },
      { days: 60, template: 'payment_reminder_firm' },
      { days: 90, template: 'payment_overdue' },
      { days: 120, template: 'service_suspension_warning' },
    ],
  },

  // Client Management Rules  
  clients: {
    maxClientsPerTenant: 10000,
    defaultPaginationSize: 20,
    searchMinChars: 2,
    taxIdLength: 9,
    requiredFields: ['company_name', 'tax_id', 'contact_name'],
  },

  // Payment Rules
  payments: {
    defaultCurrency: 'ILS',
    supportedCurrencies: ['ILS', 'USD', 'EUR'],
    minPaymentAmount: 1,
    maxPaymentAmount: 999999,
    paymentLinkExpiryDays: 30,
  },

  // Letter Templates Rules
  letters: {
    maxTemplatesPerType: 10,
    supportedLanguages: ['he', 'en'],
    defaultLanguage: 'he',
    requiredVariables: ['client_name', 'amount', 'date'],
    maxLetterSizeKB: 500,
  },

  // System Rules
  system: {
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    auditLogRetentionDays: 730, // 2 years
    defaultTimezone: 'Asia/Jerusalem',
    workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    fiscalYearStartMonth: 1, // January
  },

  // Israeli Market Specific
  israeli: {
    vatRate: 17, // Percentage
    taxYearStart: { month: 1, day: 1 },
    taxYearEnd: { month: 12, day: 31 },
    officialHolidays: [
      'rosh_hashanah',
      'yom_kippur',
      'sukkot',
      'pesach',
      'shavuot',
      'independence_day',
    ],
  },
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  israeliTaxId: /^\d{9}$/,
  israeliPhone: /^((\+972|972)|0)?(([23489]|5[0248]|77)[0-9]{7})$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  currency: /^\d+(\.\d{1,2})?$/,
} as const;

// Date Formats
export const DATE_FORMATS = {
  display: 'DD/MM/YYYY',
  input: 'YYYY-MM-DD',
  datetime: 'DD/MM/YYYY HH:mm',
  time: 'HH:mm',
} as const;