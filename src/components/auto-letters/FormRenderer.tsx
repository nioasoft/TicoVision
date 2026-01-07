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
  MortgageIncomeVariables,
  TaxPaymentNoticeVariables,
} from '@/types/auto-letters.types';

// Company Onboarding forms
import { VatRegistrationForm } from '@/components/company-onboarding/forms/VatRegistrationForm';
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
import { IncomeConfirmationForm, MortgageIncomeForm } from './forms/bank-approvals';

// Tax Notices forms
import { TaxPaymentNoticeForm } from './forms/tax-notices';

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
      return renderCompanyOnboardingForm(letterTypeId, value, onChange, disabled);

    case 'setting_dates':
      return renderSettingDatesForm(letterTypeId, value, onChange, disabled);

    case 'missing_documents':
      return renderMissingDocumentsForm(letterTypeId, value, onChange, disabled);

    case 'reminder_letters':
      return renderReminderLettersForm(letterTypeId, value, onChange, disabled);

    case 'bank_approvals':
      return renderBankApprovalsForm(letterTypeId, value, onChange, disabled, companyName, companyId);

    case 'tax_notices':
      return renderTaxNoticesForm(letterTypeId, value, onChange, disabled);

    default:
      return null;
  }
}

function renderCompanyOnboardingForm(
  letterTypeId: string,
  value: Record<string, unknown>,
  onChange: (data: Record<string, unknown>) => void,
  disabled?: boolean
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

    case 'mortgage_income':
      return (
        <MortgageIncomeForm
          value={value as Partial<MortgageIncomeVariables>}
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
