/**
 * UnauditedCompanyForm - Form for Mortgage Approval: Unaudited Company
 * אישור רו"ח למשכנתא עבור בעל שליטה בחברה בע"מ שדוחותיה טרם בוקרו
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import type { MortgageUnauditedCompanyVariables, ShareholderEntry } from '@/types/auto-letters.types';
import { formatIsraeliDate } from '@/lib/formatters';

interface UnauditedCompanyFormProps {
  value: Partial<MortgageUnauditedCompanyVariables>;
  onChange: (data: Partial<MortgageUnauditedCompanyVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
}

const emptyShareholderEntry: ShareholderEntry = {
  name: '',
  id_number: '',
  holding_percentage: 0,
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function UnauditedCompanyForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: UnauditedCompanyFormProps) {
  const shareholders = value.shareholders || [{ ...emptyShareholderEntry }];

  const handleAddShareholder = () => {
    onChange({
      ...value,
      shareholders: [...shareholders, { ...emptyShareholderEntry }],
    });
  };

  const handleRemoveShareholder = (index: number) => {
    if (shareholders.length <= 1) return;
    const newShareholders = shareholders.filter((_, i) => i !== index);
    onChange({
      ...value,
      shareholders: newShareholders,
    });
  };

  const handleShareholderChange = (
    index: number,
    field: keyof ShareholderEntry,
    fieldValue: string | number
  ) => {
    const newShareholders = [...shareholders];
    newShareholders[index] = { ...newShareholders[index], [field]: fieldValue };
    onChange({
      ...value,
      shareholders: newShareholders,
    });
  };

  const hasCompany = !!companyName?.trim();
  const hasBankName = !!value.bank_name?.trim();
  const hasApplicant = !!value.applicant_name?.trim() && !!value.applicant_role?.trim();
  const hasPeriod = (value.period_months ?? 0) > 0 && !!value.period_end_date;
  const hasFinancials = value.revenue_turnover !== undefined &&
    value.salary_expenses !== undefined &&
    value.estimated_profit !== undefined;
  const hasShareholders = shareholders.length > 0 && shareholders.every(sh =>
    sh.name?.trim() && sh.id_number?.trim() && sh.holding_percentage >= 0
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בעל שליטה - דוחות טרם בוקרו</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח עבור בעל שליטה בחברה בע"מ שדוחותיה הכספיים לשנה שקדמה טרם בוקרו
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Display */}
          <div className="space-y-2">
            <Label className="text-right block">
              פרטי החברה <span className="text-red-500">*</span>
            </Label>
            {companyName ? (
              <div className="p-3 bg-gray-50 border rounded-md">
                <div className="text-right font-medium">{companyName}</div>
                {companyId && (
                  <div className="text-sm text-gray-600 text-right mt-1">
                    ח.פ.: {companyId}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-right text-sm">
                יש לבחור לקוח בסעיף "בחירת נמען" למעלה
              </div>
            )}
          </div>

          <Separator />

          {/* Bank Name */}
          <div className="space-y-2">
            <Label htmlFor="bank-name" className="text-right block">
              שם הבנק <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bank-name"
              type="text"
              value={value.bank_name || ''}
              onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder='למשל: בנק לאומי, בנק הפועלים, בנק מזרחי טפחות'
            />
          </div>

          <Separator />

          {/* Applicant Details */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              פרטי מבקש/ת המשכנתא
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="applicant-name" className="text-right block text-sm">
                  שם מבקש/ת המשכנתא <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="applicant-name"
                  type="text"
                  value={value.applicant_name || ''}
                  onChange={(e) => onChange({ ...value, applicant_name: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"
                  placeholder="ישראל ישראלי"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicant-role" className="text-right block text-sm">
                  תפקיד בחברה <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="applicant-role"
                  type="text"
                  value={value.applicant_role || ''}
                  onChange={(e) => onChange({ ...value, applicant_role: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"
                  placeholder="בעל מניות / מנכ״ל / דירקטור"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Period */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              תקופת הדוח הבלתי מבוקר
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-months" className="text-right block text-sm">
                  מספר חודשים <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="period-months"
                  type="number"
                  min="1"
                  max="36"
                  value={value.period_months || ''}
                  onChange={(e) => onChange({ ...value, period_months: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                  placeholder="12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end-date" className="text-right block text-sm">
                  תאריך סיום התקופה <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="period-end-date"
                  type="date"
                  value={value.period_end_date || ''}
                  onChange={(e) => onChange({ ...value, period_end_date: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>
            {value.period_end_date && (
              <div className="text-sm text-gray-600 text-right">
                תאריך בעברית: {formatIsraeliDate(value.period_end_date)}
              </div>
            )}
          </div>

          <Separator />

          {/* Financial Data */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              נתונים כספיים בלתי מבוקרים (בש"ח)
            </Label>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="revenue-turnover" className="text-right block text-sm">
                  מחזור ההכנסות (ללא מע"מ) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="revenue-turnover"
                    type="number"
                    value={value.revenue_turnover || ''}
                    onChange={(e) => onChange({ ...value, revenue_turnover: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="text-left pl-8"
                    dir="ltr"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.revenue_turnover ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.revenue_turnover)} ₪
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary-expenses" className="text-right block text-sm">
                  הוצאות השכר <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="salary-expenses"
                    type="number"
                    value={value.salary_expenses || ''}
                    onChange={(e) => onChange({ ...value, salary_expenses: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="text-left pl-8"
                    dir="ltr"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.salary_expenses ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.salary_expenses)} ₪
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated-profit" className="text-right block text-sm">
                  רווח חשבונאי משוער לפני מס (ללא תיאומים) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="estimated-profit"
                    type="number"
                    value={value.estimated_profit || ''}
                    onChange={(e) => onChange({ ...value, estimated_profit: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="text-left pl-8"
                    dir="ltr"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.estimated_profit ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.estimated_profit)} ₪
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <Separator />

          {/* Shareholders Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-right font-medium">
                בעלי מניות (לפי רשם החברות)
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddShareholder}
                disabled={disabled}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                הוסף בעל מניות
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrar-date" className="text-right block text-sm">
                תאריך דוח רשם החברות <span className="text-red-500">*</span>
              </Label>
              <Input
                id="registrar-date"
                type="date"
                value={value.registrar_report_date || ''}
                onChange={(e) => onChange({ ...value, registrar_report_date: e.target.value })}
                disabled={disabled}
                className="text-right max-w-[200px]"
                dir="ltr"
              />
            </div>

            <div className="space-y-3">
              {shareholders.map((shareholder, index) => (
                <div key={index} className="p-4 border rounded-md space-y-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">בעל מניות {index + 1}</span>
                    {shareholders.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShareholder(index)}
                        disabled={disabled}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">שם</Label>
                      <Input
                        type="text"
                        value={shareholder.name}
                        onChange={(e) => handleShareholderChange(index, 'name', e.target.value)}
                        disabled={disabled}
                        className="text-right"
                        dir="rtl"
                        placeholder="שם מלא"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">מספר מזהה</Label>
                      <Input
                        type="text"
                        value={shareholder.id_number}
                        onChange={(e) => handleShareholderChange(index, 'id_number', e.target.value)}
                        disabled={disabled}
                        className="text-right"
                        dir="ltr"
                        placeholder="ת.ז. / ח.פ."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">אחוז החזקה</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={shareholder.holding_percentage || ''}
                          onChange={(e) => handleShareholderChange(index, 'holding_percentage', parseFloat(e.target.value) || 0)}
                          disabled={disabled}
                          className="text-left pr-8"
                          dir="ltr"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Dividend Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox
                id="has-dividend"
                checked={value.has_dividend || false}
                onCheckedChange={(checked) => onChange({ ...value, has_dividend: !!checked })}
                disabled={disabled}
              />
              <Label htmlFor="has-dividend" className="text-right cursor-pointer">
                החברה חילקה דיבידנד
              </Label>
            </div>

            {value.has_dividend && (
              <div className="space-y-4 p-4 bg-gray-50 border rounded-md">
                <div className="space-y-2">
                  <Label htmlFor="dividend-date" className="text-right block text-sm">
                    תאריך חלוקת הדיבידנד
                  </Label>
                  <Input
                    id="dividend-date"
                    type="date"
                    value={value.dividend_date || ''}
                    onChange={(e) => onChange({ ...value, dividend_date: e.target.value })}
                    disabled={disabled}
                    className="text-right max-w-[200px]"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dividend-details" className="text-right block text-sm">
                    פרטי הדיבידנד (סכומים שחולקו לכל אחד מבעלי המניות)
                  </Label>
                  <Input
                    id="dividend-details"
                    type="text"
                    value={value.dividend_details || ''}
                    onChange={(e) => onChange({ ...value, dividend_details: e.target.value })}
                    disabled={disabled}
                    className="text-right"
                    dir="rtl"
                    placeholder="לדוגמה: 50,000 ₪ לישראל ישראלי"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation */}
          {(!hasCompany || !hasBankName || !hasApplicant || !hasPeriod || !hasFinancials || !hasShareholders) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasCompany && 'יש לבחור חברה. '}
                {!hasBankName && 'יש להזין שם בנק. '}
                {!hasApplicant && 'יש להזין פרטי מבקש/ת המשכנתא. '}
                {!hasPeriod && 'יש להזין תקופת הדוח. '}
                {!hasFinancials && 'יש להזין נתונים כספיים. '}
                {!hasShareholders && 'יש למלא פרטי בעלי מניות.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
