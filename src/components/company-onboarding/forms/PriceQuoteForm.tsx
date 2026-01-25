import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PriceQuoteVariables } from '@/types/company-onboarding.types';

interface PriceQuoteFormProps {
  value: Partial<PriceQuoteVariables>;
  onChange: (data: Partial<PriceQuoteVariables>) => void;
  disabled?: boolean;
}

// Generate year options (2024-2030)
const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function PriceQuoteForm({ value, onChange, disabled }: PriceQuoteFormProps) {
  // Format fee amount with thousands separator for display
  const formatFeeDisplay = (amount: number | undefined): string => {
    if (!amount || amount === 0) return '';
    return amount.toLocaleString('he-IL');
  };

  // Parse formatted input back to number
  const parseFeeInput = (input: string): number => {
    const cleaned = input.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הצעת מחיר</CardTitle>
          <CardDescription className="text-right">
            הצעת מחיר לשירותי ראיית חשבון
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Line (הנדון) */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-right block">
              הנדון (נושא המכתב) 
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || ''}
              onChange={(e) => onChange({ ...value, subject: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"

            />
          </div>

          {/* Fee Amount and Tax Year Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fee Amount (שכר טרחה) */}
            <div className="space-y-2">
              <Label htmlFor="fee-amount" className="text-right block">
                שכר טרחה (ש"ח + מע"מ) 
              </Label>
              <Input
                id="fee-amount"
                type="text"
                value={formatFeeDisplay(value.fee_amount)}
                onChange={(e) => onChange({ ...value, fee_amount: parseFeeInput(e.target.value) })}
                disabled={disabled}
                className="text-left"
                dir="ltr"

              />
            </div>

            {/* Tax Year (שנת מס) */}
            <div className="space-y-2">
              <Label htmlFor="tax-year" className="text-right block">
                שנת המס 
              </Label>
              <Select
                value={String(value.tax_year || 2026)}
                onValueChange={(val) => onChange({ ...value, tax_year: parseInt(val, 10) })}
                disabled={disabled}
              >
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Transfer Section Toggle */}
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox
              id="show-transfer"
              checked={value.show_transfer_section === true}
              onCheckedChange={(checked) =>
                onChange({ ...value, show_transfer_section: checked === true })
              }
              disabled={disabled}
            />
            <Label htmlFor="show-transfer" className="text-right cursor-pointer">
              הצג סעיף ח' - מעבר חלק מרואה חשבון קודם
            </Label>
          </div>

          {/* Additional Notes (הערות נוספות) */}
          <div className="space-y-2">
            <Label htmlFor="additional-notes" className="text-right block">
              הערות נוספות (יופיע לאחר שכר הטרחה)
            </Label>
            <Textarea
              id="additional-notes"
              value={value.additional_notes || ''}
              onChange={(e) => onChange({ ...value, additional_notes: e.target.value })}
              disabled={disabled}
              className="text-right min-h-[80px]"
              dir="rtl"

            />
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>פתיח ותודה על הפנייה</li>
              <li>אודות המשרד</li>
              <li>פירוט שירותי ראיית החשבון (סעיפים א'-ז')</li>
              {value.show_transfer_section && (
                <li className="text-green-700">סעיף ח' - מעבר חלק מרואה חשבון קודם</li>
              )}
              <li>שכר טרחה ואופן תשלום לשנת {value.tax_year || 2026}</li>
              <li>פרטי בנק להעברה</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.subject?.trim() || !value.fee_amount || value.fee_amount <= 0) && (
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
