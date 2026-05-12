import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VatFileSectionData } from '@/types/auto-letters.types';

interface VatFileSectionProps {
  value: Partial<VatFileSectionData>;
  onChange: (data: Partial<VatFileSectionData>) => void;
  disabled?: boolean;
}

export function VatFileSection({ value, onChange, disabled }: VatFileSectionProps) {
  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-right text-sm font-semibold text-primary">מס ערך מוסף (מע"מ)</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="vat-number" className="text-right block text-sm">
            מספר עוסק מורשה
          </Label>
          <Input
            id="vat-number"
            type="text"
            value={value.vat_number || ''}
            onChange={(e) => onChange({ ...value, vat_number: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
            maxLength={9}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="vat-report-frequency" className="text-right block text-sm">
            תדירות דיווח
          </Label>
          <Select
            value={value.vat_report_frequency || 'חודשי'}
            onValueChange={(val) =>
              onChange({ ...value, vat_report_frequency: val as 'חודשי' | 'דו-חודשי' })
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="vat-first-report-date" className="text-right block text-sm">
            מועד דיווח ראשון
          </Label>
          <Input
            id="vat-first-report-date"
            type="date"
            value={value.vat_first_report_date || ''}
            onChange={(e) => onChange({ ...value, vat_first_report_date: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="vat-first-report-period" className="text-right block text-sm">
            בגין חודש
          </Label>
          <Input
            id="vat-first-report-period"
            type="text"
            value={value.vat_first_report_period || ''}
            onChange={(e) => onChange({ ...value, vat_first_report_period: e.target.value })}
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
          />
        </div>
      </div>
    </div>
  );
}
