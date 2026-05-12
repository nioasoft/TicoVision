import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { IncomeTaxWithholdingSectionData } from '@/types/auto-letters.types';

interface IncomeTaxWithholdingSectionProps {
  value: Partial<IncomeTaxWithholdingSectionData>;
  onChange: (data: Partial<IncomeTaxWithholdingSectionData>) => void;
  disabled?: boolean;
  /** Pre-fill from client.income_tax_withholding_file_number */
  prefillFileNumber?: string | null;
}

export function IncomeTaxWithholdingSection({
  value,
  onChange,
  disabled,
  prefillFileNumber,
}: IncomeTaxWithholdingSectionProps) {
  useEffect(() => {
    if (prefillFileNumber && !value.income_tax_withholding_file_number) {
      onChange({ ...value, income_tax_withholding_file_number: prefillFileNumber });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillFileNumber]);

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-right text-sm font-semibold text-primary">מס הכנסה ניכויים (עובדים)</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="income-tax-withholding-file" className="text-right block text-sm">
            מספר תיק ניכויים מ"ה
          </Label>
          <Input
            id="income-tax-withholding-file"
            type="text"
            value={value.income_tax_withholding_file_number || ''}
            onChange={(e) => onChange({ ...value, income_tax_withholding_file_number: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="employment-start" className="text-right block text-sm">
            תחילת העסקה (חודש ושנה)
          </Label>
          <Input
            id="employment-start"
            type="text"
            value={value.employment_start_month_year || ''}
            onChange={(e) => onChange({ ...value, employment_start_month_year: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="income-tax-frequency" className="text-right block text-sm">
            תדירות דיווח
          </Label>
          <Select
            value={value.income_tax_withholding_frequency || 'דו-חודשי'}
            onValueChange={(val) =>
              onChange({ ...value, income_tax_withholding_frequency: val as 'חודשי' | 'דו-חודשי' })
            }
            disabled={disabled}
          >
            <SelectTrigger className="text-right h-9" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="חודשי">חודשי</SelectItem>
              <SelectItem value="דו-חודשי">דו-חודשי</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="income-tax-first-report" className="text-right block text-sm">
            מועד דיווח ראשון
          </Label>
          <Input
            id="income-tax-first-report"
            type="date"
            value={value.income_tax_withholding_first_report_date || ''}
            onChange={(e) =>
              onChange({ ...value, income_tax_withholding_first_report_date: e.target.value })
            }
            disabled={disabled}
            className="text-right h-9"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}
