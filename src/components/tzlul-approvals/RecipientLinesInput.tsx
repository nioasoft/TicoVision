import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface RecipientLinesInputProps {
  value: string[];
  onChange: (lines: string[]) => void;
  disabled?: boolean;
  label?: string;
}

export function RecipientLinesInput({
  value,
  onChange,
  disabled,
  label = 'שורות נמען'
}: RecipientLinesInputProps) {
  const handleLineChange = (index: number, newValue: string) => {
    const newLines = [...value];
    newLines[index] = newValue;
    onChange(newLines);
  };

  const handleAddLine = () => {
    onChange([...value, '']);
  };

  const handleRemoveLine = (index: number) => {
    if (value.length > 1) {
      const newLines = value.filter((_, i) => i !== index);
      onChange(newLines);
    }
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex justify-between items-center">
        <Label className="text-right">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLine}
          disabled={disabled}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          הוסף שורה
        </Button>
      </div>

      <div className="space-y-2">
        {value.map((line, index) => (
          <div key={index} className="flex gap-2 items-center">
            <Input
              value={line}
              onChange={(e) => handleLineChange(index, e.target.value)}

              disabled={disabled}
              className="text-right rtl:text-right flex-1"
              dir="rtl"
            />
            {value.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveLine(index)}
                disabled={disabled}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
