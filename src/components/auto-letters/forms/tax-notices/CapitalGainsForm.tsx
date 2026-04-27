/**
 * CapitalGainsForm - Form for Capital Gains Tax Notice letter
 * הודעה על מס רווח הון בגין מכירת מניות בחברה
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CapitalGainsVariables } from '@/types/auto-letters.types';

interface CapitalGainsFormProps {
  value: Partial<CapitalGainsVariables>;
  onChange: (data: Partial<CapitalGainsVariables>) => void;
  disabled?: boolean;
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function CapitalGainsForm({ value, onChange, disabled }: CapitalGainsFormProps) {
  const isValid = !!(
    (value.gender === 'male' || value.gender === 'female') &&
    value.greeting_name?.trim() &&
    value.sold_company_name?.trim() &&
    value.sale_amount !== undefined &&
    value.sale_amount > 0 &&
    value.tax_amount !== undefined &&
    value.tax_amount > 0
  );

  const handleSaleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : undefined;
    onChange({ ...value, sale_amount: numericValue });
  };

  const handleTaxAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : undefined;
    onChange({ ...value, tax_amount: numericValue });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הודעה על מס רווח הון</CardTitle>
          <CardDescription className="text-right">
            הודעה ליחיד על מס רווח הון בגין מכירת מניות בחברה (תשלום תוך 30 יום, ללא אפשרות פריסה)
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
                <RadioGroupItem value="male" id="gender-male-cg" />
                <Label htmlFor="gender-male-cg" className="cursor-pointer">זכר</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="gender-female-cg" />
                <Label htmlFor="gender-female-cg" className="cursor-pointer">נקבה</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Greeting Name */}
          <div className="space-y-2">
            <Label htmlFor="greeting-name-cg" className="text-right block">
              שם פרטי לפנייה אישית
            </Label>
            <Input
              id="greeting-name-cg"
              type="text"
              value={value.greeting_name || ''}
              onChange={(e) => onChange({ ...value, greeting_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* Sold Company Name */}
          <div className="space-y-2">
            <Label htmlFor="sold-company-cg" className="text-right block">
              שם החברה הנמכרת
            </Label>
            <Input
              id="sold-company-cg"
              type="text"
              value={value.sold_company_name || ''}
              onChange={(e) => onChange({ ...value, sold_company_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* Sale Amount */}
          <div className="space-y-2">
            <Label htmlFor="sale-amount-cg" className="text-right block">
              סכום העסקה
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sale-amount-cg"
                type="text"
                inputMode="numeric"
                value={value.sale_amount !== undefined ? formatCurrency(value.sale_amount) : ''}
                onChange={handleSaleAmountChange}
                disabled={disabled}
                className="text-left w-40"
                dir="ltr"
              />
              <span className="text-gray-600">&#8362;</span>
            </div>
          </div>

          {/* Tax Amount */}
          <div className="space-y-2">
            <Label htmlFor="tax-amount-cg" className="text-right block">
              סכום מס רווח ההון לתשלום
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tax-amount-cg"
                type="text"
                inputMode="numeric"
                value={value.tax_amount !== undefined ? formatCurrency(value.tax_amount) : ''}
                onChange={handleTaxAmountChange}
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

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא מין, שם פרטי, שם החברה הנמכרת, סכום עסקה וסכום מס
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
