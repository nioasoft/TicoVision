/**
 * MeetingReminderForm - Form for Meeting Reminder letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { MeetingReminderVariables } from '@/types/auto-letters.types';

interface MeetingReminderFormProps {
  value: Partial<MeetingReminderVariables>;
  onChange: (data: Partial<MeetingReminderVariables>) => void;
  disabled?: boolean;
}

export function MeetingReminderForm({ value, onChange, disabled }: MeetingReminderFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">תזכורת לפגישה</CardTitle>
          <CardDescription className="text-right">
            תזכורת על פגישה קרובה
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

          {/* Meeting Topic */}
          <div className="space-y-2">
            <Label htmlFor="meeting-topic" className="text-right block">
              נושא הפגישה 
            </Label>
            <Input
              id="meeting-topic"
              type="text"
              value={value.meeting_topic || ''}
              onChange={(e) => onChange({ ...value, meeting_topic: e.target.value })}
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
                תאריך הפגישה 
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
                שעת הפגישה 
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
              מיקום הפגישה 
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
              הערות נוספות (אופציונלי)
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
              <li>תזכורת על הפגישה הקרובה</li>
              <li>פרטי הפגישה (תאריך, שעה, מיקום)</li>
              <li>בקשה לאישור הגעה</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.meeting_date || !value.meeting_time || !value.meeting_location?.trim() || !value.meeting_topic?.trim()) && (
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
