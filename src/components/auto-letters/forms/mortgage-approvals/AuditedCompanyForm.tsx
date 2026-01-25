/**
 * AuditedCompanyForm - Form for Mortgage Approval: Audited Company
 * אישור רו"ח למשכנתא עבור בעל שליטה בחברה בע"מ עם דוחות כספיים מבוקרים
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import type { MortgageAuditedCompanyVariables, ShareholderEntry } from '@/types/auto-letters.types';
import { formatIsraeliDate } from '@/lib/formatters';

interface AuditedCompanyFormProps {
  value: Partial<MortgageAuditedCompanyVariables>;
  onChange: (data: Partial<MortgageAuditedCompanyVariables>) => void;
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

export function AuditedCompanyForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: AuditedCompanyFormProps) {
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
  const hasAuditData = (value.audited_year ?? 0) > 2000 && !!value.audit_date;
  const hasFinancials = value.revenue_turnover !== undefined &&
    value.net_profit_current !== undefined &&
    value.net_profit_previous !== undefined &&
    value.retained_earnings !== undefined;
  const hasShareholders = shareholders.length > 0 && shareholders.every(sh =>
    sh.name?.trim() && sh.id_number?.trim() && sh.holding_percentage >= 0
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בעל שליטה - דוחות מבוקרים</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח עבור בעל שליטה בחברה בע"מ עם דוחות כספיים מבוקרים לשנה שקדמה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Display */}
          <div className="space-y-2">
            <Label className="text-right block">
              פרטי החברה 
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
              שם הבנק 
            </Label>
            <Input
              id="bank-name"
              type="text"
              value={value.bank_name || ''}
              onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"

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
                  שם מבקש/ת המשכנתא 
                </Label>
                <Input
                  id="applicant-name"
                  type="text"
                  value={value.applicant_name || ''}
                  onChange={(e) => onChange({ ...value, applicant_name: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"

                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicant-role" className="text-right block text-sm">
                  תפקיד בחברה 
                </Label>
                <Input
                  id="applicant-role"
                  type="text"
                  value={value.applicant_role || ''}
                  onChange={(e) => onChange({ ...value, applicant_role: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"

                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Audit Data */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              נתוני הדוח הכספי המבוקר
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="audited-year" className="text-right block text-sm">
                  שנת הדוח המבוקר 
                </Label>
                <Input
                  id="audited-year"
                  type="number"
                  min="2000"
                  max="2099"
                  value={value.audited_year || ''}
                  onChange={(e) => onChange({ ...value, audited_year: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"

                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audit-date" className="text-right block text-sm">
                  תאריך חוות הדעת 
                </Label>
                <Input
                  id="audit-date"
                  type="date"
                  value={value.audit_date || ''}
                  onChange={(e) => onChange({ ...value, audit_date: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>
            {value.audit_date && (
              <div className="text-sm text-gray-600 text-right">
                תאריך חוות הדעת בעברית: {formatIsraeliDate(value.audit_date)}
              </div>
            )}
          </div>

          <Separator />

          {/* Financial Data from Audited Report */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              נתונים כספיים מהדוחות המבוקרים (בש"ח)
            </Label>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="revenue-turnover" className="text-right block text-sm">
                  מחזור ההכנסות (ללא מע"מ) 
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

                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.revenue_turnover ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.revenue_turnover)} ₪
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="net-profit-current" className="text-right block text-sm">
                    רווח נקי לפני מס - שנה נוכחית 
                  </Label>
                  <div className="relative">
                    <Input
                      id="net-profit-current"
                      type="number"
                      value={value.net_profit_current || ''}
                      onChange={(e) => onChange({ ...value, net_profit_current: parseFloat(e.target.value) || 0 })}
                      disabled={disabled}
                      className="text-left pl-8"
                      dir="ltr"

                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  </div>
                  {value.net_profit_current ? (
                    <div className="text-xs text-gray-500 text-right">
                      {formatCurrency(value.net_profit_current)} ₪
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="net-profit-previous" className="text-right block text-sm">
                    רווח נקי - שנה קודמת 
                  </Label>
                  <div className="relative">
                    <Input
                      id="net-profit-previous"
                      type="number"
                      value={value.net_profit_previous || ''}
                      onChange={(e) => onChange({ ...value, net_profit_previous: parseFloat(e.target.value) || 0 })}
                      disabled={disabled}
                      className="text-left pl-8"
                      dir="ltr"

                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  </div>
                  {value.net_profit_previous ? (
                    <div className="text-xs text-gray-500 text-right">
                      {formatCurrency(value.net_profit_previous)} ₪
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retained-earnings" className="text-right block text-sm">
                  יתרת עודפים 
                </Label>
                <div className="relative">
                  <Input
                    id="retained-earnings"
                    type="number"
                    value={value.retained_earnings || ''}
                    onChange={(e) => onChange({ ...value, retained_earnings: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="text-left pl-8"
                    dir="ltr"

                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.retained_earnings ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.retained_earnings)} ₪
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
                תאריך דוח רשם החברות 
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

                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation */}
          {(!hasCompany || !hasBankName || !hasApplicant || !hasAuditData || !hasFinancials || !hasShareholders) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasCompany && 'יש לבחור חברה. '}
                {!hasBankName && 'יש להזין שם בנק. '}
                {!hasApplicant && 'יש להזין פרטי מבקש/ת המשכנתא. '}
                {!hasAuditData && 'יש להזין שנת דוח ותאריך חוות דעת. '}
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
