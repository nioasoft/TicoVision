/**
 * IncomeConfirmationForm - Form for Income Confirmation letter
 * אישור הכנסות לבנקים ומוסדות
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { IncomeConfirmationVariables, IncomeEntry } from '@/types/auto-letters.types';

interface IncomeConfirmationFormProps {
  value: Partial<IncomeConfirmationVariables>;
  onChange: (data: Partial<IncomeConfirmationVariables>) => void;
  disabled?: boolean;
  companyName?: string;  // מגיע מבחירת הלקוח הראשית
  companyId?: string;    // מגיע מבחירת הלקוח הראשית
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const emptyMonthEntry: IncomeEntry = {
  type: 'month',
  month: '',
  year: new Date().getFullYear(),
  amount: 0,
};

const emptyYearEntry: IncomeEntry = {
  type: 'year',
  year: new Date().getFullYear(),
  amount: 0,
};

const getEntryType = (entry: IncomeEntry): 'month' | 'year' =>
  entry.type ?? 'month';

export function IncomeConfirmationForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: IncomeConfirmationFormProps) {
  const entries = value.income_entries || [];

  const handleAddMonthEntry = () => {
    onChange({
      ...value,
      income_entries: [...entries, { ...emptyMonthEntry }],
    });
  };

  const handleAddYearEntry = () => {
    onChange({
      ...value,
      income_entries: [...entries, { ...emptyYearEntry }],
    });
  };

  const handleRemoveEntry = (index: number) => {
    const newEntries = entries.filter((_, i) => i !== index);
    onChange({
      ...value,
      income_entries: newEntries,
      period_text: calculatePeriodText(newEntries),
    });
  };

  const handleEntryChange = (
    index: number,
    field: 'month' | 'year' | 'amount',
    fieldValue: string | number
  ) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: fieldValue };
    onChange({
      ...value,
      income_entries: newEntries,
      period_text: calculatePeriodText(newEntries),
    });
  };

  // Format a single entry for display (used in period text)
  const formatEntryLabel = (entry: IncomeEntry): string => {
    if (getEntryType(entry) === 'year') return `שנת ${entry.year}`;
    return `${entry.month} ${entry.year}`;
  };

  // Sort key for an entry (for chronological ordering of mixed types)
  const entrySortKey = (entry: IncomeEntry): number => {
    if (getEntryType(entry) === 'year') {
      // Year entry sorts just before any month of the same year
      return entry.year * 12 - 1;
    }
    return entry.year * 12 + HEBREW_MONTHS.indexOf(entry.month ?? '');
  };

  // Calculate period text from entries (handles both month and year entries)
  const calculatePeriodText = (entriesList: IncomeEntry[]): string => {
    if (entriesList.length === 0) return '';

    const sorted = [...entriesList]
      .filter(e => {
        if (getEntryType(e) === 'year') return e.year > 0;
        return e.month && e.year;
      })
      .sort((a, b) => entrySortKey(a) - entrySortKey(b));

    if (sorted.length === 0) return '';

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (sorted.length === 1 || entrySortKey(first) === entrySortKey(last)) {
      return formatEntryLabel(first);
    }

    return `${formatEntryLabel(first)} - ${formatEntryLabel(last)}`;
  };

  // Update period text when entries change
  const periodText = useMemo(() => calculatePeriodText(entries), [entries]);

  // Generate year options (current year and 5 years back)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  // Check if form has minimum required data
  const hasCompany = !!companyName?.trim();
  const hasRecipient = !!value.recipient_name?.trim();
  const hasEntries = entries.length > 0 && entries.every(e => {
    if (getEntryType(e) === 'year') return e.year > 0 && e.amount > 0;
    return !!e.month?.trim() && e.year > 0 && e.amount > 0;
  });

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור הכנסות</CardTitle>
          <CardDescription className="text-right">
            אישור הכנסות לבנקים ומוסדות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient (לכבוד) */}
          <div className="space-y-2">
            <Label htmlFor="recipient-name" className="text-right block">
              לכבוד (נמען) 
            </Label>
            <Input
              id="recipient-name"
              type="text"
              value={value.recipient_name || ''}
              onChange={(e) => onChange({ ...value, recipient_name: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"

            />
          </div>

          {/* Company Display (from main recipient selection) */}
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

          {/* Period Display (auto-calculated) */}
          {periodText && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Label className="text-right block text-blue-800 font-medium">
                תקופה (נגזר אוטומטית):
              </Label>
              <div className="text-right text-blue-900 mt-1">{periodText}</div>
            </div>
          )}

          {/* Income Entries Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-right font-medium">טבלת הכנסות</Label>
              <div className="flex gap-2 rtl:flex-row-reverse">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMonthEntry}
                  disabled={disabled}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  הוסף חודש
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddYearEntry}
                  disabled={disabled}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  הוסף שנה
                </Button>
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="p-4 border border-dashed rounded-md text-center text-gray-500">
                לחץ על "הוסף חודש" או "הוסף שנה" כדי להתחיל להזין נתונים
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, index) => {
                  const entryType = getEntryType(entry);
                  const isYear = entryType === 'year';
                  return (
                    <div key={index} className="p-4 border rounded-md space-y-3 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          שורה {index + 1} ({isYear ? 'שנה' : 'חודש'})
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEntry(index)}
                          disabled={disabled}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className={isYear ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3'}>
                        {/* Month - only for month-type entries */}
                        {!isYear && (
                          <div className="space-y-1">
                            <Label className="text-xs text-gray-500">חודש</Label>
                            <Select
                              value={entry.month ?? ''}
                              onValueChange={(val) => handleEntryChange(index, 'month', val)}
                              disabled={disabled}
                              dir="rtl"
                            >
                              <SelectTrigger className="text-right" dir="rtl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent dir="rtl">
                                {HEBREW_MONTHS.map((month) => (
                                  <SelectItem key={month} value={month}>
                                    {month}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Year */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">שנה</Label>
                          <Select
                            value={String(entry.year)}
                            onValueChange={(val) => handleEntryChange(index, 'year', parseInt(val))}
                            disabled={disabled}
                            dir="rtl"
                          >
                            <SelectTrigger className="text-right" dir="rtl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {yearOptions.map((year) => (
                                <SelectItem key={year} value={String(year)}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">סכום (₪)</Label>
                          <Input
                            type="number"
                            value={entry.amount || ''}
                            onChange={(e) => handleEntryChange(index, 'amount', parseFloat(e.target.value) || 0)}
                            disabled={disabled}
                            className="text-right"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
              <li>אישור הכנסות עם פירוט לפי חודשים ו/או שנים</li>
              <li>סכומים לפני מע"מ</li>
              <li>חתימת פרנקו ושות' רואי חשבון</li>
            </ul>
          </div>

          {/* Validation */}
          {(!hasRecipient || !hasCompany || !hasEntries) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasRecipient && 'יש להזין נמען (לכבוד). '}
                {!hasCompany && 'יש לבחור חברה. '}
                {!hasEntries && 'יש להוסיף לפחות שורת הכנסות אחת עם כל הפרטים.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
