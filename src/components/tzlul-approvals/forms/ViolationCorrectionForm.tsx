import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RecipientLinesInput } from '../RecipientLinesInput';
import type { ViolationCorrectionVariables } from '@/types/tzlul-approvals.types';

interface ViolationCorrectionFormProps {
  value: Partial<ViolationCorrectionVariables>;
  onChange: (data: Partial<ViolationCorrectionVariables>) => void;
  disabled?: boolean;
}

export function ViolationCorrectionForm({ value, onChange, disabled }: ViolationCorrectionFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">מכתב תיקון הפרות</CardTitle>
          <CardDescription className="text-right">
            חוות דעת רואה חשבון בהתייחס לתיקון הפרות - המועצה המקומית גן יבנה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Lines */}
          <RecipientLinesInput
            value={value.recipient_lines || ['']}
            onChange={(lines) => onChange({ ...value, recipient_lines: lines })}
            disabled={disabled}
            label="נמען (לכבוד)"
          />

          {/* Violations Date */}
          <div className="space-y-2">
            <Label htmlFor="violations-date" className="text-right block">
              תאריך ההפרות <span className="text-red-500">*</span>
            </Label>
            <Input
              id="violations-date"
              type="date"
              value={value.violations_date || ''}
              onChange={(e) => onChange({ ...value, violations_date: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="ltr"
            />
            <p className="text-sm text-gray-500 text-right">
              תאריך דוח הבדיקה התקופתית
            </p>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>חוות דעת על תיקון הפרות ותשלום הפרשי שכר</li>
              <li>ביקורת לפי תקני ביקורת מקובלים בישראל</li>
              <li>אישור סעיפים 2(ג)-(ו) בהצהרה</li>
              <li>הכרה בהוראות סעיפים 5 ו-6 להנחיה לאכיפה</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.recipient_lines?.some(line => line.trim()) || !value.violations_date) && (
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
