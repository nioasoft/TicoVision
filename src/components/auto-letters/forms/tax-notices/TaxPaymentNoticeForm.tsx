/**
 * TaxPaymentNoticeForm - Form for Tax Payment Notice letter
 * הודעה על יתרת מס לתשלום לאחר שידור דוחות כספיים
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { TaxPaymentNoticeVariables } from '@/types/auto-letters.types';

interface TaxPaymentNoticeFormProps {
  value: Partial<TaxPaymentNoticeVariables>;
  onChange: (data: Partial<TaxPaymentNoticeVariables>) => void;
  disabled?: boolean;
}

export function TaxPaymentNoticeForm({ value, onChange, disabled }: TaxPaymentNoticeFormProps) {
  const isValid = !!(
    value.tax_year?.trim() &&
    value.submission_date &&
    value.greeting_name?.trim()
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הודעה על יתרת מס לתשלום</CardTitle>
          <CardDescription className="text-right">
            הודעה ללקוח על יתרת חבות מס לאחר שידור הדוחות הכספיים לרשות המסים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tax Year */}
          <div className="space-y-2">
            <Label htmlFor="tax-year" className="text-right block">
              שנת המס <span className="text-red-500">*</span>
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
            <p className="text-sm text-gray-500 text-right">
              שנת המס שעבורה שודרו הדוחות הכספיים
            </p>
          </div>

          {/* Submission Date */}
          <div className="space-y-2">
            <Label htmlFor="submission-date" className="text-right block">
              תאריך שידור הדוחות <span className="text-red-500">*</span>
            </Label>
            <Input
              id="submission-date"
              type="date"
              value={value.submission_date || ''}
              onChange={(e) => onChange({ ...value, submission_date: e.target.value })}
              onInput={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.value) {
                  onChange({ ...value, submission_date: target.value });
                }
              }}
              onBlur={(e) => {
                // Ensure value is captured on blur for browser automation compatibility
                if (e.target.value && e.target.value !== value.submission_date) {
                  onChange({ ...value, submission_date: e.target.value });
                }
              }}
              disabled={disabled}
              className="text-left w-48"
              dir="ltr"
            />
            <p className="text-sm text-gray-500 text-right">
              התאריך בו שודרו הדוחות הכספיים לרשות המסים
            </p>
          </div>

          {/* Greeting Name */}
          <div className="space-y-2">
            <Label htmlFor="greeting-name" className="text-right block">
              שם לפנייה אישית <span className="text-red-500">*</span>
            </Label>
            <Input
              id="greeting-name"
              type="text"
              value={value.greeting_name || ''}
              onChange={(e) => onChange({ ...value, greeting_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder="פלוני"
            />
            <p className="text-sm text-gray-500 text-right">
              שם הפנייה שיופיע במכתב (למשל: "פלוני היקר")
            </p>
          </div>

          {/* Tax Payment Link */}
          <div className="space-y-2">
            <Label htmlFor="tax-payment-link" className="text-right block">
              קישור לתשלום באזור האישי
            </Label>
            <Input
              id="tax-payment-link"
              type="url"
              value={value.tax_payment_link || ''}
              onChange={(e) => onChange({ ...value, tax_payment_link: e.target.value })}
              disabled={disabled}
              className="text-left"
              dir="ltr"
              placeholder="https://www.misim.gov.il/..."
            />
            <p className="text-sm text-gray-500 text-right">
              קישור לאזור האישי באתר רשות המסים לביצוע תשלום
            </p>
          </div>

          {/* Letter Content Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הודעה על שידור הדוחות הכספיים לרשות המסים</li>
              <li>עדכון על חבות מס לתשלום שנותרה</li>
              <li>הנחיות להסדרת התשלום (שובר, אזור אישי, המחאות)</li>
            </ul>
          </div>

          {/* Validation */}
          {!isValid && (
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
