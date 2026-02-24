/**
 * TaxRefundForm - Form for Tax Refund letters (all 3 types)
 * טופס פניות לפקיד שומה בבקשה להחזר מס
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { TaxRefundVariables } from '@/types/auto-letters.types';

interface TaxRefundFormProps {
  value: Partial<TaxRefundVariables>;
  onChange: (data: Partial<TaxRefundVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
}

export function TaxRefundForm({ value, onChange, disabled, companyName, companyId }: TaxRefundFormProps) {
  const isValid = !!(
    companyName?.trim() &&
    value.tax_office_name?.trim() &&
    value.tax_office_address?.trim() &&
    value.tax_year && value.tax_year > 2000 &&
    value.refund_amount !== undefined &&
    value.refund_amount > 0 &&
    value.filing_date
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">פנייה לפקיד שומה - החזר מס</CardTitle>
          <CardDescription className="text-right">
            פרטי הפנייה לפקיד השומה בבקשה להחזר מס
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client Info (read-only) - לשימוש ב"הנדון" */}
          {companyName && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800 text-right">
                <strong>הלקוח (לשורת הנדון):</strong> {companyName}
                {companyId && <span> (ח.פ. {companyId})</span>}
              </div>
            </div>
          )}

          {/* Tax Office Name - שם פקיד השומה */}
          <div className="space-y-2">
            <Label htmlFor="tax-office-name" className="text-right block">
              שם פקיד השומה / משרד השומה
            </Label>
            <Input
              id="tax-office-name"
              value={value.tax_office_name || ''}
              onChange={(e) => onChange({ ...value, tax_office_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 text-right">
              יופיע בכותרת המכתב תחת &quot;לכבוד&quot;
            </p>
          </div>

          {/* Tax Office Address - כתובת משרד השומה */}
          <div className="space-y-2">
            <Label htmlFor="tax-office-address" className="text-right block">
              כתובת משרד השומה
            </Label>
            <Input
              id="tax-office-address"
              value={value.tax_office_address || ''}
              onChange={(e) => onChange({ ...value, tax_office_address: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* Tax Year - שנת המס */}
          <div className="space-y-2">
            <Label htmlFor="tax-year" className="text-right block">
              שנת המס
            </Label>
            <Input
              id="tax-year"
              type="number"
              min="2000"
              max="2100"
              value={value.tax_year || ''}
              onChange={(e) => onChange({ ...value, tax_year: parseInt(e.target.value, 10) || undefined })}
              disabled={disabled}
              className="text-left w-32"
              dir="ltr"
            />
          </div>

          {/* Refund Amount - סכום ההחזר */}
          <div className="space-y-2">
            <Label htmlFor="refund-amount" className="text-right block">
              סכום ההחזר (₪)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="refund-amount"
                type="number"
                min="0"
                step="1"
                value={value.refund_amount || ''}
                onChange={(e) => onChange({ ...value, refund_amount: parseFloat(e.target.value) || undefined })}
                disabled={disabled}
                className="text-left w-48"
                dir="ltr"
              />
              <span className="text-sm text-gray-500">₪</span>
            </div>
          </div>

          {/* Filing Date - תאריך הגשת הדוח */}
          <div className="space-y-2">
            <Label htmlFor="filing-date" className="text-right block">
              תאריך הגשת הדוח
            </Label>
            <Input
              id="filing-date"
              type="date"
              value={value.filing_date || ''}
              onChange={(e) => onChange({ ...value, filing_date: e.target.value })}
              disabled={disabled}
              className="text-left w-48"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 text-right">
              תאריך בו הוגשו הדוחות המבוקרים לפקיד השומה
            </p>
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש לבחור לקוח, למלא את פרטי משרד השומה ואת כל השדות
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
