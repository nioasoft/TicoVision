/**
 * GeneralDeadlineForm - Form for General Deadline letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { GeneralDeadlineVariables } from '@/types/auto-letters.types';

interface GeneralDeadlineFormProps {
  value: Partial<GeneralDeadlineVariables>;
  onChange: (data: Partial<GeneralDeadlineVariables>) => void;
  disabled?: boolean;
}

export function GeneralDeadlineForm({ value, onChange, disabled }: GeneralDeadlineFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">מכתב דדליין כללי</CardTitle>
          <CardDescription className="text-right">
            הודעה על דדליין כללי
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
              placeholder="הודעה על דדליין"
            />
          </div>

          {/* Deadline Topic */}
          <div className="space-y-2">
            <Label htmlFor="deadline-topic" className="text-right block">
              נושא הדדליין 
            </Label>
            <Input
              id="deadline-topic"
              type="text"
              value={value.deadline_topic || ''}
              onChange={(e) => onChange({ ...value, deadline_topic: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder='הגשת דו"ח שנתי, תשלום מס, וכו׳'
            />
          </div>

          {/* Deadline Date */}
          <div className="space-y-2">
            <Label htmlFor="deadline-date" className="text-right block">
              תאריך הדדליין 
            </Label>
            <Input
              id="deadline-date"
              type="date"
              value={value.deadline_date || ''}
              onChange={(e) => onChange({ ...value, deadline_date: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="ltr"
            />
          </div>

          {/* Required Actions */}
          <div className="space-y-2">
            <Label htmlFor="required-actions" className="text-right block">
              פעולות נדרשות 
            </Label>
            <Textarea
              id="required-actions"
              value={value.required_actions || ''}
              onChange={(e) => onChange({ ...value, required_actions: e.target.value })}
              disabled={disabled}
              className="text-right min-h-[100px]"
              dir="rtl"
              placeholder={`1. להעביר מסמכים\n2. לחתום על טפסים\n3. לשלם אגרה`}
            />
            <p className="text-sm text-gray-500 text-right">
              ניתן לכתוב מספר פעולות, כל אחת בשורה נפרדת
            </p>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-right block">
              הערות נוספות (אופציונלי)
            </Label>
            <Textarea
              id="additional-notes"
              value={value.additional_notes || ''}
              onChange={(e) => onChange({ ...value, additional_notes: e.target.value })}
              disabled={disabled}
              className="text-right min-h-[80px]"
              dir="rtl"
              placeholder="הערות נוספות למכתב..."
            />
          </div>

          {/* Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הודעה על הדדליין הקרוב</li>
              <li>רשימת הפעולות הנדרשות</li>
              <li>תאריך יעד מודגש</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.deadline_date || !value.deadline_topic?.trim() || !value.required_actions?.trim()) && (
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
