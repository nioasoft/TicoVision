import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { VatFileOpenedVariables } from '@/types/auto-letters.types';

interface VatFileOpenedFormProps {
  value: Partial<VatFileOpenedVariables>;
  onChange: (data: Partial<VatFileOpenedVariables>) => void;
  disabled?: boolean;
  /** Company ID (ח.פ.) from selected client - auto-populates company_id field */
  companyId?: string;
}

export function VatFileOpenedForm({ value, onChange, disabled, companyId }: VatFileOpenedFormProps) {
  // Auto-populate company_id from selected client when it changes
  useEffect(() => {
    if (companyId && !value.company_id) {
      onChange({
        ...value,
        company_id: companyId,
        vat_number: companyId, // Also auto-populate vat_number
      });
    }
  }, [companyId]);

  // Auto-copy company_id to vat_number when company_id changes
  const handleCompanyIdChange = (newCompanyId: string) => {
    onChange({
      ...value,
      company_id: newCompanyId,
      // Auto-copy to vat_number if it's empty or equals the previous company_id
      vat_number: !value.vat_number || value.vat_number === value.company_id
        ? newCompanyId
        : value.vat_number,
    });
  };

  return (
    <div dir="rtl">
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-right text-base">הודעה על פתיחת תיק מע״מ</CardTitle>
          <CardDescription className="text-right text-sm">
            הודעה ללקוח על פתיחת תיק מע״מ בהצלחה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-0">
          {/* Subject Line (הנדון) - readonly */}
          <div className="space-y-1">
            <Label htmlFor="subject" className="text-right block text-sm">
              הנדון <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              value={value.subject || 'פתיחת תיק מס ערך מוסף (מע"מ)'}
              disabled={true}
              className="text-right bg-gray-100 h-9"
              dir="rtl"
            />
          </div>

          {/* Company ID & VAT Number - side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="company-id" className="text-right block text-sm">
                מספר ח.פ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company-id"
                type="text"
                value={value.company_id || ''}
                onChange={(e) => handleCompanyIdChange(e.target.value)}
                disabled={disabled}
                className="text-right h-9"
                dir="rtl"
                placeholder="9 ספרות"
                maxLength={9}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="vat-number" className="text-right block text-sm">
                מספר עוסק מורשה <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vat-number"
                type="text"
                value={value.vat_number || ''}
                onChange={(e) => onChange({ ...value, vat_number: e.target.value })}
                disabled={disabled}
                className="text-right h-9"
                dir="rtl"
                placeholder="מועתק אוטומטית"
                maxLength={9}
              />
            </div>
          </div>

          {/* Report Frequency, First Report Date & Period - 3 columns */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="vat-report-frequency" className="text-right block text-sm">
                תדירות דיווח <span className="text-red-500">*</span>
              </Label>
              <Select
                value={value.vat_report_frequency || 'חודשי'}
                onValueChange={(val) => onChange({ ...value, vat_report_frequency: val as 'חודשי' | 'דו-חודשי' })}
                disabled={disabled}
              >
                <SelectTrigger className="text-right h-9" dir="rtl">
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="חודשי">חודשי</SelectItem>
                  <SelectItem value="דו-חודשי">דו-חודשי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="first-report-date" className="text-right block text-sm">
                מועד דיווח ראשון <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first-report-date"
                type="date"
                value={value.vat_first_report_date || ''}
                onChange={(e) => onChange({ ...value, vat_first_report_date: e.target.value })}
                disabled={disabled}
                className="text-right h-9"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="first-report-period" className="text-right block text-sm">
                בגין חודש <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first-report-period"
                type="text"
                value={value.vat_first_report_period || ''}
                onChange={(e) => onChange({ ...value, vat_first_report_period: e.target.value })}
                disabled={disabled}
                className="text-right h-9"
                dir="rtl"
                placeholder="אפריל 2025"
              />
            </div>
          </div>

          {/* Certificate Link (optional) */}
          <div className="space-y-1">
            <Label htmlFor="certificate-link" className="text-right block text-sm">
              קישור לתעודת עוסק (אופציונלי)
            </Label>
            <Input
              id="certificate-link"
              type="url"
              value={value.certificate_link || ''}
              onChange={(e) => onChange({ ...value, certificate_link: e.target.value })}
              disabled={disabled}
              className="text-left h-9"
              dir="ltr"
              placeholder="https://..."
            />
          </div>

          {/* Validation - compact inline */}
          {(!value.company_id?.trim() ||
            !value.vat_number?.trim() ||
            !value.vat_first_report_date?.trim() ||
            !value.vat_first_report_period?.trim()) && (
            <p className="text-xs text-amber-600 text-right">
              יש למלא את כל השדות המסומנים בכוכבית
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
