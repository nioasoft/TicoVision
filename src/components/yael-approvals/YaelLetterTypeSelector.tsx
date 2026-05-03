import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { YAEL_LETTER_TYPES, type YaelLetterType } from '@/types/yael-approvals.types';

interface YaelLetterTypeSelectorProps {
  value: number;
  onChange: (index: number) => void;
  disabled?: boolean;
}

export function YaelLetterTypeSelector({ value, onChange, disabled }: YaelLetterTypeSelectorProps) {
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
          <SelectValue />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {YAEL_LETTER_TYPES.map((letterType: YaelLetterType) => (
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
