/**
 * OverheadRateComplianceForm - Yael Overhead Rate Compliance Approval form
 * נספח י - אישור רו"ח בדבר עמידה בשיעור תקורה לנותני השירותים
 *
 * Document date is managed by the parent page (shared data).
 * This form manages: recipient_office_name (the ordering office for "לכבוד"),
 * supplier_name (defaults to Yael), and tender_number.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { YAEL_DEFAULT_RECIPIENT, type YaelOverheadRateComplianceSpecificVariables } from '@/types/yael-approvals.types';

interface OverheadRateComplianceFormProps {
  value: Partial<YaelOverheadRateComplianceSpecificVariables>;
  onChange: (data: Partial<YaelOverheadRateComplianceSpecificVariables>) => void;
  disabled?: boolean;
}

export function OverheadRateComplianceForm({ value, onChange, disabled }: OverheadRateComplianceFormProps) {
  const safeValue = value ?? {};
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור עמידה בשיעור תקורה (נספח י)</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח בדבר עמידה בשיעור תקורה לנותני השירותים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Ordering office name (recipient) */}
          <div className="space-y-2">
            <Label htmlFor="yael-orc-recipient-office" className="text-right block">
              שם המשרד המזמין (לכבוד)
            </Label>
            <Input
              id="yael-orc-recipient-office"
              type="text"
              value={safeValue.recipient_office_name || ''}
              onChange={(e) => onChange({ ...safeValue, recipient_office_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 text-right">
              שם המשרד הציבורי / הגוף המזמין שאליו נשלח האישור
            </p>
          </div>

          {/* Supplier name */}
          <div className="space-y-2">
            <Label htmlFor="yael-orc-supplier-name" className="text-right block">
              שם הספק
            </Label>
            <Input
              id="yael-orc-supplier-name"
              type="text"
              value={safeValue.supplier_name || ''}
              onChange={(e) => onChange({ ...safeValue, supplier_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 text-right">
              ניתן לערוך לפי הצורך. ברירת המחדל: {YAEL_DEFAULT_RECIPIENT}
            </p>
          </div>

          {/* Tender number */}
          <div className="space-y-2">
            <Label htmlFor="yael-orc-tender-number" className="text-right block">
              מספר מכרז
            </Label>
            <Input
              id="yael-orc-tender-number"
              type="text"
              value={safeValue.tender_number || ''}
              onChange={(e) => onChange({ ...safeValue, tender_number: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 text-right">
              מספר המכרז כפי שמופיע במסמכי המכרז
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
