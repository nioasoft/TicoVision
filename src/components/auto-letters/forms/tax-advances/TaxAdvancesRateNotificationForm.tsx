/**
 * TaxAdvancesRateNotificationForm - Form for Tax Advances Rate Notification letter
 * מכתב הודעה על שיעור מקדמה
 *
 * Supports two scenarios:
 * - Scenario A (default): The assigned rate is justified
 * - Scenario B (toggle on): We decided on a different rate
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TaxAdvancesRateNotificationVariables, MeetingType } from '@/types/auto-letters.types';

interface TaxAdvancesRateNotificationFormProps {
  value: Partial<TaxAdvancesRateNotificationVariables>;
  onChange: (data: Partial<TaxAdvancesRateNotificationVariables>) => void;
  disabled?: boolean;
  companyName?: string;
}

const MEETING_TYPE_OPTIONS: { value: MeetingType; label: string }[] = [
  { value: 'רבעונית', label: 'רבעונית' },
  { value: 'שלישונית', label: 'שלישונית' },
  { value: 'חצי-שנתית', label: 'חצי-שנתית' },
];

export function TaxAdvancesRateNotificationForm({
  value,
  onChange,
  disabled,
  companyName,
}: TaxAdvancesRateNotificationFormProps) {
  const baseValid = !!(
    companyName?.trim() &&
    value.tax_year && value.tax_year > 2000 &&
    value.advance_rate !== undefined &&
    value.advance_rate > 0 &&
    value.advance_rate <= 100 &&
    value.meeting_type
  );

  const isValid = baseValid && (
    !value.rate_is_different || (
      value.decided_rate !== undefined &&
      value.decided_rate > 0 &&
      value.decided_rate <= 100
    )
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הודעה על שיעור מקדמה</CardTitle>
          <CardDescription className="text-right">
            הודעה ללקוח על שיעור מקדמת מס החברות שנקבע
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Info (read-only) */}
          {companyName && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800 text-right">
                <strong>הלקוח:</strong> {companyName}
              </div>
            </div>
          )}

          {/* Tax Year */}
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
            <p className="text-xs text-gray-500 text-right">
              השנים הקודמת והבאה יחושבו אוטומטית
            </p>
          </div>

          {/* Advance Rate (as assigned by tax authority) */}
          <div className="space-y-2">
            <Label htmlFor="advance-rate" className="text-right block">
              שיעור המקדמה שנקבע (%)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="advance-rate"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={value.advance_rate || ''}
                onChange={(e) => onChange({ ...value, advance_rate: parseFloat(e.target.value) || undefined })}
                disabled={disabled}
                className="text-left w-32"
                dir="ltr"
              />
              <span className="text-lg font-medium">%</span>
            </div>
            <p className="text-xs text-gray-500 text-right">
              שיעור המקדמה החודשית שנקבע על ידי רשות המיסים
            </p>
          </div>

          {/* Rate Is Different Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-md">
            <Label htmlFor="rate-is-different" className="text-right cursor-pointer">
              החלטנו על שיעור שונה
            </Label>
            <Switch
              id="rate-is-different"
              checked={!!value.rate_is_different}
              onCheckedChange={(checked) => onChange({
                ...value,
                rate_is_different: checked,
                // Clear decided_rate when turning off
                ...(!checked && { decided_rate: undefined }),
              })}
              disabled={disabled}
            />
          </div>

          {/* Decided Rate (shown only when toggle is ON) */}
          {value.rate_is_different && (
            <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <Label htmlFor="decided-rate" className="text-right block">
                שיעור המקדמה שהחלטנו (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="decided-rate"
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={value.decided_rate || ''}
                  onChange={(e) => onChange({ ...value, decided_rate: parseFloat(e.target.value) || undefined })}
                  disabled={disabled}
                  className="text-left w-32"
                  dir="ltr"
                />
                <span className="text-lg font-medium">%</span>
              </div>
              <p className="text-xs text-gray-600 text-right">
                השיעור שהחלטנו עליו יופיע במכתב במקום "שיעור זה מוצדק"
              </p>
            </div>
          )}

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meeting-type" className="text-right block">
              סוג פגישה
            </Label>
            <Select
              value={value.meeting_type || 'רבעונית'}
              onValueChange={(val) => onChange({ ...value, meeting_type: val as MeetingType })}
              disabled={disabled}
            >
              <SelectTrigger className="w-48 text-right" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {MEETING_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 text-right">
              יופיע בטקסט: "בפגישה ה[סוג] עמכם נבדוק..."
            </p>
          </div>

          {/* Preview Summary */}
          {value.tax_year && value.advance_rate && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm text-green-800 text-right">
                <strong>סיכום:</strong> שיעור מקדמה שנקבע: {value.advance_rate}% לשנת המס {value.tax_year}
                {value.rate_is_different && value.decided_rate && (
                  <>
                    <br />
                    <strong>שיעור שהחלטנו:</strong> {value.decided_rate}%
                  </>
                )}
                <br />
                <span className="text-xs">
                  (שנת דוח קודם: {value.tax_year - 1}, שנה הבאה: {value.tax_year + 1})
                </span>
              </div>
            </div>
          )}

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!baseValid
                  ? 'יש לבחור לקוח ולמלא את שנת המס ושיעור המקדמה'
                  : 'יש למלא את שיעור המקדמה שהחלטנו'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
