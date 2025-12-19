import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { TransferredAmountsVariables } from '@/types/tzlul-approvals.types';

interface TransferredAmountsFormProps {
  value: Partial<TransferredAmountsVariables>;
  onChange: (data: Partial<TransferredAmountsVariables>) => void;
  disabled?: boolean;
}

export function TransferredAmountsForm({ value, onChange, disabled }: TransferredAmountsFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור העברת סכומים</CardTitle>
          <CardDescription className="text-right">
            אישור רואה חשבון בדבר העברת סכומים שנוכו בגין שירותי ניקיון
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Period Start */}
            <div className="space-y-2">
              <Label htmlFor="period-start" className="text-right block">
                תחילת תקופה <span className="text-red-500">*</span>
              </Label>
              <Input
                id="period-start"
                type="text"
                value={value.period_start || ''}
                onChange={(e) => onChange({ ...value, period_start: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>

            {/* Period End */}
            <div className="space-y-2">
              <Label htmlFor="period-end" className="text-right block">
                סוף תקופה <span className="text-red-500">*</span>
              </Label>
              <Input
                id="period-end"
                type="text"
                value={value.period_end || ''}
                onChange={(e) => onChange({ ...value, period_end: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>

            {/* As Of Date */}
            <div className="space-y-2">
              <Label htmlFor="as-of-date" className="text-right block">
                נכון ליום <span className="text-red-500">*</span>
              </Label>
              <Input
                id="as-of-date"
                type="text"
                value={value.as_of_date || ''}
                onChange={(e) => onChange({ ...value, as_of_date: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>אישור ניכוי והעברת סכומים למוסד לביטוח לאומי ולמס הכנסה</li>
              <li>אישור העדר חובות לארגון העובדים היציג</li>
              <li>פירוט חישובי הקפאה והפחתה של דמי הבראה לשנים 2024-2025</li>
              <li>תעריפים: 471.84 ₪ (עד 31/3/24), 485 ₪ (עד 31/3/25), 502.37 ₪ (מ-1/4/25)</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.period_start || !value.period_end || !value.as_of_date) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא את כל התאריכים
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
