import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_SUBJECTS,
  type ClientTaxPrefill,
  type IncomeTaxWithholdingFileOpenedVariables,
} from '@/types/auto-letters.types';
import { IncomeTaxWithholdingSection } from './sections/IncomeTaxWithholdingSection';

interface IncomeTaxWithholdingFileOpenedFormProps {
  value: Partial<IncomeTaxWithholdingFileOpenedVariables>;
  onChange: (data: Partial<IncomeTaxWithholdingFileOpenedVariables>) => void;
  disabled?: boolean;
  companyId?: string;
  clientTaxPrefill?: ClientTaxPrefill;
}

export function IncomeTaxWithholdingFileOpenedForm({
  value,
  onChange,
  disabled,
  companyId,
  clientTaxPrefill,
}: IncomeTaxWithholdingFileOpenedFormProps) {
  useEffect(() => {
    if (companyId && !value.company_id) {
      onChange({ ...value, company_id: companyId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  return (
    <div dir="rtl">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-right text-base">
            הודעה על פתיחת תיק מס הכנסה ניכויים
          </CardTitle>
          <CardDescription className="text-right text-sm">
            הודעה ללקוח על פתיחת תיק ניכויים במס הכנסה (עובדים)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          <div className="space-y-1">
            <Label htmlFor="subject" className="text-right block text-sm">
              הנדון
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || DEFAULT_SUBJECTS.income_tax_withholding_file_opened}
              disabled={true}
              className="text-right bg-gray-100 h-9"
              dir="rtl"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="company-id" className="text-right block text-sm">
              מספר ח.פ
            </Label>
            <Input
              id="company-id"
              type="text"
              value={value.company_id || ''}
              onChange={(e) => onChange({ ...value, company_id: e.target.value })}
              disabled={disabled}
              className="text-right h-9"
              dir="rtl"
              maxLength={9}
            />
          </div>

          <IncomeTaxWithholdingSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
            prefillFileNumber={clientTaxPrefill?.income_tax_withholding_file_number ?? null}
          />

          {(!value.company_id?.trim() ||
            !value.income_tax_withholding_file_number?.trim() ||
            !value.employment_start_month_year?.trim() ||
            !value.income_tax_withholding_first_report_date?.trim() ||
            !value.income_tax_withholding_frequency) && (
            <p className="text-xs text-amber-600 text-right">יש למלא את כל השדות הנדרשים</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
