import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { IncomeTaxSectionData } from '@/types/auto-letters.types';

interface IncomeTaxSectionProps {
  value: Partial<IncomeTaxSectionData>;
  onChange: (data: Partial<IncomeTaxSectionData>) => void;
  disabled?: boolean;
}

export function IncomeTaxSection({ value, onChange, disabled }: IncomeTaxSectionProps) {
  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-right text-sm font-semibold text-primary">מס הכנסה (חברה)</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tax-filing-year" className="text-right block text-sm">
            שנת הגשת דוח
          </Label>
          <Input
            id="tax-filing-year"
            type="text"
            value={value.tax_filing_year || ''}
            onChange={(e) => onChange({ ...value, tax_filing_year: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
            maxLength={4}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="advance-payment-rate" className="text-right block text-sm">
            שיעור מקדמות
          </Label>
          <Input
            id="advance-payment-rate"
            type="text"
            value={value.advance_payment_rate || ''}
            onChange={(e) => onChange({ ...value, advance_payment_rate: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
          />
        </div>
      </div>
    </div>
  );
}
