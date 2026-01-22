/**
 * PersonalReportReminderForm - Form for Personal Report Reminder letter
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PersonalReportReminderVariables } from '@/types/auto-letters.types';

interface PersonalReportReminderFormProps {
  value: Partial<PersonalReportReminderVariables>;
  onChange: (data: Partial<PersonalReportReminderVariables>) => void;
  disabled?: boolean;
}

export function PersonalReportReminderForm({ value, onChange, disabled }: PersonalReportReminderFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">תזכורת למסמכים לדוחות אישיים</CardTitle>
          <CardDescription className="text-right">
            תזכורת ללקוח להשלמת מסמכים לדוח האישי שלו
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
              placeholder="השלמות לדוח האישי"
            />
          </div>

          {/* Tax Year */}
          <div className="space-y-2">
            <Label htmlFor="tax-year" className="text-right block">
              שנת המס 
            </Label>
            <Input
              id="tax-year"
              type="text"
              value={value.tax_year || ''}
              onChange={(e) => onChange({ ...value, tax_year: e.target.value })}
              disabled={disabled}
              className="text-right w-32"
              dir="ltr"
              placeholder="2024"
            />
          </div>

          {/* Bookkeeper Name */}
          <div className="space-y-2">
            <Label htmlFor="bookkeeper-name" className="text-right block">
              שם מנהל/ת חשבונות לשליחה 
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
              יופיע במכתב: "את המסמכים עלייך להעביר ל[שם]"
            </p>
          </div>

          {/* Free Text Documents - Main Free Text Field */}
          <div className="space-y-2">
            <Label htmlFor="free-text-documents" className="text-right block">
              רשימת המסמכים הנדרשים 
            </Label>
            <Textarea
              id="free-text-documents"
              value={value.free_text_documents || ''}
              onChange={(e) => onChange({ ...value, free_text_documents: e.target.value })}
              disabled={disabled}
              className="text-right min-h-[150px]"
              dir="rtl"
              placeholder={`רשום כאן את המסמכים הנדרשים:\n\n1. טופס 106 מכל המעסיקים\n2. אישור ניהול חשבון בנק\n3. דו"ח שנתי מקופות גמל`}
            />
            <p className="text-sm text-gray-500 text-right">
              הטקסט יופיע במכתב בדיוק כפי שתכתוב אותו (בתיבה מודגשת)
            </p>
          </div>

          {/* Google Drive Link (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="google-drive-link" className="text-right block">
              לינק לגוגל דרייב (אופציונלי)
            </Label>
            <Input
              id="google-drive-link"
              type="url"
              value={value.google_drive_link || ''}
              onChange={(e) => onChange({ ...value, google_drive_link: e.target.value })}
              disabled={disabled}
              className="text-left"
              dir="ltr"
              placeholder="https://drive.google.com/..."
            />
            <p className="text-sm text-gray-500 text-right">
              אם יוזן לינק, יתווסף למכתב: "לשרותך לינק להעברת מסמכים"
            </p>
          </div>

          {/* Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הסבר על השלמת הביקורת לשנת {value.tax_year || 'XXXX'}</li>
              <li>בקשה להמצאת מסמכים לדוח האישי</li>
              <li>רשימת המסמכים שתכתוב (בתיבה מודגשת)</li>
              <li>הנחיה לשלוח ל{value.bookkeeper_name || '[שם מנה"ח]'}</li>
              {value.google_drive_link && <li>לינק לתיקיה בגוגל דרייב</li>}
              <li>אזהרה על עיכוב בהגשה וקנסות</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.tax_year?.trim() || !value.free_text_documents?.trim() || !value.bookkeeper_name?.trim()) && (
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
