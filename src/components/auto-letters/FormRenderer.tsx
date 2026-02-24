/**
 * FormRenderer - Dynamic form loading based on category and letter type
 */

import { Card, CardContent } from '@/components/ui/card';
import type { AutoLetterCategory } from '@/types/auto-letters.types';
import type { VatRegistrationVariables, PriceQuoteVariables, PreviousAccountantRequestVariables } from '@/types/company-onboarding.types';
import type {
  CutoffDateVariables,
  MeetingReminderVariables,
  GeneralDeadlineVariables,
  FinancialStatementsMeetingVariables,
  MissingDocumentsVariables,
  PersonalReportReminderVariables,
  BookkeeperBalanceReminderVariables,
  IncomeConfirmationVariables,
  TaxPaymentNoticeVariables,
  AnnualFeeNoticeVariables,
  MortgageAuditedCompanyVariables,
  MortgageUnauditedCompanyVariables,
  MortgageOsekSubmittedVariables,
  MortgageOsekUnsubmittedVariables,
  AuditCompletionVariables,
  VatFileOpenedVariables,
  AccountantAppointmentVariables,
  TaxAdvancesRateNotificationVariables,
  TaxRefundVariables,
} from '@/types/auto-letters.types';

// Company Onboarding forms
import { VatRegistrationForm } from '@/components/company-onboarding/forms/VatRegistrationForm';
import { VatFileOpenedForm } from '@/components/company-onboarding/forms/VatFileOpenedForm';
import { PriceQuoteForm } from '@/components/company-onboarding/forms/PriceQuoteForm';
import { PreviousAccountantRequestForm } from '@/components/company-onboarding/forms/PreviousAccountantRequestForm';

// Setting Dates forms
import {
  CutoffDateForm,
  MeetingReminderForm,
  GeneralDeadlineForm,
  FinancialStatementsMeetingForm,
} from './forms/setting-dates';

// Missing Documents forms
import { MissingDocumentsForm } from './forms/missing-documents';

// Reminder Letters forms
import {
  PersonalReportReminderForm,
  BookkeeperBalanceReminderForm,
} from './forms/reminder-letters';

// Bank Approvals forms
import { IncomeConfirmationForm } from './forms/bank-approvals';

// Mortgage Approvals forms
import {
  AuditedCompanyForm,
  UnauditedCompanyForm,
  OsekSubmittedForm,
  OsekUnsubmittedForm,
} from './forms/mortgage-approvals';

// Tax Notices forms
import { TaxPaymentNoticeForm, AnnualFeeNoticeForm } from './forms/tax-notices';

// Audit Completion forms
import { AuditCompletionForm } from './forms/audit-completion';

// Protocols forms
import { AccountantAppointmentForm } from './forms/protocols';

// Tax Advances forms
import { TaxAdvancesRateNotificationForm } from './forms/tax-advances';

// Tax Refund forms
import { TaxRefundForm } from './forms/tax-refund';

interface FormRendererProps {
  category: AutoLetterCategory;
  letterTypeId: string | null;
  value: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  disabled?: boolean;
  companyName?: string;  // For bank_approvals forms
  companyId?: string;    // For bank_approvals forms
}

export function FormRenderer({
  category,
  letterTypeId,
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: FormRendererProps) {
  // Show placeholder if no letter type selected
  if (!letterTypeId) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center text-gray-500">
          בחר סוג מכתב להמשך
        </CardContent>
      </Card>
    );
  }

  // Render form based on category and letter type
  switch (category) {
    case 'company_onboarding':
      return renderCompanyOnboardingForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'setting_dates':
      return renderSettingDatesForm(letterTypeId, value, onChange, disabled);

    case 'missing_documents':
      return renderMissingDocumentsForm(letterTypeId, value, onChange, disabled);

    case 'reminder_letters':
      return renderReminderLettersForm(letterTypeId, value, onChange, disabled);

    case 'bank_approvals':
      return renderBankApprovalsForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'mortgage_approvals':
      return renderMortgageApprovalsForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'tax_notices':
      return renderTaxNoticesForm(letterTypeId, value, onChange, disabled);

    case 'company_registrar':
      return renderCompanyRegistrarForm(letterTypeId, value, onChange, disabled);

    case 'audit_completion':
      return renderAuditCompletionForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'protocols':
      return renderProtocolsForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'tax_advances':
      return renderTaxAdvancesForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'tax_refund':
      return renderTaxRefundForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    default:
      return null;
  }
}

function renderCompanyOnboardingForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
  companyId?: string
) {
  switch (letterTypeId) {
    case 'vat_registration':
      return (
        <VatRegistrationForm
          value={value as Partial<VatRegistrationVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    case 'vat_file_opened':
      return (
        <VatFileOpenedForm
          value={value as Partial<VatFileOpenedVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyId={companyId}
        />
      );

    case 'price_quote_small':
    case 'price_quote_restaurant':
      return (
        <PriceQuoteForm
          value={value as Partial<PriceQuoteVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    case 'previous_accountant_request':
      return (
        <PreviousAccountantRequestForm
          value={value as Partial<PreviousAccountantRequestVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderSettingDatesForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean
) {
  switch (letterTypeId) {
    case 'cutoff_date':
      return (
        <CutoffDateForm
          value={value as Partial<CutoffDateVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    case 'meeting_reminder':
      return (
        <MeetingReminderForm
          value={value as Partial<MeetingReminderVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    case 'general_deadline':
      return (
        <GeneralDeadlineForm
          value={value as Partial<GeneralDeadlineVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    case 'financial_statements':
      return (
        <FinancialStatementsMeetingForm
          value={value as Partial<FinancialStatementsMeetingVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderMissingDocumentsForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean
) {
  switch (letterTypeId) {
    case 'general_missing':
      return (
        <MissingDocumentsForm
          value={value as Partial<MissingDocumentsVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderReminderLettersForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean
) {
  switch (letterTypeId) {
    case 'personal_report_reminder':
      return (
        <PersonalReportReminderForm
          value={value as Partial<PersonalReportReminderVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    case 'bookkeeper_balance_reminder':
      return (
        <BookkeeperBalanceReminderForm
          value={value as Partial<BookkeeperBalanceReminderVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderBankApprovalsForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
  companyId?: string
) {
  switch (letterTypeId) {
    case 'income_confirmation':
      return (
        <IncomeConfirmationForm
          value={value as Partial<IncomeConfirmationVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderMortgageApprovalsForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
  companyId?: string
) {
  switch (letterTypeId) {
    case 'audited_company':
      return (
        <AuditedCompanyForm
          value={value as Partial<MortgageAuditedCompanyVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    case 'unaudited_company':
      return (
        <UnauditedCompanyForm
          value={value as Partial<MortgageUnauditedCompanyVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    case 'osek_submitted':
      return (
        <OsekSubmittedForm
          value={value as Partial<MortgageOsekSubmittedVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    case 'osek_unsubmitted':
      return (
        <OsekUnsubmittedForm
          value={value as Partial<MortgageOsekUnsubmittedVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderTaxNoticesForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean
) {
  switch (letterTypeId) {
    case 'tax_payment_notice':
      return (
        <TaxPaymentNoticeForm
          value={value as Partial<TaxPaymentNoticeVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderCompanyRegistrarForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean
) {
  switch (letterTypeId) {
    case 'annual_fee_notice':
      return (
        <AnnualFeeNoticeForm
          value={value as Partial<AnnualFeeNoticeVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderAuditCompletionForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
  companyId?: string
) {
  switch (letterTypeId) {
    case 'general':
      return (
        <AuditCompletionForm
          value={value as Partial<AuditCompletionVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderProtocolsForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
  companyId?: string
) {
  switch (letterTypeId) {
    case 'accountant_appointment':
      return (
        <AccountantAppointmentForm
          value={value as Partial<AccountantAppointmentVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
          companyId={companyId}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג פרוטוקול לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderTaxAdvancesForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
) {
  switch (letterTypeId) {
    case 'rate_notification':
      return (
        <TaxAdvancesRateNotificationForm
          value={value as Partial<TaxAdvancesRateNotificationVariables>}
          onChange={(data) => onChange(data as Record<string, unknown>)}
          disabled={disabled}
          companyName={companyName}
        />
      );

    default:
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוג מכתב מקדמות לא מוכר
          </CardContent>
        </Card>
      );
  }
}

function renderTaxRefundForm(
  _letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean,
  companyName?: string,
  companyId?: string
) {
  // All 3 tax refund types share the same form
  return (
    <TaxRefundForm
      value={value as Partial<TaxRefundVariables>}
      onChange={(data) => onChange(data as Record<string, unknown>)}
      disabled={disabled}
      companyName={companyName}
      companyId={companyId}
    />
  );
}
