import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TiptapEditor } from '@/components/editor/TiptapEditor';

interface CustomPaymentTextProps {
  value: string;
  onChange: (html: string) => void;
}

export function CustomPaymentText({
  value,
  onChange,
}: CustomPaymentTextProps) {
  // Enable editor if there's already content
  const [enabled, setEnabled] = useState(!!value && value.trim() !== '' && value !== '<p></p>');

  // Sync enabled state if value changes externally (e.g., loading existing calculation)
  useEffect(() => {
    const hasContent = !!value && value.trim() !== '' && value !== '<p></p>';
    if (hasContent && !enabled) {
      setEnabled(true);
    }
  }, [value, enabled]);

  const handleCheckboxChange = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      // Clear the content when unchecking
      onChange('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Checkbox */}
      <div className="flex items-center gap-3 justify-start mb-6 bg-amber-50 p-4 rounded-lg border border-amber-200">
        <div className="bg-white p-1 rounded shadow-sm border border-gray-300">
          <Checkbox
            id="custom-payment-text"
            checked={enabled}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
        <Label
          htmlFor="custom-payment-text"
          className="text-base font-medium cursor-pointer"
        >
          הוסף טקסט ידני למכתב
        </Label>
      </div>

      {/* TipTap Editor - shown when enabled */}
      {enabled && (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <Label className="text-sm text-amber-800 mb-3 block text-right">
            הטקסט יופיע במכתב מעל פרטי התשלום:
          </Label>
          <div className="bg-white rounded-md border border-gray-200">
            <TiptapEditor
              value={value}
              onChange={onChange}
              minHeight="150px"
            />
          </div>
          <p className="text-xs text-amber-700 mt-2 text-right">
            ניתן להשתמש בעיצוב טקסט: מודגש, נטוי, תבליטים ועוד.
          </p>
        </div>
      )}
    </div>
  );
}
