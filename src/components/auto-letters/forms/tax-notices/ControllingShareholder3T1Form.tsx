/**
 * ControllingShareholder3T1Form - Form for Controlling Shareholder 3(ט)(1) Tax Debt letter
 * תשלום חוב מס בעל שליטה בגין סעיף 3(ט)(1) - מס דיבידנד על משיכות מהחברה
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ControllingShareholder3T1Variables } from '@/types/auto-letters.types';

interface ControllingShareholder3T1FormProps {
  value: Partial<ControllingShareholder3T1Variables>;
  onChange: (data: Partial<ControllingShareholder3T1Variables>) => void;
  disabled?: boolean;
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function ControllingShareholder3T1Form({ value, onChange, disabled }: ControllingShareholder3T1FormProps) {
  const isValid = !!(
    (value.gender === 'male' || value.gender === 'female') &&
    value.greeting_name?.trim() &&
    value.tax_year?.trim() &&
    value.tax_amount !== undefined &&
    value.tax_amount > 0
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : undefined;
    onChange({ ...value, tax_amount: numericValue });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">תשלום חוב מס בעל שליטה בגין 3(ט)(1)</CardTitle>
          <CardDescription className="text-right">
            הודעה לבעל מניות על חבות מס דיבידנד בגין משיכות מהחברה משנה קודמת
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient Hint */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-right text-blue-900">
            <strong>שים לב:</strong> מכתב זה מיועד ליחיד. בחר נמען מסוג <strong>"איש קשר"</strong> או <strong>"איש קשר חופשי"</strong> כדי שה"לכבוד" יציג את שמו של היחיד ולא של חברה.
          </div>

          {/* Gender Selection */}
          <div className="space-y-2">
            <Label className="text-right block">מין הנמען</Label>
            <RadioGroup
              dir="rtl"
              className="flex flex-row gap-6 rtl:space-x-reverse"
              value={value.gender || 'male'}
              onValueChange={(v) => onChange({ ...value, gender: v as 'male' | 'female' })}
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="gender-male-3t1" />
                <Label htmlFor="gender-male-3t1" className="cursor-pointer">זכר</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="gender-female-3t1" />
                <Label htmlFor="gender-female-3t1" className="cursor-pointer">נקבה</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Greeting Name */}
          <div className="space-y-2">
            <Label htmlFor="greeting-name-3t1" className="text-right block">
              שם פרטי לפנייה אישית
            </Label>
            <Input
              id="greeting-name-3t1"
              type="text"
              value={value.greeting_name || ''}
              onChange={(e) => onChange({ ...value, greeting_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* Tax Year */}
          <div className="space-y-2">
            <Label htmlFor="tax-year-3t1" className="text-right block">
              שנת המס
            </Label>
            <Input
              id="tax-year-3t1"
              type="text"
              value={value.tax_year || ''}
              onChange={(e) => onChange({ ...value, tax_year: e.target.value })}
              disabled={disabled}
              className="text-right w-32"
              dir="ltr"
            />
          </div>

          {/* Tax Amount */}
          <div className="space-y-2">
            <Label htmlFor="tax-amount-3t1" className="text-right block">
              סכום חבות המס
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tax-amount-3t1"
                type="text"
                inputMode="numeric"
                value={value.tax_amount !== undefined ? formatCurrency(value.tax_amount) : ''}
                onChange={handleAmountChange}
                disabled={disabled}
                className="text-left w-40"
                dir="ltr"
              />
              <span className="text-gray-600">&#8362;</span>
            </div>
            {value.tax_amount !== undefined && value.tax_amount > 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md inline-block">
                <span className="text-lg font-bold text-amber-800">
                  {formatCurrency(value.tax_amount)} &#8362;
                </span>
              </div>
            )}
          </div>

          {/* Tax Payment Link */}
          <div className="space-y-2">
            <Label htmlFor="tax-payment-link-3t1" className="text-right block">
              קישור לתשלום באזור האישי (אופציונלי)
            </Label>
            <Input
              id="tax-payment-link-3t1"
              type="url"
              value={value.tax_payment_link || ''}
              onChange={(e) => onChange({ ...value, tax_payment_link: e.target.value })}
              disabled={disabled}
              className="text-left"
              dir="ltr"
            />
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא מין, שם פרטי, שנת מס וסכום חבות
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
