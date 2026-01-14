import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { VatRegistrationVariables } from '@/types/company-onboarding.types';

interface VatRegistrationFormProps {
  value: Partial<VatRegistrationVariables>;
  onChange: (data: Partial<VatRegistrationVariables>) => void;
  disabled?: boolean;
}

export function VatRegistrationForm({ value, onChange, disabled }: VatRegistrationFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בקשת מסמכים לטובת פתיחת תיק במע״מ</CardTitle>
          <CardDescription className="text-right">
            הנחיות להעברת מסמכים לפתיחת תיק במע״מ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Line (הנדון) */}
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
              placeholder='הנחיות להעברת מסמכים לצורך פתיחת תיקי מע"מ'
            />
          </div>

          {/* Google Drive Link */}
          <div className="space-y-2">
            <Label htmlFor="google-drive-link" className="text-right block">
              לינק ל-Google Drive <span className="text-red-500">*</span>
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
              קישור לתיקייה בדרייב להעלאת המסמכים
            </p>
          </div>

          {/* WOLT Section Toggle */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="show-wolt"
              checked={value.show_wolt_section !== false}
              onCheckedChange={(checked) =>
                onChange({ ...value, show_wolt_section: checked === true })
              }
              disabled={disabled}
            />
            <Label htmlFor="show-wolt" className="text-right cursor-pointer">
              הצג סעיף Wolt (אזהרת ניכוי מס 35%)
            </Label>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הנחיות למבנה התיקיות וארגון המסמכים ב-Google Drive</li>
              <li>רשימת המסמכים הנדרשים (5 פריטים)</li>
              <li>נקודות חשובות לתשומת לב</li>
              {value.show_wolt_section !== false && (
                <li className="text-red-700">אזהרת Wolt - ניכוי מס במקור 35%</li>
              )}
              <li>כפתור להעלאת קבצים לדרייב</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.google_drive_link?.trim()) && (
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
