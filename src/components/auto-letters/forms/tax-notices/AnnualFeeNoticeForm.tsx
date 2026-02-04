/**
 * AnnualFeeNoticeForm - Form for Annual Company Fee Notice letter
 * אגרה שנתית לרשם החברות
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { AnnualFeeNoticeVariables } from '@/types/auto-letters.types';

interface AnnualFeeNoticeFormProps {
  value: Partial<AnnualFeeNoticeVariables>;
  onChange: (data: Partial<AnnualFeeNoticeVariables>) => void;
  disabled?: boolean;
}

// Format number as currency for display
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function AnnualFeeNoticeForm({ value, onChange, disabled }: AnnualFeeNoticeFormProps) {
  const isValid = !!(
    value.fee_year &&
    value.fee_year > 2000 &&
    value.fee_amount !== undefined &&
    value.fee_amount > 0 &&
    value.discount_deadline?.trim()
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : undefined;
    onChange({ ...value, fee_amount: numericValue });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : undefined;
    onChange({ ...value, fee_year: numericValue });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אגרה שנתית לרשם החברות</CardTitle>
          <CardDescription className="text-right">
            הודעה ללקוח על חובת תשלום אגרה שנתית לרשם החברות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fee Year */}
          <div className="space-y-2">
            <Label htmlFor="fee-year" className="text-right block">
              שנת האגרה
            </Label>
            <Input
              id="fee-year"
              type="text"
              inputMode="numeric"
              value={value.fee_year || ''}
              onChange={handleYearChange}
              disabled={disabled}
              className="text-right w-32"
              dir="ltr"
            />
          </div>

          {/* Fee Amount */}
          <div className="space-y-2">
            <Label htmlFor="fee-amount" className="text-right block">
              סכום האגרה
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="fee-amount"
                type="text"
                inputMode="numeric"
                value={value.fee_amount !== undefined ? formatCurrency(value.fee_amount) : ''}
                onChange={handleAmountChange}
                disabled={disabled}
                className="text-left w-40"
                dir="ltr"
              />
              <span className="text-gray-600">&#8362;</span>
            </div>
            {value.fee_amount !== undefined && value.fee_amount > 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md inline-block">
                <span className="text-lg font-bold text-amber-800">
                  {formatCurrency(value.fee_amount)} &#8362;
                </span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              אגרה מופחתת: 1,338 ₪ (עד 31/03/2026) | אגרה רגילה: 1,777 ₪ (מ-01/04/2026)
            </p>
          </div>

          {/* Discount Deadline */}
          <div className="space-y-2">
            <Label htmlFor="discount-deadline" className="text-right block">
              תאריך אחרון להנחה
            </Label>
            <Input
              id="discount-deadline"
              type="text"
              value={value.discount_deadline || ''}
              onChange={(e) => onChange({ ...value, discount_deadline: e.target.value })}
              disabled={disabled}
              className="text-right w-40"
              dir="ltr"
              placeholder="DD/MM/YYYY"
            />
            <p className="text-sm text-muted-foreground">
              תאריך אחרון לתשלום אגרה בסכום מופחת
            </p>
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא את כל השדות
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
