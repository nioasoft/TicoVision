/**
 * BookkeeperBalanceReminderForm - Form for Bookkeeper Balance Reminder letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { BookkeeperBalanceReminderVariables } from '@/types/auto-letters.types';

interface BookkeeperBalanceReminderFormProps {
  value: Partial<BookkeeperBalanceReminderVariables>;
  onChange: (data: Partial<BookkeeperBalanceReminderVariables>) => void;
  disabled?: boolean;
}

export function BookkeeperBalanceReminderForm({ value, onChange, disabled }: BookkeeperBalanceReminderFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">זירוז מנהלת חשבונות למאזן</CardTitle>
          <CardDescription className="text-right">
            הנחיות למנהלת החשבונות לקראת ישיבת סקירת מאזנים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Line */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-right block">
              הנדון (נושא המכתב) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || ''}
              onChange={(e) => onChange({ ...value, subject: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder="סיכום פרטיכל מישיבה שנערכה במשרדנו"
            />
          </div>

          {/* Bookkeeper Name */}
          <div className="space-y-2">
            <Label htmlFor="bookkeeper-name" className="text-right block">
              שם מנהל/ת החשבונות <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bookkeeper-name"
              type="text"
              value={value.bookkeeper_name || ''}
              onChange={(e) => onChange({ ...value, bookkeeper_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder="שם מנהל/ת החשבונות"
            />
            <p className="text-sm text-gray-500 text-right">
              יופיע בפנייה: "[שם] היקר/ה"
            </p>
          </div>

          {/* Meeting Date */}
          <div className="space-y-2">
            <Label htmlFor="meeting-date" className="text-right block">
              תאריך הישיבה <span className="text-red-500">*</span>
            </Label>
            <Input
              id="meeting-date"
              type="date"
              value={value.meeting_date || ''}
              onChange={(e) => onChange({ ...value, meeting_date: e.target.value })}
              disabled={disabled}
              className="text-right w-48"
              dir="ltr"
            />
            <p className="text-sm text-gray-500 text-right">
              תאריך הישיבה לסקירת הדוחות המבוקרים
            </p>
          </div>

          {/* Fiscal Year */}
          <div className="space-y-2">
            <Label htmlFor="fiscal-year" className="text-right block">
              שנת המס <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fiscal-year"
              type="text"
              value={value.fiscal_year || ''}
              onChange={(e) => onChange({ ...value, fiscal_year: e.target.value })}
              disabled={disabled}
              className="text-right w-32"
              dir="ltr"
              placeholder="2024"
            />
            <p className="text-sm text-gray-500 text-right">
              שנת המס של הדוחות המבוקרים
            </p>
          </div>

          {/* Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב יכלול:</h4>
            <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
              <li>מועד הישיבה: {value.meeting_date ? new Date(value.meeting_date).toLocaleDateString('he-IL') : '[תאריך]'}</li>
              <li>דרישה לסיום התאמות 14 ימי עסקים לפני הישיבה</li>
              <li>לינק לתיקיה בגוגל דרייב להעברת הגיבוי</li>
              <li>הנחיה להודיע לתיקו בווטסאפ על סיום</li>
              <li>בקשה לגיבוי ייזום של שנת {value.fiscal_year ? Number(value.fiscal_year) + 1 : '[שנה הבאה]'}</li>
              <li>אזהרה על כרטיסי בעלי שליטה ומשיכות</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.bookkeeper_name?.trim() || !value.meeting_date || !value.fiscal_year?.trim()) && (
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
