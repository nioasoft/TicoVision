/**
 * CpaApprovalForm - Yael Software Systems CPA National Insurance Approval form
 * אישור רו"ח - דוח תקורות שוטף לביטוח לאומי
 *
 * Document date is managed by the parent page (shared data), so this form
 * only manages the letter-specific fields: recipient_name and period_end_date.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { YAEL_DEFAULT_RECIPIENT, type YaelCpaApprovalSpecificVariables } from '@/types/yael-approvals.types';

interface CpaApprovalFormProps {
  value: Partial<YaelCpaApprovalSpecificVariables>;
  onChange: (data: Partial<YaelCpaApprovalSpecificVariables>) => void;
  disabled?: boolean;
}

export function CpaApprovalForm({ value, onChange, disabled }: CpaApprovalFormProps) {
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
              ניתן לערוך לפי הצורך. ברירת המחדל: {YAEL_DEFAULT_RECIPIENT}
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
        </CardContent>
      </Card>
    </div>
  );
}
