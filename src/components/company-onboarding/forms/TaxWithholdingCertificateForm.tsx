import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  DEFAULT_SUBJECTS,
  type ClientTaxPrefill,
  type TaxWithholdingCertificateVariables,
} from '@/types/auto-letters.types';
import { TaxWithholdingCertificateSection } from './sections/TaxWithholdingCertificateSection';

interface TaxWithholdingCertificateFormProps {
  value: Partial<TaxWithholdingCertificateVariables>;
  onChange: (data: Partial<TaxWithholdingCertificateVariables>) => void;
  disabled?: boolean;
  companyId?: string;
  clientTaxPrefill?: ClientTaxPrefill;
}

export function TaxWithholdingCertificateForm({
  value,
  onChange,
  disabled,
  companyId,
  clientTaxPrefill,
}: TaxWithholdingCertificateFormProps) {
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
            אישור ניכוי מס במקור וניהול ספרים
          </CardTitle>
          <CardDescription className="text-right text-sm">
            הודעה ללקוח על אישור ניכוי מס במקור ואישור ניהול ספרים בתוקף
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
              value={value.subject || DEFAULT_SUBJECTS.tax_withholding_certificate}
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

          <TaxWithholdingCertificateSection
            value={value}
            onChange={(data) => onChange({ ...value, ...data })}
            disabled={disabled}
            prefillPercentage={clientTaxPrefill?.tax_withholding_percentage ?? null}
          />

          {(!value.company_id?.trim() ||
            value.tax_withholding_percentage === undefined ||
            value.tax_withholding_percentage === null ||
            !value.certificate_valid_until?.trim()) && (
            <p className="text-xs text-amber-600 text-right">יש למלא את כל השדות הנדרשים</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
