/**
 * CpaApprovalForm - Yael Software Systems CPA National Insurance Approval form
 * אישור רו"ח - דוח תקורות שוטף לביטוח לאומי
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { YaelCpaApprovalVariables } from '@/types/yael-approvals.types';

interface CpaApprovalFormProps {
  value: Partial<YaelCpaApprovalVariables>;
  onChange: (data: Partial<YaelCpaApprovalVariables>) => void;
  disabled?: boolean;
}

export function CpaApprovalForm({ value, onChange, disabled }: CpaApprovalFormProps) {
  const isValid = !!(
    value.document_date &&
    value.recipient_name?.trim() &&
    value.period_end_date
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור רו"ח - דוח תקורות שוטף לביטוח לאומי</CardTitle>
          <CardDescription className="text-right">
            חוות דעת רו"ח על דוח תקורות שוטף לגבי כלל נותני השירותים בביטוח לאומי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Date */}
          <div className="space-y-2">
            <Label htmlFor="yael-document-date" className="text-right block">
              תאריך מסמך
            </Label>
            <Input
              id="yael-document-date"
              type="date"
              value={value.document_date || ''}
              onChange={(e) => onChange({ ...value, document_date: e.target.value })}
              disabled={disabled}
              className="text-right w-48"
              dir="ltr"
            />
          </div>

          {/* Recipient Name */}
          <div className="space-y-2">
            <Label htmlFor="yael-recipient-name" className="text-right block">
              שם החברה הנמען (לכבוד)
            </Label>
            <Input
              id="yael-recipient-name"
              type="text"
              value={value.recipient_name || ''}
              onChange={(e) => onChange({ ...value, recipient_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 text-right">
              ניתן לערוך לפי הצורך. ברירת המחדל: יעל מערכות תוכנה בע"מ
            </p>
          </div>

          {/* Period End Date */}
          <div className="space-y-2">
            <Label htmlFor="yael-period-end-date" className="text-right block">
              תאריך סיום תקופת הדיווח
            </Label>
            <Input
              id="yael-period-end-date"
              type="date"
              value={value.period_end_date || ''}
              onChange={(e) => onChange({ ...value, period_end_date: e.target.value })}
              disabled={disabled}
              className="text-right w-48"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 text-right">
              יוטמע במשפט "...לשנה שנסתיימה ביום [תאריך]". פורמט בעברית: "31 בדצמבר, 2024"
            </p>
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא תאריך מסמך, שם נמען, ותאריך סיום תקופה
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
