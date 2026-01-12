/**
 * AuditCompletionForm - Form for Audit Completion letter
 * מכתב סיום ביקורת ועריכת דוחות כספיים
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { AuditCompletionVariables } from '@/types/auto-letters.types';

interface AuditCompletionFormProps {
  value: Partial<AuditCompletionVariables>;
  onChange: (data: Partial<AuditCompletionVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
}

export function AuditCompletionForm({ value, onChange, disabled, companyName, companyId }: AuditCompletionFormProps) {
  const isValid = !!(
    companyName?.trim() &&
    companyId?.trim() &&
    value.audit_year && value.audit_year > 2000 &&
    value.completion_date
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">מכתב סיום ביקורת דוחות כספיים</CardTitle>
          <CardDescription className="text-right">
            מכתב המודיע על צפי סיום עבודת הביקורת ועריכת הדוחות הכספיים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Info (read-only) */}
          {companyName && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-blue-800 text-right">
                <strong>החברה:</strong> {companyName}
                {companyId && <span> (ח.פ. {companyId})</span>}
              </div>
            </div>
          )}

          {/* Audit Year */}
          <div className="space-y-2">
            <Label htmlFor="audit-year" className="text-right block">
              שנת המס של הביקורת <span className="text-red-500">*</span>
            </Label>
            <Input
              id="audit-year"
              type="number"
              min="2000"
              max="2100"
              value={value.audit_year || ''}
              onChange={(e) => onChange({ ...value, audit_year: parseInt(e.target.value, 10) || undefined })}
              disabled={disabled}
              className="text-left w-32"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 text-right">
              יופיע בנדון ובסעיף 1 של המכתב
            </p>
          </div>

          {/* Completion Date */}
          <div className="space-y-2">
            <Label htmlFor="completion-date" className="text-right block">
              צפי סיום הביקורת <span className="text-red-500">*</span>
            </Label>
            <Input
              id="completion-date"
              type="date"
              value={value.completion_date || ''}
              onChange={(e) => onChange({ ...value, completion_date: e.target.value })}
              disabled={disabled}
              className="text-left w-48"
              dir="ltr"
            />
            <p className="text-xs text-gray-500 text-right">
              יופיע בסעיף 2: "אנו מעריכים כי עבודת הביקורת... תסתיים לא יאוחר מ-..."
            </p>
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש לבחור לקוח ולמלא את כל השדות המסומנים בכוכבית
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
