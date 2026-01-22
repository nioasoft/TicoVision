import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { COMPANY_ONBOARDING_LETTER_TYPES, type CompanyOnboardingLetterType } from '@/types/company-onboarding.types';

interface CompanyOnboardingTypeSelectorProps {
  value: number;
  onChange: (index: number) => void;
  disabled?: boolean;
}

export function CompanyOnboardingTypeSelector({ value, onChange, disabled }: CompanyOnboardingTypeSelectorProps) {
  return (
    <div className="space-y-2" dir="rtl">
      <Label className="text-right block">
        סוג המכתב 
      </Label>
      <Select
        value={value.toString()}
        onValueChange={(val) => onChange(parseInt(val, 10))}
        disabled={disabled}
      >
        <SelectTrigger className="text-right rtl:text-right" dir="rtl">
          <SelectValue placeholder="בחר סוג מכתב" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {COMPANY_ONBOARDING_LETTER_TYPES.map((letterType: CompanyOnboardingLetterType) => (
            <SelectItem key={letterType.index} value={letterType.index.toString()}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{letterType.label}</span>
                <span className="text-xs text-gray-500">{letterType.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
