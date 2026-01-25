/**
 * CutoffDateForm - Form for Cutoff Date letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CutoffDateVariables } from '@/types/auto-letters.types';

interface CutoffDateFormProps {
  value: Partial<CutoffDateVariables>;
  onChange: (data: Partial<CutoffDateVariables>) => void;
  disabled?: boolean;
}

const REPORT_TYPES = [
  { value: 'שנתי', label: 'שנתי' },
  { value: 'רבעוני', label: 'רבעוני' },
  { value: 'חצי-שנתי', label: 'חצי-שנתי' },
  { value: 'חודשי', label: 'חודשי' },
];

export function CutoffDateForm({ value, onChange, disabled }: CutoffDateFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">קביעת מועד חיתוך</CardTitle>
          <CardDescription className="text-right">
            מכתב לקביעת מועד חיתוך לדו"חות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-right block">
              הנדון (נושא המכתב) 
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || ''}
              onChange={(e) => onChange({ ...value, subject: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"

            />
          </div>

          {/* Cutoff Date */}
          <div className="space-y-2">
            <Label htmlFor="cutoff-date" className="text-right block">
              תאריך החיתוך 
            </Label>
            <Input
              id="cutoff-date"
              type="date"
              value={value.cutoff_date || ''}
              onChange={(e) => onChange({ ...value, cutoff_date: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="ltr"
            />
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label className="text-right block">
              סוג הדו"ח 
            </Label>
            <Select
              value={value.report_type || ''}
              onValueChange={(val) => onChange({ ...value, report_type: val })}
              disabled={disabled}
              dir="rtl"
            >
              <SelectTrigger className="text-right" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-right block">
              הערות נוספות
            </Label>
            <Textarea
              id="additional-notes"
              value={value.additional_notes || ''}
              onChange={(e) => onChange({ ...value, additional_notes: e.target.value })}
              disabled={disabled}
              className="text-right min-h-[80px]"
              dir="rtl"

            />
          </div>

          {/* Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הודעה על מועד החיתוך לדו"ח</li>
              <li>בקשה להעברת מסמכים ונתונים</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.cutoff_date || !value.report_type) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא את כל השדות המסומנים בכוכבית
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
