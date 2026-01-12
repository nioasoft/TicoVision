/**
 * OsekUnsubmittedForm - Form for Mortgage Approval: Osek with Unsubmitted Report
 * אישור רו"ח למשכנתא עבור עוסק מורשה/פטור שדוח המס שלו טרם הוגש
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { MortgageOsekUnsubmittedVariables } from '@/types/auto-letters.types';
import { formatIsraeliDate } from '@/lib/formatters';

interface OsekUnsubmittedFormProps {
  value: Partial<MortgageOsekUnsubmittedVariables>;
  onChange: (data: Partial<MortgageOsekUnsubmittedVariables>) => void;
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

export function OsekUnsubmittedForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: OsekUnsubmittedFormProps) {
  const hasCompany = !!companyName?.trim();
  const hasBankName = !!value.bank_name?.trim();
  const hasApplicant = !!value.applicant_name?.trim();
  const hasPeriod = (value.period_months ?? 0) > 0 && !!value.period_end_date;
  const hasFinancials = value.revenue_turnover !== undefined && value.estimated_profit !== undefined;
  const hasLastReport = (value.last_submitted_year ?? 0) > 2000 && !!value.last_submission_date && !!value.tax_office?.trim();
  const hasCreditPoints = (value.credit_points ?? 0) > 0;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">עוסק מורשה/פטור - דוח טרם הוגש</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח לעוסק מורשה/פטור שהדוח למס הכנסה לשנה שקדמה טרם הוגש לרשויות המס
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Owner Display */}
          <div className="space-y-2">
            <Label className="text-right block">
              פרטי העוסק <span className="text-red-500">*</span>
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
          <div className="space-y-2">
            <Label htmlFor="applicant-name" className="text-right block">
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

          <Separator />

          {/* Period (Unaudited Report) */}
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

          {/* Financial Data (Unaudited) */}
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
                <Label htmlFor="estimated-profit" className="text-right block text-sm">
                  רווח משוער לפני מס (ללא תיאומים וביטוח לאומי) <span className="text-red-500">*</span>
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

          {/* Last Submitted Report Data */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">
              נתוני הדוח האחרון שהוגש (לצורך נקודות זיכוי)
            </Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="last-submitted-year" className="text-right block text-sm">
                  שנת הדוח <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last-submitted-year"
                  type="number"
                  min="2000"
                  max="2099"
                  value={value.last_submitted_year || ''}
                  onChange={(e) => onChange({ ...value, last_submitted_year: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                  placeholder="2023"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-submission-date" className="text-right block text-sm">
                  תאריך הגשה <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last-submission-date"
                  type="date"
                  value={value.last_submission_date || ''}
                  onChange={(e) => onChange({ ...value, last_submission_date: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-office" className="text-right block text-sm">
                  משרד השומה <span className="text-red-500">*</span>
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
            {value.last_submission_date && (
              <div className="text-sm text-gray-600 text-right">
                תאריך הגשה בעברית: {formatIsraeliDate(value.last_submission_date)}
              </div>
            )}
          </div>

          <Separator />

          {/* Credit Points */}
          <div className="space-y-2">
            <Label htmlFor="credit-points" className="text-right block">
              נקודות זיכוי <span className="text-red-500">*</span>
            </Label>
            <Input
              id="credit-points"
              type="number"
              step="0.25"
              min="0"
              max="10"
              value={value.credit_points || ''}
              onChange={(e) => onChange({ ...value, credit_points: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="text-right max-w-[150px]"
              dir="ltr"
              placeholder="2.25"
            />
            <div className="text-xs text-gray-500 text-right">
              מספר נקודות הזיכוי של הלקוח (לדוגמה: 2.25)
            </div>
          </div>

          <Separator />

          {/* Audited Report Attachment Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox
                id="has-audited-report"
                checked={value.has_audited_report_attachment || false}
                onCheckedChange={(checked) => onChange({ ...value, has_audited_report_attachment: !!checked })}
                disabled={disabled}
              />
              <Label htmlFor="has-audited-report" className="text-right cursor-pointer">
                צירוף דוח מבוקר
              </Label>
            </div>

            {value.has_audited_report_attachment && (
              <div className="space-y-4 p-4 bg-gray-50 border rounded-md">
                <div className="text-sm text-gray-600 text-right">
                  הטקסט הבא יתווסף לסוף המכתב: "כתמיכה לבקשה, אנו מצרפים לכם את הדוח המבוקר האחרון של חברת..."
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ebitda-amount" className="text-right block text-sm">
                    סכום EBITDA בדוח
                  </Label>
                  <div className="relative">
                    <Input
                      id="ebitda-amount"
                      type="number"
                      value={value.ebitda_amount || ''}
                      onChange={(e) => onChange({ ...value, ebitda_amount: parseFloat(e.target.value) || 0 })}
                      disabled={disabled}
                      className="text-left pl-8 max-w-[200px]"
                      dir="ltr"
                      placeholder="0"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₪</span>
                  </div>
                  {value.ebitda_amount ? (
                    <div className="text-xs text-gray-500 text-right">
                      {formatCurrency(value.ebitda_amount)} ₪
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Validation */}
          {(!hasCompany || !hasBankName || !hasApplicant || !hasPeriod || !hasFinancials || !hasLastReport || !hasCreditPoints) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasCompany && 'יש לבחור עוסק. '}
                {!hasBankName && 'יש להזין שם בנק. '}
                {!hasApplicant && 'יש להזין שם מבקש/ת המשכנתא. '}
                {!hasPeriod && 'יש להזין תקופת הדוח. '}
                {!hasFinancials && 'יש להזין נתונים כספיים. '}
                {!hasLastReport && 'יש להזין נתוני הדוח האחרון שהוגש. '}
                {!hasCreditPoints && 'יש להזין נקודות זיכוי.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
