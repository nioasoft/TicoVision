/**
 * FormRenderer - Dynamic form loading based on category and letter type
 */

import { Card, CardContent } from '@/components/ui/card';
import type { AutoLetterCategory } from '@/types/auto-letters.types';
import type { VatRegistrationVariables } from '@/types/company-onboarding.types';
import type {
  CutoffDateVariables,
  MeetingReminderVariables,
  GeneralDeadlineVariables,
  FinancialStatementsMeetingVariables,
  MissingDocumentsVariables,
} from '@/types/auto-letters.types';

// Company Onboarding forms
import { VatRegistrationForm } from '@/components/company-onboarding/forms/VatRegistrationForm';

// Setting Dates forms
import {
  CutoffDateForm,
  MeetingReminderForm,
  GeneralDeadlineForm,
  FinancialStatementsMeetingForm,
} from './forms/setting-dates';

// Missing Documents forms
import { MissingDocumentsForm } from './forms/missing-documents';

interface FormRendererProps {
  category: AutoLetterCategory;
  letterTypeId: string | null;
  value: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function FormRenderer({
  category,
  letterTypeId,
  value,
  onChange,
  disabled,
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

    case 'annual_approvals':
      return (
        <Card className="mb-6">
          <CardContent className="py-8 text-center text-gray-500">
            סוגי מכתבים לאישורים שנתיים יתווספו בקרוב
          </CardContent>
        </Card>
      );

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
