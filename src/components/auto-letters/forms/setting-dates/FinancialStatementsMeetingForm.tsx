/**
 * FinancialStatementsMeetingForm - Form for Financial Statements Meeting letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FinancialStatementsMeetingVariables } from '@/types/auto-letters.types';

interface FinancialStatementsMeetingFormProps {
  value: Partial<FinancialStatementsMeetingVariables>;
  onChange: (data: Partial<FinancialStatementsMeetingVariables>) => void;
  disabled?: boolean;
}

export function FinancialStatementsMeetingForm({ value, onChange, disabled }: FinancialStatementsMeetingFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">ישיבה על מאזנים</CardTitle>
          <CardDescription className="text-right">
            הזמנה לישיבה על מאזנים/דו"חות כספיים
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

          {/* Fiscal Year */}
          <div className="space-y-2">
            <Label htmlFor="fiscal-year" className="text-right block">
              שנת דיווח 
            </Label>
            <Input
              id="fiscal-year"
              type="text"
              value={value.fiscal_year || ''}
              onChange={(e) => onChange({ ...value, fiscal_year: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"

            />
          </div>

          {/* Date and Time Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meeting Date */}
            <div className="space-y-2">
              <Label htmlFor="meeting-date" className="text-right block">
                תאריך הישיבה 
              </Label>
              <Input
                id="meeting-date"
                type="date"
                value={value.meeting_date || ''}
                onChange={(e) => onChange({ ...value, meeting_date: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="ltr"
              />
            </div>

            {/* Meeting Time */}
            <div className="space-y-2">
              <Label htmlFor="meeting-time" className="text-right block">
                שעת הישיבה 
              </Label>
              <Input
                id="meeting-time"
                type="time"
                value={value.meeting_time || ''}
                onChange={(e) => onChange({ ...value, meeting_time: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="ltr"
              />
            </div>
          </div>

          {/* Meeting Location */}
          <div className="space-y-2">
            <Label htmlFor="meeting-location" className="text-right block">
              מיקום הישיבה 
            </Label>
            <Input
              id="meeting-location"
              type="text"
              value={value.meeting_location || ''}
              onChange={(e) => onChange({ ...value, meeting_location: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"

            />
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
              <li>הזמנה לסקירת המאזנים והדו"חות הכספיים</li>
              <li>פרטי הישיבה (תאריך, שעה, מיקום)</li>
              <li>שנת הדיווח</li>
              <li>בקשה לאישור הגעה</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.meeting_date || !value.meeting_time || !value.meeting_location?.trim() || !value.fiscal_year?.trim()) && (
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
