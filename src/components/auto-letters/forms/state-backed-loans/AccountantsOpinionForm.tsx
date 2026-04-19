/**
 * AccountantsOpinionForm - Form for State-Backed Loans: Accountant's Opinion
 * חוות דעת רואה חשבון בדבר הנתונים הכספיים בהצהרת המנהלים
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { AccountantsOpinionVariables } from '@/types/auto-letters.types';

interface AccountantsOpinionFormProps {
  value: Partial<AccountantsOpinionVariables>;
  onChange: (data: Partial<AccountantsOpinionVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
  documentDate?: string;
}

export function AccountantsOpinionForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
  documentDate,
}: AccountantsOpinionFormProps) {
  // Default signature_date to document_date if empty
  useEffect(() => {
    if (!value.signature_date && documentDate) {
      onChange({ ...value, signature_date: documentDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentDate]);

  const hasCompany = !!companyName?.trim();

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">חוות דעת רואה חשבון</CardTitle>
          <CardDescription className="text-right">
            דוח מיוחד של רואה החשבון לצורך בקשת הלוואה מהקרן - מתייחס להצהרת המנהלים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Display */}
          <div className="space-y-2">
            <Label className="text-right block">פרטי החברה</Label>
            {hasCompany ? (
              <div className="p-3 bg-gray-50 border rounded-md">
                <div className="text-right font-medium">{companyName}</div>
                {companyId && (
                  <div className="text-sm text-gray-600 text-right mt-1">ח.פ.: {companyId}</div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-right text-sm">
                יש לבחור לקוח בסעיף "בחירת נמען" למעלה
              </div>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="declaration-date" className="text-right block">
                תאריך הצהרת המנהלים
              </Label>
              <Input
                id="declaration-date"
                type="date"
                value={value.declaration_date || ''}
                onChange={(e) => onChange({ ...value, declaration_date: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 text-right">
                תאריך ההצהרה שחתומה על ידי הנהלת החברה (מיום ___)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature-date" className="text-right block">
                תאריך החתימה על חוות הדעת
              </Label>
              <Input
                id="signature-date"
                type="date"
                value={value.signature_date || ''}
                onChange={(e) => onChange({ ...value, signature_date: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 text-right">
                התאריך הרשום ליד חתימת רואה החשבון
              </p>
            </div>
          </div>

          <Separator />

          {/* City + Accountant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city-name" className="text-right block">
                שם העיר
              </Label>
              <Input
                id="city-name"
                type="text"
                value={value.city_name || ''}
                onChange={(e) => onChange({ ...value, city_name: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountant-name" className="text-right block">
                שם רואה החשבון
              </Label>
              <Input
                id="accountant-name"
                type="text"
                value={value.accountant_name || ''}
                onChange={(e) => onChange({ ...value, accountant_name: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* Validation hint */}
          {(!hasCompany ||
            !value.declaration_date ||
            !value.signature_date ||
            !value.city_name?.trim() ||
            !value.accountant_name?.trim()) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">יש למלא את כל השדות לצורך יצירת חוות הדעת.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
