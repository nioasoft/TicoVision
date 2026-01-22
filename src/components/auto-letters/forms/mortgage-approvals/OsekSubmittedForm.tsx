/**
 * OsekSubmittedForm - Form for Mortgage Approval: Osek with Submitted Report
 * אישור רו"ח למשכנתא עבור עוסק מורשה/פטור שדוח המס שלו הוגש לרשויות
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Combobox } from '@/components/ui/combobox';
import type { MortgageOsekSubmittedVariables } from '@/types/auto-letters.types';
import { formatIsraeliDate } from '@/lib/formatters';
import { ISRAELI_BANKS } from '@/lib/constants/israeli-banks';

interface OsekSubmittedFormProps {
  value: Partial<MortgageOsekSubmittedVariables>;
  onChange: (data: Partial<MortgageOsekSubmittedVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
}

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

export function OsekSubmittedForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: OsekSubmittedFormProps) {
  const hasCompany = !!companyName?.trim();
  const hasBankName = !!value.bank_name?.trim();
  const hasApplicant = !!value.applicant_name?.trim();
  const hasReportData = (value.report_year ?? 0) > 2000 && !!value.submission_date && !!value.tax_office?.trim();
  const hasFinancials = value.revenue_turnover !== undefined &&
    value.taxable_income !== undefined &&
    value.income_tax !== undefined;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">עוסק מורשה/פטור - דוח הוגש</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח לעוסק מורשה/פטור שהדוח למס הכנסה לשנה שקדמה הוגש לרשויות המס
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Owner Display */}
          <div className="space-y-2">
            <Label className="text-right block">
              פרטי העוסק 
            </Label>
            {companyName ? (
              <div className="p-3 bg-gray-50 border rounded-md">
                <div className="text-right font-medium">{companyName}</div>
                {companyId && (
                  <div className="text-sm text-gray-600 text-right mt-1">
                    ע.מ./ע.פ: {companyId}
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
            <Combobox
              options={ISRAELI_BANKS}
              value={value.bank_name || ''}
              onValueChange={(val) => onChange({ ...value, bank_name: val })}
              disabled={disabled}
              placeholder="בחר בנק"
              searchPlaceholder="חיפוש בנק..."
              emptyText="לא נמצא בנק"
              allowCustomValue={true}
              customValueLabel='השתמש ב: "{value}"'
            />
          </div>

          <Separator />

          {/* Applicant Details */}
          <div className="space-y-2">
            <Label htmlFor="applicant-name" className="text-right block">
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
              placeholder="ישראל ישראלי"
            />
          </div>

          <Separator />

          {/* Report Submission Data */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              נתוני הדוח שהוגש
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report-year" className="text-right block text-sm">
                  שנת הדוח 
                </Label>
                <Input
                  id="report-year"
                  type="number"
                  min="2000"
                  max="2099"
                  value={value.report_year || ''}
                  onChange={(e) => onChange({ ...value, report_year: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                  placeholder="2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submission-date" className="text-right block text-sm">
                  תאריך הגשה 
                </Label>
                <Input
                  id="submission-date"
                  type="date"
                  value={value.submission_date || ''}
                  onChange={(e) => onChange({ ...value, submission_date: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-office" className="text-right block text-sm">
                  משרד השומה 
                </Label>
                <Input
                  id="tax-office"
                  type="text"
                  value={value.tax_office || ''}
                  onChange={(e) => onChange({ ...value, tax_office: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"
                  placeholder="תל אביב / ירושלים / חיפה"
                />
              </div>
            </div>
            {value.submission_date && (
              <div className="text-sm text-gray-600 text-right">
                תאריך הגשה בעברית: {formatIsraeliDate(value.submission_date)}
              </div>
            )}
          </div>

          <Separator />

          {/* Financial Data from Submitted Report */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              נתונים כספיים מהדוח שהוגש (בש"ח)
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
                <Label htmlFor="taxable-income" className="text-right block text-sm">
                  הכנסה חייבת מיגיעה אישית 
                </Label>
                <div className="relative">
                  <Input
                    id="taxable-income"
                    type="number"
                    value={value.taxable_income || ''}
                    onChange={(e) => onChange({ ...value, taxable_income: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="text-left pl-8"
                    dir="ltr"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.taxable_income ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.taxable_income)} ₪
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="income-tax" className="text-right block text-sm">
                  סכום מס ההכנסה 
                </Label>
                <div className="relative">
                  <Input
                    id="income-tax"
                    type="number"
                    value={value.income_tax || ''}
                    onChange={(e) => onChange({ ...value, income_tax: parseFloat(e.target.value) || 0 })}
                    disabled={disabled}
                    className="text-left pl-8"
                    dir="ltr"
                    placeholder="0"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                </div>
                {value.income_tax ? (
                  <div className="text-xs text-gray-500 text-right">
                    {formatCurrency(value.income_tax)} ₪
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Validation */}
          {(!hasCompany || !hasBankName || !hasApplicant || !hasReportData || !hasFinancials) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasCompany && 'יש לבחור עוסק. '}
                {!hasBankName && 'יש להזין שם בנק. '}
                {!hasApplicant && 'יש להזין שם מבקש/ת המשכנתא. '}
                {!hasReportData && 'יש להזין שנת דוח, תאריך הגשה ומשרד שומה. '}
                {!hasFinancials && 'יש להזין נתונים כספיים.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
