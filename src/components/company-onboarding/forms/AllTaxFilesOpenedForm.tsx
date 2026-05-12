import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DEFAULT_SUBJECTS,
  type AllTaxFilesOpenedVariables,
  type ClientTaxPrefill,
} from '@/types/auto-letters.types';
import { IncomeTaxSection } from './sections/IncomeTaxSection';
import { IncomeTaxWithholdingSection } from './sections/IncomeTaxWithholdingSection';
import { SocialSecurityWithholdingSection } from './sections/SocialSecurityWithholdingSection';
import { TaxWithholdingCertificateSection } from './sections/TaxWithholdingCertificateSection';

interface AllTaxFilesOpenedFormProps {
  value: Partial<AllTaxFilesOpenedVariables>;
  onChange: (data: Partial<AllTaxFilesOpenedVariables>) => void;
  disabled?: boolean;
  companyId?: string;
  clientTaxPrefill?: ClientTaxPrefill;
}

export function AllTaxFilesOpenedForm({
  value,
  onChange,
  disabled,
  companyId,
  clientTaxPrefill,
}: AllTaxFilesOpenedFormProps) {
  useEffect(() => {
    if (companyId && !value.company_id) {
      onChange({ ...value, company_id: companyId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const isMissing =
    !value.company_id?.trim() ||
    !value.tax_filing_year?.trim() ||
    !value.advance_payment_rate?.trim() ||
    !value.income_tax_withholding_file_number?.trim() ||
    !value.employment_start_month_year?.trim() ||
    !value.income_tax_withholding_first_report_date?.trim() ||
    !value.income_tax_withholding_frequency ||
    !value.social_security_withholding_file_number?.trim() ||
    !value.social_security_withholding_first_report_date?.trim() ||
    !value.social_security_withholding_frequency ||
    value.tax_withholding_percentage === undefined ||
    value.tax_withholding_percentage === null ||
    !value.certificate_valid_until?.trim();

  return (
    <div dir="rtl">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-right text-base">
            פתיחת תיקי ניכויים - מכתב מאוחד
          </CardTitle>
          <CardDescription className="text-right text-sm">
            מכתב אחד הכולל את כל פתיחות התיקים: מס הכנסה, ניכויים מ"ה, ניכויים ב"ל, אישור ניכוי מס במקור
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 pb-4 pt-0">
          <div className="space-y-1">
            <Label htmlFor="subject" className="text-right block text-sm">
              הנדון
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || DEFAULT_SUBJECTS.all_tax_files_opened}
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

          <Separator />
          <IncomeTaxSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
          />

          <Separator />
          <IncomeTaxWithholdingSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
            prefillFileNumber={clientTaxPrefill?.income_tax_withholding_file_number ?? null}
          />

          <Separator />
          <SocialSecurityWithholdingSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
            prefillFileNumber={clientTaxPrefill?.social_security_withholding_file_number ?? null}
          />

          <Separator />
          <TaxWithholdingCertificateSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
            prefillPercentage={clientTaxPrefill?.tax_withholding_percentage ?? null}
          />

          {isMissing && (
            <p className="text-xs text-amber-600 text-right">יש למלא את כל השדות בכל ארבעת הסעיפים</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
