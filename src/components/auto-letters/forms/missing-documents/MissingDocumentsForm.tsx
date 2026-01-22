/**
 * MissingDocumentsForm - Form for Missing Documents letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { MissingDocumentsVariables } from '@/types/auto-letters.types';

interface MissingDocumentsFormProps {
  value: Partial<MissingDocumentsVariables>;
  onChange: (data: Partial<MissingDocumentsVariables>) => void;
  disabled?: boolean;
}

export function MissingDocumentsForm({ value, onChange, disabled }: MissingDocumentsFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">מכתב מסמכים חסרים</CardTitle>
          <CardDescription className="text-right">
            בקשה להמצאת מסמכים חסרים
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
              placeholder="בקשה להמצאת מסמכים חסרים"
            />
          </div>

          {/* Missing Documents List - Main Free Text Field */}
          <div className="space-y-2">
            <Label htmlFor="missing-documents" className="text-right block">
              רשימת המסמכים החסרים 
            </Label>
            <Textarea
              id="missing-documents"
              value={value.missing_documents_list || ''}
              onChange={(e) => onChange({ ...value, missing_documents_list: e.target.value })}
              disabled={disabled}
              className="text-right min-h-[150px]"
              dir="rtl"
              placeholder={`רשום כאן את המסמכים החסרים:\n\n1. אישור ניהול ספרים\n2. דו"ח שנתי 2023\n3. אישור מס הכנסה`}
            />
            <p className="text-sm text-gray-500 text-right">
              הטקסט יופיע במכתב בדיוק כפי שתכתוב אותו
            </p>
          </div>

          {/* Deadline Date (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="deadline-date" className="text-right block">
              תאריך יעד להמצאה (אופציונלי)
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
            <p className="text-sm text-gray-500 text-right">
              אם לא יוזן תאריך, המכתב יבקש להמציא "בהקדם האפשרי"
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
              <li>"בהמשך לשיחתנו, חסרים לנו המסמכים הבאים:"</li>
              <li>רשימת המסמכים שתכתוב (בתיבה מודגשת)</li>
              {value.deadline_date && <li>תאריך יעד להמצאה</li>}
              <li>"אנא המצאו לנו את המסמכים בהקדם האפשרי"</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.missing_documents_list?.trim()) && (
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
