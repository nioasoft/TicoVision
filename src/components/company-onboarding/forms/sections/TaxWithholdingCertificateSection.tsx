import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import type { TaxWithholdingCertificateSectionData } from '@/types/auto-letters.types';

interface TaxWithholdingCertificateSectionProps {
  value: Partial<TaxWithholdingCertificateSectionData>;
  onChange: (data: Partial<TaxWithholdingCertificateSectionData>) => void;
  disabled?: boolean;
  /** Pre-fill from client.tax_withholding_percentage */
  prefillPercentage?: number | null;
}

export function TaxWithholdingCertificateSection({
  value,
  onChange,
  disabled,
  prefillPercentage,
}: TaxWithholdingCertificateSectionProps) {
  useEffect(() => {
    if (
      prefillPercentage !== null &&
      prefillPercentage !== undefined &&
      (value.tax_withholding_percentage === undefined || value.tax_withholding_percentage === null)
    ) {
      onChange({ ...value, tax_withholding_percentage: prefillPercentage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillPercentage]);

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-right text-sm font-semibold text-primary">אישור ניכוי מס במקור וניהול ספרים</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="withholding-pct" className="text-right block text-sm">
            שיעור ניכוי מס במקור (%)
          </Label>
          <Input
            id="withholding-pct"
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={
              value.tax_withholding_percentage === undefined ||
              value.tax_withholding_percentage === null
                ? ''
                : value.tax_withholding_percentage
            }
            onChange={(e) => {
              const raw = e.target.value;
              onChange({
                ...value,
                tax_withholding_percentage: raw === '' ? undefined : Number(raw),
              });
            }}
            disabled={disabled}
            className="text-right h-9"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="cert-valid-until" className="text-right block text-sm">
            תוקף האישור
          </Label>
          <DatePickerInput
            id="cert-valid-until"
            value={value.certificate_valid_until || ''}
            onChange={(val) => onChange({ ...value, certificate_valid_until: val })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
