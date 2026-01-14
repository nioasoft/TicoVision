import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VatFileOpenedVariables } from '@/types/auto-letters.types';

interface VatFileOpenedFormProps {
  value: Partial<VatFileOpenedVariables>;
  onChange: (data: Partial<VatFileOpenedVariables>) => void;
  disabled?: boolean;
}

export function VatFileOpenedForm({ value, onChange, disabled }: VatFileOpenedFormProps) {
  // Auto-copy company_id to vat_number when company_id changes
  const handleCompanyIdChange = (companyId: string) => {
    onChange({
      ...value,
      company_id: companyId,
      // Auto-copy to vat_number if it's empty or equals the previous company_id
      vat_number: !value.vat_number || value.vat_number === value.company_id
        ? companyId
        : value.vat_number,
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הודעה על פתיחת תיק מע״מ</CardTitle>
          <CardDescription className="text-right">
            הודעה ללקוח על פתיחת תיק מע״מ בהצלחה עם כל הפרטים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Line (הנדון) - readonly */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-right block">
              הנדון (נושא המכתב) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || 'פתיחת תיק מס ערך מוסף (מע"מ)'}
              disabled={true}
              className="text-right bg-gray-100"
              dir="rtl"
            />
            <p className="text-sm text-gray-500 text-right">
              הנדון מוגדר מראש ויכלול גם את שם החברה ומספר ח.פ
            </p>
          </div>

          {/* Company ID & VAT Number - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company-id" className="text-right block">
                מספר ח.פ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company-id"
                type="text"
                value={value.company_id || ''}
                onChange={(e) => handleCompanyIdChange(e.target.value)}
                disabled={disabled}
                className="text-right"
                dir="rtl"
                placeholder="9 ספרות"
                maxLength={9}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vat-number" className="text-right block">
                מספר עוסק מורשה <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vat-number"
                type="text"
                value={value.vat_number || ''}
                onChange={(e) => onChange({ ...value, vat_number: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="rtl"
                placeholder="מועתק אוטומטית ממספר ח.פ"
                maxLength={9}
              />
            </div>
          </div>

          {/* Report Frequency & First Report Date - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vat-report-frequency" className="text-right block">
                תדירות דיווח <span className="text-red-500">*</span>
              </Label>
              <Select
                value={value.vat_report_frequency || 'חודשי'}
                onValueChange={(val) => onChange({ ...value, vat_report_frequency: val as 'חודשי' | 'דו-חודשי' })}
                disabled={disabled}
              >
                <SelectTrigger className="text-right" dir="rtl">
                  <SelectValue placeholder="בחר תדירות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="חודשי">חודשי</SelectItem>
                  <SelectItem value="דו-חודשי">דו-חודשי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="first-report-date" className="text-right block">
                מועד דיווח ראשון <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first-report-date"
                type="text"
                value={value.vat_first_report_date || ''}
                onChange={(e) => onChange({ ...value, vat_first_report_date: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="rtl"
                placeholder="לדוגמה: 15/5/2025"
              />
            </div>
          </div>

          {/* First Report Period */}
          <div className="space-y-2">
            <Label htmlFor="first-report-period" className="text-right block">
              בגין חודש <span className="text-red-500">*</span>
            </Label>
            <Input
              id="first-report-period"
              type="text"
              value={value.vat_first_report_period || ''}
              onChange={(e) => onChange({ ...value, vat_first_report_period: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder="לדוגמה: אפריל 2025"
            />
          </div>

          {/* Certificate Link (optional) */}
          <div className="space-y-2">
            <Label htmlFor="certificate-link" className="text-right block">
              קישור לתעודת עוסק מורשה (אופציונלי)
            </Label>
            <Input
              id="certificate-link"
              type="url"
              value={value.certificate_link || ''}
              onChange={(e) => onChange({ ...value, certificate_link: e.target.value })}
              disabled={disabled}
              className="text-left"
              dir="ltr"
              placeholder="https://..."
            />
            <p className="text-sm text-gray-500 text-right">
              אם קיים קישור לתעודה, הוא יוצג במכתב
            </p>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב יכלול:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הודעה על השלמת פתיחת תיק מע״מ בהצלחה</li>
              <li>פרטי התיק: מספר עוסק, תדירות דיווח, מועד דיווח ראשון</li>
              {value.certificate_link && (
                <li className="text-green-700">קישור לתעודת עוסק מורשה</li>
              )}
              <li className="text-amber-700 font-medium">תזכורת חשובה: נדרש דיווח אפס למניעת קביעות מס</li>
              <li>המשך טיפול: תיקי ניכויים, ניכוי מס במקור (5%), מקדמות</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.company_id?.trim() ||
            !value.vat_number?.trim() ||
            !value.vat_first_report_date?.trim() ||
            !value.vat_first_report_period?.trim()) && (
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
