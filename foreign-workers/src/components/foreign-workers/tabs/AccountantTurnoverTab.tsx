import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { AccountantTurnoverVariables, MonthlyTurnover } from '@/types/foreign-workers.types';

interface AccountantTurnoverTabProps {
  value: Partial<AccountantTurnoverVariables>;
  onChange: (data: Partial<AccountantTurnoverVariables>) => void;
  disabled?: boolean;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function AccountantTurnoverTab({ value, onChange, disabled }: AccountantTurnoverTabProps) {
  const [monthlyTurnover, setMonthlyTurnover] = useState<MonthlyTurnover[]>(
    value.monthly_turnover || []
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (monthlyTurnover.length > 0) {
      onChangeRef.current({
        ...valueRef.current,
        monthly_turnover: monthlyTurnover
      });
    }
  }, [monthlyTurnover]);

  const handleCompanyTypeChange = (type: 'חברה' | 'עוסק מורשה') => {
    onChange({
      ...value,
      company_type: type
    });
  };

  const addMonth = () => {
    const newMonth: MonthlyTurnover = {
      month: '',
      amount: 0
    };
    setMonthlyTurnover([...monthlyTurnover, newMonth]);
  };

  const removeMonth = (index: number) => {
    setMonthlyTurnover(monthlyTurnover.filter((_, i) => i !== index));
  };

  const updateMonth = (index: number, field: keyof MonthlyTurnover, value: string | number) => {
    const updated = [...monthlyTurnover];
    if (field === 'month') {
      updated[index].month = value as string;
    } else if (field === 'amount') {
      updated[index].amount = typeof value === 'number' ? value : parseFloat(value as string) || 0;
    }
    setMonthlyTurnover(updated);
  };

  const generateDefaultMonths = () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const months: MonthlyTurnover[] = [];

    // Last 12 months (Nov last year to Oct current year)
    for (let i = 10; i < 12; i++) {
      months.push({
        month: `${HEBREW_MONTHS[i]} ${lastYear}`,
        amount: 0
      });
    }
    for (let i = 0; i < 10; i++) {
      months.push({
        month: `${HEBREW_MONTHS[i]} ${currentYear}`,
        amount: 0
      });
    }

    setMonthlyTurnover(months);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">דוח מחזורים רו"ח</CardTitle>
          <CardDescription className="text-right">
            אישור המסכם את הדיווחים למע"מ ב-12 החודשים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Type */}
          <div className="space-y-2">
            <Label className="text-right block">
              סוג העסק <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-4 rtl:flex-row-reverse">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="company-type"
                  value="חברה"
                  checked={value.company_type === 'חברה'}
                  onChange={() => handleCompanyTypeChange('חברה')}
                  disabled={disabled}
                  className="rtl:ml-2"
                />
                <span>חברה</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="company-type"
                  value="עוסק מורשה"
                  checked={value.company_type === 'עוסק מורשה'}
                  onChange={() => handleCompanyTypeChange('עוסק מורשה')}
                  disabled={disabled}
                  className="rtl:ml-2"
                />
                <span>עוסק מורשה</span>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          {monthlyTurnover.length === 0 && (
            <Button
              onClick={generateDefaultMonths}
              disabled={disabled}
              variant="outline"
              className="w-full"
            >
              <Plus className="ml-2 h-4 w-4" />
              צור 12 חודשים אוטומטית
            </Button>
          )}

          {/* Monthly Turnover Table */}
          {monthlyTurnover.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-right">מחזורים חודשיים ({monthlyTurnover.length}/12)</h4>
                <Button
                  onClick={addMonth}
                  disabled={disabled || monthlyTurnover.length >= 12}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="ml-1 h-3 w-3" />
                  הוסף חודש
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right font-medium">חודש דיווח</th>
                      <th className="px-4 py-2 text-right font-medium">סכום (ללא מע"מ)</th>
                      <th className="px-4 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyTurnover.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <Input
                            value={row.month}
                            onChange={(e) => updateMonth(index, 'month', e.target.value)}
                            placeholder="לדוגמה: ינואר 2025"
                            disabled={disabled}
                            className="text-right rtl:text-right"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            value={row.amount}
                            onChange={(e) => updateMonth(index, 'amount', e.target.value)}
                            placeholder="0"
                            disabled={disabled}
                            className="text-right rtl:text-right"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            onClick={() => removeMonth(index)}
                            disabled={disabled}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {monthlyTurnover.length !== 12 && (
                <p className="text-sm text-yellow-600 text-right">
                  מומלץ למלא בדיוק 12 חודשים
                </p>
              )}
            </div>
          )}

          {/* Validation */}
          {(!value.company_type || monthlyTurnover.length === 0) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש לבחור סוג עסק ולמלא לפחות חודש אחד
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
