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

// Format number as currency for display
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function TaxPaymentNoticeForm({ value, onChange, disabled }: TaxPaymentNoticeFormProps) {
  const isValid = !!(
    value.tax_year?.trim() &&
    value.greeting_name?.trim() &&
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
          <CardTitle className="text-right">הודעה על יתרת מס לתשלום</CardTitle>
          <CardDescription className="text-right">
            הודעה ללקוח על יתרת מס לאחר סיום הביקורת ושידור הדוחות הכספיים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tax Year */}
          <div className="space-y-2">
            <Label htmlFor="tax-year" className="text-right block">
              שנת המס 
            </Label>
            <Input
              id="tax-year"
              type="text"
              value={value.tax_year || ''}
              onChange={(e) => onChange({ ...value, tax_year: e.target.value })}
              disabled={disabled}
              className="text-right w-32"
              dir="ltr"
            />
          </div>

          {/* Greeting Name */}
          <div className="space-y-2">
            <Label htmlFor="greeting-name" className="text-right block">
              שם לפנייה אישית 
            </Label>
            <Input
              id="greeting-name"
              type="text"
              value={value.greeting_name || ''}
              onChange={(e) => onChange({ ...value, greeting_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* Tax Amount */}
          <div className="space-y-2">
            <Label htmlFor="tax-amount" className="text-right block">
              סכום חבות המס 
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="tax-amount"
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
            />
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
