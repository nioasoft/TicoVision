/**
 * DirectorsDeclarationForm - Form for State-Backed Loans: Directors' Declaration
 * הצהרת מנהלים לצורך בקשת הלוואה מקרן ההלוואות לעסקים קטנים ובינוניים בערבות מדינה
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { formatILSInteger } from '@/lib/formatters';
import type { DirectorsDeclarationVariables, YearlyFigures } from '@/types/auto-letters.types';

interface DirectorsDeclarationFormProps {
  value: Partial<DirectorsDeclarationVariables>;
  onChange: (data: Partial<DirectorsDeclarationVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
}

type YearlyFieldKey =
  | 'owners_salary_cost'
  | 'related_parties_salary_cost'
  | 'owners_current_account_balance'
  | 'related_parties_current_account_balance'
  | 'manager_salary'
  | 'family_members_salary'
  | 'other_benefits';

const TABLE_1_ROWS: Array<{ key: YearlyFieldKey; label: string }> = [
  { key: 'owners_salary_cost', label: 'עלות שכר בעלים*' },
  { key: 'related_parties_salary_cost', label: 'עלות שכר בעלי עניין*' },
  { key: 'owners_current_account_balance', label: 'יתרת חו"ז בעלים*' },
  { key: 'related_parties_current_account_balance', label: 'יתרת חו"ז צדדים קשורים' },
];

const TABLE_2_ROWS: Array<{ key: YearlyFieldKey; label: string }> = [
  { key: 'manager_salary', label: 'שכר מנהל' },
  { key: 'family_members_salary', label: 'שכר בני משפחה' },
  { key: 'other_benefits', label: 'הטבות אחרות (דיבידנד/דמי ניהול/אחר)' },
];

const emptyFigures: YearlyFigures = { y1: 0, y2: 0, y3: 0 };

function getFigures(value: Partial<DirectorsDeclarationVariables>, key: YearlyFieldKey): YearlyFigures {
  return (value[key] as YearlyFigures | undefined) ?? emptyFigures;
}

export function DirectorsDeclarationForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: DirectorsDeclarationFormProps) {
  const currentYear = new Date().getFullYear();

  // Auto-populate default years if missing (only on initial mount with empty values)
  useEffect(() => {
    if (
      value.financial_table_year_1 === undefined ||
      value.financial_table_year_2 === undefined ||
      value.financial_table_year_3 === undefined
    ) {
      onChange({
        ...value,
        financial_table_year_1: value.financial_table_year_1 ?? currentYear - 2,
        financial_table_year_2: value.financial_table_year_2 ?? currentYear - 1,
        financial_table_year_3: value.financial_table_year_3 ?? currentYear,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleYearlyFieldChange = (key: YearlyFieldKey, slot: keyof YearlyFigures, raw: string) => {
    const parsed = raw === '' ? 0 : parseFloat(raw);
    const current = getFigures(value, key);
    onChange({
      ...value,
      [key]: { ...current, [slot]: Number.isFinite(parsed) ? parsed : 0 },
    });
  };

  const hasCompany = !!companyName?.trim();
  const year1 = value.financial_table_year_1;
  const year2 = value.financial_table_year_2;
  const year3 = value.financial_table_year_3;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הצהרת מנהלים</CardTitle>
          <CardDescription className="text-right">
            הצהרת מנהלים לצורך בקשת הלוואה מקרן ההלוואות לעסקים קטנים ובינוניים בערבות מדינה
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

          {/* Fiscal Year + Tax Debt Cutoff Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fiscal-year" className="text-right block">
                שנה פיסקלית (31 בדצמבר)
              </Label>
              <Input
                id="fiscal-year"
                type="number"
                min="2000"
                max="2099"
                value={value.fiscal_year ?? ''}
                onChange={(e) => onChange({ ...value, fiscal_year: parseInt(e.target.value) || 0 })}
                disabled={disabled}
                className="text-right"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 text-right">
                "נכון ליום 31 בדצמבר ___" במכתב
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax-debt-cutoff-date" className="text-right block">
                תאריך סף לחוב מס
              </Label>
              <Input
                id="tax-debt-cutoff-date"
                type="date"
                value={value.tax_debt_cutoff_date || ''}
                onChange={(e) => onChange({ ...value, tax_debt_cutoff_date: e.target.value })}
                disabled={disabled}
                className="text-right"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 text-right">
                "שמועד היווצרותו היה לפני יום ___"
              </p>
            </div>
          </div>

          <Separator />

          {/* Table Years */}
          <div className="space-y-3">
            <Label className="text-right block font-medium">שנים בכותרות הטבלאות</Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 text-right block">שנה 1</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2099"
                  value={value.financial_table_year_1 ?? ''}
                  onChange={(e) => onChange({ ...value, financial_table_year_1: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 text-right block">שנה 2</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2099"
                  value={value.financial_table_year_2 ?? ''}
                  onChange={(e) => onChange({ ...value, financial_table_year_2: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500 text-right block">שנה 3</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2099"
                  value={value.financial_table_year_3 ?? ''}
                  onChange={(e) => onChange({ ...value, financial_table_year_3: parseInt(e.target.value) || 0 })}
                  disabled={disabled}
                  className="text-right"
                  dir="ltr"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 text-right">
              ברירת מחדל: 3 השנים האחרונות. ניתן לערוך כל שנה בנפרד.
            </p>
          </div>

          <Separator />

          {/* Table 1 - Costs / Balances */}
          <div className="space-y-3">
            <Label className="text-right block font-medium">טבלה 1 – עלויות ויתרות (בש"ח)</Label>
            <div className="space-y-3">
              {TABLE_1_ROWS.map((row) => {
                const figures = getFigures(value, row.key);
                return (
                  <div key={row.key} className="p-3 border rounded-md bg-gray-50">
                    <div className="text-right font-medium text-sm mb-2">{row.label}</div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['y1', 'y2', 'y3'] as const).map((slot, idx) => {
                        const yearLabel = idx === 0 ? year1 : idx === 1 ? year2 : year3;
                        return (
                          <div key={slot} className="space-y-1">
                            <Label className="text-xs text-gray-500 text-right block">
                              {yearLabel ? `שנת ${yearLabel}` : `שנה ${idx + 1}`}
                            </Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              step="any"
                              value={figures[slot] === 0 ? '' : figures[slot]}
                              onChange={(e) => handleYearlyFieldChange(row.key, slot, e.target.value)}
                              disabled={disabled}
                              className="text-left"
                              dir="ltr"
                            />
                            {figures[slot] ? (
                              <div className="text-[11px] text-gray-500 text-right">
                                {formatILSInteger(figures[slot])}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 text-right">
              * בעלים הוא מי שמחזיק 5% או יותר ממניות החברה. בעל עניין הוא מי שמחזיק פחות מ-5%.
            </p>
          </div>

          <Separator />

          {/* Table 2 - Wages / Benefits */}
          <div className="space-y-3">
            <Label className="text-right block font-medium">טבלה 2 – עלות שכר ומשיכות (בש"ח)</Label>
            <div className="space-y-3">
              {TABLE_2_ROWS.map((row) => {
                const figures = getFigures(value, row.key);
                return (
                  <div key={row.key} className="p-3 border rounded-md bg-gray-50">
                    <div className="text-right font-medium text-sm mb-2">{row.label}</div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['y1', 'y2', 'y3'] as const).map((slot, idx) => {
                        const yearLabel = idx === 0 ? year1 : idx === 1 ? year2 : year3;
                        return (
                          <div key={slot} className="space-y-1">
                            <Label className="text-xs text-gray-500 text-right block">
                              {yearLabel ? `שנת ${yearLabel}` : `שנה ${idx + 1}`}
                            </Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              step="any"
                              value={figures[slot] === 0 ? '' : figures[slot]}
                              onChange={(e) => handleYearlyFieldChange(row.key, slot, e.target.value)}
                              disabled={disabled}
                              className="text-left"
                              dir="ltr"
                            />
                            {figures[slot] ? (
                              <div className="text-[11px] text-gray-500 text-right">
                                {formatILSInteger(figures[slot])}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Signatures */}
          <div className="space-y-4">
            <Label className="text-right block font-medium">חותמים על ההצהרה</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="financial-responsible-manager" className="text-right block text-sm">
                  שם המנהל האחראי לענייני כספים ותוארו
                </Label>
                <Input
                  id="financial-responsible-manager"
                  type="text"
                  value={value.financial_responsible_manager_name || ''}
                  onChange={(e) => onChange({ ...value, financial_responsible_manager_name: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acting-manager" className="text-right block text-sm">
                  שם המנהל בפועל ותוארו
                </Label>
                <Input
                  id="acting-manager"
                  type="text"
                  value={value.acting_manager_name || ''}
                  onChange={(e) => onChange({ ...value, acting_manager_name: e.target.value })}
                  disabled={disabled}
                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* Validation hint */}
          {(!hasCompany ||
            !value.fiscal_year ||
            !value.tax_debt_cutoff_date ||
            !value.financial_responsible_manager_name?.trim() ||
            !value.acting_manager_name?.trim()) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasCompany && 'יש לבחור חברה. '}
                {!value.fiscal_year && 'יש להזין שנה פיסקלית. '}
                {!value.tax_debt_cutoff_date && 'יש להזין תאריך סף לחוב מס. '}
                {(!value.financial_responsible_manager_name?.trim() || !value.acting_manager_name?.trim()) && 'יש להזין את שמות המנהלים החותמים.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
