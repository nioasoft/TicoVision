import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import type { SocialSecurityWithholdingSectionData } from '@/types/auto-letters.types';

interface SocialSecurityWithholdingSectionProps {
  value: Partial<SocialSecurityWithholdingSectionData>;
  onChange: (data: Partial<SocialSecurityWithholdingSectionData>) => void;
  disabled?: boolean;
  /** Pre-fill from client.social_security_withholding_file_number */
  prefillFileNumber?: string | null;
}

export function SocialSecurityWithholdingSection({
  value,
  onChange,
  disabled,
  prefillFileNumber,
}: SocialSecurityWithholdingSectionProps) {
  useEffect(() => {
    if (prefillFileNumber && !value.social_security_withholding_file_number) {
      onChange({ ...value, social_security_withholding_file_number: prefillFileNumber });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillFileNumber]);

  return (
    <div className="space-y-3" dir="rtl">
      <h3 className="text-right text-sm font-semibold text-primary">ביטוח לאומי ניכויים</h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="ss-withholding-file" className="text-right block text-sm">
            מספר תיק ניכויים ב"ל
          </Label>
          <Input
            id="ss-withholding-file"
            type="text"
            value={value.social_security_withholding_file_number || ''}
            onChange={(e) =>
              onChange({ ...value, social_security_withholding_file_number: e.target.value })
            }
            disabled={disabled}
            className="text-right h-9"
            dir="rtl"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ss-frequency" className="text-right block text-sm">
            תדירות דיווח
          </Label>
          <Select
            value={value.social_security_withholding_frequency || 'חודשי'}
            onValueChange={(val) =>
              onChange({ ...value, social_security_withholding_frequency: val as 'חודשי' | 'דו-חודשי' })
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
          <Label htmlFor="ss-first-report" className="text-right block text-sm">
            מועד דיווח ראשון
          </Label>
          <DatePickerInput
            id="ss-first-report"
            value={value.social_security_withholding_first_report_date || ''}
            onChange={(val) =>
              onChange({ ...value, social_security_withholding_first_report_date: val })
            }
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
