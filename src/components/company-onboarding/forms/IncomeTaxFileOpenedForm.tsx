import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_SUBJECTS,
  type IncomeTaxFileOpenedVariables,
} from '@/types/auto-letters.types';
import { IncomeTaxSection } from './sections/IncomeTaxSection';

interface IncomeTaxFileOpenedFormProps {
  value: Partial<IncomeTaxFileOpenedVariables>;
  onChange: (data: Partial<IncomeTaxFileOpenedVariables>) => void;
  disabled?: boolean;
  /** ח.פ. of the selected client - auto-populates company_id */
  companyId?: string;
}

export function IncomeTaxFileOpenedForm({
  value,
  onChange,
  disabled,
  companyId,
}: IncomeTaxFileOpenedFormProps) {
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
          <CardTitle className="text-right text-base">הודעה על פתיחת תיק מס הכנסה</CardTitle>
          <CardDescription className="text-right text-sm">
            הודעה ללקוח על פתיחת תיק במס הכנסה
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
              value={value.subject || DEFAULT_SUBJECTS.income_tax_file_opened}
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

          <IncomeTaxSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
          />

          {(!value.company_id?.trim() ||
            !value.tax_filing_year?.trim() ||
            !value.advance_payment_rate?.trim()) && (
            <p className="text-xs text-amber-600 text-right">יש למלא את כל השדות הנדרשים</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
